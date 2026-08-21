import { Injectable, Logger } from '@nestjs/common'
import { InjectConnection, InjectRepository } from '@nestjs/typeorm'
import { endOfDay, parseISO, startOfDay } from 'date-fns'
import * as _ from 'lodash'
import { ResponsiblesService } from 'src/modules/responsibles/responsibles.service'
import { School } from 'src/modules/school/model/entities/school.entity'
import { SchoolClass } from 'src/modules/school-class/model/entities/school-class.entity'
import { Serie } from 'src/modules/serie/model/entities/serie.entity'
import { StudentService } from 'src/modules/student/service/student.service'
import { User } from 'src/modules/user/model/entities/user.entity'
import { parseDate } from 'src/utils/parse-date'
import { Between, Connection, Repository } from 'typeorm'

import { Student } from '../../student/model/entities/student.entity'
import { headersStudents } from '../constants/headers'
import { ImportData } from '../model/entities/import-data.entity'
import { StatusImportData } from '../model/enum/status-data-enum'
import { ImportDataStudent } from '../model/interface/data.interface'
import { FileService } from './file.service'

interface SchoolInfo {
  id: number
  county: any
}

@Injectable()
export class StudentImportService {
  private readonly logger = new Logger(StudentImportService.name)

  constructor(
    @InjectRepository(ImportData)
    private importDataRepository: Repository<ImportData>,

    @InjectConnection()
    private readonly connection: Connection,

    private studentsService: StudentService,
    private responsiblesService: ResponsiblesService,
    private fileService: FileService,
  ) {}

  async newImportStudents(file: Express.Multer.File, user: User) {
    const importData = await this.createImportRecord(file, user)

    let data: ImportDataStudent[]
    try {
      data = (await this.fileService.readCsvFile(
        { path: file.path },
        headersStudents,
      )) as ImportDataStudent[]
    } catch {
      return this.markImportError(
        importData,
        'Houve uma falha na leitura dos dados. Tente novamente depois.',
      )
    }

    data = this.normalizeStudentNames(data)

    const seriesMap = await this.loadSeriesMap()

    let schoolsByInep: Record<string, SchoolInfo>
    try {
      schoolsByInep = await this.loadSchoolsByInep(data)
    } catch {
      return this.markImportError(
        importData,
        'Houve uma falha na leitura dos dados. Tente novamente depois.',
      )
    }

    const studentRepository = this.connection.getRepository(Student)
    const groupedByClass = this.groupBySchoolClass(
      data,
      schoolsByInep,
      seriesMap,
    )
    const importedIndexes: number[] = []

    for (const key of Object.keys(groupedByClass)) {
      const classStudents = groupedByClass[key]
      const firstStudent = classStudents[0]

      const schoolClass = await this.findOrCreateSchoolClass(
        firstStudent,
        schoolsByInep,
        seriesMap,
      )

      if (!schoolClass) continue

      await Promise.all(
        classStudents.map(async (aluno) => {
          const success = await this.upsertStudent(
            aluno,
            schoolClass,
            schoolsByInep,
            studentRepository,
            seriesMap,
          )
          if (success) {
            importedIndexes.push(Number(aluno.index))
          }
        }),
      )
    }

    const studentsNotImported = data.filter(
      (student) => !importedIndexes.includes(student.index),
    )

    if (!studentsNotImported.length) {
      await this.importDataRepository.save({
        ...importData,
        DAT_STATUS: StatusImportData.SUCCESS,
      })
    } else {
      await this.fileService.importDataError(studentsNotImported, importData)
    }
  }

  private async createImportRecord(
    file: Express.Multer.File,
    user: User,
  ): Promise<ImportData> {
    const importData = this.importDataRepository.create({
      DAT_NOME: 'Alunos',
      DAT_ARQUIVO_URL: file.filename,
      DAT_USU: user,
    })
    return this.importDataRepository.save(importData)
  }

  private markImportError(importData: ImportData, message: string) {
    return this.importDataRepository.save({
      ...importData,
      DAT_STATUS: StatusImportData.ERROR,
      DAT_OBS: message,
    })
  }

  private normalizeStudentNames(
    data: ImportDataStudent[],
  ): ImportDataStudent[] {
    return data.map((row, index) => ({
      ...row,
      ALU_NOME: this.normalizeName(row.ALU_NOME),
      ALU_NOME_MAE: this.normalizeName(row.ALU_NOME_MAE),
      ALU_NOME_PAI: this.normalizeName(row.ALU_NOME_PAI),
      ALU_NOME_RESP: this.normalizeName(row.ALU_NOME_RESP),
      index,
    }))
  }

  private normalizeName(name: string | undefined): string {
    return name
      ?.toUpperCase()
      ?.replace(/^\s+|\s+$/g, '')
      ?.replace(/\s+/g, ' ')
  }

