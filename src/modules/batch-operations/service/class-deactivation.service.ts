import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import { SchoolClass } from '../../school-class/model/entities/school-class.entity'
import {
  BatchOperation,
  BatchOperationCombination,
} from '../model/entities/batch-operation.entity'
import { BatchOperationStatus } from '../model/enums/batch-operation-status.enum'
import { BatchOperationType } from '../model/enums/batch-operation-type.enum'

const STUCK_RUNNING_THRESHOLD_MS = 30 * 60_000

// Quantas turmas por statement IN (...). Mantém os parâmetros bem abaixo dos
// limites do MySQL (max_allowed_packet / placeholders) com folga.
const CHUNK_SIZE = 500

@Injectable()
export class ClassDeactivationService {
  private readonly logger = new Logger(ClassDeactivationService.name)

  constructor(
    @InjectRepository(BatchOperation)
    private readonly batchOperationRepository: Repository<BatchOperation>,

    @InjectRepository(SchoolClass)
    private readonly schoolClassRepository: Repository<SchoolClass>,
  ) {}

  async execute(operationId: number): Promise<void> {
    const operation = await this.batchOperationRepository.findOne({
      where: { id: operationId },
    })

    if (!operation) {
      this.logger.warn(`BatchOperation ${operationId} not found`)
      return
    }

    if (operation.type !== BatchOperationType.CLASS_DEACTIVATION) {
      this.logger.warn(
        `BatchOperation ${operationId} is not CLASS_DEACTIVATION (type ${operation.type}), skipping`,
      )
      return
    }

    if (operation.status === BatchOperationStatus.DONE) {
      this.logger.warn(`BatchOperation ${operationId} already DONE, skipping`)
      return
    }

    if (operation.status === BatchOperationStatus.RUNNING) {
      const ageMs = Date.now() - (operation.updatedAt?.getTime() ?? 0)
      if (ageMs < STUCK_RUNNING_THRESHOLD_MS) {
        this.logger.warn(
          `BatchOperation ${operationId} already RUNNING (age ${Math.round(
            ageMs / 1000,
          )}s), skipping`,
        )
        return
      }
      this.logger.warn(
        `BatchOperation ${operationId} stuck in RUNNING for ${Math.round(
          ageMs / 60_000,
        )}min; reclaiming`,
      )
    }

    operation.status = BatchOperationStatus.RUNNING
    operation.startDate = new Date()
    operation.retryCount = (operation.retryCount ?? 0) + 1
    operation.errorMessage = null
    await this.batchOperationRepository.save(operation)

    try {
      let deactivated = 0
      for (const combination of operation.combinations) {
        deactivated += await this.deactivateCombination(
          combination,
          operation.year,
        )
      }

      operation.status = BatchOperationStatus.DONE
      operation.endDate = new Date()
      operation.errorMessage = null
      await this.batchOperationRepository.save(operation)

      this.logger.log(
        `BatchOperation ${operationId} DONE — ${deactivated} turma(s) desativada(s)`,
      )
    } catch (err) {
      operation.status = BatchOperationStatus.FAILED
      operation.errorMessage = err instanceof Error ? err.message : String(err)
      operation.endDate = new Date()
      await this.batchOperationRepository.save(operation)

      this.logger.error(
        `BatchOperation ${operationId} FAILED: ${operation.errorMessage}`,
      )
      // Relança para que o Cloud Tasks reexecute (idempotente).
      throw err
    }
  }

  private async deactivateCombination(
    combination: BatchOperationCombination,
    year: string | null,
  ): Promise<number> {
    const classIds: Array<{ turId: number }> = await this.schoolClassRepository
      .createQueryBuilder('SchoolClass')
      .innerJoin('SchoolClass.TUR_ESC', 'School')
      .select('SchoolClass.TUR_ID', 'turId')
      .where('SchoolClass.TUR_ATIVO = :active', { active: true })
      .andWhere('SchoolClass.TUR_ANO = :year', { year })
      .andWhere('School.ESC_MUN_ID = :countyId', {
        countyId: combination.countyId,
      })
      .andWhere('School.ESC_TIPO = :network', { network: combination.network })
      .getRawMany()

    const turIds = classIds.map((row) => row.turId)

    // Ordem obrigatória: desenturmar antes de desativar. Operamos por lotes de
    // turmas (IN chunkado) em vez de turma-a-turma: o banco é remoto e a
    // latência por round-trip domina o tempo — milhares de turmas × statements
    // sequenciais levavam dezenas de minutos; em lote, segundos.
    for (const chunk of this.chunk(turIds, CHUNK_SIZE)) {
      await this.uncrowdStudents(chunk)
      await this.schoolClassRepository.update(chunk, { TUR_ATIVO: false })
    }

    return turIds.length
  }

