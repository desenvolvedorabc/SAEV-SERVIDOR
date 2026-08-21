import { Module } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { TypeOrmModule } from '@nestjs/typeorm'

import { AreaGuard } from '../auth/guard/area.guard'
import { County } from '../counties/model/entities/county.entity'
import { SubProfile } from '../profile/model/entities/sub-profile.entity'
import { SchoolClass } from '../school-class/model/entities/school-class.entity'
import { Student } from '../student/model/entities/student.entity'
import { User } from '../user/model/entities/user.entity'
import { BatchOperationsController } from './controller/batch-operations.controller'
import { BATCH_OPERATION_DISPATCHER } from './dispatcher/batch-operation-dispatcher.interface'
import { CloudTasksBatchOperationDispatcher } from './dispatcher/cloud-tasks-batch-operation-dispatcher'
import { InProcessBatchOperationDispatcher } from './dispatcher/in-process-batch-operation-dispatcher'
import { BatchOperation } from './model/entities/batch-operation.entity'
import { BatchOperationService } from './service/batch-operation.service'
import { BatchOperationExecutorService } from './service/batch-operation-executor.service'
import { BatchOperationReconciliationService } from './service/batch-operation-reconciliation.service'
import { ClassDeactivationService } from './service/class-deactivation.service'
import { StudentDeactivationService } from './service/student-deactivation.service'

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BatchOperation,
      Student,
      County,
      User,
      SubProfile,
      SchoolClass,
    ]),
  ],
  providers: [
    BatchOperationService,
    StudentDeactivationService,
    ClassDeactivationService,
    BatchOperationExecutorService,
    BatchOperationReconciliationService,
    AreaGuard,
    InProcessBatchOperationDispatcher,
    {
      provide: BATCH_OPERATION_DISPATCHER,
      inject: [ConfigService, InProcessBatchOperationDispatcher],
      useFactory: (
        config: ConfigService,
        inProcess: InProcessBatchOperationDispatcher,
      ) => {
        const mode = config.get<string>('REPROCESS_DISPATCHER') ?? 'in-process'
        if (mode === 'cloud-tasks') {
          return new CloudTasksBatchOperationDispatcher(config)
        }
        return inProcess
      },
    },
  ],
  controllers: [BatchOperationsController],
  exports: [
    BatchOperationService,
    StudentDeactivationService,
    ClassDeactivationService,
    BatchOperationExecutorService,
    BatchOperationReconciliationService,
    TypeOrmModule,
  ],
})
export class BatchOperationsModule {}
