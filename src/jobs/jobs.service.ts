import { Injectable } from "@nestjs/common";
import { InjectConnection, InjectRepository } from "@nestjs/typeorm";
import * as _ from "lodash";
import { SchoolClass } from "src/school-class/model/entities/school-class.entity";
import { Job as SAEVJob } from "./job.entity";
import { Connection, Repository } from "typeorm";
import { ReadStream } from "typeorm/platform/PlatformTools";
import { Assessment } from "../assessment/model/entities/assessment.entity";
import { StudentTestAnswer } from "../release-results/model/entities/student-test-answer.entity";
import { StudentTest } from "../release-results/model/entities/student-test.entity";
import { ReportEdition } from "../reports/model/entities/report-edition.entity";
import { ReportSubject } from "../reports/model/entities/report-subject.entity";
import { ReportsService } from "../reports/service/reports.service";
import { SubjectTypeEnum } from "../subject/model/enum/subject.enum";
import { Test } from "../test/model/entities/test.entity";
import { JobType } from "./job-type.enum";
import { Student } from "src/student/model/entities/student.entity";
import { JobNotEvaluatedService } from "./services/job-not-evaluated.service";
import { JobRaceService } from "./services/job-race.service";
import { JobDescriptorsService } from "./services/job-descriptor.service";
import { JobSubjectService } from "./services/job-subject.service";

@Injectable()
export class JobsService {
  constructor(
    @InjectConnection()
    private readonly connection: Connection,

    @InjectRepository(ReportSubject)
    private readonly reportSubjectsRepository: Repository<ReportSubject>,

    @InjectRepository(SAEVJob)
    private readonly jobsRepository: Repository<SAEVJob>,

    private readonly reportsService: ReportsService,
    private readonly jobSubjectService: JobSubjectService,
    private readonly jobNotEvaluatedService: JobNotEvaluatedService,
    private readonly jobRaceService: JobRaceService,
    private readonly jobDescriptorsService: JobDescriptorsService,
  ) {}

  async startJob() {
    const jobHistory = this.jobsRepository.create({
      bullId: "",
      assessmentId: 0,
      countyId: 0,
      jobType: JobType.JOB_FULL,
      startDate: new Date(),
    });

    const newJobHistory = await this.jobsRepository.save(jobHistory);

    const finalDate = new Date();
    let day = finalDate.getDate();
    day = day - 1;
    finalDate.setDate(day);

    const editions = await this.connection
      .getRepository(Assessment)
      .createQueryBuilder("Assessment")
      .select(["Assessment.AVA_ID", "AVA_AVM.AVM_ID", "AVM_MUN.MUN_ID"])
      .innerJoin(
        "Assessment.AVA_AVM",
        "AVA_AVM",
        "AVA_AVM.AVM_DT_INICIO <= :initialDate AND DATE_SUB(AVA_AVM.AVM_DT_FIM, INTERVAL 3 HOUR) >= :finalDate",
        { initialDate: new Date(), finalDate },
      )
      .leftJoin("AVA_AVM.AVM_MUN", "AVM_MUN")
      .getMany();

    for (const edition of editions) {
      for (const assessmentCounty of edition.AVA_AVM) {
        await this.generateReportEditionsBySchoolClasses(
          edition.AVA_ID,
          assessmentCounty.AVM_MUN.MUN_ID,
        );
        await this.generateReportEditionsBySchool(
          edition.AVA_ID,
          assessmentCounty.AVM_MUN.MUN_ID,
        );
        await this.generateReportEditionsByCounty(
          edition.AVA_ID,
          assessmentCounty.AVM_MUN.MUN_ID,
        );
      }
      await this.generateReportEditionsByEdition(edition.AVA_ID);
    }

    for (const edition of editions) {
      for (const assessmentCounty of edition.AVA_AVM) {
        await this.jobDescriptorsService.generateReportEditionsWithReportDescriptorsBySchool(
          edition.AVA_ID,
          assessmentCounty.AVM_MUN.MUN_ID,
        );
        await this.jobDescriptorsService.generateReportEditionsWithReportsDescriptorsByCounty(
          edition.AVA_ID,
          assessmentCounty.AVM_MUN.MUN_ID,
        );
      }
      await this.jobDescriptorsService.generateReportEditionsWithReportsDescriptorsByEdition(
        edition.AVA_ID,
      );
    }

    newJobHistory.endDate = new Date();
    await this.jobsRepository.save(newJobHistory);
  }

