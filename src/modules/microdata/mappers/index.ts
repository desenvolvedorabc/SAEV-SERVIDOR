import { Stringifier } from 'csv-stringify/.'
import { Assessment } from 'src/modules/assessment/model/entities/assessment.entity'
import { AssessmentCounty } from 'src/modules/assessment/model/entities/assessment-county.entity'
import { County } from 'src/modules/counties/model/entities/county.entity'
import { School } from 'src/modules/school/model/entities/school.entity'
import { TypeSchoolEnum } from 'src/modules/school/model/enum/type-school.enum'
import { Test } from 'src/modules/test/model/entities/test.entity'
import { TestTemplate } from 'src/modules/test/model/entities/test-template.entity'

import { safeWrite } from '../utils/csv-stream'

export async function mapperFormatSchools(schools: School[], csvStream: any) {
  if (!schools?.length) return

  for await (const school of schools) {
    await safeWrite(csvStream, {
      ESC_ID: school?.ESC_ID ?? 'N/A',
      ESC_NOME: school?.ESC_NOME ?? 'N/A',
      ESC_INEP: school?.ESC_INEP ?? 'N/A',
      ESC_UF: school?.ESC_UF ?? 'N/A',
      ESC_TIPO: school?.ESC_TIPO ?? 'N/A',
    })
  }
}

export async function mapperFormatCounties(counties: County[], csvStream: any) {
  if (!counties?.length) return

  for await (const county of counties) {
    await safeWrite(csvStream, {
      MUN_ID: county?.MUN_ID ?? 'N/A',
      MUN_NOME: county?.MUN_NOME ?? 'N/A',
      MUN_COD_IBGE: county?.MUN_COD_IBGE ?? 'N/A',
      MUN_UF: county?.MUN_UF ?? 'N/A',
    })
  }
}

export async function mapperFormatStudents(students: any[], csvStream: any) {
  if (!students?.length) return

  for await (const student of students) {
    await safeWrite(csvStream, {
      MUN_ID: student?.MUN_ID,
      MUN_NOME: student?.MUN_NOME,
      ESC_ID: student?.ESC_ID ?? 'N/A',
      ESC_NOME: student?.ESC_NOME ?? 'N/A',
      ESC_INEP: student?.ESC_INEP ?? 'N/A',
      SER_NUMBER: student?.SER_NUMBER ?? 'N/A',
      SER_NOME: student?.SER_NOME ?? 'N/A',
      TUR_ID: student?.TUR_ID ?? 'N/A',
      TUR_NOME: student?.TUR_NOME ?? 'N/A',
      TUR_PERIODO: student?.TUR_PERIODO ?? 'N/A',
      ALU_ID: student.ALU_ID,
      ALU_INEP: student.ALU_INEP ?? 'N/A',
      ALU_NOME: student.ALU_NOME,
      ALU_NOME_MAE: student.ALU_NOME_MAE,
      ALU_NOME_PAI: student.ALU_NOME_PAI,
      ALU_NOME_RESP: student.ALU_NOME_RESP,
      ALU_DT_NASC: new Date(student.ALU_DT_NASC).toLocaleDateString('pt-BR'),
      ALU_TEL1: student.ALU_TEL1,
      ALU_TEL2: student.ALU_TEL2,
      ALU_EMAIL: student.ALU_EMAIL,
      ALU_UF: student.ALU_UF,
      ALU_ENDERECO: student.ALU_ENDERECO,
      ALU_CIDADE: student.ALU_CIDADE,
      ALU_NUMERO: student.ALU_NUMERO,
      ALU_COMPLEMENTO: student.ALU_COMPLEMENTO,
      ALU_BAIRRO: student.ALU_BAIRRO,
      ALU_CEP: student.ALU_CEP,
      ALU_ATIVO: student.ALU_ATIVO ? 'Sim' : 'Não',
      ALU_STATUS: student.ALU_STATUS,
      ALU_CPF: student.ALU_CPF ?? 'N/A',
      PEL_NOME: student?.PEL_NOME ?? 'N/A',
      GEN_NOME: student?.GEN_NOME ?? 'N/A',
    })
  }
}

