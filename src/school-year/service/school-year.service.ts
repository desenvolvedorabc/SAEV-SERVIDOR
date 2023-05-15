import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { SchoolYear } from "../model/entities/school-year.entity";
import { ISchoolYear } from "../model/interface/school-year.interface";
import { CreateSchoolYearDto } from "../model/dto/create-school-year.dto";
import { UpdateSchoolYearDto } from "../model/dto/update-school-year.dto";
import {
  paginate,
  Pagination,
  IPaginationOptions,
} from "nestjs-typeorm-paginate";
import { User } from "src/user/model/entities/user.entity";

@Injectable()
export class SchoolYearService {
  constructor(
    @InjectRepository(SchoolYear)
    private yearSchoolRepository: Repository<SchoolYear>,
  ) {}

  /**
   * Listagem de anos letivos com paginação, ordenação e pesquisa por nome.
   *
   * @param options adicionar o limite e qual página estamos
   * @param search permitir pesquisa por um termo pelo nome do ano letivo
   * @param order cria a ordenação para a listagem
   * @returns Retorna a lista paginada, ordenada e filtrada com os anos letivos
   */
  async paginate(
    options: IPaginationOptions,
    search: string,
    column: string,
    orderBY: string,
    status: string,
  ): Promise<Pagination<SchoolYear>> {
    const queryBuilder = this.yearSchoolRepository.createQueryBuilder();
    if (search) {
      queryBuilder.where("ANO_NOME LIKE :q", { q: `%${search}%` });
    }
    if (status) {
      queryBuilder.where("ANO_ATIVO = :q", {
        q: `${status === "true" ? 1 : 0}`,
      });
    }
    queryBuilder.orderBy(
      column || "ANO_NOME",
      orderBY.toUpperCase() === "ASC" ? "ASC" : "DESC",
    );
    return paginate<SchoolYear>(queryBuilder, options);
  }

  /**
   * Criar ano letivo
   *
   * @param createSchoolYearDto objeto referente a criação de ano letivo
   * @returns informa que o ano letivo foi criado
   */
  add(createSchoolYearDto: CreateSchoolYearDto, user: User) {
    return this.yearSchoolExists(createSchoolYearDto.ANO_NOME).then(
      (exists: boolean) => {
        if (!exists) {
          return this.yearSchoolRepository
            .save(createSchoolYearDto, { data: user })
            .then((saved: ISchoolYear) => {
              return saved;
            });
        } else {
          throw new HttpException(
            "Ano letivo já cadastrado.",
            HttpStatus.CONFLICT,
          );
        }
      },
    );
  }

  /**
   * Retorna todos os anos letivos
   *
   * @returns retorna uma lista de anos letivos
   */
  findAll(): Promise<ISchoolYear[]> {
    return this.yearSchoolRepository.find({
      where: { ANO_ATIVO: true },
      order: { ANO_NOME: "ASC" },
    });
  }

  /**
   * Buscar um ano letivo com base no id
   * @param id informação referente a identificação do ano letivo
   * @returns retorna o ano letivo pesquisado
   */
  findOne(ANO_ID: number) {
    return this.yearSchoolRepository.findOne({ ANO_ID });
  }

  /**
   *
   * @param id informação referente a identificação do ano letivo
   * @param updateSchoolYearDto objeto referente a criação de ano letivo
   * @returns informa que o ano letivo foi atualizado
   */
  update(
    ANO_ID: number,
    updateSchoolYearDto: UpdateSchoolYearDto,
    user: User,
  ): Promise<ISchoolYear> {
    return this.yearSchoolRepository.save(
      { ...updateSchoolYearDto, ANO_ID },
      { data: user },
    );
  }

  /**
   * Verificação se já existe o mesmo ano letivo, com mesmo estado e cidade
   * @param ANO_NOME nome do ano letivo
   * @param ANO_UF estado do ano letivo
   * @param ANO_CIDADE cidade do ano letivo
   * @returns retorna o resultado da consulta como VERDADEIRO ou FALSO
   */
  async yearSchoolExists(ANO_NOME: string): Promise<boolean> {
    const yearSchool = await this.yearSchoolRepository.findOne({ ANO_NOME });
    if (yearSchool) {
      return true;
    } else {
      return false;
    }
  }
}
