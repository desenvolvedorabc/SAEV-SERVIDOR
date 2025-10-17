import { Injectable } from '@nestjs/common'
import { InjectConnection } from '@nestjs/typeorm'
import { Assessment } from 'src/modules/assessment/model/entities/assessment.entity'
import { AssessmentCounty } from 'src/modules/assessment/model/entities/assessment-county.entity'
import { County } from 'src/modules/counties/model/entities/county.entity'
import { HeadquarterTopicItem } from 'src/modules/headquarters/model/entities/headquarter-topic-item.entity'
import { StudentTest } from 'src/modules/release-results/model/entities/student-test.entity'
import { StudentTestAnswer } from 'src/modules/release-results/model/entities/student-test-answer.entity'
import { School } from 'src/modules/school/model/entities/school.entity'
import { SchoolAbsence } from 'src/modules/school-absences/model/entities/school-absences.entity'
import { Student } from 'src/modules/student/model/entities/student.entity'
import { Test } from 'src/modules/test/model/entities/test.entity'
import { Connection } from 'typeorm'

import { ExportEvaluationTemplate } from '../dto/export-evaluation-template.dto'
import { PaginationMicroDataDto } from '../dto/pagination-microdata.dto'
import {
  selectInfoInfrequency,
  selectInfoStudents,
} from '../utils/microdata-selects'

@Injectable()
export class MicrodataRepository {
  constructor(
    @InjectConnection()
    private readonly connection: Connection,
  ) {}

  async validateExistsAssessmentForTemplate({
    assessmentId,
    countyId,
    serieId,
    typeSchool,
  }: ExportEvaluationTemplate) {
    const assessmentCounty = await this.connection
      .getRepository(AssessmentCounty)
      .createQueryBuilder('AssessmentCounty')
      .innerJoinAndSelect('AssessmentCounty.AVM_AVA', 'AVM_AVA')
      .innerJoinAndSelect('AssessmentCounty.AVM_MUN', 'AVM_MUN')
      .innerJoinAndSelect(
        'AVM_AVA.AVA_TES',
        'AVA_TES',
        'AVA_TES.TES_SER = :serieId',
        { serieId },
      )
      .innerJoinAndSelect('AVA_TES.TES_SER', 'TES_SER')
      .innerJoinAndSelect('AVA_TES.TEMPLATE_TEST', 'TEMPLATE_TEST')
      .where('AssessmentCounty.AVM_AVA = :assessmentId', { assessmentId })
      .andWhere('AssessmentCounty.AVM_MUN = :countyId', { countyId })
      .andWhere('AssessmentCounty.AVM_TIPO = :type', { type: typeSchool })
      .getOne()

    return {
      assessmentCounty,
    }
  }

  async getAssessmentForExportEvaluationData({
    edition,
    year,
    typeSchool,
    county,
    stateId,
  }: PaginationMicroDataDto) {
    const assessmentsQueryBuilder = this.connection
      .getRepository(Assessment)
      .createQueryBuilder('Assessment')
      .select([
        'Assessment.AVA_ID',
        'Assessment.AVA_NOME',
        'Assessment.AVA_ANO',
        'AVA_TES.TES_ID',
        'AVA_TES.TES_NOME',
        'AVA_AVM.AVM_ID',
        'AVM_MUN.MUN_ID',
        'AVM_MUN.MUN_NOME',
        'AVM_MUN.MUN_COD_IBGE',
        'TES_SER.SER_ID',
        'TES_SER.SER_NUMBER',
        'TES_SER.SER_NOME',
        'TES_DIS.DIS_ID',
        'TES_DIS.DIS_NOME',
        'TEMPLATE_TEST.TEG_ID',
        'TEG_MTI.MTI_CODIGO',
        'MTI_MTO.MTO_ID',
      ])
      .innerJoin('Assessment.AVA_AVM', 'AVA_AVM')
      .innerJoin('AVA_AVM.AVM_MUN', 'AVM_MUN', 'AVM_MUN.stateId = :stateId', {
        stateId,
      })
      .innerJoin('Assessment.AVA_TES', 'AVA_TES')
      .innerJoin('AVA_TES.TES_SER', 'TES_SER')
      .innerJoin('AVA_TES.TES_DIS', 'TES_DIS')
      .leftJoin('AVA_TES.TEMPLATE_TEST', 'TEMPLATE_TEST')
      .leftJoin('TEMPLATE_TEST.TEG_MTI', 'TEG_MTI')
      .leftJoin('TEG_MTI.MTI_MTO', 'MTI_MTO')
      .where('Assessment.AVA_ANO = :year', { year })
      .andWhere('Assessment.AVA_ID = :edition', {
        edition,
      })
      .andWhere('AVA_AVM.AVM_TIPO = :typeSchool', { typeSchool })

    if (county) {
      assessmentsQueryBuilder.andWhere('AVM_MUN.MUN_ID = :county', { county })
    }

    const assessment = await assessmentsQueryBuilder.getOne()

    return {
      assessment,
    }
  }

