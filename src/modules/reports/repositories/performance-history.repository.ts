import { Injectable } from '@nestjs/common'
import { InjectConnection, InjectRepository } from '@nestjs/typeorm'
import { PaginationParams } from 'src/helpers/params'
import { Assessment } from 'src/modules/assessment/model/entities/assessment.entity'
import { StudentTest } from 'src/modules/release-results/model/entities/student-test.entity'
import { TypeSchoolEnum } from 'src/modules/school/model/enum/type-school.enum'
import { Student } from 'src/modules/student/model/entities/student.entity'
import { paginateData } from 'src/utils/paginate-data'
import { Connection, Repository } from 'typeorm'

import { ReportEdition } from '../model/entities/report-edition.entity'

@Injectable()
export class PerformanceHistoryRepository {
  constructor(
    @InjectConnection()
    private readonly connection: Connection,

    @InjectRepository(Assessment)
    private assessmentRepository: Repository<Assessment>,

    @InjectRepository(ReportEdition)
    private reportEditionRepository: Repository<ReportEdition>,
  ) {}

  async getInfoStudent(studentId: number, testId: number) {
    const studentTest = await this.connection
      .getRepository(StudentTest)
      .createQueryBuilder('StudentTest')
      .select([
        'StudentTest.ALT_ID',
        'StudentTest.ALT_FINALIZADO',
        'StudentTest.ALT_JUSTIFICATIVA',
        'ANSWERS_TEST.ATR_ID',
        'ANSWERS_TEST.ATR_RESPOSTA',
        'ANSWERS_TEST.ATR_CERTO',
        'questionTemplate.TEG_ID',
      ])
      .leftJoin('StudentTest.ANSWERS_TEST', 'ANSWERS_TEST')
      .leftJoin('ANSWERS_TEST.questionTemplate', 'questionTemplate')
      .where('StudentTest.ALT_ALU_ID = :studentId', {
        studentId,
      })
      .andWhere('StudentTest.ALT_TES_ID = :testId', { testId })

      .getOne()

    return {
      studentTest,
    }
  }

  async getStudents({
    page,
    limit,
    school,
    schoolClass,
    serie,
    isCsv,
    typeSchool,
    verifyProfileForState,
  }: PaginationParams) {
    const queryBuilder = this.connection
      .getRepository(Student)
      .createQueryBuilder('Student')
      .select(['Student.ALU_ID', 'Student.ALU_NOME'])
      .innerJoin('Student.ALU_ESC', 'school', 'school.ESC_ID = :school', {
        school,
      })
      .innerJoin('school.ESC_MUN', 'county')
      .where('Student.ALU_ATIVO IS TRUE')
      .andWhere('Student.ALU_SER_ID = :serie', { serie })
      .orderBy('Student.ALU_NOME', 'ASC')

    if (schoolClass) {
      queryBuilder.andWhere('Student.ALU_TUR_ID = :schoolClass', {
        schoolClass,
      })
    }

    if (typeSchool) {
      queryBuilder.andWhere('school.ESC_TIPO = :typeSchool', {
        typeSchool,
      })
    }

    if (!typeSchool && verifyProfileForState) {
      queryBuilder.andWhere(
        `((school.ESC_TIPO = '${TypeSchoolEnum.ESTADUAL}') or (school.ESC_TIPO = '${TypeSchoolEnum.MUNICIPAL}' && county.MUN_COMPARTILHAR_DADOS IS TRUE))`,
      )
    }

    if (verifyProfileForState && typeSchool === TypeSchoolEnum.MUNICIPAL) {
      queryBuilder.andWhere('county.MUN_COMPARTILHAR_DADOS IS TRUE')
    }

    return await paginateData(page, limit, queryBuilder, isCsv)
  }

