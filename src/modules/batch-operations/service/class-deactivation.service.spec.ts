import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import { TypeSchoolEnum } from '../../school/model/enum/type-school.enum'
import { SchoolClass } from '../../school-class/model/entities/school-class.entity'
import { BatchOperation } from '../model/entities/batch-operation.entity'
import { BatchOperationStatus } from '../model/enums/batch-operation-status.enum'
import { BatchOperationType } from '../model/enums/batch-operation-type.enum'
import { ClassDeactivationService } from './class-deactivation.service'

type MockRepository<T = any> = Partial<Record<keyof Repository<T>, jest.Mock>>

const baseOperation = (
  overrides: Partial<BatchOperation> = {},
): BatchOperation =>
  ({
    id: 1,
    type: BatchOperationType.CLASS_DEACTIVATION,
    status: BatchOperationStatus.PENDING,
    combinations: [{ countyId: 5, network: TypeSchoolEnum.MUNICIPAL }],
    year: '2024',
    retryCount: 0,
    requestedByUserId: null,
    errorMessage: null,
    startDate: null,
    endDate: null,
    updatedAt: new Date(),
    ...overrides,
  }) as BatchOperation

describe('ClassDeactivationService', () => {
  /**
   * @param classesByCall fila de listas de TUR_IDs retornadas por getRawMany()
   *   — uma lista por combinação.
   */
  const build = async (
    operation: BatchOperation | null,
    classesByCall: number[][] = [],
  ) => {
    const calls: string[] = []

    const batchRepo: MockRepository<BatchOperation> = {
      findOne: jest.fn().mockResolvedValue(operation),
      save: jest.fn().mockImplementation(async (op) => op),
    }

    // manager.query registra cada comando em massa: fechar matrículas abertas
    // (UPDATE turma_aluno), criar snapshot dos faltantes (INSERT...SELECT) e
    // desenturmar (UPDATE aluno).
    const queryMock = jest.fn().mockImplementation(async (sql: string) => {
      if (/INSERT INTO `turma_aluno`/.test(sql)) calls.push('snapshot-insert')
      else if (/UPDATE `turma_aluno`/.test(sql)) calls.push('snapshot-close')
      else if (/UPDATE `aluno`/.test(sql)) calls.push('uncrowd')
      return { affectedRows: 0 }
    })

    let getRawManyCall = 0
    const schoolClassRepo: MockRepository<SchoolClass> = {
      manager: { query: queryMock } as any,
      createQueryBuilder: jest.fn().mockReturnValue({
        innerJoin: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawMany: jest
          .fn()
          .mockImplementation(async () =>
            (classesByCall[getRawManyCall++] ?? []).map((turId) => ({ turId })),
          ),
      }),
      update: jest.fn().mockImplementation(async (turId) => {
        calls.push(`deactivate:${turId}`)
        return { affected: 1 }
      }),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClassDeactivationService,
        { provide: getRepositoryToken(BatchOperation), useValue: batchRepo },
        { provide: getRepositoryToken(SchoolClass), useValue: schoolClassRepo },
      ],
    }).compile()

    const service = module.get(ClassDeactivationService)
    return { service, batchRepo, schoolClassRepo, queryMock, calls }
  }

  it('should be defined', async () => {
    const { service } = await build(baseOperation())
    expect(service).toBeDefined()
  })

  it('fecha matrículas, cria snapshot dos faltantes e desenturma antes de desativar; marca DONE', async () => {
    const operation = baseOperation()
    const { service, batchRepo, calls, queryMock } = await build(operation, [
      [10, 20],
    ])

    await service.execute(1)

    // Ordem obrigatória: fechar matrículas abertas → snapshot dos faltantes →
    // desenturmar (aluno) → desativar as turmas — tudo em lote (IN).
    expect(calls).toEqual([
      'snapshot-close',
      'snapshot-insert',
      'uncrowd',
      'deactivate:10,20',
    ])

    // Três comandos em massa por lote de turmas (não por turma).
    expect(queryMock).toHaveBeenCalledTimes(3)

    // 1º: fecha apenas matrículas abertas das turmas do lote (IN).
    const [closeSql, closeParams] = queryMock.mock.calls[0]
    expect(closeSql).toMatch(/UPDATE\s+`turma_aluno`/)
    expect(closeSql).toMatch(/`schoolClassTURID`\s+IN\s*\(\?,\?\)/)
    expect(closeSql).toMatch(/`endDate`\s+IS NULL/)
    expect(closeParams).toEqual([10, 20])

    // 2º: INSERT...SELECT cria matrícula fechada só para os alunos sem registro
    // na própria turma (casa ALU_TUR_ID = schoolClassTURID).
    const [insertSql, insertParams] = queryMock.mock.calls[1]
    expect(insertSql).toMatch(/INSERT INTO\s+`turma_aluno`/)
    expect(insertSql).toMatch(/NOT EXISTS/)
    expect(insertSql).toMatch(/a\.`ALU_TUR_ID`\s+IN\s*\(\?,\?\)/)
    expect(insertParams).toEqual([10, 20])

    // 3º: desenturma mantendo o aluno ativo (não toca ALU_ATIVO).
    const [uncrowdSql, uncrowdParams] = queryMock.mock.calls[2]
    expect(uncrowdSql).toMatch(/UPDATE\s+`aluno`/)
    expect(uncrowdSql).toMatch(/`ALU_TUR_ID`\s*=\s*NULL/)
    expect(uncrowdSql).toMatch(/`ALU_TUR_ID`\s+IN\s*\(\?,\?\)/)
    expect(uncrowdSql).toMatch(/Não Enturmado/)
    expect(uncrowdSql).not.toMatch(/ALU_ATIVO/)
    expect(uncrowdParams).toEqual([10, 20])

    const finalSave =
      batchRepo.save.mock.calls[batchRepo.save.mock.calls.length - 1][0]
    expect(finalSave.status).toBe(BatchOperationStatus.DONE)
  })

  it('processa todas as turmas num único lote (IN)', async () => {
    const operation = baseOperation()
    const { service, schoolClassRepo, queryMock } = await build(operation, [
      [10, 20, 30],
    ])

    await service.execute(1)

    // Um lote (< CHUNK_SIZE) → 3 comandos em massa + 1 update de turmas.
    expect(queryMock).toHaveBeenCalledTimes(3)
    expect(schoolClassRepo.update).toHaveBeenCalledTimes(1)
    expect(schoolClassRepo.update.mock.calls[0][0]).toEqual([10, 20, 30])
  })

  it('é idempotente: turmas já inativas não retornam na query (0 turmas = DONE)', async () => {
    const operation = baseOperation()
    const { service, batchRepo, schoolClassRepo, queryMock } = await build(
      operation,
      [[]],
    )

    await service.execute(1)

    expect(queryMock).not.toHaveBeenCalled()
    expect(schoolClassRepo.update).not.toHaveBeenCalled()
    const finalSave =
      batchRepo.save.mock.calls[batchRepo.save.mock.calls.length - 1][0]
    expect(finalSave.status).toBe(BatchOperationStatus.DONE)
  })

  it('marca FAILED e relança quando um UPDATE falha', async () => {
    const operation = baseOperation()
    const { service, batchRepo, queryMock } = await build(operation, [[10]])
    queryMock.mockRejectedValueOnce(new Error('deadlock'))

    await expect(service.execute(1)).rejects.toThrow('deadlock')

    const finalSave =
      batchRepo.save.mock.calls[batchRepo.save.mock.calls.length - 1][0]
    expect(finalSave.status).toBe(BatchOperationStatus.FAILED)
    expect(finalSave.errorMessage).toBe('deadlock')
  })

  it('faz skip se a operação já está DONE', async () => {
    const operation = baseOperation({ status: BatchOperationStatus.DONE })
    const { service, batchRepo, queryMock } = await build(operation)

    await service.execute(1)

    expect(queryMock).not.toHaveBeenCalled()
    expect(batchRepo.save).not.toHaveBeenCalled()
  })

  it('ignora operação de outro tipo (defensivo)', async () => {
    const operation = baseOperation({
      type: BatchOperationType.STUDENT_DEACTIVATION,
    })
    const { service, batchRepo, queryMock } = await build(operation)

    await service.execute(1)

    expect(queryMock).not.toHaveBeenCalled()
    expect(batchRepo.save).not.toHaveBeenCalled()
  })

  it('faz no-op se a operação não existe', async () => {
    const { service, batchRepo } = await build(null)

    await service.execute(999)

    expect(batchRepo.save).not.toHaveBeenCalled()
  })
})
