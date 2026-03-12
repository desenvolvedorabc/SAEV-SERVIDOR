import { Injectable } from '@nestjs/common'
import { InjectConnection } from '@nestjs/typeorm'
import { Assessment } from 'src/modules/assessment/model/entities/assessment.entity'
import { AssessmentCounty } from 'src/modules/assessment/model/entities/assessment-county.entity'
import { StudentTest } from 'src/modules/release-results/model/entities/student-test.entity'
import { StudentTestAnswer } from 'src/modules/release-results/model/entities/student-test-answer.entity'
import { SchoolAbsence } from 'src/modules/school-absences/model/entities/school-absences.entity'
import { SubjectTypeEnum } from 'src/modules/subject/model/enum/subject-type.enum'
import { Test } from 'src/modules/test/model/entities/test.entity'
import { Connection } from 'typeorm'

import { AutomaticNotificationSend } from '../entities/automatic-notification-send.entity'
import { NotificationRuleMapper } from '../interfaces'

@Injectable()
export class StudentEligibilityService {
  constructor(
    @InjectConnection()
    private readonly connection: Connection,
  ) {}

  async getInfoAssessmentByRule(rule: NotificationRuleMapper) {
    const now = new Date()

    const data = await this.connection
      .getRepository(AssessmentCounty)
      .createQueryBuilder('Ac')
      .select([
        'Ac.AVM_ID',
        'AVM_AVA.AVA_ID',
        'AVM_AVA.AVA_NOME',
        'AVA_TES.TES_ID',
        'TES_DIS.DIS_TIPO',
      ])
      .innerJoin('Ac.AVM_AVA', 'AVM_AVA')
      .innerJoin('AVM_AVA.AVA_TES', 'AVA_TES')
      .innerJoin('AVA_TES.TES_DIS', 'TES_DIS')
      .where('Ac.AVM_MUN_ID = :countyId', { countyId: rule.countyId })
      .andWhere('Ac.AVM_TIPO = :type', { type: rule.typeSchool })
      .andWhere('Ac.AVM_DT_CRIACAO >= :date', {
        date: rule.date,
      })
      .andWhere('Ac.AVM_DT_FIM <= :now', { now })
      .orderBy('Ac.AVM_DT_CRIACAO', 'DESC')
      .getOne()

    return {
      data,
    }
  }

  async getStudentsWithLowPerformance(
    rule: NotificationRuleMapper,
    assessment: Assessment,
    test: Test,
  ) {
    const minimumPerformance = rule?.parameters?.minimumPerformance

    if (test.TES_DIS.DIS_TIPO !== SubjectTypeEnum.OBJETIVA) {
      return
    }

    if (minimumPerformance === null) {
      return
    }

    const testId = test.TES_ID
    const assessmentId = assessment.AVA_ID
    const assessmentName = assessment.AVA_NOME
    const ctx = `_rendimento_baixo_${assessmentId}`

    let results = await this.connection
      .getRepository(StudentTest)
      .createQueryBuilder('StudentTest')
      .select([
        'stu.ALU_ID as ALU_ID',
        'StudentTest.ALT_ID as altId',
        'stu.ALU_EMAIL as ALU_EMAIL',
        'stu.ALU_WHATSAPP  as ALU_WHATSAPP',
      ])
      .innerJoin(
        'StudentTest.ALT_ALU',
        'stu',
        '(stu.ALU_ATIVO IS TRUE and stu.ALU_ESC_ID = :schoolId)',
        { schoolId: rule.schoolId },
      )
      .leftJoin(
        AutomaticNotificationSend,
        'ans',
        `
               (ans.studentId = stu.ALU_ID
                AND ans.ruleType = :ruleType
                AND ans.contextHash = :ctx)
              `,
        { ruleType: rule.ruleType, ctx },
      )
      .where('StudentTest.ALT_TES_ID = :testId', { testId })
      .andWhere(
        "((stu.ALU_EMAIL IS NOT NULL and stu.ALU_EMAIL != '') or (stu.ALU_WHATSAPP IS NOT NULL and stu.ALU_WHATSAPP != ''))",
      )
      .groupBy('stu.ALU_ID')
      .having('COUNT(DISTINCT ans.id) = 0')
      .getRawMany()

    const verifyResults = await Promise.all(
      results?.map(async (item) => {
        const row = await this.connection
          .getRepository(StudentTestAnswer)
          .createQueryBuilder('ans')
          .innerJoin(StudentTest, 'st', 'st.ALT_ID = ans.ATR_ALT_ID')
          .where('ans.ATR_ALT_ID = :altId', { altId: item?.altId })
          .addSelect('COUNT(*)', 'total')
          .addSelect(
            'SUM(CASE WHEN ans.ATR_CERTO THEN 1 ELSE 0 END)',
            'correct',
          )
          .groupBy('ans.ATR_ALT_ID')
          .having('COUNT(*) > 0')
          .andHaving(
            '(SUM(CASE WHEN ans.ATR_CERTO THEN 1 ELSE 0 END) * 100) < (:minimumPerformance * COUNT(*))',
            {
              minimumPerformance,
            },
          )
          .getRawOne()

        return { ...item, verify: !!row }
      }),
    )

    results = verifyResults?.filter((result) => result?.verify)

    return results.map((result) => ({
      ...result,
      ctx,
      assessmentId,
      assessmentName,
      testId,
    }))
  }

