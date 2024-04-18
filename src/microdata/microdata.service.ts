import { Injectable, NotFoundException } from "@nestjs/common";
import * as fflate from "fflate";
import { CreateMicrodatumDto } from "./dto/create-microdatum.dto";
import { Connection, Repository } from "typeorm";
import { InjectConnection, InjectRepository } from "@nestjs/typeorm";
import { Assessment } from "src/assessment/model/entities/assessment.entity";
import { County } from "src/counties/model/entities/county.entity";
import { Parser } from "json2csv";
import { sendEmail } from "src/helpers/sendMail";
import {
  PaginationMicroDataDto,
  exportFormatSinal,
} from "./dto/pagination-microdata.dto";
import { User } from "src/user/model/entities/user.entity";
import { exportDataTemplate } from "templates/export-data";
import { Microdatum } from "./entities/microdatum.entity";
import { TypeMicrodata } from "./dto/type-microdata.enum";
import { PaginationParams } from "src/helpers/params";
import { writeFile } from "node:fs";
import { Student } from "src/student/model/entities/student.entity";
import { mapperFormatEvaluationData, mapperFormatInfrequency, mapperFormatStudents } from "./mappers";
import { StudentTest } from "src/release-results/model/entities/student-test.entity";
import { SchoolAbsence } from "src/school-absences/model/entities/school-absences.entity";
import { paginateData } from "src/utils/paginate-data";

@Injectable()
export class MicrodataService {
  private readonly clientAppUrl: string;
  private readonly hostAppUrl: string;

  constructor(
    @InjectConnection()
    private readonly connection: Connection,

    @InjectRepository(Microdatum)
    private readonly microdataRepository: Repository<Microdatum>,
  ) {
    this.clientAppUrl = process.env.FRONT_APP_URL;
    this.hostAppUrl = process.env.HOST_APP_URL;
  }

  create({ county, file, user, type }: CreateMicrodatumDto) {
    const microdata = this.microdataRepository.create({
      county,
      file,
      user,
      type,
    });

    this.microdataRepository.save(microdata, {
      data: user
    });
  }

  async findAll({ page, limit }: PaginationParams, user: User) {
    const profile = user?.USU_SPE?.SPE_PER;
    const queryBuilder = this.microdataRepository
      .createQueryBuilder("Microdata")
      .select([
        "Microdata",
        "user.USU_ID",
        "user.USU_NOME",
        "county.MUN_ID",
        "county.MUN_NOME",
      ])
      .innerJoin("Microdata.user", "user")
      .innerJoin("Microdata.county", "county")
      .orderBy("Microdata.createdAt", "DESC");

    if (profile?.PER_NOME && profile?.PER_NOME !== "SAEV") {
      queryBuilder.andWhere("Microdata.county = :county", {
        county: user?.USU_MUN?.MUN_ID,
      });
    }

    const data = await paginateData(page, limit, queryBuilder)

    return data;
  }

