import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { PaginationParams } from 'src/helpers/params'
import { User } from 'src/modules/user/model/entities/user.entity'
import { paginateData } from 'src/utils/paginate-data'
import { Repository } from 'typeorm'

import { Notification } from '../model/entities/notification.entity'

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
  ) {}

  async findOne(id: number, user: User): Promise<Notification> {
    const notification = await this.notificationRepository.findOne({
      where: {
        id,
        user: {
          USU_ID: user.USU_ID,
        },
      },
      relations: ['user'],
    })

    if (!notification) {
      throw new NotFoundException('Notificação não encontrada')
    }

    if (!notification.isReading) {
      notification.isReading = true

      await this.notificationRepository.save(notification)
    }

    return notification
  }

  async create(title: string, message: string, user: User) {
    const notification = this.notificationRepository.create({
      title,
      message,
      user,
    })

    return this.notificationRepository.save(notification)
  }

  async createMany(notifications: any[]) {
    const notificationsToSave = notifications.map((notification) => {
      return this.notificationRepository.create({
        title: notification.title,
        message: notification.message,
        user: notification.user,
      })
    })

    await this.notificationRepository.save(notificationsToSave, {
      chunk: 100,
    })
  }

  async paginate(paginationParams: PaginationParams, user: User) {
    const { limit, page } = paginationParams

    const queryBuilder = this.notificationRepository
      .createQueryBuilder('Notification')
      .where('Notification.user = :userId', { userId: user.USU_ID })
      .orderBy('Notification.createdAt', 'DESC')

    const data = await paginateData(page, limit, queryBuilder)

    return data
  }
}
