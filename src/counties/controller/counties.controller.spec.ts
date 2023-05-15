import { CreateCountyDto } from '../model/dto/create-county.dto';
import { CountiesController } from './counties.controller';

describe('CountiesController', () => {
  let controller: CountiesController;
  let mockCounty = new CreateCountyDto();

  beforeEach(async () => {
    mockCounty = {
      MUN_NOME: 'Municipio Teste',
      MUN_ENDERECO: 'Rua Modelo',
      MUN_NUMERO: '13',
      MUN_BAIRRO: 'Teste',
      MUN_CIDADE: 'São Paulo',
      MUN_UF: 'SP',
      MUN_CEP: '00000-000',
      MUN_COMPLEMENTO: 'Fundos',
      MUN_ATIVO: true,
      MUN_STATUS: 'verde',
      MUN_ARQ_CONVENIO: '',
      MUN_DT_FIM: new Date(),
      MUN_DT_INICIO: new Date(),
      MUN_LOGO: '',
    }
    
    const service = {
      add: async () => Promise.resolve(),
      paginate: async () => Promise.resolve(),
      findAll: async () => Promise.resolve([]),
      findOne: async () => Promise.resolve(),
      update: async () => Promise.resolve(),
    };

    controller = new CountiesController(service as any);
  });

  it('Create', async () => {
    expect(await controller.add(mockCounty)).toBeDefined();
  });

  it('Find All', async () => {
    expect(await controller.findAll()).toBeDefined();
  });

  it('Update', async () => {
    expect(await controller.update('10e11ad0-7b69-4b6a-a884-c7f78e0cf9cc', mockCounty)).toBeDefined();
  });
});
