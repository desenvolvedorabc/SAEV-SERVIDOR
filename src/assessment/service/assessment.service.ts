import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { isPast } from "date-fns";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CreateAssessmentDto } from "../model/dto/create-assessment.dto";
import { UpdateAssessmentDto } from "../model/dto/update-assessment.dto";
import { Pagination, paginateRaw } from "nestjs-typeorm-paginate";
import { Assessment } from "../model/entities/assessment.entity";
import { AssessmentCounty } from "../model/entities/assessment-county.entity";
import { County } from "src/counties/model/entities/county.entity";
import { PaginationParams } from "src/helpers/params";
import { ChangeValuationDateDTO } from "../model/dto/change-valuation-date.dto";
import { Test } from "src/test/model/entities/test.entity";
import { User } from "src/user/model/entities/user.entity";
import { paginateData } from "src/utils/paginate-data";

@Injectable()
export class AssessmentsService {
  constructor(
    @InjectRepository(Assessment)
    private assessmentRepository: Repository<Assessment>,
    @InjectRepository(AssessmentCounty)
    private assessmentCountiesRepository: Repository<AssessmentCounty>,
    @InjectRepository(County)
    private countyRepository: Repository<County>,
    @InjectRepository(Test)
    private testsRepository: Repository<Test>,
  ) {}

  async findByReleaseResults(params: PaginationParams) {
    const { page, limit } = params;
    const { queryBuilder } = this.getQueryBuilderForPaginateAssessments(params);

    return await paginateData<Assessment>(page, limit, queryBuilder);
  }

  async paginate(params: PaginationParams): Promise<Pagination<Assessment>> {
    const { page, limit } = params;
    const { queryBuilder } = this.getQueryBuilderForPaginateAssessments(params);

    let selectQueryBuilder = queryBuilder
      .select([
        "Assessments.AVA_ID",
        "Assessments.AVA_NOME",
        "Assessments.AVA_ANO",
        'GROUP_CONCAT(MUN.MUN_NOME SEPARATOR "|") as `AVALIACAO_MUNICIPIO`',
        'GROUP_CONCAT(CONCAT(TES_SER.SER_NOME,": ",TES_DIS.DIS_NOME) SEPARATOR "|") as `AVALIACAO_TESTE`',
      ])
      .groupBy("Assessments.AVA_ID");

    return await paginateRaw<Assessment>(selectQueryBuilder, { page, limit });
  }

  /**
   * Criar avaliação
   *
   * @param createAssessmentDto objeto referente a criação de avaliação
   * @returns informa que o avaliação foi criado
   */
  async add(createAssessmentDto: CreateAssessmentDto, user: User) {
    let counties = createAssessmentDto.AVA_AVM as any;

    for (const county of counties) {
      const { assessmentCounty } = await this.verifyExistsAssessmentCounty({
        countyId: county.id,
        assessmentId: null,
        dateInitial: county.AVM_DT_INICIO,
        dateFinal: county.AVM_DT_FIM,
      });

      if (assessmentCounty) {
        throw new ForbiddenException(
          `Já existe uma avaliação nesse período pro município de ${county.AVM_MUN_NOME}.`,
        );
      }
    }

    return this.assessmentExists(createAssessmentDto).then(
      (exists: boolean) => {
        if (!exists) {
          return this.assessmentRepository
            .save(createAssessmentDto, {
              data: user,
            })
            .then((createAssessment: Assessment) => {
              if (this.saveItems(createAssessment)) {
                return createAssessment;
              }
            });
        } else {
          throw new HttpException(
            "Avaliação já cadastrada.",
            HttpStatus.CONFLICT,
          );
        }
      },
    );
  }

