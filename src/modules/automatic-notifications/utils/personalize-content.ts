import { generateStudentResultToken } from 'src/helpers/crypto'

import { NotificationRuleType } from '../entities/notification-rule.entity'
import { IAutomaticNotificationSend } from '../interfaces'

export function personalizeContent(item: IAutomaticNotificationSend): string {
  const studentInfo = `<p><strong>ALUNO:</strong> ${item.ALU_NOME}</p>`
  let infoData = ''
  let resultLink = ''

  if (item.ruleType === NotificationRuleType.RESULTADO_TESTE) {
    const token = generateStudentResultToken(
      item.data.assessmentId,
      item.ALU_ID,
    )

    const frontUrl = process.env.FRONT_APP_URL
    const resultUrl = `${frontUrl}/relatorio-aluno?assessmentId=${item.data.assessmentId}&studentId=${item.ALU_ID}&token=${token}`

    infoData = `<p><strong>Avaliação:</strong> ${item.data.assessmentName}</p>`
    resultLink = `<p><a href="${resultUrl}" style="display: inline-block; padding: 10px 20px; background-color: #3E8277; color: white; text-decoration: none; border-radius: 5px; margin-top: 10px;">${resultUrl}</a></p>`
  } else if (item.ruleType !== NotificationRuleType.EXCESSO_FALTAS) {
    infoData = `<p><strong>Avaliação:</strong> ${item.data.assessmentName}</p>`
  } else {
    infoData = `<p><strong>Data:</strong> ${item.data.month}/${item.data.year}</p><p><strong> Quantidade de Faltas:</strong> ${item?.data?.totalFouls}</p>`
  }

  return studentInfo + infoData + item.content + resultLink
}
