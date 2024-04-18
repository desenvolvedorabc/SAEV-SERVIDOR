import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ConfigModule } from "@nestjs/config";
import { UserModule } from "./user/user.module";
import { AuthModule } from "./auth/auth.module";
import { CountiesModule } from "./counties/counties.module";
import { SchoolModule } from "./school/school.module";
import { MulterModule } from "@nestjs/platform-express";
import { ProfileModule } from "./profile/profile.module";
import { AreaModule } from "./area/area.module";
import { TeacherModule } from "./teacher/teacher.module";
import { HeadquartersModule } from "./headquarters/headquarters.module";
import { TestsModule } from "./test/tests.module";
import { AssessmentsModule } from "./assessment/assessment.module";
import { SchoolClassModule } from "./school-class/school-class.module";
import { StudentModule } from "./student/student.module";
import { SchoolYearModule } from "./school-year/school-year.module";
import { SerieModule } from "./serie/serie.module";
import { SubjectModule } from "./subject/subject.module";
import { ReleaseResultsModule } from "./release-results/release-results.module";
import { SchoolAbsencesModule } from "./school-absences/school-absences.module";
import { ReportsModule } from "./reports/reports.module";
import { MessagesModule } from "./messages/message.module";
import { NotificationsModule } from "./notifications/notification.module";
import { FileModule } from "./files/file.module";
import { TransferModule } from "./transfer/transfer.module";
import { LoggerModule } from "nestjs-pino";
import { SystemLogsModule } from "./system-logs/system-logs.module";
import { EverythingSubscriber } from "./utils/event-subscriber";
import { JobsModule } from "./jobs/jobs.module";
import { ormConfig } from "./database/typeorm/ormconfig";
import { AssessmentOnlineModule } from './assessment-online/assessment-online.module';
import { MicrodataModule } from './microdata/microdata.module';
import { ExternalReportsModule } from './external-reports/external-reports.module';

@Module({
  imports: [
    MulterModule.register({
      dest: "./public",
      limits: { fileSize: 2 * 1048576 }, //2MB
    }),
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot(ormConfig),
    LoggerModule.forRoot({
      pinoHttp: {
        transport: {
          target: "pino-pretty",
          options: {
            singleLine: true,
          },
        },
      },
    }),
    AssessmentsModule,
    AuthModule,
    UserModule,
    CountiesModule,
    SchoolModule,
    ProfileModule,
    AreaModule,
    TeacherModule,
    HeadquartersModule,
    TestsModule,
    SchoolClassModule,
    StudentModule,
    SchoolYearModule,
    SerieModule,
    SubjectModule,
    ReleaseResultsModule,
    SchoolAbsencesModule,
    ReportsModule,
    MessagesModule,
    NotificationsModule,
    FileModule,
    TransferModule,
    SystemLogsModule,
    JobsModule,
    AssessmentOnlineModule,
    MicrodataModule,
    ExternalReportsModule,
  ],
  controllers: [AppController],
  providers: [AppService, EverythingSubscriber],
})
export class AppModule {}
