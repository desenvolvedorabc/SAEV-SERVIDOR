export interface ReportBreadcrumbItem {
  label: string
  name: string
}

export interface ReportSerie {
  SER_NOME: string
  SER_NUMBER?: number
}

export interface ReportYear {
  name: string
}

export interface ReportEdition {
  name: string
}

export interface ReportState {
  name: string
}

export interface ReportCounty {
  name: string
}

export interface ReportSchool {
  name: string
}

export interface ReportSchoolClass {
  name: string
}

export interface ReportStudent {
  id?: number
  name: string
  avg?: number
  type?: string
  quests?: ReportQuest[]
}

export interface ReportQuest {
  id: number
  letter: string
  type: 'right' | 'wrong'
  questionId: number
}

export interface ReportDescriptor {
  id: number
  TEG_ORDEM?: number
  cod: string
  description: string
}

export interface ReportSubItem {
  id: number
  name: string
  value: number
  type?: string
  countTotalStudents?: number
  countPresentStudents?: number
  totalGradesStudents?: number
  fluente?: number
  nao_fluente?: number
  frases?: number
  palavras?: number
  silabas?: number
  nao_leitor?: number
  nao_avaliado?: number
  nao_informado?: number
}

export interface ReportItem {
  id: number
  subject: string
  type?: string
  typeSubject?: string
  level?: string
  avg?: number
  min?: number
  max?: number
  items?: ReportSubItem[]
  students?: ReportStudent[]
  quests?: {
    total: number
    descriptors: ReportDescriptor[]
  }
  dataGraph?: ReportReadingData
  optionsReading?: readonly string[]
  numberSerie?: number
}

export interface ReportReadingData {
  fluente: number
  nao_fluente: number
  frases: number
  palavras: number
  silabas: number
  nao_leitor: number
  nao_avaliado: number
  nao_informado: number
}

export interface ReportLocation {
  name: string
}

export interface ReportContext {
  serie?: ReportSerie
  year?: ReportYear
  edition?: ReportEdition
  state?: ReportState
  stateRegional?: ReportLocation
  county?: ReportCounty
  countyRegional?: ReportLocation
  school?: ReportSchool
  schoolClass?: ReportSchoolClass
  breadcrumb?: ReportBreadcrumbItem[]
  items?: ReportItem[]
}
