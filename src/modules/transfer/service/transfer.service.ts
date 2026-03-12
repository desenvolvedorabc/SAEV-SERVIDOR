import { BadRequestException, Injectable } from '@nestjs/common'
import { ForbiddenException } from '@nestjs/common/exceptions'
import { InjectRepository } from '@nestjs/typeorm'
import { paginateRaw, Pagination } from 'nestjs-typeorm-paginate'
import { PaginationParams } from 'src/helpers/params'
import { Assessment } from 'src/modules/assessment/model/entities/assessment.entity'
import { NotificationsService } from 'src/modules/notifications/service/notification.service'
import { School } from 'src/modules/school/model/entities/school.entity'
import { TypeSchoolEnum } from 'src/modules/school/model/enum/type-school.enum'
import { SchoolClassService } from 'src/modules/school-class/service/school-class.service'
import { Student } from 'src/modules/student/model/entities/student.entity'
import { User } from 'src/modules/user/model/entities/user.entity'
import { RoleProfile } from 'src/shared/enums/role.enum'
import { InternalServerError } from 'src/utils/errors'
import { formatParamsByProfile } from 'src/utils/format-params-by-profile'
import { Repository } from 'typeorm'

import { TransferStatus } from '../enums/transfer-status.enum'
import { ApprovedTransferDto } from '../model/dto/approved-transfer.dto copy'
import { CreateTransferDto } from '../model/dto/create-transfer.dto'
import { Transfer } from '../model/entities/transfer.entity'

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

    @InjectRepository(School)
    private schoolRepository: Repository<School>,

    private notificationService: NotificationsService,

    private schoolClassService: SchoolClassService,
  ) {}

  async findOne(TRF_ID: number) {
    const transferExist = await this.transferRepository.findOne({
      where: {
        TRF_ID,
      },
      relations: [
        'TRF_ESC_ORIGEM',
        'TRF_USU_STATUS',
        'TRF_ALU',
        'TRF_ESC_DESTINO',
        'TRF_TUR_DESTINO',
        'TRF_TUR_DESTINO.TUR_SER',
      ],
    })

    return transferExist
  }

  async update(
    TRF_ID: number,
    approvedTransferDto: ApprovedTransferDto,
    user: User,
  ): Promise<Transfer> {
    if (!user.USU_ESC && user.USU_SPE?.role === RoleProfile.ESCOLA) {
      const userWithSchool = await this.userRepository.findOne({
        where: { USU_ID: user.USU_ID },
        relations: ['USU_ESC', 'USU_ESC.ESC_MUN'],
      })
      if (userWithSchool) {
        user.USU_ESC = userWithSchool.USU_ESC
      }
    }

    let transferExist = await this.transferRepository.findOne({
      where: {
        TRF_ID,
      },
      relations: [
        'TRF_ESC_ORIGEM',
        'TRF_ESC_ORIGEM.ESC_MUN',
        'TRF_USU_STATUS',
        'TRF_ALU',
        'TRF_ESC_DESTINO',
        'TRF_TUR_DESTINO',
        'TRF_TUR_DESTINO.TUR_SER',
      ],
    })

    if (transferExist.TRF_STATUS !== 'ABERTO') {
      throw new ForbiddenException('Transferência finalizada.')
    }

    transferExist = {
      ...transferExist,
      TRF_STATUS: approvedTransferDto.TRF_STATUS,
      TRF_JUSTIFICATIVA: approvedTransferDto.TRF_JUSTIFICATIVA,
    }
    const transfer = await this.transferRepository.save(
      {
        ...transferExist,
        TRF_ID,
      },
      { data: user },
    )

    if (approvedTransferDto.TRF_STATUS === 'TAPROVADO') {
      if (transfer?.TRF_TUR_DESTINO) {
        await this.studentRepository.save({
          ...transfer.TRF_ALU,
          ALU_ESC: transfer.TRF_ESC_DESTINO,
          ALU_TUR: transfer.TRF_TUR_DESTINO,
          ALU_SER: transfer.TRF_TUR_DESTINO?.TUR_SER,
          ALU_ATIVO: true,
          ALU_STATUS: 'Enturmado',
        })

        await this.schoolClassService.createSchoolClassStudent(
          transfer.TRF_ALU,
          transfer.TRF_TUR_DESTINO,
        )
      } else {
        await this.studentRepository.save({
          ...transfer.TRF_ALU,
          ALU_ESC: transfer.TRF_ESC_DESTINO,
          ALU_TUR: null,
          ALU_SER: null,
          ALU_STATUS: 'Não Enturmado',
        })
      }
    }

    if (transfer.TRF_USU_STATUS) {
      await this.notificationService.create(
        'Transferência',
        `A sua solicitação de transferência do aluno ${
          transfer.TRF_ALU.ALU_NOME
        } foi ${
          approvedTransferDto.TRF_STATUS === 'TAPROVADO'
            ? 'aceita.'
            : 'recusada.'
        }`,
        transfer.TRF_USU_STATUS,
      )
    }

    return transfer
  }

  async delete(TRF_ID: number): Promise<boolean> {
    try {
      await this.transferRepository.delete({ TRF_ID })
      return true
    } catch {
      return false
    }
  }

  async add(
    createTransferDto: CreateTransferDto,
    user: User,
  ): Promise<Transfer> {
    if (!user.USU_ESC) {
      const userWithSchool = await this.userRepository.findOne({
        where: { USU_ID: user.USU_ID },
        relations: ['USU_ESC'],
      })
      if (userWithSchool) {
        user.USU_ESC = userWithSchool.USU_ESC
      }
    }

    let destinationSchoolId = createTransferDto.TRF_ESC_DESTINO as any

    if (!destinationSchoolId && user.USU_ESC) {
      destinationSchoolId = user.USU_ESC.ESC_ID
    }

    if (!destinationSchoolId) {
      throw new ForbiddenException(
        'Usuário não possui escola vinculada para solicitar transferência.',
      )
    }

    const student = await this.studentRepository.findOne({
      where: {
        ALU_ID: createTransferDto.TRF_ALU,
      },
      relations: ['ALU_ESC'],
    })

    if (!student) {
      throw new BadRequestException('Aluno não encontrado.')
    }

    const schoolOriginId = createTransferDto.TRF_ESC_ORIGEM as any

    if (student.ALU_ESC?.ESC_ID !== schoolOriginId) {
      throw new ForbiddenException(
        'O aluno não pertence à escola de origem informada.',
      )
    }

    const schoolOrigin = await this.schoolRepository.findOne({
      where: {
        ESC_ID: schoolOriginId,
      },
      relations: ['ESC_MUN'],
    })

    if (!schoolOrigin) {
      throw new BadRequestException('Escola de origem não encontrada.')
    }

    let schoolClass = null

    if (createTransferDto?.TRF_TUR_DESTINO) {
      schoolClass = await this.schoolClassService.findOne(
        createTransferDto?.TRF_TUR_DESTINO as any,
      )
    }

    if (schoolClass && schoolClass?.TUR_ESC?.ESC_ID !== destinationSchoolId) {
      throw new ForbiddenException(
        'A turma de destino deve pertencer à sua escola.',
      )
    }

    const destinationSchool = await this.schoolRepository.findOne({
      where: {
        ESC_ID: destinationSchoolId,
      },
      relations: ['ESC_MUN'],
    })

    if (!destinationSchool) {
      throw new BadRequestException('Escola de destino não encontrada.')
    }

    const userRole = user?.USU_SPE?.role

    if (userRole === RoleProfile.ESCOLA) {
      if (user?.USU_ESC?.ESC_ID !== destinationSchool.ESC_ID) {
        throw new ForbiddenException(
          'Você só pode transferir alunos para a sua própria escola.',
        )
      }
    }

    const formattedInitialDate = new Date()
    formattedInitialDate.setUTCHours(23, 59, 59, 999)

    const formattedFinalDate = new Date()
    formattedFinalDate.setUTCHours(0, 0, 0, 0)
    let day = formattedFinalDate.getDate()
    day = day - 1
    formattedFinalDate.setDate(day)

    const queryBuilderAssessment = this.assessmentsRepository
      .createQueryBuilder('AVALIACAO')
      .leftJoin('AVALIACAO.AVA_TES', 'AVA_TES')
      .leftJoinAndSelect('AVALIACAO.AVA_AVM', 'AVA_AVM')
      .leftJoin('AVA_AVM.AVM_MUN', 'AVM_MUN')
      .leftJoin('AVM_MUN.schools', 'schools')
      .leftJoin('AVA_TES.STUDENTS_TEST', 'STUDENTS_TEST')
      .leftJoin('STUDENTS_TEST.ALT_ALU', 'ALT_ALU')
      .where('ALT_ALU.ALU_ID = :id', {
        id: createTransferDto.TRF_ALU,
      })
      .andWhere('schools.ESC_ID = :school', {
        school: createTransferDto.TRF_ESC_ORIGEM,
      })
      .andWhere(
        'DATE_SUB(AVA_AVM.AVM_DT_INICIO, INTERVAL 3 HOUR) <= :dateInitial',
        {
          dateInitial: formattedInitialDate,
        },
      )
      .andWhere('DATE_SUB(AVA_AVM.AVM_DT_FIM, INTERVAL 3 HOUR) > :dateFinal', {
        dateFinal: formattedFinalDate,
      })
      .andWhere('AVA_AVM.AVM_TIPO = :typeSchool', {
        typeSchool: student?.ALU_ESC?.ESC_TIPO,
      })
      .orderBy('AVALIACAO.AVA_DT_CRIACAO', 'DESC')

    const dataAssesment = await queryBuilderAssessment.getOne()

    if (dataAssesment) {
      throw new BadRequestException(
        'Esse aluno não pode ser transferido, pois está em período de avaliação.',
      )
    }

    createTransferDto = {
      ...createTransferDto,
      TRF_ESC_DESTINO: destinationSchoolId as any,
      TRF_STATUS: TransferStatus.ABERTO,
    }

    const transfer = await this.transferRepository.save(
      {
        ...createTransferDto,
        TRF_USU: user,
        TRF_USU_STATUS: user,
      },
      { data: user },
    )

    if (
      schoolOrigin.ESC_TIPO === destinationSchool.ESC_TIPO &&
      schoolOrigin.ESC_MUN_ID === destinationSchool.ESC_MUN_ID
    ) {
      await this.update(
        transfer.TRF_ID,
        {
          TRF_STATUS: TransferStatus.TAPROVADO,
          TRF_USU_STATUS: user,
          TRF_JUSTIFICATIVA: null,
        },
        user,
      )

      return transfer
    }

    return transfer
  }

  async paginate(
    paginationParams: PaginationParams,
    user: User,
  ): Promise<Pagination<Transfer>> {
    const params = formatParamsByProfile(paginationParams, user, true)

    const {
      stateId,
      status,
      school,
      county,
      student,
      typeSchool,
      page,
      limit,
      column,
      verifyProfileForState,
    } = params

    const queryBuilder = this.transferRepository
      .createQueryBuilder('TRANSFERENCIA')
      .select([
        'TRANSFERENCIA.TRF_ID as TRF_ID',
        'TRANSFERENCIA.TRF_STATUS as TRF_STATUS',
        'TRANSFERENCIA.TRF_DT_CRIACAO as TRF_DT_CRIACAO',
        'TRANSFERENCIA.TRF_DT_ATUALIZACAO as TRF_DT_ATUALIZACAO',
        'TRANSFERENCIA.TRF_JUSTIFICATIVA as TRF_JUSTIFICATIVA',
        'ESC_ORIGEM.ESC_NOME AS ESC_NOME_ORIGEM',
        'ESC_DESTINO.ESC_NOME AS ESC_NOME_DESTINO',
        'ESC_ORIGEM.ESC_TIPO AS ESC_TIPO_ORIGEM',
        'ESC_DESTINO.ESC_TIPO AS ESC_TIPO_DESTINO',
        'ESC_ORIGEM.ESC_ID AS ESC_ID_ORIGEM',
        'ESC_DESTINO.ESC_ID AS ESC_ID_DESTINO',
        'ALUNO.ALU_ID AS ALU_ID',
        'ALUNO.ALU_NOME AS ALU_NOME',
        'ALUNO.ALU_INEP AS ALU_INEP',
        'ALUNO.ALU_AVATAR AS ALU_AVATAR',
        'ALUNO.ALU_DT_NASC AS ALU_DT_NASC',
      ])
      .leftJoin('TRANSFERENCIA.TRF_ESC_ORIGEM', 'ESC_ORIGEM')
      .leftJoin('TRANSFERENCIA.TRF_ESC_DESTINO', 'ESC_DESTINO')
      .leftJoin('TRANSFERENCIA.TRF_ALU', 'ALUNO')

    switch (status) {
      case 'em-aberto':
        queryBuilder.andWhere('TRANSFERENCIA.TRF_STATUS = :statusAberto', {
          statusAberto: 'ABERTO',
        })
        break
      case 'finalizadas':
        queryBuilder.andWhere('TRANSFERENCIA.TRF_STATUS != :statusAberto', {
          statusAberto: 'ABERTO',
        })
        break
    }

    if (school) {
      queryBuilder.andWhere(
        '(TRANSFERENCIA.TRF_ESC_ORIGEM = :school OR TRANSFERENCIA.TRF_ESC_DESTINO = :school)',
        { school },
      )
    }

    if (student) {
      queryBuilder.andWhere('TRANSFERENCIA.TRF_ALU = :student', { student })
    }

    if (typeSchool) {
      queryBuilder.andWhere(
        '(ESC_ORIGEM.ESC_TIPO = :typeSchool OR ESC_DESTINO.ESC_TIPO = :typeSchool)',
        { typeSchool },
      )
    }

    queryBuilder
      .addSelect([
        'MUNICIPIO_ORIGEM.stateId AS ESTADO_ORIGEM_ID',
        'MUNICIPIO_DESTINO.stateId AS ESTADO_DESTINO_ID',
        'MUNICIPIO_ORIGEM.MUN_NOME AS MUN_NOME_ORIGEM',
        'MUNICIPIO_ORIGEM.MUN_COMPARTILHAR_DADOS AS MUN_ORIGEM_COMPARTILHA_DADOS',
        'MUNICIPIO_DESTINO.MUN_NOME AS MUN_NOME_DESTINO',
        'MUNICIPIO_DESTINO.MUN_COMPARTILHAR_DADOS AS MUN_DESTINO_COMPARTILHA_DADOS',
        'MUNICIPIO_ORIGEM.MUN_ID AS MUN_ID_ORIGEM',
        'MUNICIPIO_DESTINO.MUN_ID AS MUN_ID_DESTINO',
      ])
      .leftJoin(
        'municipio',
        'MUNICIPIO_ORIGEM',
        'MUNICIPIO_ORIGEM.MUN_ID = ESC_ORIGEM.ESC_MUN_ID',
      )
      .leftJoin(
        'municipio',
        'MUNICIPIO_DESTINO',
        'MUNICIPIO_DESTINO.MUN_ID = ESC_DESTINO.ESC_MUN_ID',
      )

    if (county) {
      queryBuilder.andWhere(
        '(MUNICIPIO_ORIGEM.MUN_ID = :county OR MUNICIPIO_DESTINO.MUN_ID = :county)',
        { county },
      )
    }

    if (stateId) {
      queryBuilder.andWhere(
        '(MUNICIPIO_ORIGEM.stateId = :stateId OR MUNICIPIO_DESTINO.stateId = :stateId)',
        { stateId },
      )
    }

    if (user?.USU_SPE?.role === RoleProfile.ESTADO) {
      queryBuilder.andWhere('ESC_ORIGEM.ESC_TIPO = :estadual', {
        estadual: TypeSchoolEnum.ESTADUAL,
      })
    } else if (verifyProfileForState) {
      queryBuilder.andWhere(
        `((ESC_ORIGEM.ESC_TIPO = :estadual OR ESC_DESTINO.ESC_TIPO = :estadual) OR
        ((ESC_ORIGEM.ESC_TIPO = :municipal OR ESC_DESTINO.ESC_TIPO = :municipal) AND
        (MUNICIPIO_ORIGEM.MUN_COMPARTILHAR_DADOS = true OR MUNICIPIO_DESTINO.MUN_COMPARTILHAR_DADOS = true)))`,
        {
          estadual: TypeSchoolEnum.ESTADUAL,
          municipal: TypeSchoolEnum.MUNICIPAL,
        },
      )
    }

    if (
      [
        RoleProfile.MUNICIPIO_ESTADUAL,
        RoleProfile.MUNICIPIO_MUNICIPAL,
      ]?.includes(user?.USU_SPE?.role) &&
      user?.USU_MUN?.MUN_ID
    ) {
      queryBuilder.andWhere(
        `(
          (ESC_ORIGEM.ESC_TIPO = :userTypeSchool AND MUNICIPIO_ORIGEM.MUN_ID = :userCounty) OR
          (ESC_DESTINO.ESC_TIPO = :userTypeSchool AND MUNICIPIO_DESTINO.MUN_ID = :userCounty)
        )`,
        { userCounty: user.USU_MUN.MUN_ID, userTypeSchool: typeSchool },
      )
    }

    if ([RoleProfile.ESCOLA]?.includes(user?.USU_SPE?.role)) {
      queryBuilder.andWhere(
        '(ESC_ORIGEM.ESC_TIPO = :userTypeSchool OR ESC_DESTINO.ESC_TIPO = :userTypeSchool)',
        { userTypeSchool: typeSchool },
      )
    }

    switch (column) {
      case 'pendetesPrimeiro':
        queryBuilder.orderBy('TRANSFERENCIA.TRF_STATUS', 'ASC')
        break
      case 'maisNovos':
        queryBuilder.orderBy('TRANSFERENCIA.TRF_DT_CRIACAO', 'DESC')
        break
      case 'maisAntigos':
        queryBuilder.orderBy('TRANSFERENCIA.TRF_DT_CRIACAO', 'ASC')
        break
      default:
        queryBuilder.orderBy('TRANSFERENCIA.TRF_STATUS', 'ASC')
        break
    }

    return paginateRaw<Transfer>(queryBuilder, {
      page,
      limit,
      countQueries: false,
      metaTransformer: ({
        currentPage,
        itemCount,
        itemsPerPage,
        totalItems,
      }) => {
        const hasNext = itemCount === itemsPerPage
        const hasPrev = currentPage > 1

        return {
          currentPage,
          itemCount,
          itemsPerPage,
          totalItems,
          totalPages: currentPage + 1,
          nextPage: hasNext ? currentPage + 1 : null,
          previousPage: hasPrev ? currentPage - 1 : null,
        }
      },
    })
  }

  async countPendingTransfersForApproval(
    user: User,
  ): Promise<{ hasPending: boolean; count: number }> {
    const allowedRoles = [
      RoleProfile.ESCOLA,
      RoleProfile.MUNICIPIO_MUNICIPAL,
      RoleProfile.MUNICIPIO_ESTADUAL,
    ]

    const blockedRoles = [RoleProfile.SAEV, RoleProfile.ESTADO]

    if (
      !allowedRoles.includes(user?.USU_SPE?.role) ||
      blockedRoles.includes(user?.USU_SPE?.role)
    ) {
      return { hasPending: false, count: 0 }
    }

    const userRole = user?.USU_SPE?.role

    if (
      userRole === RoleProfile.MUNICIPIO_MUNICIPAL ||
      userRole === RoleProfile.MUNICIPIO_ESTADUAL
    ) {
      if (!user?.USU_MUN?.MUN_ID) {
        return { hasPending: false, count: 0 }
      }

      const typeSchool =
        userRole === RoleProfile.MUNICIPIO_MUNICIPAL
          ? TypeSchoolEnum.MUNICIPAL
          : TypeSchoolEnum.ESTADUAL

      const count = await this.transferRepository
        .createQueryBuilder('transfer')
        .innerJoin('transfer.TRF_ESC_ORIGEM', 'escola')
        .where('escola.ESC_MUN_ID = :munId', { munId: user.USU_MUN.MUN_ID })
        .andWhere('escola.ESC_TIPO = :typeSchool', { typeSchool })
        .andWhere('transfer.TRF_STATUS = :status', {
          status: TransferStatus.ABERTO,
        })
        .getCount()

      return {
        hasPending: count > 0,
        count,
      }
    }

    if (!user.USU_ESC) {
      const userWithSchool = await this.userRepository.findOne({
        where: { USU_ID: user.USU_ID },
        relations: ['USU_ESC'],
      })
      if (userWithSchool) {
        user.USU_ESC = userWithSchool.USU_ESC
      }
    }

    if (!user.USU_ESC) {
      return { hasPending: false, count: 0 }
    }

    const count = await this.transferRepository.count({
      where: {
        TRF_ESC_ORIGEM: user.USU_ESC,
        TRF_STATUS: TransferStatus.ABERTO,
      },
    })

    return {
      hasPending: count > 0,
      count,
    }
  }

  /**
   * Verifica se o usuário tem permissão para aprovar/reprovar uma transferência
   * Regra: Apenas a ORIGEM pode aprovar, exceto SAEV/Admin que pode tudo
   */
  private canUserApproveTransfer(user: User, transfer: Transfer): boolean {
    const userRole = user?.USU_SPE?.role

    if (userRole === RoleProfile.SAEV) {
      return true
    }

    if (userRole === RoleProfile.ESTADO) {
      return (
        transfer.TRF_ESC_ORIGEM?.ESC_MUN?.stateId === user?.stateId &&
        transfer.TRF_ESC_ORIGEM?.ESC_TIPO === TypeSchoolEnum.ESTADUAL
      )
    }

    if (userRole === RoleProfile.MUNICIPIO_ESTADUAL) {
      return (
        transfer.TRF_ESC_ORIGEM?.ESC_MUN_ID === user?.USU_MUN?.MUN_ID &&
        transfer.TRF_ESC_ORIGEM?.ESC_TIPO === TypeSchoolEnum.ESTADUAL
      )
    }

    if (userRole === RoleProfile.MUNICIPIO_MUNICIPAL) {
      return (
        transfer.TRF_ESC_ORIGEM?.ESC_MUN_ID === user?.USU_MUN?.MUN_ID &&
        transfer.TRF_ESC_ORIGEM?.ESC_TIPO === TypeSchoolEnum.MUNICIPAL
      )
    }

    if (userRole === RoleProfile.ESCOLA) {
      return transfer.TRF_ESC_ORIGEM?.ESC_ID === user?.USU_ESC?.ESC_ID
    }

    return false
  }

  async processNotifications(): Promise<{ processed: number }> {
    const transfers = await this.transferRepository
      .createQueryBuilder('t')
      .select(['t.TRF_ID', 'escola.ESC_ID'])
      .innerJoin('t.TRF_ESC_ORIGEM', 'escola')
      .where('t.TRF_NOTIFICADO = :notificado', { notificado: false })
      .andWhere('t.TRF_STATUS = :status', { status: TransferStatus.ABERTO })
      .take(100)
      .getMany()

    if (!transfers.length) {
      return { processed: 0 }
    }

    const ids = transfers.map((t) => t.TRF_ID)

    await this.transferRepository
      .createQueryBuilder()
      .update(Transfer)
      .set({ TRF_NOTIFICADO: true })
      .whereInIds(ids)
      .execute()

    const schoolIds = [
      ...new Set(
        transfers.map((t) => t.TRF_ESC_ORIGEM?.ESC_ID).filter(Boolean),
      ),
    ]

    try {
      const users = await this.userRepository
        .createQueryBuilder('u')
        .select(['u.USU_ID', 'escola.ESC_ID'])
        .innerJoin('u.USU_ESC', 'escola')
        .where('escola.ESC_ID IN (:...schoolIds)', { schoolIds })
        .getMany()

      const allNotifications = users.map((user) => ({
        title: 'Transferência',
        message:
          'Você recebeu uma nova solicitação de transferência na sua escola. Verifique ná página de transferências.',
        user,
      }))

      if (allNotifications.length) {
        await this.notificationService.createMany(allNotifications)
      }
    } catch (error) {
      await this.transferRepository
        .createQueryBuilder()
        .update(Transfer)
        .set({ TRF_NOTIFICADO: false })
        .whereInIds(ids)
        .execute()

      throw new InternalServerError()
    }

    return { processed: transfers.length }
  }
}
