import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { InjectConnection, InjectRepository } from '@nestjs/typeorm'
import { subHours } from 'date-fns'
import { PaginationParams } from 'src/helpers/params'
import { sendEmail } from 'src/helpers/sendMail'
import { AssessmentCounty } from 'src/modules/assessment/model/entities/assessment-county.entity'
import { User } from 'src/modules/user/model/entities/user.entity'
import { formatParamsByProfile } from 'src/utils/format-params-by-profile'
import { paginateData } from 'src/utils/paginate-data'
import { exportDataTemplate } from 'templates/export-data'
import { Connection, MoreThanOrEqual, Repository } from 'typeorm'

import { Assessment } from '../assessment/model/entities/assessment.entity'
import { Job } from '../jobs/job.entity'
import { Test } from '../test/model/entities/test.entity'
import { EXPORT_ERROR_MESSAGES } from './constants/export-messages'
import { CreateMicrodatumDto } from './dto/create-microdatum.dto'
import { ExportEvaluationTemplate } from './dto/export-evaluation-template.dto'
import {
  exportFormatSinal,
  PaginationMicroDataDto,
} from './dto/pagination-microdata.dto'
import { TypeMicrodata } from './dto/type-microdata.enum'
import { Microdatum } from './entities/microdatum.entity'
import { StatusMicrodata } from './enum/status-microdata.enum'
import {
  mapperEvaluationTemplate,
  mapperFormatEvaluationData,
  mapperFormatInfrequency,
  mapperFormatStudents,
} from './mappers'
import { MicrodataRepository } from './repositories/microdata.repository'
import { buildExtractionMetadata } from './utils/build-extraction-metadata'
import { initialCsvStream } from './utils/csv-stream'
import { addDictionaryToArchive } from './utils/dictionary-stream'
import { addMetadataToArchive } from './utils/metadata-stream'
import { addCsvToArchive, initialCsvArchive } from './utils/mult-csv-stream'

@Injectable()
export class MicrodataService {
  private readonly clientAppUrl: string
  private readonly hostAppUrl: string

  constructor(
    @InjectRepository(Microdatum)
    private readonly microdataRepository: Repository<Microdatum>,

    private readonly microdataRepository2: MicrodataRepository,

    @InjectConnection()
    private readonly connection: Connection,
  ) {
    this.clientAppUrl = process.env.FRONT_APP_URL
    this.hostAppUrl = process.env.HOST_APP_URL
  }

  async create({
    countyId,
    user,
    type,
    typeSchool,
    stateId,
  }: CreateMicrodatumDto) {
    const county = countyId ? { MUN_ID: countyId } : null

    const microdata = this.microdataRepository.create({
      county,
      file: '',
      stateId,
      user,
      typeSchool,
      status: StatusMicrodata.IN_PROGRESS,
      type,
    })

    await this.microdataRepository.save(microdata, {
      data: user,
    })

    return {
      microdata,
    }
  }

  async findAll(dto: PaginationParams, user: User) {
    const { page, limit, stateId, county, typeSchool } = formatParamsByProfile(
      dto,
      user,
      true,
    )
    const queryBuilder = this.microdataRepository
      .createQueryBuilder('Microdata')
      .select([
        'Microdata',
        'user.USU_ID',
        'user.USU_NOME',
        'county.MUN_ID',
        'county.MUN_NOME',
        'state.name',
      ])

      .innerJoin('Microdata.user', 'user')
      .leftJoin('Microdata.state', 'state')
      .leftJoin('Microdata.county', 'county')
      .orderBy('Microdata.createdAt', 'DESC')

    if (typeSchool) {
      queryBuilder.andWhere('Microdata.typeSchool = :typeSchool', {
        typeSchool,
      })
    }

    if (stateId) {
      queryBuilder.andWhere('Microdata.stateId = :stateId', {
        stateId,
      })
    }

    if (county) {
      queryBuilder.andWhere('county.MUN_ID = :county', {
        county,
      })
    }

    const data = await paginateData(page, limit, queryBuilder)

    return data
  }