  async getAssessmentForExportEvaluationDataStandardized({
    edition,
    year,
    typeSchool,
    county,
    stateId,
  }: PaginationMicroDataDto) {
    const assessmentsQueryBuilder = this.connection
      .getRepository(Assessment)
      .createQueryBuilder('Assessment')
      .select([
        'Assessment.AVA_ID',
        'Assessment.AVA_NOME',
        'Assessment.AVA_ANO',
        'AVA_TES.TES_ID',
        'AVA_TES.TES_NOME',
        'AVA_AVM.AVM_ID',
        'AVM_MUN.MUN_ID',
        'AVM_MUN.MUN_UF',
        'AVM_MUN.MUN_COD_IBGE',
        'TES_SER.SER_ID',
        'TES_SER.SER_NUMBER',
        'TES_SER.SER_NOME',
        'TES_DIS.DIS_ID',
        'TES_DIS.DIS_NOME',
        'TEMPLATE_TEST.TEG_ID',
        'TEMPLATE_TEST.TEG_ORDEM',
        'TEG_MTI.MTI_CODIGO',
      ])
      .innerJoin('Assessment.AVA_AVM', 'AVA_AVM')
      .innerJoin('AVA_AVM.AVM_MUN', 'AVM_MUN', 'AVM_MUN.stateId = :stateId', {
        stateId,
      })
      .innerJoin('Assessment.AVA_TES', 'AVA_TES')
      .innerJoin('AVA_TES.TES_SER', 'TES_SER')
      .innerJoin('AVA_TES.TES_DIS', 'TES_DIS')
      .leftJoin('AVA_TES.TEMPLATE_TEST', 'TEMPLATE_TEST')
      .leftJoin('TEMPLATE_TEST.TEG_MTI', 'TEG_MTI')
      .where('Assessment.AVA_ANO = :year', { year })
      .andWhere('Assessment.AVA_ID = :edition', {
        edition,
      })
      .andWhere('AVA_AVM.AVM_TIPO = :typeSchool', { typeSchool })

    if (county) {
      assessmentsQueryBuilder.andWhere('AVM_MUN.MUN_ID = :county', { county })
    }

    const assessment = await assessmentsQueryBuilder.getOne()

    return {
      assessment,
    }
  }

