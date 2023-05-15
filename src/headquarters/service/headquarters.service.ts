import { ForbiddenException, HttpException, HttpStatus, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Headquarter } from "../model/entities/headquarter.entity";
import { IHeadquarter } from "../model/interface/headquarter.interface";
import { CreateHeadquarterDto } from "../model/dto/create-headquarter.dto";
import { UpdateHeadquarterDto } from "../model/dto/update-headquarter.dto";
import {
  Pagination,
  IPaginationOptions,
  paginateRaw,
} from "nestjs-typeorm-paginate";
import { HeadquarterTopic } from "../model/entities/headquarter-topic.entity";
import { HeadquarterTopicItem } from "../model/entities/headquarter-topic-item.entity";
import { Serie } from "src/serie/model/entities/serie.entity";
import { Subject } from "src/subject/model/entities/subject.entity";
import { ISubject } from "src/subject/model/interface/subject.interface";
import { ISerie } from "src/serie/model/interface/serie.interface";
import { User } from "src/user/model/entities/user.entity";

@Injectable()
export class HeadquartersService {
  constructor(
    @InjectRepository(Headquarter)
    private headquarterRepository: Repository<Headquarter>,
    @InjectRepository(HeadquarterTopic)
    private headquarterTopicsRepository: Repository<HeadquarterTopic>,
    @InjectRepository(HeadquarterTopicItem)
    private headquarterTopicsItemsRepository: Repository<HeadquarterTopicItem>,
    @InjectRepository(Serie)
    private serieRepository: Repository<Serie>,
    @InjectRepository(Subject)
    private subjectRepository: Repository<Subject>,
  ) {}

  /**
   * Listagem de matriz de referência com paginação, ordenação e pesquisa por nome.
   *
   * @param options adicionar o limite e qual página estamos
   * @param search permitir pesquisa por um termo pelo nome do matriz de referência
   * @param order cria a ordenação para a listagem
   * @returns Retorna a lista paginada, ordenada e filtrada com os matriz de referência
   */
  async paginate(
    options: IPaginationOptions,
    search: string,
    column: string,
    orderBy: string,
    subject: string,
    serie: string,
    active?: '0' | '1'
  ): Promise<Pagination<Headquarter>> {
    const queryBuilder = this.headquarterRepository
      .createQueryBuilder("MATRIZ_REFERENCIA")
      .select([
        "MATRIZ_REFERENCIA.MAR_ID",
        "MATRIZ_REFERENCIA.MAR_NOME",
        "MATRIZ_REFERENCIA.MAR_ATIVO",
        "MAR_DIS.DIS_NOME",
        'GROUP_CONCAT( MAR_SER.SER_NOME SEPARATOR ",") as `MATRIZ_REFERENCIA_MAR_SERIES`',
      ])
      .groupBy("MATRIZ_REFERENCIA_MAR_SER.MAR_ID")
      .leftJoin("MATRIZ_REFERENCIA.MAR_DIS", "MAR_DIS")
      .leftJoin("MATRIZ_REFERENCIA.MAR_SER", "MAR_SER");

    const order: any = orderBy;

    switch (column) {
      case "MAR_DIS_DIS_NOME":
        queryBuilder.orderBy("MAR_DIS.DIS_NOME", order);
        break;
      case "MATRIZ_REFERENCIA_MAR_SERIES":
        queryBuilder.orderBy("MAR_SER.SER_NOME", order);
        break;
      default:
        queryBuilder.orderBy("MATRIZ_REFERENCIA.MAR_NOME", order);
        break;
    }

    let strQuery = "";
    if (search) {
      search = search.replace("°", "º");
      strQuery = ` ( MATRIZ_REFERENCIA.MAR_NOME LIKE '%${search}%' OR 
      MAR_DIS.DIS_NOME LIKE '%${search}%' OR 
      MAR_SER.SER_NOME LIKE '%${search}%' ) `;
    }

    if (subject) {
      strQuery = ` MAR_DIS.DIS_ID = '${subject}' `;
    }

    if (serie) {
      if (strQuery) {
        strQuery += " AND ";
      }
      strQuery += ` MAR_SER.SER_ID = '${serie}' `;
    }
    queryBuilder.where(strQuery);

    if(active) {
      queryBuilder.andWhere('MATRIZ_REFERENCIA.MAR_ATIVO = :active', {active});
    }

    return paginateRaw<Headquarter>(queryBuilder, options);
  }

  /**
   *
   * @param id informação referente a identificação do matriz de referência
   * @param updateHeadquarterDto objeto referente a criação de matriz de referência
   * @returns informa que o matriz de referência foi atualizado
   */
  async update(
    MAR_ID: number,
    updateHeadquarterDto: UpdateHeadquarterDto,
    user: User,
  ): Promise<IHeadquarter> {
    const topics = updateHeadquarterDto.MAR_MTO;

    return this.headquarterRepository
      .save({ ...updateHeadquarterDto, MAR_ID }, { data: user })
      .then((updateHeadquarter: Headquarter) => {
        updateHeadquarter = {
          ...updateHeadquarter,
          MAR_MTO: updateHeadquarterDto.MAR_MTO,
        }

        if (this.updateTopics(updateHeadquarter,topics, user)) {
          return updateHeadquarter;
        }
      });
  }

