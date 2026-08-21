import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { InternalServerError } from 'src/utils/errors'
import { paginateData } from 'src/utils/paginate-data'
import { Repository } from 'typeorm'

import { FindNotificationsDto } from '../dto/find-notifications.dto'
import { ResponsibleNotification } from '../entities/responsible-notification.entity'
import { ResponsibleNotificationType } from '../enums/responsible-notification.enum'

@Injectable()
export class ResponsibleNotificationsService {
  constructor(
    @InjectRepository(ResponsibleNotification)
    private readonly notificationRepository: Repository<ResponsibleNotification>,
  ) {}

  async findAll(responsibleId: number, params: FindNotificationsDto) {
    const { page, limit, type, subtype, order, read, month, year } = params

    const queryBuilder = this.notificationRepository
      .createQueryBuilder('Notifications')
      .addSelect(['student.ALU_NOME'])
      .innerJoin('Notifications.student', 'student')
      .where('Notifications.responsibleId = :responsibleId', { responsibleId })
      .orderBy('Notifications.createdAt', order)

    if (type) {
      queryBuilder.andWhere('Notifications.type = :type', { type })
    }

    if (subtype) {
      queryBuilder.andWhere('Notifications.subtype = :subtype', { subtype })
    }

    if (read === true) {
      queryBuilder.andWhere('Notifications.readAt IS NOT NULL')
    } else if (read === false) {
      queryBuilder.andWhere('Notifications.readAt IS NULL')
    }

    if (year) {
      queryBuilder.andWhere('YEAR(Notifications.createdAt) = :year', { year })
    }

    if (month) {
      queryBuilder.andWhere('MONTH(Notifications.createdAt) = :month', {
        month,
      })
    }

    const data = await paginateData(page, limit, queryBuilder)

    return {
      ...data,
      items: data.items.map((notification) => ({
        ...notification,
        studentName: notification.student?.ALU_NOME || null,
        isRead: notification.readAt !== null,
        isTruncated: notification.content?.length > 200,
        student: undefined,
      })),
    }
  }

  async getUnreadCount(responsibleId: number) {
    const counts = await this.notificationRepository
      .createQueryBuilder('Notifications')
      .select('Notifications.type', 'type')
      .addSelect('COUNT(*)', 'count')
      .where('Notifications.responsibleId = :responsibleId', { responsibleId })
      .andWhere('Notifications.readAt IS NULL')
      .groupBy('Notifications.type')
      .getRawMany<{ type: string; count: string }>()

    const result = {
      total: 0,
      comunicacao: 0,
      desempenho: 0,
    }

    for (const row of counts) {
      const count = Number(row.count)
      result.total += count

      if (row.type === ResponsibleNotificationType.COMUNICACAO) {
        result.comunicacao = count
      } else if (row.type === ResponsibleNotificationType.DESEMPENHO) {
        result.desempenho = count
      }
    }

    return result
  }

  async markAsRead(notificationId: number, responsibleId: number) {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId, responsibleId },
    })

    if (!notification) {
      throw new NotFoundException('Notificação não encontrada.')
    }

    try {
      notification.readAt = new Date()
      await this.notificationRepository.save(notification)
    } catch (e) {
      throw new InternalServerError()
    }
  }
}