  async validateExistsAssessmentForTemplate(dto: ExportEvaluationTemplate) {
    const { assessmentsCounty } =
      await this.microdataRepository2.getAssessmentsForTemplate(dto)

    if (!assessmentsCounty.length) {
      throw new NotFoundException('Avaliação não encontrada.')
    }

    return {
      assessmentsCounty,
    }
  }

  async exportEvaluationTemplate(
    assessmentsCounty: AssessmentCounty[],
    dto: ExportEvaluationTemplate,
    user: User,
  ) {
    const { countyId, typeSchool, stateId } = dto

    const { microdata } = await this.create({
      user,
      stateId,
      countyId,
      type: TypeMicrodata.TEMPLATE_AVALIACAO,
      typeSchool,
      file: null,
    })

    try {
      const { csvStream, nameFile, archive } = initialCsvStream(
        ';',
        TypeMicrodata.TEMPLATE_AVALIACAO,
      )

      for await (const item of assessmentsCounty) {
        const countyId = item.AVM_MUN.MUN_ID

        const { students } =
          await this.microdataRepository2.exportStudentsEvaluationTemplate(
            { ...dto, countyId },
            item,
          )

        mapperEvaluationTemplate(item, students, typeSchool, csvStream)
      }

      csvStream.end()
      await this.appendExtractionMetadata({
        archive,
        type: TypeMicrodata.TEMPLATE_AVALIACAO,
        user,
        stateId,
        countyId,
        typeSchool,
        year: null,
        edition: dto.assessmentId,
        exportFormat: null,
      })
      addDictionaryToArchive(archive, TypeMicrodata.TEMPLATE_AVALIACAO)
      archive.finalize()

      await this.saveDataAndSendEmail({
        user,
        microdata,
        nameFile,
      })
    } catch (e) {
      await this.microdataRepository.update(microdata.id, {
        status: StatusMicrodata.ERROR,
      })
    }
  }

  async exportEvaluationData(dto: PaginationMicroDataDto, user: User) {
    const jobPending = await this.verifyExistJobPending()

    if (jobPending) {
      throw new ConflictException(EXPORT_ERROR_MESSAGES.JOB_PENDING)
    }

    const findMicrodata = await this.verifyExistMicrodata(
      dto,
      TypeMicrodata.AVALIACAO,
    )

    if (findMicrodata) {
      throw new ConflictException(EXPORT_ERROR_MESSAGES.RECENT_EXPORT)
    }

    this.processEvaluationDataExport(dto, user)
  }

  private async processEvaluationDataExport(
    dto: PaginationMicroDataDto,
    user: User,
  ) {
    const { county, exportFormat, typeSchool, stateId } = dto

    const sinal = exportFormatSinal[exportFormat]

    const { microdata } = await this.create({
      user,
      countyId: county,
      stateId,
      type: TypeMicrodata.AVALIACAO,
      typeSchool,
      file: null,
    })

    try {
      const { nameFile, archive, streams } = initialCsvArchive(
        TypeMicrodata.AVALIACAO,
      )

      const stream = addCsvToArchive(archive, streams, 'data.csv', sinal)

      let { assessment } =
        await this.microdataRepository2.getAssessmentForExportEvaluationData(
          dto,
        )

      for await (const assessmentCounty of assessment?.AVA_AVM) {
        const countyId = assessmentCounty?.AVM_MUN?.MUN_ID

        for await (const test of assessment.AVA_TES) {
          await this.getStudentTestsAndAddStream(
            { ...dto, county: countyId },
            assessment,
            test,
            assessmentCounty,
            stream,
          )
        }

        if (global.gc) {
          global.gc()
        }
      }

      Object.values(streams).forEach((s) => s.end())
      await this.appendExtractionMetadata({
        archive,
        type: TypeMicrodata.AVALIACAO,
        user,
        stateId,
        countyId: county,
        typeSchool,
        year: dto.year,
        edition: dto.edition,
        exportFormat,
      })
      addDictionaryToArchive(archive, TypeMicrodata.AVALIACAO)
      archive.finalize()

      assessment = null

      await this.saveDataAndSendEmail({
        user,
        microdata,
        nameFile,
      })
    } catch (e) {
      await this.microdataRepository.update(microdata.id, {
        status: StatusMicrodata.ERROR,
      })
    }
  }