  /**
   * Desenturma em massa todos os alunos de um lote de turmas via comandos SQL
   * em lote (em vez de um loop ORM por aluno / por turma), para escalar a
   * municípios com milhares de turmas. Espelha createSchoolClassStudentEndDate:
   *
   * 1. Fecha as matrículas abertas em `turma_aluno` (`endDate=hoje` onde
   *    `endDate IS NULL`) das turmas do lote.
   * 2. Cria o snapshot dos faltantes: para cada aluno ainda nas turmas
   *    (`ALU_TUR_ID IN (...)`) que NÃO tenha linha em `turma_aluno` da SUA
   *    turma, insere uma matrícula já fechada (startDate=endDate=hoje) —
   *    equivalente ao branch "else" do método original.
   * 3. Remove os alunos das turmas: `ALU_TUR_ID`/`ALU_SER_ID` = NULL e
   *    `ALU_STATUS='Não Enturmado'`. Os alunos permanecem ativos (ALU_ATIVO).
   *
   * A ordem importa: o INSERT (passo 2) usa `ALU_TUR_ID` para achar quem está
   * nas turmas, então precisa rodar ANTES do UPDATE de aluno (passo 3). O
   * INSERT casa `ta.schoolClassTURID = a.ALU_TUR_ID` para que cada aluno só
   * ganhe snapshot da própria turma. Tudo é idempotente: 2ª passada não reabre
   * matrículas fechadas, não duplica snapshots (NOT EXISTS) e não acha mais
   * alunos (já desenturmados).
   *
   * Os nomes físicos das colunas FK em `turma_aluno` (schoolClassTURID,
   * studentALUID) seguem o default do TypeORM para @ManyToOne sem @JoinColumn.
   */
  private async uncrowdStudents(turIds: number[]): Promise<void> {
    if (!turIds.length) return

    const manager = this.schoolClassRepository.manager
    const placeholders = turIds.map(() => '?').join(',')

    // 1. Fecha as matrículas abertas das turmas do lote.
    await manager.query(
      `UPDATE \`turma_aluno\`
       SET \`endDate\` = CURDATE()
       WHERE \`schoolClassTURID\` IN (${placeholders})
         AND \`endDate\` IS NULL`,
      turIds,
    )

    // 2. Cria snapshot fechado para alunos sem matrícula na própria turma.
    await manager.query(
      `INSERT INTO \`turma_aluno\`
         (\`startDate\`, \`endDate\`, \`studentALUID\`, \`schoolClassTURID\`)
       SELECT CURDATE(), CURDATE(), a.\`ALU_ID\`, a.\`ALU_TUR_ID\`
       FROM \`aluno\` a
       WHERE a.\`ALU_TUR_ID\` IN (${placeholders})
         AND NOT EXISTS (
           SELECT 1 FROM \`turma_aluno\` ta
           WHERE ta.\`studentALUID\` = a.\`ALU_ID\`
             AND ta.\`schoolClassTURID\` = a.\`ALU_TUR_ID\`
         )`,
      turIds,
    )

    // 3. Desenturma os alunos (permanecem ativos).
    await manager.query(
      `UPDATE \`aluno\`
       SET \`ALU_TUR_ID\` = NULL,
           \`ALU_SER_ID\` = NULL,
           \`ALU_STATUS\` = 'Não Enturmado',
           \`ALU_DT_ATUALIZACAO\` = NOW()
       WHERE \`ALU_TUR_ID\` IN (${placeholders})`,
      turIds,
    )
  }

  private chunk<T>(items: T[], size: number): T[][] {
    const chunks: T[][] = []
    for (let i = 0; i < items.length; i += size) {
      chunks.push(items.slice(i, i + size))
    }
    return chunks
  }
}
