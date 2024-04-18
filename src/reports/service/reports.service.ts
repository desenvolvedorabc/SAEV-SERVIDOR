import { Injectable } from "@nestjs/common";
import { PaginationParams } from "src/helpers/params";
import { GroupingService } from "./grouping.service";
import { GeneralSynthesisService } from "./general-synthesis.service";
import { PerformanceLevelService } from "./performance-level.service";
import { ResultByDescriptorsService } from "./result-by-descriptors.service";
import { EvolutionaryLineService } from "./evolutionary-line.service";
import { ReleasesService } from "./releases.service";
import { ReportEdition } from "../model/entities/report-edition.entity";
import { InjectRepository } from "@nestjs/typeorm";
import { ReportSubject } from "../model/entities/report-subject.entity";
import { Repository } from "typeorm";
import { DeepPartial } from "typeorm/common/DeepPartial";
import { ReportDescriptor } from "../model/entities/report-descriptor.entity";
import { User } from "src/user/model/entities/user.entity";
import { ReportNotEvaluated } from "../model/entities/report-not-evaluated.entity";
import { NotEvaluatedService } from "./not-evaluated.service";
import { ReportRaceService } from "./race.service";
import { ReportSyntheticService } from "./synthetic.service";

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(ReportEdition)
    private reportEditionRepository: Repository<ReportEdition>,

    @InjectRepository(ReportSubject)
    private reportSubjectRepository: Repository<ReportSubject>,

    @InjectRepository(ReportDescriptor)
    private reportDescriptorRepository: Repository<ReportDescriptor>,

    @InjectRepository(ReportNotEvaluated)
    private reportNotEvaluatedRepository: Repository<ReportNotEvaluated>,

    private groupingService: GroupingService,
    private generalSynthesisService: GeneralSynthesisService,
    private performanceLevelService: PerformanceLevelService,
    private resultByDescriptorsService: ResultByDescriptorsService,
    private evolutionaryLineService: EvolutionaryLineService,
    private releasesService: ReleasesService,
    private notEvaluatedService: NotEvaluatedService,
    private reportRaceService: ReportRaceService,
    private reportSyntheticService: ReportSyntheticService,
  ) {}

  async grouping(paginationParams: PaginationParams, user: User) {
    return this.groupingService.handle(paginationParams, user);
  }

  async performanceLevel(paginationParams: PaginationParams, user: User) {
    return this.performanceLevelService.handle(paginationParams, user);
  }

  async generalSynthesis(paginationParams: PaginationParams, user: User) {
    return this.generalSynthesisService.handle(paginationParams, user);
  }

  async evolutionaryLine(paginationParams: PaginationParams, user: User) {
    return this.evolutionaryLineService.evolutionaryLine(
      paginationParams,
      user,
    );
  }

  async evolutionaryLineOfReading(
    paginationParams: PaginationParams,
    user: User,
  ) {
    return this.evolutionaryLineService.evolutionaryLineOfReading(
      paginationParams,
      user,
    );
  }

  async generateCsvForLineOfReading(
    paginationParams: PaginationParams,
    user: User,
  ) {
    return await this.evolutionaryLineService.generateCsvForLineOfReading(
      paginationParams,
      user,
    );
  }

  async evolutionaryLineByStudent(year: string, idStudent: string) {
    return this.evolutionaryLineService.evolutionaryLineByStudent(
      year,
      idStudent,
    );
  }

  async releases(paginationParams: PaginationParams, user: User) {
    return this.releasesService.handle(paginationParams, user);
  }

  async resultByDescriptors(paginationParams: PaginationParams, user: User) {
    return this.resultByDescriptorsService.handle(paginationParams, user);
  }

  async generateCsvGeneralSynthesis(
    paginationParams: PaginationParams,
    user: User,
  ) {
    return await this.generalSynthesisService.generateCsv(
      paginationParams,
      user,
    );
  }

  async notEvaluated(paginationParams: PaginationParams, user: User) {
    return this.notEvaluatedService.handle(paginationParams, user);
  }

  async generateCsvNotEvaluated(
    paginationParams: PaginationParams,
    user: User,
  ) {
    return await this.notEvaluatedService.generateCsv(paginationParams, user);
  }

  async race(paginationParams: PaginationParams, user: User) {
    return await this.reportRaceService.handle(paginationParams, user);
  }

  async synthetic(paginationParams: PaginationParams, user: User) {
    return await this.reportSyntheticService.handle(paginationParams, user);
  }

  async generateCsvForSynthetic(paginationParams: PaginationParams, user: User) {
    return await this.reportSyntheticService.generateCsv(paginationParams, user);
  }

  async generateCsvForRace(paginationParams: PaginationParams, user: User) {
    return await this.reportRaceService.generateCsv(paginationParams, user);
  }

  async upsertReportEditionByAssessmentId(
    assessmentId: number,
    filter: DeepPartial<ReportEdition>,
    relations = [
      "reportsSubjects",
      "reports_descriptors",
      "reports_not_evaluated",
    ],
  ) {
    const reportEdition = await this.reportEditionRepository.findOne({
      where: {
        edition: { AVA_ID: assessmentId },
        ...filter,
      },
      relations,
    });

    if (reportEdition) {
      if (reportEdition?.reports_descriptors?.length) {
        await this.reportDescriptorRepository.remove(
          reportEdition.reports_descriptors,
        );
      }

      if (reportEdition?.reportsSubjects?.length) {
        await this.reportSubjectRepository.remove(
          reportEdition.reportsSubjects,
        );
      }

      if (reportEdition?.reports_not_evaluated?.length) {
        await this.reportNotEvaluatedRepository.remove(
          reportEdition.reports_not_evaluated,
        );
      }

      return reportEdition;
    }

    const newReportEdition = this.reportEditionRepository.create({
      edition: { AVA_ID: assessmentId },
      ...filter,
    });

    return this.reportEditionRepository.save(newReportEdition);
  }
}
