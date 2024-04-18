import { LoginUserDto } from '../model/dto/LoginUserDto';
import { AuthController } from './auth.controller';

describe('AuthController', () => {
  let controller: AuthController;
  const mockLogin = new LoginUserDto();

  beforeEach(async () => {
    mockLogin.USU_EMAIL = 'teste@gmail.com';
    mockLogin.USU_SENHA = '123456789';

    const service = {
      login: async () => Promise.resolve(),
      forgotPassword: async () => Promise.resolve(),
    };

    controller = new AuthController(service as any);
  });

  it('Login', async () => {
    expect(await controller.login(mockLogin)).toBeDefined();
  });

  it('ForgotPassword', async () => {
    expect(await controller.forgotPassword({ email: mockLogin.USU_EMAIL})).toBeDefined();
  });
});
