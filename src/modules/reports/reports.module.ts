import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Assessment } from 'src/modules/assessment/model/entities/assessment.entity'
import { County } from 'src/modules/counties/model/entities/county.entity'
import { Headquarter } from 'src/modules/headquarters/model/entities/headquarter.entity'
import { StudentTest } from 'src/modules/release-results/model/entities/student-test.entity'
import { ReleaseResultsModule } from 'src/modules/release-results/release-results.module'
import { School } from 'src/modules/school/model/entities/school.entity'
import { SchoolClass } from 'src/modules/school-class/model/entities/school-class.entity'
import { Serie } from 'src/modules/serie/model/entities/serie.entity'
import { Student } from 'src/modules/student/model/entities/student.entity'
import { Test } from 'src/modules/test/model/entities/test.entity'

import { RegionalModule } from '../regional/regional.module'
import { SchoolAbsence } from '../school-absences/model/entities/school-absences.entity'
import { SchoolClassStudent } from '../school-class/model/entities/school-class-student.entity'
import { StudentModule } from '../student/student.module'
import { ReportsController } from './controller/reports.controller'
import { ReportDescriptor } from './model/entities/report-descriptor.entity'
import { ReportEdition } from './model/entities/report-edition.entity'
import { ReportNotEvaluated } from './model/entities/report-not-evaluated.entity'
import { ReportRace } from './model/entities/report-race.entity'
import { ReportSubject } from './model/entities/report-subject.entity'
import { EvolutionaryLineRepository } from './repositories/evolutionary-line.repository'
import { GeneralSynthesisRepository } from './repositories/general-synthesis.repository'
import { ReportGroupingRepository } from './repositories/grouping.repository'
import { NotEvaluatedRepository } from './repositories/not-evaluated.repository'
import { PerformanceHistoryRepository } from './repositories/performance-history.repository'
import { PerformanceLevelRepository } from './repositories/performance-level.repository'
import { ReportRaceRepository } from './repositories/race.repository'
import { ReleasesRepository } from './repositories/releases.repository'
import { ResultByDescriptorsRepository } from './repositories/result-by-descriptors.repository'
import { ReportSyntheticRepository } from './repositories/synthetic.repository'
import { EvolutionaryLineService } from './service/evolutionary-line.service'
import { EvolutionaryLineReadingService } from './service/evolutionary-line-reading.service'
import { GeneralSynthesisService } from './service/general-synthesis.service'
import { GroupingService } from './service/grouping.service'
import { NotEvaluatedService } from './service/not-evaluated.service'
import { PerformanceHistoryService } from './service/performance-history.service'
import { PerformanceLevelService } from './service/performance-level.service'
import { ReportRaceService } from './service/race.service'
import { ReleasesService } from './service/releases.service'
import { ReportsService } from './service/reports.service'
import { ResultByDescriptorsService } from './service/result-by-descriptors.service'
import { ReportSchoolAbsencesService } from './service/school-absences.service'
import { ReportSyntheticService } from './service/synthetic.service'

@Module({
  imports: [
    TypeOrmModule.forFeature([
      County,
      Student,
      SchoolClass,
      SchoolClassStudent,
      Serie,
      School,
      Assessment,
      StudentTest,
      Test,
      Headquarter,
      ReportEdition,
      ReportSubject,
      ReportDescriptor,
      ReportNotEvaluated,
      ReportRace,
      SchoolAbsence,
    ]),
    ReleaseResultsModule,
    RegionalModule,
    StudentModule,
  ],
  providers: [
    ReportsService,
    GeneralSynthesisService,
    EvolutionaryLineService,
    ReleasesService,
    GroupingService,
    ResultByDescriptorsService,
    PerformanceLevelService,
    NotEvaluatedService,
    ReportRaceService,
    ReportSyntheticService,
    EvolutionaryLineReadingService,
    GeneralSynthesisRepository,
    EvolutionaryLineRepository,
    ReleasesRepository,
    ResultByDescriptorsRepository,
    NotEvaluatedRepository,
    PerformanceLevelRepository,
    ReportRaceRepository,
    ReportGroupingRepository,
    ReportSchoolAbsencesService,
    ReportSyntheticRepository,
    PerformanceHistoryService,
    PerformanceHistoryRepository,
  ],
  controllers: [ReportsController],
  exports: [EvolutionaryLineService, ReportsService],
})
export class ReportsModule {}
