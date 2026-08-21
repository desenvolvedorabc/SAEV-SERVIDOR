import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { Connection, Repository } from 'typeorm'

import { StudentTest } from '../../release-results/model/entities/student-test.entity'
import { StudentTestAnswer } from '../../release-results/model/entities/student-test-answer.entity'
import { ReportDescriptor } from '../../reports/model/entities/report-descriptor.entity'
import { ReportEdition } from '../../reports/model/entities/report-edition.entity'
import { ReportNotEvaluated } from '../../reports/model/entities/report-not-evaluated.entity'
import { ReportQuestion } from '../../reports/model/entities/report-question.entity'
import { ReportRace } from '../../reports/model/entities/report-race.entity'
import { ReportSubject } from '../../reports/model/entities/report-subject.entity'
import { SubjectTypeEnum } from '../../subject/model/enum/subject.enum'
import { Test as TestEntity } from '../../test/model/entities/test.entity'
import { JobDescriptorsService } from './job-descriptor.service'
import { JobNotEvaluatedService } from './job-not-evaluated.service'
import { JobQuestionService } from './job-question.service'
import { JobRaceService } from './job-race.service'
import { ReprocessSchoolClassService } from './reprocess-school-class.service'

type MockRepo<T = any> = Partial<Record<keyof Repository<T>, jest.Mock>>
const mockRepo = <T = any>(): MockRepo<T> => ({
  find: jest.fn(),
  save: jest.fn(),
  remove: jest.fn(),
})

const mockQb = () => ({
  select: jest.fn().mockReturnThis(),
  addSelect: jest.fn().mockReturnThis(),
  innerJoin: jest.fn().mockReturnThis(),
  innerJoinAndSelect: jest.fn().mockReturnThis(),
  leftJoin: jest.fn().mockReturnThis(),
  leftJoinAndSelect: jest.fn().mockReturnThis(),
  leftJoinAndMapMany: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  distinct: jest.fn().mockReturnThis(),
  getMany: jest.fn().mockResolvedValue([]),
  getOne: jest.fn().mockResolvedValue(null),
  getRawMany: jest.fn().mockResolvedValue([]),
})

const makeExam = (tipo: SubjectTypeEnum): TestEntity =>
  ({
    TES_ID: 42,
    TES_ANO: 2024,
    TES_SER: { SER_ID: 1 },
    TES_DIS: { DIS_ID: 1, DIS_NOME: 'Matemática', DIS_TIPO: tipo },
  }) as unknown as TestEntity

const makeAnswer = (
  tegId: number,
  resposta: string,
  gabarito: string,
  anulada = false,
): StudentTestAnswer =>
  ({
    ATR_RESPOSTA: resposta,
    questionTemplate: {
      TEG_ID: tegId,
      TEG_RESPOSTA_CORRETA: gabarito,
      TEG_ANULADA: anulada,
    },
  }) as StudentTestAnswer

const makeSubmission = (
  aluId: number,
  finalizado: boolean,
  answers: StudentTestAnswer[],
): StudentTest =>
  ({
    ALT_ALU: { ALU_ID: aluId },
    ALT_FINALIZADO: finalizado ? 1 : 0,
    ANSWERS_TEST: answers,
  }) as unknown as StudentTest

// Acessa métodos privados via any para testar lógica pura sem expor na API pública
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ServiceWithPrivate = any

