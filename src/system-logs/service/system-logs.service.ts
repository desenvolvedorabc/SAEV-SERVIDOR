import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { paginate, Pagination } from "nestjs-typeorm-paginate";
import { PaginationParamsLogs } from "src/helpers/params";
import { User } from "src/user/model/entities/user.entity";
import { Repository } from "typeorm";
import { CreateSystemLogsDto } from "../model/dtos/create-system-logs.dto";
import { SystemLogs } from "../model/entities/system-log.entity";
import { InternalServerError } from "src/utils/errors";

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
    } catch (e) {
      throw new InternalServerError();
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
      school,
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
      .createQueryBuilder("SystemLogs")
      .leftJoin("SystemLogs.user", "user");

    if (search) {
      queryBuilder.andWhere("user.USU_NOME LIKE :search", {
        search: `%${search}%`,
      });
    }

    if (method) {
      queryBuilder.andWhere("SystemLogs.method = :method", { method });
    }

    if (entity) {
      queryBuilder.andWhere("SystemLogs.nameEntity = :entity", { entity });
    }

    if (initialDate) {
      const formattedInitialDate = new Date(initialDate);

      queryBuilder.andWhere("SystemLogs.createdAt > :initialDate", {
        initialDate: formattedInitialDate,
      });
    }

    if (finalDate) {
      const formattedFinalDate = new Date(finalDate);

      formattedFinalDate.setUTCHours(23, 59, 59, 999);

      queryBuilder.andWhere("SystemLogs.createdAt <= :finalDate", {
        finalDate: formattedFinalDate,
      });
    }

    if (county) {
      queryBuilder.andWhere("user.USU_MUN = :county", { county });
    }

    if (school) {
      queryBuilder.andWhere("user.USU_ESC = :school", { school });
    }

    switch (column) {
      case "createdAt":
        queryBuilder.orderBy("SystemLogs.createdAt", order);
        break;
      case "method":
        queryBuilder.orderBy("SystemLogs.method", order);
        break;
      case "nameEntity":
        queryBuilder.orderBy("SystemLogs.nameEntity", order);
        break;
      default:
        queryBuilder.orderBy("SystemLogs.createdAt", "DESC");
        break;
    }

    if (user.USU_SPE.SPE_PER.PER_NOME !== "SAEV") {
      queryBuilder.andWhere("user.USU_MUN = :county", {
        county: user?.USU_MUN?.MUN_ID,
      });
    }

    if (user.USU_SPE.SPE_PER.PER_NOME === "Escola") {
      queryBuilder.andWhere("user.USU_ESC = :school", {
        school: user?.USU_ESC?.ESC_ID,
      });
    }

    const data = await paginate(queryBuilder, {
      page: +page,
      limit: +limit,
      countQueries: false,
    });

    const formattedData = await Promise.all(
      data.items.map(async (item) => {
        return await this.getOneForPaginateData(item.id);
      }),
    );

    return { ...data, items: formattedData };
  }

  async getOneForPaginateData(id: string) {
    const systemLog = await this.systemLogsRepository
      .createQueryBuilder("SystemLogs")
      .select([
        "SystemLogs",
        "user.USU_ID",
        "user.USU_NOME",
        "USU_MUN.MUN_NOME",
        "USU_SPE.SPE_ID",
        "SPE_PER.PER_NOME",
      ])
      .leftJoin("SystemLogs.user", "user")
      .leftJoin("user.USU_MUN", "USU_MUN")
      .leftJoin("user.USU_SPE", "USU_SPE")
      .leftJoin("USU_SPE.SPE_PER", "SPE_PER")
      .where("SystemLogs.id = :id", { id })
      .getOne();

    return {
      ...systemLog,
    };
  }
}
