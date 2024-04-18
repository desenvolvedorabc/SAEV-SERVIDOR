import { Test, TestingModule } from "@nestjs/testing";
import { SystemLogsService } from "./system-logs.service";
import { Connection, Repository } from "typeorm";
import { getRepositoryToken } from "@nestjs/typeorm";
import { SystemLogs } from "../model/entities/system-log.entity";
import { NotFoundException } from "@nestjs/common";

type MockRepository<T = any> = Partial<Record<keyof Repository<T>, jest.Mock>>;

const createMockRepository = <T = any>(): MockRepository<T> => ({
  findOne: jest.fn(),
});

describe("SystemLogsService", () => {
  let service: SystemLogsService;
  let systemLogsRepository: MockRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SystemLogsService,
        {
          provide: Connection,
          useValue: createMockRepository(),
        },
        {
          provide: getRepositoryToken(SystemLogs),
          useValue: createMockRepository(),
        },
      ],
    }).compile();

    service = module.get<SystemLogsService>(SystemLogsService);
    systemLogsRepository = module.get<MockRepository>(
      getRepositoryToken(SystemLogs),
    );
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("findOne", () => {
    describe("buscar curso pelo ID", () => {
      it("deve retornar o objeto Course", async () => {
        const courseId = "1";
        const expectedCourse = {
          id: '2',
          method : 'GET',
          nameEntity: 'A',createdAt: new Date(),
          stateFinal: 'a',
          stateInitial: 'a',
          updatedAt: new Date(),
          user: null
        } as SystemLogs;

        systemLogsRepository.findOne.mockReturnValue(expectedCourse);
        const course = await service.findOne(courseId);
        expect(course).toEqual(expectedCourse);
      });

      it("deve retornar um NotFoundException", async () => {
        const courseId = "1";
        systemLogsRepository.findOne.mockReturnValue(undefined);

        try {
          await service.findOne(courseId);
        } catch (error) {
          expect(error).toBeInstanceOf(NotFoundException);
          expect(error.message).toEqual('Logs não encontrado');
        }
      });
    });
  });
});
