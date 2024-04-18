import { Injectable, NotFoundException } from "@nestjs/common";
import { CreateExternalReportDto } from "./dto/create-external-report.dto";
import { UpdateExternalReportDto } from "./dto/update-external-report.dto";
import { Repository } from "typeorm";
import { ExternalReport } from "./entities/external-report.entity";
import { InjectRepository } from "@nestjs/typeorm";
import { PaginationParams } from "src/helpers/params";
import { User } from "src/user/model/entities/user.entity";
import { paginateData } from "src/utils/paginate-data";
import { InternalServerError } from "src/utils/errors";

@Injectable()
export class ExternalReportsService {
  constructor(
    @InjectRepository(ExternalReport)
    private readonly externalReportRepository: Repository<ExternalReport>,
  ) {}
  async create(createExternalReportDto: CreateExternalReportDto, user: User) {
    const { category, description, link, name, role } = createExternalReportDto;

    const externalRepository = this.externalReportRepository.create({
      category,
      description,
      link,
      name,
      role,
    });

    try {
      await this.externalReportRepository.save(externalRepository, {
        data: user,
      });
    } catch (e) {
      throw new InternalServerError();
    }
  }

  async findAll({ page, limit, search, status }: PaginationParams, user: User) {
    const profile = user?.USU_SPE?.SPE_PER;
    const queryBuilder = this.externalReportRepository
      .createQueryBuilder("ExternalReport")
      .select([
        "ExternalReport.id",
        "ExternalReport.name",
        "ExternalReport.category",
        "ExternalReport.description",
        "ExternalReport.link",
        "ExternalReport.active",
      ])
      .orderBy("ExternalReport.updatedAt", "DESC");

    if (search) {
      queryBuilder.andWhere("ExternalReport.name LIKE :q", {
        q: `%${search}%`,
      });
    }

    if (status) {
      queryBuilder.andWhere("ExternalReport.active = :status", {
        status,
      });
    }

    if (profile?.PER_NOME !== "SAEV") {
      queryBuilder
        .andWhere("ExternalReport.role = :role", {
          role: profile.PER_NOME,
        })
        .andWhere("ExternalReport.active = TRUE");
    }

    return await paginateData<ExternalReport>(+page, +limit, queryBuilder);
  }

  async findOne(id: number) {
    const externalReport = await this.externalReportRepository.findOne({
      where: {
        id,
      },
    });

    if (!externalReport) {
      throw new NotFoundException("Relatório externo não encontrado.");
    }

    return {
      externalReport,
    };
  }

  async toggleActive(
    id: number,
    user: User,
  ): Promise<{
    active: boolean;
  }> {
    const { externalReport } = await this.findOne(id);

    const newActive = !externalReport.active;

    try {
      await this.externalReportRepository.save(
        {
          ...externalReport,
          active: newActive,
        },
        {
          data: user,
        },
      );

      return {
        active: newActive,
      };
    } catch (e) {
      throw new InternalServerError();
    }
  }

  async update(
    id: number,
    updateExternalReportDto: UpdateExternalReportDto,
    user: User,
  ): Promise<void> {
    const { externalReport } = await this.findOne(id);

    const updateExternalReport = Object.assign(
      externalReport,
      updateExternalReportDto,
    );

    try {
      await this.externalReportRepository.save(updateExternalReport, {
        data: user,
      });
    } catch (e) {
      throw new InternalServerError();
    }
  }
}
