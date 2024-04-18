import {
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Serie } from "../model/entities/serie.entity";
import { ISerie } from "../model/interface/serie.interface";
import { CreateSerieDto } from "../model/dto/create-serie.dto";
import { UpdateSerieDto } from "../model/dto/update-serie.dto";
import {
  IPaginationOptions,
} from "nestjs-typeorm-paginate";
import { Assessment } from "src/assessment/model/entities/assessment.entity";
import { EvolutionaryLineService } from "src/reports/service/evolutionary-line.service";
import { User } from "src/user/model/entities/user.entity";
import { paginateData } from "src/utils/paginate-data";

@Injectable()
export class SerieService {
  constructor(
    @InjectRepository(Serie)
    private seriesRepository: Repository<Serie>,

    @InjectRepository(Assessment)
    private assessmentRepository: Repository<Assessment>,

    private readonly evolutionaryLineService: EvolutionaryLineService,
  ) {}

  /**
   * Listagem de séries com paginação, ordenação e pesquisa por nome.
   *
   * @param options adicionar o limite e qual página estamos
   * @param search permitir pesquisa por um termo pelo nome da série
   * @param order cria a ordenação para a listagem
   * @returns Retorna a lista paginada, ordenada e filtrada com os séries
   */
  async paginate(
    options: IPaginationOptions,
    search: string,
    column: string,
    orderBY: string,
    status: string,
    schoolId: number,
    active?: '0' | '1'
  ) {
    const { page, limit } = options;
    const order = orderBY.toUpperCase() === "ASC" ? "ASC" : "DESC";

    const queryBuilder = this.seriesRepository
      .createQueryBuilder("SERIE")

    if (search?.trim()) {
      queryBuilder.where("SERIE.SER_NOME LIKE :q", { q: `%${search}%` });
    }

    if (status) {
      queryBuilder.where("SER_ATIVO = :q", {
        q: `${status === "true" ? 1 : 0}`,
      });
    }
    
    if (schoolId) {
      queryBuilder
        .leftJoin("SERIE.SER_TUR", "SER_TUR")
        .leftJoin("SER_TUR.TUR_ESC", "TUR_ESC")
        .andWhere("SER_TUR.TUR_ESC = :school", {
          school: schoolId,
        });
    }

    if (active) {
      queryBuilder.andWhere("SER_ATIVO = :active", {active})
    }
    
    switch (column) {
      case "SER_NOME":
        queryBuilder.orderBy("SERIE.SER_NOME", order);
        break;
      case "SER_ATIVO":
        queryBuilder.orderBy("SERIE.SER_ATIVO", order);
        break;
      default:
        queryBuilder.orderBy("SERIE.SER_NOME", order);
        break;

    }

    const data = await paginateData(+page, +limit, queryBuilder)

    return data;
  }

  /**
   * Criar série
   *
   * @param createSerieDto objeto referente a criação de série
   * @returns informa que o série foi criado
   */
  add(createSerieDto: CreateSerieDto, user: User) {
    return this.countyExists(createSerieDto.SER_NOME).then(
      (exists: boolean) => {
        if (!exists) {
          return this.seriesRepository
            .save(createSerieDto, { data: user })
            .then((saved: ISerie) => {
              return saved;
            });
        } else {
          throw new HttpException("Série já cadastrada.", HttpStatus.CONFLICT);
        }
      },
    );
  }

  /**
   * Retorna todos os séries
   *
   * @returns retorna uma lista de séries
   */
  findAll(): Promise<Serie[]> {
    return this.seriesRepository.find({
      where: { SER_ATIVO: true },
      order: { SER_NOME: "ASC" },
    });
  }

  /**
   * Buscar um série com base no id
   * @param id informação referente a identificação da série
   * @returns retorna o série pesquisado
   */
  findOne(SER_ID: number) {
    return this.seriesRepository.findOne({ SER_ID });
  }

  async findOneReports(id: number) {
    const numberYear = new Date().getFullYear();

    const assessments = await this.evolutionaryLineService.evolutionaryLine({
      page: 1,
      limit: 10,
      order: "ASC",
      column: null,
      county: null,
      edition: null,
      month: null,
      profileBase: null,
      school: null,
      schoolClass: null,
      search: null,
      status: null,
      student: null,
      subject: null,
      subProfile: null,
      type: null,
      year: String(numberYear),
      serie: `${id}`,
    }, null);

    return {
      assessments,
    };
  }

  /**
   *
   * @param id informação referente a identificação da série
   * @param updateSerieDto objeto referente a criação de série
   * @returns informa que o série foi atualizado
   */
  async update(
    SER_ID: number,
    updateSerieDto: UpdateSerieDto,
    user: User,
  ): Promise<Serie> {
    const isExistsSerie = await this.seriesRepository.findOne({
      where: {
        SER_NOME: updateSerieDto?.SER_NOME,
      },
    });

    if (!!isExistsSerie && SER_ID !== isExistsSerie.SER_ID) {
      throw new ConflictException("Série já cadastrada.");
    }

    return this.seriesRepository.save(
      { ...updateSerieDto, SER_ID },
      { data: user },
    );
  }

  /**
   * Verificação se já existe o mesmo série, com mesmo estado e cidade
   * @param SER_NOME nome da série
   * @param SER_UF estado da série
   * @param SER_CIDADE cidade da série
   * @returns retorna o resultado da consulta como VERDADEIRO ou FALSO
   */
  async countyExists(SER_NOME: string): Promise<boolean> {
    const county = await this.seriesRepository.findOne({ SER_NOME });
    if (county) {
      return true;
    } else {
      return false;
    }
  }
}
