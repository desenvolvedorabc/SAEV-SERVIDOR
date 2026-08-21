import { TypeMicrodata } from '../dto/type-microdata.enum'

export interface DictionaryEntry {
  Campo: string
  Descricao: string
  Tipo: string
  Observacoes: string
}

const dictionaryAlunos: DictionaryEntry[] = [
  {
    Campo: 'MUN_ID',
    Descricao: 'Identificador unico do municipio',
    Tipo: 'Inteiro',
    Observacoes: 'Campo obrigatorio',
  },
  {
    Campo: 'MUN_NOME',
    Descricao: 'Nome do municipio',
    Tipo: 'Texto',
    Observacoes: 'Campo obrigatorio',
  },
  {
    Campo: 'ESC_ID',
    Descricao: 'Identificador unico da escola',
    Tipo: 'Inteiro',
    Observacoes: 'N/A quando nao disponivel',
  },
  {
    Campo: 'ESC_NOME',
    Descricao: 'Nome da escola',
    Tipo: 'Texto',
    Observacoes: 'N/A quando nao disponivel',
  },
  {
    Campo: 'ESC_INEP',
    Descricao: 'Codigo INEP da escola',
    Tipo: 'Inteiro',
    Observacoes:
      'Codigo do Instituto Nacional de Estudos e Pesquisas Educacionais. N/A quando nao disponivel',
  },
  {
    Campo: 'SER_NUMBER',
    Descricao: 'Numero da serie/ano escolar',
    Tipo: 'Inteiro',
    Observacoes: 'N/A quando nao disponivel',
  },
  {
    Campo: 'SER_NOME',
    Descricao: 'Nome da serie/ano escolar',
    Tipo: 'Texto',
    Observacoes: 'Ex: 1o Ano EF, 5o Ano EF. N/A quando nao disponivel',
  },
  {
    Campo: 'TUR_ID',
    Descricao: 'Identificador unico da turma',
    Tipo: 'Inteiro',
    Observacoes: 'N/A quando nao disponivel',
  },
  {
    Campo: 'TUR_NOME',
    Descricao: 'Nome da turma',
    Tipo: 'Texto',
    Observacoes: 'N/A quando nao disponivel',
  },
  {
    Campo: 'TUR_PERIODO',
    Descricao: 'Periodo/turno da turma',
    Tipo: 'Texto',
    Observacoes: 'Ex: Manha, Tarde, Integral. N/A quando nao disponivel',
  },
  {
    Campo: 'ALU_ID',
    Descricao: 'Identificador unico do aluno',
    Tipo: 'Inteiro',
    Observacoes: 'Campo obrigatorio',
  },
  {
    Campo: 'ALU_INEP',
    Descricao: 'Codigo INEP do aluno',
    Tipo: 'Texto',
    Observacoes: 'N/A quando nao disponivel',
  },
  {
    Campo: 'ALU_NOME',
    Descricao: 'Nome completo do aluno',
    Tipo: 'Texto',
    Observacoes: 'Campo obrigatorio',
  },
  {
    Campo: 'ALU_NOME_MAE',
    Descricao: 'Nome da mae do aluno',
    Tipo: 'Texto',
    Observacoes: '',
  },
  {
    Campo: 'ALU_NOME_PAI',
    Descricao: 'Nome do pai do aluno',
    Tipo: 'Texto',
    Observacoes: '',
  },
  {
    Campo: 'ALU_NOME_RESP',
    Descricao: 'Nome do responsavel pelo aluno',
    Tipo: 'Texto',
    Observacoes: '',
  },
  {
    Campo: 'ALU_DT_NASC',
    Descricao: 'Data de nascimento do aluno',
    Tipo: 'Data (DD/MM/AAAA)',
    Observacoes: 'Formato dia/mes/ano',
  },
  {
    Campo: 'ALU_TEL1',
    Descricao: 'Telefone principal do aluno ou responsavel',
    Tipo: 'Texto',
    Observacoes: '',
  },
  {
    Campo: 'ALU_TEL2',
    Descricao: 'Telefone secundario do aluno ou responsavel',
    Tipo: 'Texto',
    Observacoes: '',
  },
  {
    Campo: 'ALU_EMAIL',
    Descricao: 'Email do aluno ou responsavel',
    Tipo: 'Texto',
    Observacoes: '',
  },
  {
    Campo: 'ALU_UF',
    Descricao: 'Unidade Federativa (estado) do aluno',
    Tipo: 'Texto',
    Observacoes: 'Sigla do estado com 2 caracteres. Ex: SP, MG, RJ',
  },
  {
    Campo: 'ALU_ENDERECO',
    Descricao: 'Endereco do aluno',
    Tipo: 'Texto',
    Observacoes: '',
  },
  {
    Campo: 'ALU_CIDADE',
    Descricao: 'Cidade do aluno',
    Tipo: 'Texto',
    Observacoes: '',
  },
  {
    Campo: 'ALU_NUMERO',
    Descricao: 'Numero do endereco do aluno',
    Tipo: 'Texto',
    Observacoes: '',
  },
  {
    Campo: 'ALU_COMPLEMENTO',
    Descricao: 'Complemento do endereco do aluno',
    Tipo: 'Texto',
    Observacoes: '',
  },
  {
    Campo: 'ALU_BAIRRO',
    Descricao: 'Bairro do aluno',
    Tipo: 'Texto',
    Observacoes: '',
  },
  {
    Campo: 'ALU_CEP',
    Descricao: 'CEP do aluno',
    Tipo: 'Texto',
    Observacoes: '',
  },
  {
    Campo: 'ALU_ATIVO',
    Descricao: 'Indica se o aluno esta ativo no sistema',
    Tipo: 'Texto',
    Observacoes: 'Sim = aluno ativo, Nao = aluno inativo',
  },
  {
    Campo: 'ALU_STATUS',
    Descricao: 'Status do aluno',
    Tipo: 'Texto',
    Observacoes: '',
  },
  {
    Campo: 'ALU_CPF',
    Descricao: 'CPF do aluno',
    Tipo: 'Texto',
    Observacoes: 'N/A quando nao disponivel',
  },
  {
    Campo: 'PEL_NOME',
    Descricao: 'Cor/raca do aluno',
    Tipo: 'Texto',
    Observacoes:
      'Ex: Branca, Parda, Preta, Amarela, Indigena. N/A quando nao disponivel',
  },
  {
    Campo: 'GEN_NOME',
    Descricao: 'Genero do aluno',
    Tipo: 'Texto',
    Observacoes: 'Ex: Masculino, Feminino. N/A quando nao disponivel',
  },
]

