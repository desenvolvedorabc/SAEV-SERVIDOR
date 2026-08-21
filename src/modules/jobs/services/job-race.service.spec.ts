import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { TypeAssessmentEnum } from 'src/modules/assessment/model/enum/type-assessment.enum'
import { StudentTest } from 'src/modules/release-results/model/entities/student-test.entity'
import { StudentTestAnswer } from 'src/modules/release-results/model/entities/student-test-answer.entity'
import { ReportRace } from 'src/modules/reports/model/entities/report-race.entity'
import { ReportSubject } from 'src/modules/reports/model/entities/report-subject.entity'
import { Student } from 'src/modules/student/model/entities/student.entity'
import { SubjectTypeEnum } from 'src/modules/subject/model/enum/subject-type.enum'
import { Skin } from 'src/modules/teacher/model/entities/skin.entity'
import { Connection, Repository } from 'typeorm'

import { JobRaceService } from './job-race.service'
import { JobRaceRepository } from './repositories/job-race.repository'

type MockRepo<T = any> = Partial<Record<keyof Repository<T>, jest.Mock>>
const mockRepo = <T = any>(): MockRepo<T> => ({
  create: jest.fn().mockReturnValue({}),
  save: jest.fn().mockResolvedValue({ id: 1 }),
  find: jest.fn().mockResolvedValue([]),
})

const makeRace = (id: number, nome: string) =>
  ({ PEL_ID: id, PEL_NOME: nome, PEL_ATIVO: 1 }) as unknown as Skin

const makeStudent = (aluId: number, pelId: number) =>
  ({
    ALU_ID: aluId,
    ALU_PEL: { PEL_ID: pelId },
  }) as unknown as Student

const makeAnswer = (
  resposta: string,
  gabarito: string,
  anulada = false,
): StudentTestAnswer =>
  ({
    ATR_RESPOSTA: resposta,
    questionTemplate: {
      TEG_ID: 1,
      TEG_RESPOSTA_CORRETA: gabarito,
      TEG_ANULADA: anulada,
    },
  }) as StudentTestAnswer

const makeSubmission = (
  aluId: number,
  pelId: number,
  finalizado: boolean,
  answers: StudentTestAnswer[],
): StudentTest =>
  ({
    ALT_FINALIZADO: finalizado ? 1 : 0,
    ALT_ALU: { ALU_ID: aluId, ALU_PEL: { PEL_ID: pelId } },
    ANSWERS_TEST: answers,
  }) as unknown as StudentTest

