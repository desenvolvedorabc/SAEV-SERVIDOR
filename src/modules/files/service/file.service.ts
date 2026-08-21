import { unlink, writeFile, writeFileSync } from 'node:fs'

import { HttpException, HttpStatus, Injectable } from '@nestjs/common'
import { InjectConnection, InjectRepository } from '@nestjs/typeorm'
import * as Bluebird from 'bluebird'
import { isFuture, isPast } from 'date-fns'
import * as csv from 'fast-csv'
import { Parser } from 'json2csv'
import * as _ from 'lodash'
import { PaginationParams } from 'src/helpers/params'
import { editFileName } from 'src/helpers/utils'
import { AssessmentCounty } from 'src/modules/assessment/model/entities/assessment-county.entity'
import { County } from 'src/modules/counties/model/entities/county.entity'
import { SubProfile } from 'src/modules/profile/model/entities/sub-profile.entity'
import { ReleaseResultsService } from 'src/modules/release-results/service/release-results.service'
import { School } from 'src/modules/school/model/entities/school.entity'
import { User } from 'src/modules/user/model/entities/user.entity'
import { UserService } from 'src/modules/user/service/user.service'
import { paginateData } from 'src/utils/paginate-data'
import { Connection, Repository } from 'typeorm'

import { headersUsers } from '../constants/headers'
import { ImportResultStudentsDto } from '../model/dto/import-result-students.dto'
import { UpdateFileDto } from '../model/dto/update-file.dto'
import { FileEntity } from '../model/entities/file.entity'
import { ImportData } from '../model/entities/import-data.entity'
import { StatusImportData } from '../model/enum/status-data-enum'
import {
  ImportDataStudent,
  ImportDataUser,
  ImportResposta,
} from '../model/interface/data.interface'
import { IFile } from '../model/interface/file.interface'

@Injectable()
export class FileService {
  constructor(
    @InjectRepository(FileEntity)
    private fileRepository: Repository<FileEntity>,
    @InjectRepository(ImportData)
    private importDataRepository: Repository<ImportData>,

    @InjectConnection()
    private readonly connection: Connection,

    private userService: UserService,

    private releaseResultsService: ReleaseResultsService,
  ) {}

  async findAssessmentAndValidateRelease(
    data: ImportResposta[],
    importData: ImportData,
  ) {
    const firstItem = data[0]

    let textError = null

    const assessmentCounty = await this.connection
      .getRepository(AssessmentCounty)
      .createQueryBuilder('AssessmentCounty')
      .where('AssessmentCounty.AVM_AVA = :assessmentId', {
        assessmentId: firstItem?.AVA_ID,
      })
      .andWhere('AssessmentCounty.AVM_TIPO = :type', {
        type: firstItem?.TIPO,
      })
      .andWhere('AssessmentCounty.AVM_MUN = :countyId', {
        countyId: firstItem?.MUN_ID,
      })
      .getOne()

    if (!assessmentCounty) {
      textError = `Avaliação ${firstItem?.AVA_NOME ?? ''} do município ${firstItem?.MUN_NOME ?? ''} não encontrada!`
    } else {
      if (
        (!isPast(
          new Date(
            new Date(assessmentCounty?.AVM_DT_INICIO).toLocaleDateString(
              'en-US',
            ),
          ),
        ) &&
          isFuture(assessmentCounty?.AVM_DT_FIM)) ||
        (isPast(
          new Date(
            new Date(assessmentCounty?.AVM_DT_INICIO).toLocaleDateString(
              'en-US',
            ),
          ),
        ) &&
          !isFuture(assessmentCounty?.AVM_DT_FIM))
      ) {
        textError = `Avaliação (${firstItem?.AVA_NOME}) do município ${firstItem?.MUN_NOME} está fora do período de lançamento.`
      }
    }

    if (textError) {
      await this.importDataRepository.save({
        ...importData,
        DAT_STATUS: StatusImportData.ERROR,
        DAT_OBS: textError,
      })
    }

    return { textError }
  }

