import { Injectable } from "@nestjs/common";
import { InjectConnection, InjectRepository } from "@nestjs/typeorm";
import { PaginationParams } from "src/helpers/params";
import { User } from "src/user/model/entities/user.entity";
import { Connection, Repository } from "typeorm";
import { ReportEdition } from "../model/entities/report-edition.entity";
import { formatValueForPercentage } from "src/utils/format-value-percentage";
import { Parser } from "json2csv";
import { Serie } from "src/serie/model/entities/serie.entity";
import { County } from "src/counties/model/entities/county.entity";
import { SchoolClass } from "src/school-class/model/entities/school-class.entity";
import { School } from "src/school/model/entities/school.entity";
import { Assessment } from "src/assessment/model/entities/assessment.entity";

@Injectable()
export class ReportSyntheticService {
  constructor(
    @InjectRepository(ReportEdition)
    private reportEditionRepository: Repository<ReportEdition>,

    @InjectConnection()
    private readonly connection: Connection,
  ) {}

  async handle(paginationParams: PaginationParams, user: User) {
    const { county, edition, school, schoolClass, serie } = paginationParams;

    let formattedCounty = county;
    let formattedSchool = school;

    if (user?.USU_SPE?.SPE_PER?.PER_NOME !== "SAEV") {
      formattedCounty = user?.USU_MUN?.MUN_ID;
    }

    if (user?.USU_SPE?.SPE_PER?.PER_NOME === "Escola") {
      formattedSchool = user?.USU_ESC?.ESC_ID;
    }

    const queryBuilder = this.reportEditionRepository
      .createQueryBuilder("ReportEdition")
      .innerJoinAndSelect("ReportEdition.reportsSubjects", "reportsSubjects")
      .innerJoinAndSelect("reportsSubjects.reportQuestions", "reportQuestions")
      .leftJoinAndSelect("reportQuestions.question", "question")
      .leftJoinAndSelect("question.TEG_MTI", "TEG_MTI")
      .leftJoinAndSelect("reportQuestions.reportOptions", "reportOptions")
      .innerJoinAndSelect("reportsSubjects.test", "test")
      .innerJoinAndSelect("test.TES_DIS", "TES_DIS")
      .innerJoin("test.TES_SER", "TES_SER", `TES_SER.SER_ID = :serie`, {
        serie,
      })
      .where("ReportEdition.editionAVAID = :id", { id: edition });

    if (schoolClass) {
      queryBuilder.andWhere("ReportEdition.schoolClassTURID = :schoolClass", {
        schoolClass,
      });
    } else if (formattedSchool) {
      queryBuilder.andWhere("ReportEdition.schoolESCID = :school", {
        school: formattedSchool,
      });
    } else if (formattedCounty) {
      queryBuilder.andWhere("ReportEdition.countyMUNID = :county", {
        county: formattedCounty,
      });
    } else if (edition) {
      queryBuilder.andWhere(
        "ReportEdition.countyMUNID IS NULL and ReportEdition.schoolESCID IS NULL and ReportEdition.schoolClassTURID IS NULL",
      );
    }

    const report = await queryBuilder.getOne();

    const items = report?.reportsSubjects?.map((reportSubject) => {
      const items = reportSubject.reportQuestions
        .map((reportQuestion) => {
          const totalPresentStudents = reportQuestion?.reportOptions?.reduce((acc, cur) => acc + cur.totalCorrect, 0)

          const options = reportQuestion.reportOptions.map((reportOption) => {
            return {
              id: reportOption.id,
              option: reportOption.option,
              totalCorrect: reportOption.totalCorrect,
              value: formatValueForPercentage(
                reportOption.totalCorrect,
                totalPresentStudents,
              ),
              ...reportOption,
            };
          });

          const findQuestionCorrect = options?.find(
            (item) =>
              item?.option?.toUpperCase() ===
              reportQuestion?.question?.TEG_RESPOSTA_CORRETA?.toUpperCase(),
          );

          const reportReadingCorrect = {
            fluente: formatValueForPercentage(
              findQuestionCorrect?.fluente,
              findQuestionCorrect?.totalCorrect,
            ),
            nao_fluente: formatValueForPercentage(
              findQuestionCorrect?.nao_fluente,
              findQuestionCorrect?.totalCorrect,
            ),
            silabas: formatValueForPercentage(
              findQuestionCorrect?.silabas,
              findQuestionCorrect?.totalCorrect,
            ),
            frases: formatValueForPercentage(
              findQuestionCorrect?.frases,
              findQuestionCorrect?.totalCorrect,
            ),
            palavras: formatValueForPercentage(
              findQuestionCorrect?.palavras,
              findQuestionCorrect?.totalCorrect,
            ),
            nao_leitor: formatValueForPercentage(
              findQuestionCorrect?.nao_leitor,
              findQuestionCorrect?.totalCorrect,
            ),
            nao_avaliado: formatValueForPercentage(
              findQuestionCorrect?.nao_avaliado,
              findQuestionCorrect?.totalCorrect,
            ),
            nao_informado: formatValueForPercentage(
              findQuestionCorrect?.nao_informado,
              findQuestionCorrect?.totalCorrect,
            ),
          };

          return {
            id: reportQuestion.question.TEG_ID,
            option: reportQuestion.question.TEG_RESPOSTA_CORRETA,
            order: reportQuestion.question.TEG_ORDEM,
            descriptor: reportQuestion.question.TEG_MTI.MTI_DESCRITOR,
            options,
            reportReadingCorrect,
          };
        })
        .sort((a, b) => a.order - b.order);

      return {
        id: reportSubject.test.TES_ID,
        subject: reportSubject.test.TES_DIS.DIS_NOME,
        typeSubject: reportSubject.test.TES_DIS.DIS_TIPO,
        items,
      };
    });

    return {
      items,
    };
  }

