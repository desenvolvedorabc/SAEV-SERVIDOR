import { Student } from "../model/entities/student.entity";

export function mapperResponseStudents(students: Student[]) {
  const items = students.map((student) => {
    return {
      ALU_ID: student?.ALU_ID,
      ALU_NOME: student?.ALU_NOME,
      ALU_INEP: student?.ALU_INEP,
      ALU_ATIVO: student?.ALU_ATIVO,
      ALU_STATUS: student?.ALU_STATUS,
      ALU_DT_NASC: student?.ALU_DT_NASC,
      ALU_NOME_PAI: student?.ALU_NOME_PAI,
      ALU_NOME_MAE: student?.ALU_NOME_MAE,
      ALU_NOME_RESP: student?.ALU_NOME_RESP,
      MUN_NOME: student?.ALU_ESC?.ESC_MUN?.MUN_NOME,
      ESC_NOME: student?.ALU_ESC?.ESC_NOME ?? null,
      ESC_INEP: student?.ALU_ESC?.ESC_INEP ?? null,
      SER_NOME: student?.ALU_SER?.SER_NOME ?? null,
      TUR_NOME: student?.ALU_TUR?.TUR_NOME ?? null,
    };
  });

  return {
    items,
  };
}