  async exportEvaluationData(
    { county, exportFormat, edition, year }: PaginationMicroDataDto,
    user: User,
  ) {
    const connection = this.connection;

    const sinal = exportFormatSinal[exportFormat];

    const findCounty = await connection.getRepository(County).findOne({
      where: {
        MUN_ID: county,
      },
    });

    if (!findCounty) {
      throw new NotFoundException();
    }

    const assessmentsQueryBuilder = connection
      .getRepository(Assessment)
      .createQueryBuilder("Assessment")
      .select([
        "Assessment.AVA_ID",
        "Assessment.AVA_NOME",
        "Assessment.AVA_ANO",
        "AVA_TES.TES_ID",
        "AVA_TES.TES_NOME",
        "TES_SER.SER_ID",
        "TES_SER.SER_NUMBER",
        "TES_SER.SER_NOME",
        "TES_DIS.DIS_ID",
        "TES_DIS.DIS_NOME",
        "TEMPLATE_TEST.TEG_ID",
        "TEG_MTI.MTI_ID",
        "TEG_MTI.MTI_CODIGO",
        "TEG_MTI.MTI_DESCRITOR",
        "MTI_MTO.MTO_ID",
        "MTI_MTO.MTO_NOME"
      ])
      .innerJoin("Assessment.AVA_AVM", "AVA_AVM")
      .innerJoin("Assessment.AVA_TES", "AVA_TES")
      .innerJoin("AVA_TES.TES_SER", "TES_SER")
      .innerJoin("AVA_TES.TES_DIS", "TES_DIS")
      .leftJoin("AVA_TES.TEMPLATE_TEST", "TEMPLATE_TEST")
      .leftJoin("TEMPLATE_TEST.TEG_MTI", "TEG_MTI")
      .leftJoin("TEG_MTI.MTI_MTO", "MTI_MTO")
      .where("Assessment.AVA_ANO = :year", { year })
      .andWhere("AVA_AVM.AVM_MUN = :county", { county: findCounty.MUN_ID });

    if (edition) {
      assessmentsQueryBuilder.andWhere("Assessment.AVA_ID = :edition", {
        edition,
      });
    }

    const assessments = await assessmentsQueryBuilder.getMany();

    let studentsQuestion = [];

    for (const ava of assessments) {
      await Promise.all(
        ava.AVA_TES.map(async (test) => {
          const data = await this.connection
            .getRepository(StudentTest)
            .createQueryBuilder("StudentTest")
            .select([
              "StudentTest",
              "ALT_ALU.ALU_ID",
              "ALT_ALU.ALU_NOME",
              "TUR_ESC.ESC_ID",
              "TUR_ESC.ESC_NOME",
              "TUR_ESC.ESC_INEP",
              "schoolClass.TUR_ID",
              "schoolClass.TUR_NOME",
              "schoolClass.TUR_PERIODO",
              "ALU_GEN.GEN_ID",
              "ALU_GEN.GEN_NOME",
              "ALU_PEL.PEL_ID",
              "ALU_PEL.PEL_NOME",
              "ANSWERS_TEST.ATR_ID",
              "ANSWERS_TEST.ATR_RESPOSTA",
              "ANSWERS_TEST.ATR_CERTO",
              "questionTemplate.TEG_ID",
            ])
            .innerJoin("StudentTest.ALT_ALU", "ALT_ALU")
            .innerJoin("StudentTest.schoolClass", "schoolClass")
            .leftJoin('StudentTest.ANSWERS_TEST', 'ANSWERS_TEST')
            .leftJoin("ANSWERS_TEST.questionTemplate", "questionTemplate")
            .leftJoin("ALT_ALU.ALU_GEN", "ALU_GEN")
            .leftJoin("ALT_ALU.ALU_PEL", "ALU_PEL")
            .leftJoin("schoolClass.TUR_ESC", "TUR_ESC")
            .where("TUR_ESC.ESC_MUN = :countyId", {
              countyId: findCounty.MUN_ID,
            })
            .andWhere("StudentTest.ALT_TES = :testId", { testId: test.TES_ID })
            .getMany();

          const { formattedData } = mapperFormatEvaluationData(
            ava,
            data,
            findCounty,
            test,
          );

          for (const item of formattedData) {
            studentsQuestion.push(item);
          }
        }),
      );
    }

    if (studentsQuestion.length) {
      await this.saveDataAndSendEmail({
        user,
        county: findCounty,
        type: TypeMicrodata.AVALIACAO,
        data: studentsQuestion,
        sinal,
      });
    }
  }

