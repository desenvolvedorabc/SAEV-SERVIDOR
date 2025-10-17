import { Injectable } from '@nestjs/common'
import { InjectConnection } from '@nestjs/typeorm'
import { PaginationParams } from 'src/helpers/params'
import { StudentTest } from 'src/modules/release-results/model/entities/student-test.entity'
import { TypeSchoolEnum } from 'src/modules/school/model/enum/type-school.enum'
import { Student } from 'src/modules/student/model/entities/student.entity'
import { paginateData } from 'src/utils/paginate-data'
import { Connection } from 'typeorm'

@Injectable()
export class PerformanceHistoryRepository {
  constructor(
    @InjectConnection()
    private readonly connection: Connection,
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
}
