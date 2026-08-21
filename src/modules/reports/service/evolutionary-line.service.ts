import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { PaginationParams } from 'src/helpers/params'
import { Assessment } from 'src/modules/assessment/model/entities/assessment.entity'
import { StudentTestAnswer } from 'src/modules/release-results/model/entities/student-test-answer.entity'
import { TestTemplate } from 'src/modules/test/model/entities/test-template.entity'
import { User } from 'src/modules/user/model/entities/user.entity'
import { isAnswerCorrect } from 'src/utils/is-answer-correct'
import { Repository } from 'typeorm'

import { EvolutionaryLineRepository } from '../repositories/evolutionary-line.repository'

@Injectable()
export class EvolutionaryLineService {
  constructor(
    @InjectRepository(Assessment)
    private assessmentRepository: Repository<Assessment>,

    private readonly evolutionaryLineRepository: EvolutionaryLineRepository,
  ) {}

  async evolutionaryLine(
    paginationParams: PaginationParams,
    user: User,
    reportByRelease?: boolean,
  ) {
    const { currentSerie, reports } =
      await this.evolutionaryLineRepository.getDataReports(
        paginationParams,
        user,
        false,
      )

    const typeLevelCountStudents = reportByRelease
      ? 'countStudentsLaunched'
      : 'countPresentStudents'

    const items = reports.map((reportEdition) => {
      const subjects = reportEdition.reportsSubjects.map((reportSubject) => {
        const test = reportSubject.test

        if (test.TES_DIS.DIS_TIPO === 'Objetiva') {
          const value = Math.round(
            +reportSubject.totalGradesStudents /
              +reportSubject[typeLevelCountStudents],
          )

          return {
            id: test.TES_DIS.DIS_ID,
            name: test.TES_DIS.DIS_NOME,
            color: test.TES_DIS?.DIS_COLOR,
            countLaunched: +reportSubject[typeLevelCountStudents],
            percentageRightQuestions: value || 0,
            totalStudents: +reportSubject.countTotalStudents,
            percentageFinished:
              +reportSubject.countTotalStudents > 0
                ? (+reportSubject[typeLevelCountStudents] /
                    +reportSubject.countTotalStudents) *
                  100
                : 0,
          }
        } else {
          let rightQuestions = 0
          switch (currentSerie.SER_NUMBER) {
            case 1:
              rightQuestions =
                +reportSubject.fluente +
                +reportSubject.nao_fluente +
                +reportSubject.frases
              break
            case 2:
            case 3:
              rightQuestions =
                +reportSubject.fluente + +reportSubject.nao_fluente
              break
            default:
              rightQuestions = +reportSubject.fluente
              break
          }

          const totalRightQuestions = Math.round(
            (rightQuestions / +reportSubject.countTotalStudents) * 100,
          )
          return {
            id: test.TES_DIS.DIS_ID,
            name: test.TES_DIS.DIS_NOME,
            color: test.TES_DIS?.DIS_COLOR,
            countLaunched: +reportSubject[typeLevelCountStudents],
            percentageRightQuestions: +totalRightQuestions || 0,
            totalStudents: +reportSubject.countTotalStudents,
            percentageFinished:
              reportSubject.countTotalStudents > 0
                ? (+reportSubject[typeLevelCountStudents] /
                    +reportSubject.countTotalStudents) *
                  100
                : 0,
          }
        }
      })

      return {
        id: reportEdition.edition.AVA_ID,
        name: reportEdition.edition.AVA_NOME,
        subjects,
      }
    })

    return { items }
  }

