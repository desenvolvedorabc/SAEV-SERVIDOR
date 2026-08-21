import { QuestionLevel } from 'src/shared/enums/question-level.enum'

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

// ─── Synthetic Test Report ────────────────────────────────────────────────────

export interface SyntheticTestQuestionOption {
  id: number
  option: string
  totalCorrect: number
  value: number
}

export interface SyntheticTestReadingCorrect {
  fluente: number
  nao_fluente: number
  silabas: number
  frases: number
  palavras: number
  nao_leitor: number
  nao_avaliado: number
  nao_informado: number
}

export interface SyntheticTestQuestion {
  id: number
  option: string
  order: number
  descriptor: string
  level?: QuestionLevel | null
  options: SyntheticTestQuestionOption[]
  reportReadingCorrect: SyntheticTestReadingCorrect
}

export interface SyntheticTestLevelSummary {
  level?: QuestionLevel | null
  label: string
  totalItems: number
  value?: number | null
}

export interface SyntheticTestSubject {
  id: number
  subject: string
  typeSubject: string
  hasLevelClassification?: boolean
  levelSummary?: SyntheticTestLevelSummary[]
  items: SyntheticTestQuestion[]
}

export interface SyntheticTestReportContext {
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
  items: SyntheticTestSubject[]
}

// ─── Race Report ──────────────────────────────────────────────────────────────

export interface RaceData {
  id: number
  name: string
  total: number
  total_percent: number
  countTotalStudents: number
  totalGradesStudents: number
  countPresentStudents: number
  fluente: number
  nao_fluente: number
  frases: number
  palavras: number
  silabas: number
  nao_leitor: number
  nao_avaliado: number
  nao_informado: number
}

export interface RaceEditionItem {
  id: number
  name: string
  total_percent: number
  races: RaceData[]
}

export interface RaceSubject {
  id: number
  subject: string
  typeSubject: string
  items: RaceEditionItem[]
}

export interface RaceReportContext {
  serie?: ReportSerie
  year?: ReportYear
  state?: ReportState
  stateRegional?: ReportLocation
  county?: ReportCounty
  countyRegional?: ReportLocation
  school?: ReportSchool
  schoolClass?: ReportSchoolClass
  breadcrumb?: ReportBreadcrumbItem[]
  items: RaceSubject[]
}

// ─── Performance Level Report ─────────────────────────────────────────────────

export interface PerformanceLevelStudentCount {
  ONE: number // Menor Desempenho: < 25%
  TWO: number // Desempenho abaixo da média: 25-49%
  TREE: number // Desempenho Mediano: 50-74%
  FOUR: number // Maior Desempenho: ≥ 75%
  TOTAL: number
}

export interface PerformanceLevelDescriptor {
  id: number
  cod: string
  description: string
  totalCorrect?: number
  total?: number
  value: number
}

export interface PerformanceLevelItem {
  id: number
  name: string
  type?: string
  value: number
  descriptors: PerformanceLevelDescriptor[]
}

export interface PerformanceLevelSubject {
  id: number
  name: string
  type?: string
  value: number
  TOTAL_STUDENTS: PerformanceLevelStudentCount
  items: PerformanceLevelItem[]
  descriptors: PerformanceLevelDescriptor[]
}

export interface PerformanceLevelReportContext {
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
  items: PerformanceLevelSubject[]
}

// ─── Descriptors Report ───────────────────────────────────────────────────────

export interface DescriptorItem {
  id: number
  cod: string
  name: string
  value: number
}

export interface DescriptorsTopic {
  id: number
  name: string
  value: number
  descritores: DescriptorItem[]
}

export interface DescriptorsSubject {
  id: number
  subject: string
  topics: DescriptorsTopic[]
}

// ─── Performance History Report ──────────────────────────────────────────────

export interface PerformanceHistoryEntity {
  id: number
  name: string
  avg?: number
  type?: string
}

export interface PerformanceHistoryTest {
  id: number
  subject: string
  dis_tipo: string
  data: PerformanceHistoryEntity[]
}

export interface PerformanceHistoryEdition {
  id: number
  name: string
  tests: PerformanceHistoryTest[]
}

