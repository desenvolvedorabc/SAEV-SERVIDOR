import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { EventEmitterModule } from '@nestjs/event-emitter'
import { MulterModule } from '@nestjs/platform-express'
import { TypeOrmModule } from '@nestjs/typeorm'
import { LoggerModule } from 'nestjs-pino'

import { AppController } from './app.controller'
import { AppService } from './app.service'
import configuration from './config/configuration'
import { DatabaseConfig } from './config/database-config.factory'
import { AreaModule } from './modules/area/area.module'
import { AssessmentsModule } from './modules/assessment/assessment.module'
import { AssessmentOnlineModule } from './modules/assessment-online/assessment-online.module'
import { AuthModule } from './modules/auth/auth.module'
import { CountiesModule } from './modules/counties/counties.module'
import { ExternalReportsModule } from './modules/external-reports/external-reports.module'
import { FileModule } from './modules/files/file.module'
import { HeadquartersModule } from './modules/headquarters/headquarters.module'
import { JobsModule } from './modules/jobs/jobs.module'
import { MessageTemplatesModule } from './modules/message-templates/message-templates.module'
import { MessagesModule } from './modules/messages/message.module'
import { MicrodataModule } from './modules/microdata/microdata.module'
import { NotificationsModule } from './modules/notifications/notification.module'
import { ProfileModule } from './modules/profile/profile.module'
import { RegionalModule } from './modules/regional/regional.module'
import { ReleaseResultsModule } from './modules/release-results/release-results.module'
import { ReportsModule } from './modules/reports/reports.module'
import { SchoolModule } from './modules/school/school.module'
import { SchoolAbsencesModule } from './modules/school-absences/school-absences.module'
import { SchoolClassModule } from './modules/school-class/school-class.module'
import { SchoolYearModule } from './modules/school-year/school-year.module'
import { SerieModule } from './modules/serie/serie.module'
import { StatesModule } from './modules/states/states.module'
import { StudentModule } from './modules/student/student.module'
import { SubjectModule } from './modules/subject/subject.module'
import { SystemLogsModule } from './modules/system-logs/system-logs.module'
import { TeacherModule } from './modules/teacher/teacher.module'
import { TestsModule } from './modules/test/tests.module'
import { TransferModule } from './modules/transfer/transfer.module'
import { TutorMessagesModule } from './modules/tutor-messages/tutor-messages.module'
import { UserModule } from './modules/user/user.module'
import { EverythingSubscriber } from './utils/event-subscriber'

@Module({
  imports: [
    EventEmitterModule.forRoot(),
    MulterModule.register({
      dest: './public',
      limits: { fileSize: 2 * 1048576 }, // 2MB
    }),
    // ThrottlerModule.forRoot({
    //   ttl: 2,
    //   limit: 50,

    // }),
    ConfigModule.forRoot({ load: [configuration], isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useClass: DatabaseConfig,
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        transport: {
          target: 'pino-pretty',
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
    StatesModule,
    RegionalModule,
    MessageTemplatesModule,
    TutorMessagesModule,
  ],
  controllers: [AppController],
  providers: [AppService, EverythingSubscriber],
})
export class AppModule {}
