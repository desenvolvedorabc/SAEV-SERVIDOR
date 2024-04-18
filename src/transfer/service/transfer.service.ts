import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import {
  IPaginationOptions,
  paginateRaw,
  Pagination,
} from "nestjs-typeorm-paginate";
import { Assessment } from "src/assessment/model/entities/assessment.entity";
import { NotificationsService } from "src/notifications/service/notification.service";
import { Student } from "src/student/model/entities/student.entity";
import { User } from "src/user/model/entities/user.entity";
import { Repository } from "typeorm";
import { ApprovedTransferDto } from "../model/dto/approved-transfer.dto copy";
import { CreateTransferDto } from "../model/dto/create-transfer.dto";
import { Transfer } from "../model/entities/transfer.entity";
import { SchoolClassService } from "src/school-class/service/school-class.service";
import { TransferStatus } from "../enums/transfer-status.enum";
import { ForbiddenException } from "@nestjs/common/exceptions";

@Injectable()
export class TransferService {
  constructor(
    @InjectRepository(Transfer)
    private transferRepository: Repository<Transfer>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Student)
    private studentRepository: Repository<Student>,

    @InjectRepository(Assessment)
    private assessmentsRepository: Repository<Assessment>,

    private notificationService: NotificationsService,

    private schoolClassService: SchoolClassService,
  ) {}

  async findOne(TRF_ID: number) {
    const transferExist = await this.transferRepository.findOne({
      where: {
        TRF_ID,
      },
      relations: [
        "TRF_ESC_ORIGEM",
        "TRF_USU_STATUS",
        "TRF_ALU",
        "TRF_ESC_DESTINO",
        "TRF_TUR_DESTINO",
        "TRF_TUR_DESTINO.TUR_SER"
      ],
    });

    return transferExist;
  }

  async update(
    TRF_ID: number,
    approvedTransferDto: ApprovedTransferDto,
    user: User,
  ): Promise<Transfer> {
    let transferExist = await this.transferRepository.findOne({
      where: {
        TRF_ID,
      },
      relations: [
        "TRF_ESC_ORIGEM",
        "TRF_USU_STATUS",
        "TRF_ALU",
        "TRF_ESC_DESTINO",
        "TRF_TUR_DESTINO",
        "TRF_TUR_DESTINO.TUR_SER"
      ],
    });

    if(transferExist.TRF_STATUS != "ABERTO") {
      throw new ForbiddenException('Transferência finalizada.')
    }

    transferExist = {
      ...transferExist,
      TRF_STATUS: approvedTransferDto.TRF_STATUS,
      TRF_JUSTIFICATIVA: approvedTransferDto.TRF_JUSTIFICATIVA,
    };
    const transfer = await this.transferRepository.save(
      {
        ...transferExist,
        TRF_ID,
      },
      { data: user },
    );

    if (approvedTransferDto.TRF_STATUS === "TAPROVADO") {
      if (transfer?.TRF_TUR_DESTINO) {
        await this.studentRepository.save({
          ...transfer.TRF_ALU,
          ALU_ESC: transfer.TRF_ESC_DESTINO,
          ALU_TUR: transfer.TRF_TUR_DESTINO,
          ALU_SER: transfer.TRF_TUR_DESTINO?.TUR_SER,
          ALU_ATIVO: true,
          ALU_STATUS: "Enturmado",
        });

        await this.schoolClassService.createSchoolClassStudent(
          transfer.TRF_ALU,
          transfer.TRF_TUR_DESTINO,
        );
      } else {
        await this.studentRepository.save({
          ...transfer.TRF_ALU,
          ALU_ESC: transfer.TRF_ESC_DESTINO,
          ALU_TUR: null,
          ALU_SER: null,
          ALU_STATUS: "Não Enturmado",
        });
      }
    }

    if (transfer.TRF_USU_STATUS) {
      await this.notificationService.create(
        "Transferência",
        `A sua solicitação de transferência do aluno ${
          transfer.TRF_ALU.ALU_NOME
        } foi ${
          approvedTransferDto.TRF_STATUS === "TAPROVADO"
            ? "aceita."
            : "recusada."
        }`,
        transfer.TRF_USU_STATUS,
      );
    }

    return transfer;
  }

  async delete(TRF_ID: number): Promise<boolean> {
    try {
      await this.transferRepository.delete({ TRF_ID });
      return true;
    } catch {
      return false;
    }
  }

  async add(
    createTransferDto: CreateTransferDto,
    user: User,
  ): Promise<Transfer> {
    const formattedInitialDate = new Date();
    formattedInitialDate.setUTCHours(23, 59, 59, 999);

    const formattedFinalDate = new Date();
    formattedFinalDate.setUTCHours(0, 0, 0, 0);
    let day = formattedFinalDate.getDate();
    day = day - 1;
    formattedFinalDate.setDate(day);

    const queryBuilderAssesment = this.assessmentsRepository
      .createQueryBuilder("AVALIACAO")
      .leftJoin("AVALIACAO.AVA_TES", "AVA_TES")
      .leftJoinAndSelect("AVALIACAO.AVA_AVM", "AVA_AVM")
      .leftJoin("AVA_AVM.AVM_MUN", "AVM_MUN")
      .leftJoin("AVM_MUN.schools", "schools")
      .leftJoin("AVA_TES.STUDENTS_TEST", "STUDENTS_TEST")
      .leftJoin("STUDENTS_TEST.ALT_ALU", "ALT_ALU")
      .where("ALT_ALU.ALU_ID = :id", {
        id: createTransferDto.TRF_ALU,
      })
      .andWhere("schools.ESC_ID = :school", {
        school: createTransferDto.TRF_ESC_ORIGEM,
      })
      .andWhere("DATE_SUB(AVA_AVM.AVM_DT_INICIO, INTERVAL 3 HOUR) <= :dateInitial", {
        dateInitial: formattedInitialDate,
      })
      .andWhere("DATE_SUB(AVA_AVM.AVM_DT_FIM, INTERVAL 3 HOUR) > :dateFinal", { dateFinal: formattedFinalDate })
      .orderBy("AVALIACAO.AVA_DT_CRIACAO", "DESC");

      if (!!createTransferDto?.TRF_TUR_ORIGEM) {
        const dataAssesment = await queryBuilderAssesment.getOne();

        if (!!dataAssesment) {
          throw new BadRequestException(
            "Esse aluno não pode ser transferido, pois está em período de avaliação.",
          );
        }
      }

    createTransferDto = {
      ...createTransferDto,
      TRF_STATUS: TransferStatus.ABERTO,
    };

    const transfer = await this.transferRepository.save(
      {
        ...createTransferDto,
        TRF_USU: user,
        TRF_USU_STATUS: user,
      },
      { data: user },
    );

    if (transfer.TRF_ESC_DESTINO) {
      const users = await this.userRepository.find({
        where: {
          USU_ESC: transfer.TRF_ESC_DESTINO,
        },
      });

      for (const user of users) {
        this.notificationService.create(
          "Transferência",
          `Você recebeu uma solicitação de transferência de aluno para sua escola.`,
          user,
        );
      }
    }

    return transfer;
  }

  async paginate(
    options: IPaginationOptions,
    userId: string,
    status: string,
    countyId: number,
    schoolId: number,
    order: string,
    student: string,
    user: User,
  ): Promise<Pagination<Transfer>> {   
    const queryBuilder = this.transferRepository
      .createQueryBuilder("TRANSFERENCIA")
      .select([
        "ESC_ORIGEM.ESC_NOME AS ESC_NOME_ORIGEM ,ESC_DESTINO.ESC_NOME AS ESC_NOME_DESTINO, ESC_ORIGEM.ESC_ID AS ESC_ID_ORIGEM ,ESC_DESTINO.ESC_ID AS ESC_ID_DESTINO, ALUNO.ALU_ID AS ALU_ID, ALUNO.ALU_NOME AS ALU_NOME, ALUNO.ALU_INEP AS ALU_INEP, ALUNO.ALU_AVATAR AS ALU_AVATAR, TUR_ORIGEM.TUR_NOME as TUR_NOME_ORIGEM, TUR_DESTINO.TUR_NOME AS TUR_NOME_DESTINO, TUR_ORIGEM.TUR_PERIODO as TUR_PERIODO_ORIGEM, TUR_DESTINO.TUR_PERIODO AS TUR_PERIODO_DESTINO,  ALUNO.ALU_DT_NASC AS ALU_DT_NASC, SERIES_ORIGEM.SER_NOME AS SER_NOME_ORIGEM, SERIES_DESTINO.SER_NOME AS SER_NOME_DESTINO, MUNICIPIO_ORIGEM.MUN_NOME AS MUN_NOME_ORIGEM, MUNICIPIO_DESTINO.MUN_NOME AS MUN_NOME_DESTINO, MUNICIPIO_ORIGEM.MUN_ID AS MUN_ID_ORIGEM, MUNICIPIO_DESTINO.MUN_ID AS MUN_ID_DESTINO, TRANSFERENCIA.TRF_DT_CRIACAO AS TRF_DT_CRIACAO, TRANSFERENCIA.TRF_DT_ATUALIZACAO AS TRF_DT_ATUALIZACAO, TRANSFERENCIA.TRF_STATUS AS TRF_STATUS, TRANSFERENCIA.TRF_JUSTIFICATIVA AS TRF_JUSTIFICATIVA, TRANSFERENCIA.TRF_ID as TRF_ID",
      ])
      .leftJoin("TRANSFERENCIA.TRF_ESC_ORIGEM", "ESC_ORIGEM")
      .leftJoin("TRANSFERENCIA.TRF_ESC_DESTINO", "ESC_DESTINO")
      .leftJoin("TRANSFERENCIA.TRF_ALU", "ALUNO")
      .leftJoin("TRANSFERENCIA.TRF_TUR_ORIGEM", "TUR_ORIGEM")
      .leftJoin("TRANSFERENCIA.TRF_TUR_DESTINO", "TUR_DESTINO")
      .leftJoin(
        "series",
        "SERIES_ORIGEM",
        "SERIES_ORIGEM.SER_ID = TUR_ORIGEM.TUR_SER_ID",
      )
      .leftJoin(
        "series",
        "SERIES_DESTINO",
        "SERIES_DESTINO.SER_ID = TUR_DESTINO.TUR_SER_ID",
      )
      .leftJoin(
        "municipio",
        "MUNICIPIO_ORIGEM",
        "MUNICIPIO_ORIGEM.MUN_ID = ESC_ORIGEM.ESC_MUN_ID",
      )
      .leftJoin(
        "municipio",
        "MUNICIPIO_DESTINO",
        "MUNICIPIO_DESTINO.MUN_ID = ESC_DESTINO.ESC_MUN_ID",
      );

    switch (status) {
      case "em-aberto":
        queryBuilder.andWhere(`(TRANSFERENCIA.TRF_STATUS = 'ABERTO')`);
        break;
      case "finalizadas":
        queryBuilder.andWhere(`(TRANSFERENCIA.TRF_STATUS != 'ABERTO')`);
        break;
    }

    if (schoolId) {
      queryBuilder.andWhere(
        `(TRANSFERENCIA.TRF_ESC_ORIGEM = '${schoolId}' OR TRANSFERENCIA.TRF_ESC_DESTINO = '${schoolId}')`,
      );
    }

    if (countyId) {
      queryBuilder.andWhere(
        `(MUNICIPIO_ORIGEM.MUN_ID = '${countyId}' OR MUNICIPIO_DESTINO.MUN_ID = '${countyId}')`,
      );
    }
    
    if (user.USU_SPE.SPE_PER.PER_NOME === "Município") {
      queryBuilder.andWhere(
        `(MUNICIPIO_ORIGEM.MUN_ID = '${user?.USU_MUN?.MUN_ID}' OR MUNICIPIO_DESTINO.MUN_ID = '${user?.USU_MUN?.MUN_ID}')`,
      );
    }

    if (user.USU_SPE.SPE_PER.PER_NOME === "Escola") {
      queryBuilder.andWhere(
        `(MUNICIPIO_ORIGEM.MUN_ID = '${user?.USU_MUN?.MUN_ID}' OR MUNICIPIO_DESTINO.MUN_ID = '${user?.USU_MUN?.MUN_ID}')`,
      ).andWhere(
        `(TRANSFERENCIA.TRF_ESC_ORIGEM = '${user?.USU_ESC?.ESC_ID}' OR TRANSFERENCIA.TRF_ESC_DESTINO = '${user?.USU_ESC?.ESC_ID}')`,
      );
    }

    if (student) {
      queryBuilder.andWhere(`(TRANSFERENCIA.TRF_ALU = '${student}')`);
    }

    switch (order) {
      case "pendetesPrimeiro":
        queryBuilder.orderBy("TRANSFERENCIA.TRF_STATUS", "ASC");
        break;
      case "maisNovos":
        queryBuilder.orderBy("TRANSFERENCIA.TRF_DT_CRIACAO", "DESC");
        break;
      case "maisAntigos":
        queryBuilder.orderBy("TRANSFERENCIA.TRF_DT_CRIACAO", "ASC");
        break;
      default:
        queryBuilder.orderBy("TRANSFERENCIA.TRF_STATUS", "ASC");
        break;
    }

    return paginateRaw<Transfer>(queryBuilder, {
      ...options,
      countQueries: false
    });
  }
}
