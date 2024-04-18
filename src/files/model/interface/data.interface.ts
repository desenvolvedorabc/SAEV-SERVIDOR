import { UF } from "src/shared/enums/uf.enum";

export interface IData {
  DAT_ID: number;
  DAT_TIPO: string;
  DAT_NOME: string;
  DAT_DT_CRIACAO: Date;
  DAT_DT_ATUALIZACAO: Date;
  DAT_STATUS: string;
  DAT_OBS: string;
  DAT_USU_ID: string;
}

export interface ImportDataUser {
  USU_NOME: string;
  USU_EMAIL: string;
  USU_DOCUMENTO: string;
  USU_FONE: string;
  USU_SPE: number;
  USU_MUN_IBGE: number;
  USU_ESC_INEP: number;
}

export interface ImportDataStudent {
  ALU_NOME: string;
  ALU_NOME_MAE: string;
  ALU_DT_NASC: string;
  ALU_CPF: string;
  ALU_INEP: string;
  ALU_NOME_PAI: string;
  ALU_NOME_RESP: string;
  ALU_TEL1: string;
  ALU_TEL2: string;
  ALU_EMAIL: string;
  ALU_CEP: string;
  ALU_UF: UF;
  ALU_CIDADE: string;
  ALU_ENDERECO: string;
  ALU_NUMERO: string;
  ALU_COMPLEMENTO: string;
  ALU_BAIRRO: string;

  ALU_ESC_INEP: string;
  ALU_GEN: any;
  ALU_PCD: string;
  ALU_PEL: any;

  TUR_ANO: string;
  TUR_SER_NUMBER: number;
  TUR_PERIODO: string;
  TUR_TIPO: string;
  TUR_NOME: string;
  TUR_ANEXO: string;


  index: number;
}



