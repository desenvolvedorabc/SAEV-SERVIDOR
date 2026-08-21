import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { In, Repository } from 'typeorm'

import { paginateData } from '../../../utils/paginate-data'
import { County } from '../../counties/model/entities/county.entity'
import { User } from '../../user/model/entities/user.entity'
import {
  BATCH_OPERATION_DISPATCHER,
  BatchOperationDispatcher,
} from '../dispatcher/batch-operation-dispatcher.interface'
import { CreateClassDeactivationDto } from '../dto/create-class-deactivation.dto'
import { CreateStudentDeactivationDto } from '../dto/create-student-deactivation.dto'
import { ListBatchOperationsQueryDto } from '../dto/list-batch-operations-query.dto'
import { BatchOperation } from '../model/entities/batch-operation.entity'
import {
  BatchOperationStatus,
  toStatusTag,
} from '../model/enums/batch-operation-status.enum'
import { BatchOperationType } from '../model/enums/batch-operation-type.enum'
import { BatchOperationResponse } from '../model/interface/batch-operation-response.interface'

const ACTIVE_STATUSES = [
  BatchOperationStatus.PENDING,
  BatchOperationStatus.RUNNING,
]

@Injectable()
export class BatchOperationService {
  private readonly logger = new Logger(BatchOperationService.name)

  constructor(
    @InjectRepository(BatchOperation)
    private readonly batchOperationRepository: Repository<BatchOperation>,

    @InjectRepository(County)
    private readonly countyRepository: Repository<County>,

    @Inject(BATCH_OPERATION_DISPATCHER)
    private readonly dispatcher: BatchOperationDispatcher,
  ) {}

  async createStudentDeactivation(
    dto: CreateStudentDeactivationDto,
    user: User,
  ): Promise<BatchOperationResponse> {
    if (!dto.combinations?.length) {
      throw new BadRequestException(
        'É necessário ao menos uma combinação de município e rede.',
      )
    }

    await this.assertNoOperationInProgress()

    const operation = this.batchOperationRepository.create({
      type: BatchOperationType.STUDENT_DEACTIVATION,
      status: BatchOperationStatus.PENDING,
      combinations: dto.combinations.map((c) => ({
        countyId: c.countyId,
        network: c.network,
      })),
      year: null,
      retryCount: 0,
      requestedByUserId: user?.USU_ID ?? null,
    })

    const saved = await this.batchOperationRepository.save(operation)

    await this.dispatcher.scheduleExecute(saved.id)

    return this.toResponse(saved)
  }

  async createClassDeactivation(
    dto: CreateClassDeactivationDto,
    user: User,
  ): Promise<BatchOperationResponse> {
    const currentYear = new Date().getFullYear()
    if (Number(dto.year) >= currentYear) {
      throw new BadRequestException(
        'A operação só pode ser executada sobre anos letivos anteriores ao corrente.',
      )
    }

    await this.assertNoOperationInProgress()

    const operation = this.batchOperationRepository.create({
      type: BatchOperationType.CLASS_DEACTIVATION,
      status: BatchOperationStatus.PENDING,
      combinations: dto.combinations.map((c) => ({
        countyId: c.countyId,
        network: c.network,
      })),
      year: dto.year,
      retryCount: 0,
      requestedByUserId: user?.USU_ID ?? null,
    })

    const saved = await this.batchOperationRepository.save(operation)

    await this.dispatcher.scheduleExecute(saved.id)

    return this.toResponse(saved)
  }

  async getStatus(id: number): Promise<BatchOperationResponse> {
    const operation = await this.baseQuery()
      .where('operation.id = :id', { id })
      .getOne()

    if (!operation) {
      throw new NotFoundException('Operação não encontrada.')
    }

    return this.toResponse(operation)
  }

  private baseQuery() {
    return this.batchOperationRepository
      .createQueryBuilder('operation')
      .leftJoin('operation.requestedByUser', 'requestedByUser')
      .select([
        'operation.id',
        'operation.type',
        'operation.status',
        'operation.combinations',
        'operation.year',
        'operation.errorMessage',
        'operation.requestedByUserId',
        'operation.createdAt',
        'operation.startDate',
        'operation.endDate',
        'requestedByUser.USU_ID',
        'requestedByUser.USU_NOME',
      ])
  }

  async isAnyInProgress(): Promise<{ inProgress: boolean }> {
    const count = await this.batchOperationRepository.count({
      where: { status: In(ACTIVE_STATUSES) },
    })
    return { inProgress: count > 0 }
  }

  async listHistory(query: ListBatchOperationsQueryDto) {
    const queryBuilder = this.baseQuery().orderBy('operation.createdAt', 'DESC')

    const { items, meta } = await paginateData(
      query.page,
      query.limit,
      queryBuilder,
    )

    const responses = await this.toResponseList(items)

    return { items: responses, meta }
  }

  private async assertNoOperationInProgress(): Promise<void> {
    const inProgress = await this.batchOperationRepository.findOne({
      where: { status: In(ACTIVE_STATUSES) },
    })

    if (inProgress) {
      throw new ConflictException(
        'Há uma operação em andamento. Aguarde a conclusão para executar uma nova ação.',
      )
    }
  }

  private async toResponse(
    operation: BatchOperation,
  ): Promise<BatchOperationResponse> {
    const [response] = await this.toResponseList([operation])
    return response
  }

  private async toResponseList(
    operations: BatchOperation[],
  ): Promise<BatchOperationResponse[]> {
    const countyIds = new Set<number>()
    for (const operation of operations) {
      for (const combination of operation.combinations ?? []) {
        countyIds.add(combination.countyId)
      }
    }

    const countyNameById = new Map<number, string>()
    if (countyIds.size) {
      const counties = await this.countyRepository.find({
        where: { MUN_ID: In([...countyIds]) },
        select: ['MUN_ID', 'MUN_NOME'],
      })
      for (const county of counties) {
        countyNameById.set(county.MUN_ID, county.MUN_NOME)
      }
    }

    return operations.map((operation) => ({
      id: operation.id,
      type: operation.type,
      status: operation.status,
      statusTag: toStatusTag(operation.status),
      combinations: (operation.combinations ?? []).map((combination) => ({
        countyId: combination.countyId,
        countyName: countyNameById.get(combination.countyId) ?? '',
        network: combination.network,
      })),
      year: operation.year,
      errorMessage: operation.errorMessage,
      requestedByUserId: operation.requestedByUserId,
      requestedByUserName: operation.requestedByUser?.USU_NOME ?? null,
      createdAt: operation.createdAt,
      startDate: operation.startDate,
      endDate: operation.endDate,
    }))
  }
}