  async getStudentsWithExcessiveAbsences(
    rule: NotificationRuleMapper,
  ): Promise<any[]> {
    const month = new Date().getMonth() + 1
    const year = new Date().getFullYear()

    const maxAbsences = rule?.parameters?.maximumFouls

    if (maxAbsences === null) {
      return
    }

    const ctx = `_faltas_${month}_${year}`

    const data = await this.connection
      .getRepository(SchoolAbsence)
      .createQueryBuilder('SchoolAbsence')
      .select([
        'stu.ALU_ID AS ALU_ID',
        'stu.ALU_WHATSAPP AS ALU_WHATSAPP',
        'stu.ALU_EMAIL AS ALU_EMAIL',
        'SchoolAbsence.IFR_FALTA AS totalFouls',
      ])
      .innerJoin(
        'SchoolAbsence.IFR_ALU',
        'stu',
        '(stu.ALU_ATIVO IS TRUE and stu.ALU_ESC_ID = :schoolId)',
        { schoolId: rule.schoolId },
      )
      .leftJoin(
        AutomaticNotificationSend,
        'ans',
        `
            ans.studentId = stu.ALU_ID
            AND ans.ruleType = :ruleType
            AND ans.contextHash = :ctx
          `,
        { ruleType: rule.ruleType, ctx },
      )
      .where('SchoolAbsence.IFR_MES = :month', { month })
      .andWhere('SchoolAbsence.IFR_ANO = :year', { year })
      .andWhere(
        "((stu.ALU_EMAIL IS NOT NULL and stu.ALU_EMAIL != '') or (stu.ALU_WHATSAPP IS NOT NULL and stu.ALU_WHATSAPP != ''))",
      )
      .groupBy('stu.ALU_ID')
      .having('SchoolAbsence.IFR_FALTA > :maxAbsences', { maxAbsences })
      .andHaving('COUNT(DISTINCT ans.id) = 0')
      .getRawMany()

    return data.map((result) => ({
      ...result,
      ctx,
      month,
      year,
    }))
  }

  async getStudentsWithTestResults(
    rule: NotificationRuleMapper,
    assessment: Assessment,
  ): Promise<any[]> {
    const assessmentId = assessment?.AVA_ID
    const assessmentName = assessment?.AVA_NOME

    const ctx = `_resultados_${assessmentId}`

    const query = this.connection
      .getRepository(StudentTest)
      .createQueryBuilder('StudentTest')
      .select([
        'stu.ALU_ID as ALU_ID',
        'stu.ALU_EMAIL as ALU_EMAIL',
        'stu.ALU_WHATSAPP  as ALU_WHATSAPP',
      ])
      .innerJoin(
        'StudentTest.ALT_ALU',
        'stu',
        '(stu.ALU_ATIVO IS TRUE and stu.ALU_ESC_ID = :schoolId)',
        { schoolId: rule.schoolId },
      )
      .leftJoin(
        AutomaticNotificationSend,
        'ans',
        `
              ans.studentId = stu.ALU_ID
              AND ans.ruleType = :ruleType
              AND ans.contextHash = :ctx
            `,
        { ruleType: rule.ruleType, ctx },
      )
      .innerJoin('StudentTest.ALT_TES', 'test')
      .innerJoin(
        'test.TES_ASSESMENTS',
        'TES_ASSESMENTS',
        'TES_ASSESMENTS.AVA_ID = :assessmentId',
        { assessmentId },
      )
      .andWhere(
        "((stu.ALU_EMAIL IS NOT NULL and stu.ALU_EMAIL != '') or (stu.ALU_WHATSAPP IS NOT NULL and stu.ALU_WHATSAPP != ''))",
      )
      .groupBy('stu.ALU_ID')
      .having('COUNT(DISTINCT ans.id) = 0')

    const results = await query.getRawMany()

    return results.map((result) => ({
      ...result,
      ctx,
      assessmentId,
      assessmentName,
    }))
  }
}
