import { Injectable } from "@nestjs/common";
import * as Bluebird from 'bluebird';
import { InjectConnection, InjectRepository } from "@nestjs/typeorm";
import * as _ from "lodash";
import { Connection, Repository } from "typeorm";
import { StudentTest } from "src/release-results/model/entities/student-test.entity";
import { ReportSubject } from "src/reports/model/entities/report-subject.entity";
import { Test } from "src/test/model/entities/test.entity";
import { TestTemplate } from "src/test/model/entities/test-template.entity";
import { ReportQuestionOption } from "src/reports/model/entities/report-question-option.entity";
import { ReportQuestion } from "src/reports/model/entities/report-question.entity";
import { SubjectTypeEnum } from "src/subject/model/enum/subject-type.enum";
import { JobQuestionRepository } from "./repositories/job-question.repository";
import { StudentTestAnswer } from "src/release-results/model/entities/student-test-answer.entity";

@Injectable()
export class JobQuestionService {
  constructor(
    @InjectConnection()
    private readonly connection: Connection,

    @InjectRepository(ReportQuestion)
    private readonly reportQuestionRepository: Repository<ReportQuestion>,

    @InjectRepository(ReportQuestionOption)
    private readonly reportQuestionOptionRepository: Repository<ReportQuestionOption>,

    private readonly jobQuestionRepository: JobQuestionRepository,
  ) {}

