import { CreateUserDto } from '../model/dto/CreateUserDto';
import { UserController } from './user.controller';

describe('UserController', () => {
  let controller: UserController;
  let mockUser = new CreateUserDto();

  beforeEach(async () => {
    mockUser.USU_NOME = 'Teste';
    mockUser.USU_EMAIL = 'teste@gmail.com';
    mockUser.USU_SENHA = '123456789';
    mockUser.USU_FONE = '15912345678';
    mockUser.USU_DOCUMENTO = '001.795.857-32'

    const service = {
      add: async () => Promise.resolve(),
      save: async () => Promise.resolve(),
      find: async () => Promise.resolve(),
      findAll: async () => Promise.resolve([]),
      findOne: async () => Promise.resolve(),
      update: async () => Promise.resolve(),
    };

    controller = new UserController(service as any);
  });

  it('Create', async () => {
    expect(await controller.add(mockUser)).toBeDefined();
  });

  it('Find All', async () => {
    expect(await controller.findAll()).toBeDefined();
  });

  it('Update', async () => {
    expect(await controller.update('2', mockUser)).toBeDefined();
  });
});
