import { Injectable } from "@nestjs/common";
import { InjectConnection, InjectRepository } from "@nestjs/typeorm";
import * as _ from "lodash";
import { Connection, Repository } from "typeorm";
import { Student } from "src/student/model/entities/student.entity";
import { StudentTestAnswer } from "src/release-results/model/entities/student-test-answer.entity";
import { StudentTest } from "src/release-results/model/entities/student-test.entity";
import { ReportSubject } from "src/reports/model/entities/report-subject.entity";
import { Test } from "src/test/model/entities/test.entity";
import { Skin } from "src/teacher/model/entities/skin.entity";
import { SubjectTypeEnum } from "src/subject/model/enum/subject-type.enum";
import { ReportRace } from "src/reports/model/entities/report-race.entity";
import { JobRaceRepository } from "./repositories/job-race.repository";

@Injectable()
export class JobRaceService {
  constructor(
    @InjectConnection()
    private readonly connection: Connection,

    @InjectRepository(ReportRace)
    private readonly reportRacesRepository: Repository<ReportRace>,

    private readonly jobRaceRepository: JobRaceRepository,
  ) {}

  async generateReportRacesBySchoolClass(
    reportSubject: ReportSubject,
    students: Student[],
    studentSubmissions: StudentTest[],
    exam: Test,
  ) {
    const races = await this.connection.getRepository(Skin).find({
      where: {
        PEL_ATIVO: 1,
      },
    });

    await Promise.all(
      races.map(async (race) => {
        let reportRace;

        const ids = students
          .filter((student) => student?.ALU_PEL?.PEL_ID === race?.PEL_ID)
          .map((student) => String(student.ALU_ID));

        const filterSubmissionsByRace = studentSubmissions.filter(
          (submission) => submission.ALT_ALU?.ALU_PEL?.PEL_ID === race?.PEL_ID,
        );

        const totalStudents = ids.length;

        switch (exam.TES_DIS.DIS_TIPO) {
          case SubjectTypeEnum.OBJETIVA:
            {
              let totalPresentStudents = 0;
              let totalGrades = 0;

              totalGrades = filterSubmissionsByRace?.reduce(
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

              reportRace = this.reportRacesRepository.create({
                countTotalStudents: totalStudents,
                name: race.PEL_NOME,
                countStudentsLaunched: filterSubmissionsByRace.length,
                countPresentStudents: totalPresentStudents,
                totalGradesStudents: totalGrades,
                reportSubject,
                idStudents: ids,
                race,
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

              totalGrades = filterSubmissionsByRace?.reduce(
                (prev: any, cur: StudentTest) => {
                  prev.totalLaunched++;
                  if (!cur.ALT_FINALIZADO || !cur.ANSWERS_TEST.length) {
                    prev.leitura["nao_avaliado"] =
                      prev.leitura["nao_avaliado"] + 1;
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

              reportRace = this.reportRacesRepository.create({
                ...totalGrades.leitura,
                name: race.PEL_NOME,
                reportSubject,
                countTotalStudents: totalStudents,
                countStudentsLaunched: totalGrades.totalLaunched,
                countPresentStudents: totalGrades.totalPresent,
                idStudents: ids,
                race,
              });
            }
            break;
          default:
            return;
        }

        await this.reportRacesRepository.save(reportRace);
      }),
    );
  }

  async generateReportEditionsByEdition(
    assessmentId: number,
    testId: number,
    reportSubjectId: any,
  ) {
    const reportRaces =
      await this.jobRaceRepository.getReportRaceGrouppedByEdition(
        assessmentId,
        testId,
      );

    await Promise.all(
      reportRaces.map(async (rollupReportRace) => {
        const reportRace = this.reportRacesRepository.create({
          name: rollupReportRace.name,
          countTotalStudents: rollupReportRace.countTotalStudents,
          countStudentsLaunched: rollupReportRace.countStudentsLaunched,
          totalGradesStudents: rollupReportRace.totalGradesStudents,
          countPresentStudents: rollupReportRace.countPresentStudents,
          fluente: rollupReportRace.fluente,
          nao_fluente: rollupReportRace.nao_fluente,
          frases: rollupReportRace.frases,
          palavras: rollupReportRace.palavras,
          silabas: rollupReportRace.silabas,
          nao_leitor: rollupReportRace.nao_leitor,
          nao_avaliado: rollupReportRace.nao_avaliado,
          nao_informado: rollupReportRace.nao_informado,
          reportSubject: reportSubjectId,
          race: rollupReportRace.PEL_ID,
        });

        await this.reportRacesRepository.save(reportRace);
      }),
    );

    return reportRaces;
  }

  async generateReportEditionsByCounty(
    countyId: number,
    testId: number,
    reportSubjectId: any,
  ) {
    const reportRaces =
      await this.jobRaceRepository.getReportRaceGrouppedByCounty(
        countyId,
        testId,
      );

    await Promise.all(
      reportRaces.map(async (rollupReportRace) => {
        const reportRace = this.reportRacesRepository.create({
          name: rollupReportRace.name,
          countTotalStudents: rollupReportRace.countTotalStudents,
          countStudentsLaunched: rollupReportRace.countStudentsLaunched,
          totalGradesStudents: rollupReportRace.totalGradesStudents,
          countPresentStudents: rollupReportRace.countPresentStudents,
          fluente: rollupReportRace.fluente,
          nao_fluente: rollupReportRace.nao_fluente,
          frases: rollupReportRace.frases,
          palavras: rollupReportRace.palavras,
          silabas: rollupReportRace.silabas,
          nao_leitor: rollupReportRace.nao_leitor,
          nao_avaliado: rollupReportRace.nao_avaliado,
          nao_informado: rollupReportRace.nao_informado,
          reportSubject: reportSubjectId,
          race: rollupReportRace.PEL_ID,
        });

        await this.reportRacesRepository.save(reportRace);
      }),
    );

    return reportRaces;
  }

  async generateReportEditionsBySchool(
    schoolId: number,
    testId: number,
    reportSubjectId: any,
  ) {
    const reportRaces =
      await this.jobRaceRepository.getReportRaceGrouppedByTestAndSchoolClass(
        schoolId,
        testId,
      );

    await Promise.all(
      reportRaces.map(async (rollupReportRace) => {
        const reportRace = this.reportRacesRepository.create({
          name: rollupReportRace.name,
          countTotalStudents: rollupReportRace.countTotalStudents,
          countStudentsLaunched: rollupReportRace.countStudentsLaunched,
          totalGradesStudents: rollupReportRace.totalGradesStudents,
          countPresentStudents: rollupReportRace.countPresentStudents,
          fluente: rollupReportRace.fluente,
          nao_fluente: rollupReportRace.nao_fluente,
          frases: rollupReportRace.frases,
          palavras: rollupReportRace.palavras,
          silabas: rollupReportRace.silabas,
          nao_leitor: rollupReportRace.nao_leitor,
          nao_avaliado: rollupReportRace.nao_avaliado,
          nao_informado: rollupReportRace.nao_informado,
          reportSubject: reportSubjectId,
          race: rollupReportRace.PEL_ID,
        });

        await this.reportRacesRepository.save(reportRace);
      }),
    );

    return reportRaces;
  }
}
