import { County } from "src/counties/model/entities/county.entity";
import { School } from "src/school/model/entities/school.entity";
import { Serie } from "src/serie/model/entities/serie.entity";
import { Teacher } from "src/teacher/model/entities/teacher.entity";

export interface ISchoolClass {
  TUR_ID: number;
  TUR_ANO: string;
  TUR_MUN: County;
  TUR_SER: Serie;
  TUR_ESC: School;
  TUR_PERIODO: string;
  TUR_TURNO: string;
  TUR_NOME: string;
  TUR_ATIVO: boolean;
  TUR_DT_CRIACAO: Date;
  TUR_DT_ATUALIZACAO: Date;
  TUR_PRO: Teacher[];
}
