import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import { Student } from '../../student/model/entities/student.entity'
import {
  BatchOperation,
  BatchOperationCombination,
} from '../model/entities/batch-operation.entity'
import { BatchOperationStatus } from '../model/enums/batch-operation-status.enum'

const STUCK_RUNNING_THRESHOLD_MS = 30 * 60_000

@Injectable()
export class StudentDeactivationService {
  private readonly logger = new Logger(StudentDeactivationService.name)

  constructor(
    @InjectRepository(BatchOperation)
    private readonly batchOperationRepository: Repository<BatchOperation>,

    @InjectRepository(Student)
    private readonly studentRepository: Repository<Student>,
  ) {}

  async execute(operationId: number): Promise<void> {
    const operation = await this.batchOperationRepository.findOne({
      where: { id: operationId },
    })

    if (!operation) {
      this.logger.warn(`BatchOperation ${operationId} not found`)
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
      let affected = 0
      for (const combination of operation.combinations) {
        affected += await this.deactivateCombination(combination)
      }

      operation.status = BatchOperationStatus.DONE
      operation.endDate = new Date()
      operation.errorMessage = null
      await this.batchOperationRepository.save(operation)

      this.logger.log(
        `BatchOperation ${operationId} DONE — ${affected} aluno(s) desativado(s)`,
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
  ): Promise<number> {
    const result = await this.studentRepository.manager.query(
      `UPDATE \`aluno\` a
       INNER JOIN \`escola\` e ON e.\`ESC_ID\` = a.\`ALU_ESC_ID\`
       SET a.\`ALU_ATIVO\` = 0, a.\`ALU_DT_ATUALIZACAO\` = NOW()
       WHERE a.\`ALU_ATIVO\` = 1
         AND a.\`ALU_TUR_ID\` IS NULL
         AND e.\`ESC_MUN_ID\` = ?
         AND e.\`ESC_TIPO\` = ?`,
      [combination.countyId, combination.network],
    )

    return result?.affectedRows ?? 0
  }
}
