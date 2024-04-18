import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { InjectConnection, InjectRepository } from "@nestjs/typeorm";
import * as _ from "lodash";
import { writeFileSync, unlink, writeFile } from "node:fs";
import { Parser } from "json2csv";
import * as csv from "fast-csv";
import { editFileName } from "src/helpers/utils";
import { Connection, Repository } from "typeorm";
import { UpdateFileDto } from "../model/dto/update-file.dto";
import { ImportData } from "../model/entities/import-data.entity";
import { FileEntity } from "../model/entities/file.entity";
import { IFile } from "../model/interface/file.interface";
import { StatusImportData } from "../model/enum/status-data-enum";
import { UserService } from "src/user/service/user.service";
import { User } from "src/user/model/entities/user.entity";
import { School } from "src/school/model/entities/school.entity";
import { County } from "src/counties/model/entities/county.entity";
import { SubProfile } from "src/profile/model/entities/sub-profile.entity";
import { PaginationParams } from "src/helpers/params";
import {
  ImportDataStudent,
  ImportDataUser,
} from "../model/interface/data.interface";
import { StudentService } from "src/student/service/student.service";
import { SchoolClass } from "src/school-class/model/entities/school-class.entity";
import { parseDate } from "src/utils/parse-date";
import { Student } from "../../student/model/entities/student.entity";
import { paginateData } from "src/utils/paginate-data";
import { headersStudents, headersUsers } from "../constants/headers";

@Injectable()
export class FileService {
  constructor(
    @InjectRepository(FileEntity)
    private fileRepository: Repository<FileEntity>,
    @InjectRepository(ImportData)
    private importDataRepository: Repository<ImportData>,

    @InjectConnection()
    private readonly connection: Connection,

    private userService: UserService,

    private studentsService: StudentService,
  ) {}

  async importUsers(file: Express.Multer.File, user: User): Promise<void> {
    let importData = this.importDataRepository.create({
      DAT_NOME: "Usuários",
      DAT_ARQUIVO_URL: file.filename,
      DAT_USU: user,
    });

    importData = await this.importDataRepository.save(importData);

    try {
      const data = (await this.readCsvFile(
        file,
        headersUsers,
      )) as ImportDataUser[];

      const usersErrors = await this.saveUsers(data, user);

      if (!usersErrors.length) {
        await this.importDataRepository.save({
          ...importData,
          DAT_STATUS: StatusImportData.SUCCESS,
        });
      } else {
        await this.importDataError(usersErrors, importData);
      }
    } catch (err) {
      await this.importDataRepository.save({
        ...importData,
        DAT_STATUS: StatusImportData.ERROR,
        DAT_OBS:
          "Houve uma falha na leitura dos dados. Tente novamente depois.",
      });
    }
  }

  async saveUsers(
    usersData: ImportDataUser[],
    user: User,
  ): Promise<ImportDataUser[]> {
    const usersErros: ImportDataUser[] = [];

    for await (const userData of usersData) {
      const {
        USU_DOCUMENTO,
        USU_EMAIL,
        USU_FONE,
        USU_NOME,
        USU_SPE,
        USU_ESC_INEP,
        USU_MUN_IBGE,
      } = userData;

      try {
        const subProfile = await this.connection
          .getRepository(SubProfile)
          .findOneOrFail({
            where: {
              SPE_ID: USU_SPE,
            },
          });

        const school = await this.connection.getRepository(School).findOne({
          where: {
            ESC_INEP: USU_ESC_INEP,
          },
        });

        const county = await this.connection.getRepository(County).findOne({
          where: {
            MUN_COD_IBGE: USU_MUN_IBGE,
          },
        });

        await this.userService.add(
          {
            USU_DOCUMENTO,
            USU_EMAIL,
            USU_FONE,
            USU_NOME,
            USU_SENHA: new Date().toString(),
            USU_SPE: subProfile,
            USU_AVATAR: "",
            USU_ESC: school,
            USU_MUN: county,
          },
          user,
        );
      } catch (e) {
        usersErros.push(userData);
      }
    }

    return usersErros;
  }