const dictionaryAvaliacao: DictionaryEntry[] = [
  {
    Campo: 'MUN_NOME',
    Descricao: 'Nome do municipio',
    Tipo: 'Texto',
    Observacoes: 'Campo obrigatorio',
  },
  {
    Campo: 'MUN_COD_IBGE',
    Descricao: 'Codigo IBGE do municipio',
    Tipo: 'Inteiro',
    Observacoes: 'Codigo oficial do IBGE para o municipio',
  },
  {
    Campo: 'ESC_NOME',
    Descricao: 'Nome da escola',
    Tipo: 'Texto',
    Observacoes: 'N/A quando nao disponivel',
  },
  {
    Campo: 'ESC_INEP',
    Descricao: 'Codigo INEP da escola',
    Tipo: 'Inteiro',
    Observacoes:
      'Codigo do Instituto Nacional de Estudos e Pesquisas Educacionais. N/A quando nao disponivel',
  },
  {
    Campo: 'SER_NUMBER',
    Descricao: 'Numero da serie/ano escolar',
    Tipo: 'Inteiro',
    Observacoes: '',
  },
  {
    Campo: 'SER_NOME',
    Descricao: 'Nome da serie/ano escolar',
    Tipo: 'Texto',
    Observacoes: 'Ex: 1o Ano EF, 5o Ano EF',
  },
  {
    Campo: 'TUR_ID',
    Descricao: 'Identificador unico da turma',
    Tipo: 'Inteiro',
    Observacoes: 'N/A quando nao disponivel',
  },
  {
    Campo: 'TUR_NOME',
    Descricao: 'Nome da turma',
    Tipo: 'Texto',
    Observacoes: 'N/A quando nao disponivel',
  },
  {
    Campo: 'TUR_PERIODO',
    Descricao: 'Periodo/turno da turma',
    Tipo: 'Texto',
    Observacoes: 'Ex: Manha, Tarde, Integral. N/A quando nao disponivel',
  },
  {
    Campo: 'ALU_ID',
    Descricao: 'Identificador unico do aluno',
    Tipo: 'Inteiro',
    Observacoes: 'Campo obrigatorio',
  },
  {
    Campo: 'ALU_NOME',
    Descricao: 'Nome completo do aluno',
    Tipo: 'Texto',
    Observacoes: '',
  },
  {
    Campo: 'PEL_NOME',
    Descricao: 'Cor/raca do aluno',
    Tipo: 'Texto',
    Observacoes:
      'Ex: Branca, Parda, Preta, Amarela, Indigena. N/A quando nao disponivel',
  },
  {
    Campo: 'GEN_NOME',
    Descricao: 'Genero do aluno',
    Tipo: 'Texto',
    Observacoes: 'Ex: Masculino, Feminino. N/A quando nao disponivel',
  },
  {
    Campo: 'AVA_NOME',
    Descricao: 'Nome da avaliacao',
    Tipo: 'Texto',
    Observacoes: 'Ex: 2025 - Av. Formativa',
  },
  {
    Campo: 'AVA_ID',
    Descricao: 'Identificador unico da avaliacao',
    Tipo: 'Inteiro',
    Observacoes: 'Campo obrigatorio',
  },
  {
    Campo: 'AVA_ANO',
    Descricao: 'Ano da avaliacao',
    Tipo: 'Inteiro',
    Observacoes: 'Ex: 2025',
  },
  {
    Campo: 'TEST_NOME',
    Descricao: 'Nome do teste aplicado',
    Tipo: 'Texto',
    Observacoes: '',
  },
  {
    Campo: 'TEST_ID',
    Descricao: 'Identificador unico do teste',
    Tipo: 'Inteiro',
    Observacoes: '',
  },
  {
    Campo: 'DIS_NOME',
    Descricao: 'Nome da disciplina do teste',
    Tipo: 'Texto',
    Observacoes: 'Ex: Matematica, Lingua Portuguesa',
  },
  {
    Campo: 'ALT_FINALIZADO',
    Descricao: 'Indica se o aluno finalizou o teste',
    Tipo: 'Inteiro',
    Observacoes: '1 = Finalizado, 0 = Nao finalizado',
  },
  {
    Campo: 'ALT_JUSTIFICATIVA',
    Descricao: 'Justificativa para nao realizacao do teste',
    Tipo: 'Texto',
    Observacoes:
      'N/A quando nao aplicavel. Preenchido quando o aluno nao finalizou o teste',
  },
  {
    Campo: 'NR_QUESTAO',
    Descricao: 'Identificador da questao no gabarito do teste',
    Tipo: 'Inteiro',
    Observacoes: 'N/A quando o teste nao foi finalizado',
  },
  {
    Campo: 'ATR_RESPOSTA',
    Descricao: 'Resposta do aluno para a questao',
    Tipo: 'Texto',
    Observacoes:
      'Letra da alternativa marcada (A, B, C, D). N/A quando o teste nao foi finalizado',
  },
  {
    Campo: 'ATR_CERTO',
    Descricao: 'Indica se a resposta esta correta',
    Tipo: 'Inteiro',
    Observacoes:
      '1 = Correto, 0 = Incorreto. N/A quando o teste nao foi finalizado',
  },
  {
    Campo: 'COD_DESCRITOR',
    Descricao: 'Codigo do descritor (habilidade) avaliado na questao',
    Tipo: 'Texto',
    Observacoes: 'Ex: M001, M002. N/A quando nao disponivel',
  },
  {
    Campo: 'TOP_DESCRITOR',
    Descricao: 'Identificador do topico do descritor',
    Tipo: 'Inteiro',
    Observacoes: 'N/A quando nao disponivel',
  },
  {
    Campo: 'TEG_NIVEL',
    Descricao: 'Nivel de dificuldade da questao',
    Tipo: 'Texto',
    Observacoes: 'BASICO, INTERMEDIARIO ou AVANCADO. N/A quando nao disponivel',
  },
]

