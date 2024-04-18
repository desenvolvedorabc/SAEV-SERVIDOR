import { CreateTeacherDto } from '../model/dto/CreateTeacherDto';
import { TeacherController } from './teacher.controller';

describe('TeacherController', () => {
  let controller: TeacherController;
  let mockTeacher = new CreateTeacherDto();

  beforeEach(async () => {
    mockTeacher.PRO_NOME = 'Teste';
    mockTeacher.PRO_EMAIL = 'teste@gmail.com';
    mockTeacher.PRO_FONE = '15912345678';
    mockTeacher.PRO_DOCUMENTO = '001.795.857-32'

    const service = {
      add: async () => Promise.resolve(),
      save: async () => Promise.resolve(),
      find: async () => Promise.resolve(),
      findAll: async () => Promise.resolve([]),
      findOne: async () => Promise.resolve(),
      update: async () => Promise.resolve(),
    };

    controller = new TeacherController(service as any);
  });

  it('Create', async () => {
    expect(await controller.add(mockTeacher)).toBeDefined();
  });

  it('Update', async () => {
    expect(await controller.update('2', mockTeacher)).toBeDefined();
  });
});
