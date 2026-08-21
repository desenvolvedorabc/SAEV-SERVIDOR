import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import { BatchOperation } from '../model/entities/batch-operation.entity'
import { BatchOperationType } from '../model/enums/batch-operation-type.enum'
import { ClassDeactivationService } from './class-deactivation.service'
import { StudentDeactivationService } from './student-deactivation.service'

@Injectable()
export class BatchOperationExecutorService {
  private readonly logger = new Logger(BatchOperationExecutorService.name)

  constructor(
    @InjectRepository(BatchOperation)
    private readonly batchOperationRepository: Repository<BatchOperation>,

    private readonly studentDeactivationService: StudentDeactivationService,
    private readonly classDeactivationService: ClassDeactivationService,
  ) {}

  async execute(operationId: number): Promise<void> {
    const operation = await this.batchOperationRepository.findOne({
      where: { id: operationId },
      select: ['id', 'type'],
    })

    if (!operation) {
      this.logger.warn(`BatchOperation ${operationId} not found`)
      return
    }

    switch (operation.type) {
      case BatchOperationType.STUDENT_DEACTIVATION:
        return this.studentDeactivationService.execute(operationId)
      case BatchOperationType.CLASS_DEACTIVATION:
        return this.classDeactivationService.execute(operationId)
      default:
        this.logger.error(
          `BatchOperation ${operationId} has unknown type ${operation.type}`,
        )
    }
  }
}
