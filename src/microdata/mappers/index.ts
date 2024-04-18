import { Assessment } from "src/assessment/model/entities/assessment.entity";
import { County } from "src/counties/model/entities/county.entity";
import { SchoolAbsence } from "src/school-absences/model/entities/school-absences.entity";
import { StudentTest } from "src/release-results/model/entities/student-test.entity";
import { Student } from "src/student/model/entities/student.entity";
import { TestTemplate } from "src/test/model/entities/test-template.entity";
import { Test } from "src/test/model/entities/test.entity";

export function mapperFormatStudents(students: Student[], county: County) {
  const formattedStudents = students.map((student) => {
    return {
      MUN_UF: county.MUN_UF,
      MUN_ID: county.MUN_ID,
      MUN_COD_IBGE: county.MUN_COD_IBGE ?? "N/A",
      MUN_NOME: county.MUN_NOME,
      ESC_ID: student?.ALU_ESC?.ESC_ID ?? "N/A",
      ESC_NOME: student?.ALU_ESC?.ESC_NOME ?? "N/A",
      ESC_INEP: student?.ALU_ESC?.ESC_INEP ?? "N/A",
      SER_NUMBER: student?.ALU_SER?.SER_NUMBER ?? "N/A",
      SER_NOME: student?.ALU_SER?.SER_NOME ?? "N/A",
      TUR_ID: student?.ALU_TUR?.TUR_ID ?? "N/A",
      TUR_NOME: student?.ALU_TUR?.TUR_NOME ?? "N/A",
      TUR_PERIODO: student?.ALU_TUR?.TUR_PERIODO ?? "N/A",
      ALU_ID: student.ALU_ID,
      ALU_INEP: student.ALU_INEP ?? "N/A",
      ALU_NOME: student.ALU_NOME,
      ALU_NOME_MAE: student.ALU_NOME_MAE,
      ALU_NOME_PAI: student.ALU_NOME_PAI,
      ALU_NOME_RESP: student.ALU_NOME_RESP,
      ALU_DT_NASC: new Date(student.ALU_DT_NASC).toLocaleDateString("pt-BR"),
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
      ALU_ATIVO: student.ALU_ATIVO ? "Sim" : "Não",
      ALU_STATUS: student.ALU_STATUS,
      ALU_CPF: student.ALU_CPF ?? "N/A",
      PEL_NOME: student?.ALU_PEL?.PEL_NOME ?? "N/A",
      GEN_NOME: student?.ALU_GEN?.GEN_NOME ?? "N/A",
    };
  });

  return {
    formattedStudents,
  };
}

export function mapperFormatInfrequency(schoolAbsences: SchoolAbsence[], county: County) {
  const formattedInfrequency = schoolAbsences.map((schoolAbsence) => {
    return {
      MUN_UF: county.MUN_UF,
      MUN_ID: county.MUN_ID,
      MUN_COD_IBGE: county.MUN_COD_IBGE ?? "N/A",
      MUN_NOME: county.MUN_NOME,
      ESC_ID: schoolAbsence.IFR_ALU?.ALU_ESC?.ESC_ID ?? "N/A",
      ESC_NOME: schoolAbsence.IFR_ALU?.ALU_ESC?.ESC_NOME ?? "N/A",
      ESC_INEP: schoolAbsence.IFR_ALU?.ALU_ESC?.ESC_INEP ?? "N/A",
      SER_NUMBER: schoolAbsence.IFR_ALU?.ALU_SER?.SER_NUMBER ?? "N/A",
      SER_NOME: schoolAbsence.IFR_ALU?.ALU_SER?.SER_NOME ?? "N/A",
      TUR_ID: schoolAbsence.IFR_ALU?.ALU_TUR?.TUR_ID ?? "N/A",
      TUR_NOME: schoolAbsence.IFR_ALU?.ALU_TUR?.TUR_NOME ?? "N/A",
      TUR_PERIODO: schoolAbsence.IFR_ALU?.ALU_TUR?.TUR_PERIODO ?? "N/A",
      ALU_ID: schoolAbsence.IFR_ALU.ALU_ID,
      ALU_INEP: schoolAbsence.IFR_ALU.ALU_INEP ?? "N/A",
      ALU_NOME: schoolAbsence.IFR_ALU.ALU_NOME,
      ALU_NOME_MAE: schoolAbsence.IFR_ALU.ALU_NOME_MAE,
      ALU_DT_NASC: new Date(schoolAbsence.IFR_ALU.ALU_DT_NASC).toLocaleDateString("pt-BR"),
      ALU_ATIVO: schoolAbsence.IFR_ALU.ALU_ATIVO ? "Sim" : "Não",
      ALU_CPF: schoolAbsence.IFR_ALU.ALU_CPF ?? "N/A",
      PEL_NOME: schoolAbsence.IFR_ALU?.ALU_PEL?.PEL_NOME ?? "N/A",
      GEN_NOME: schoolAbsence.IFR_ALU?.ALU_GEN?.GEN_NOME ?? "N/A",
      IFR_MES: schoolAbsence.IFR_MES,
      IFR_ANO: schoolAbsence.IFR_ANO,
      IFR_FALTA: schoolAbsence.IFR_FALTA,
    };
  });

  return {
    formattedInfrequency,
  };
}