const dictionaryInfrequencia: DictionaryEntry[] = [
  {
    Campo: 'MUN_ID',
    Descricao: 'Identificador unico do municipio',
    Tipo: 'Inteiro',
    Observacoes: 'Campo obrigatorio',
  },
  {
    Campo: 'MUN_NOME',
    Descricao: 'Nome do municipio',
    Tipo: 'Texto',
    Observacoes: 'Campo obrigatorio',
  },
  {
    Campo: 'ESC_ID',
    Descricao: 'Identificador unico da escola',
    Tipo: 'Inteiro',
    Observacoes: 'N/A quando nao disponivel',
  },
  {
    Campo: 'ESC_NOME',
    Descricao: 'Nome da escola',
    Tipo: 'Texto',
    Observacoes: 'N/A quando nao disponivel',
  },
  {
    Campo: 'ESC_INEP',
    Descricao: 'Codigo INEP da escola',
    Tipo: 'Inteiro',
    Observacoes:
      'Codigo do Instituto Nacional de Estudos e Pesquisas Educacionais. N/A quando nao disponivel',
  },
  {
    Campo: 'SER_NUMBER',
    Descricao: 'Numero da serie/ano escolar',
    Tipo: 'Inteiro',
    Observacoes: 'N/A quando nao disponivel',
  },
  {
    Campo: 'SER_NOME',
    Descricao: 'Nome da serie/ano escolar',
    Tipo: 'Texto',
    Observacoes: 'Ex: 1o Ano EF, 5o Ano EF. N/A quando nao disponivel',
  },
  {
    Campo: 'TUR_ID',
    Descricao: 'Identificador unico da turma',
    Tipo: 'Inteiro',
    Observacoes: 'N/A quando nao disponivel',
  },
  {
    Campo: 'TUR_NOME',
    Descricao: 'Nome da turma',
    Tipo: 'Texto',
    Observacoes: 'N/A quando nao disponivel',
  },
  {
    Campo: 'TUR_PERIODO',
    Descricao: 'Periodo/turno da turma',
    Tipo: 'Texto',
    Observacoes: 'Ex: Manha, Tarde, Integral. N/A quando nao disponivel',
  },
  {
    Campo: 'ALU_ID',
    Descricao: 'Identificador unico do aluno',
    Tipo: 'Inteiro',
    Observacoes: 'Campo obrigatorio',
  },
  {
    Campo: 'ALU_INEP',
    Descricao: 'Codigo INEP do aluno',
    Tipo: 'Texto',
    Observacoes: 'N/A quando nao disponivel',
  },
  {
    Campo: 'ALU_NOME',
    Descricao: 'Nome completo do aluno',
    Tipo: 'Texto',
    Observacoes: 'Campo obrigatorio',
  },
  {
    Campo: 'ALU_NOME_MAE',
    Descricao: 'Nome da mae do aluno',
    Tipo: 'Texto',
    Observacoes: '',
  },
  {
    Campo: 'ALU_DT_NASC',
    Descricao: 'Data de nascimento do aluno',
    Tipo: 'Data (DD/MM/AAAA)',
    Observacoes: 'Formato dia/mes/ano',
  },
  {
    Campo: 'ALU_ATIVO',
    Descricao: 'Indica se o aluno esta ativo no sistema',
    Tipo: 'Texto',
    Observacoes: 'Sim = aluno ativo, Nao = aluno inativo',
  },
  {
    Campo: 'ALU_CPF',
    Descricao: 'CPF do aluno',
    Tipo: 'Texto',
    Observacoes: 'N/A quando nao disponivel',
  },
  {
    Campo: 'PEL_NOME',
    Descricao: 'Cor/raca do aluno',
    Tipo: 'Texto',
    Observacoes:
      'Ex: Branca, Parda, Preta, Amarela, Indigena. N/A quando nao disponivel',
  },
  {
    Campo: 'GEN_NOME',
    Descricao: 'Genero do aluno',
    Tipo: 'Texto',
    Observacoes: 'Ex: Masculino, Feminino. N/A quando nao disponivel',
  },
  {
    Campo: 'IFR_MES',
    Descricao: 'Mes de referencia da infrequencia',
    Tipo: 'Inteiro',
    Observacoes: '1 = Janeiro, 2 = Fevereiro, ..., 12 = Dezembro',
  },
  {
    Campo: 'IFR_ANO',
    Descricao: 'Ano de referencia da infrequencia',
    Tipo: 'Inteiro',
    Observacoes: 'Ex: 2025, 2026',
  },
  {
    Campo: 'IFR_FALTA',
    Descricao: 'Quantidade de faltas do aluno no mes',
    Tipo: 'Inteiro',
    Observacoes: '0 = nenhuma falta no periodo',
  },
]