  async releaseResultStudents(
    file: Express.Multer.File,
    { supplier }: ImportResultStudentsDto,
    user: User,
  ) {
    let importData = this.importDataRepository.create({
      DAT_NOME: 'Avaliação',
      DAT_ARQUIVO_URL: file.filename,
      DAT_USU: user,
    })

    importData = await this.importDataRepository.save(importData)

    let data: ImportResposta[] = []

    try {
      data = (await this.readCsvFile(file, headersUsers)) as ImportResposta[]
    } catch (e) {
      return await this.importDataRepository.save({
        ...importData,
        DAT_STATUS: StatusImportData.ERROR,
        DAT_OBS:
          'Houve uma falha na leitura dos dados. Tente novamente depois.',
      })
    }

    const { textError } = await this.findAssessmentAndValidateRelease(
      data,
      importData,
    )

    if (textError?.trim()) return

    const dataGrouped = _.groupBy(
      data,
      (line) => line?.TEST_ID + ' ' + line.ALU_ID,
    )

    const keyTurmas = Object.keys(dataGrouped)

    const options = ['A', 'B', 'C', 'D', '-']

    try {
      await Bluebird.map(
        keyTurmas,
        async (key) => {
          const ALT_ALU = dataGrouped[key][0]?.ALU_ID
          const ALT_TES = dataGrouped[key][0]?.TEST_ID
          const ALT_JUSTIFICATIVA =
            dataGrouped[key][0]?.ATR_JUSTIFICATIVA?.trim()

          let ALT_RESPOSTAS = []

          if (!ALT_JUSTIFICATIVA) {
            ALT_RESPOSTAS = dataGrouped[key].map((r) => {
              const formatResponse = String(r?.ATR_RESPOSTA)
                .trim()
                ?.toUpperCase()

              const response = !options.includes(formatResponse)
                ? '-'
                : formatResponse

              return {
                ATR_RESPOSTA: response,
                ATR_TEG: r.NR_QUESTAO,
              }
            })
          }

          const dataCreateStudentTest = {
            ALT_TES,
            ALT_ALU,
            ALT_USU: null,
            ALT_FINALIZADO: !ALT_JUSTIFICATIVA,
            ALT_ATIVO: !ALT_JUSTIFICATIVA,
            ALT_JUSTIFICATIVA,
            ALT_RESPOSTAS,
            ALT_FORNECEDOR: supplier,
          } as any

          await this.releaseResultsService.addByImport(
            dataCreateStudentTest,
            null,
          )
        },
        { concurrency: 50 },
      )
    } catch (e) {
      return await this.importDataRepository.save({
        ...importData,
        DAT_STATUS: StatusImportData.ERROR,
        DAT_OBS:
          'Houve uma falha na importação dos dados. Tente novamente depois.',
      })
    }

    await this.importDataRepository.save({
      ...importData,
      DAT_STATUS: StatusImportData.SUCCESS,
    })
  }

  async importUsers(file: Express.Multer.File, user: User): Promise<void> {
    let importData = this.importDataRepository.create({
      DAT_NOME: 'Usuários',
      DAT_ARQUIVO_URL: file.filename,
      DAT_USU: user,
    })

    importData = await this.importDataRepository.save(importData)

    try {
      const data = (await this.readCsvFile(
        file,
        headersUsers,
      )) as ImportDataUser[]

      const usersErrors = await this.saveUsers(data, user)

      if (!usersErrors.length) {
        await this.importDataRepository.save({
          ...importData,
          DAT_STATUS: StatusImportData.SUCCESS,
        })
      } else {
        await this.importDataError(usersErrors, importData)
      }
    } catch (err) {
      await this.importDataRepository.save({
        ...importData,
        DAT_STATUS: StatusImportData.ERROR,
        DAT_OBS:
          'Houve uma falha na leitura dos dados. Tente novamente depois.',
      })
    }
  }