export function mapperFormatInfrequency(
  schoolAbsences: any[],
  csvStream: Stringifier,
) {
  if (!schoolAbsences?.length) {
    return
  }

  for (const schoolAbsence of schoolAbsences) {
    csvStream.write({
      MUN_ID: schoolAbsence?.MUN_ID,
      MUN_NOME: schoolAbsence?.MUN_NOME,
      ESC_ID: schoolAbsence?.ESC_ID ?? 'N/A',
      ESC_NOME: schoolAbsence?.ESC_NOME ?? 'N/A',
      ESC_INEP: schoolAbsence?.ESC_INEP ?? 'N/A',
      SER_NUMBER: schoolAbsence?.SER_NUMBER ?? 'N/A',
      SER_NOME: schoolAbsence?.SER_NOME ?? 'N/A',
      TUR_ID: schoolAbsence?.TUR_ID ?? 'N/A',
      TUR_NOME: schoolAbsence?.TUR_NOME ?? 'N/A',
      TUR_PERIODO: schoolAbsence?.TUR_PERIODO ?? 'N/A',
      ALU_ID: schoolAbsence?.ALU_ID,
      ALU_INEP: schoolAbsence?.ALU_INEP ?? 'N/A',
      ALU_NOME: schoolAbsence?.ALU_NOME,
      ALU_NOME_MAE: schoolAbsence?.ALU_NOME_MAE,
      ALU_DT_NASC: new Date(schoolAbsence?.ALU_DT_NASC).toLocaleDateString(
        'pt-BR',
      ),
      ALU_ATIVO: schoolAbsence?.ALU_ATIVO ? 'Sim' : 'Não',
      ALU_CPF: schoolAbsence?.ALU_CPF ?? 'N/A',
      PEL_NOME: schoolAbsence?.PEL_NOME ?? 'N/A',
      GEN_NOME: schoolAbsence?.GEN_NOME ?? 'N/A',
      IFR_MES: schoolAbsence.IFR_MES,
      IFR_ANO: schoolAbsence.IFR_ANO,
      IFR_FALTA: schoolAbsence.IFR_FALTA,
    })
  }
}

export async function mapperFormatEvaluationData({
  assessment,
  data,
  test,
  stream,
  county,
}: {
  assessment: Assessment
  data: any[]
  test: Test
  stream: any
  county: County
}) {
  for (const studentTest of data) {
    const base = {
      MUN_NOME: county?.MUN_NOME ?? 'N/A',
      MUN_COD_IBGE: county?.MUN_COD_IBGE ?? 'N/A',
      ESC_NOME: studentTest?.ESC_NOME ?? 'N/A',
      ESC_INEP: studentTest?.ESC_INEP ?? 'N/A',
      SER_NUMBER: test.TES_SER.SER_NUMBER,
      SER_NOME: test.TES_SER.SER_NOME,
      TUR_ID: studentTest?.TUR_ID ?? 'N/A',
      TUR_NOME: studentTest?.TUR_NOME ?? 'N/A',
      TUR_PERIODO: studentTest?.TUR_PERIODO ?? 'N/A',
      ALU_ID: studentTest?.ALU_ID,
      ALU_NOME: studentTest?.ALU_NOME,
      PEL_NOME: studentTest?.PEL_NOME ?? 'N/A',
      GEN_NOME: studentTest?.GEN_NOME ?? 'N/A',
      AVA_NOME: assessment.AVA_NOME,
      AVA_ID: assessment.AVA_ID,
      AVA_ANO: assessment.AVA_ANO,
      TEST_NOME: test.TES_NOME,
      TEST_ID: test.TES_ID,
      DIS_NOME: test.TES_DIS.DIS_NOME,
      ALT_FINALIZADO: studentTest?.ALT_FINALIZADO ? 1 : 0,
      ALT_JUSTIFICATIVA: studentTest?.ALT_JUSTIFICATIVA?.trim()
        ? studentTest.ALT_JUSTIFICATIVA
        : 'N/A',
    }

    if (!studentTest?.ALT_FINALIZADO) {
      await stream.write({
        ...base,
        NR_QUESTAO: 'N/A',
        ATR_RESPOSTA: 'N/A',
        ATR_CERTO: 'N/A',
        COD_DESCRITOR: 'N/A',
        TOP_DESCRITOR: 'N/A',
      })
      continue
    }

    for (const studentTestAnswer of studentTest?.ANSWERS_TEST) {
      let testTemplate: TestTemplate = null
      if (studentTestAnswer?.TEG_ID) {
        testTemplate = test.TEMPLATE_TEST.find(
          (t) => t.TEG_ID === studentTestAnswer?.TEG_ID,
        )
      }
      await stream.write({
        ...base,
        NR_QUESTAO: studentTestAnswer?.TEG_ID ?? 'N/A',
        ATR_RESPOSTA: studentTestAnswer?.ATR_RESPOSTA,
        ATR_CERTO: studentTestAnswer?.ATR_CERTO ? 1 : 0,
        COD_DESCRITOR: testTemplate?.TEG_MTI?.MTI_CODIGO ?? 'N/A',
        TOP_DESCRITOR: testTemplate?.TEG_MTI?.MTI_MTO?.MTO_ID ?? 'N/A',
      })
    }
  }
}