  async getStudentsTestForExportEvaluationData(
    { typeSchool, county, stateId }: PaginationMicroDataDto,
    testId: number,
    cursor: number,
    limit: number,
  ) {
    const studentTestQuery = this.connection
      .getRepository(StudentTest)
      .createQueryBuilder('StudentTest')
      .select([
        'StudentTest.ALT_ID as ALT_ID',
        'StudentTest.ALT_ATIVO as ALT_ATIVO',
        'StudentTest.ALT_FINALIZADO as ALT_FINALIZADO',
        'StudentTest.ALT_JUSTIFICATIVA as ALT_JUSTIFICATIVA',
        'ALT_ALU.ALU_ID as ALU_ID',
        'ALT_ALU.ALU_NOME as ALU_NOME',
        'ALU_PEL.PEL_NOME as PEL_NOME',
        'ALU_GEN.GEN_NOME as GEN_NOME',
        'TUR_ESC.ESC_ID as ESC_ID',
        'TUR_ESC.ESC_NOME as ESC_NOME',
        'TUR_ESC.ESC_INEP as ESC_INEP',
        'schoolClass.TUR_ID as TUR_ID',
        'schoolClass.TUR_NOME as TUR_NOME',
        'schoolClass.TUR_PERIODO as TUR_PERIODO',
      ])
      .innerJoin('StudentTest.ALT_ALU', 'ALT_ALU')
      .leftJoin('ALT_ALU.ALU_PEL', 'ALU_PEL')
      .leftJoin('ALT_ALU.ALU_GEN', 'ALU_GEN')
      .innerJoin('StudentTest.schoolClass', 'schoolClass')
      .innerJoin('schoolClass.TUR_ESC', 'TUR_ESC')
      .innerJoin('TUR_ESC.ESC_MUN', 'ESC_MUN', 'ESC_MUN.stateId = :stateId', {
        stateId,
      })
      .andWhere('StudentTest.ALT_TES = :testId', { testId })
      .andWhere('TUR_ESC.ESC_TIPO = :typeSchool', { typeSchool })
      .andWhere('StudentTest.ALT_ID > :cursor', { cursor })
      .orderBy('StudentTest.ALT_ID', 'ASC')
      .limit(limit)

    if (county) {
      studentTestQuery.andWhere('ESC_MUN.MUN_ID = :county', { county })
    }

    const studentsTest = await studentTestQuery.getRawMany()

    if (studentsTest.length === 0) {
      return { studentsTest: [] }
    }

    const altIds = studentsTest.map((s) => s.ALT_ID)

    const { answers } = await this.getAnswersTestByAltIds(altIds)

    const answersMap = new Map<number, any[]>()

    for (const ans of answers) {
      if (!answersMap.has(ans.ATR_ALT)) {
        answersMap.set(ans.ATR_ALT, [])
      }
      answersMap.get(ans.ATR_ALT).push(ans)
    }

    for (const student of studentsTest) {
      student.ANSWERS_TEST = answersMap.get(student.ALT_ID) || []
    }

    return {
      studentsTest,
    }
  }

  async getStudentsTestForExportEvaluationDataStandardized(
    { typeSchool, county, stateId }: PaginationMicroDataDto,
    testId: number,
    offset: number,
    limit: number,
  ) {
    const studentTestQuery = this.connection
      .getRepository(StudentTest)
      .createQueryBuilder('StudentTest')
      .select([
        'StudentTest.ALT_ID as ALT_ID',
        'StudentTest.ALT_ATIVO as ALT_ATIVO',
        'StudentTest.ALT_FINALIZADO as ALT_FINALIZADO',
        'StudentTest.ALT_JUSTIFICATIVA as ALT_JUSTIFICATIVA',
        'StudentTest.ALT_ALU_ID as ALU_ID',
        'StudentTest.schoolClassTURID as TUR_ID',
        'TUR_ESC.ESC_INEP as ESC_INEP',
        'schoolClass.TUR_PERIODO as TUR_PERIODO',
        'schoolClass.TUR_NOME as TUR_NOME',
      ])
      .innerJoin('StudentTest.schoolClass', 'schoolClass')
      .innerJoin('schoolClass.TUR_ESC', 'TUR_ESC')
      .innerJoin('TUR_ESC.ESC_MUN', 'ESC_MUN', 'ESC_MUN.stateId = :stateId', {
        stateId,
      })
      .andWhere('StudentTest.ALT_TES = :testId', { testId })
      .andWhere('TUR_ESC.ESC_TIPO = :typeSchool', { typeSchool })
      .offset(offset)
      .limit(limit)

    if (county) {
      studentTestQuery.andWhere('ESC_MUN.MUN_ID = :county', { county })
    }

    const studentsTest = await studentTestQuery.getRawMany()

    if (studentsTest.length === 0) {
      return { studentsTest: [] }
    }

    const altIds = studentsTest.map((s) => s.ALT_ID)

    const { answers } = await this.getAnswersTestByAltIds(altIds)

    const answersMap = new Map<number, any[]>()

    for (const ans of answers) {
      if (!answersMap.has(ans.ATR_ALT)) {
        answersMap.set(ans.ATR_ALT, [])
      }
      answersMap.get(ans.ATR_ALT).push(ans)
    }

    for (const student of studentsTest) {
      student.ANSWERS_TEST = answersMap.get(student.ALT_ID) || []
    }

    return {
      studentsTest,
    }
  }