  async exportInfrequencyData(dto: PaginationMicroDataDto, user: User) {
    const findMicrodata = await this.verifyExistMicrodata(
      dto,
      TypeMicrodata.INFREQUENCIA,
    )

    if (findMicrodata) {
      throw new ConflictException(EXPORT_ERROR_MESSAGES.RECENT_EXPORT)
    }

    this.processInfrequencyDataExport(dto, user)
  }

  private async processInfrequencyDataExport(
    dto: PaginationMicroDataDto,
    user: User,
  ) {
    const { county, exportFormat, typeSchool, stateId } = dto

    const sinal = exportFormatSinal[exportFormat]

    const { microdata } = await this.create({
      user,
      countyId: county,
      stateId,
      type: TypeMicrodata.INFREQUENCIA,
      typeSchool,
      file: null,
    })

    try {
      const { csvStream, nameFile, archive } = initialCsvStream(
        sinal,
        TypeMicrodata.INFREQUENCIA,
      )

      const { infrequency } =
        await this.microdataRepository2.exportInfrequencyData(dto)

      mapperFormatInfrequency(infrequency, csvStream)

      csvStream.end()
      await this.appendExtractionMetadata({
        archive,
        type: TypeMicrodata.INFREQUENCIA,
        user,
        stateId,
        countyId: county,
        typeSchool,
        year: dto.year,
        edition: dto.edition,
        exportFormat,
      })
      addDictionaryToArchive(archive, TypeMicrodata.INFREQUENCIA)
      archive.finalize()

      await this.saveDataAndSendEmail({
        user,
        microdata,
        nameFile,
      })
    } catch (e) {
      await this.microdataRepository.update(microdata.id, {
        status: StatusMicrodata.ERROR,
      })
    }
  }

  async verifyExistJobPending(): Promise<boolean> {
    const job = await this.connection.getRepository(Job).findOne({
      order: {
        createdAt: 'DESC',
      },
    })

    if (!job || job?.bullId === 'ERROR') {
      return false
    }

    const date = new Date(job?.endDate)

    return isNaN(date?.getTime())
  }

  async verifyExistMicrodata(
    { county: countyId, typeSchool, stateId }: PaginationMicroDataDto,
    type: TypeMicrodata,
  ) {
    const hoursAgo = subHours(new Date(), 1)

    const county = countyId ? { MUN_ID: countyId } : null

    const microdata = await this.microdataRepository.findOne({
      where: {
        stateId,
        county,
        type,
        typeSchool,
        createdAt: MoreThanOrEqual(hoursAgo),
      },
      order: {
        createdAt: 'DESC',
      },
    })

    return microdata ?? null
  }

  async exportStudentsData(dto: PaginationMicroDataDto, user: User) {
    const findMicrodata = await this.verifyExistMicrodata(
      dto,
      TypeMicrodata.ALUNOS,
    )

    if (findMicrodata) {
      throw new ConflictException(EXPORT_ERROR_MESSAGES.RECENT_EXPORT)
    }

    this.processStudentsDataExport(dto, user)
  }