  async generateReportEditionsByEdition(assessmentId: number) {
    await this.jobSubjectService.generateReportSubjectByEdition(assessmentId);

    await this.jobNotEvaluatedService.generateReportEditionsByEdition(
      assessmentId,
    );
  }

  async generateReportEditionsByCounty(assessmentId: number, countyId: number) {
    await this.jobSubjectService.generateReportSubjectByCounty(
      assessmentId,
      countyId,
    );

    await this.jobNotEvaluatedService.generateReportEditionsByCounty(
      assessmentId,
      countyId,
    );
  }

  async generateReportEditionsBySchool(assessmentId: number, countyId: number) {
    await this.jobSubjectService.generateReportSubjectBySchool(
      assessmentId,
      countyId,
    );

    await this.jobNotEvaluatedService.generateReportEditionsBySchool(
      assessmentId,
      countyId,
    );
  }

  async generateReportEditionsBySchoolClasses(
    assessmentId: number,
    countyId: number,
  ) {
    const assessmentStream = await this.getAssessmentsReadStream(assessmentId);

    for await (const assessment of assessmentStream) {
      const schoolClasses = await this.getSchoolClassesByAssessmentId(
        assessment,
        countyId,
      );

      const exams = await this.getExamsByAssessmentId(assessment.AVA_ID);

      for await (const schoolClass of schoolClasses) {
        const reportEdition =
          await this.reportsService.upsertReportEditionByAssessmentId(
            assessment.AVA_ID,
            { schoolClass: { TUR_ID: schoolClass.TUR_ID } },
          );

        const students = await this.connection
          .getRepository(Student)
          .createQueryBuilder("Student")
          .leftJoin("Student.ALU_PEL", "ALU_PEL")
          .select(["Student.ALU_ID", "ALU_PEL.PEL_ID"])
          .where("Student.ALU_TUR = :schoolClass", {
            schoolClass: schoolClass.TUR_ID,
          })
          .andWhere("Student.ALU_ATIVO = true")
          .getMany();

        for await (const exam of exams) {
          await this.generateReportSubjectBySchoolClass(
            assessmentId,
            schoolClass,
            exam,
            reportEdition,
            students,
          );
        }
      }
    }
  }

  private async getAssessmentsReadStream(
    assessmentId: number,
  ): Promise<ReadStream> {
    return this.connection
      .getRepository(Assessment)
      .createQueryBuilder("AVALIACAO")
      .select(["AVALIACAO.AVA_ID as AVA_ID", "AVALIACAO.AVA_ANO as AVA_ANO"])
      .innerJoin(
        "avaliacao_teste",
        "AVALIACAO_TESTE",
        "AVALIACAO_TESTE.AVA_ID = AVALIACAO.AVA_ID",
      )
      .where("AVALIACAO.AVA_ID = :assessmentId", { assessmentId })
      .groupBy("AVALIACAO.AVA_ID")
      .stream();
  }

  private async getSchoolClassesByAssessmentId(
    assessment: Assessment,
    countyId: number,
  ): Promise<SchoolClass[]> {
    return this.connection
      .getRepository<SchoolClass>(SchoolClass)
      .createQueryBuilder("TURMA")
      .innerJoinAndSelect(
        "TURMA.TUR_ESC",
        "ESCOLA",
        "TURMA.TUR_ESC_ID = ESCOLA.ESC_ID",
      )
      .innerJoin(
        "ESCOLA.ESC_MUN",
        "MUNICIPIO",
        "MUNICIPIO.MUN_ID = ESCOLA.ESC_MUN_ID AND MUNICIPIO.MUN_ID = :countyId",
        { countyId },
      )
      .innerJoin(
        "avaliacao_municipio",
        "AVALIACAO_MUNICIPIO",
        "AVALIACAO_MUNICIPIO.AVM_MUN_ID = MUNICIPIO.MUN_ID AND AVALIACAO_MUNICIPIO.AVM_AVA_ID = :assessmentId",
        {
          assessmentId: assessment.AVA_ID,
        },
      )
      .innerJoinAndSelect(
        "TURMA.TUR_SER",
        "SERIE",
        "TURMA.TUR_SER_ID = SERIE.SER_ID",
      )
      .where("TURMA.TUR_ANO = :assessmentYear", {
        assessmentYear: assessment.AVA_ANO,
      })
      .andWhere("TURMA.TUR_ATIVO = true")
      .getMany();
  }