  async updateTopics(updateHeadquarter: Headquarter, topics: HeadquarterTopic[],  user: User) {
    return updateHeadquarter.MAR_MTO.map((topic: HeadquarterTopic) => {
      if (!topic.MTO_ID) {
        topic = {
          ...topic,
          MTO_MAR: updateHeadquarter,
        };
      }
      let items = topic.MTO_MTI;
      delete topic.MTO_MTI;
      this.headquarterTopicsRepository.save(topic, { data: user }).then(() => {
        topic = {
          ...topic,
          MTO_MTI: items,
        };
        return this.updateItems(topic, user);
      });
    });
  }

  updateItems(topic: HeadquarterTopic, user: User) {
    return topic.MTO_MTI.map((item: HeadquarterTopicItem) => {
      if (!item.MTI_ID) {
        item = {
          ...item,
          MTI_MTO: topic,
        };
      }
      this.headquarterTopicsItemsRepository.save(item, { data: user });
    });
  }

  /**
   * Criar matriz de referência
   *
   * @param createHeadquarterDto objeto referente a criação de matriz de referência
   * @returns informa que o matriz de referência foi criado
   */
  add(createHeadquarterDto: CreateHeadquarterDto, user: User) {
    return this.headquarterExists(createHeadquarterDto.MAR_NOME).then(
      (exists: boolean) => {
        if (!exists) {
          return this.headquarterRepository
            .save(createHeadquarterDto, { data: user })
            .then((createHeadquarter: Headquarter) => {
              if (this.saveTopics(createHeadquarter, user)) {
                return createHeadquarter;
              }
            });
        } else {
          throw new HttpException(
            "Matriz de referência já cadastrada.",
            HttpStatus.CONFLICT,
          );
        }
      },
    );
  }

  saveTopics(createHeadquarter: Headquarter, user: User) {
    return createHeadquarter.MAR_MTO.map((topic: HeadquarterTopic) => {
      topic = {
        ...topic,
        MTO_MAR: createHeadquarter,
      };
      this.headquarterTopicsRepository
        .save(topic, { data: user })
        .then((savedTopic: HeadquarterTopic) => {
          this.saveItems(savedTopic, user);
        });
    });
  }

  saveItems(topic: HeadquarterTopic, user: User) {
    return topic.MTO_MTI.map((item: HeadquarterTopicItem) => {
      item = {
        ...item,
        MTI_MTO: topic,
      };
      this.headquarterTopicsItemsRepository.save(item, { data: user });
    });
  }

  /**
   * Retorna todos os matriz de referência
   *
   * @returns retorna uma lista de matriz de referência
   */
  findAll(): Promise<IHeadquarter[]> {
    return this.headquarterRepository.find({
      order: { MAR_NOME: "ASC" },
      relations: ["MAR_DIS", "MAR_SER"],
    });
  }

  /**
   * Buscar um matriz de referência com base no id
   * @param id informação referente a identificação do matriz de referência
   * @returns retorna o matriz de referência pesquisado
   */
  async findOne(MAR_ID: number) {
    let main = await this.headquarterRepository.findOne(
      { MAR_ID },
      { relations: ["MAR_DIS", "MAR_SER"], order: { MAR_SER: "ASC" } },
    );
    let getTopics = await this.findTopics(main.MAR_ID);
    let topics = await Promise.all(
      getTopics.map(async (topic) => {
        let item = await this.findTopicsItems(topic.MTO_ID);
        topic["MTO_MTI"] = item;
        return topic;
      }),
    );

    main["MAR_MTO"] = topics;
    return main;
  }

  async findTopics(MAR_ID: number) {
    return this.headquarterTopicsRepository.find({
      where: { MTO_MAR: { MAR_ID: MAR_ID } },
      order: { MTO_NOME: "ASC" },
    });
  }

  async findTopicsItems(MTO_ID: number) {
    return this.headquarterTopicsItemsRepository.find({
      where: { MTI_MTO: { MTO_ID: MTO_ID } },
      order: { MTI_CODIGO: "ASC" },
    });
  }

  /**
   * Verificação se já existe o mesmo matriz de referência, com mesmo estado e cidade
   * @param MAR_NOME nome do matriz de referência
   * @returns retorna o resultado da consulta como VERDADEIRO ou FALSO
   */
  async headquarterExists(MAR_NOME: string): Promise<boolean> {
    const headquarter = await this.headquarterRepository.findOne({ MAR_NOME });
    if (headquarter) {
      return true;
    } else {
      return false;
    }
  }
  
  async toggleActiveDescriptor(id: number): Promise<{active: boolean}> {
    const descriptor = await this.headquarterTopicsItemsRepository.findOne({
      where: {
        MTI_ID: id
      },
      relations: ['testsTemplate']
    })

    if(!descriptor) {
      throw new NotFoundException()
    }

    const active = !descriptor.MTI_ATIVO

    if(!active && !!descriptor?.testsTemplate?.length) {
      throw new ForbiddenException('Você não pode inativar um descritor que está em uma prova.')
    }

    await this.headquarterTopicsItemsRepository.save({
      ...descriptor,
      MTI_ATIVO: active,
    })

    return {
      active,
    }
  }

  findSubjectsAll(): Promise<ISubject[]> {
    return this.subjectRepository.find({
      where: { DIS_ATIVO: true },
      order: { DIS_NOME: "ASC" },
    });
  }

  findSeriesAll(): Promise<ISerie[]> {
    return this.serieRepository.find({
      where: { SER_ATIVO: true },
      order: { SER_NOME: "ASC" },
    });
  }
}