export interface PerformanceHistoryReportContext {
  serie?: ReportSerie
  year?: ReportYear
  state?: ReportState
  stateRegional?: ReportLocation
  county?: ReportCounty
  countyRegional?: ReportLocation
  school?: ReportSchool
  schoolClass?: ReportSchoolClass
  breadcrumb?: ReportBreadcrumbItem[]
  viewLevel?: string
  items: PerformanceHistoryEdition[]
}

// ─── Descriptors Report ───────────────────────────────────────────────────────

export interface DescriptorsReportContext {
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
  items: DescriptorsSubject[]
}

// ─── Evolutionary Line of Reading Report ─────────────────────────────────────

export interface EvolutionaryLineReadingSubject {
  countTotalStudents: number
  countPresentStudents: number
  fluente: number
  nao_fluente: number
  frases: number
  palavras: number
  silabas: number
  nao_leitor: number
  nao_avaliado: number
  nao_informado: number
}

export interface EvolutionaryLineReadingEdition {
  id: number
  name: string
  subject?: EvolutionaryLineReadingSubject
}

export interface EvolutionaryLineReadingReportContext {
  serie?: ReportSerie
  year?: ReportYear
  state?: ReportState
  stateRegional?: ReportLocation
  county?: ReportCounty
  countyRegional?: ReportLocation
  school?: ReportSchool
  schoolClass?: ReportSchoolClass
  breadcrumb?: ReportBreadcrumbItem[]
  items: EvolutionaryLineReadingEdition[]
}

// ─── Evolutionary Line Report (General) ──────────────────────────────────────

export interface EvolutionaryLineSubject {
  id: number
  name: string
  color?: string
  countLaunched: number
  percentageRightQuestions: number
  totalStudents: number
  percentageFinished: number
}

export interface EvolutionaryLineEdition {
  id: number
  name: string
  subjects: EvolutionaryLineSubject[]
}

export interface EvolutionaryLineReportContext {
  serie?: ReportSerie
  year?: ReportYear
  state?: ReportState
  stateRegional?: ReportLocation
  county?: ReportCounty
  countyRegional?: ReportLocation
  school?: ReportSchool
  schoolClass?: ReportSchoolClass
  breadcrumb?: ReportBreadcrumbItem[]
  items: EvolutionaryLineEdition[]
}

// ─── Evolutionary Line Student Report ────────────────────────────────────────

export type ReadingType =
  | 'fluente'
  | 'nao_fluente'
  | 'frases'
  | 'palavras'
  | 'silabas'
  | 'nao_leitor'
  | 'nao_avaliado'
  | 'nao_informado'

export interface EvolutionaryLineStudentSubject {
  id: number
  name: string
  color?: string
  date: string | null
  isParticipated: boolean
  totalRightQuestions: number
  readType?: ReadingType
}

export interface EvolutionaryLineStudentEdition {
  id: number
  name: string
  subjects: EvolutionaryLineStudentSubject[]
}

export interface EvolutionaryLineStudentReportContext {
  studentName?: string
  serie?: ReportSerie
  year?: ReportYear
  state?: ReportState
  stateRegional?: ReportLocation
  county?: ReportCounty
  countyRegional?: ReportLocation
  school?: ReportSchool
  schoolClass?: ReportSchoolClass
  breadcrumb?: ReportBreadcrumbItem[]
  items: EvolutionaryLineStudentEdition[]
}

// ─── School Absences (Infrequência) Report ──────────────────────────────────

export interface SchoolAbsencesMonth {
  month: number
  total: number
}

export interface SchoolAbsencesGraph {
  months: SchoolAbsencesMonth[]
  total_infrequency: number
  total_grouped: number
}

export interface SchoolAbsencesEntity {
  id: number
  name: string
  type?: string
  graph: SchoolAbsencesGraph
}

export interface SchoolAbsencesReportContext {
  year?: ReportYear
  state?: ReportState
  stateRegional?: ReportLocation
  county?: ReportCounty
  countyRegional?: ReportLocation
  school?: ReportSchool
  schoolClass?: ReportSchoolClass
  breadcrumb?: ReportBreadcrumbItem[]
  level?: string
  graph?: SchoolAbsencesGraph
  items: SchoolAbsencesEntity[]
}

