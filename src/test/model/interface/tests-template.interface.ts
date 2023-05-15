import { IHeadquartersTopicsItems } from "src/headquarters/model/interface/headquarter-topic-item.interface";

export interface ITestsTemplate {
  TEG_ID: number;
  TEG_RESPOSTA_CORRETA: string;
  TEG_ORDEM: number;
  TEG_ATIVO: boolean;
  TEG_DT_CRIACAO: Date;
  TEG_DT_ATUALIZACAO: Date;
  TEG_MTI: IHeadquartersTopicsItems;
}