  async getExamsByAssessmentId(assessmentId: string) {
    return await this.connection
      .getRepository<Test>(Test)
      .createQueryBuilder("TESTE")
      .innerJoin(
        "avaliacao_teste",
        "AVALIACAO_TESTE",
        "AVALIACAO_TESTE.AVA_ID = :assessmentId AND AVALIACAO_TESTE.TES_ID = TESTE.TES_ID",
        { assessmentId },
      )
      .innerJoinAndSelect(
        "TESTE.TES_SER",
        "SERIE",
        "TESTE.TES_SER_ID = SERIE.SER_ID",
      )
      .innerJoinAndSelect("TESTE.TES_DIS", "TES_DIS")
      .getMany();
  }

  private async generateReportSubjectBySchoolClass(
    assessmentId: number,
    schoolClass: SchoolClass,
    exam: Test,
    reportEdition: ReportEdition,
    studentsCurrent: Student[],
  ) {
    if (
      schoolClass.TUR_ANO !== exam.TES_ANO ||
      schoolClass.TUR_SER.SER_ID !== exam.TES_SER.SER_ID
    ) {
      return;
    }

    const studentSubmissions = await this.connection
      .getRepository<StudentTest>(StudentTest)
      .createQueryBuilder("ALUNO_TESTE")
      .select([
        "ALUNO_TESTE",
        "ALUNO.ALU_ID",
        "ALU_PEL.PEL_ID",
        "questionTemplate.TEG_ID",
        "TEG_MTI.MTI_ID",
      ])
      .innerJoin(
        "ALUNO_TESTE.ALT_TES",
        "TESTE",
        "TESTE.TES_ID = ALUNO_TESTE.ALT_TES_ID",
      )
      .innerJoin(
        "ALUNO_TESTE.ALT_ALU",
        "ALUNO",
        "ALUNO.ALU_ID = ALUNO_TESTE.ALT_ALU_ID",
      )
      .leftJoinAndMapMany(
        "ALUNO_TESTE.ANSWERS_TEST",
        StudentTestAnswer,
        "ANSWER",
        "ANSWER.ATR_ALT_ID = ALUNO_TESTE.ALT_ID AND ALUNO_TESTE.ALT_FINALIZADO = 1",
      )
      .leftJoin("ANSWER.questionTemplate", "questionTemplate")
      .leftJoin("questionTemplate.TEG_MTI", "TEG_MTI")
      .leftJoin("ALUNO.ALU_PEL", "ALU_PEL")
      .where("ALUNO_TESTE.ALT_TES_ID = :examId", { examId: exam.TES_ID })
      .andWhere("ALUNO_TESTE.schoolClass = :schoolClass", {
        schoolClass: schoolClass.TUR_ID,
      })
      .getMany();

    const totalStudentsCurrent = studentsCurrent?.length;
    if (!totalStudentsCurrent && !studentSubmissions.length) {
      return;
    }

    const filterStudents = studentsCurrent.filter(
      (item) =>
        !studentSubmissions.map((x) => x.ALT_ALU.ALU_ID).includes(item.ALU_ID),
    );
    let verifyIds = [];

    for (const student of filterStudents) {
      const verify = await this.connection.getRepository(StudentTest).findOne({
        where: {
          ALT_ALU: {
            ALU_ID: student.ALU_ID,
          },
          ALT_TES: {
            TES_ID: exam.TES_ID,
          },
        },
      });

      if (!verify) {
        verifyIds.push(student);
      }
    }

    let totalStudents = studentSubmissions?.length + verifyIds.length;

    const ids: string[] = [];
    const allStudents = [];

    studentSubmissions.forEach((item) => {
      ids.push(String(item.ALT_ALU.ALU_ID));
      allStudents.push(item.ALT_ALU);
    });

    verifyIds?.forEach((item) => {
      ids.push(String(item.ALU_ID));
      allStudents.push(item);
    });

    if (!totalStudents) {
      return;
    }

    let reportSubject;

    switch (exam.TES_DIS.DIS_TIPO) {
      case SubjectTypeEnum.OBJETIVA:
        {
          let totalPresentStudents = 0;
          let totalGrades = 0;

          totalGrades = studentSubmissions?.reduce(
            (prev: number, cur: StudentTest) => {
              if (!cur.ALT_FINALIZADO) {
                return prev;
              }

              totalPresentStudents++;

              const ANSWERS_TEST = cur?.ANSWERS_TEST?.filter(
                (arr, index, self) =>
                  index ===
                  self.findIndex(
                    (t) =>
                      t?.questionTemplate?.TEG_ID ===
                      arr?.questionTemplate?.TEG_ID,
                  ),
              );

              const totalCorrects = ANSWERS_TEST?.reduce(
                (prev: number, cur: StudentTestAnswer) => {
                  if (cur.ATR_CERTO) {
                    return prev + 1;
                  }
                  return prev;
                },
                0,
              );

              return (
                prev +
                (!!ANSWERS_TEST.length
                  ? Math.round((totalCorrects / ANSWERS_TEST.length) * 100)
                  : 0)
              );
            },
            0,
          );

          reportSubject = this.reportSubjectsRepository.create({
            type: SubjectTypeEnum.OBJETIVA,
            name: exam.TES_DIS.DIS_NOME,
            test: exam,
            countTotalStudents: totalStudents,
            countStudentsLaunched: studentSubmissions.length,
            countPresentStudents: totalPresentStudents,
            totalGradesStudents: totalGrades,
            reportEdition: reportEdition,
            idStudents: ids,
          });
        }
        break;
      case SubjectTypeEnum.LEITURA:
        {
          let totalGrades = {
            leitura: {
              fluente: 0,
              nao_fluente: 0,
              frases: 0,
              palavras: 0,
              silabas: 0,
              nao_leitor: 0,
              nao_avaliado: 0,
              nao_informado: 0,
            },
            totalLaunched: 0,
            totalPresent: 0,
          };

          totalGrades = studentSubmissions?.reduce(
            (prev: any, cur: StudentTest) => {
              prev.totalLaunched++;
              if (!cur.ALT_FINALIZADO || !cur.ANSWERS_TEST.length) {
                prev.leitura["nao_avaliado"] = prev.leitura["nao_avaliado"] + 1;
                return prev;
              }

              prev.totalPresent++;

              prev.leitura[cur.ANSWERS_TEST[0].ATR_RESPOSTA] =
                prev.leitura[cur.ANSWERS_TEST[0].ATR_RESPOSTA] + 1;
              return prev;
            },
            totalGrades,
          );

          totalGrades.leitura.nao_informado =
            totalStudents - totalGrades.totalLaunched;

          reportSubject = this.reportSubjectsRepository.create({
            ...totalGrades.leitura,
            type: SubjectTypeEnum.LEITURA,
            name: exam.TES_DIS.DIS_NOME,
            test: exam,
            countTotalStudents: totalStudents,
            countStudentsLaunched: totalGrades.totalLaunched,
            countPresentStudents: totalGrades.totalPresent,
            reportEdition: reportEdition,
            idStudents: ids,
          });
        }
        break;
      default:
        return;
    }

    await this.reportSubjectsRepository.save(reportSubject);
    await this.jobNotEvaluatedService.generateReportSubjectBySchoolClass(
      totalStudents,
      exam,
      reportEdition,
      studentSubmissions,
      ids,
    );
    await this.jobRaceService.generateReportRacesBySchoolClass(
      reportSubject,
      allStudents,
      studentSubmissions,
      exam,
    );

    if (exam.TES_DIS.DIS_TIPO !== SubjectTypeEnum.OBJETIVA) {
      return;
    }

    if (!studentSubmissions.length) {
      return;
    }

    // await this.jobQuestionService.generateReportQuestionBySchoolClass(
    //   assessmentId,
    //   reportSubject,
    //   studentSubmissions,
    //   exam,
    // );

    await this.jobDescriptorsService.generateReportDescriptorBySchoolClass(
      exam,
      reportEdition,
      studentSubmissions,
    );
  }
}