  async generateCsv(paginationParams: PaginationParams, user: User) {
    const { year, county, school, serie, schoolClass, edition } =
      paginationParams;

    const findSerie = await this.connection.getRepository(Serie).findOne({
      where: {
        SER_ID: serie,
      },
    });

    const findEdition = await this.connection
      .getRepository(Assessment)
      .findOne({
        where: {
          AVA_ID: edition,
        },
      });

    const findCounty = await this.connection.getRepository(County).findOne({
      where: {
        MUN_ID: county,
      },
    });

    const findSchool = await this.connection.getRepository(School).findOne({
      where: {
        ESC_ID: school,
      },
    });

    const findSchoolClass = await this.connection
      .getRepository(SchoolClass)
      .findOne({
        where: {
          TUR_ID: schoolClass,
        },
      });

    const { items } = await this.handle(
      {
        ...paginationParams,
        serie,
      },
      user,
    );

    const data = [];

    const base_consulta = `${year} > ${findSerie?.SER_NOME} > ${
      findEdition?.AVA_NOME
    }${!!county ? ` > ${findCounty?.MUN_NOME}` : ""}${
      !!school ? ` > ${findSchool?.ESC_NOME}` : ""
    }${!!schoolClass ? ` > ${findSchoolClass?.TUR_NOME}` : ""}`;

    items?.forEach((subject) => {
      subject?.items.forEach((question) => {
        const reportReadingCorrect = question?.reportReadingCorrect;
        const questionA = question.options.find(
          (option) => option.option.toUpperCase() === "A",
        );
        const questionB = question.options.find(
          (option) => option.option.toUpperCase() === "B",
        );
        const questionC = question.options.find(
          (option) => option.option.toUpperCase() === "C",
        );
        const questionD = question.options.find(
          (option) => option.option.toUpperCase() === "D",
        );
        const questionNull = question.options.find(
          (option) => option.option === "-",
        );

        const formattedDataSubject = {
          base_consulta,
          disciplina: subject?.subject ?? "",
          questao: question.order + 1,
          questao_correta: question.option,
          A: `${questionA?.value}%`,
          B: `${questionB?.value}%`,
          C: `${questionC?.value}%`,
          D: `${questionD?.value}%`,
          "-": `${questionNull?.value}%`,
          fluente_acerto: `${reportReadingCorrect?.fluente}%`,
          nao_fluente_acerto: `${reportReadingCorrect?.nao_fluente}%`,
          frases_acerto: `${reportReadingCorrect?.frases}%`,
          palavras_acerto: `${reportReadingCorrect?.palavras}%`,
          silabas_acerto: `${reportReadingCorrect?.silabas}%`,
          nao_leitor_acerto: `${reportReadingCorrect?.nao_leitor}%`,
          nao_avaliado_acerto: `${reportReadingCorrect?.nao_avaliado}%`,
          nao_informado_acerto: `${reportReadingCorrect?.nao_informado}%`,
          descritor: question.descriptor,
        };
        data.push(formattedDataSubject);
      });
    });

    if (!items?.length) {
      data.push({});
    }

    const parser = new Parser({
      quote: " ",
      withBOM: true,
    });

    try {
      const csv = parser.parse(data);
      return csv;
    } catch (error) {
      console.log("error csv:", error.message);
    }
  }
}
