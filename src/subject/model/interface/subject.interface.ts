import { SubjectTypeEnum } from "../enum/subject-type.enum";

export interface ISubject {
  DIS_NOME: string;
  DIS_ATIVO: boolean;
  DIS_DT_CRIACAO: Date;
  DIS_DT_ATUALIZACAO: Date;
  DIS_TIPO: SubjectTypeEnum;
}