const dictionaryTemplateAvaliacao: DictionaryEntry[] = [
  {
    Campo: 'MUN_ID',
    Descricao: 'Identificador unico do municipio',
    Tipo: 'Inteiro',
    Observacoes: 'Campo obrigatorio',
  },
  {
    Campo: 'TIPO',
    Descricao: 'Tipo de rede escolar',
    Tipo: 'Texto',
    Observacoes: 'MUNICIPAL ou ESTADUAL',
  },
  {
    Campo: 'MUN_NOME',
    Descricao: 'Nome do municipio',
    Tipo: 'Texto',
    Observacoes: 'Campo obrigatorio',
  },
  {
    Campo: 'ESC_NOME',
    Descricao: 'Nome da escola',
    Tipo: 'Texto',
    Observacoes: 'N/A quando nao disponivel',
  },
  {
    Campo: 'ESC_ID',
    Descricao: 'Identificador unico da escola',
    Tipo: 'Inteiro',
    Observacoes: 'N/A quando nao disponivel',
  },
  {
    Campo: 'SER_NUMBER',
    Descricao: 'Numero da serie/ano escolar',
    Tipo: 'Inteiro',
    Observacoes: '',
  },
  {
    Campo: 'SER_NOME',
    Descricao: 'Nome da serie/ano escolar',
    Tipo: 'Texto',
    Observacoes: 'Ex: 1o Ano EF, 5o Ano EF',
  },
  {
    Campo: 'TUR_ID',
    Descricao: 'Identificador unico da turma',
    Tipo: 'Inteiro',
    Observacoes: 'N/A quando nao disponivel',
  },
  {
    Campo: 'TUR_NOME',
    Descricao: 'Nome da turma',
    Tipo: 'Texto',
    Observacoes: 'N/A quando nao disponivel',
  },
  {
    Campo: 'AVA_ID',
    Descricao: 'Identificador unico da avaliacao',
    Tipo: 'Inteiro',
    Observacoes: 'Campo obrigatorio',
  },
  {
    Campo: 'AVA_NOME',
    Descricao: 'Nome da avaliacao',
    Tipo: 'Texto',
    Observacoes: '',
  },
  {
    Campo: 'TEST_NOME',
    Descricao: 'Nome do teste aplicado',
    Tipo: 'Texto',
    Observacoes: '',
  },
  {
    Campo: 'TEST_ID',
    Descricao: 'Identificador unico do teste',
    Tipo: 'Inteiro',
    Observacoes: '',
  },
  {
    Campo: 'ALU_ID',
    Descricao: 'Identificador unico do aluno',
    Tipo: 'Inteiro',
    Observacoes: 'Campo obrigatorio',
  },
  {
    Campo: 'ALU_NOME',
    Descricao: 'Nome completo do aluno',
    Tipo: 'Texto',
    Observacoes: '',
  },
  {
    Campo: 'QUESTAO_ORDEM',
    Descricao: 'Numero de ordem da questao no teste',
    Tipo: 'Inteiro',
    Observacoes: 'Sequencial a partir de 1',
  },
  {
    Campo: 'NR_QUESTAO',
    Descricao: 'Identificador da questao no gabarito do teste',
    Tipo: 'Inteiro',
    Observacoes: '',
  },
  {
    Campo: 'ATR_RESPOSTA',
    Descricao: 'Resposta do aluno para a questao',
    Tipo: 'Texto',
    Observacoes: 'Campo para preenchimento. Vazio no template',
  },
  {
    Campo: 'ATR_JUSTIFICATIVA',
    Descricao: 'Justificativa para a resposta',
    Tipo: 'Texto',
    Observacoes: 'Campo para preenchimento. Vazio no template',
  },
]