  private async loadSeriesMap(): Promise<Record<number, number>> {
    const series = await this.connection.getRepository(Serie).find({
      where: { SER_ATIVO: true },
    })

    const seriesMap: Record<number, number> = {}
    series.forEach((serie) => {
      if (serie.SER_NUMBER != null) {
        seriesMap[serie.SER_NUMBER] = serie.SER_ID
      }
    })
    return seriesMap
  }

  private async loadSchoolsByInep(
    data: ImportDataStudent[],
  ): Promise<Record<string, SchoolInfo>> {
    const uniqueIneps = [...new Set(data.map((d) => d.ALU_ESC_INEP))]

    const schools = await this.connection
      .getRepository(School)
      .createQueryBuilder('School')
      .select(['School.ESC_ID', 'School.ESC_INEP'])
      .innerJoinAndSelect('School.ESC_MUN', 'ESC_MUN')
      .where('School.ESC_INEP IN(:...ineps)', { ineps: uniqueIneps })
      .getMany()

    const schoolsByInep: Record<string, SchoolInfo> = {}
    schools.forEach((school) => {
      schoolsByInep[school.ESC_INEP] = {
        id: school.ESC_ID,
        county: school.ESC_MUN,
      }
    })
    return schoolsByInep
  }

  private groupBySchoolClass(
    data: ImportDataStudent[],
    schoolsByInep: Record<string, SchoolInfo>,
    seriesMap: Record<number, number>,
  ): Record<string, ImportDataStudent[]> {
    return _.groupBy(
      data,
      (line) =>
        schoolsByInep[line.ALU_ESC_INEP]?.id +
        ' ' +
        seriesMap[line?.TUR_SER_NUMBER] +
        ' ' +
        line.TUR_PERIODO +
        ' ' +
        line.TUR_TIPO +
        ' ' +
        line.TUR_NOME,
    )
  }

  private async findOrCreateSchoolClass(
    firstStudent: ImportDataStudent,
    schoolsByInep: Record<string, SchoolInfo>,
    seriesMap: Record<number, number>,
  ): Promise<SchoolClass | null> {
    const schoolClassRepo = this.connection.getRepository(SchoolClass)

    const queryBuilder = schoolClassRepo
      .createQueryBuilder()
      .where('TUR_ANO = :schoolClassYear', {
        schoolClassYear: firstStudent.TUR_ANO,
      })
      .andWhere('TUR_NOME = :schoolClassName', {
        schoolClassName: firstStudent.TUR_NOME,
      })
      .andWhere('TUR_PERIODO = :schoolClassPeriod', {
        schoolClassPeriod: firstStudent.TUR_PERIODO,
      })
      .andWhere('TUR_SER_ID = :schoolClassSeries', {
        schoolClassSeries: seriesMap[firstStudent.TUR_SER_NUMBER],
      })
      .andWhere('TUR_ESC_ID = :school', {
        school: schoolsByInep[firstStudent.ALU_ESC_INEP]?.id,
      })

    if (firstStudent.TUR_TIPO?.trim()) {
      queryBuilder.andWhere('TUR_TIPO = :schoolClassType', {
        schoolClassType: firstStudent.TUR_TIPO,
      })
    }

    let schoolClass = await queryBuilder.getOne()

    if (!schoolClass) {
      const newSchoolClass = schoolClassRepo.create({
        TUR_ANO: firstStudent.TUR_ANO,
        TUR_NOME: firstStudent.TUR_NOME,
        TUR_PERIODO: firstStudent.TUR_PERIODO,
        TUR_TIPO: firstStudent.TUR_TIPO,
        TUR_SER: seriesMap[firstStudent.TUR_SER_NUMBER],
        TUR_ESC: schoolsByInep[firstStudent.ALU_ESC_INEP]?.id,
        TUR_MUN: schoolsByInep[firstStudent.ALU_ESC_INEP]?.county,
        TUR_ANEXO: firstStudent.TUR_ANEXO === 'Sim',
      } as any)
      schoolClass = await schoolClassRepo.save(newSchoolClass as any)
    }

    return schoolClass
  }