  async saveUsers(
    usersData: ImportDataUser[],
    user: User,
  ): Promise<ImportDataUser[]> {
    const usersErros: ImportDataUser[] = []

    for await (const userData of usersData) {
      const {
        USU_DOCUMENTO,
        USU_EMAIL,
        USU_FONE,
        USU_NOME,
        USU_SPE,
        USU_ESC_INEP,
        USU_MUN_IBGE,
      } = userData

      try {
        const subProfile = await this.connection
          .getRepository(SubProfile)
          .findOneOrFail({
            where: {
              SPE_ID: USU_SPE,
            },
          })

        const school = await this.connection.getRepository(School).findOne({
          where: {
            ESC_INEP: USU_ESC_INEP,
          },
        })

        const county = await this.connection.getRepository(County).findOne({
          where: {
            MUN_COD_IBGE: USU_MUN_IBGE,
          },
        })

        await this.userService.create(
          {
            USU_DOCUMENTO,
            USU_EMAIL,
            USU_FONE,
            USU_NOME,
            USU_SENHA: new Date().toString(),
            USU_SPE: subProfile,
            USU_AVATAR: '',
            USU_ESC: school,
            USU_MUN: county,
            stateId: null,
          },
          user,
        )
      } catch (e) {
        usersErros.push(userData)
      }
    }

    return usersErros
  }

  async importDataError(
    usersErrors: ImportDataUser[] | ImportDataStudent[],
    importData: ImportData,
  ) {
    const parser = new Parser({
      quote: ' ',
      withBOM: true,
      delimiter: ';',
    })

    const csvData = parser.parse(usersErrors)

    const nameFile = `${Date.now()}-upload-error.csv`

    writeFile(`./public/file/${nameFile}`, csvData, async (err) => {
      if (err) {
        console.log(err)
      } else {
        await this.importDataRepository.save({
          ...importData,
          DAT_STATUS: StatusImportData.ERROR,
          DAT_ARQUIVO_ERROR_URL: nameFile,
        })
      }
    })
  }

  async readCsvFile(file: any, headers: string[]) {
    return new Promise((resolve, reject) => {
      const data = []

      csv
        .parseFile(file.path, {
          headers: true,
          trim: true,
          delimiter: ';',
        })
        .on('data', (row) => {
          Object.keys(row).forEach((key) => {
            const newKey = key.replace(/;/g, '')

            Object.assign(row, { [key]: row[key].replace(/;/g, '') })

            if (newKey !== key) {
              delete Object.assign(row, { [newKey]: row[key] })[key]
            }
          })

          data.push(row)
        })
        .on('end', () => {
          resolve(data)
        })
        .on('error', (err) => {
          unlink(file.path, () => {})
          reject()
          console.log(err)
        })
    })
  }

  async updateFile(
    ARQ_ID: number,
    filename: string,
    base64: string,
  ): Promise<string> {
    const file = await this.fileRepository.findOne({ ARQ_ID })
    const folderName = './public/file/'
    const newFileName = editFileName(filename)
    if (file) {
      file.ARQ_URL = newFileName
      writeFileSync(`${folderName}${newFileName}`, base64, {
        encoding: 'base64',
      })
      await this.update(ARQ_ID, file)
      return newFileName
    } else {
      throw new HttpException(
        'Não é possível gravar esta imagem.',
        HttpStatus.BAD_GATEWAY,
      )
    }
  }

  update(ARQ_ID: number, updateFileDto: UpdateFileDto): Promise<IFile> {
    return this.fileRepository.save({ ...updateFileDto, ARQ_ID })
  }

  async paginate(params: PaginationParams) {
    const { search, limit, page } = params

    const queryBuilder = this.importDataRepository
      .createQueryBuilder('ImportData')
      .select(['ImportData', 'DAT_USU.USU_ID', 'DAT_USU.USU_NOME'])
      .leftJoin('ImportData.DAT_USU', 'DAT_USU')
      .orderBy('ImportData.DAT_DT_CRIACAO', 'DESC')

    if (search) {
      queryBuilder.andWhere('DAT_USU.USU_NOME like :search', {
        search: `%${search}%`,
      })
    }

    const data = await paginateData<ImportData>(page, limit, queryBuilder)

    return data
  }
}
