import { IHeadquarter } from "src/headquarters/model/interface/headquarter.interface";
import { ISerie } from "src/serie/model/interface/serie.interface";
import { ISubject } from "src/subject/model/interface/subject.interface";
import { ITestsTemplate } from "./tests-template.interface";

export interface ITest {
  TES_ID: number;
  TES_NOME: string;
  TES_ATIVO: boolean;
  TES_DT_CRIACAO: Date;
  TES_DT_ATUALIZACAO: Date;
  TES_TEG: ITestsTemplate[];
  TES_DIS: ISubject;
  TES_SER: ISerie;
  TES_MAR: IHeadquarter;
  TES_ARQUIVO?: string;
  TES_MANUAL?: string;
}
