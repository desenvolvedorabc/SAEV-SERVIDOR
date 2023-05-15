import { Injectable, InternalServerErrorException, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import {
  paginate,
  Pagination,
  PaginationTypeEnum,
} from "nestjs-typeorm-paginate";
import { PaginationParams, PaginationParamsLogs } from "src/helpers/params";
import { User } from "src/user/model/entities/user.entity";
import { Repository } from "typeorm";
import { CreateSystemLogsDto } from "../model/dtos/create-system-logs.dto";
import { SystemLogs } from "../model/entities/system-log.entity";

@Injectable()
export class SystemLogsService {
  constructor(
    @InjectRepository(SystemLogs)
    private systemLogsRepository: Repository<SystemLogs>,
  ) {}

  async create(createSystemLogsDto: CreateSystemLogsDto) {
    const { method, nameEntity, stateFinal, stateInitial, user } =
      createSystemLogsDto;

    const systemLogs = this.systemLogsRepository.create({
      method,
      nameEntity,
      stateInitial,
      stateFinal,
      user,
    });

     try {
      this.systemLogsRepository.save(systemLogs);
     } catch(e) {
      throw new InternalServerErrorException('Houve um erro interno.')
     }
  }

  async findOne(id: string): Promise<SystemLogs> {
    const systemLogs = await this.systemLogsRepository.findOne({
      where: {
        id,
      },
      relations: [
        "user",
        "user.USU_MUN",
        "user.USU_SPE",
        "user.USU_SPE.SPE_PER",
      ],
    });

    if (!systemLogs) {
      throw new NotFoundException("Logs não encontrado");
    }

    return systemLogs;
  }

  async paginate(
    {
      page,
      limit,
      county,
      method,
      order,
      column,
      search,
      entity,
      initialDate,
      finalDate,
    }: PaginationParamsLogs,
    user: User,
  ): Promise<Pagination<SystemLogs>> {
    const queryBuilder = this.systemLogsRepository
      .createQueryBuilder("logs")
      .leftJoinAndSelect("logs.user", "user")
      .leftJoinAndSelect("user.USU_MUN", "USU_MUN")
      .leftJoinAndSelect("user.USU_SPE", "USU_SPE")
      .leftJoinAndSelect("USU_SPE.SPE_PER", "SPE_PER");

    if (search) {
      queryBuilder.andWhere("user.USU_NOME LIKE :search", {
        search: `%${search}%`,
      });
    }

    if (method) {
      queryBuilder.andWhere("logs.method = :method", { method });
    }

    if (entity) {
      queryBuilder.andWhere("logs.nameEntity = :entity", { entity });
    }

    if (initialDate) {
      const formattedInitialDate = new Date(initialDate);

      queryBuilder.andWhere("logs.createdAt > :initialDate", {
        initialDate: formattedInitialDate,
      });
    }

    if (finalDate) {
      const formattedFinalDate = new Date(finalDate);

      formattedFinalDate.setUTCHours(23, 59, 59, 999);

      queryBuilder.andWhere("logs.createdAt <= :finalDate", {
        finalDate: formattedFinalDate,
      });
    }

    if (county) {
      queryBuilder.andWhere("USU_MUN.MUN_ID = :county", { county });
    }

    switch (column) {
      case "createdAt":
        queryBuilder.orderBy("logs.createdAt", order);
        break;
      case "method":
        queryBuilder.orderBy("logs.method", order);
        break;
      case "nameEntity":
        queryBuilder.orderBy("logs.nameEntity", order);
        break;
      case "stateInitial":
        queryBuilder.orderBy("logs.stateInitial", order);
        break;
      case "stateFinal":
        queryBuilder.orderBy("logs.stateFinal", order);
        break;
      default:
        queryBuilder.orderBy("logs.createdAt", "DESC");
        break;
    }

    if (user.USU_SPE.SPE_PER.PER_NOME !== "SAEV") {
      queryBuilder.andWhere("USU_MUN.MUN_ID = :id", {
        id: user?.USU_MUN?.MUN_ID,
      });
    }


    const data = await paginate(queryBuilder, {
      page: +page,
      limit: +limit,
      paginationType: PaginationTypeEnum.TAKE_AND_SKIP,
      countQueries: false
    });

    return data;
  }
}