  /**
   *
   * @param id informação referente a identificação da avaliação
   * @param updateAssessmentDto objeto referente a criação de avaliação
   * @returns informa que o avaliação foi atualizado
   */
  async update(
    id: number,
    updateAssessmentDto: UpdateAssessmentDto,
    user: User,
  ): Promise<Assessment> {
    const assessment = await this.findOne(id);
    let counties = updateAssessmentDto.AVA_AVM as any;

    for (const county of counties) {
      const findAssessmentCounty = await this.assessmentCountiesRepository
        .createQueryBuilder("AssessmentCounty")
        .where("AssessmentCounty.AVM_MUN = :countyId", { countyId: county.id })
        .andWhere("AssessmentCounty.AVM_AVA = :assessmentId", {
          assessmentId: assessment.AVA_ID,
        })
        .getOne();

      if (
        findAssessmentCounty?.AVM_DT_FIM?.toLocaleDateString() !==
          new Date(county.AVM_DT_FIM).toLocaleDateString() ||
        findAssessmentCounty?.AVM_DT_DISPONIVEL?.toLocaleDateString() !==
          new Date(county.AVM_DT_DISPONIVEL).toLocaleDateString() ||
        findAssessmentCounty?.AVM_DT_INICIO?.toLocaleDateString() !==
          new Date(county.AVM_DT_INICIO).toLocaleDateString()
      ) {
        const { assessmentCounty } = await this.verifyExistsAssessmentCounty({
          countyId: county.id,
          assessmentId: assessment.AVA_ID,
          dateInitial: county.AVM_DT_INICIO,
          dateFinal: county.AVM_DT_FIM,
        });

        if (assessmentCounty) {
          throw new ForbiddenException(
            `Já existe uma avaliação nesse período pro município de ${county.AVM_MUN_NOME}.`,
          );
        }
      }
    }

    return this.assessmentRepository
      .save(
        { ...updateAssessmentDto, AVA_ID: assessment.AVA_ID },
        {
          data: user,
        },
      )
      .then((updateAssessment: Assessment) => {
        updateAssessment = {
          ...updateAssessment,
          AVA_AVM: counties,
        };
        if (
          !!updateAssessment?.AVA_AVM?.length &&
          this.saveItems(updateAssessment)
        ) {
          return updateAssessment;
        }
        return updateAssessment;
      });
  }

  async changeValuationDate(
    { idsCounties, newDate }: ChangeValuationDateDTO,
    id: number,
    user: User,
  ) {
    const assessment = await this.findOne(id);
    const formattedFinalDate = new Date(newDate);

    if (isPast(new Date(formattedFinalDate.toDateString()))) {
      throw new BadRequestException("Informe uma data maior que a data atual");
    }

    for (const countyId of idsCounties) {
      const assessmentCountyDate = await this.assessmentCountiesRepository
        .createQueryBuilder("county")
        .innerJoin("county.AVM_MUN", "AVM_MUN")
        .innerJoin("county.AVM_AVA", "AVM_AVA")
        .where("AVM_MUN.MUN_ID = :countyId", { countyId })
        .andWhere("AVM_AVA.AVA_ID = :id", { id: assessment.AVA_ID })
        .getOne();

      if (assessmentCountyDate.AVM_DT_INICIO > formattedFinalDate) {
        throw new ForbiddenException(
          "Informe uma data maior que a data de início.",
        );
      }

      const { assessmentCounty } = await this.verifyExistsAssessmentCounty({
        countyId,
        assessmentId: assessment.AVA_ID,
        dateInitial: assessmentCountyDate.AVM_DT_INICIO,
        dateFinal: formattedFinalDate,
      });

      if (assessmentCounty) {
        throw new ForbiddenException("Já existe uma avaliação nesse período.");
      }
    }

    for (const countyId of idsCounties) {
      let assessmentCounty = await this.assessmentCountiesRepository.findOne({
        where: {
          AVM_MUN: {
            MUN_ID: countyId,
          },
          AVM_AVA: {
            AVA_ID: assessment.AVA_ID,
          },
        },
      });

      if (assessmentCounty) {
        assessmentCounty.AVM_DT_FIM = formattedFinalDate;

        await this.assessmentCountiesRepository.save(assessmentCounty, {
          data: user,
        });
      }
    }
  }

  async getTestsByFilter(paginationParams: PaginationParams) {
    const { county, school, limit, page, search } = paginationParams;

    const formattedInitialDate = new Date();
    formattedInitialDate.setUTCHours(23, 59, 59, 999);

    const finalDate = new Date();

    const testsQuery = this.testsRepository
      .createQueryBuilder("Tests")
      .leftJoinAndSelect("Tests.TES_ASSESMENTS", "TES_ASSESMENTS")
      .leftJoinAndSelect("Tests.TES_DIS", "TES_DIS")
      .leftJoinAndSelect("Tests.TES_SER", "TES_SER")
      .leftJoinAndSelect("TES_ASSESMENTS.AVA_AVM", "AVA_AVM")
      .leftJoinAndSelect("AVA_AVM.AVM_MUN", "AVM_MUN")
      .leftJoin("AVM_MUN.schools", "schools")
      .andWhere(
        "DATE_SUB(AVA_AVM.AVM_DT_DISPONIVEL, INTERVAL 3 HOUR) <= :initialDate",
        { initialDate: formattedInitialDate },
      )
      .andWhere("DATE_SUB(AVA_AVM.AVM_DT_FIM, INTERVAL 3 HOUR) >= :finalDate", {
        finalDate,
      })
      .orderBy("Tests.TES_DT_CRIACAO", "DESC");

    if (county) {
      testsQuery.andWhere("AVM_MUN.MUN_ID = :county", { county });
    }

    if (school) {
      testsQuery.andWhere("schools.ESC_ID = :school", { school });
    }

    if (search) {
      testsQuery.andWhere("TES_ASSESMENTS.AVA_NOME LIKE :q", {
        q: `%${search}%`,
      });
    }

    const data = await paginateData(page, limit, testsQuery);

    const formattedData = data.items.map((test) => {
      return {
        id: test.TES_ID,
        name: test.TES_NOME,
        serie: test.TES_SER.SER_NOME,
        subject: test.TES_DIS.DIS_NOME,
        manual: test.TES_MANUAL,
        file: test.TES_ARQUIVO,
        edition: test.TES_ASSESMENTS[0].AVA_NOME,
        availableAt: test.TES_ASSESMENTS[0].AVA_AVM[0]?.AVM_DT_DISPONIVEL,
        endsAt: test.TES_ASSESMENTS[0].AVA_AVM[0]?.AVM_DT_FIM,
        startAt: test.TES_ASSESMENTS[0].AVA_AVM[0]?.AVM_DT_INICIO,
      };
    });

    return {
      ...data,
      items: formattedData,
    };
  }

