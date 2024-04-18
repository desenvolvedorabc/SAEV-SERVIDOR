import { Injectable } from "@nestjs/common";
import { InjectConnection } from "@nestjs/typeorm";
import { MethodEnum } from "src/system-logs/model/enum/method.enum";
import { SystemLogsService } from "src/system-logs/service/system-logs.service";
import {
  EventSubscriber,
  InsertEvent,
  RemoveEvent,
  UpdateEvent,
  EntitySubscriberInterface,
  Connection,
} from "typeorm";

@Injectable()
@EventSubscriber()
export class EverythingSubscriber implements EntitySubscriberInterface {
  constructor(
    @InjectConnection() readonly connection: Connection,

    private readonly systemLogsService: SystemLogsService,
  ) {
    connection.subscribers.push(this);
  }

  async afterInsert(event: InsertEvent<any>) {
    const dataUser = event?.queryRunner?.data as any;

    if(event?.entity) {
      if (
        !!dataUser?.USU_ID &&
        event.metadata.tableName !== "system_logs" &&
        event.metadata.tableName !== "notifications" &&
        event.metadata.tableName !== "report_edition" &&
        event.metadata.tableName !== "report_subject" &&
        event.metadata.tableName !== "report_descriptor"
      ) {
        const formattedJson = JSON.stringify(event?.entity);
  
        try {
          await this.systemLogsService.create({
            method: MethodEnum.POST,
            nameEntity: event.metadata.tableName.toLowerCase(),
            stateInitial: null,
            stateFinal: formattedJson,
            user: dataUser,
          });
        } catch (err) {
          console.log(`BEFORE ENTITY INSERT error`, err);
        }
      }
    } 
  }

  async afterUpdate(event: UpdateEvent<any>) {
    const dataUser = event?.queryRunner?.data as any;

    if (
      !!dataUser?.USU_ID &&
      event.metadata.tableName !== "system_logs" &&
      event.metadata.tableName !== "notifications" &&
      event.metadata.tableName !== "report_edition" &&
      event.metadata.tableName !== "report_subject" &&
      event.metadata.tableName !== "report_descriptor"
    ) {
      const formattedInitialJson = JSON.stringify(
        event?.databaseEntity,
      );
      const formattedFinalJson = JSON.stringify(event?.entity);

      const dataUser = event?.queryRunner?.data as any;

      try {
        await this.systemLogsService.create({
          method: MethodEnum.PUT,
          nameEntity: event.metadata.tableName.toLowerCase(),
          stateInitial: formattedInitialJson,
          stateFinal: formattedFinalJson,
          user: dataUser,
        });
      } catch (err) {
        console.log(`BEFORE ENTITY UPDATE error`, err);
      }
    }
  }

  async beforeRemove(event: RemoveEvent<any>) {
    const dataUser = event?.queryRunner?.data as any;

    if (
      !!dataUser?.USU_ID &&
      event.metadata.tableName !== "system_logs" &&
      event.metadata.tableName !== "notifications" &&
      event.metadata.tableName !== "report_edition" &&
      event.metadata.tableName !== "report_subject" &&
      event.metadata.tableName !== "report_descriptor"
    ) {
      const formattedInitialJson = JSON.stringify(event?.entity);
      const formattedFinalJson = JSON.stringify(event?.databaseEntity);

      try {
        await this.systemLogsService.create({
          method: MethodEnum.DELETE,
          nameEntity: event.metadata.tableName.toLowerCase(),
          stateInitial: formattedInitialJson,
          stateFinal: formattedFinalJson,
          user: dataUser,
        });
      } catch (err) {
        console.log(`BEFORE ENTITY REMOVE error`, err);
      }
    }
  }
}