  private async importDataError(
    usersErrors: ImportDataUser[] | ImportDataStudent[],
    importData: ImportData,
  ) {
    const parser = new Parser({
      quote: " ",
      withBOM: true,
      delimiter: ";",
    });

    const csvData = parser.parse(usersErrors);

    const nameFile = `${Date.now()}-upload-error.csv`;

    writeFile(`./public/file/${nameFile}`, csvData, async (err) => {
      if (err) {
        console.log(err);
      } else {
        await this.importDataRepository.save({
          ...importData,
          DAT_STATUS: StatusImportData.ERROR,
          DAT_ARQUIVO_ERROR_URL: nameFile,
        });
      }
    });
  }

  private async readCsvFile(file: any, headers: string[]) {
    return new Promise((resolve, reject) => {
      const data = [];

      csv
        .parseFile(file.path, {
          headers: true,
          trim: true,
          delimiter: ";",
        })
        .on("data", (row) => {
          Object.keys(row).forEach((key) => {
            const newKey = key.replace(/;/g, "");

            Object.assign(row, { [key]: row[key].replace(/;/g, "") });

            if (newKey !== key) {
              delete Object.assign(row, { [newKey]: row[key] })[key];
            }
          });

          data.push(row);
        })
        .on("end", () => {
          resolve(data);
        })
        .on("error", (err) => {
          unlink(file.path, () => {});
          reject();
          console.log(err);
        });
    });
  }