// ─── Releases (Lançamentos) Report ───────────────────────────────────────────

export interface ReleasesSeriesItem {
  id: number
  name: string
  value: number // percentual médio de preenchimento da série (0–100)
}

export interface ReleasesSeriesChart {
  type: string
  level: string
  items: ReleasesSeriesItem[]
}

export interface ReleasesStudentSubject {
  id: number
  name: string
  isRelease: boolean // true = Realizado ✔, false = Pendente ✘
}

export interface ReleasesAggregateSubject {
  id: number
  name: string
  grouped?: number
  countTotalStudents?: number
  percentageFinished: number // 0–100
}

export interface ReleasesItem {
  id: number
  name: string
  /** Apenas no nível escola: nome da turma */
  classe?: string
  inep?: string
  type?: string
  uf?: string
  grouped?: number
  subjects: ReleasesStudentSubject[] | ReleasesAggregateSubject[]
  general: boolean | number
}

export interface ReleasesReportContext {
  serie?: ReportSerie | ReportSerie[]
  year?: ReportYear
  edition?: ReportEdition
  state?: ReportState
  stateRegional?: ReportLocation
  county?: ReportCounty
  countyRegional?: ReportLocation
  school?: ReportSchool
  schoolClass?: ReportSchoolClass
  breadcrumb?: ReportBreadcrumbItem[]
  level?: string
  series: ReleasesSeriesChart
  items: ReleasesItem[]
}

// ─── Grouping (Enturmação) Report ─────────────────────────────────────────────

export interface GroupingStudent {
  id: number
  name: string
  cpf?: string
  motherName?: string
  birthDate?: string
}

export interface GroupingEntity {
  id: number
  name: string
  /** Tipo da escola (ESC_TIPO), se aplicável */
  type?: string
  totalStudents: number
  totalGrouped: number
  totalNotGrouped: number
}

export interface GroupingReportContext {
  year?: ReportYear
  state?: ReportState
  stateRegional?: ReportLocation
  county?: ReportCounty
  countyRegional?: ReportLocation
  school?: ReportSchool
  schoolClass?: ReportSchoolClass
  breadcrumb?: ReportBreadcrumbItem[]
  /**
   * Nível atual do filtro:
   * 'state' | 'stateRegional' | 'county' | 'countyRegional' | 'school' | 'serie' | 'schoolClass'
   */
  level?: string
  totalStudents?: number
  totalGrouped?: number
  totalNotGrouped?: number
  /** Entidades agregadas (todos os níveis exceto turma) ou alunos (nível turma) */
  items: GroupingEntity[] | GroupingStudent[]
}

// ─── Not Evaluated Report ─────────────────────────────────────────────────────

export type NotEvaluatedJustification =
  | 'recusa'
  | 'ausencia'
  | 'abandono'
  | 'transferencia'
  | 'deficiencia'
  | 'nao_participou'

export interface NotEvaluatedStudent {
  id: number
  name: string
  justificativa: NotEvaluatedJustification | null
}

export interface NotEvaluatedSubItem {
  id: number
  name: string
  type?: string
  recusa: number
  ausencia: number
  abandono: number
  transferencia: number
  deficiencia: number
  nao_participou: number
  countTotalStudents: number
  countStudentsLaunched: number
  countPresentStudents: number
}

export interface NotEvaluatedDataGraph {
  recusa: number
  ausencia: number
  abandono: number
  transferencia: number
  deficiencia: number
  nao_participou: number
  total_alunos: number
  total_enturmados: number
  total_lancados?: number
  total_nao_avaliados?: number
}

export interface NotEvaluatedSubject {
  id: number
  subject: string
  typeSubject?: string
  level: string
  type: 'table' | 'bar'
  students?: NotEvaluatedStudent[]
  items?: NotEvaluatedSubItem[]
  dataGraph: NotEvaluatedDataGraph
}

export interface NotEvaluatedReportContext {
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
  items: NotEvaluatedSubject[]
}