export async function mapperFormatEvaluationDataStandardized({
  assessment,
  data,
  test,
  csvStream,
  county,
}: {
  assessment: Assessment
  data: any[]
  test: Test
  csvStream: any
  county: County
}) {
  for await (const studentTest of data) {
    const base = {
      MUN_UF: county?.MUN_UF ?? 'N/A',
      MUN_IBGE: county?.MUN_COD_IBGE ?? 'N/A',
      ESC_INEP: studentTest?.ESC_INEP ?? 'N/A',
      SER_NUMBER: test?.TES_SER?.SER_NUMBER ?? 'N/A',
      SER_NOME: test?.TES_SER?.SER_NOME ?? 'N/A',
      TUR_PERIODO: studentTest?.TUR_PERIODO ?? 'N/A',
      TUR_NOME: studentTest?.TUR_NOME ?? 'N/A',
      ALU_ID: studentTest?.ALU_ID,
      AVA_NOME: assessment.AVA_NOME,
      AVA_ANO: assessment.AVA_ANO,
      TES_ID: test.TES_ID,
      DIS_NOME: test.TES_DIS.DIS_NOME,
      ALT_FINALIZADO: studentTest?.ALT_FINALIZADO ? 1 : 0,
      ALT_JUSTIFICATIVA: studentTest?.ALT_JUSTIFICATIVA?.trim()
        ? studentTest.ALT_JUSTIFICATIVA
        : 'N/A',
    }

    if (!studentTest?.ALT_FINALIZADO) {
      await safeWrite(csvStream, {
        ...base,
        NR_QUESTAO: 'N/A',
        TEG_ORDEM: 'N/A',
        ATR_RESPOSTA: 'N/A',
        ATR_CERTO: 'N/A',
        MTI_CODIGO: 'N/A',
      })
      continue
    }

    for (const studentTestAnswer of studentTest?.ANSWERS_TEST) {
      let testTemplate: TestTemplate = null

      if (studentTestAnswer?.TEG_ID) {
        testTemplate = test.TEMPLATE_TEST.find(
          (t) => t.TEG_ID === studentTestAnswer?.TEG_ID,
        )
      }
      await safeWrite(csvStream, {
        ...base,
        NR_QUESTAO: studentTestAnswer?.TEG_ID ?? 'N/A',
        TEG_ORDEM: testTemplate?.TEG_ORDEM ?? 'N/A',
        ATR_RESPOSTA: studentTestAnswer?.ATR_RESPOSTA,
        ATR_CERTO: studentTestAnswer?.ATR_CERTO ? 1 : 0,
        MTI_CODIGO: testTemplate?.TEG_MTI?.MTI_CODIGO ?? 'N/A',
      })
    }
  }
}

export function mapperEvaluationTemplate(
  assessmentCounty: AssessmentCounty,
  students: any[],
  type: TypeSchoolEnum,
  csvStream: Stringifier,
) {
  assessmentCounty.AVM_AVA.AVA_TES.forEach((test) => {
    students.forEach((student) => {
      test.TEMPLATE_TEST.forEach((templateTest) => {
        const item = {
          MUN_ID: assessmentCounty.AVM_MUN.MUN_ID,
          TIPO: type,
          MUN_NOME: assessmentCounty.AVM_MUN.MUN_NOME,
          ESC_NOME: student?.ESC_NOME ?? 'N/A',
          ESC_ID: student?.ESC_ID ?? 'N/A',
          SER_NUMBER: test.TES_SER.SER_NUMBER,
          SER_NOME: test.TES_SER.SER_NOME,
          TUR_ID: student?.TUR_ID ?? 'N/A',
          TUR_NOME: student?.TUR_NOME ?? 'N/A',
          AVA_ID: assessmentCounty.AVM_AVA.AVA_ID,
          AVA_NOME: assessmentCounty.AVM_AVA.AVA_NOME,
          TEST_NOME: test.TES_NOME,
          TEST_ID: test.TES_ID,
          ALU_ID: student?.ALU_ID,
          ALU_NOME: student?.ALU_NOME,
          QUESTAO_ORDEM: templateTest.TEG_ORDEM + 1,
          NR_QUESTAO: templateTest.TEG_ID,
          ATR_RESPOSTA: '',
          ATR_JUSTIFICATIVA: '',
        }

        csvStream.write(item)
      })
    })
  })
}