  private async getAnswersTestByAltIds(altIds: any[]) {
    const answers = await this.connection
      .getRepository(StudentTestAnswer)
      .createQueryBuilder('ANSWERS_TEST')
      .select([
        'ANSWERS_TEST.ATR_ID as ATR_ID',
        'ANSWERS_TEST.ATR_ALT_ID as ATR_ALT',
        'ANSWERS_TEST.ATR_RESPOSTA as ATR_RESPOSTA',
        'ANSWERS_TEST.ATR_CERTO as ATR_CERTO',
        'ANSWERS_TEST.questionTemplateTEGID as TEG_ID',
      ])
      .where('ANSWERS_TEST.ATR_ALT_ID IN (:...altIds)', { altIds })
      .getRawMany()

    return {
      answers,
    }
  }

  async exportStudentsEvaluationTemplate(
    { countyId, serieId, typeSchool }: ExportEvaluationTemplate,
    assessmentCounty: AssessmentCounty,
  ) {
    const students = await this.connection
      .getRepository(Student)
      .createQueryBuilder('Student')
      .select([
        'Student.ALU_ID as ALU_ID',
        'Student.ALU_NOME as ALU_NOME',
        'ALU_ESC.ESC_ID as ESC_ID',
        'ALU_ESC.ESC_NOME as ESC_NOME',
        'ALU_TUR.TUR_ID as TUR_ID',
        'ALU_TUR.TUR_NOME as TUR_NOME',
      ])
      .innerJoin(
        'Student.ALU_ESC',
        'ALU_ESC',
        'ALU_ESC.ESC_TIPO = :typeSchool',
        { typeSchool },
      )
      .innerJoin('Student.ALU_TUR', 'ALU_TUR')
      .where('ALU_ESC.ESC_MUN = :countyId', { countyId })
      .andWhere('Student.ALU_ATIVO = TRUE')
      .andWhere('ALU_TUR.TUR_SER = :serieId', { serieId })
      .andWhere('ALU_TUR.TUR_ANO = :year', {
        year: assessmentCounty.AVM_AVA.AVA_ANO,
      })
      .orderBy('Student.ALU_NOME', 'ASC')
      .getRawMany()

    return {
      students,
    }
  }

