import {
  ConflictException,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import {
  REPROCESS_DISPATCHER,
  ReprocessDispatcher,
} from 'src/modules/jobs/dispatcher/reprocess-dispatcher.interface'
import { AnswerKeyChangeLog } from 'src/modules/jobs/model/entities/answer-key-change-log.entity'
import { AnswerKeyChangeField } from 'src/modules/jobs/model/enums/answer-key-change-field.enum'
import { StudentTest } from 'src/modules/release-results/model/entities/student-test.entity'
import { StudentTestAnswer } from 'src/modules/release-results/model/entities/student-test-answer.entity'
import { Student } from 'src/modules/student/model/entities/student.entity'
import { Connection, Repository } from 'typeorm'

import { Test as TestEntity } from '../model/entities/test.entity'
import { TestTemplate } from '../model/entities/test-template.entity'
import { TestsService } from './tests.service'

type MockRepo<T = any> = Partial<Record<keyof Repository<T>, jest.Mock>>
const mockRepo = <T = any>(): MockRepo<T> => ({
  find: jest.fn(),
  findOne: jest.fn(),
  save: jest.fn(),
  delete: jest.fn(),
  update: jest.fn(),
  create: jest.fn(),
  createQueryBuilder: jest.fn(),
})

const mockDispatcher = (): jest.Mocked<ReprocessDispatcher> => ({
  scheduleDebounce: jest.fn(),
  scheduleExecute: jest.fn(),
})

const makeUser = () => ({ USU_ID: 1 }) as any

const makeTemplate = (overrides: Partial<TestTemplate> = {}): TestTemplate =>
  ({
    TEG_ID: 1,
    TEG_RESPOSTA_CORRETA: 'A',
    TEG_ORDEM: 1,
    TEG_ANULADA: false,
    TEG_NIVEL: null,
    TEG_MTI: { MTI_ID: 10 } as any,
    TEG_TES: { TES_ID: 42 } as any,
    ...overrides,
  }) as TestTemplate

const makeTest = (overrides: Partial<TestEntity> = {}): TestEntity =>
  ({
    TES_ID: 42,
    TES_NOME: 'Teste de Matemática',
    TES_ANO: '2024',
    TES_ATIVO: true,
    TES_DIS: { DIS_ID: 1 } as any,
    TES_SER: { SER_ID: 1 } as any,
    TES_TEG: [],
    ...overrides,
  }) as TestEntity

describe('TestsService', () => {
  let service: TestsService
  let testRepo: MockRepo<TestEntity>
  let testTemplatesRepo: MockRepo<TestTemplate>
  let answerKeyChangeLogRepo: MockRepo<AnswerKeyChangeLog>
  let dispatcher: jest.Mocked<ReprocessDispatcher>
  let connection: { getRepository: jest.Mock }

  beforeEach(async () => {
    testRepo = mockRepo()
    testTemplatesRepo = mockRepo()
    answerKeyChangeLogRepo = mockRepo()
    dispatcher = mockDispatcher()
    connection = { getRepository: jest.fn() }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TestsService,
        { provide: getRepositoryToken(TestEntity), useValue: testRepo },
        {
          provide: getRepositoryToken(TestTemplate),
          useValue: testTemplatesRepo,
        },
        { provide: getRepositoryToken(Student), useValue: mockRepo() },
        {
          provide: getRepositoryToken(StudentTestAnswer),
          useValue: mockRepo(),
        },
        {
          provide: getRepositoryToken(AnswerKeyChangeLog),
          useValue: answerKeyChangeLogRepo,
        },
        { provide: Connection, useValue: connection },
        { provide: ConfigService, useValue: { get: jest.fn() } },
        { provide: REPROCESS_DISPATCHER, useValue: dispatcher },
      ],
    }).compile()

    service = module.get<TestsService>(TestsService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  // ─── add ────────────────────────────────────────────────────────────────────

  describe('add', () => {
    it('lança ConflictException quando teste com mesmo nome/disciplina/série/ano já existe', async () => {
      const dto = {
        TES_NOME: 'Teste de Matemática',
        TES_ANO: '2024',
        TES_ATIVO: true,
        TES_DIS: { DIS_ID: 1 } as any,
        TES_SER: { SER_ID: 1 } as any,
        TES_TEG: [],
      } as any
      testRepo.findOne.mockResolvedValue(makeTest())

      await expect(service.add(dto, makeUser())).rejects.toThrow(
        ConflictException,
      )
    })

    it('cria teste sem templates — saveTemplates chamado com array vazio', async () => {
      const dto = {
        TES_NOME: 'Novo Teste',
        TES_ANO: '2024',
        TES_ATIVO: true,
        TES_DIS: { DIS_ID: 1 } as any,
        TES_SER: { SER_ID: 1 } as any,
        TES_TEG: [],
      } as any
      const savedTest = makeTest({ TES_TEG: [] })
      testRepo.findOne.mockResolvedValue(null)
      testRepo.save.mockResolvedValue(savedTest)

      const result = await service.add(dto, makeUser())

      expect(testRepo.save).toHaveBeenCalledTimes(1)
      expect(testTemplatesRepo.delete).not.toHaveBeenCalled()
      expect(result.TES_ID).toBe(42)
    })

    it('cria teste com templates — templates são salvos sem disparar logAndEmitAnswerKeyChanges', async () => {
      const template = makeTemplate({ TEG_ID: undefined } as any)
      const dto = {
        TES_NOME: 'Novo Teste',
        TES_ANO: '2024',
        TES_ATIVO: true,
        TES_DIS: { DIS_ID: 1 } as any,
        TES_SER: { SER_ID: 1 } as any,
        TES_TEG: [template],
      } as any
      const savedTest = makeTest({ TES_TEG: [template] })
      testRepo.findOne.mockResolvedValue(null)
      testRepo.save.mockResolvedValue(savedTest)
      testTemplatesRepo.save.mockResolvedValue(template)

      await service.add(dto, makeUser())

      expect(testTemplatesRepo.save).toHaveBeenCalledTimes(1)
      // novos templates (sem TEG_ID) não disparam log de mudança
      expect(answerKeyChangeLogRepo.create).not.toHaveBeenCalled()
      expect(dispatcher.scheduleDebounce).not.toHaveBeenCalled()
    })
  })

  // ─── update ─────────────────────────────────────────────────────────────────

  describe('update', () => {
    beforeEach(() => {
      connection.getRepository.mockReturnValue({
        findOne: jest.fn().mockResolvedValue(null),
      })
    })

    it('atualiza teste sem TES_TEG — saveTemplates não é chamado', async () => {
      const test = makeTest({ TES_TEG: [] })
      testRepo.findOne.mockResolvedValue(test)
      testTemplatesRepo.find.mockResolvedValue([])
      testRepo.save.mockResolvedValue(test)

      await service.update(42, { TES_NOME: 'Novo Nome' } as any, makeUser())

      expect(testTemplatesRepo.save).not.toHaveBeenCalled()
    })

    it('atualiza teste com TES_TEG — saveTemplates é chamado com os templates recebidos', async () => {
      const template = makeTemplate()
      const test = makeTest({ TES_TEG: [template] })
      testRepo.findOne.mockResolvedValue(test)
      testTemplatesRepo.find.mockResolvedValue([template])
      testRepo.save.mockResolvedValue(test)
      testTemplatesRepo.save.mockResolvedValue(template)
      answerKeyChangeLogRepo.create.mockReturnValue({})
      answerKeyChangeLogRepo.save.mockResolvedValue({ id: 99 })
      dispatcher.scheduleDebounce.mockResolvedValue(undefined)

      await service.update(42, { TES_TEG: [template] } as any, makeUser())

      expect(testTemplatesRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ TEG_ID: template.TEG_ID }),
      )
    })

    it('lança ForbiddenException em update quando disciplina muda e há lançamentos', async () => {
      const studentTestRepo = {
        findOne: jest.fn().mockResolvedValue({ ALT_ID: 1 }),
      }
      connection.getRepository.mockImplementation((entity: any) => {
        if (entity?.name === 'StudentTest' || entity === StudentTest) {
          return studentTestRepo
        }
        return {}
      })

      const test = makeTest({
        TES_DIS: { DIS_ID: 1 } as any,
        TES_SER: { SER_ID: 2 } as any,
        TES_MAR: null as any,
        TES_TEG: [],
      })
      testRepo.findOne.mockResolvedValue(test)
      testTemplatesRepo.find.mockResolvedValue([])

      await expect(
        service.update(
          42,
          { TES_DIS: { DIS_ID: 99 } as any } as any,
          makeUser(),
        ),
      ).rejects.toThrow(ForbiddenException)

      expect(testRepo.save).not.toHaveBeenCalled()
    })
  })

  // ─── verifyStructuralLock ────────────────────────────────────────────────────

  describe('verifyStructuralLock', () => {
    const makeStudentTestRepo = () => ({
      findOne: jest.fn(),
    })

    let studentTestRepo: ReturnType<typeof makeStudentTestRepo>

    beforeEach(() => {
      studentTestRepo = makeStudentTestRepo()
      // substitui o retorno de connection.getRepository para StudentTest
      connection.getRepository.mockImplementation((entity: any) => {
        if (entity?.name === 'StudentTest' || entity === StudentTest) {
          return studentTestRepo
        }
        return {}
      })
    })

    it('não lança exceção quando não há lançamentos', async () => {
      studentTestRepo.findOne.mockResolvedValue(null)
      const test = makeTest({
        TES_DIS: { DIS_ID: 1 } as any,
        TES_SER: { SER_ID: 2 } as any,
        TES_MAR: null,
        TES_TEG: [],
      })
      testRepo.findOne.mockResolvedValue(test)
      testTemplatesRepo.find.mockResolvedValue([])

      await expect(
        (service as any).verifyStructuralLock(42, {
          TES_DIS: { DIS_ID: 1 } as any,
        }),
      ).resolves.toBeUndefined()
    })

    it('lança ForbiddenException quando ano muda com lançamentos', async () => {
      studentTestRepo.findOne.mockResolvedValue({ ALT_ID: 1 })
      const test = makeTest({ TES_ANO: '2024', TES_TEG: [] })
      testRepo.findOne.mockResolvedValue(test)
      testTemplatesRepo.find.mockResolvedValue([])

      await expect(
        (service as any).verifyStructuralLock(42, { TES_ANO: '2025' }),
      ).rejects.toThrow(ForbiddenException)
    })

    it('lança ForbiddenException quando disciplina muda com lançamentos', async () => {
      studentTestRepo.findOne.mockResolvedValue({ ALT_ID: 1 })
      const test = makeTest({
        TES_DIS: { DIS_ID: 1 } as any,
        TES_SER: { SER_ID: 2 } as any,
        TES_MAR: null,
        TES_TEG: [],
      })
      testRepo.findOne.mockResolvedValue(test)
      testTemplatesRepo.find.mockResolvedValue([])

      await expect(
        (service as any).verifyStructuralLock(42, {
          TES_DIS: { DIS_ID: 99 } as any,
        }),
      ).rejects.toThrow(ForbiddenException)
    })

    it('lança ForbiddenException quando série muda com lançamentos', async () => {
      studentTestRepo.findOne.mockResolvedValue({ ALT_ID: 1 })
      const test = makeTest({
        TES_DIS: { DIS_ID: 1 } as any,
        TES_SER: { SER_ID: 2 } as any,
        TES_MAR: null,
        TES_TEG: [],
      })
      testRepo.findOne.mockResolvedValue(test)
      testTemplatesRepo.find.mockResolvedValue([])

      await expect(
        (service as any).verifyStructuralLock(42, {
          TES_SER: { SER_ID: 99 } as any,
        }),
      ).rejects.toThrow(ForbiddenException)
    })

    it('lança ForbiddenException quando matriz muda com lançamentos', async () => {
      studentTestRepo.findOne.mockResolvedValue({ ALT_ID: 1 })
      const test = makeTest({
        TES_DIS: { DIS_ID: 1 } as any,
        TES_SER: { SER_ID: 2 } as any,
        TES_MAR: { MAR_ID: 5 } as any,
        TES_TEG: [],
      })
      testRepo.findOne.mockResolvedValue(test)
      testTemplatesRepo.find.mockResolvedValue([])

      await expect(
        (service as any).verifyStructuralLock(42, {
          TES_MAR: { MAR_ID: 99 } as any,
        }),
      ).rejects.toThrow(ForbiddenException)
    })

    it('lança ForbiddenException quando questão é adicionada (sem TEG_ID) com lançamentos', async () => {
      studentTestRepo.findOne.mockResolvedValue({ ALT_ID: 1 })
      const test = makeTest({
        TES_DIS: { DIS_ID: 1 } as any,
        TES_SER: { SER_ID: 2 } as any,
        TES_MAR: null,
        TES_TEG: [],
      })
      testRepo.findOne.mockResolvedValue(test)
      testTemplatesRepo.find.mockResolvedValue([])

      await expect(
        (service as any).verifyStructuralLock(42, {
          TES_TEG: [{ TEG_RESPOSTA_CORRETA: 'A', TEG_ORDEM: 1 }], // sem TEG_ID
        }),
      ).rejects.toThrow(ForbiddenException)
    })

    it('lança ForbiddenException quando questão é removida do DTO com lançamentos', async () => {
      const existingTemplate = makeTemplate({ TEG_ID: 10 })
      studentTestRepo.findOne.mockResolvedValue({ ALT_ID: 1 })
      const test = makeTest({ TES_TEG: [existingTemplate] })
      testRepo.findOne.mockResolvedValue(test)
      testTemplatesRepo.find.mockResolvedValue([existingTemplate])

      // DTO com array vazio — questão TEG_ID=10 foi removida
      await expect(
        (service as any).verifyStructuralLock(42, { TES_TEG: [] }),
      ).rejects.toThrow(ForbiddenException)
    })

    it('não lança exceção quando apenas gabarito/anulação/nível/descritor são alterados com lançamentos', async () => {
      const existingTemplate = makeTemplate({ TEG_ID: 10 })
      studentTestRepo.findOne.mockResolvedValue({ ALT_ID: 1 })
      const test = makeTest({
        TES_DIS: { DIS_ID: 1 } as any,
        TES_SER: { SER_ID: 2 } as any,
        TES_MAR: null,
        TES_TEG: [existingTemplate],
      })
      testRepo.findOne.mockResolvedValue(test)
      testTemplatesRepo.find.mockResolvedValue([existingTemplate])

      // mesmo TEG_ID, apenas conteúdo da questão muda — não é estrutural
      await expect(
        (service as any).verifyStructuralLock(42, {
          TES_TEG: [
            { TEG_ID: 10, TEG_RESPOSTA_CORRETA: 'B', TEG_ANULADA: true },
          ],
        }),
      ).resolves.toBeUndefined()
    })
  })

  // ─── saveTemplates ───────────────────────────────────────────────────────────

  describe('saveTemplates', () => {
    it('deleta template que foi removido do array', async () => {
      const existingTemplate = makeTemplate({ TEG_ID: 1 })
      const test = makeTest({ TES_TEG: [existingTemplate] })
      testTemplatesRepo.save.mockResolvedValue(existingTemplate)
      answerKeyChangeLogRepo.create.mockReturnValue({})
      answerKeyChangeLogRepo.save.mockResolvedValue({ id: 1 })
      dispatcher.scheduleDebounce.mockResolvedValue(undefined)

      // passa array vazio — o template existente deve ser deletado
      await service.saveTemplates(test, [])

      expect(testTemplatesRepo.delete).toHaveBeenCalledWith(1)
    })

    it('salva template novo (sem TEG_ID) sem chamar logAndEmitAnswerKeyChanges', async () => {
      const newTemplate = makeTemplate({ TEG_ID: undefined } as any)
      const test = makeTest({ TES_TEG: [] })
      testTemplatesRepo.save.mockResolvedValue(newTemplate)

      await service.saveTemplates(test, [newTemplate])

      expect(testTemplatesRepo.save).toHaveBeenCalledTimes(1)
      expect(answerKeyChangeLogRepo.create).not.toHaveBeenCalled()
      expect(dispatcher.scheduleDebounce).not.toHaveBeenCalled()
    })

    it('salva template existente sem mudança — nenhum log nem dispatcher', async () => {
      const template = makeTemplate()
      const test = makeTest({ TES_TEG: [template] })
      testTemplatesRepo.save.mockResolvedValue(template)

      // mesmo template, sem alteração
      await service.saveTemplates(test, [{ ...template }])

      expect(testTemplatesRepo.save).toHaveBeenCalledTimes(1)
      expect(answerKeyChangeLogRepo.create).not.toHaveBeenCalled()
      expect(dispatcher.scheduleDebounce).not.toHaveBeenCalled()
    })

    it('loga mudança de TEG_RESPOSTA_CORRETA e agenda reprocessamento', async () => {
      const previous = makeTemplate({ TEG_RESPOSTA_CORRETA: 'A' })
      const updated = { ...previous, TEG_RESPOSTA_CORRETA: 'B' }
      const test = makeTest({ TES_TEG: [previous] })
      testTemplatesRepo.save.mockResolvedValue(updated)
      answerKeyChangeLogRepo.create.mockReturnValue({})
      answerKeyChangeLogRepo.save.mockResolvedValue({ id: 77 })
      dispatcher.scheduleDebounce.mockResolvedValue(undefined)

      await service.saveTemplates(test, [updated] as any, makeUser())

      expect(answerKeyChangeLogRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          field: AnswerKeyChangeField.RESPOSTA_CORRETA,
          previousValue: 'A',
          newValue: 'B',
        }),
      )
      expect(dispatcher.scheduleDebounce).toHaveBeenCalledWith(
        previous.TEG_ID,
        77,
      )
    })
  })

  // ─── logAndEmitAnswerKeyChanges (via saveTemplates) ──────────────────────────

  describe('logAndEmitAnswerKeyChanges', () => {
    it('loga mudança de TEG_ANULADA (false → true)', async () => {
      const previous = makeTemplate({ TEG_ANULADA: false })
      const updated = { ...previous, TEG_ANULADA: true }
      const test = makeTest({ TES_TEG: [previous] })
      testTemplatesRepo.save.mockResolvedValue(updated)
      answerKeyChangeLogRepo.create.mockReturnValue({})
      answerKeyChangeLogRepo.save.mockResolvedValue({ id: 88 })
      dispatcher.scheduleDebounce.mockResolvedValue(undefined)

      await service.saveTemplates(test, [updated] as any, makeUser())

      expect(answerKeyChangeLogRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          field: AnswerKeyChangeField.ANULADA,
          previousValue: 'false',
          newValue: 'true',
        }),
      )
      expect(dispatcher.scheduleDebounce).toHaveBeenCalledWith(
        previous.TEG_ID,
        88,
      )
    })

    it('loga mudança de TEG_MTI (MTI_ID 10 → 20)', async () => {
      const previous = makeTemplate({ TEG_MTI: { MTI_ID: 10 } as any })
      const updated = { ...previous, TEG_MTI: { MTI_ID: 20 } as any }
      const test = makeTest({ TES_TEG: [previous] })
      testTemplatesRepo.save.mockResolvedValue(updated)
      answerKeyChangeLogRepo.create.mockReturnValue({})
      answerKeyChangeLogRepo.save.mockResolvedValue({ id: 99 })
      dispatcher.scheduleDebounce.mockResolvedValue(undefined)

      await service.saveTemplates(test, [updated] as any, makeUser())

      expect(answerKeyChangeLogRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          field: AnswerKeyChangeField.DESCRITOR,
          previousValue: '10',
          newValue: '20',
        }),
      )
      expect(dispatcher.scheduleDebounce).toHaveBeenCalledWith(
        previous.TEG_ID,
        99,
      )
    })

    it('não cria nenhum log quando nada muda no template', async () => {
      const template = makeTemplate()
      const test = makeTest({ TES_TEG: [template] })
      testTemplatesRepo.save.mockResolvedValue(template)

      await service.saveTemplates(test, [{ ...template }], makeUser())

      expect(answerKeyChangeLogRepo.create).not.toHaveBeenCalled()
      expect(dispatcher.scheduleDebounce).not.toHaveBeenCalled()
    })
  })

  // ─── deleteQuestion ──────────────────────────────────────────────────────────

  describe('deleteQuestion', () => {
    let studentTestRepo: { findOne: jest.Mock }
    let studentTestAnswerRepoMock: MockRepo<StudentTestAnswer>

    beforeEach(() => {
      studentTestRepo = { findOne: jest.fn() }
      connection.getRepository.mockImplementation((entity: any) => {
        if (entity?.name === 'StudentTest' || entity === StudentTest) {
          return studentTestRepo
        }
        return {}
      })
      studentTestAnswerRepoMock = (service as any).studentTestAnswerRepository
    })

    it('lança ForbiddenException quando o teste pai tem lançamentos', async () => {
      const question = makeTemplate({
        TEG_ID: 5,
        TEG_TES: { TES_ID: 42 } as any,
      })
      testTemplatesRepo.findOne.mockResolvedValue(question)
      studentTestRepo.findOne.mockResolvedValue({ ALT_ID: 1 })

      await expect(service.deleteQuestion(5)).rejects.toThrow(
        ForbiddenException,
      )
    })

    it('retorna { verify: true } quando não há lançamentos e não há respostas', async () => {
      const question = makeTemplate({
        TEG_ID: 5,
        TEG_TES: { TES_ID: 42 } as any,
      })
      testTemplatesRepo.findOne.mockResolvedValue(question)
      studentTestRepo.findOne.mockResolvedValue(null)
      studentTestAnswerRepoMock.findOne.mockResolvedValue(null)

      await expect(service.deleteQuestion(5)).resolves.toEqual({ verify: true })
    })

    it('lança InternalServerErrorException quando TEG_TES está ausente na questão', async () => {
      // first call (findOneQuestion, no relations): question exists
      // second call (with relations): TEG_TES is null
      testTemplatesRepo.findOne
        .mockResolvedValueOnce(
          makeTemplate({ TEG_ID: 5, TEG_TES: undefined as any }),
        )
        .mockResolvedValueOnce(
          makeTemplate({ TEG_ID: 5, TEG_TES: null as any }),
        )

      await expect(service.deleteQuestion(5)).rejects.toThrow(
        InternalServerErrorException,
      )
    })
  })
})