export function mapperFormatEvaluationData(
  ava: Assessment,
  data: StudentTest[],
  findCounty: County,
  test: Test,
) {
  let formattedData = [];

  data.forEach((studentTest) => {
    let testTemplate: TestTemplate = null;

    if (!studentTest.ALT_FINALIZADO) {
      const item = {
        MUN_UF: findCounty.MUN_UF,
        MUN_ID: findCounty.MUN_ID,
        MUN_COD_IBGE: findCounty.MUN_COD_IBGE ?? "N/A",
        MUN_NOME: findCounty.MUN_NOME,
        ESC_NOME: studentTest?.schoolClass?.TUR_ESC?.ESC_NOME ?? "N/A",
        ESC_ID: studentTest?.schoolClass?.TUR_ESC?.ESC_ID ?? "N/A",
        ESC_INEP: studentTest?.schoolClass?.TUR_ESC?.ESC_INEP ?? "N/A",
        SER_NUMBER: test.TES_SER.SER_NUMBER,
        SER_NOME: test.TES_SER.SER_NOME,
        TUR_ID: studentTest?.schoolClass?.TUR_ID ?? "N/A",
        TUR_NOME: studentTest?.schoolClass?.TUR_NOME ?? "N/A",
        TUR_PERIODO: studentTest?.schoolClass?.TUR_PERIODO ?? "N/A",
        ALU_ID: studentTest.ALT_ALU.ALU_ID,
        ALU_NOME: studentTest?.ALT_ALU?.ALU_NOME,
        PEL_NOME: studentTest?.ALT_ALU?.ALU_PEL?.PEL_NOME ?? "N/A",
        GEN_NOME: studentTest?.ALT_ALU?.ALU_GEN?.GEN_NOME ?? "N/A",
        AVA_NOME: ava.AVA_NOME,
        AVA_ID: ava.AVA_ID,
        AVA_ANO: ava.AVA_ANO,
        TEST_NOME: test.TES_NOME,
        TEST_ID: test.TES_ID,
        DIS_NOME: test.TES_DIS.DIS_NOME,
        ALT_FINALIZADO: studentTest.ALT_FINALIZADO ? 1 : 0,
        ALT_JUSTIFICATIVA: studentTest?.ALT_JUSTIFICATIVA?.trim() ?  studentTest?.ALT_JUSTIFICATIVA : 'N/A',
        NR_QUESTAO: "N/A",
        ATR_RESPOSTA: "N/A",
        ATR_CERTO: "N/A",
        NOME_DESCRITOR: "N/A",
        COD_DESCRITOR: "N/A",
        TOP_DESCRITOR: "N/A",
        TOP_NOME: "N/A",
      };

      formattedData.push(item);
      return;
    }

    studentTest.ANSWERS_TEST.forEach((studentTestAnswer) => {
      if (studentTestAnswer?.questionTemplate) {
        testTemplate = test.TEMPLATE_TEST.find(
          (templateTest) =>
            templateTest.TEG_ID === studentTestAnswer.questionTemplate.TEG_ID,
        );
      }

      const item = {
        MUN_UF: findCounty.MUN_UF,
        MUN_ID: findCounty.MUN_ID,
        MUN_COD_IBGE: findCounty.MUN_COD_IBGE ?? "N/A",
        MUN_NOME: findCounty.MUN_NOME,
        ESC_NOME: studentTest?.schoolClass?.TUR_ESC?.ESC_NOME ?? "N/A",
        ESC_ID: studentTest?.schoolClass?.TUR_ESC?.ESC_ID ?? "N/A",
        ESC_INEP: studentTest?.schoolClass?.TUR_ESC?.ESC_INEP ?? "N/A",
        SER_NUMBER: test.TES_SER.SER_NUMBER,
        SER_NOME: test.TES_SER.SER_NOME,
        TUR_ID: studentTest?.schoolClass?.TUR_ID ?? "N/A",
        TUR_NOME: studentTest?.schoolClass?.TUR_NOME ?? "N/A",
        TUR_PERIODO: studentTest?.schoolClass?.TUR_PERIODO ?? "N/A",
        ALU_ID: studentTest.ALT_ALU.ALU_ID,
        ALU_NOME: studentTest.ALT_ALU.ALU_NOME,
        PEL_NOME: studentTest?.ALT_ALU?.ALU_PEL?.PEL_NOME ?? "N/A",
        GEN_NOME: studentTest?.ALT_ALU?.ALU_GEN?.GEN_NOME ?? "N/A",
        AVA_NOME: ava.AVA_NOME,
        AVA_ID: ava.AVA_ID,
        AVA_ANO: ava.AVA_ANO,
        TEST_NOME: test.TES_NOME,
        TEST_ID: test.TES_ID,
        DIS_NOME: test.TES_DIS.DIS_NOME,
        ALT_FINALIZADO: studentTest.ALT_FINALIZADO ? 1 : 0,
        ALT_JUSTIFICATIVA: studentTest?.ALT_JUSTIFICATIVA?.trim() ? studentTest?.ALT_JUSTIFICATIVA : 'N/A',
        NR_QUESTAO: studentTestAnswer?.questionTemplate?.TEG_ID ?? "N/A",
        ATR_RESPOSTA: studentTestAnswer.ATR_RESPOSTA,
        ATR_CERTO: studentTestAnswer.ATR_CERTO ? 1 : 0,
        NOME_DESCRITOR: testTemplate?.TEG_MTI?.MTI_DESCRITOR ?? "N/A",
        COD_DESCRITOR: testTemplate?.TEG_MTI?.MTI_CODIGO ?? "N/A",
        TOP_DESCRITOR: testTemplate?.TEG_MTI?.MTI_MTO.MTO_ID ?? "N/A",
        TOP_NOME: testTemplate?.TEG_MTI?.MTI_MTO.MTO_NOME ?? "N/A",
      };

      formattedData.push(item);
    });
  });

  return {
    formattedData,
  };
}