  async exportInfrequencyData({
    county,
    typeSchool,
    stateId,
    year,
  }: PaginationMicroDataDto) {
    const queryBuilder = this.connection
      .getRepository(SchoolAbsence)
      .createQueryBuilder('SchoolAbsence')
      .select(selectInfoInfrequency)
      .innerJoin('SchoolAbsence.IFR_ALU', 'IFR_ALU')
      .innerJoin('IFR_ALU.ALU_ESC', 'ALU_ESC')
      .innerJoin('ALU_ESC.ESC_MUN', 'ESC_MUN')
      .leftJoin('IFR_ALU.ALU_GEN', 'ALU_GEN')
      .leftJoin('IFR_ALU.ALU_PEL', 'ALU_PEL')
      .leftJoin('IFR_ALU.ALU_SER', 'ALU_SER')
      .leftJoin('IFR_ALU.ALU_TUR', 'ALU_TUR')
      .where('ESC_MUN.stateId = :stateId', { stateId })
      .andWhere('ALU_ESC.ESC_TIPO = :typeSchool', { typeSchool })

    if (county) {
      queryBuilder.andWhere('ESC_MUN.MUN_ID = :county', { county })
    }

    if (typeSchool) {
      queryBuilder.andWhere('ALU_ESC.ESC_TIPO = :typeSchool', {
        typeSchool,
      })
    }

    if (year) {
      queryBuilder.andWhere('SchoolAbsence.IFR_ANO = :year', { year })
    }

    const infrequency = await queryBuilder.getRawMany()

    return {
      infrequency,
    }
  }

  async getSchoolsForExport({
    county,
    typeSchool,
    stateId,
  }: PaginationMicroDataDto) {
    const queryBuilder = this.connection
      .getRepository(School)
      .createQueryBuilder('School')
      .select([
        'School.ESC_ID as ESC_ID',
        'School.ESC_NOME as ESC_NOME',
        'School.ESC_UF as ESC_UF',
        'School.ESC_INEP as ESC_INEP',
        'School.ESC_TIPO as ESC_TIPO',
      ])
      .innerJoin('School.ESC_MUN', 'ESC_MUN')
      .where('ESC_MUN.stateId = :stateId', { stateId })

    if (typeSchool) {
      queryBuilder.andWhere('School.ESC_TIPO = :typeSchool', {
        typeSchool,
      })
    }

    if (county) {
      queryBuilder.andWhere('ESC_MUN.MUN_ID = :county', {
        county,
      })
    }

    const schools = await queryBuilder.getRawMany()

    return {
      schools,
    }
  }

  async getCountiesForExport({ county, stateId }: PaginationMicroDataDto) {
    const queryBuilder = this.connection
      .getRepository(County)
      .createQueryBuilder('County')
      .select([
        'County.MUN_ID as MUN_ID',
        'County.MUN_NOME as MUN_NOME',
        'County.MUN_COD_IBGE as MUN_COD_IBGE',
        'County.MUN_UF as MUN_UF',
      ])
      .where('County.stateId = :stateId', { stateId })

    if (county) {
      queryBuilder.andWhere('County.MUN_ID = :county', {
        county,
      })
    }

    const counties = await queryBuilder.getRawMany()

    return {
      counties,
    }
  }

  async getTestsForExport({ edition }: PaginationMicroDataDto) {
    const queryBuilder = this.connection
      .getRepository(Test)
      .createQueryBuilder('Test')
      .select([
        'Test.TES_ID as TES_ID',
        'Test.TES_NOME as TES_NOME',
        'Test.TES_ANO as TES_ANO',
        'TES_DIS.DIS_ID as DIS_ID',
        'TES_DIS.DIS_NOME as DIS_NOME',
      ])
      .innerJoin('Test.TES_DIS', 'TES_DIS')
      .innerJoin(
        'Test.TES_ASSESMENTS',
        'TES_ASSESMENTS',
        'TES_ASSESMENTS.AVA_ID = :edition',
        { edition },
      )

    const tests = await queryBuilder.getRawMany()

    return {
      tests,
    }
  }