  private async upsertStudent(
    aluno: ImportDataStudent,
    schoolClass: SchoolClass,
    schoolsByInep: Record<string, SchoolInfo>,
    studentRepository: Repository<Student>,
    seriesMap: Record<number, number>,
  ): Promise<boolean> {
    const date = aluno?.ALU_DT_NASC?.trim()
      ? parseDate(aluno?.ALU_DT_NASC)
      : null
    const dtNasc = date ? date + ' 23:59:59' : null

    const updateStudent = this.buildUpdatePayload(
      aluno,
      schoolClass,
      schoolsByInep,
      dtNasc,
      seriesMap,
    )

    if (aluno?.ALU_CPF !== '') {
      const foundByCpf = await studentRepository.findOne({
        ALU_CPF: aluno.ALU_CPF,
      })
      if (foundByCpf) {
        const updatedStudent = await this.studentsService.update(
          foundByCpf.ALU_ID,
          updateStudent,
          null,
        )
        await this.studentsService.createSchoolClassByStudent(updatedStudent)
        await this.linkResponsible(updatedStudent, aluno)
        return true
      }
    }

    if (aluno?.ALU_INEP !== '') {
      const foundByInep = await studentRepository.findOne({
        ALU_INEP: aluno?.ALU_INEP,
      })
      if (foundByInep) {
        const updatedStudent = await this.studentsService.update(
          foundByInep.ALU_ID,
          updateStudent,
          null,
        )
        await this.studentsService.createSchoolClassByStudent(updatedStudent)
        await this.linkResponsible(updatedStudent, aluno)
        return true
      }
    }

    if (
      await this.validateAndUpsertByNameAndMotherName(
        updateStudent,
        aluno,
        schoolsByInep,
      )
    ) {
      return true
    }

    try {
      const ALU_GEN = aluno?.ALU_GEN?.trim() ? aluno?.ALU_GEN : null
      const ALU_PEL = aluno?.ALU_PEL?.trim() ? aluno?.ALU_PEL : null

      const newStudent = await this.studentsService.addByImport(
        {
          ...aluno,
          ALU_SER: seriesMap[aluno.TUR_SER_NUMBER],
          ALU_DT_NASC: dtNasc,
          ALU_GEN,
          ALU_PEL,
          ALU_ESC: schoolsByInep[aluno.ALU_ESC_INEP]?.id,
          ALU_AVATAR: '',
          ALU_STATUS: 'Enturmado',
          ALU_TUR: schoolClass,
          ALU_ATIVO: true,
          ALU_DEFICIENCIA_BY_IMPORT: aluno?.ALU_PCD,
        } as any,
        null,
      )

      await this.linkResponsible(newStudent, aluno)
      return true
    } catch (err) {
      this.logger.error(err)
    }

    return false
  }

  private buildUpdatePayload(
    aluno: ImportDataStudent,
    schoolClass: SchoolClass,
    schoolsByInep: Record<string, SchoolInfo>,
    dtNasc: string | null,
    seriesMap: Record<number, number>,
  ): any {
    const updateStudent = {
      ...aluno,
      ALU_DEFICIENCIA_BY_IMPORT: aluno?.ALU_PCD,
      ALU_SER: seriesMap[aluno?.TUR_SER_NUMBER],
      ALU_DT_NASC: dtNasc,
      ALU_ESC: schoolsByInep[aluno.ALU_ESC_INEP]?.id,
      ALU_STATUS: 'Enturmado',
      ALU_TUR: schoolClass,
      ALU_ATIVO: true,
      ALU_PCD: '',
    } as any

    for (const field in updateStudent) {
      const value = updateStudent[field]
      if (typeof value === 'string' && !value.trim()) {
        delete updateStudent[field]
      }
    }

    return updateStudent
  }

  private async validateAndUpsertByNameAndMotherName(
    updateStudent: any,
    aluno: ImportDataStudent,
    schoolsByInep: Record<string, SchoolInfo>,
  ): Promise<boolean> {
    try {
      const payload = {
        ...updateStudent,
        ALU_ESC: schoolsByInep[aluno.ALU_ESC_INEP]?.id,
      }

      const startDay = startOfDay(parseISO(payload.ALU_DT_NASC))
      const endDay = endOfDay(parseISO(payload.ALU_DT_NASC))

      const foundStudent = await this.connection
        .getRepository(Student)
        .findOne({
          where: {
            ALU_NOME: payload.ALU_NOME,
            ALU_NOME_MAE: payload.ALU_NOME_MAE,
            ALU_DT_NASC: Between(startDay, endDay),
          },
        })

      if (foundStudent) {
        const updatedStudent = await this.studentsService.update(
          foundStudent.ALU_ID,
          payload,
          null,
        )
        await this.studentsService.createSchoolClassByStudent(updatedStudent)
        await this.linkResponsible(updatedStudent, aluno)
        return true
      }
    } catch (err) {
      this.logger.error(err)
    }

    return false
  }

  private async linkResponsible(
    student: any,
    aluno: ImportDataStudent,
  ): Promise<void> {
    const email = aluno.ALU_EMAIL?.trim()
    if (!email) return

    try {
      const responsible = await this.responsiblesService.findOrCreateByEmail(
        email,
        aluno.ALU_NOME_RESP,
      )

      if (responsible) {
        const studentId = student.ALU_ID ?? student
        await this.connection
          .getRepository(Student)
          .update(studentId, { ALU_RES: responsible })
      }
    } catch {}
  }
}
