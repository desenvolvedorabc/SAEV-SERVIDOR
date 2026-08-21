import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import { paginateData } from '../../../utils/paginate-data'
import { County } from '../../counties/model/entities/county.entity'
import { TypeSchoolEnum } from '../../school/model/enum/type-school.enum'
import { User } from '../../user/model/entities/user.entity'
import {
  BATCH_OPERATION_DISPATCHER,
  BatchOperationDispatcher,
} from '../dispatcher/batch-operation-dispatcher.interface'
import { CreateStudentDeactivationDto } from '../dto/create-student-deactivation.dto'
import { ListBatchOperationsQueryDto } from '../dto/list-batch-operations-query.dto'
import { BatchOperation } from '../model/entities/batch-operation.entity'
import {
  BatchOperationStatus,
  BatchOperationStatusTag,
} from '../model/enums/batch-operation-status.enum'
import { BatchOperationType } from '../model/enums/batch-operation-type.enum'
import { BatchOperationService } from './batch-operation.service'

// paginateData é importado pelo serviço; mockamos para isolar a lógica.
jest.mock('../../../utils/paginate-data', () => ({
  paginateData: jest.fn(),
}))

type MockRepository<T = any> = Partial<Record<keyof Repository<T>, jest.Mock>>

const createMockDispatcher = (): jest.Mocked<BatchOperationDispatcher> => ({
  scheduleExecute: jest.fn().mockResolvedValue(undefined),
})

const user = { USU_ID: 42, USU_NOME: 'Admin SAEV' } as User

// QueryBuilder encadeável usado por baseQuery() (getStatus/listHistory).
const createQbMock = () => ({
  leftJoin: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  getOne: jest.fn(),
})

describe('BatchOperationService', () => {
  let service: BatchOperationService
  let batchRepo: MockRepository<BatchOperation>
  let countyRepo: MockRepository<County>
  let dispatcher: jest.Mocked<BatchOperationDispatcher>
  let qb: ReturnType<typeof createQbMock>

  beforeEach(async () => {
    qb = createQbMock()
    batchRepo = {
      create: jest.fn().mockImplementation((data) => data),
      save: jest.fn().mockImplementation(async (op) => ({ id: 100, ...op })),
      findOne: jest.fn(),
      count: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(qb),
    }
    countyRepo = {
      find: jest.fn().mockResolvedValue([
        { MUN_ID: 5, MUN_NOME: 'Maceió' },
        { MUN_ID: 7, MUN_NOME: 'Arapiraca' },
      ]),
    }
    dispatcher = createMockDispatcher()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BatchOperationService,
        { provide: getRepositoryToken(BatchOperation), useValue: batchRepo },
        { provide: getRepositoryToken(County), useValue: countyRepo },
        { provide: BATCH_OPERATION_DISPATCHER, useValue: dispatcher },
      ],
    }).compile()

    service = module.get(BatchOperationService)
    ;(paginateData as jest.Mock).mockReset()
  })

  describe('createStudentDeactivation', () => {
    const dto: CreateStudentDeactivationDto = {
      combinations: [
        { countyId: 5, network: TypeSchoolEnum.MUNICIPAL },
        { countyId: 7, network: TypeSchoolEnum.ESTADUAL },
      ],
    }

    it('cria PENDING, grava autoria e despacha a execução', async () => {
      batchRepo.findOne.mockResolvedValue(null) // sem operação em andamento

      const result = await service.createStudentDeactivation(dto, user)

      const created = batchRepo.create.mock.calls[0][0]
      expect(created.type).toBe(BatchOperationType.STUDENT_DEACTIVATION)
      expect(created.status).toBe(BatchOperationStatus.PENDING)
      expect(created.requestedByUserId).toBe(42)
      expect(created.combinations).toHaveLength(2)

      expect(dispatcher.scheduleExecute).toHaveBeenCalledWith(100)
      expect(result.statusTag).toBe(BatchOperationStatusTag.IN_PROGRESS)
      expect(result.combinations[0]).toEqual({
        countyId: 5,
        countyName: 'Maceió',
        network: TypeSchoolEnum.MUNICIPAL,
      })
    })

    it('rejeita quando há operação em andamento (qualquer tipo)', async () => {
      batchRepo.findOne.mockResolvedValue({
        id: 1,
        status: BatchOperationStatus.RUNNING,
      } as BatchOperation)

      await expect(
        service.createStudentDeactivation(dto, user),
      ).rejects.toBeInstanceOf(ConflictException)
      expect(dispatcher.scheduleExecute).not.toHaveBeenCalled()
    })

    it('rejeita lista de combinações vazia', async () => {
      await expect(
        service.createStudentDeactivation({ combinations: [] }, user),
      ).rejects.toBeInstanceOf(BadRequestException)
    })
  })

  describe('getStatus', () => {
    it('retorna a operação mapeada com tag e autor', async () => {
      qb.getOne.mockResolvedValue({
        id: 100,
        type: BatchOperationType.STUDENT_DEACTIVATION,
        status: BatchOperationStatus.FAILED,
        combinations: [{ countyId: 5, network: TypeSchoolEnum.MUNICIPAL }],
        year: null,
        errorMessage: 'erro no servidor',
        requestedByUserId: 42,
        requestedByUser: { USU_NOME: 'Admin SAEV' },
        createdAt: new Date(),
        startDate: null,
        endDate: null,
      } as unknown as BatchOperation)

      const result = await service.getStatus(100)

      expect(result.statusTag).toBe(BatchOperationStatusTag.ERROR)
      expect(result.errorMessage).toBe('erro no servidor')
      expect(result.requestedByUserName).toBe('Admin SAEV')
      expect(result.combinations[0].countyName).toBe('Maceió')
    })

    it('lança NotFound quando a operação não existe', async () => {
      qb.getOne.mockResolvedValue(null)
      await expect(service.getStatus(999)).rejects.toBeInstanceOf(
        NotFoundException,
      )
    })
  })

  describe('isAnyInProgress', () => {
    it('true quando há PENDING/RUNNING', async () => {
      batchRepo.count.mockResolvedValue(1)
      expect(await service.isAnyInProgress()).toEqual({ inProgress: true })
    })

    it('false quando não há', async () => {
      batchRepo.count.mockResolvedValue(0)
      expect(await service.isAnyInProgress()).toEqual({ inProgress: false })
    })
  })

  describe('listHistory', () => {
    it('filtra por type, ordena por createdAt DESC e pagina', async () => {
      ;(paginateData as jest.Mock).mockResolvedValue({
        items: [
          {
            id: 1,
            type: BatchOperationType.STUDENT_DEACTIVATION,
            status: BatchOperationStatus.DONE,
            combinations: [{ countyId: 5, network: TypeSchoolEnum.MUNICIPAL }],
            year: null,
            errorMessage: null,
            requestedByUserId: 42,
            requestedByUser: { USU_NOME: 'Admin SAEV' },
            createdAt: new Date(),
            startDate: null,
            endDate: null,
          },
        ],
        meta: { totalItems: 1 },
      })

      const query = new ListBatchOperationsQueryDto()
      query.page = 1
      query.limit = 10

      const result = await service.listHistory(query)

      expect(qb.orderBy).toHaveBeenCalledWith('operation.createdAt', 'DESC')
      expect(result.meta).toEqual({ totalItems: 1 })
      expect(result.items[0].statusTag).toBe(BatchOperationStatusTag.SUCCESS)
      expect(result.items[0].combinations[0].countyName).toBe('Maceió')
    })
  })
})
