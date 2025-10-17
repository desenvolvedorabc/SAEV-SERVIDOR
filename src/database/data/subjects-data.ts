import { SubjectTypeEnum } from 'src/modules/subject/model/enum/subject.enum'

interface ISubject {
  name: string
  type: SubjectTypeEnum
  color: string
}

export const subjectsData: ISubject[] = [
  {
    name: 'Matemática',
    type: SubjectTypeEnum.OBJETIVA,
    color: '#444444',
  },
  {
    name: 'Língua Portuguesa',
    type: SubjectTypeEnum.OBJETIVA,
    color: '#444444',
  },
  {
    name: 'Leitura',
    type: SubjectTypeEnum.LEITURA,
    color: '#444444',
  },
]