const dictionaryAvaliacaoNormalizada: DictionaryEntry[] = [
  {
    Campo: 'MUN_UF',
    Descricao: 'Unidade Federativa (estado) do municipio',
    Tipo: 'Texto',
    Observacoes:
      'Sigla do estado com 2 caracteres. Ex: SP, MG. N/A quando nao disponivel',
  },
  {
    Campo: 'MUN_IBGE',
    Descricao: 'Codigo IBGE do municipio',
    Tipo: 'Inteiro',
    Observacoes: 'Codigo oficial do IBGE. N/A quando nao disponivel',
  },
  {
    Campo: 'ESC_INEP',
    Descricao: 'Codigo INEP da escola',
    Tipo: 'Inteiro',
    Observacoes: 'N/A quando nao disponivel',
  },
  {
    Campo: 'SER_NUMBER',
    Descricao: 'Numero da serie/ano escolar',
    Tipo: 'Inteiro',
    Observacoes: 'N/A quando nao disponivel',
  },
  {
    Campo: 'SER_NOME',
    Descricao: 'Nome da serie/ano escolar',
    Tipo: 'Texto',
    Observacoes: 'Ex: 1o Ano EF, 5o Ano EF. N/A quando nao disponivel',
  },
  {
    Campo: 'TUR_PERIODO',
    Descricao: 'Periodo/turno da turma',
    Tipo: 'Texto',
    Observacoes: 'Ex: Manha, Tarde, Integral. N/A quando nao disponivel',
  },
  {
    Campo: 'TUR_NOME',
    Descricao: 'Nome da turma',
    Tipo: 'Texto',
    Observacoes: 'N/A quando nao disponivel',
  },
  {
    Campo: 'ALU_ID',
    Descricao: 'Identificador unico do aluno',
    Tipo: 'Inteiro',
    Observacoes: 'Campo obrigatorio',
  },
  {
    Campo: 'AVA_NOME',
    Descricao: 'Nome da avaliacao',
    Tipo: 'Texto',
    Observacoes: '',
  },
  {
    Campo: 'AVA_ANO',
    Descricao: 'Ano da avaliacao',
    Tipo: 'Inteiro',
    Observacoes: 'Ex: 2025',
  },
  {
    Campo: 'TES_ID',
    Descricao: 'Identificador unico do teste',
    Tipo: 'Inteiro',
    Observacoes: '',
  },
  {
    Campo: 'DIS_NOME',
    Descricao: 'Nome da disciplina do teste',
    Tipo: 'Texto',
    Observacoes: 'Ex: Matematica, Lingua Portuguesa',
  },
  {
    Campo: 'ALT_FINALIZADO',
    Descricao: 'Indica se o aluno finalizou o teste',
    Tipo: 'Inteiro',
    Observacoes: '1 = Finalizado, 0 = Nao finalizado',
  },
  {
    Campo: 'ALT_JUSTIFICATIVA',
    Descricao: 'Justificativa para nao realizacao do teste',
    Tipo: 'Texto',
    Observacoes: 'N/A quando nao aplicavel',
  },
  {
    Campo: 'NR_QUESTAO',
    Descricao: 'Identificador da questao no gabarito do teste',
    Tipo: 'Inteiro',
    Observacoes: 'N/A quando o teste nao foi finalizado',
  },
  {
    Campo: 'TEG_ORDEM',
    Descricao: 'Numero de ordem da questao no teste',
    Tipo: 'Inteiro',
    Observacoes: 'N/A quando nao disponivel',
  },
  {
    Campo: 'ATR_RESPOSTA',
    Descricao: 'Resposta do aluno para a questao',
    Tipo: 'Texto',
    Observacoes:
      'Letra da alternativa marcada (A, B, C, D). N/A quando o teste nao foi finalizado',
  },
  {
    Campo: 'ATR_CERTO',
    Descricao: 'Indica se a resposta esta correta',
    Tipo: 'Inteiro',
    Observacoes:
      '1 = Correto, 0 = Incorreto. N/A quando o teste nao foi finalizado',
  },
  {
    Campo: 'MTI_CODIGO',
    Descricao: 'Codigo do descritor (habilidade) avaliado na questao',
    Tipo: 'Texto',
    Observacoes: 'N/A quando nao disponivel',
  },
  {
    Campo: 'TEG_NIVEL',
    Descricao: 'Nivel de dificuldade da questao',
    Tipo: 'Texto',
    Observacoes: 'BASICO, INTERMEDIARIO ou AVANCADO. N/A quando nao disponivel',
  },
]

