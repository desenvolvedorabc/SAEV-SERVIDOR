import { Test } from '../model/entities/test.entity'

export function mapperUsersUploadInfoByHerby(students: any[], serie: any) {
  const userUploadInfos = students.map((student) => {
    return {
      foreignStudentId: student?.ALU_ID,
      studentName: student?.ALU_NOME,
      foreignClassId: student?.TUR_ID,
      className: student?.TUR_NOME,
      turno: student?.TUR_PERIODO?.toUpperCase(),
      foreignSchoolId: student?.ESC_ID,
      schoolName: student?.ESC_NOME,
      schoolInep: student?.ESC_INEP,
      schoolRede: student?.ESC_TIPO,
      foreignCityId: student?.MUN_ID,
      cityName: student?.MUN_NOME,
      cityIbge: student?.MUN_COD_IBGE,
      stateName: student?.stateName,
      regionalEstadualName: student?.regionalEstadualName,
      regionalMunicipalName: student?.regionalMunicipalName,
      etapa: serie,
    }
  })

  return {
    userUploadInfos,
  }
}

export function mapperTestsWithAssessmentOnline(tests: Test[]) {
  const items = tests.map((test) => {
    return {
      id: test.TES_ID,
      name: test.TES_NOME,
      serie: test.TES_SER.SER_NOME,
      serieId: test.TES_SER.SER_ID,
      countyId: test.TES_ASSESMENTS[0].AVA_AVM[0]?.AVM_MUN.MUN_ID,
      assessmentOnlineId: test.assessmentOnline.id,
      subject: test.TES_DIS.DIS_NOME,
      endsAt: test.TES_ASSESMENTS[0].AVA_AVM[0]?.AVM_DT_FIM,
      startAt: test.TES_ASSESMENTS[0].AVA_AVM[0]?.AVM_DT_INICIO,
    }
  })

  return {
    items,
  }
}
