import { Student } from "src/student/model/entities/student.entity";
import { Test } from "../model/entities/test.entity";

export function mapperUsersUploadInfoByHerby(students: Student[], serie: any) {
  const userUploadInfos = students.map((student) => {
    return {
      foreignStudentId: student.ALU_ID,
      studentName: student.ALU_NOME,
      foreignClassId: student?.ALU_TUR?.TUR_ID,
      className: student?.ALU_TUR?.TUR_NOME,
      turno: student?.ALU_TUR?.TUR_PERIODO.toUpperCase(),
      foreignSchoolId: student?.ALU_ESC?.ESC_ID,
      schoolName: student?.ALU_ESC?.ESC_NOME,
      foreignCityId: student?.ALU_ESC?.ESC_MUN?.MUN_ID,
      cityName: student?.ALU_ESC?.ESC_MUN?.MUN_NOME,
      etapa: serie,
    };
  });

  return {
    userUploadInfos,
  };
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
    };
  });

  return {
    items,
  };
}
