import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import { TypeSchoolEnum } from '../../school/model/enum/type-school.enum'
import { Student } from '../../student/model/entities/student.entity'
import { BatchOperation } from '../model/entities/batch-operation.entity'
import { BatchOperationStatus } from '../model/enums/batch-operation-status.enum'
import { BatchOperationType } from '../model/enums/batch-operation-type.enum'
import { StudentDeactivationService } from './student-deactivation.service'

type MockRepository<T = any> = Partial<Record<keyof Repository<T>, jest.Mock>>

/**
 * Mock do repositório de Student. A desativação roda via `manager.query()`
 * (UPDATE ... JOIN escola); cada chamada retorna `{ affectedRows }` conforme a
 * fila configurada em `affectedQueue`.
 */
const createStudentRepository = (affectedQueue: number[]) => {
  let call = 0
  const queryMock = jest.fn().mockImplementation(async () => ({
    affectedRows: affectedQueue[call++] ?? 0,
  }))

  return {
    repo: {
      manager: { query: queryMock },
    } as unknown as MockRepository<Student>,
    queryMock,
  }
}

const baseOperation = (
  overrides: Partial<BatchOperation> = {},
): BatchOperation =>
  ({
    id: 1,
    type: BatchOperationType.STUDENT_DEACTIVATION,
    status: BatchOperationStatus.PENDING,
    combinations: [{ countyId: 5, network: TypeSchoolEnum.MUNICIPAL }],
    year: null,
    retryCount: 0,
    requestedByUserId: null,
    errorMessage: null,
    startDate: null,
    endDate: null,
    updatedAt: new Date(),
    ...overrides,
  }) as BatchOperation

describe('StudentDeactivationService', () => {
  const build = async (
    operation: BatchOperation | null,
    affectedQueue: number[] = [],
  ) => {
    const { repo: studentRepo, queryMock } =
      createStudentRepository(affectedQueue)

    const batchRepo: MockRepository<BatchOperation> = {
      findOne: jest.fn().mockResolvedValue(operation),
      save: jest.fn().mockImplementation(async (op) => op),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StudentDeactivationService,
        { provide: getRepositoryToken(BatchOperation), useValue: batchRepo },
        { provide: getRepositoryToken(Student), useValue: studentRepo },
      ],
    }).compile()

    const service = module.get(StudentDeactivationService)
    return { service, batchRepo, queryMock }
  }

  it('should be defined', async () => {
    const { service } = await build(baseOperation())
    expect(service).toBeDefined()
  })

  it('desativa em massa, soma os afetados e marca DONE', async () => {
    const operation = baseOperation({
      combinations: [
        { countyId: 5, network: TypeSchoolEnum.MUNICIPAL },
        { countyId: 7, network: TypeSchoolEnum.ESTADUAL },
      ],
    })
    const { service, batchRepo, queryMock } = await build(operation, [10, 3])

    await service.execute(1)

    // 2 combinações => 2 UPDATEs
    expect(queryMock).toHaveBeenCalledTimes(2)

    // O UPDATE filtra ativos + não enturmados e faz JOIN com escola; os
    // parâmetros são [countyId, network] de cada combinação.
    const [sql, params] = queryMock.mock.calls[0]
    expect(sql).toMatch(/UPDATE\s+`aluno`/)
    expect(sql).toMatch(/INNER JOIN\s+`escola`/)
    expect(sql).toMatch(/`ALU_ATIVO`\s*=\s*1/)
    expect(sql).toMatch(/`ALU_TUR_ID`\s+IS NULL/)
    expect(params).toEqual([5, TypeSchoolEnum.MUNICIPAL])
    expect(queryMock.mock.calls[1][1]).toEqual([7, TypeSchoolEnum.ESTADUAL])

    const saveCalls = batchRepo.save.mock.calls
    const finalSave = saveCalls[saveCalls.length - 1][0]
    expect(finalSave.status).toBe(BatchOperationStatus.DONE)
    expect(finalSave.errorMessage).toBeNull()
    expect(finalSave.endDate).toBeInstanceOf(Date)
  })

  it('é idempotente: UPDATE só afeta ativos não enturmados (2ª execução = 0)', async () => {
    const operation = baseOperation()
    const { service, batchRepo, queryMock } = await build(operation, [0])

    await service.execute(1)

    // O filtro garante idempotência; concluir mesmo com 0 afetados é DONE.
    expect(queryMock).toHaveBeenCalledTimes(1)
    const saveCalls = batchRepo.save.mock.calls
    const finalSave = saveCalls[saveCalls.length - 1][0]
    expect(finalSave.status).toBe(BatchOperationStatus.DONE)
  })

  it('marca FAILED e relança quando o UPDATE falha', async () => {
    const operation = baseOperation()
    const { service, batchRepo, queryMock } = await build(operation)
    queryMock.mockRejectedValueOnce(new Error('deadlock'))

    await expect(service.execute(1)).rejects.toThrow('deadlock')

    const saveCalls = batchRepo.save.mock.calls
    const finalSave = saveCalls[saveCalls.length - 1][0]
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

  it('faz skip se já está RUNNING há pouco tempo (não travada)', async () => {
    const operation = baseOperation({
      status: BatchOperationStatus.RUNNING,
      updatedAt: new Date(),
    })
    const { service, queryMock } = await build(operation)

    await service.execute(1)

    expect(queryMock).not.toHaveBeenCalled()
  })

  it('reclama operação RUNNING travada (> 30min) e executa', async () => {
    const operation = baseOperation({
      status: BatchOperationStatus.RUNNING,
      updatedAt: new Date(Date.now() - 31 * 60_000),
    })
    const { service, batchRepo, queryMock } = await build(operation, [4])

    await service.execute(1)

    expect(queryMock).toHaveBeenCalledTimes(1)
    const saveCalls = batchRepo.save.mock.calls
    const finalSave = saveCalls[saveCalls.length - 1][0]
    expect(finalSave.status).toBe(BatchOperationStatus.DONE)
  })

  it('faz no-op se a operação não existe', async () => {
    const { service, batchRepo } = await build(null)

    await service.execute(999)

    expect(batchRepo.save).not.toHaveBeenCalled()
  })
})
