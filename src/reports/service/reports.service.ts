import { Injectable, NotFoundException } from "@nestjs/common";
import { PaginationParams } from "src/helpers/params";
import { GroupingService } from "./grouping.service";
import { GeneralSynthesisService } from "./general-synthesis.service";
import { PerformanceLevelService } from "./performance-level.service";
import { ResultByDescriptorsService } from "./result-by-descriptors.service";
import { EvolutionaryLineService } from "./evolutionary-line.service";
import { ReleasesService } from "./releases.service";
import { Assessment } from "src/assessment/model/entities/assessment.entity";
import { Test } from "src/test/model/entities/test.entity";
import { County } from "src/counties/model/entities/county.entity";
import { School } from "src/school/model/entities/school.entity";
import { SchoolClass } from "src/school-class/model/entities/school-class.entity";
import { ReportEdition } from "../model/entities/report-edition.entity";
import { InjectRepository } from "@nestjs/typeorm";
import { ReportSubject } from "../model/entities/report-subject.entity";
import { Repository } from "typeorm";
import { ReleaseResultsService } from "src/release-results/service/release-results.service";
import { DeepPartial } from "typeorm/common/DeepPartial";
import { ReportDescriptor } from "../model/entities/report-descriptor.entity";
import { User } from "src/user/model/entities/user.entity";

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(ReportEdition)
    private reportEditionRepository: Repository<ReportEdition>,

    @InjectRepository(Assessment)
    private assessmentRepository: Repository<Assessment>,

    @InjectRepository(ReportSubject)
    private reportSubjectRepository: Repository<ReportSubject>,

    @InjectRepository(ReportDescriptor)
    private reportDescriptorRepository: Repository<ReportDescriptor>,

    private groupingService: GroupingService,
    private generalSynthesisService: GeneralSynthesisService,
    private performanceLevelService: PerformanceLevelService,
    private resultByDescriptorsService: ResultByDescriptorsService,
    private evolutionaryLineService: EvolutionaryLineService,
    private releasesService: ReleasesService,
    private realeaseResultsService: ReleaseResultsService,
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
    return this.evolutionaryLineService.evolutionaryLine(paginationParams, user);
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

  async generateCsvGeneralSynthesis(paginationParams: PaginationParams, user: User) {
    return await this.generalSynthesisService.generateCsv(paginationParams, user);
  }

  // @Cron('45 * * * * *', {
  //   name: 'Report generation',
  //   timeZone: 'America/Sao_Paulo',
  // })
  async jobReports() {
    const queryBuilder = this.assessmentRepository
      .createQueryBuilder("AVALIACAO")
      .leftJoinAndSelect("AVALIACAO.AVA_AVM", "AVA_AVM")
      .leftJoinAndSelect("AVA_AVM.AVM_MUN", "AVM_MUN")
      .leftJoinAndSelect("AVA_AVM.AVM_AVA", "AVM_AVA")
      .leftJoinAndSelect("AVALIACAO.AVA_TES", "AVA_TES")
      .leftJoinAndSelect("AVA_TES.TES_DIS", "TES_DIS")
      .leftJoinAndSelect("AVA_TES.STUDENTS_TEST", "STUDENTS_TEST")
      .leftJoinAndSelect("AVA_TES.TEMPLATE_TEST", "TEMPLATE_TEST")
      .leftJoinAndSelect("TEMPLATE_TEST.TEG_MTI", "TEG_MTI")
      .leftJoinAndSelect("STUDENTS_TEST.ANSWERS_TEST", "ANSWERS_TEST")
      .leftJoinAndSelect("STUDENTS_TEST.ALT_ALU", "ALT_ALU")
      .leftJoinAndSelect("ALT_ALU.ALU_ESC", "ALU_ESC")
      .leftJoinAndSelect("ALT_ALU.ALU_TUR", "ALU_TUR")
      .loadRelationCountAndMap("AVA_TES.TOTAL_ALUNOS", "AVA_TES.STUDENTS_TEST")
      .loadRelationCountAndMap(
        "STUDENTS_TEST.QUESTOES_CERTA",
        "STUDENTS_TEST.ANSWERS_TEST",
        "questions",
        (qb) => qb.where("questions.ATR_CERTO = true"),
      );

    // queryBuilder.andWhere("AVALIACAO.AVA_ID = :AVA_ID", {
    //   AVA_ID: "aff21d93-23bc-470b-8e37-a9e2c1f2b476",
    // });

    queryBuilder.orderBy("AVM_MUN.MUN_NOME", "DESC");

    queryBuilder.leftJoinAndSelect("AVM_MUN.schools", "schools");
    queryBuilder.leftJoinAndSelect("schools.ESC_TUR", "ESC_TUR");

    const data = await queryBuilder.getMany();

    if (!data) {
      throw new NotFoundException("Nenhum dado foi encontrado");
    }

    for (const ava of data) {
      for (const county of ava.AVA_AVM) {
        const TESTES = county.AVM_AVA.AVA_TES.filter(function (a) {
          return (
            !this[JSON.stringify(a?.TES_DIS.DIS_NOME)] &&
            (this[JSON.stringify(a?.TES_DIS.DIS_NOME)] = true)
          );
        }, Object.create(null));

        await this.saveTestsInJob(ava, TESTES, county.AVM_MUN);

        for (const school of county.AVM_MUN.schools) {
          await this.saveTestsInJob(ava, TESTES, county.AVM_MUN, school);

          for (const schoolClass of school.ESC_TUR) {
            await this.saveTestsInJob(
              ava,
              TESTES,
              county.AVM_MUN,
              school,
              schoolClass,
            );
          }
        }
      }
    }
  }

  async saveTestsInJob(
    ava: Assessment,
    testes: Test[],
    county: County,
    school?: School,
    schoolClass?: SchoolClass,
  ) {
    let edition: ReportEdition;

    if (schoolClass) {
      edition = await this.reportEditionRepository.findOne({
        where: {
          edition: {
            AVA_ID: ava.AVA_ID,
          },
          schoolClass: {
            TUR_ID: schoolClass.TUR_ID,
          },
        },
        relations: ["reports_subjects"],
      });

      if (!edition) {
        edition = this.reportEditionRepository.create({
          edition: ava,
          schoolClass: schoolClass,
        });

        this.reportEditionRepository.save(edition);
      } else {
        await this.reportSubjectRepository.remove(edition.reportsSubjects);
      }
    } else if (school) {
      edition = await this.reportEditionRepository.findOne({
        where: {
          edition: {
            AVA_ID: ava.AVA_ID,
          },
          school: {
            ESC_ID: school.ESC_ID,
          },
        },
        relations: ["reports_subjects"],
      });

      if (!edition) {
        edition = this.reportEditionRepository.create({
          edition: ava,
          school,
        });

        this.reportEditionRepository.save(edition);
      } else {
        await this.reportSubjectRepository.remove(edition.reportsSubjects);
      }
    } else if (county) {
      let edition = await this.reportEditionRepository.findOne({
        where: {
          edition: {
            AVA_ID: ava.AVA_ID,
          },
          county: {
            MUN_ID: county.MUN_ID,
          },
        },
        relations: ["reports_subjects"],
      });

      if (!edition) {
        edition = this.reportEditionRepository.create({
          edition: ava,
          county,
        });

        this.reportEditionRepository.save(edition);
      } else {
        await this.reportSubjectRepository.remove(edition.reportsSubjects);
      }
    }

    for (const test of testes) {
      const students =
        await this.realeaseResultsService.getStudentByHistorySchool(
          test.TES_ID,
          county?.MUN_ID,
          school?.ESC_ID,
          schoolClass?.TUR_ID,
        );

      if (test.TES_DIS.DIS_TIPO === "Objetiva") {
        const countLaunched = students.filter(
          (student) => student.ANSWERS_TEST.length,
        ).length;

        const notes = students.reduce((acc, student: any) => {
          if (student.ALT_FINALIZADO) {
            const note = Math.floor(
              (student?.QUESTOES_CERTA / test.TEMPLATE_TEST.length) * 100,
            );

            return acc + note;
          } else {
            return acc;
          }
        }, 0);

        const report_subject = this.reportSubjectRepository.create({
          name: test.TES_NOME,
          type: test.TES_DIS.DIS_TIPO,
          countStudentsLaunched: countLaunched,
          test,
          totalGradesStudents: notes,
          countTotalStudents: students.length,
          reportEdition: edition,
        });

        this.reportSubjectRepository.save(report_subject);
      } else {
        const resultDataReading = students.reduce(
          (acc, cur) => {
            if (!cur.ANSWERS_TEST.length) {
              return {
                ...acc,
                nao_informado: acc.nao_informado + 1,
              };
            }

            return {
              ...acc,
              [cur.ANSWERS_TEST[0].ATR_RESPOSTA]:
                acc[cur.ANSWERS_TEST[0].ATR_RESPOSTA] + 1,
            };
          },
          {
            fluente: 0,
            nao_fluente: 0,
            frases: 0,
            palavras: 0,
            silabas: 0,
            nao_leitor: 0,
            nao_avaliado: 0,
            nao_informado: 0,
          },
        );

        const countLaunched = students.filter(
          (student) => student.ANSWERS_TEST.length,
        ).length;

        const report_subject = this.reportSubjectRepository.create({
          name: test.TES_NOME,
          type: test.TES_DIS.DIS_TIPO,
          countStudentsLaunched: countLaunched,
          test,
          totalGradesStudents: 0,
          countTotalStudents: students.length,
          reportEdition: edition,
          ...resultDataReading,
        });

        this.reportSubjectRepository.save(report_subject);
      }
    }
  }

  async upsertReportEditionByAssessmentId(
    assessmentId: number,
    filter: DeepPartial<ReportEdition>,
    relations = ["reportsSubjects", "reports_descriptors"],
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

      return reportEdition;
    }

    const newReportEdition = this.reportEditionRepository.create({
      edition: { AVA_ID: assessmentId },
      ...filter,
    });

    return this.reportEditionRepository.save(newReportEdition);
  }
}
