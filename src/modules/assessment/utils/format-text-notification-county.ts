import { Assessment } from '../model/entities/assessment.entity'
import { TypeAssessmentEnum } from '../model/enum/type-assessment.enum'

export function formatTextNotificationCounty(
  assessment: Assessment,
  county: {
    id: number
    AVM_TIPO: TypeAssessmentEnum
    AVM_DT_INICIO?: Date
    AVM_DT_FIM?: Date
  },
) {
  const now = new Date()

  let message: string

  if (county.AVM_DT_INICIO && county.AVM_DT_FIM) {
    const countyEndDate = new Date(county.AVM_DT_FIM)
    const isPastPeriod = countyEndDate < now

    if (isPastPeriod) {
      const startDate = new Date(county.AVM_DT_INICIO).toLocaleDateString(
        'pt-BR',
      )
      const endDate = countyEndDate.toLocaleDateString('pt-BR')

      message = `A avaliação "${assessment.AVA_NOME}" (${assessment.AVA_ANO}) foi adicionada ao seu município. ATENÇÃO: O período configurado (${startDate} a ${endDate}) já passou. Por favor, entre em contato com o SAEV para ajustar as datas da avaliação.`
    } else {
      const startDate = new Date(county.AVM_DT_INICIO).toLocaleDateString(
        'pt-BR',
      )
      const endDate = countyEndDate.toLocaleDateString('pt-BR')

      message = `A avaliação "${assessment.AVA_NOME}" (${assessment.AVA_ANO}) foi adicionada ao seu município com período já configurado: ${startDate} a ${endDate}. A avaliação está pronta para ser aplicada.`
    }
  } else if (assessment.AVA_DT_INICIO && assessment.AVA_DT_FIM) {
    const globalStartDate = new Date(
      assessment.AVA_DT_INICIO,
    ).toLocaleDateString('pt-BR')
    const globalEndDate = new Date(assessment.AVA_DT_FIM).toLocaleDateString(
      'pt-BR',
    )

    message = `A avaliação "${assessment.AVA_NOME}" (${assessment.AVA_ANO}) foi liberada para o seu município. O período global da avaliação é ${globalStartDate} a ${globalEndDate}. Configure as datas específicas de aplicação conforme a realidade do seu município.`
  } else {
    message = `A avaliação "${assessment.AVA_NOME}" (${assessment.AVA_ANO}) foi adicionada ao seu município sem período definido. Entre em contato com o SAEV para definir as datas de aplicação ou aguarde as instruções para configuração.`
  }

  return {
    message,
  }
}
