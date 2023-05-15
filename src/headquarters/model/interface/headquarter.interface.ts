import { IHeadquartersTopics } from "./headquarter-topic.interface";

export interface IHeadquarter {
  MAR_ID: number;
  MAR_NOME: string;
  MAR_ATIVO: boolean;
  MAR_DT_CRIACAO: Date;
  MAR_DT_ATUALIZACAO: Date;
  MAR_MTO: IHeadquartersTopics[];
}
