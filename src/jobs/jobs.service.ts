import { InjectQueue } from "@nestjs/bull";
import { Injectable } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { InjectConnection, InjectRepository } from "@nestjs/typeorm";
import { Queue } from "bull";
import * as _ from "lodash";
import { AssessmentCounty } from "src/assessment/model/entities/assessment-county.entity";
import { ReportDescriptor } from "src/reports/model/entities/report-descriptor.entity";
import { SchoolClass } from "src/school-class/model/entities/school-class.entity";
import { Job as SAEVJob } from "./job.entity";
import { pipeline } from "stream";
import { Connection, Repository } from "typeorm";
import { ReadStream } from "typeorm/platform/PlatformTools";
import { promisify } from "util";
import { Assessment } from "../assessment/model/entities/assessment.entity";
import { HeadquarterTopicItem } from "../headquarters/model/entities/headquarter-topic-item.entity";
import { StudentTestAnswer } from "../release-results/model/entities/student-test-answer.entity";
import { StudentTest } from "../release-results/model/entities/student-test.entity";
import { ReportEdition } from "../reports/model/entities/report-edition.entity";
import { ReportSubject } from "../reports/model/entities/report-subject.entity";
import { ReportsService } from "../reports/service/reports.service";
import { SchoolClassStudent } from "../school-class/model/entities/school-class-student.entity";
import { SubjectTypeEnum } from "../subject/model/enum/subject.enum";
import { Test } from "../test/model/entities/test.entity";
import { JobType } from "./job-type.enum";
import { Student } from "src/student/model/entities/student.entity";

const pipelineAsync = promisify(pipeline);

@Injectable()
export class JobsService {
  constructor(
    @InjectConnection()
    private readonly connection: Connection,
    @InjectRepository(ReportEdition)
    private readonly reportEditionsRepository: Repository<ReportEdition>,
    @InjectRepository(ReportSubject)
    private readonly reportSubjectsRepository: Repository<ReportSubject>,

    @InjectRepository(ReportDescriptor)
    private readonly reportDescriptorRepository: Repository<ReportDescriptor>,

    @InjectRepository(SAEVJob)
    private readonly jobsRepository: Repository<SAEVJob>,

    private readonly reportsService: ReportsService,

    @InjectQueue("job")
    private jobQueue: Queue,
  ) {}