  async getDescriptorsForExport({ edition }: PaginationMicroDataDto) {
    const queryBuilder = this.connection
      .getRepository(HeadquarterTopicItem)
      .createQueryBuilder('HeadquarterTopicItem')
      .select([
        'HeadquarterTopicItem.MTI_ID as MTI_ID',
        'HeadquarterTopicItem.MTI_CODIGO as MTI_CODIGO',
        'HeadquarterTopicItem.MTI_DESCRITOR as MTI_DESCRITOR',
        'MTI_MTO.MTO_ID as MTO_ID',
        'MTI_MTO.MTO_NOME as MTO_NOME',
        'MTO_MAR.MAR_ID as MAR_ID',
        'MTO_MAR.MAR_NOME as MAR_NOME',
      ])
      .innerJoin('HeadquarterTopicItem.MTI_MTO', 'MTI_MTO')
      .innerJoin('MTI_MTO.MTO_MAR', 'MTO_MAR')
      .innerJoin('HeadquarterTopicItem.testsTemplate', 'testsTemplate')
      .innerJoin('testsTemplate.TEG_TES', 'TEG_TES')
      .innerJoin(
        'TEG_TES.TES_ASSESMENTS',
        'TES_ASSESMENTS',
        'TES_ASSESMENTS.AVA_ID = :edition',
        { edition },
      )

    const descriptors = await queryBuilder.getRawMany()

    return {
      descriptors,
    }
  }

  async exportStudentsData(
    { county, typeSchool, stateId }: PaginationMicroDataDto,
    offset: number,
    limit: number,
  ) {
    const queryBuilder = this.connection
      .getRepository(Student)
      .createQueryBuilder('Student')
      .select(selectInfoStudents)
      .distinct(true)
      .innerJoin('Student.ALU_ESC', 'ALU_ESC')
      .innerJoin('ALU_ESC.ESC_MUN', 'ESC_MUN')
      .leftJoin('Student.ALU_GEN', 'ALU_GEN')
      .leftJoin('Student.ALU_PEL', 'ALU_PEL')
      .leftJoin('Student.ALU_SER', 'ALU_SER')
      .leftJoin('Student.ALU_TUR', 'ALU_TUR')
      .where('ESC_MUN.stateId = :stateId', { stateId })

      .offset(offset)
      .limit(limit)

    if (typeSchool) {
      queryBuilder.andWhere('ALU_ESC.ESC_TIPO = :typeSchool', {
        typeSchool,
      })
    }

    if (county) {
      queryBuilder.andWhere('ESC_MUN.MUN_ID = :county', {
        county,
      })
    }

    const students = await queryBuilder.getRawMany()

    return {
      students,
    }
  }

  async getAssessmentsForTemplate({
    assessmentId,
    countyId,
    serieId,
    stateId,
    typeSchool,
  }: ExportEvaluationTemplate) {
    const queryBuilder = this.connection
      .getRepository(AssessmentCounty)
      .createQueryBuilder('AssessmentCounty')
      .select([
        'AssessmentCounty.AVM_ID',
        'AVM_MUN.MUN_ID',
        'AVM_MUN.MUN_NOME',
        'AVM_AVA.AVA_ID',
        'AVM_AVA.AVA_NOME',
        'AVM_AVA.AVA_ANO',
        'AVA_TES.TES_ID',
        'AVA_TES.TES_NOME',
        'TES_SER.SER_ID',
        'TES_SER.SER_NOME',
        'TES_SER.SER_NUMBER',
      ])
      .innerJoin('AssessmentCounty.AVM_AVA', 'AVM_AVA')
      .innerJoin('AssessmentCounty.AVM_MUN', 'AVM_MUN')
      .innerJoin('AVM_AVA.AVA_TES', 'AVA_TES', 'AVA_TES.TES_SER = :serieId', {
        serieId,
      })
      .innerJoin('AVA_TES.TES_SER', 'TES_SER')
      .innerJoinAndSelect('AVA_TES.TEMPLATE_TEST', 'TEMPLATE_TEST')
      .where('AssessmentCounty.AVM_AVA = :assessmentId', { assessmentId })
      .andWhere('AVM_MUN.stateId = :stateId', { stateId })
      .andWhere('AssessmentCounty.AVM_TIPO = :type', { type: typeSchool })

    if (countyId) {
      queryBuilder.andWhere('AssessmentCounty.AVM_MUN = :countyId', {
        countyId,
      })
    }

    const assessmentsCounty = await queryBuilder.getMany()

    return {
      assessmentsCounty,
    }
  }
}
