import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Headquarter } from "src/headquarters/model/entities/headquarter.entity";
import { PaginationParams } from "src/helpers/params";
import { Repository } from "typeorm";
import { ReportEdition } from "../model/entities/report-edition.entity";
import * as _ from "lodash";
import { User } from "src/user/model/entities/user.entity";

@Injectable()
export class ResultByDescriptorsService {
  constructor(
    @InjectRepository(Headquarter)
    private headquertersRepository: Repository<Headquarter>,

    @InjectRepository(ReportEdition)
    private reportEditionRepository: Repository<ReportEdition>,
  ) {}

  async handle(paginationParams: PaginationParams, user: User) {
    const { year, edition, county, school, serie, schoolClass } =
      paginationParams;

      let formattedCounty = county;
      let formattedSchool = school;

      if(user?.USU_SPE?.SPE_PER?.PER_NOME !== 'SAEV') {
        formattedCounty = user?.USU_MUN?.MUN_ID;
      }

      if (user?.USU_SPE?.SPE_PER?.PER_NOME === "Escola") {
        formattedSchool = user?.USU_ESC?.ESC_ID;
       }

    const queryBuilder = this.headquertersRepository
      .createQueryBuilder("HEADQUARTERS")
      .leftJoinAndSelect("HEADQUARTERS.MAR_DIS", "MAR_DIS")
      .leftJoinAndSelect("HEADQUARTERS.MAR_MTO", "MAR_MTO")
      .leftJoinAndSelect("MAR_MTO.MTO_MTI", "MTO_MTI");

    const topics = await queryBuilder.getMany();

    const queryReport = this.reportEditionRepository
      .createQueryBuilder("report")
      .leftJoin("report.edition", "edition")
      .leftJoin("report.schoolClass", "schoolClass")
      .leftJoin("report.school", "school")
      .leftJoin("report.county", "county")
      .innerJoinAndSelect("report.reports_descriptors", "reports_descriptors")
      .innerJoinAndSelect("reports_descriptors.test", "test")
      .innerJoinAndSelect("reports_descriptors.descriptor", "descriptor")
      .innerJoinAndSelect("test.TES_DIS", "TES_DIS")
      .innerJoin("test.TES_SER", "TES_SER", `TES_SER.SER_ID = :serie`, {
        serie,
      });

    if (year) {
      queryReport.andWhere("edition.AVA_ANO = :year", { year });
    }
    if (edition) {
      queryReport.andWhere("edition.AVA_ID = :id", { id: edition });
    }

    if (schoolClass) {
      queryReport.andWhere("schoolClass.TUR_ID = :schoolClass", {
        schoolClass,
      });
    } else if (formattedSchool) {
      queryReport.andWhere("school.ESC_ID = :school", { school: formattedSchool });
    } else if (formattedCounty) {
      queryReport.andWhere("county.MUN_ID = :county", { county: formattedCounty });
    } else if (serie) {
      queryReport.andWhere(
        "county.MUN_ID IS NULL and school.ESC_ID IS NULL and schoolClass.TUR_ID IS NULL",
      );
    }

    const report_editions = await queryReport.getOne();

    let items = topics.map((head, index) => {
      let topics = head.MAR_MTO.map((mto) => {
        let totalCorrectTopic = 0;
        let totalTopic = 0;

        let descritores = mto.MTO_MTI.map((mti) => {
          const findDescriptor = report_editions?.reports_descriptors?.find(
            (report_descriptor) =>
              report_descriptor.descriptor.MTI_ID === mti.MTI_ID,
          );

          if (findDescriptor) {
            totalCorrectTopic += findDescriptor.totalCorrect;
            totalTopic += findDescriptor.total;
            return {
              id: mti.MTI_ID,
              cod: mti.MTI_CODIGO,
              name: mti.MTI_DESCRITOR,
              value: Math.round(
                (findDescriptor.totalCorrect / findDescriptor.total) * 100,
              ),
            };
          }
        });

        descritores = descritores.filter((data) => !!data?.id);

        if (descritores.length) {
          return {
            id: mto.MTO_ID,
            name: mto.MTO_NOME,
            descritores,
            value: Math.round((totalCorrectTopic / totalTopic )* 100),
          };
        }
      });

      topics = topics.filter((data) => !!data?.id);

      return {
        id: head.MAR_DIS.DIS_ID,
        subject: head.MAR_DIS.DIS_NOME,
        topics,
      };
    });

    items = items.filter((data) => !!data.topics.length);
    let filterSubjects = items.filter(function (a) {
      return (
        !this[JSON.stringify(a?.id)] && (this[JSON.stringify(a?.id)] = true)
      );
    }, Object.create(null));

    filterSubjects = filterSubjects.map((subject) => {
      const topics = items.reduce((acc, cur) => {
        if (cur.id === subject.id) {
          const topics = [...acc, ...cur.topics];
          return topics;
        } else {
          return acc;
        }
      }, []);

      return {
        id: subject.id,
        subject: subject.subject,
        topics,
      };
    });

    return { items: filterSubjects };
  }
}