describe('ReprocessSchoolClassService', () => {
  let service: ServiceWithPrivate
  let reportSubjectRepository: MockRepo<ReportSubject>
  let reportQuestionRepository: MockRepo<ReportQuestion>
  let reportRaceRepository: MockRepo<ReportRace>
  let reportDescriptorRepository: MockRepo<ReportDescriptor>
  let reportNotEvaluatedRepository: MockRepo<ReportNotEvaluated>
  let connection: { getRepository: jest.Mock }

  beforeEach(async () => {
    reportSubjectRepository = mockRepo()
    reportQuestionRepository = mockRepo()
    reportRaceRepository = mockRepo()
    reportDescriptorRepository = mockRepo()
    reportNotEvaluatedRepository = mockRepo()
    connection = {
      getRepository: jest.fn().mockReturnValue({
        createQueryBuilder: jest.fn().mockReturnValue(mockQb()),
      }),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReprocessSchoolClassService,
        { provide: Connection, useValue: connection },
        {
          provide: getRepositoryToken(ReportSubject),
          useValue: reportSubjectRepository,
        },
        {
          provide: getRepositoryToken(ReportQuestion),
          useValue: reportQuestionRepository,
        },
        {
          provide: getRepositoryToken(ReportRace),
          useValue: reportRaceRepository,
        },
        {
          provide: getRepositoryToken(ReportDescriptor),
          useValue: reportDescriptorRepository,
        },
        {
          provide: getRepositoryToken(ReportNotEvaluated),
          useValue: reportNotEvaluatedRepository,
        },
        {
          provide: JobNotEvaluatedService,
          useValue: {
            generateBySchoolClass: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: JobRaceService,
          useValue: {
            generateReportRacesBySchoolClass: jest
              .fn()
              .mockResolvedValue(undefined),
          },
        },
        {
          provide: JobDescriptorsService,
          useValue: {
            generateReportDescriptorBySchoolClass: jest
              .fn()
              .mockResolvedValue(undefined),
          },
        },
        {
          provide: JobQuestionService,
          useValue: {
            generateReportQuestionBySchoolClass: jest
              .fn()
              .mockResolvedValue(undefined),
          },
        },
      ],
    }).compile()

    service = module.get<ReprocessSchoolClassService>(
      ReprocessSchoolClassService,
    ) as ServiceWithPrivate
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('regenerate', () => {
    it('retorna sem fazer nada quando affectedTestIds é vazio', async () => {
      await service.regenerate(1, 100, 'URBANA' as any, [])

      expect(connection.getRepository).not.toHaveBeenCalled()
    })

    it('retorna sem processar quando não existem reportEditions de turma', async () => {
      // findSchoolClassReportEditions retorna []
      connection.getRepository.mockReturnValue({
        createQueryBuilder: jest.fn().mockReturnValue({
          ...mockQb(),
          getMany: jest.fn().mockResolvedValue([]),
        }),
      })

      await service.regenerate(1, 100, 'URBANA' as any, [42])

      expect(reportSubjectRepository.find).not.toHaveBeenCalled()
    })

    it('pula subject quando o exam não foi carregado no examsById', async () => {
      const edition = { id: 10, schoolClass: { TUR_ID: 5 } } as ReportEdition
      const subject = {
        id: 1,
        idStudents: ['1', '2'],
        test: { TES_ID: 99 }, // testId 99 não está em affectedTestIds [42]
      } as unknown as ReportSubject

      // primeira chamada: findSchoolClassReportEditions → retorna edition
      // segunda chamada: loadExamsById → retorna exam para testId 42
      let callCount = 0
      connection.getRepository.mockImplementation(() => ({
        createQueryBuilder: jest.fn().mockReturnValue({
          ...mockQb(),
          getMany: jest.fn().mockImplementation(() => {
            callCount++
            if (callCount === 1) return Promise.resolve([edition]) // reportEditions
            return Promise.resolve([makeExam(SubjectTypeEnum.OBJETIVA)]) // exams (testId 42)
          }),
        }),
      }))

      reportSubjectRepository.find.mockResolvedValue([subject])

      await service.regenerate(1, 100, 'URBANA' as any, [42])

      // reportSubjectRepository.save não deve ter sido chamado pois exam não foi encontrado
      expect(reportSubjectRepository.save).not.toHaveBeenCalled()
    })

    it('executa UPDATE in-place preservando idStudents e deletando filhos', async () => {
      const edition = { id: 10, schoolClass: { TUR_ID: 5 } } as ReportEdition
      const originalIds = ['1', '2', '3']
      const subject = {
        id: 7,
        idStudents: originalIds,
        test: { TES_ID: 42 },
      } as unknown as ReportSubject
      const exam = makeExam(SubjectTypeEnum.OBJETIVA)

      let callCount = 0
      connection.getRepository.mockImplementation(() => ({
        createQueryBuilder: jest.fn().mockReturnValue({
          ...mockQb(),
          getMany: jest.fn().mockImplementation(() => {
            callCount++
            if (callCount === 1) return Promise.resolve([edition])
            // loadExamsById: retorna exam com TES_ID=42
            return Promise.resolve([exam])
          }),
        }),
      }))

      reportSubjectRepository.find.mockResolvedValue([subject])
      reportSubjectRepository.save.mockResolvedValue({ ...subject, id: 7 })
      reportQuestionRepository.find.mockResolvedValue([])
      reportRaceRepository.find.mockResolvedValue([])
      reportDescriptorRepository.find.mockResolvedValue([])
      reportNotEvaluatedRepository.find.mockResolvedValue([])

      await service.regenerate(1, 100, 'URBANA' as any, [42])

      // Save foi chamado com os idStudents originais preservados
      expect(reportSubjectRepository.save).toHaveBeenCalledTimes(1)
      const saved = reportSubjectRepository.save.mock.calls[0][0]
      expect(saved.idStudents).toEqual(originalIds)
    })

    it('pula subject sem idStudents (relatório legado)', async () => {
      const edition = { id: 10, schoolClass: { TUR_ID: 5 } } as ReportEdition
      const subject = {
        id: 7,
        idStudents: [], // vazio → legado
        test: { TES_ID: 42 },
      } as unknown as ReportSubject
      const exam = makeExam(SubjectTypeEnum.OBJETIVA)

      let callCount = 0
      connection.getRepository.mockImplementation(() => ({
        createQueryBuilder: jest.fn().mockReturnValue({
          ...mockQb(),
          getMany: jest.fn().mockImplementation(() => {
            callCount++
            if (callCount === 1) return Promise.resolve([edition])
            return Promise.resolve([exam])
          }),
        }),
      }))

      reportSubjectRepository.find.mockResolvedValue([subject])

      await service.regenerate(1, 100, 'URBANA' as any, [42])

      expect(reportSubjectRepository.save).not.toHaveBeenCalled()
    })

    it('pula subject com tipo de disciplina não suportado', async () => {
      const edition = { id: 10, schoolClass: { TUR_ID: 5 } } as ReportEdition
      const subject = {
        id: 7,
        idStudents: ['1'],
        test: { TES_ID: 42 },
      } as unknown as ReportSubject
      const examUnknown = {
        ...makeExam(SubjectTypeEnum.OBJETIVA),
        TES_DIS: { DIS_TIPO: 'DESCONHECIDO' },
      } as unknown as TestEntity

      let callCount = 0
      connection.getRepository.mockImplementation(() => ({
        createQueryBuilder: jest.fn().mockReturnValue({
          ...mockQb(),
          getMany: jest.fn().mockImplementation(() => {
            callCount++
            if (callCount === 1) return Promise.resolve([edition])
            return Promise.resolve([examUnknown])
          }),
        }),
      }))

      reportSubjectRepository.find.mockResolvedValue([subject])

      await service.regenerate(1, 100, 'URBANA' as any, [42])

      expect(reportSubjectRepository.save).not.toHaveBeenCalled()
    })

    it('pula subject quando reportEdition não tem schoolClass', async () => {
      const editionSemTurma = {
        id: 10,
        schoolClass: null,
      } as unknown as ReportEdition
      const subject = {
        id: 7,
        idStudents: ['1'],
        test: { TES_ID: 42 },
      } as unknown as ReportSubject
      const exam = makeExam(SubjectTypeEnum.OBJETIVA)

      let callCount = 0
      connection.getRepository.mockImplementation(() => ({
        createQueryBuilder: jest.fn().mockReturnValue({
          ...mockQb(),
          getMany: jest.fn().mockImplementation(() => {
            callCount++
            if (callCount === 1) return Promise.resolve([editionSemTurma])
            return Promise.resolve([exam])
          }),
        }),
      }))

      reportSubjectRepository.find.mockResolvedValue([subject])

      await service.regenerate(1, 100, 'URBANA' as any, [42])

      expect(reportSubjectRepository.save).not.toHaveBeenCalled()
    })
  })

  describe('recalculateSubject — OBJETIVA', () => {
    const exam = makeExam(SubjectTypeEnum.OBJETIVA)

    it('conta totalStudents e countStudentsLaunched corretamente', () => {
      const submissions = [
        makeSubmission(1, true, [makeAnswer(1, 'A', 'A')]),
        makeSubmission(2, false, []),
      ]
      const subject = {} as ReportSubject

      const result = service.recalculateSubject(subject, exam, submissions, 5, [
        '1',
        '2',
        '3',
        '4',
        '5',
      ])

      expect(result.countTotalStudents).toBe(5)
      expect(result.countStudentsLaunched).toBe(2)
    })

    it('contabiliza apenas alunos finalizados como presentes', () => {
      const submissions = [
        makeSubmission(1, true, [makeAnswer(1, 'A', 'A')]),
        makeSubmission(2, false, []),
        makeSubmission(3, true, [makeAnswer(1, 'B', 'A')]),
      ]
      const subject = {} as ReportSubject

      const result = service.recalculateSubject(subject, exam, submissions, 3, [
        '1',
        '2',
        '3',
      ])

      expect(result.countPresentStudents).toBe(2)
    })

    it('calcula totalGradesStudents como soma de percentuais por aluno', () => {
      // aluno 1: 2/2 acertos = 100%; aluno 2: 1/2 acertos = 50%
      const submissions = [
        makeSubmission(1, true, [
          makeAnswer(1, 'A', 'A'),
          makeAnswer(2, 'B', 'B'),
        ]),
        makeSubmission(2, true, [
          makeAnswer(1, 'A', 'A'),
          makeAnswer(2, 'C', 'B'),
        ]),
      ]
      const subject = {} as ReportSubject

      const result = service.recalculateSubject(subject, exam, submissions, 2, [
        '1',
        '2',
      ])

      expect(result.totalGradesStudents).toBe(150) // 100 + 50
    })

    it('exclui questões anuladas do denominador e numerador', () => {
      // 1 questão válida (A=A) + 1 anulada → 1/1 = 100%
      const submissions = [
        makeSubmission(1, true, [
          makeAnswer(1, 'A', 'A'),
          makeAnswer(2, 'B', 'C', true), // anulada
        ]),
      ]
      const subject = {} as ReportSubject

      const result = service.recalculateSubject(subject, exam, submissions, 1, [
        '1',
      ])

      expect(result.totalGradesStudents).toBe(100)
    })

    it('preserva idStudents original sem modificar', () => {
      const originalIds = ['10', '20', '30']
      const subject = {
        idStudents: ['10', '20', '30'],
      } as unknown as ReportSubject

      const result = service.recalculateSubject(
        subject,
        exam,
        [],
        3,
        originalIds,
      )

      expect(result.idStudents).toEqual(originalIds)
    })

    it('zera grade quando todas as questões são anuladas', () => {
      const submissions = [
        makeSubmission(1, true, [makeAnswer(1, 'A', 'A', true)]),
      ]
      const subject = {} as ReportSubject

      const result = service.recalculateSubject(subject, exam, submissions, 1, [
        '1',
      ])

      expect(result.totalGradesStudents).toBe(0)
    })
  })

  describe('recalculateSubject — LEITURA', () => {
    const examLeitura = makeExam(SubjectTypeEnum.LEITURA)

    it('conta categorias de leitura corretamente', () => {
      const submissions = [
        makeSubmission(1, true, [
          { ATR_RESPOSTA: 'fluente' } as StudentTestAnswer,
        ]),
        makeSubmission(2, true, [
          { ATR_RESPOSTA: 'palavras' } as StudentTestAnswer,
        ]),
        makeSubmission(3, true, [
          { ATR_RESPOSTA: 'fluente' } as StudentTestAnswer,
        ]),
        makeSubmission(4, false, []), // não avaliado
      ]
      const subject = {} as ReportSubject

      const result = service.recalculateSubject(
        subject,
        examLeitura,
        submissions,
        5,
        ['1', '2', '3', '4', '5'],
      )

      expect(result.fluente).toBe(2)
      expect(result.palavras).toBe(1)
      expect(result.nao_avaliado).toBe(1) // finalizado=false
      expect(result.nao_informado).toBe(1) // 5 total - 4 lançados
      expect(result.countTotalStudents).toBe(5)
      expect(result.countStudentsLaunched).toBe(4)
      expect(result.countPresentStudents).toBe(3)
    })

    it('classifica como nao_avaliado aluno finalizado sem respostas', () => {
      const submissions = [
        makeSubmission(1, true, []), // finalizado mas sem resposta
      ]
      const subject = {} as ReportSubject

      const result = service.recalculateSubject(
        subject,
        examLeitura,
        submissions,
        1,
        ['1'],
      )

      expect(result.nao_avaliado).toBe(1)
      expect(result.countPresentStudents).toBe(0)
    })
  })
})
