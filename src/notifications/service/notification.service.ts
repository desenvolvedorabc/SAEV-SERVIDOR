import {
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { PaginationParams } from "src/helpers/params";
import { User } from "src/user/model/entities/user.entity";
import { Repository } from "typeorm";
import { Notification } from "../model/entities/notification.entity";
import { InternalServerError } from "src/utils/errors";
import { paginateData } from "src/utils/paginate-data";

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
      relations: ["user"],
    });

    if (!notification) {
      throw new NotFoundException("Notificação não encontrada");
    }

    if (!notification.isReading) {
      notification.isReading = true;

      await this.notificationRepository.save(notification);
    }

    return notification;
  }

  async create(title: string, message: string, user: User) {
    const notification = this.notificationRepository.create({
      title,
      message,
      user,
    });

    try {
      return await this.notificationRepository.save(notification);
    } catch (err) {
      throw new InternalServerError()
    }
  }

  async paginate(paginationParams: PaginationParams, user: User) {
    const { limit, page } = paginationParams;

    const queryBuilder = this.notificationRepository
      .createQueryBuilder("Notification")
      .where("Notification.user = :userId", { userId: user.USU_ID })
      .orderBy("Notification.createdAt", "DESC");

    const data = await paginateData(page, limit, queryBuilder)

    return data
  }
}