  async evolutionaryLineByStudent(year: string, studentId: string) {
    const queryBuilder = this.assessmentRepository
      .createQueryBuilder('Assessment')
      .select([
        'Assessment.AVA_ID',
        'Assessment.AVA_NOME',
        'AVA_TES.TES_ID',
        'TES_DIS.DIS_ID',
        'TES_DIS.DIS_NOME',
        'TES_DIS.DIS_TIPO',
        'TES_DIS.DIS_COLOR',
        'STUDENTS_TEST.ALT_JUSTIFICATIVA',
        'STUDENTS_TEST.ALT_DT_ATUALIZACAO',
        'STUDENTS_TEST.ALT_FINALIZADO',
        'TEMPLATE_TEST.TEG_ID',
        'TEMPLATE_TEST.TEG_ANULADA',
        'ANSWERS_TEST.ATR_ID',
        'ANSWERS_TEST.ATR_RESPOSTA',
        'ANSWERS_TEST.ATR_CERTO',
        'questionTemplate.TEG_ID',
        'questionTemplate.TEG_RESPOSTA_CORRETA',
        'questionTemplate.TEG_ANULADA',
      ])

      .leftJoin('Assessment.AVA_TES', 'AVA_TES')
      .leftJoin('AVA_TES.STUDENTS_TEST', 'STUDENTS_TEST')
      .leftJoin('STUDENTS_TEST.ANSWERS_TEST', 'ANSWERS_TEST')
      .leftJoin('ANSWERS_TEST.questionTemplate', 'questionTemplate')
      .innerJoin(
        'STUDENTS_TEST.ALT_ALU',
        'ALT_ALU',
        'ALT_ALU.ALU_ID = :studentId',
        { studentId },
      )
      .leftJoin('AVA_TES.TES_DIS', 'TES_DIS')
      .leftJoin('AVA_TES.TEMPLATE_TEST', 'TEMPLATE_TEST')
      .where('Assessment.AVA_ANO = :year', { year })

    const data = await queryBuilder.getMany()

    const items = data.map((assessment) => {
      const subjects = assessment.AVA_TES.map((test) => {
        const student = test.STUDENTS_TEST[0] as any

        if (test.TES_DIS.DIS_TIPO === 'Objetiva') {
          const ANSWERS_VALID = test?.STUDENTS_TEST[0]?.ANSWERS_TEST?.filter(
            (a: StudentTestAnswer) => !a?.questionTemplate?.TEG_ANULADA,
          )

          const QUESTIONS_CERTA = ANSWERS_VALID?.reduce(
            (acc: number, cur: StudentTestAnswer) => {
              if (isAnswerCorrect(cur)) {
                return acc + 1
              } else {
                return acc
              }
            },
            0,
          )

          const validTotal =
            test?.TEMPLATE_TEST?.filter((t: TestTemplate) => !t.TEG_ANULADA)
              .length ?? 0

          const totalRightQuestions = validTotal
            ? Math.round((QUESTIONS_CERTA / validTotal) * 100)
            : 0

          const isParticipated = !!student.ALT_FINALIZADO

          return {
            id: test.TES_DIS.DIS_ID,
            name: test.TES_DIS.DIS_NOME,
            color: test.TES_DIS?.DIS_COLOR,
            date: student?.ALT_DT_ATUALIZACAO || null,
            isParticipated,
            totalRightQuestions: isParticipated ? totalRightQuestions : 0,
          }
        } else {
          const isParticipated =
            !!student?.ANSWERS_TEST?.length && !student.ALT_JUSTIFICATIVA

          const percentageRightQuestions =
            isParticipated &&
            student?.ANSWERS_TEST[0]?.ATR_RESPOSTA === 'fluente'
              ? 100
              : 0

          const readType = student?.ANSWERS_TEST[0]?.ATR_RESPOSTA

          return {
            id: test.TES_DIS.DIS_ID,
            name: test.TES_DIS.DIS_NOME,
            color: test.TES_DIS?.DIS_COLOR,
            date: student?.ALT_DT_ATUALIZACAO || null,
            isParticipated,
            readType,
            totalRightQuestions: percentageRightQuestions,
          }
        }
      })

      const filterSubjects = subjects.filter(function (a) {
        return (
          !this[JSON.stringify(a?.name)] &&
          (this[JSON.stringify(a?.name)] = true)
        )
      }, Object.create(null))

      return {
        id: assessment.AVA_ID,
        name: assessment.AVA_NOME,
        subjects: filterSubjects,
      }
    })

    return {
      items,
    }
  }
}
