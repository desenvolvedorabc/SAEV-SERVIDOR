import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import getLastPage from "src/helpers/calculate-last-page";
import { PaginationParams } from "src/helpers/params";
import { User } from "src/user/model/entities/user.entity";
import { Repository } from "typeorm";
import { Notification } from "../model/entities/notification.entity";

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
      throw new InternalServerErrorException("Falha ao criar uma notificação");
    }
  }

  async paginate(paginationParams: PaginationParams, user: User) {
    const { limit, page } = paginationParams;

    const queryBuilder = this.notificationRepository
      .createQueryBuilder("NOTIFICATION")
      .leftJoinAndSelect("NOTIFICATION.user", "user")
      .where("user.USU_ID = :id", { id: user.USU_ID })
      .orderBy("NOTIFICATION.createdAt", "DESC");

    const data = await queryBuilder.getMany();

    const total = data.length;
    const skippedItems = (+page - 1) * +limit;
    const totalPages = getLastPage(total, +limit);

    return {
      items: data.filter(
        (message, index) =>
          index >= skippedItems && index < skippedItems + +limit,
      ),
      meta: {
        totalItems: total,
        itemCount: data.filter(
          (message, index) =>
            index >= skippedItems && index < skippedItems + +limit,
        ).length,
        totalPages,
      },
    };
  }
}
