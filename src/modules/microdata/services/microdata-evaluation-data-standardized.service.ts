import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Assessment } from 'src/modules/assessment/model/entities/assessment.entity'
import { AssessmentCounty } from 'src/modules/assessment/model/entities/assessment-county.entity'
import { Test } from 'src/modules/test/model/entities/test.entity'
import { User } from 'src/modules/user/model/entities/user.entity'
import { Repository } from 'typeorm'

import { ExportEvaluationTemplate } from '../dto/export-evaluation-template.dto'
import {
  exportFormatSinal,
  PaginationMicroDataDto,
} from '../dto/pagination-microdata.dto'
import { TypeMicrodata } from '../dto/type-microdata.enum'
import { Microdatum } from '../entities/microdatum.entity'
import { StatusMicrodata } from '../enum/status-microdata.enum'
import {
  mapperFormatEvaluationDataStandardized,
  mapperFormatSchools,
} from '../mappers'
import { MicrodataService } from '../microdata.service'
import { MicrodataRepository } from '../repositories/microdata.repository'
import { safeWrite } from '../utils/csv-stream'
import {
  addCsvToArchive,
  finalizeCsvArchive,
  initialCsvArchive,
} from '../utils/mult-csv-stream'

@Injectable()
export class MicrodataEvaluationDataStandardizedService {
  constructor(
    @InjectRepository(Microdatum)
    private readonly microdataRepository: Repository<Microdatum>,

    private readonly microdataRepository2: MicrodataRepository,

    private readonly microdataService: MicrodataService,
  ) {}

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

  async export(dto: PaginationMicroDataDto, user: User) {
    const jobPending = await this.microdataService.verifyExistJobPending()

    if (jobPending) return

    const findMicrodata = await this.microdataService.verifyExistMicrodata(
      dto,
      TypeMicrodata.AVALIACAO_NORMALIZADA,
    )

    if (findMicrodata) {
      return
    }

    const { county, typeSchool, stateId, exportFormat } = dto

    const { microdata } = await this.microdataService.create({
      user,
      countyId: county,
      stateId,
      type: TypeMicrodata.AVALIACAO_NORMALIZADA,
      typeSchool,
      file: null,
    })

    const sinal = exportFormatSinal[exportFormat]

    try {
      const { streams, nameFile, archive } = initialCsvArchive(
        TypeMicrodata.AVALIACAO,
      )
      const schoolsStream = addCsvToArchive(
        archive,
        streams,
        'escolas.csv',
        sinal,
      )

      await this.getSchoolsAndAddStream(dto, schoolsStream)

      const studentsStream = addCsvToArchive(
        archive,
        streams,
        'alunos.csv',
        sinal,
      )

      await this.microdataService.getStudentsAndAddStream(dto, studentsStream)

      const countiesStream = addCsvToArchive(
        archive,
        streams,
        'municipios.csv',
        sinal,
      )

      await this.getCountiesAndAddStream(dto, countiesStream)

      const testsStream = addCsvToArchive(archive, streams, 'testes.csv', sinal)

      await this.getTestsAndAddStream(dto, testsStream)

      const descriptorsStream = addCsvToArchive(
        archive,
        streams,
        'descritores.csv',
        sinal,
      )

      await this.getDescriptorsAndAddStream(dto, descriptorsStream)

      const assessmentStream = addCsvToArchive(
        archive,
        streams,
        'avaliacao.csv',
        sinal,
      )

      const { assessment } =
        await this.microdataRepository2.getAssessmentForExportEvaluationDataStandardized(
          dto,
        )

      for await (const assessmentCounty of assessment.AVA_AVM) {
        const countyId = assessmentCounty?.AVM_MUN?.MUN_ID

        for await (const test of assessment.AVA_TES) {
          await this.getStudentTestsAndAddStream(
            { ...dto, county: countyId },
            assessment,
            test,
            assessmentCounty,
            assessmentStream,
          )
        }

        if (global.gc) {
          global.gc()
        }
      }

      finalizeCsvArchive(streams, archive)

      await this.microdataService.saveDataAndSendEmail({
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

  private async getStudentTestsAndAddStream(
    dto: PaginationMicroDataDto,
    assessment: Assessment,
    test: Test,
    assessmentCounty: AssessmentCounty,
    stream: any,
  ) {
    const LIMIT = 300
    let OFFSET = 0

    while (1) {
      const { studentsTest } =
        await this.microdataRepository2.getStudentsTestForExportEvaluationDataStandardized(
          { ...dto },
          test.TES_ID,
          OFFSET,
          LIMIT,
        )

      if (studentsTest?.length === 0) {
        break
      }

      await mapperFormatEvaluationDataStandardized({
        assessment,
        data: studentsTest,
        test,
        csvStream: stream,
        county: assessmentCounty?.AVM_MUN,
      })

      studentsTest.length = 0

      if (global.gc && OFFSET % (LIMIT * 10) === 0) {
        global.gc()
      }

      OFFSET += LIMIT
    }
  }

  private async getSchoolsAndAddStream(
    dto: PaginationMicroDataDto,
    stream: any,
  ) {
    const { schools } = await this.microdataRepository2.getSchoolsForExport(dto)

    await mapperFormatSchools(schools, stream)

    stream.end()
  }

  private async getCountiesAndAddStream(
    dto: PaginationMicroDataDto,
    stream: any,
  ) {
    const { counties } =
      await this.microdataRepository2.getCountiesForExport(dto)

    for await (const county of counties) {
      await safeWrite(stream, {
        MUN_ID: county?.MUN_ID ?? 'N/A',
        MUN_NOME: county?.MUN_NOME ?? 'N/A',
        MUN_COD_IBGE: county?.MUN_COD_IBGE ?? 'N/A',
        MUN_UF: county?.MUN_UF ?? 'N/A',
      })
    }

    stream.end()
  }

  private async getTestsAndAddStream(dto: PaginationMicroDataDto, stream: any) {
    const { tests } = await this.microdataRepository2.getTestsForExport(dto)

    for await (const test of tests) {
      await safeWrite(stream, test)
    }

    stream.end()
  }

  private async getDescriptorsAndAddStream(
    dto: PaginationMicroDataDto,
    stream: any,
  ) {
    const { descriptors } =
      await this.microdataRepository2.getDescriptorsForExport(dto)

    for await (const descriptor of descriptors) {
      await safeWrite(stream, descriptor)
    }

    stream.end()
  }
}