  async ola() {
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
    day = day - 2;
    finalDate.setDate(day);

    const editions = await this.connection
      .getRepository(Assessment)
      .createQueryBuilder("Assessment")
      .select(['Assessment.AVA_ID', 'AVA_AVM.AVM_ID', 'AVM_MUN.MUN_ID'])
      .innerJoin(
        "Assessment.AVA_AVM",
        "AVA_AVM",
        "AVA_AVM.AVM_DT_INICIO <= :initialDate AND AVA_AVM.AVM_DT_FIM >= :finalDate",
        { initialDate: new Date(), finalDate },
      )
      .leftJoin("AVA_AVM.AVM_MUN", "AVM_MUN")
      .where("Assessment.AVA_ANO = 2023")
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
      }
    }

    await this.generateReportEditionsByCounty();
    await this.generateReportEditionsByEdition();

    for (const edition of editions) {
      for (const assessmentCounty of edition.AVA_AVM) {
        await this.generateReportEditionsWithReportDescriptorsBySchool(
          edition.AVA_ID,
          assessmentCounty.AVM_MUN.MUN_ID,
        );
      }
    }
    await this.generateReportEditionsWithReportsDescriptorsByCounty();
    await this.generateReportEditionsWithReportsDescriptorsByEdition();

    newJobHistory.endDate = new Date();
    await this.jobsRepository.save(newJobHistory);
  }

  async testeee2() {
    const studentsTest = await this.connection
      .getRepository(StudentTest)
      .createQueryBuilder("StudentTest")
      .select(["StudentTest.ALT_ID", 'StudentTest.ALT_DT_CRIACAO','ALT_ALU.ALU_ID', 'ALU_TUR.TUR_ID'])
      .innerJoin('StudentTest.ALT_ALU', 'ALT_ALU')
      .innerJoin('StudentTest.ALT_TES', 'ALT_TES')
      .innerJoin('ALT_ALU.ALU_TUR', 'ALU_TUR')
      .where("StudentTest.schoolClass IS NULL")
      .andWhere("YEAR(StudentTest.ALT_DT_CRIACAO) = 2023")
      .andWhere('ALT_TES.TES_ANO = 2023')
      .getMany();



      //todos
      // dps todos a data mais dois dias,
      // todos, pegando a turma atual

    //      const data = await Promise.all(studentsTest.map(async (student) => {
    //   const schoolClass = await this.connection
    //     .getRepository(SchoolClassStudent)
    //     .createQueryBuilder("SchoolClassStudent")
    //     .select(["SchoolClassStudent.id", 'schoolClass.TUR_ID'])
    //     .innerJoin('SchoolClassStudent.schoolClass', 'schoolClass')
    //     .where("SchoolClassStudent.student = :studentId", { studentId: student.ALT_ALU.ALU_ID })
    //     .andWhere(':date BETWEEN SchoolClassStudent.startDate AND COALESCE(SchoolClassStudent.endDate, "2023-04-02 14:16:53.657042000")', { date: student.ALT_DT_CRIACAO})
    //     .orderBy("SchoolClassStudent.updatedAt", "DESC")
    //     .getOne();

    //     return {
    //       ...student,
    //       schoolClass
    //     }

    // }))

    //   return {
    //     data
    //   }

   await Promise.all(
     studentsTest.map(async (studentTest) => {

      // console.log(studentTest)
      // const startDate = new Date(studentTest.ALT_DT_CRIACAO);
      // let day = startDate.getDate();
      // day = day + 2;
      // startDate.setDate(day);
      // console.log(startDate)
       const schoolClass = await this.connection
         .getRepository(SchoolClassStudent)
         .createQueryBuilder("SchoolClassStudent")
         .select(["SchoolClassStudent.id", "schoolClass.TUR_ID"])
         .innerJoin("SchoolClassStudent.schoolClass", "schoolClass")
         .where("SchoolClassStudent.student = :studentId", {
           studentId: studentTest.ALT_ALU.ALU_ID,
         })
         .andWhere(
           ':date BETWEEN SchoolClassStudent.startDate AND COALESCE(SchoolClassStudent.endDate, "2023-04-02 14:16:53.657042000")',
           { date: studentTest.ALT_DT_CRIACAO },
         )
         .orderBy("SchoolClassStudent.updatedAt", "DESC")
         .getOne();

       if (schoolClass) {
         await this.connection.getRepository(StudentTest).update(studentTest.ALT_ID, {
            schoolClass: schoolClass.schoolClass,
            ALT_DT_ATUALIZACAO: studentTest.ALT_DT_CRIACAO,
         });
       } else if(studentTest?.ALT_ALU?.ALU_TUR) {
        await this.connection.getRepository(StudentTest).update(studentTest.ALT_ID, {
          schoolClass: studentTest.ALT_ALU.ALU_TUR,
          ALT_DT_ATUALIZACAO: studentTest.ALT_DT_CRIACAO,
       });
       }
     }),
   );

    // await Promise.all(oi.map(()))

    // const data = await Promise.all(oi.map(async (student) => {
    //   const schoolClass = await this.connection
    //     .getRepository(SchoolClassStudent)
    //     .createQueryBuilder("SchoolClassStudent")
    //     .select(["SchoolClassStudent.id", 'schoolClass.TUR_ID'])
    //     .innerJoin('SchoolClassStudent.schoolClass', 'schoolClass')
    //     .where("SchoolClassStudent.student = :studentId", { studentId: 539841 })
    //     .andWhere(':date BETWEEN SchoolClassStudent.startDate AND COALESCE(SchoolClassStudent.endDate, "2023-04-02 14:16:53.657042000")', { date: student.ALT_DT_CRIACAO})
    //     .orderBy("SchoolClassStudent.updatedAt", "DESC")
    //     .getOne();

    //     return {
    //       ...student,
    //       schoolClass
    //     }

    // }))

    //   return {
    //     data
    //   }

  }
  async testeee() {
    const student = await this.connection
    .getRepository(Student)
    .createQueryBuilder("STUDENT")
    .leftJoinAndSelect("STUDENT.ALU_ESC", "ALU_ESC")
    .leftJoinAndSelect("STUDENT.ALU_SER", "ALU_SER")
    .leftJoinAndSelect("STUDENT.ALU_TUR", "ALU_TUR")
    .leftJoinAndSelect("STUDENT.ALU_GEN", "ALU_GEN")
    .leftJoinAndSelect("STUDENT.ALU_PCD", "ALU_PCD")
    .leftJoinAndSelect("STUDENT.ALU_PEL", "ALU_PEL")
    .leftJoinAndSelect("STUDENT.schoolClasses", "schoolClasses")
    .leftJoinAndSelect("schoolClasses.schoolClass", "schoolClass")
    .leftJoinAndSelect("schoolClass.TUR_ESC", "TUR_ESC")
    // .leftJoinAndSelect(
    //   "STUDENT.SCHOOL_ABSENCES",
    //   "SCHOOL_ABSENCES",
    //   `SCHOOL_ABSENCES.IFR_MES = ${numberMonth} AND SCHOOL_ABSENCES.IFR_ANO = ${numberYear}`,
    // )
    .where("STUDENT.ALU_ID = :ALU_ID", { ALU_ID: 300060 })
    .getOne();

    const schoolClassTotalStudentss = await this.connection
      .getRepository(SchoolClassStudent)
      .createQueryBuilder("schoolClassStudent")
      .select("schoolClass.TUR_ID", "TUR_ID")
      .distinct()
      .innerJoin("schoolClassStudent.student", "student")
      .innerJoin("schoolClassStudent.schoolClass", "schoolClass")
      .where("schoolClass.TUR_ESC = :school", { school: 1197 })
      .andWhere("schoolClass.TUR_ATIVO = TRUE")
      .andWhere('student.ALU_ID = :idStudent', {idStudent: 300060})
      .getRawMany();

      const ids = []

      schoolClassTotalStudentss.forEach((school) => {
        ids.push(school.TUR_ID)
      })

  let schools = [];

  student?.schoolClasses?.forEach((classStudent) => {
    if (
      !!classStudent &&
      classStudent?.schoolClass?.TUR_ESC?.ESC_ID !== student?.ALU_ESC?.ESC_ID
    ) {
      schools.push(classStudent.schoolClass.TUR_ESC);
    }
  });

  schools = schools.filter(function (a) {
    return (
      !this[JSON.stringify(a?.id)] && (this[JSON.stringify(a?.id)] = true)
    );
  }, Object.create(null));

  return {
    schoolClassTotalStudentss,
    ids
  };

    const schoolClassTotalStudents = await this.connection
      .getRepository(SchoolClassStudent)
      .createQueryBuilder("schoolClassStudent")
      .select("student.ALU_ID", "ALU_ID")
      .distinct()
      .innerJoin("schoolClassStudent.student", "student")
      .leftJoin("schoolClassStudent.schoolClass", "schoolClass")
      .where("schoolClass.TUR_ESC = :school", { school: 2199 })
      .andWhere("schoolClass.TUR_SER = :serie", { serie: 17 })
      .andWhere("schoolClass.TUR_ATIVO = TRUE")
      // .where("schoolClassStudent.schoolClass = :schoolClass", {
      //   schoolClass: 81126,
      // })
      .getRawMany();

    return {
      total: schoolClassTotalStudents.length,
    };
  }

  // @Cron("45 * * * * *")
  async generateReports() {
    //Fetch what needs to be done
    const batchSize = 2;
    const jobs = [
      { assessmentId: 1, countyId: 2 },
      { assessmentId: 2, countyId: 2 },
      { assessmentId: 3, countyId: 2 },
      { assessmentId: 4, countyId: 2 },
      { assessmentId: 5, countyId: 2 },
    ];
    for (let i = 0; i < jobs.length; i += batchSize) {
      const batch = jobs.slice(i, i + batchSize);
      console.log(batch);

      // await this.generateReportEditionsBySchoolClasses(assessmentId, countyId);
      // await this.generateReportEditionsBySchool(assessmentId, countyId);
      // await this.generateReportEditionsByCounty();
      // await this.generateReportEditionsByEdition();
      // await this.generateReportEditionsWithReportDescriptorsBySchool(
      //   assessmentId,
      //   countyId,
      // );
      // await this.generateReportEditionsWithReportsDescriptorsByCounty();
      // await this.generateReportEditionsWithReportsDescriptorsByEdition();
    }
  }

  async createJob(
    jobType: JobType,
    assessmentId?: number,
    countyIds?: number[],
  ) {
    if (!assessmentId) {
      await this.jobQueue.add({ jobType });
      return;
    }
    await Promise.all(
      countyIds.map(async (countyId) => {
        await this.jobQueue.add(
          { jobType, assessmentId, countyId },
          { attempts: 5 },
        );
      }),
    );
    return { message: "Job created successfuly" };
  }

  async createJobWithoutRedis(
    jobType: JobType,
    assessmentId?: number,
    countyIds?: number[],
  ) {
    return await Promise.all(
      countyIds.map(async (countyId) => {
        await this.generateReportEditions(assessmentId, countyId);
      }),
    );
  }

  async generateReportEditions(assessmentId: number, countyId: number) {
    await this.generateReportEditionsBySchoolClasses(assessmentId, countyId);
    await this.generateReportEditionsBySchool(assessmentId, countyId);
    await this.generateReportEditionsByCounty();
    await this.generateReportEditionsByEdition();
    await this.generateReportEditionsWithReportDescriptorsBySchool(
      assessmentId,
      countyId,
    );
    await this.generateReportEditionsWithReportsDescriptorsByCounty();
    await this.generateReportEditionsWithReportsDescriptorsByEdition();
  }

  async generateReportEditionsByEdition() {
    const reportEditions = await this.getCountyReportEditions();

    const reportEditionsGrouppedByEdition = _.groupBy(
      reportEditions,
      (reportEdition) => reportEdition.assessmentId,
    );

    await Promise.all(
      Object.keys(reportEditionsGrouppedByEdition).map(async (key) => {
        const reportEdition = reportEditionsGrouppedByEdition[key][0];

        const newReportEdition =
          await this.reportsService.upsertReportEditionByAssessmentId(
            reportEdition.assessmentId,
            { county: null, schoolClass: null, school: null },
            ["reportsSubjects"],
          );

        await Promise.all(
          reportEditionsGrouppedByEdition[key].map(
            async (rollupReportEdition) => {
              const reportSubject = this.reportSubjectsRepository.create({
                type: rollupReportEdition.type,
                name: rollupReportEdition.name,
                test: { TES_ID: rollupReportEdition.testTESID },
                countTotalStudents: rollupReportEdition.countTotalStudents,
                countStudentsLaunched:
                  rollupReportEdition.countStudentsLaunched,
                totalGradesStudents: rollupReportEdition.totalGradesStudents,
                countPresentStudents: rollupReportEdition.countPresentStudents,
                fluente: rollupReportEdition.fluente,
                nao_fluente: rollupReportEdition.nao_fluente,
                frases: rollupReportEdition.frases,
                palavras: rollupReportEdition.palavras,
                silabas: rollupReportEdition.silabas,
                nao_leitor: rollupReportEdition.nao_leitor,
                nao_avaliado: rollupReportEdition.nao_avaliado,
                nao_informado: rollupReportEdition.nao_informado,
                reportEdition: newReportEdition,
              });

              await this.reportSubjectsRepository.save(reportSubject);
            },
          ),
        );
      }),
    );
  }

  async generateReportEditionsWithReportsDescriptorsByEdition() {
    const reportEditions =
      await this.getCountyReportWithReportsDescriptorsEditions();

    const reportEditionsGrouppedByEdition = _.groupBy(
      reportEditions,
      (reportEdition) => reportEdition.assessmentId,
    );

    await Promise.all(
      Object.keys(reportEditionsGrouppedByEdition).map(async (key) => {
        const reportEdition = reportEditionsGrouppedByEdition[key][0];

        const newReportEdition =
          await this.reportsService.upsertReportEditionByAssessmentId(
            reportEdition.assessmentId,
            { county: null, schoolClass: null, school: null },
            ["reports_descriptors"],
          );

        await Promise.all(
          reportEditionsGrouppedByEdition[key].map(
            async (rollupReportEdition) => {
              const reportDescriptor = this.reportDescriptorRepository.create({
                test: { TES_ID: rollupReportEdition.testTESID },
                report_edition: newReportEdition,
                total: rollupReportEdition.total,
                totalCorrect: rollupReportEdition.totalCorrect,
                descriptor: rollupReportEdition.descriptorMTIID,
              });

              await this.reportDescriptorRepository.save(reportDescriptor);
            },
          ),
        );
      }),
    );
  }

  private getCountyReportEditions() {
    return this.reportEditionsRepository
      .createQueryBuilder("REPORT_EDITION")
      .select([
        "REPORT_EDITION.editionAVAID as assessmentId",
        "REPORT_SUBJECT.testTESID",
        "REPORT_SUBJECT.type as type",
        "REPORT_SUBJECT.name as name",
        "SUM(REPORT_SUBJECT.countTotalStudents) as countTotalStudents",
        "SUM(REPORT_SUBJECT.countStudentsLaunched) as countStudentsLaunched",
        "SUM(REPORT_SUBJECT.totalGradesStudents) as totalGradesStudents",
        "SUM(REPORT_SUBJECT.countPresentStudents) as countPresentStudents",
        "SUM(REPORT_SUBJECT.fluente) as fluente",
        "SUM(REPORT_SUBJECT.nao_fluente) as nao_fluente",
        "SUM(REPORT_SUBJECT.frases) as frases",
        "SUM(REPORT_SUBJECT.palavras) as palavras",
        "SUM(REPORT_SUBJECT.silabas) as silabas",
        "SUM(REPORT_SUBJECT.nao_leitor) as nao_leitor",
        "SUM(REPORT_SUBJECT.nao_avaliado) as nao_avaliado",
        "SUM(REPORT_SUBJECT.nao_informado) as nao_informado",
      ])
      .innerJoin(
        "report_subject",
        "REPORT_SUBJECT",
        "REPORT_EDITION.id = REPORT_SUBJECT.reportEditionId",
      )
      .where("REPORT_EDITION.countyMUNID IS NOT NULL")
      .andWhere("REPORT_SUBJECT.countTotalStudents > 0")
      .groupBy("REPORT_SUBJECT.testTESID, REPORT_EDITION.editionAVAID")
      .getRawMany();
  }

  private getCountyReportWithReportsDescriptorsEditions() {
    return this.reportEditionsRepository
      .createQueryBuilder("report_edition")
      .select([
        "report_edition.editionAVAID as assessmentId",
        "report_descriptor.testTESID",
        "report_descriptor.descriptorMTIID",
        "SUM(report_descriptor.total) as total",
        "SUM(report_descriptor.totalCorrect) as totalCorrect",
      ])
      .innerJoin(
        "report_descriptor",
        "report_descriptor",
        "report_edition.id = report_descriptor.reportEditionId",
      )
      .where("report_edition.countyMUNID IS NOT NULL")
      .groupBy(
        "report_descriptor.testTESID, report_edition.editionAVAID, report_descriptor.descriptorMTIID",
      )
      .getRawMany();
  }

  async generateReportEditionsByCounty() {
    const reportEditions = await this.getSchoolReportEditions();

    const reportEditionsGrouppedByCounty = _.groupBy(
      reportEditions,
      (reportEdition) =>
        `${reportEdition.MUN_ID} ${reportEdition.assessmentId}`,
    );

    await Promise.all(
      Object.keys(reportEditionsGrouppedByCounty).map(async (key) => {
        const reportEdition = reportEditionsGrouppedByCounty[key][0];

        const newReportEdition =
          await this.reportsService.upsertReportEditionByAssessmentId(
            reportEdition.assessmentId,
            { county: { MUN_ID: reportEdition.MUN_ID } },
            ["reportsSubjects"],
          );

        await Promise.all(
          reportEditionsGrouppedByCounty[key].map(
            async (rollupReportEdition) => {
              const reportSubject = this.reportSubjectsRepository.create({
                type: rollupReportEdition.type,
                name: rollupReportEdition.name,
                test: { TES_ID: rollupReportEdition.testTESID },
                countTotalStudents: rollupReportEdition.countTotalStudents,
                countStudentsLaunched:
                  rollupReportEdition.countStudentsLaunched,
                totalGradesStudents: rollupReportEdition.totalGradesStudents,
                countPresentStudents: rollupReportEdition.countPresentStudents,
                fluente: rollupReportEdition.fluente,
                nao_fluente: rollupReportEdition.nao_fluente,
                frases: rollupReportEdition.frases,
                palavras: rollupReportEdition.palavras,
                silabas: rollupReportEdition.silabas,
                nao_leitor: rollupReportEdition.nao_leitor,
                nao_avaliado: rollupReportEdition.nao_avaliado,
                nao_informado: rollupReportEdition.nao_informado,
                reportEdition: newReportEdition,
              });

              await this.reportSubjectsRepository.save(reportSubject);
            },
          ),
        );
      }),
    );
  }

  async generateReportEditionsWithReportsDescriptorsByCounty() {
    const reportEditions =
      await this.getSchoolReportsWithReportDescriptorsEditions();

    const reportEditionsGrouppedByCounty = _.groupBy(
      reportEditions,
      (reportEdition) =>
        `${reportEdition.MUN_ID} ${reportEdition.assessmentId}`,
    );

    await Promise.all(
      Object.keys(reportEditionsGrouppedByCounty).map(async (key) => {
        const reportEdition = reportEditionsGrouppedByCounty[key][0];

        const newReportEdition =
          await this.reportsService.upsertReportEditionByAssessmentId(
            reportEdition.assessmentId,
            { county: { MUN_ID: reportEdition.MUN_ID } },
            ["reports_descriptors"],
          );

        await Promise.all(
          reportEditionsGrouppedByCounty[key].map(
            async (rollupReportEdition) => {
              const reportDescriptor = this.reportDescriptorRepository.create({
                test: { TES_ID: rollupReportEdition.testTESID },
                report_edition: newReportEdition,
                total: rollupReportEdition.total,
                totalCorrect: rollupReportEdition.totalCorrect,
                descriptor: rollupReportEdition.descriptorMTIID,
              });

              await this.reportDescriptorRepository.save(reportDescriptor);
            },
          ),
        );
      }),
    );
  }

  private async getSchoolReportEditions() {
    return this.reportEditionsRepository
      .createQueryBuilder("REPORT_EDITION")
      .select([
        "REPORT_EDITION.editionAVAID as assessmentId",
        "ESCOLA.ESC_MUN_ID as MUN_ID",
        "test.TES_ID as testTESID",
        "test.TES_SER_ID as SER_ID",
        "REPORT_SUBJECT.type as type",
        "REPORT_SUBJECT.name as name",
        "SUM(REPORT_SUBJECT.countTotalStudents) as countTotalStudents",
        "SUM(REPORT_SUBJECT.countStudentsLaunched) as countStudentsLaunched",
        "SUM(REPORT_SUBJECT.totalGradesStudents) as totalGradesStudents",
        "SUM(REPORT_SUBJECT.countPresentStudents) as countPresentStudents",
        "SUM(REPORT_SUBJECT.fluente) as fluente",
        "SUM(REPORT_SUBJECT.nao_fluente) as nao_fluente",
        "SUM(REPORT_SUBJECT.frases) as frases",
        "SUM(REPORT_SUBJECT.palavras) as palavras",
        "SUM(REPORT_SUBJECT.silabas) as silabas",
        "SUM(REPORT_SUBJECT.nao_leitor) as nao_leitor",
        "SUM(REPORT_SUBJECT.nao_avaliado) as nao_avaliado",
        "SUM(REPORT_SUBJECT.nao_informado) as nao_informado",
      ])
      .innerJoin(
        "report_subject",
        "REPORT_SUBJECT",
        "REPORT_EDITION.id = REPORT_SUBJECT.reportEditionId",
      )
      .innerJoin(
        "escola",
        "ESCOLA",
        "ESCOLA.ESC_ID = REPORT_EDITION.schoolESCID",
      )
      .innerJoin(
        "REPORT_SUBJECT.test",
        "test",
      )
      .where("REPORT_EDITION.schoolESCID IS NOT NULL")
      .andWhere("REPORT_EDITION.schoolClassTURID IS NULL")
      .andWhere("REPORT_SUBJECT.countTotalStudents > 0")
      // .andWhere('ESCOLA.ESC_MUN_ID = 77')
      // .andWhere('MONTH(REPORT_EDITION.updatedAt) = 3')
      .groupBy(
        "test.TES_ID, ESCOLA.ESC_MUN_ID, REPORT_EDITION.editionAVAID",
      )
      .getRawMany();
  }

  private async getSchoolReportsWithReportDescriptorsEditions() {
    return this.reportEditionsRepository
      .createQueryBuilder("report_edition")
      .select([
        "report_edition.editionAVAID as assessmentId",
        "ESCOLA.ESC_MUN_ID as MUN_ID",
        "report_descriptor.testTESID",
        "report_descriptor.descriptorMTIID",
        "SUM(report_descriptor.total) as total",
        "SUM(report_descriptor.totalCorrect) as totalCorrect",
      ])
      .innerJoin(
        "report_descriptor",
        "report_descriptor",
        "report_edition.id = report_descriptor.reportEditionId",
      )
      .innerJoin(
        "escola",
        "ESCOLA",
        "ESCOLA.ESC_ID = report_edition.schoolESCID",
      )
      .where("report_edition.schoolESCID IS NOT NULL")
      .andWhere("report_edition.schoolClassTURID IS NULL")
      .groupBy(
        "report_descriptor.testTESID, ESCOLA.ESC_MUN_ID, report_edition.editionAVAID, report_descriptor.descriptorMTIID",
      )
      .getRawMany();
  }

  async generateReportEditionsBySchool(assessmentId: number, countyId: number) {
    const reportEditions =
      await this.getReportEditionGrouppedByTestAndSchoolClass(
        assessmentId,
        countyId,
      );

    const reportEditionsGrouppedBySchool = _.groupBy(
      reportEditions,
      (reportEdition) =>
        `${reportEdition.ESC_ID} ${reportEdition.assessmentId}`,
    );

    await Promise.all(
      Object.keys(reportEditionsGrouppedBySchool).map(async (key) => {
        const reportEdition = reportEditionsGrouppedBySchool[key][0];
        const newReportEdition =
          await this.reportsService.upsertReportEditionByAssessmentId(
            reportEdition.assessmentId,
            { school: { ESC_ID: reportEdition.ESC_ID } },
            ["reportsSubjects"],
          );

        await Promise.all(
          reportEditionsGrouppedBySchool[key].map(
            async (rollupReportEdition) => {
              // const schoolClassTotalStudents = await this.connection
              // .getRepository(SchoolClassStudent)
              // .createQueryBuilder("schoolClassStudent")
              // .select("student.ALU_ID", "ALU_ID")
              // .distinct()
              // .innerJoin("schoolClassStudent.student", "student")
              // .leftJoin('schoolClassStudent.schoolClass', 'schoolClass')
              // .where('schoolClass.TUR_ESC = :school', {school: rollupReportEdition.ESC_ID})
              // .andWhere('schoolClass.TUR_SER = :serie', {serie: rollupReportEdition.SER_ID})
              // .andWhere('schoolClass.TUR_ATIVO = TRUE')
              // .getRawMany();

              const reportSubject = this.reportSubjectsRepository.create({
                type: rollupReportEdition.type,
                name: rollupReportEdition.name,
                test: { TES_ID: rollupReportEdition.testTESID },
                countTotalStudents: rollupReportEdition.countTotalStudents,
                countStudentsLaunched:
                  rollupReportEdition.countStudentsLaunched,
                totalGradesStudents: rollupReportEdition.totalGradesStudents,
                countPresentStudents: rollupReportEdition.countPresentStudents,
                fluente: rollupReportEdition.fluente,
                nao_fluente: rollupReportEdition.nao_fluente,
                frases: rollupReportEdition.frases,
                palavras: rollupReportEdition.palavras,
                silabas: rollupReportEdition.silabas,
                nao_leitor: rollupReportEdition.nao_leitor,
                nao_avaliado: rollupReportEdition.nao_avaliado,
                nao_informado: rollupReportEdition.nao_informado,
                reportEdition: newReportEdition,
              });

              await this.reportSubjectsRepository.save(reportSubject);
            },
          ),
        );
      }),
    );
  }

  async generateReportEditionsWithReportDescriptorsBySchool(
    assessmentId: number,
    countyId: number,
  ) {
    const reportEditions =
      await this.getReportEditionWithReportDescriptorsGrouppedByTestAndSchoolClass(
        assessmentId,
        countyId,
      );

    const reportEditionsGrouppedBySchool = _.groupBy(
      reportEditions,
      (reportEdition) =>
        `${reportEdition.ESC_ID} ${reportEdition.assessmentId}`,
    );

    await Promise.all(
      Object.keys(reportEditionsGrouppedBySchool).map(async (key) => {
        const reportEdition = reportEditionsGrouppedBySchool[key][0];
        const newReportEdition =
          await this.reportsService.upsertReportEditionByAssessmentId(
            reportEdition.assessmentId,
            { school: { ESC_ID: reportEdition.ESC_ID } },
            ["reports_descriptors"],
          );

        await Promise.all(
          reportEditionsGrouppedBySchool[key].map(
            async (rollupReportEdition) => {
              const reportDescriptor = this.reportDescriptorRepository.create({
                test: { TES_ID: rollupReportEdition.testTESID },
                report_edition: newReportEdition,
                total: rollupReportEdition.total,
                totalCorrect: rollupReportEdition.totalCorrect,
                descriptor: rollupReportEdition.descriptorMTIID,
              });

              await this.reportDescriptorRepository.save(reportDescriptor);
            },
          ),
        );
      }),
    );
  }

  private async getReportEditionGrouppedByTestAndSchoolClass(
    assessmentId: number,
    countyId: number,
  ) {
    return this.reportEditionsRepository
      .createQueryBuilder("REPORT_EDITION")
      .select([
        "REPORT_EDITION.editionAVAID as assessmentId",
        "TURMA.TUR_ESC_ID as ESC_ID",
        "REPORT_SUBJECT.testTESID",
        "REPORT_EDITION.schoolClassTURID",
        "TURMA.TUR_SER_ID as SER_ID",
        "REPORT_SUBJECT.name as name",
        "REPORT_SUBJECT.type as type",
        "SUM(REPORT_SUBJECT.countTotalStudents) as countTotalStudents",
        "SUM(REPORT_SUBJECT.countStudentsLaunched) as countStudentsLaunched",
        "SUM(REPORT_SUBJECT.totalGradesStudents) as totalGradesStudents",
        "SUM(REPORT_SUBJECT.countPresentStudents) as countPresentStudents",
        "SUM(REPORT_SUBJECT.fluente) as fluente",
        "SUM(REPORT_SUBJECT.nao_fluente) as nao_fluente",
        "SUM(REPORT_SUBJECT.frases) as frases",
        "SUM(REPORT_SUBJECT.palavras) as palavras",
        "SUM(REPORT_SUBJECT.silabas) as silabas",
        "SUM(REPORT_SUBJECT.nao_leitor) as nao_leitor",
        "SUM(REPORT_SUBJECT.nao_avaliado) as nao_avaliado",
        "SUM(REPORT_SUBJECT.nao_informado) as nao_informado",
      ])
      .innerJoin(
        "report_subject",
        "REPORT_SUBJECT",
        "REPORT_EDITION.id = REPORT_SUBJECT.reportEditionId",
      )
      .innerJoin(
        "turma",
        "TURMA",
        "TURMA.TUR_ID = REPORT_EDITION.schoolClassTURID AND TURMA.TUR_MUN_ID = :countyId",
        { countyId },
      )
      .where("REPORT_EDITION.schoolClassTURID IS NOT NULL")
      .andWhere("REPORT_EDITION.editionAVAID = :assessmentId", { assessmentId })
      .andWhere("REPORT_SUBJECT.countTotalStudents > 0")
      .groupBy(
        "REPORT_SUBJECT.testTESID, TURMA.TUR_ESC_ID, REPORT_EDITION.editionAVAID",
      )
      .getRawMany();
  }

  private async getReportEditionWithReportDescriptorsGrouppedByTestAndSchoolClass(
    assessmentId: number,
    countyId: number,
  ) {
    return this.reportEditionsRepository
      .createQueryBuilder("REPORT_EDITION")
      .select([
        "REPORT_EDITION.editionAVAID as assessmentId",
        "TURMA.TUR_ESC_ID as ESC_ID",
        "report_descriptor.testTESID",
        "report_descriptor.descriptorMTIID",
        "SUM(report_descriptor.total) as total",
        "SUM(report_descriptor.totalCorrect) as totalCorrect",
      ])
      .innerJoin(
        "report_descriptor",
        "report_descriptor",
        "REPORT_EDITION.id = report_descriptor.reportEditionId",
      )
      .innerJoin(
        "turma",
        "TURMA",
        "TURMA.TUR_ID = REPORT_EDITION.schoolClassTURID AND TURMA.TUR_MUN_ID = :countyId",
        { countyId },
      )
      .where("REPORT_EDITION.schoolClassTURID IS NOT NULL")
      .andWhere("REPORT_EDITION.editionAVAID = :assessmentId", { assessmentId })
      .groupBy(
        "report_descriptor.testTESID, TURMA.TUR_ESC_ID, REPORT_EDITION.editionAVAID, report_descriptor.descriptorMTIID",
      )
      .getRawMany();
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

          const schoolClassTotalStudents = await this.connection
            .getRepository(SchoolClassStudent)
            .createQueryBuilder("schoolClassStudent")
            .select("student.ALU_ID", "ALU_ID")
            .distinct()
            .innerJoin("schoolClassStudent.student", "student")
            .where("schoolClassStudent.schoolClass = :schoolClass", {
              schoolClass: schoolClass.TUR_ID,
            })
            .getRawMany();

        const count = schoolClassTotalStudents.length;
        // const schoolClassTotalStudents = await this.connection
        //   .getRepository(SchoolClassStudent)
        //   .count({ where: { schoolClass: { TUR_ID: schoolClass.TUR_ID } } });
        for await (const exam of exams) {
          await this.generateReportSubjectBySchoolClass(
            schoolClass,
            exam,
            reportEdition,
            count,
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
    schoolClass: SchoolClass,
    exam: Test,
    reportEdition: ReportEdition,
    totalStudents: number,
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
      .innerJoin(
        "turma_aluno",
        "TURMA_ALUNO",
        "TURMA_ALUNO.studentALUID = ALUNO.ALU_ID AND TURMA_ALUNO.schoolClassTURID = :schoolClassId",
        { schoolClassId: schoolClass.TUR_ID },
      )
      .leftJoinAndMapMany(
        "ALUNO_TESTE.ANSWERS_TEST",
        StudentTestAnswer,
        "ANSWER",
        "ANSWER.ATR_ALT_ID = ALUNO_TESTE.ALT_ID AND ALUNO_TESTE.ALT_FINALIZADO = 1",
      )
      .leftJoinAndSelect("ANSWER.ATR_MTI", "ATR_MTI")
      .where("ALUNO_TESTE.ALT_TES_ID = :examId", { examId: exam.TES_ID })
      .getMany();

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

              const totalCorrects = cur?.ANSWERS_TEST?.reduce(
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
                (!!cur.ANSWERS_TEST.length
                  ? Math.round((totalCorrects / cur.ANSWERS_TEST.length) * 100)
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
          });
        }
        break;
      default:
        return;
    }

    await this.reportSubjectsRepository.save(reportSubject);

    if (exam.TES_DIS.DIS_TIPO !== SubjectTypeEnum.OBJETIVA) {
      return;
    }

    if (!studentSubmissions.length) {
      return;
    }

    const descriptors = await this.connection
      .getRepository(HeadquarterTopicItem)
      .createQueryBuilder("descriptor")
      .leftJoin("descriptor.MTI_MTO", "MTI_MTO")
      .leftJoin("MTI_MTO.MTO_MAR", "MTO_MAR")
      .leftJoin("MTO_MAR.MAR_DIS", "MAR_DIS")
      .where("MAR_DIS.DIS_ID  = :id", { id: exam.TES_DIS.DIS_ID })
      .getMany();

    for (const descriptor of descriptors) {
      let countTotal = 0;
      let countCorrect = 0;

      studentSubmissions?.forEach((student) => {
        student?.ANSWERS_TEST?.forEach((answer) => {
          if (answer?.ATR_MTI?.MTI_ID === descriptor?.MTI_ID) {
            countTotal++;

            if (answer?.ATR_CERTO) {
              countCorrect++;
            }
          }
        });
      });

      if (countTotal) {
        const reportDescriptor = this.reportDescriptorRepository.create({
          test: exam,
          report_edition: reportEdition,
          total: countTotal,
          totalCorrect: countCorrect,
          descriptor,
        });

        await this.reportDescriptorRepository.save(reportDescriptor);
      }
    }
  }
}