const dictionaryAvaliacaoNormalizadaEscolas: DictionaryEntry[] = [
  {
    Campo: 'ESC_ID',
    Descricao: 'Identificador unico da escola',
    Tipo: 'Inteiro',
    Observacoes: 'N/A quando nao disponivel',
  },
  {
    Campo: 'ESC_NOME',
    Descricao: 'Nome da escola',
    Tipo: 'Texto',
    Observacoes: 'N/A quando nao disponivel',
  },
  {
    Campo: 'ESC_INEP',
    Descricao: 'Codigo INEP da escola',
    Tipo: 'Inteiro',
    Observacoes: 'N/A quando nao disponivel',
  },
  {
    Campo: 'ESC_UF',
    Descricao: 'Unidade Federativa (estado) da escola',
    Tipo: 'Texto',
    Observacoes: 'Sigla do estado com 2 caracteres. N/A quando nao disponivel',
  },
  {
    Campo: 'ESC_TIPO',
    Descricao: 'Tipo da rede escolar',
    Tipo: 'Texto',
    Observacoes: 'Ex: MUNICIPAL, ESTADUAL. N/A quando nao disponivel',
  },
]

const dictionaryAvaliacaoNormalizadaMunicipios: DictionaryEntry[] = [
  {
    Campo: 'MUN_ID',
    Descricao: 'Identificador unico do municipio',
    Tipo: 'Inteiro',
    Observacoes: 'N/A quando nao disponivel',
  },
  {
    Campo: 'MUN_NOME',
    Descricao: 'Nome do municipio',
    Tipo: 'Texto',
    Observacoes: 'N/A quando nao disponivel',
  },
  {
    Campo: 'MUN_COD_IBGE',
    Descricao: 'Codigo IBGE do municipio',
    Tipo: 'Inteiro',
    Observacoes: 'N/A quando nao disponivel',
  },
  {
    Campo: 'MUN_UF',
    Descricao: 'Unidade Federativa (estado) do municipio',
    Tipo: 'Texto',
    Observacoes: 'Sigla do estado com 2 caracteres. N/A quando nao disponivel',
  },
]

