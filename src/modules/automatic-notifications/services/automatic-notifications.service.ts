import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { TypeSchoolEnum } from 'src/modules/school/model/enum/type-school.enum'
import { SendTutorMessageStatus } from 'src/modules/tutor-messages/entities/send-tutor-message.entity'
import { User } from 'src/modules/user/model/entities/user.entity'
import { formatParamsByProfile } from 'src/utils/format-params-by-profile'
import { paginateData } from 'src/utils/paginate-data'
import { Repository } from 'typeorm'

import { PaginationAutomaticNotificationsParamsDto } from '../dto/pagination-automatic-notifications-params.dto'
import { AutomaticNotificationSend } from '../entities/automatic-notification-send.entity'

@Injectable()
export class AutomaticNotificationsService {
  constructor(
    @InjectRepository(AutomaticNotificationSend)
    private readonly automaticNotificationSendRepository: Repository<AutomaticNotificationSend>,
  ) {}

  async findAll(dto: PaginationAutomaticNotificationsParamsDto, user: User) {
    const { ruleType } = dto
    const {
      page,
      limit,
      search,
      stateId,
      county,
      school,
      typeSchool,
      verifyProfileForState,
      date,
    } = formatParamsByProfile(dto, user)

    const queryBuilder = this.automaticNotificationSendRepository
      .createQueryBuilder('AutomaticNotificationSend')
      .select([
        'AutomaticNotificationSend.id',
        'AutomaticNotificationSend.createdAt',
        'AutomaticNotificationSend.statusWhatsapp',
        'AutomaticNotificationSend.statusEmail',
        'AutomaticNotificationSend.ruleType',
        'Rule.title',
        'Student.ALU_NOME',
        'Student.ALU_WHATSAPP',
        'Student.ALU_EMAIL',
      ])
      .innerJoin('AutomaticNotificationSend.rule', 'Rule')
      .innerJoin('AutomaticNotificationSend.student', 'Student')
      .innerJoin('Rule.school', 'School')
      .where(
        '(AutomaticNotificationSend.statusEmail = :status or AutomaticNotificationSend.statusWhatsapp = :status)',
        {
          status: SendTutorMessageStatus.FALHOU,
        },
      )

    if (typeSchool) {
      queryBuilder.andWhere('School.ESC_TIPO = :typeSchool', {
        typeSchool,
      })
    }

    if (school) {
      queryBuilder.andWhere('School.ESC_ID = :schoolId', {
        schoolId: school,
      })
    }

    if (county) {
      queryBuilder.andWhere('School.ESC_MUN_ID = :countyId', {
        countyId: county,
      })
    }

    if (stateId) {
      queryBuilder.innerJoin(
        'School.ESC_MUN',
        'county',
        'county.stateId = :stateId',
        {
          stateId,
        },
      )
    }

    if (verifyProfileForState) {
      queryBuilder.andWhere('School.ESC_TIPO = :typeSchool', {
        typeSchool: TypeSchoolEnum.ESTADUAL,
      })
    }

    if (search) {
      queryBuilder.andWhere('Rule.title LIKE :q', {
        q: `%${search}%`,
      })
    }

    if (date) {
      queryBuilder.andWhere(
        'DATE(AutomaticNotificationSend.createdAt) = :date',
        {
          date,
        },
      )
    }

    if (ruleType) {
      queryBuilder.andWhere('AutomaticNotificationSend.ruleType = :ruleType', {
        ruleType,
      })
    }

    return await paginateData(page, limit, queryBuilder)
  }
}
