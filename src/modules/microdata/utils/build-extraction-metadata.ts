import { format } from 'date-fns'
import { TypeSchoolEnum } from 'src/modules/school/model/enum/type-school.enum'
import { User } from 'src/modules/user/model/entities/user.entity'

import { TypeMicrodata } from '../dto/type-microdata.enum'

export interface ExtractionMetadata {
  tipoMicrodado: string
  estado: string
  municipio: string
  rede: string
  ano: string
  edicao: string
  formatoExportacao: string
  dataHoraExtracao: string
  usuario: string
}

export interface BuildExtractionMetadataInput {
  type: TypeMicrodata
  user: User
  stateName?: string | null
  countyName?: string | null
  typeSchool?: TypeSchoolEnum | null
  year?: string | number | null
  edition?: string | number | null
  exportFormat?: string | null
}

const NA = 'N/A'

const typeMicrodataLabels: Record<TypeMicrodata, string> = {
  [TypeMicrodata.AVALIACAO]: 'Avaliação',
  [TypeMicrodata.AVALIACAO_NORMALIZADA]: 'Avaliação Normalizada',
  [TypeMicrodata.ALUNOS]: 'Alunos',
  [TypeMicrodata.INFREQUENCIA]: 'Infrequência',
  [TypeMicrodata.TEMPLATE_AVALIACAO]: 'Template de Avaliação',
}

const typeSchoolLabels: Record<TypeSchoolEnum, string> = {
  [TypeSchoolEnum.MUNICIPAL]: 'Municipal',
  [TypeSchoolEnum.ESTADUAL]: 'Estadual',
}

function nonEmpty(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return NA
  const str = String(value).trim()
  return str.length === 0 ? NA : str
}

function buildUserLabel(user: User): string {
  const name = user?.USU_NOME?.trim()
  const email = user?.USU_EMAIL?.trim()

  if (name && email) return `${name} <${email}>`
  if (email) return email
  if (name) return name
  return NA
}

export function buildExtractionMetadata(
  input: BuildExtractionMetadataInput,
): ExtractionMetadata {
  const {
    type,
    user,
    stateName,
    countyName,
    typeSchool,
    year,
    edition,
    exportFormat,
  } = input

  return {
    tipoMicrodado: typeMicrodataLabels[type] ?? nonEmpty(type),
    estado: nonEmpty(stateName),
    municipio: nonEmpty(countyName),
    rede: typeSchool ? typeSchoolLabels[typeSchool] ?? nonEmpty(typeSchool) : NA,
    ano: nonEmpty(year),
    edicao: nonEmpty(edition),
    formatoExportacao: nonEmpty(exportFormat),
    dataHoraExtracao: format(new Date(), 'dd/MM/yyyy HH:mm:ss'),
    usuario: buildUserLabel(user),
  }
}