  async retroativo(assessmentId: number, countyId: number) {
    const reportSubjects = await this.connection
      .getRepository(ReportSubject)
      .createQueryBuilder("ReportSubject")
      .select([
        "ReportSubject.id",
        "ReportSubject.idStudents",
        "test.TES_ID",
        "TES_DIS.DIS_ID",
        "TES_DIS.DIS_TIPO",
      ])
      .innerJoin("ReportSubject.reportEdition", "reportEdition")
      .innerJoin("ReportSubject.test", "test")
      .innerJoin("test.TES_DIS", "TES_DIS")
      .innerJoin("reportEdition.schoolClass", "schoolClass")
      .where("reportEdition.editionAVAID = :assessmentId", { assessmentId })
      .andWhere("ReportSubject.countStudentsLaunched > 0")
      .andWhere("schoolClass.TUR_MUN = :countyId", { countyId })
      .andWhere("TES_DIS.DIS_TIPO != :type", { type: SubjectTypeEnum.LEITURA })
      .getMany();

      await Bluebird.map(reportSubjects, async (reportSubject) => {
        if (reportSubject?.idStudents?.length) {
          const studentSubmissions = await this.connection
            .getRepository<StudentTest>(StudentTest)
            .createQueryBuilder("ALUNO_TESTE")
            .select([
              "ALUNO_TESTE.ALT_ID",
              "ALUNO.ALU_ID",
              "questionTemplate.TEG_ID",
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
            .where("ALUNO.ALU_ID IN(:...ids)", {
              ids: reportSubject.idStudents,
            })
            .andWhere("ALUNO_TESTE.ALT_TES_ID = :examId", {
              examId: reportSubject.test.TES_ID,
            })
            .getMany();

          await this.generateReportQuestionBySchoolClass(
            assessmentId,
            reportSubject,
            studentSubmissions,
            reportSubject.test,
          );
        }
      }, { concurrency: 1000 }); 
  }

  async generateReportQuestionBySchoolClass(
    assessmentId: number,
    reportSubject: ReportSubject,
    studentSubmissions: StudentTest[],
    exam: Test,
  ) {
    const options = ["A", "B", "C", "D", "-"];

    const { testTemplate } = await this.getTemplateTest(exam.TES_ID);

    await Promise.all(
      testTemplate?.map(async (question) => {
        const reportQuestion = this.reportQuestionRepository.create({
          question,
          reportSubject,
        });

        await this.reportQuestionRepository.save(reportQuestion);

        await Promise.all(
          options.map(async (option) => {
            let totalCorrect = 0;
            let dataReading = {
              fluente: 0,
              nao_fluente: 0,
              frases: 0,
              palavras: 0,
              silabas: 0,
              nao_leitor: 0,
              nao_avaliado: 0,
              nao_informado: 0,
            };

            for (const submission of studentSubmissions) {
              const findQuestion = submission?.ANSWERS_TEST?.find(
                (answer) =>
                  answer?.questionTemplate?.TEG_ID === question?.TEG_ID,
              );

              if (findQuestion?.ATR_RESPOSTA?.toUpperCase() === option) {
                totalCorrect += 1;

                const level = await this.getLevelLeituraByStudent(
                  submission.ALT_ALU.ALU_ID,
                  assessmentId,
                );

                dataReading[level] += 1;
              }
            }

            const reportOption = this.reportQuestionOptionRepository.create({
              option,
              totalCorrect,
              reportQuestion,
              ...dataReading,
            });

            await this.reportQuestionOptionRepository.save(reportOption);
          }),
        );
      }),
    );
  }

  async generateReportQuestionByEdition(
    assessmentId: number,
    testId: number,
    reportSubjectId: any,
  ) {
    const { testTemplate } = await this.getTemplateTest(testId);

    await Promise.all(
      testTemplate.map(async (question) => {
        const reportQuestion = this.reportQuestionRepository.create({
          question,
          reportSubject: reportSubjectId,
        });

        await this.reportQuestionRepository.save(reportQuestion);

        const reportOptions =
          await this.jobQuestionRepository.getReportQuestionGrouppedByEdition(
            assessmentId,
            question.TEG_ID,
          );

        await this.createReportOptions(reportOptions, reportQuestion);
      }),
    );
  }

  async generateReportQuestionByCounty(
    countyId: number,
    testId: number,
    reportSubjectId: any,
  ) {
    const { testTemplate } = await this.getTemplateTest(testId);

    await Promise.all(
      testTemplate.map(async (question) => {
        const reportQuestion = this.reportQuestionRepository.create({
          question,
          reportSubject: reportSubjectId,
        });

        await this.reportQuestionRepository.save(reportQuestion);

        const reportOptions =
          await this.jobQuestionRepository.getReportQuestionGrouppedByCounty(
            countyId,
            question.TEG_ID,
          );

        await this.createReportOptions(reportOptions, reportQuestion);
      }),
    );
  }

  async generateReportQuestionBySchool(
    schoolId: number,
    testId: number,
    reportSubjectId: any,
  ) {
    const { testTemplate } = await this.getTemplateTest(testId);

    await Promise.all(
      testTemplate.map(async (question) => {
        const reportQuestion = this.reportQuestionRepository.create({
          question,
          reportSubject: reportSubjectId,
        });

        await this.reportQuestionRepository.save(reportQuestion);

        const reportOptions =
          await this.jobQuestionRepository.getReportQuestionGrouppedByTestAndSchoolClass(
            schoolId,
            question.TEG_ID,
          );

        await this.createReportOptions(reportOptions, reportQuestion);
      }),
    );
  }

  private async createReportOptions(
    reportOptions: any[],
    reportQuestion: ReportQuestion,
  ) {
    await Promise.all(
      reportOptions.map(async (rollupReportOption) => {
        const reportOption = this.reportQuestionOptionRepository.create({
          option: rollupReportOption.optionQuestion,
          totalCorrect: rollupReportOption.totalCorrect,
          fluente: rollupReportOption.fluente,
          nao_fluente: rollupReportOption.nao_fluente,
          frases: rollupReportOption.frases,
          palavras: rollupReportOption.palavras,
          silabas: rollupReportOption.silabas,
          nao_leitor: rollupReportOption.nao_leitor,
          nao_avaliado: rollupReportOption.nao_avaliado,
          nao_informado: rollupReportOption.nao_informado,
          reportQuestion,
        });

        await this.reportQuestionOptionRepository.save(reportOption);
      }),
    );
  }

  private async getLevelLeituraByStudent(
    studentId: number,
    assessmentId: number,
  ) {
    const studentTestByLeitura = await this.connection
      .getRepository(StudentTest)
      .createQueryBuilder("StudentTest")
      .select([
        "StudentTest.ALT_ID",
        "StudentTest.ALT_FINALIZADO",
        "StudentTest.ALT_JUSTIFICATIVA",
        "ANSWERS_TEST.ATR_RESPOSTA",
      ])
      .innerJoin("StudentTest.ALT_TES", "ALT_TES")
      .innerJoin("ALT_TES.TES_ASSESMENTS", "TES_ASSESMENTS")
      .innerJoin("ALT_TES.TES_DIS", "TES_DIS")
      .leftJoin("StudentTest.ANSWERS_TEST", "ANSWERS_TEST")
      .where("StudentTest.ALT_ALU = :studentId", { studentId })
      .andWhere("TES_ASSESMENTS.AVA_ID = :assessmentId", { assessmentId })
      .andWhere("TES_DIS.DIS_TIPO = :type", { type: SubjectTypeEnum.LEITURA })
      .getOne();

    if (!studentTestByLeitura) {
      return "nao_informado";
    }

    if (
      !studentTestByLeitura?.ALT_FINALIZADO ||
      studentTestByLeitura?.ALT_JUSTIFICATIVA?.trim() ||
      !studentTestByLeitura?.ANSWERS_TEST.length
    ) {
      return "nao_avaliado";
    }

    return studentTestByLeitura.ANSWERS_TEST[0].ATR_RESPOSTA;
  }

  private async getTemplateTest(testId: number) {
    const testTemplate = await this.connection
      .getRepository(TestTemplate)
      .find({
        where: {
          TEG_TES: {
            TES_ID: testId,
          },
        },
      });

    return {
      testTemplate,
    };
  }
}
