import { IHeadquartersTopicsItems } from 'src/modules/headquarters/model/interface/headquarter-topic-item.interface'
import { QuestionLevel } from 'src/shared/enums/question-level.enum'

export interface ITestsTemplate {
  TEG_ID: number
  TEG_RESPOSTA_CORRETA: string
  TEG_ORDEM: number
  TEG_ANULADA: boolean
  TEG_NIVEL: QuestionLevel | null
  TEG_DT_CRIACAO: Date
  TEG_DT_ATUALIZACAO: Date
  TEG_MTI: IHeadquartersTopicsItems
}