const dictionaryAvaliacaoNormalizadaTestes: DictionaryEntry[] = [
  {
    Campo: 'TES_ID',
    Descricao: 'Identificador unico do teste',
    Tipo: 'Inteiro',
    Observacoes: '',
  },
  {
    Campo: 'TES_NOME',
    Descricao: 'Nome do teste',
    Tipo: 'Texto',
    Observacoes: '',
  },
  {
    Campo: 'DIS_NOME',
    Descricao: 'Nome da disciplina do teste',
    Tipo: 'Texto',
    Observacoes: 'Ex: Matematica, Lingua Portuguesa',
  },
  {
    Campo: 'SER_NOME',
    Descricao: 'Nome da serie/ano escolar do teste',
    Tipo: 'Texto',
    Observacoes: '',
  },
]

const dictionaryAvaliacaoNormalizadaDescritores: DictionaryEntry[] = [
  {
    Campo: 'MTI_CODIGO',
    Descricao: 'Codigo do descritor (habilidade)',
    Tipo: 'Texto',
    Observacoes: 'Ex: M001, LP001',
  },
  {
    Campo: 'MTI_NOME',
    Descricao: 'Nome/descricao do descritor',
    Tipo: 'Texto',
    Observacoes: 'Descricao da habilidade avaliada',
  },
  {
    Campo: 'MTO_NOME',
    Descricao: 'Nome do topico ao qual o descritor pertence',
    Tipo: 'Texto',
    Observacoes: '',
  },
]

