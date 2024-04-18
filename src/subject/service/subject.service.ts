import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Subject } from "../model/entities/subject.entity";
import { ISubject } from "../model/interface/subject.interface";
import { CreateSubjectDto } from "../model/dto/create-subject.dto";
import { UpdateSubjectDto } from "../model/dto/update-subject.dto";
import {
  paginate,
  Pagination,
  IPaginationOptions,
} from "nestjs-typeorm-paginate";
import { User } from "src/user/model/entities/user.entity";

@Injectable()
export class SubjectService {
  constructor(
    @InjectRepository(Subject)
    private countyRepository: Repository<Subject>,
  ) {}

  /**
   * Listagem de disciplinas com paginação, ordenação e pesquisa por nome.
   *
   * @param options adicionar o limite e qual página estamos
   * @param search permitir pesquisa por um termo pelo nome do disciplina
   * @param order cria a ordenação para a listagem
   * @returns Retorna a lista paginada, ordenada e filtrada com os disciplinas
   */
  async paginate(
    options: IPaginationOptions,
    search: string,
    column: string,
    orderBY: string,
    status: string,
  ): Promise<Pagination<Subject>> {
    const queryBuilder = this.countyRepository.createQueryBuilder();
    if (search) {
      queryBuilder.where("DIS_NOME LIKE :q", { q: `%${search}%` });
    }
    if (status) {
      queryBuilder.where("DIS_ATIVO = :q", {
        q: `${status === "true" ? 1 : 0}`,
      });
    }
    queryBuilder.orderBy(
      column || "DIS_NOME",
      orderBY.toUpperCase() === "ASC" ? "ASC" : "DESC",
    );
    return paginate<Subject>(queryBuilder, options);
  }

  /**
   * Criar disciplina
   *
   * @param createSubjectDto objeto referente a criação de disciplina
   * @returns informa que o disciplina foi criado
   */
  add(createSubjectDto: CreateSubjectDto, user: User) {
    return this.countyExists(createSubjectDto.DIS_NOME).then(
      (exists: boolean) => {
        if (!exists) {
          return this.countyRepository
            .save(createSubjectDto, { data: user })
            .then((saved: ISubject) => {
              return saved;
            });
        } else {
          throw new HttpException(
            "disciplina já cadastrado.",
            HttpStatus.CONFLICT,
          );
        }
      },
    );
  }

  /**
   * Retorna todos os disciplinas
   *
   * @returns retorna uma lista de disciplinas
   */
  findAll(): Promise<ISubject[]> {
    return this.countyRepository.find({
      where: { DIS_ATIVO: true },
      order: { DIS_NOME: "ASC" },
    });
  }

  /**
   * Buscar um disciplina com base no id
   * @param id informação referente a identificação do disciplina
   * @returns retorna o disciplina pesquisado
   */
  findOne(DIS_ID: number) {
    return this.countyRepository.findOne({ DIS_ID });
  }

  /**
   *
   * @param id informação referente a identificação do disciplina
   * @param updateSubjectDto objeto referente a criação de disciplina
   * @returns informa que o disciplina foi atualizado
   */
  update(
    DIS_ID: number,
    updateSubjectDto: UpdateSubjectDto,
    user: User,
  ): Promise<Subject> {
    return this.countyRepository.save(
      { ...updateSubjectDto, DIS_ID },
      { data: user },
    );
  }

  /**
   * Verificação se já existe o mesmo disciplina, com mesmo estado e cidade
   * @param DIS_NOME nome do disciplina
   * @param DIS_UF estado do disciplina
   * @param DIS_CIDADE cidade do disciplina
   * @returns retorna o resultado da consulta como VERDADEIRO ou FALSO
   */
  async countyExists(DIS_NOME: string): Promise<boolean> {
    const county = await this.countyRepository.findOne({ DIS_NOME });
    if (county) {
      return true;
    } else {
      return false;
    }
  }
}