  async exportInfrequencyData(
    { county, exportFormat, year }: PaginationMicroDataDto,
    user: User,
  ) {
    const connection = this.connection;

    const sinal = exportFormatSinal[exportFormat];

    const findCounty = await connection.getRepository(County).findOne({
      where: {
        MUN_ID: county,
      },
    });

    if (!findCounty) {
      throw new NotFoundException();
    }

    const queryBuilder = await connection
      .getRepository(SchoolAbsence)
      .createQueryBuilder("SchoolAbsence")
      .select([
        "SchoolAbsence",
        "IFR_ALU",
        "ALU_ESC.ESC_ID",
        "ALU_ESC.ESC_NOME",
        "ALU_ESC.ESC_INEP",
        "ALU_SER.SER_NUMBER",
        "ALU_SER.SER_NOME",
        "ALU_TUR.TUR_ID",
        "ALU_TUR.TUR_NOME",
        "ALU_TUR.TUR_PERIODO",
        "ALU_GEN.GEN_NOME",
        "ALU_PEL.PEL_NOME",
      ])
      .innerJoin("SchoolAbsence.IFR_ALU", "IFR_ALU")
      .leftJoin("IFR_ALU.ALU_ESC", "ALU_ESC")
      .leftJoin("IFR_ALU.ALU_GEN", "ALU_GEN")
      .leftJoin("IFR_ALU.ALU_PEL", "ALU_PEL")
      .leftJoin("IFR_ALU.ALU_SER", "ALU_SER")
      .leftJoin("IFR_ALU.ALU_TUR", "ALU_TUR")
      .where("ALU_ESC.ESC_MUN = :county", { county })
      .orderBy("IFR_ALU.ALU_NOME", "ASC");

    if (year) {
      queryBuilder.andWhere("SchoolAbsence.IFR_ANO = :year", { year });
    }

    const infrequency = await queryBuilder.getMany();

    const { formattedInfrequency } = mapperFormatInfrequency(
      infrequency,
      findCounty,
    );

    if (formattedInfrequency?.length) {
      await this.saveDataAndSendEmail({
        user,
        county: findCounty,
        type: TypeMicrodata.INFREQUENCIA,
        data: formattedInfrequency,
        sinal,
      });
    }
  }

  async exportStudentsData(
    { county, exportFormat, year }: PaginationMicroDataDto,
    user: User,
  ) {
    const connection = this.connection;

    const sinal = exportFormatSinal[exportFormat];

    const findCounty = await connection.getRepository(County).findOne({
      where: {
        MUN_ID: county,
      },
    });

    if (!findCounty) {
      throw new NotFoundException();
    }

    const students = await connection
      .getRepository(Student)
      .createQueryBuilder("Student")
      .select([
        "Student",
        "ALU_ESC.ESC_ID",
        "ALU_ESC.ESC_NOME",
        "ALU_ESC.ESC_INEP",
        "ALU_SER.SER_NUMBER",
        "ALU_SER.SER_NOME",
        "ALU_TUR.TUR_ID",
        "ALU_TUR.TUR_NOME",
        "ALU_TUR.TUR_PERIODO",
        "ALU_GEN.GEN_NOME",
        "ALU_PEL.PEL_NOME",
      ])
      .leftJoin("Student.ALU_ESC", "ALU_ESC")
      .leftJoin("Student.ALU_GEN", "ALU_GEN")
      .leftJoin("Student.ALU_PEL", "ALU_PEL")
      .leftJoin("Student.ALU_SER", "ALU_SER")
      .leftJoin("Student.ALU_TUR", "ALU_TUR")
      .where("ALU_ESC.ESC_MUN = :county", { county })
      .orderBy("Student.ALU_NOME", "ASC")
      .getMany();

    const { formattedStudents } = mapperFormatStudents(students, findCounty);

    if (formattedStudents?.length) {
      await this.saveDataAndSendEmail({
        user,
        county: findCounty,
        type: TypeMicrodata.ALUNOS,
        data: formattedStudents,
        sinal,
      });
    }
  }

  async saveDataAndSendEmail({
    user,
    county,
    type,
    data,
    sinal,
  }: {
    user: User;
    county: County;
    type: TypeMicrodata;
    data: any;
    sinal: string;
  }) {
    const parser = new Parser({
      withBOM: true,
      delimiter: sinal,
    });

    const csvData = parser.parse(data);

    const nameFile = `${Date.now()}-${type}.csv.zip`;

    const zipped: any = fflate.zipSync(
      {
        file: {
          [`${Date.now()}.csv`]: fflate.strToU8(csvData),
        },
      },
      {
        level: 9,
      },
    );

    writeFile(`./public/microdata/${nameFile}`, zipped, async (err) => {
      if (err) {
        console.log(err);
      }
    });

    this.create({
      county,
      file: nameFile,
      type,
      user,
    });

    const linkDownload = `${this.hostAppUrl}/v1/microdata/file/${nameFile}`
    const html = exportDataTemplate(this.clientAppUrl, linkDownload);
    await sendEmail(
      user.USU_EMAIL,
      "Saev | O seu download está disponível",
      html,
    );
  }
}