export const microdataDictionaries: Record<string, DictionaryEntry[]> = {
  [TypeMicrodata.ALUNOS]: dictionaryAlunos,
  [TypeMicrodata.AVALIACAO]: dictionaryAvaliacao,
  [TypeMicrodata.INFREQUENCIA]: dictionaryInfrequencia,
  [TypeMicrodata.TEMPLATE_AVALIACAO]: dictionaryTemplateAvaliacao,
  [`${TypeMicrodata.AVALIACAO_NORMALIZADA}_avaliacao`]:
    dictionaryAvaliacaoNormalizada,
  [`${TypeMicrodata.AVALIACAO_NORMALIZADA}_escolas`]:
    dictionaryAvaliacaoNormalizadaEscolas,
  [`${TypeMicrodata.AVALIACAO_NORMALIZADA}_alunos`]: dictionaryAlunos,
  [`${TypeMicrodata.AVALIACAO_NORMALIZADA}_municipios`]:
    dictionaryAvaliacaoNormalizadaMunicipios,
  [`${TypeMicrodata.AVALIACAO_NORMALIZADA}_testes`]:
    dictionaryAvaliacaoNormalizadaTestes,
  [`${TypeMicrodata.AVALIACAO_NORMALIZADA}_descritores`]:
    dictionaryAvaliacaoNormalizadaDescritores,
}

export const dictionaryFileName: Record<string, string> = {
  [TypeMicrodata.ALUNOS]: 'Dicionario_Alunos.csv',
  [TypeMicrodata.AVALIACAO]: 'Dicionario_Avaliacao.csv',
  [TypeMicrodata.INFREQUENCIA]: 'Dicionario_Infrequencia.csv',
  [TypeMicrodata.TEMPLATE_AVALIACAO]: 'Dicionario_Template_Avaliacao.csv',
  [TypeMicrodata.AVALIACAO_NORMALIZADA]: 'Dicionario_Avaliacao_Normalizada.csv',
}
