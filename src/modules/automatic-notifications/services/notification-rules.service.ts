import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { PaginationParams } from 'src/helpers/params'
import { User } from 'src/modules/user/model/entities/user.entity'
import { InternalServerError } from 'src/utils/errors'
import { formatParamsByProfile } from 'src/utils/format-params-by-profile'
import { paginateData } from 'src/utils/paginate-data'
import { Repository } from 'typeorm'

import { CreateNotificationRuleDto } from '../dto/create-notification-rule.dto'
import { UpdateNotificationRuleDto } from '../dto/update-notification-rule.dto'
import {
  NotificationRule,
  NotificationRuleType,
} from '../entities/notification-rule.entity'
import { NotificationRuleMapper } from '../interfaces'

@Injectable()
export class NotificationRulesService {
  constructor(
    @InjectRepository(NotificationRule)
    private readonly notificationRuleRepository: Repository<NotificationRule>,
  ) {}

  async create(
    dto: CreateNotificationRuleDto,
    schoolId: number,
  ): Promise<NotificationRule> {
    const existing = await this.notificationRuleRepository.findOne({
      where: {
        schoolId,
        ruleType: dto.ruleType,
      },
    })

    if (existing) {
      throw new ConflictException(`Essa regra ja existe para sua escola.`)
    }

    const rule = this.notificationRuleRepository.create({ ...dto, schoolId })

    try {
      return await this.notificationRuleRepository.save(rule)
    } catch (e) {
      throw new InternalServerError()
    }
  }

  async findAll(params: PaginationParams, user: User) {
    const { page, limit, school } = formatParamsByProfile(params, user)

    const queryBuilder = this.notificationRuleRepository
      .createQueryBuilder('Rule')
      .orderBy('Rule.createdAt', 'DESC')
      .where('Rule.schoolId = :schoolId', { schoolId: school })

    return await paginateData(page, limit, queryBuilder)
  }

  async findOne(
    id: number,
    schoolId: number,
  ): Promise<{ rule: NotificationRule }> {
    const rule = await this.notificationRuleRepository.findOne({
      where: { id, schoolId },
    })

    if (!rule) {
      throw new NotFoundException(
        `Regra de notificação com ID ${id} não encontrada`,
      )
    }

    return { rule }
  }

  async findActiveRulesByTypeRule(
    ruleType: NotificationRuleType,
  ): Promise<NotificationRuleMapper[]> {
    const queryBuilder = this.notificationRuleRepository
      .createQueryBuilder('Rules')
      .select([
        'Rules.id as id',
        'Rules.ruleType as ruleType',
        'Rules.title as title',
        'Rules.content as content',
        'Rules.parameters as parameters',
        'Rules.schoolId as schoolId',
        'Rules.updatedAt as date',
        'School.ESC_MUN_ID as countyId',
        'School.ESC_TIPO as typeSchool',
        'County.MUN_MENSAGEM_WHATSAPP_ATIVO as whatsappActive',
        'County.MUN_MENSAGEM_EMAIL_ATIVO as emailActive',
      ])
      .innerJoin('Rules.school', 'School', 'School.ESC_ATIVO IS TRUE')
      .innerJoin('School.ESC_MUN', 'County')
      .orderBy('Rules.createdAt', 'DESC')
      .where('Rules.ruleType = :ruleType', { ruleType })
      .andWhere('Rules.active IS TRUE')

    return await queryBuilder.getRawMany()
  }

  async update(
    id: number,
    schoolId: number,
    updateDto: UpdateNotificationRuleDto,
  ): Promise<NotificationRule> {
    const { rule } = await this.findOne(id, schoolId)

    Object.assign(rule, updateDto)

    try {
      return await this.notificationRuleRepository.save(rule)
    } catch (e) {
      throw new InternalServerError()
    }
  }

  async remove(id: number, schoolId: number): Promise<void> {
    const { rule } = await this.findOne(id, schoolId)

    try {
      await this.notificationRuleRepository.remove(rule)
    } catch (e) {
      throw new InternalServerError()
    }
  }

  async toggleActive(id: number, schoolId: number): Promise<void> {
    const { rule } = await this.findOne(id, schoolId)
    rule.active = !rule.active

    try {
      await this.notificationRuleRepository.save(rule)
    } catch (e) {
      throw new InternalServerError()
    }
  }
}