  async saveItems(updateAssessment: Assessment) {
    await Promise.all(
      updateAssessment?.AVA_AVM?.map(async (counties: AssessmentCounty) => {
        if (!counties.AVM_AVA) {
          counties = {
            ...counties,
            AVM_AVA: updateAssessment,
          };
        }
        delete counties["id"];

        let county = await this.countyRepository.findOne({
          MUN_ID: counties["AVM_MUN_ID"],
        });
        counties["AVM_MUN"] = county;
        this.assessmentCountiesRepository.save(counties).then(() => {
          return counties;
        });
      }),
    );
  }

  async findOne(id: number) {
    let assessment = await this.assessmentRepository.findOne(
      { AVA_ID: id },
      { relations: ["AVA_TES"] },
    );

    if (!assessment) {
      throw new NotFoundException("Avaliação não encontrada.");
    }

    const getItems = await this.findItems(assessment.AVA_ID);

    const items = await Promise.all(
      getItems.map(async (template) => {
        return template;
      }),
    );

    assessment["AVA_AVM"] = items;
    return assessment;
  }

  async findItems(AVA_ID: number) {
    return this.assessmentCountiesRepository.find({
      where: { AVM_AVA: { AVA_ID: AVA_ID } },
    });
  }

  /**
   * Verificação se já existe o mesmo avaliação, com mesmo estado e cidade
   * @param AVA_NOME nome da avaliação
   * @param AVA_ANO ano da avaliação
   * @returns retorna o resultado da consulta como VERDADEIRO ou FALSO
   */
  async assessmentExists(
    createAssessmentDto: CreateAssessmentDto,
  ): Promise<boolean> {
    const assessment = await this.assessmentRepository.findOne({
      AVA_NOME: createAssessmentDto.AVA_NOME,
      AVA_ANO: createAssessmentDto.AVA_ANO,
      AVA_ATIVO: true,
    });
    if (assessment) {
      return true;
    } else {
      return false;
    }
  }

  /**
   * Retorna todos as edições por ano
   *
   * @returns retorna uma lista de edições
   */
  findYears(ano: string, user: User): Promise<Assessment[]> {
    if (user.USU_SPE.SPE_PER.PER_NOME !== "SAEV") {
      return this.assessmentRepository
        .createQueryBuilder("Assessment")
        .leftJoinAndSelect("Assessment.AVA_AVM", "AVA_AVM")
        .leftJoinAndSelect("AVA_AVM.AVM_MUN", "AVM_MUN")
        .orderBy("Assessment.AVA_NOME", "ASC")
        .where("Assessment.AVA_ANO = :year", { year: ano })
        .andWhere("AVM_MUN.MUN_ID = :county", { county: user?.USU_MUN?.MUN_ID })
        .getMany();
    }

    return this.assessmentRepository.find({
      order: { AVA_NOME: "ASC" },
      where: { AVA_ANO: ano },
      relations: ["AVA_AVM"],
    });
  }

