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
import {
  Pagination,
  IPaginationOptions,
  paginateRaw,
  paginate,
  PaginationTypeEnum,
} from "nestjs-typeorm-paginate";
import { Assessment } from "../model/entities/assessment.entity";
import { AssessmentCounty } from "../model/entities/assessment-county.entity";
import { County } from "src/counties/model/entities/county.entity";
import { PaginationParams } from "src/helpers/params";
import { ChangeValuationDateDTO } from "../model/dto/change-valuation-date.dto";
import { Test } from "src/test/model/entities/test.entity";
import { School } from "src/school/model/entities/school.entity";
import { User } from "src/user/model/entities/user.entity";

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

  async findByReleaseResults(paginationParams: PaginationParams) {
    const { page, limit, search, year, school, schoolClass, serie, active } =
      paginationParams;
    const queryBuilder = this.assessmentRepository
      .createQueryBuilder("Assessment")
      .leftJoin("Assessment.AVA_TES", "AVA_TES")
      .leftJoin("disciplina", "TES_DIS", "TES_DIS.DIS_ID = AVA_TES.TES_DIS_ID")
      .leftJoin("series", "TES_SER", "TES_SER.SER_ID = AVA_TES.TES_SER_ID")
      .leftJoin(
        "avaliacao_municipio",
        "AVA_AVM",
        "AVA_AVM.AVM_AVA_ID = Assessment.AVA_ID",
      )
      .leftJoin("municipio", "MUN", "AVA_AVM.AVM_MUN_ID = MUN.MUN_ID");

    if (serie) {
      queryBuilder.andWhere("AVA_TES.TES_SER_ID = :serie", { serie });
    }

    if (year) {
      queryBuilder.andWhere("Assessment.AVA_ANO = :year", { year });
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

    if (active) {
      queryBuilder.andWhere("Assessment.AVA_ATIVO = :active", { active });
    }

    const totalItems = await queryBuilder.getCount();

    const data = await paginate(queryBuilder, {
      page: page,
      limit: limit,
      paginationType: PaginationTypeEnum.TAKE_AND_SKIP,
      countQueries: true,
      metaTransformer: ({ currentPage, itemCount, itemsPerPage }) => {
        const totalPages = Math.ceil(totalItems / itemsPerPage);
        return {
          currentPage,
          itemCount,
          itemsPerPage,
          totalItems,
          totalPages: totalPages === 0 ? 1 : totalPages,
        };
      },
    });

    return data;
  }

  /**
   * Listagem de avaliação com paginação, ordenação e pesquisa por nome.
   *
   * @param options adicionar o limite e qual página estamos
   * @param search permitir pesquisa por um termo pelo nome da avaliação
   * @param order cria a ordenação para a listagem
   * @returns Retorna a lista paginada, ordenada e filtrada com os avaliação
   */
  paginate(
    options: IPaginationOptions,
    search: string,
    column: string,
    orderBy: string,
    years: string,
    schoolId: number,
    schoolClassId: number,
    serie: string,
    active: string,
  ): Promise<Pagination<Assessment>> {
    const queryBuilder = this.assessmentRepository
      .createQueryBuilder("AVALIACAO")
      .select([
        "AVALIACAO.AVA_ID",
        "AVALIACAO.AVA_NOME",
        'GROUP_CONCAT(MUN.MUN_NOME SEPARATOR "|") as `AVALIACAO_MUNICIPIO`',
        'GROUP_CONCAT(CONCAT(TES_SER.SER_NOME,": ",TES_DIS.DIS_NOME) SEPARATOR "|") as `AVALIACAO_TESTE`',
      ])
      .leftJoin("AVALIACAO.AVA_TES", "AVA_TES")
      .leftJoin("disciplina", "TES_DIS", "TES_DIS.DIS_ID = AVA_TES.TES_DIS_ID")
      .leftJoin("series", "TES_SER", "TES_SER.SER_ID = AVA_TES.TES_SER_ID")
      .leftJoin(
        "avaliacao_municipio",
        "AVA_AVM",
        "AVA_AVM.AVM_AVA_ID = AVALIACAO.AVA_ID",
      )
      .leftJoin("municipio", "MUN", "AVA_AVM.AVM_MUN_ID = MUN.MUN_ID")
      .groupBy("AVALIACAO.AVA_ID");

    const order: any = orderBy;

    switch (column) {
      case "AVALIACAO_TESTE":
        queryBuilder.orderBy("TES_SER.SER_NOME", order);
        break;
      case "AVALIACAO_MUNICIPIO":
        queryBuilder.orderBy("MUN.MUN_NOME", order);
        break;
      default:
        queryBuilder.orderBy("AVALIACAO.AVA_ID", order);
        break;
    }

    let strQuery = "";
    if (search) {
      search = search.replace("°", "º");
      strQuery = ` ( AVALIACAO.AVA_NOME LIKE '%${search}%' OR 
      TES_SER.SER_NOME LIKE '%${search}%' OR 
      MUN.MUN_NOME LIKE '%${search}%' OR 
      TES_DIS.DIS_NOME LIKE '%${search}%' ) `;
    }

    if (years) {
      if (strQuery) {
        strQuery += " AND ";
      }

      strQuery += ` AVALIACAO.AVA_ANO = '${years}' `;
      queryBuilder
        .orderBy("AVALIACAO.AVA_ANO", order)
        .groupBy("AVALIACAO.AVA_ANO");
    }

    if (schoolId) {
      if (strQuery) {
        strQuery += " AND ";
      }

      strQuery += ` ESCOLA.ESC_ID = '${schoolId}' `;
      queryBuilder.leftJoin(
        "escola",
        "ESCOLA",
        "ESCOLA.ESC_MUN_ID = AVA_AVM.AVM_MUN_ID",
      );
    }

    if (schoolClassId) {
      if (strQuery) {
        strQuery += " AND ";
      }
      strQuery += ` TURMA.TUR_ID = '${schoolClassId}' `;
      queryBuilder.leftJoin(
        "turma",
        "TURMA",
        "TURMA.TUR_SER_ID = TES_SER.SER_ID",
      );
    }

    if (serie) {
      if (strQuery) {
        strQuery += " AND ";
      }
      strQuery += ` AVA_TES.TES_SER_ID = '${serie}' `;
    }

    queryBuilder.where(strQuery);

    if (active) {
      queryBuilder.andWhere("AVALIACAO.AVA_ATIVO = :active", { active });
    }

    return paginateRaw<Assessment>(queryBuilder, options);
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
      const assessmentCounty = await this.assessmentCountiesRepository
        .createQueryBuilder("county")
        .innerJoin("county.AVM_MUN", "AVM_MUN")
        .innerJoin("county.AVM_AVA", "AVM_AVA")
        .where("AVM_MUN.MUN_ID = :idCounty", { idCounty: county.id })
        .andWhere(
          "((county.AVM_DT_INICIO <= :dateInitial AND county.AVM_DT_FIM >= :dateInitial) OR (county.AVM_DT_INICIO <= :dateFinal AND county.AVM_DT_FIM >= :dateFinal) OR (county.AVM_DT_INICIO >= :dateInitial AND county.AVM_DT_FIM <= :dateFinal))",
          {
            dateInitial: county.AVM_DT_INICIO,
            dateFinal: county.AVM_DT_FIM,
          },
        )
        .getOne();

      if (assessmentCounty) {
        throw new ForbiddenException(`Já existe uma avaliação nesse período pro município de ${county.AVM_MUN_NOME}.`);
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
    AVA_ID: number,
    updateAssessmentDto: UpdateAssessmentDto,
    user: User,
  ): Promise<Assessment> {
    let counties = updateAssessmentDto.AVA_AVM as any;
    
    for (const county of counties) {
      const findAssessmentCounty = await this.assessmentCountiesRepository
        .createQueryBuilder("county")
        .where("county.AVM_MUN = :idCounty", { idCounty: county.id })
        .andWhere("county.AVM_AVA = :AVA_ID", { AVA_ID })
        .getOne();

      if (
        findAssessmentCounty?.AVM_DT_FIM?.toLocaleDateString() !== new Date(county.AVM_DT_FIM).toLocaleDateString() ||
        findAssessmentCounty?.AVM_DT_DISPONIVEL?.toLocaleDateString() !== new Date(county.AVM_DT_DISPONIVEL).toLocaleDateString() ||
        findAssessmentCounty?.AVM_DT_INICIO?.toLocaleDateString() !== new Date(county.AVM_DT_INICIO).toLocaleDateString()
      ) {
        const assessmentCounty = await this.assessmentCountiesRepository
          .createQueryBuilder("county")
          .innerJoin("county.AVM_MUN", "AVM_MUN")
          .innerJoinAndSelect("county.AVM_AVA", "AVM_AVA")
          .where("AVM_MUN.MUN_ID = :idCounty", { idCounty: county.id })
          .andWhere("AVM_AVA.AVA_ID != :id", { id: AVA_ID })
          .andWhere("((county.AVM_DT_INICIO <= :dateInitial AND county.AVM_DT_FIM >= :dateInitial) OR (county.AVM_DT_INICIO <= :dateFinal AND county.AVM_DT_FIM >= :dateFinal) OR (county.AVM_DT_INICIO >= :dateInitial AND county.AVM_DT_FIM <= :dateFinal))", {
            dateInitial: county.AVM_DT_INICIO,
            dateFinal: county.AVM_DT_FIM,
          })
          .getOne();

        if (assessmentCounty) {
          throw new ForbiddenException(
            `Já existe uma avaliação nesse período pro município de ${county.AVM_MUN_NOME}.`,
          );
        }
      }
    }
    
    return this.assessmentRepository
      .save(
        { ...updateAssessmentDto, AVA_ID },
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

    if (!assessment) {
      throw new NotFoundException("Avaliação não encontrada");
    }

    if (isPast(new Date(formattedFinalDate.toDateString()))) {
      throw new BadRequestException("Informe uma data maior que a data atual");
    }

    for (const idCounty of idsCounties) {
      const assessmentCountyDate = await this.assessmentCountiesRepository.createQueryBuilder("county")
      .innerJoin("county.AVM_MUN", "AVM_MUN")
      .innerJoin("county.AVM_AVA", "AVM_AVA")
      .where("AVM_MUN.MUN_ID = :idCounty", { idCounty })
      .andWhere("AVM_AVA.AVA_ID = :id", { id })
      .getOne();

      if(assessmentCountyDate.AVM_DT_INICIO > formattedFinalDate) {
        throw new ForbiddenException("Informe uma data maior que a data de início.");
      }
      
      const assessmentCounty = await this.assessmentCountiesRepository
        .createQueryBuilder("county")
        .innerJoin("county.AVM_MUN", "AVM_MUN")
        .innerJoin("county.AVM_AVA", "AVM_AVA")
        .where("AVM_MUN.MUN_ID = :idCounty", { idCounty })
        .andWhere("AVM_AVA.AVA_ID != :id", { id })
        .andWhere(
          "((county.AVM_DT_INICIO <= :dateInitial AND county.AVM_DT_FIM >= :dateInitial) OR (county.AVM_DT_INICIO <= :dateFinal AND county.AVM_DT_FIM >= :dateFinal) OR (county.AVM_DT_INICIO >= :dateInitial AND county.AVM_DT_FIM <= :dateFinal))",
          {
            dateInitial: assessmentCountyDate.AVM_DT_INICIO,
            dateFinal: formattedFinalDate,
          },
        )
        .getOne();

      if (assessmentCounty) {
        throw new ForbiddenException("Já existe uma avaliação nesse período.");
      }
    }

    for (const idCounty of idsCounties) {
      let assessmentCounty = await this.assessmentCountiesRepository.findOne({
        where: {
          AVM_MUN: {
            MUN_ID: idCounty,
          },
          AVM_AVA: {
            AVA_ID: id,
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
      .createQueryBuilder("tests")
      .leftJoinAndSelect("tests.TES_ASSESMENTS", "TES_ASSESMENTS")
      .leftJoinAndSelect("tests.TES_DIS", "TES_DIS")
      .leftJoinAndSelect("TES_ASSESMENTS.AVA_AVM", "AVA_AVM")
      .leftJoinAndSelect("AVA_AVM.AVM_MUN", "AVM_MUN")
      .leftJoin("AVM_MUN.schools", "schools")
      .andWhere("DATE_SUB(AVA_AVM.AVM_DT_DISPONIVEL, INTERVAL 3 HOUR) <= :initialDate", { initialDate: formattedInitialDate })
      .andWhere("DATE_SUB(AVA_AVM.AVM_DT_FIM, INTERVAL 3 HOUR) >= :finalDate", { finalDate })
      .orderBy("tests.TES_DT_CRIACAO", "DESC");

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
      // .andWhere("tests.TES_NOME LIKE :q", { q: `%${search}%` })
    }

    const totalItems = await testsQuery.getCount();

    const data = await paginate(testsQuery, {
      page: +page,
      limit: +limit,
      paginationType: PaginationTypeEnum.TAKE_AND_SKIP,
      metaTransformer: ({ currentPage, itemCount, itemsPerPage }) => {
        const totalPages = Math.ceil(totalItems / itemsPerPage);
        return {
          currentPage,
          itemCount,
          itemsPerPage,
          totalItems,
          totalPages: totalPages === 0 ? 1 : totalPages,
        };
      },
    });

    const formattedData = data.items.map((test) => {
      return {
        id: test.TES_ID,
        name: test.TES_NOME,
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

  /**
   * Retorna todos os avaliação
   *
   * @returns retorna uma lista de avaliação
   */
  findAll(): Promise<Assessment[]> {
    return this.assessmentRepository.find({
      order: { AVA_NOME: "ASC" },
      relations: ["AVA_TES", "AVA_AVM"],
    });
  }

  /**
   * Buscar um avaliação com base no id
   * @param id informação referente a identificação da avaliação
   * @returns retorna o avaliação pesquisado
   */
  async findOne(AVA_ID: number) {
    let main = await this.assessmentRepository.findOne(
      { AVA_ID },
      { relations: ["AVA_TES"] },
    );
    let getItems = await this.findItems(main.AVA_ID);
    let items = await Promise.all(
      getItems.map(async (template) => {
        return template;
      }),
    );

    main["AVA_AVM"] = items;
    return main;
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
        .createQueryBuilder("Assesment")
        .leftJoinAndSelect("Assesment.AVA_AVM", "AVA_AVM")
        .leftJoinAndSelect("AVA_AVM.AVM_MUN", "AVM_MUN")
        .orderBy("Assesment.AVA_NOME", "ASC")
        .where("Assesment.AVA_ANO = :year", { year: ano })
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
      .andWhere("DATE_SUB(AVA_AVM.AVM_DT_DISPONIVEL, INTERVAL 3 HOUR) <= :dateInitial", { dateInitial: formattedInitialDate })
      .andWhere("DATE_SUB(AVA_AVM.AVM_DT_FIM, INTERVAL 3 HOUR) >= :finalDate", { finalDate });

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
}