  async updateFile(
    ARQ_ID: number,
    filename: string,
    base64: string,
  ): Promise<string> {
    let file = await this.fileRepository.findOne({ ARQ_ID: ARQ_ID });
    const folderName = "./public/file/";
    const newFileName = editFileName(filename);
    if (file) {
      file.ARQ_URL = newFileName;
      writeFileSync(`${folderName}${newFileName}`, base64, {
        encoding: "base64",
      });
      await this.update(ARQ_ID, file);
      return newFileName;
    } else {
      throw new HttpException(
        "Não é possível gravar esta imagem.",
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  update(ARQ_ID: number, updateFileDto: UpdateFileDto): Promise<IFile> {
    return this.fileRepository.save({ ...updateFileDto, ARQ_ID });
  }

  async paginate(params: PaginationParams) {
    const { search, limit, order, page } = params;

    const queryBuilder = this.importDataRepository
      .createQueryBuilder("ImportData")
      .select(["ImportData", "DAT_USU.USU_ID", "DAT_USU.USU_NOME"])
      .leftJoin("ImportData.DAT_USU", "DAT_USU")
      .orderBy("ImportData.DAT_DT_CRIACAO", "DESC");

    if (search) {
      queryBuilder.andWhere("DAT_USU.USU_NOME like :search", {
        search: `%${search}%`,
      });
    }

    const data = await paginateData<ImportData>(page, limit, queryBuilder);

    return data;
  }

  async newImportStudents(file: Express.Multer.File, user: User) {
    const series = {
      1: 17,
      2: 18,
      3: 19,
      4: 20,
      5: 21,
      6: 23,
      7: 24,
      8: 25,
      9: 26,
    };

    let importData = this.importDataRepository.create({
      DAT_NOME: "Alunos",
      DAT_ARQUIVO_URL: file.filename,
      DAT_USU: user,
    });

    importData = await this.importDataRepository.save(importData);

    let data: ImportDataStudent[] = [];
    try {
      data = (await this.readCsvFile(
        {
          path: file.path,
        },
        headersStudents,
      )) as ImportDataStudent[];
    } catch (e) {
      return await this.importDataRepository.save({
        ...importData,
        DAT_STATUS: StatusImportData.ERROR,
        DAT_OBS:
          "Houve uma falha na leitura dos dados. Tente novamente depois.",
      });
    }

    data = data.map((data, index) => {
      return {
        ...data,
        ALU_NOME: data?.ALU_NOME?.toUpperCase()
          ?.replace(/^\s+|\s+$/g, "")
          ?.replace(/\s+/g, " "),
        ALU_NOME_MAE: data?.ALU_NOME_MAE?.toUpperCase()
          ?.replace(/^\s+|\s+$/g, "")
          ?.replace(/\s+/g, " "),
        ALU_NOME_PAI: data?.ALU_NOME_PAI?.toUpperCase()
          ?.replace(/^\s+|\s+$/g, "")
          ?.replace(/\s+/g, " "),
        ALU_NOME_RESP: data?.ALU_NOME_RESP?.toUpperCase()
          ?.replace(/^\s+|\s+$/g, "")
          ?.replace(/\s+/g, " "),
        index,
      };
    });

    let schoolsObj = {};
    try {
      const filterSchools = data
        .filter(function (a) {
          return (
            !this[JSON.stringify(a?.ALU_ESC_INEP)] &&
            (this[JSON.stringify(a?.ALU_ESC_INEP)] = true)
          );
        }, Object.create(null))
        .map((line) => line?.ALU_ESC_INEP);

      let schools = await this.connection
        .getRepository(School)
        .createQueryBuilder("School")
        .select(["School.ESC_ID", "School.ESC_INEP"])
        .innerJoinAndSelect("School.ESC_MUN", "ESC_MUN")
        .where("School.ESC_INEP IN(:...ineps)", { ineps: filterSchools })
        .getMany();

      schools.forEach((school) => {
        schoolsObj[school.ESC_INEP] = {
          id: school?.ESC_ID,
          county: school?.ESC_MUN,
        };
      });
    } catch (e) {
      return await this.importDataRepository.save({
        ...importData,
        DAT_STATUS: StatusImportData.ERROR,
        DAT_OBS:
          "Houve uma falha na leitura dos dados. Tente novamente depois.",
      });
    }

    const dataGroupped = _.groupBy(
      data,
      (line) =>
        schoolsObj[line.ALU_ESC_INEP]?.id +
        " " +
        series[line?.TUR_SER_NUMBER] +
        " " +
        line.TUR_PERIODO +
        " " +
        line.TUR_TIPO +
        " " +
        line.TUR_NOME,
    );

    const keyTurmas = Object.keys(dataGroupped);

    const indexUsersImport: number[] = [];
    for await (const key of keyTurmas) {
      const queryBuilder = await this.connection
        .getRepository(SchoolClass)
        .createQueryBuilder()
        .where("TUR_ANO = :schoolClassYear", {
          schoolClassYear: dataGroupped[key][0]?.TUR_ANO,
        })
        .andWhere("TUR_NOME = :schoolClassName", {
          schoolClassName: dataGroupped[key][0]?.TUR_NOME,
        })
        .andWhere("TUR_PERIODO = :schoolClassPeriod", {
          schoolClassPeriod: dataGroupped[key][0]?.TUR_PERIODO,
        })
        .andWhere("TUR_SER_ID = :schoolClassSeries", {
          schoolClassSeries: series[dataGroupped[key][0]?.TUR_SER_NUMBER],
        })
        .andWhere("TUR_ESC_ID = :school", {
          school: schoolsObj[dataGroupped[key][0]?.ALU_ESC_INEP]?.id,
        });

      if (dataGroupped[key][0].TUR_TIPO?.trim()) {
        queryBuilder.andWhere("TUR_TIPO = :schoolClassType", {
          schoolClassType: dataGroupped[key][0]?.TUR_TIPO,
        });
      }

      let schoolClass = await queryBuilder.getOne();

      if (!schoolClass) {
        const newSchoolClass = this.connection
          .getRepository(SchoolClass)
          .create({
            TUR_ANO: dataGroupped[key][0]?.TUR_ANO,
            TUR_NOME: dataGroupped[key][0]?.TUR_NOME,
            TUR_PERIODO: dataGroupped[key][0]?.TUR_PERIODO,
            TUR_TIPO: dataGroupped[key][0]?.TUR_TIPO,
            TUR_SER: series[dataGroupped[key][0]?.TUR_SER_NUMBER],
            TUR_ESC: schoolsObj[dataGroupped[key][0]?.ALU_ESC_INEP]?.id,
            TUR_MUN: schoolsObj[dataGroupped[key][0]?.ALU_ESC_INEP]?.county,
            TUR_ANEXO: dataGroupped[key][0]?.TUR_ANEXO === "Sim",
          });

        schoolClass = await this.connection
          .getRepository(SchoolClass)
          .save(newSchoolClass);
      }

      const studentRepository = this.connection.getRepository(Student);
      if (schoolClass) {
        await Promise.all(
          dataGroupped[key].map(async (aluno) => {
            const date = !!aluno?.ALU_DT_NASC?.trim() ? parseDate(aluno?.ALU_DT_NASC) : null;

            const dtNasc = !!date ? date + " 23:59:59" : null;

            const updateStudent = {
              ...aluno,
              ALU_DEFICIENCIA_BY_IMPORT: aluno?.ALU_PCD,
              ALU_SER: series[aluno?.TUR_SER_NUMBER],
              ALU_DT_NASC: dtNasc,
              ALU_ESC: schoolsObj[aluno.ALU_ESC_INEP]?.id,
              ALU_STATUS: "Enturmado",
              ALU_TUR: schoolClass,
              ALU_ATIVO: true,
              ALU_PCD: ''
            } as any;

            for (let key in updateStudent) {
              if (!String(updateStudent[key])?.trim()) {
                delete updateStudent[key];
              }
            }

            if (aluno?.ALU_CPF !== "") {
              const foundAlunoByCPF = await studentRepository.findOne({
                ALU_CPF: aluno.ALU_CPF,
              });
              if (foundAlunoByCPF) {
                const updatedStudent = await this.studentsService.update(
                  foundAlunoByCPF.ALU_ID,
                  updateStudent,
                  null,
                );
                indexUsersImport.push(Number(aluno.index));
                await this.studentsService.createSchoolClassByStudent(
                  updatedStudent,
                );
                return;
              }
            }

            if (aluno?.ALU_INEP !== "") {
              const foundAlunoByInep = await studentRepository.findOne({
                ALU_INEP: aluno?.ALU_INEP,
              });
              if (foundAlunoByInep) {
                const updatedStudent = await this.studentsService.update(
                  foundAlunoByInep.ALU_ID,
                  updateStudent,
                  null,
                );
                indexUsersImport.push(Number(aluno.index));
                await this.studentsService.createSchoolClassByStudent(
                  updatedStudent,
                );
                return;
              }
            }

            try {
              if (
                await this.validateAndUpsertAlunoByNameAndMotherName({
                  ...updateStudent,
                  ALU_ESC: schoolsObj[aluno.ALU_ESC_INEP]?.id,
                })
              ) {
                indexUsersImport.push(Number(aluno.index));
                return;
              }
            } catch (err) {
              console.log(err);
            }

            try {
              const ALU_GEN = !!aluno?.ALU_GEN?.trim() ? aluno?.ALU_GEN : null
              const ALU_PEL = !!aluno?.ALU_PEL?.trim() ? aluno?.ALU_PEL : null


              await this.studentsService.addByImport(
                {
                  ...aluno,
                  ALU_SER: series[aluno.TUR_SER_NUMBER],
                  ALU_DT_NASC: dtNasc,
                  ALU_GEN,
                  ALU_PEL,
                  ALU_ESC: schoolsObj[aluno.ALU_ESC_INEP]?.id,
                  ALU_AVATAR: "",
                  ALU_STATUS: "Enturmado",
                  ALU_TUR: schoolClass,
                  ALU_ATIVO: true,
                  ALU_DEFICIENCIA_BY_IMPORT: aluno?.ALU_PCD,
                },
                null,
              );

              indexUsersImport.push(Number(aluno.index));
            } catch (err) {
              console.log(err);
            }
          }),
        );
      }
    }

    const usersNotImport = data.filter(
      (student) => !indexUsersImport.includes(student.index),
    );

    if (!usersNotImport.length) {
      await this.importDataRepository.save({
        ...importData,
        DAT_STATUS: StatusImportData.SUCCESS,
      });
    } else {
      await this.importDataError(usersNotImport, importData);
    }
  }

  private async validateAndUpsertAlunoByNameAndMotherName(aluno: any) {
    const foundAlunoByNameAndMotherName = await this.connection
      .getRepository(Student)
      .findOne({
        ALU_NOME: aluno.ALU_NOME,
        ALU_NOME_MAE: aluno.ALU_NOME_MAE,
      });
    if (foundAlunoByNameAndMotherName) {
      const updatedStudent = await this.studentsService.update(
        foundAlunoByNameAndMotherName.ALU_ID,
        aluno,
        null,
      );
      await this.studentsService.createSchoolClassByStudent(updatedStudent);

      return true;
    }
    return false;
  }
}