  async getExamsBySerieAndYear({
    county,
    serie,
    year,
    typeSchool,
  }: PaginationParams) {
    const queryBuilder = this.assessmentRepository
      .createQueryBuilder('Assessment')
      .select([
        'Assessment.AVA_ID',
        'AVA_TES.TES_ID',
        'AVA_TES.TES_NOME',
        'TES_DIS.DIS_NOME',
        'TES_DIS.DIS_TIPO',
      ])
      .innerJoinAndSelect('Assessment.AVA_TES', 'AVA_TES')
      .leftJoinAndSelect('AVA_TES.TES_DIS', 'TES_DIS')
      .innerJoin('Assessment.AVA_AVM', 'AVA_AVM')
      .innerJoin('AVA_AVM.AVM_MUN', 'AVM_MUN', 'AVM_MUN.MUN_ID = :county', {
        county,
      })
      .andWhere('AVA_TES.TES_SER_ID = :serieId', { serieId: serie })
      .andWhere('Assessment.AVA_ANO = :year', { year })

    if (typeSchool) {
      queryBuilder.andWhere('AVA_AVM.AVM_TIPO = :typeSchool', {
        typeSchool,
      })
    }

    const assessments = await queryBuilder.getMany()

    const exams = []
    assessments.forEach((assessment) => {
      if (assessment.AVA_TES) {
        exams.push(...assessment.AVA_TES)
      }
    })

    return {
      exams,
    }
  }

  async getDataReports(paginationParams: PaginationParams) {
    const {
      county,
      school,
      serie,
      year,
      municipalityOrUniqueRegionalId,
      typeSchool,
      verifyProfileForState,
    } = paginationParams

    const queryBuilder = this.reportEditionRepository
      .createQueryBuilder('ReportEdition')
      .addSelect(['ReportEdition.id'])
      .addSelect([
        'test.TES_ID',
        'edition.AVA_ID',
        'edition.AVA_NOME',
        'serie.SER_ID',
        'serie.SER_NUMBER',
      ])
      .innerJoinAndSelect('ReportEdition.edition', 'edition')
      .innerJoinAndSelect(
        'ReportEdition.reportsSubjects',
        'reportsSubjects',
        'reportsSubjects.countTotalStudents > 0',
      )
      .innerJoin('reportsSubjects.test', 'test')
      .innerJoin('test.TES_SER', 'serie')
      .andWhere('test.TES_SER = :serieId', { serieId: serie })
      .andWhere('edition.AVA_ANO = :year', { year })

    if (typeSchool) {
      queryBuilder.andWhere('ReportEdition.type = :type', {
        type: typeSchool,
      })
    }

    if (school) {
      queryBuilder
        .addSelect(['schoolClass.TUR_ID', 'schoolClass.TUR_NOME'])
        .innerJoin('ReportEdition.schoolClass', 'schoolClass')
        .innerJoin('schoolClass.TUR_MUN', 'county')
        .andWhere('schoolClass.TUR_ESC_ID = :schoolId', {
          schoolId: school,
        })
    } else if (municipalityOrUniqueRegionalId) {
      queryBuilder
        .addSelect(['school.ESC_ID', 'school.ESC_NOME', 'school.ESC_TIPO'])
        .innerJoin('ReportEdition.school', 'school')
        .innerJoin('school.ESC_MUN', 'county')
        .andWhere('county.MUN_ID = :county', { county })
        .andWhere('school.regionalId = :municipalityOrUniqueRegionalId', {
          municipalityOrUniqueRegionalId,
        })
    } else if (county) {
      queryBuilder
        .addSelect(['regional.id', 'regional.name'])
        .innerJoin('ReportEdition.regional', 'regional')
        .innerJoin('regional.county', 'county')
        .andWhere('regional.countyId = :countyId', {
          countyId: county,
        })
    }

    if (!typeSchool && verifyProfileForState) {
      queryBuilder.andWhere(
        `((ReportEdition.type = '${TypeSchoolEnum.ESTADUAL}') or (ReportEdition.type = '${TypeSchoolEnum.MUNICIPAL}' && county.MUN_COMPARTILHAR_DADOS IS TRUE))`,
      )
    }

    if (verifyProfileForState && typeSchool === TypeSchoolEnum.MUNICIPAL) {
      queryBuilder.andWhere('county.MUN_COMPARTILHAR_DADOS IS TRUE')
    }

    const reports = await queryBuilder.getMany()

    return {
      reports,
    }
  }
}