describe('JobRaceService', () => {
  let service: JobRaceService
  let reportRacesRepository: MockRepo<ReportRace>
  let connection: { getRepository: jest.Mock }
  let jobRaceRepository: {
    getReportRaceGroupedByCounty: jest.Mock
    getReportRaceGroupedByTestAndSchoolClass: jest.Mock
    getReportEditionGroupedByMunicipalityRegional: jest.Mock
  }

  beforeEach(async () => {
    reportRacesRepository = mockRepo()
    jobRaceRepository = {
      getReportRaceGroupedByCounty: jest.fn().mockResolvedValue([]),
      getReportRaceGroupedByTestAndSchoolClass: jest.fn().mockResolvedValue([]),
      getReportEditionGroupedByMunicipalityRegional: jest
        .fn()
        .mockResolvedValue([]),
    }
    connection = {
      getRepository: jest
        .fn()
        .mockReturnValue({ find: jest.fn().mockResolvedValue([]) }),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobRaceService,
        { provide: Connection, useValue: connection },
        {
          provide: getRepositoryToken(ReportRace),
          useValue: reportRacesRepository,
        },
        { provide: JobRaceRepository, useValue: jobRaceRepository },
      ],
    }).compile()

    service = module.get<JobRaceService>(JobRaceService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('generateReportRacesBySchoolClass', () => {
    it('não salva nada quando não há raças ativas cadastradas', async () => {
      connection.getRepository.mockReturnValue({
        find: jest.fn().mockResolvedValue([]),
      })

      await service.generateReportRacesBySchoolClass({
        reportSubject: { id: 1 } as ReportSubject,
        students: [],
        studentSubmissions: [],
        exam: { TES_DIS: { DIS_TIPO: SubjectTypeEnum.OBJETIVA } } as any,
      })

      expect(reportRacesRepository.save).not.toHaveBeenCalled()
    })

    it('OBJETIVA: calcula acertos e salva um ReportRace por raça', async () => {
      const races = [makeRace(1, 'Parda'), makeRace(2, 'Branca')]
      connection.getRepository.mockReturnValue({
        find: jest.fn().mockResolvedValue(races),
      })
      reportRacesRepository.create.mockReturnValue({})

      const students = [makeStudent(10, 1), makeStudent(11, 2)]
      const submissions = [
        makeSubmission(10, 1, true, [makeAnswer('A', 'A')]), // acertou
        makeSubmission(11, 2, true, [makeAnswer('B', 'A')]), // errou
      ]

      await service.generateReportRacesBySchoolClass({
        reportSubject: { id: 1 } as ReportSubject,
        students,
        studentSubmissions: submissions,
        exam: { TES_DIS: { DIS_TIPO: SubjectTypeEnum.OBJETIVA } } as any,
      })

      expect(reportRacesRepository.save).toHaveBeenCalledTimes(2)
      // Raça 1 (Parda): 1 aluno, 1 acerto → 100%
      const callParda = reportRacesRepository.create.mock.calls[0][0]
      expect(callParda.countTotalStudents).toBe(1)
      expect(callParda.totalGradesStudents).toBe(100)
      // Raça 2 (Branca): 1 aluno, 0 acertos → 0%
      const callBranca = reportRacesRepository.create.mock.calls[1][0]
      expect(callBranca.totalGradesStudents).toBe(0)
    })

    it('OBJETIVA: exclui questões anuladas do cálculo', async () => {
      const races = [makeRace(1, 'Parda')]
      connection.getRepository.mockReturnValue({
        find: jest.fn().mockResolvedValue(races),
      })
      reportRacesRepository.create.mockReturnValue({})

      const students = [makeStudent(10, 1)]
      const submissions = [
        makeSubmission(10, 1, true, [
          makeAnswer('A', 'A'), // válida, acertou
          makeAnswer('B', 'C', true), // anulada — não conta
        ]),
      ]

      await service.generateReportRacesBySchoolClass({
        reportSubject: { id: 1 } as ReportSubject,
        students,
        studentSubmissions: submissions,
        exam: { TES_DIS: { DIS_TIPO: SubjectTypeEnum.OBJETIVA } } as any,
      })

      const call = reportRacesRepository.create.mock.calls[0][0]
      expect(call.totalGradesStudents).toBe(100) // 1/1 válida = 100%
    })

    it('LEITURA: conta categorias por raça corretamente', async () => {
      const races = [makeRace(1, 'Parda')]
      connection.getRepository.mockReturnValue({
        find: jest.fn().mockResolvedValue(races),
      })
      reportRacesRepository.create.mockReturnValue({})

      const students = [
        makeStudent(10, 1),
        makeStudent(11, 1),
        makeStudent(12, 1),
      ]
      const submissions = [
        {
          ALT_FINALIZADO: 1,
          ALT_ALU: { ALU_ID: 10, ALU_PEL: { PEL_ID: 1 } },
          ANSWERS_TEST: [{ ATR_RESPOSTA: 'fluente' }],
        } as unknown as StudentTest,
        {
          ALT_FINALIZADO: 1,
          ALT_ALU: { ALU_ID: 11, ALU_PEL: { PEL_ID: 1 } },
          ANSWERS_TEST: [{ ATR_RESPOSTA: 'palavras' }],
        } as unknown as StudentTest,
        {
          ALT_FINALIZADO: 0,
          ALT_ALU: { ALU_ID: 12, ALU_PEL: { PEL_ID: 1 } },
          ANSWERS_TEST: [],
        } as unknown as StudentTest,
      ]

      await service.generateReportRacesBySchoolClass({
        reportSubject: { id: 1 } as ReportSubject,
        students,
        studentSubmissions: submissions,
        exam: { TES_DIS: { DIS_TIPO: SubjectTypeEnum.LEITURA } } as any,
      })

      const call = reportRacesRepository.create.mock.calls[0][0]
      expect(call.countTotalStudents).toBe(3)
      expect(call.countStudentsLaunched).toBe(3)
      expect(call.countPresentStudents).toBe(2)
      expect((call as any).fluente ?? call.fluente).toBeDefined()
    })

    it('pula raças com tipo desconhecido sem salvar', async () => {
      const races = [makeRace(1, 'Parda')]
      connection.getRepository.mockReturnValue({
        find: jest.fn().mockResolvedValue(races),
      })

      await service.generateReportRacesBySchoolClass({
        reportSubject: { id: 1 } as ReportSubject,
        students: [makeStudent(10, 1)],
        studentSubmissions: [makeSubmission(10, 1, true, [])],
        exam: { TES_DIS: { DIS_TIPO: 'DESCONHECIDO' } } as any,
      })

      expect(reportRacesRepository.save).not.toHaveBeenCalled()
    })
  })

  describe('generateReportEditionsByCounty', () => {
    it('não salva nada quando repositório retorna vazio', async () => {
      await service.generateReportEditionsByCounty(
        10,
        42,
        1,
        TypeAssessmentEnum.MUNICIPAL,
      )

      expect(reportRacesRepository.save).not.toHaveBeenCalled()
    })

    it('cria e salva um ReportRace por linha retornada', async () => {
      jobRaceRepository.getReportRaceGroupedByCounty.mockResolvedValue([
        {
          name: 'Parda',
          countTotalStudents: 10,
          countStudentsLaunched: 8,
          totalGradesStudents: 700,
          countPresentStudents: 7,
          fluente: 0,
          nao_fluente: 0,
          frases: 0,
          palavras: 0,
          silabas: 0,
          nao_leitor: 0,
          nao_avaliado: 0,
          nao_informado: 0,
          PEL_ID: 1,
        },
        {
          name: 'Branca',
          countTotalStudents: 5,
          countStudentsLaunched: 5,
          totalGradesStudents: 400,
          countPresentStudents: 4,
          fluente: 0,
          nao_fluente: 0,
          frases: 0,
          palavras: 0,
          silabas: 0,
          nao_leitor: 0,
          nao_avaliado: 0,
          nao_informado: 0,
          PEL_ID: 2,
        },
      ])
      reportRacesRepository.create.mockReturnValue({})

      await service.generateReportEditionsByCounty(
        10,
        42,
        1,
        TypeAssessmentEnum.MUNICIPAL,
      )

      expect(reportRacesRepository.save).toHaveBeenCalledTimes(2)
    })
  })

  describe('generateReportEditionsBySchool', () => {
    it('cria e salva um ReportRace por linha retornada', async () => {
      jobRaceRepository.getReportRaceGroupedByTestAndSchoolClass.mockResolvedValue(
        [
          {
            name: 'Parda',
            countTotalStudents: 5,
            countStudentsLaunched: 4,
            totalGradesStudents: 300,
            countPresentStudents: 3,
            fluente: 0,
            nao_fluente: 0,
            frases: 0,
            palavras: 0,
            silabas: 0,
            nao_leitor: 0,
            nao_avaliado: 0,
            nao_informado: 0,
            PEL_ID: 1,
          },
        ],
      )
      reportRacesRepository.create.mockReturnValue({})

      await service.generateReportEditionsBySchool(
        20,
        42,
        1,
        TypeAssessmentEnum.MUNICIPAL,
      )

      expect(reportRacesRepository.save).toHaveBeenCalledTimes(1)
    })
  })

  describe('generateByMunicipalityRegional', () => {
    it('cria e salva um ReportRace por linha retornada', async () => {
      jobRaceRepository.getReportEditionGroupedByMunicipalityRegional.mockResolvedValue(
        [
          {
            name: 'Parda',
            countTotalStudents: 8,
            countStudentsLaunched: 7,
            totalGradesStudents: 600,
            countPresentStudents: 6,
            fluente: 0,
            nao_fluente: 0,
            frases: 0,
            palavras: 0,
            silabas: 0,
            nao_leitor: 0,
            nao_avaliado: 0,
            nao_informado: 0,
            PEL_ID: 1,
          },
        ],
      )
      reportRacesRepository.create.mockReturnValue({})

      await service.generateByMunicipalityRegional(
        30,
        42,
        1,
        TypeAssessmentEnum.MUNICIPAL,
      )

      expect(reportRacesRepository.save).toHaveBeenCalledTimes(1)
    })
  })
})