  private async processStudentsDataExport(
    dto: PaginationMicroDataDto,
    user: User,
  ) {
    const { county, exportFormat, typeSchool, stateId } = dto

    const sinal = exportFormatSinal[exportFormat]

    const { microdata } = await this.create({
      user,
      countyId: county,
      stateId,
      type: TypeMicrodata.ALUNOS,
      typeSchool,
      file: null,
    })

    try {
      const { csvStream, nameFile, archive } = initialCsvStream(
        sinal,
        TypeMicrodata.ALUNOS,
      )

      await this.getStudentsAndAddStream(dto, csvStream)

      await this.appendExtractionMetadata({
        archive,
        type: TypeMicrodata.ALUNOS,
        user,
        stateId,
        countyId: county,
        typeSchool,
        year: dto.year,
        edition: dto.edition,
        exportFormat,
      })
      addDictionaryToArchive(archive, TypeMicrodata.ALUNOS)
      archive.finalize()

      await this.saveDataAndSendEmail({
        user,
        microdata,
        nameFile,
      })
    } catch (e) {
      await this.microdataRepository.update(microdata.id, {
        status: StatusMicrodata.ERROR,
      })
    }
  }

  async getStudentTestsAndAddStream(
    dto: PaginationMicroDataDto,
    assessment: Assessment,
    test: Test,
    assessmentCounty: AssessmentCounty,
    stream: any,
  ) {
    const LIMIT = 500
    let cursor = 0
    let batchCount = 0

    while (true) {
      const { studentsTest } =
        await this.microdataRepository2.getStudentsTestForExportEvaluationData(
          { ...dto },
          test.TES_ID,
          cursor,
          LIMIT,
        )

      if (studentsTest?.length === 0) {
        break
      }

      await mapperFormatEvaluationData({
        assessment,
        data: studentsTest,
        test,
        stream,
        county: assessmentCounty?.AVM_MUN,
      })

      if (studentsTest?.length < LIMIT) {
        break
      }

      cursor = studentsTest[studentsTest.length - 1]?.ALT_ID || cursor + LIMIT

      studentsTest.length = 0
      batchCount++

      if (global.gc && batchCount % 10 === 0) {
        global.gc()
      }
    }
  }

  async getStudentsAndAddStream(dto: PaginationMicroDataDto, stream: any) {
    const LIMIT = 100000 // 100 mil registros por vez
    let OFFSET = 0

    while (1) {
      const { students } = await this.microdataRepository2.exportStudentsData(
        dto,
        OFFSET,
        LIMIT,
      )

      if (students.length === 0) {
        break
      }

      await mapperFormatStudents(students, stream)

      OFFSET += LIMIT
    }

    stream.end()
  }

  async appendExtractionMetadata({
    archive,
    type,
    user,
    stateId,
    countyId,
    typeSchool,
    year,
    edition,
    exportFormat,
  }: {
    archive: any
    type: TypeMicrodata
    user: User
    stateId?: number | null
    countyId?: number | null
    typeSchool?: any
    year?: string | number | null
    edition?: string | number | null
    exportFormat?: string | null
  }) {
    try {
      const { stateName, countyName, assessmentName } =
        await this.microdataRepository2.getStateAndCountyNames(
          stateId,
          countyId,
          edition,
        )

      const metadata = buildExtractionMetadata({
        type,
        user,
        stateName,
        countyName,
        typeSchool,
        year,
        edition: assessmentName ?? edition,
        exportFormat,
      })

      addMetadataToArchive(archive, metadata)
    } catch (err) {
      console.error('Falha ao anexar metadados da extração ao arquivo:', err)
    }
  }

  async saveDataAndSendEmail({
    user,
    microdata,
    nameFile,
  }: {
    user: User
    microdata: Microdatum
    nameFile: string
  }) {
    await this.microdataRepository.save({
      ...microdata,
      file: nameFile,
      status: StatusMicrodata.SUCCESS,
    })

    const linkDownload = `${this.hostAppUrl}/v1/microdata/file/${nameFile}`
    const html = exportDataTemplate(this.clientAppUrl, linkDownload)

    sendEmail(user.USU_EMAIL, 'Saev | O seu download está disponível', html)
  }
}