  async getTests(school?: string, countyId?: number) {
    const formattedInitialDate = new Date();
    formattedInitialDate.setUTCHours(23, 59, 59, 999);

    const finalDate = new Date();

    const testsQuery = this.testsRepository
      .createQueryBuilder("tests")
      .leftJoin("tests.TES_ASSESMENTS", "TES_ASSESMENTS")
      .leftJoin("TES_ASSESMENTS.AVA_AVM", "AVA_AVM")
      .leftJoin("AVA_AVM.AVM_MUN", "AVM_MUN")
      .leftJoin("AVM_MUN.schools", "schools")
      .andWhere(
        "DATE_SUB(AVA_AVM.AVM_DT_DISPONIVEL, INTERVAL 3 HOUR) <= :dateInitial",
        { dateInitial: formattedInitialDate },
      )
      .andWhere("DATE_SUB(AVA_AVM.AVM_DT_FIM, INTERVAL 3 HOUR) >= :finalDate", {
        finalDate,
      });

    if (countyId) {
      testsQuery.andWhere("AVM_MUN.MUN_ID = :county", { county: countyId });
    }

    if (school) {
      testsQuery.andWhere("schools.ESC_ID = :school", { school });
    }

    const total = testsQuery.getCount();

    return total;
  }

  /**
   * Retorna todos os anos dos edições
   *
   * @returns retorna uma lista de edições
   */
  findAllYears(): Promise<Assessment[]> {
    return this.assessmentRepository
      .createQueryBuilder("AVALIACAO")
      .select("AVALIACAO.AVA_ANO AS ANO")
      .groupBy("AVALIACAO.AVA_ANO")
      .execute();
  }

  async verifyExistsAssessmentCounty({
    countyId,
    assessmentId,
    dateInitial,
    dateFinal,
  }: {
    countyId: number;
    assessmentId: number | null;
    dateInitial: Date;
    dateFinal: Date;
  }) {
    const queryBuilder = await this.assessmentCountiesRepository
      .createQueryBuilder("AssessmentCounty")
      .innerJoin("AssessmentCounty.AVM_MUN", "AVM_MUN")
      .innerJoin("AssessmentCounty.AVM_AVA", "AVM_AVA")
      .where("AVM_MUN.MUN_ID = :countyId", { countyId })
      .andWhere(
        "((AssessmentCounty.AVM_DT_INICIO <= :dateInitial AND AssessmentCounty.AVM_DT_FIM >= :dateInitial) OR (AssessmentCounty.AVM_DT_INICIO <= :dateFinal AND AssessmentCounty.AVM_DT_FIM >= :dateFinal) OR (AssessmentCounty.AVM_DT_INICIO >= :dateInitial AND AssessmentCounty.AVM_DT_FIM <= :dateFinal))",
        {
          dateInitial,
          dateFinal,
        },
      );

    if (assessmentId) {
      queryBuilder.andWhere("AVM_AVA.AVA_ID != :assessmentId", {
        assessmentId,
      });
    }

    const assessmentCounty = await queryBuilder.getOne();

    return {
      assessmentCounty,
    };
  }

  private getQueryBuilderForPaginateAssessments({
    order,
    year,
    search,
    county,
    school,
    schoolClass,
    serie,
    active,
    column,
  }: PaginationParams) {
    const queryBuilder = this.assessmentRepository
      .createQueryBuilder("Assessments")
      .leftJoin("Assessments.AVA_TES", "AVA_TES")
      .leftJoin("AVA_TES.TES_DIS", "TES_DIS")
      .leftJoin("AVA_TES.TES_SER", "TES_SER")
      .leftJoin("Assessments.AVA_AVM", "AVA_AVM")
      .leftJoin("AVA_AVM.AVM_MUN", "MUN")
      .orderBy(`Assessments.${column ?? "AVA_NOME"}`, order);

    if (search) {
      queryBuilder.andWhere("Assessments.AVA_NOME LIKE :search", {
        search: `%${search}%`,
      });
    }

    if (year) {
      queryBuilder.andWhere("Assessments.AVA_ANO = :year", { year });
    }

    if (school) {
      queryBuilder
        .leftJoin("escola", "ESCOLA", "ESCOLA.ESC_MUN_ID = AVA_AVM.AVM_MUN_ID")
        .andWhere("ESCOLA.ESC_ID = :school", { school });
    }

    if (schoolClass) {
      queryBuilder
        .leftJoin("turma", "TURMA", "TURMA.TUR_SER_ID = TES_SER.SER_ID")
        .andWhere("TURMA.TUR_ID = :schoolClass", { schoolClass });
    }

    if (county) {
      queryBuilder.andWhere("AVA_AVM.AVM_MUN_ID = :county", { county });
    }

    if (serie) {
      queryBuilder.andWhere("AVA_TES.TES_SER_ID = :serie", { serie });
    }

    if (active) {
      queryBuilder.andWhere("Assessments.AVA_ATIVO = :active", { active });
    }

    return {
      queryBuilder,
    };
  }
}
