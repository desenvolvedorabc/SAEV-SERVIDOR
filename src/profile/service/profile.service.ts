import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import {
  IPaginationOptions,
  Pagination,
} from "nestjs-typeorm-paginate";
import { User } from "src/user/model/entities/user.entity";
import { Repository } from "typeorm";
import { CreateSubProfileDto } from "../model/dto/CreateSubProfileDto";
import { UpdateSubProfileDto } from "../model/dto/UpdateSubProfileDto";
import { ProfileBase } from "../model/entities/profile-base.entity";
import { SubProfile } from "../model/entities/sub-profile.entity";
import { IProfileBase } from "../model/interface/profile-base.interface";
import { ISubProfile } from "../model/interface/sub-profile.interface";
import { paginateData } from "src/utils/paginate-data";

@Injectable()
export class ProfileService {
  constructor(
    @InjectRepository(SubProfile)
    private subProfileRepository: Repository<SubProfile>,
    @InjectRepository(ProfileBase)
    private profileBaseRepository: Repository<ProfileBase>,
  ) {}

  findSubAll(): Promise<ISubProfile[]> {
    return this.subProfileRepository.find({
      order: { SPE_NOME: "ASC" },
      relations: ["SPE_PER", "AREAS"],
    });
  }

  findSubOne(SPE_ID: number): Promise<ISubProfile> {
    return this.subProfileRepository.findOne(
      { SPE_ID },
      { relations: ["SPE_PER", "AREAS"] },
    );
  }

  findSubByBase(id: number): Promise<ISubProfile[]> {
    return this.subProfileRepository.find({
      order: { SPE_NOME: "ASC" },
      relations: ["SPE_PER", "AREAS"],
      where: { SPE_PER: { PER_ID: id }, SPE_ATIVO: true },
    });
  }

  async findBaseAll(user: User): Promise<IProfileBase[]> {
    let profiles = await this.profileBaseRepository.find({
      order: { PER_NOME: "ASC" },
    });

    if (user.USU_SPE.SPE_PER.PER_NOME === "Município") {
      profiles = profiles.filter((data) => data.PER_NOME !== "SAEV");
    } else if (user.USU_SPE.SPE_PER.PER_NOME === "Escola") {
      profiles = profiles.filter((data) => data.PER_NOME === "Escola");
    }
    return profiles;
  }

  findBaseOne(SPE_ID: number): Promise<IProfileBase> {
    return this.profileBaseRepository.findOne({ PER_ID: SPE_ID });
  }

  /**
   * Listagem de sub-perfil com paginação, ordenação e pesquisa por nome
   * @param options adicionar o limite e qual página estamos
   * @param search permitir pesquisa por um termo pelo nome do escola
   * @param order cria a ordenação para a listagem
   * @returns
   */
  async paginate(
    options: IPaginationOptions,
    search: string,
    column: string,
    orderBy: string,
    active?: '0' | '1'
  ): Promise<Pagination<SubProfile>> {
    const { limit, page } = options;

    const queryBuilder = this.subProfileRepository
      .createQueryBuilder("SUB_PERFIL")
      .select(["SUB_PERFIL.SPE_ID", "SUB_PERFIL.SPE_NOME", "SPE_PER.PER_NOME"])
      .leftJoin("SUB_PERFIL.SPE_PER", "SPE_PER")
      .leftJoinAndSelect("SUB_PERFIL.AREAS", "AREAS");
    if (search) {
      search = search.replace("°", "º");
      queryBuilder.where("SUB_PERFIL.SPE_NOME LIKE :q", { q: `%${search}%` });
    }
    const order: any = orderBy;

    if(active) {
      queryBuilder.andWhere('SUB_PERFIL.SPE_ATIVO = :active', {active})
    }

    switch (column) {
      case "SPE_NOME":
        queryBuilder.orderBy("SUB_PERFIL.SPE_NOME", order);
        break;
      case "PER_NOME":
        queryBuilder.orderBy("SPE_PER.PER_NOME", order);
        break;
      case "AREAS":
        queryBuilder.orderBy("AREAS.ARE_DESCRICAO", order);
        break;

      default:
        break;
    }

    const data = await paginateData(+page, +limit, queryBuilder)

    return data;
  }

  /**
   *
   * @param id informação referente a identificação do sub-perfil
   * @param filename nome do arquivo salvo
   * @returns informa que o sub-perfil foi atualizada
   */
  async updateSub(
    SPE_ID: number,
    updateSubProfileDto: UpdateSubProfileDto,
    user: User,
  ) {
    let subProfile = await this.subProfileRepository.findOne({
      SPE_ID: SPE_ID,
    });
    if (subProfile) {
      return this.subProfileRepository.save(
        {
          ...updateSubProfileDto,
          SPE_ID,
        },
        { data: user },
      );
    } else {
      throw new HttpException(
        "Não é possível atualizar perfil.",
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  async exists(SPE_NOME: string): Promise<boolean> {
    const subProfile = await this.subProfileRepository.findOne({ SPE_NOME });
    if (subProfile) {
      return true;
    } else {
      return false;
    }
  }

  add(
    createSubProfileDto: CreateSubProfileDto,
    user: User,
  ): Promise<ISubProfile> {
    return this.exists(createSubProfileDto.SPE_NOME).then((exists: boolean) => {
      if (!exists) {
        return this.subProfileRepository
          .save(createSubProfileDto, { data: user })
          .then((savedUser: ISubProfile) => {
            return savedUser;
          });
      } else {
        throw new HttpException(
          "Já existe um sub-perfil com esse nome.",
          HttpStatus.CONFLICT,
        );
      }
    });
  }
}
