import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { InjectConnection, InjectRepository } from "@nestjs/typeorm";
import * as _ from "lodash";
import { writeFileSync, unlink, writeFile, readFileSync } from "node:fs";
import { Parser } from "json2csv";
import * as csv from "fast-csv";
import { paginate, PaginationTypeEnum } from "nestjs-typeorm-paginate";
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
import { Serie } from "src/serie/model/entities/serie.entity";
import { parseDate } from "src/utils/parse-date";
import { Student } from "../../student/model/entities/student.entity";
import { CSVToArray } from "src/utils/csv-to-array";

const headersUsers = [
  "USU_NOME",
  "USU_EMAIL",
  "USU_DOCUMENTO",
  "USU_FONE",
  "USU_SPE",
  "USU_MUN_IBGE",
  "USU_ESC_INEP",
];

const headersStudents = [
  "ALU_NOME",
  "ALU_ESC_INEP",
  "ALU_SER",
  "ALU_NOME_MAE",
  "ALU_DT_NASC",
  "TUR_ANO",
  "TUR_ESC_INEP",
  "TUR_SER_NUMBER",
  "TUR_PERIODO",
  "TUR_TIPO",
  "TUR_NOME",
  "ALU_CPF",
  "TUR_ANEXO",
  "ALU_INEP",
  "ALU_GEN",
  "ALU_NOME_PAI",
  "ALU_NOME_RESP",
  "ALU_TEL1",
  "ALU_TEL2",
  "ALU_EMAIL",
  "ALU_PCD",
  "ALU_PEL",
  "ALU_CEP",
  "ALU_UF",
  "ALU_CIDADE",
  "ALU_ENDERECO",
  "ALU_NUMERO",
  "ALU_COMPLEMENTO",
  "ALU_BAIRRO",
];

@Injectable()
export class FileService {
  constructor(
    @InjectRepository(FileEntity)
    private fileRepository: Repository<FileEntity>,
    @InjectRepository(ImportData)
    private importDataRepository: Repository<ImportData>,

    @InjectRepository(User)
    private userRepository: Repository<User>,

    @InjectConnection()
    private readonly connection: Connection,

    private userService: UserService,

    private studentsService: StudentService,
  ) {}

  async importStudents(file: Express.Multer.File, user: User): Promise<void> {
    let importData = this.importDataRepository.create({
      DAT_NOME: "Alunos",
      DAT_ARQUIVO_URL: file.filename,
      DAT_USU: user,
    });

    importData = await this.importDataRepository.save(importData);

    try {
      const data = (await this.readCsvFile(
        file,
        headersStudents,
      )) as ImportDataStudent[];

      const studentsErrors = await this.saveStudents(data, user);

      if (!studentsErrors.length) {
        await this.importDataRepository.save({
          ...importData,
          DAT_STATUS: StatusImportData.SUCCESS,
        });
      } else {
        await this.importDataError(studentsErrors, importData);
      }
    } catch (err) {
      await this.importDataRepository.save({
        ...importData,
        DAT_STATUS: StatusImportData.ERROR,
        DAT_OBS: "Houve uma falha na leitura dos dados",
      });
    }
  }

  async saveStudents(studentsData: ImportDataStudent[], user: User) {
    const studentsErrors: ImportDataStudent[] = [];

    for await (const studentData of studentsData) {
      const {
        TUR_ANO,
        ALU_ESC_INEP,
        ALU_DT_NASC,
        TUR_SER_NUMBER,
        TUR_PERIODO,
        TUR_TIPO,
        TUR_NOME,
        ALU_GEN,
        ALU_PCD,
        ALU_PEL,
      } = studentData;

      try {
        const serie = await this.connection.getRepository(Serie).findOneOrFail({
          where: {
            SER_NUMBER: TUR_SER_NUMBER,
          },
        });

        const school = await this.connection
          .getRepository(School)
          .findOneOrFail({
            where: {
              ESC_INEP: ALU_ESC_INEP,
            },
            relations: ["ESC_MUN"],
          });

        let schoolClass = await this.connection
          .getRepository(SchoolClass)
          .findOne({
            where: {
              TUR_ANO,
              TUR_NOME,
              TUR_PERIODO,
              TUR_TIPO,
              TUR_SER: {
                SER_ID: serie.SER_ID,
              },
            },
          });

        if (schoolClass && !schoolClass.TUR_ATIVO) {
          throw new Error("Turma inativa");
        }

        if (!schoolClass) {
          const newSchoolClass = this.connection
            .getRepository(SchoolClass)
            .create({
              TUR_ANO,
              TUR_NOME,
              TUR_PERIODO,
              TUR_TIPO,
              TUR_SER: serie,
              TUR_ESC: school,
              TUR_MUN: school.ESC_MUN,
            });

          schoolClass = await this.connection
            .getRepository(SchoolClass)
            .save(newSchoolClass);
        }

        const date = parseDate(ALU_DT_NASC);

        if (!date) {
          throw new Error("Date invalid");
        }

        const dtNasc = date + " 23:59:59";

        const formattedPcd = !!String(ALU_PCD)?.trim() ? ALU_PCD : null;

        await this.studentsService.add(
          {
            ...studentData,
            ALU_SER: serie,
            ALU_DT_NASC: dtNasc,
            ALU_GEN: ALU_GEN as any,
            ALU_PCD: formattedPcd as any,
            ALU_PEL: ALU_PEL as any,
            ALU_ESC: school,
            ALU_AVATAR: "",
            ALU_STATUS: "Enturmado",
            ALU_TUR: schoolClass,
            ALU_ATIVO: true,
          },
          user,
        );
      } catch (e) {
        console.log(e);
        studentsErrors.push(studentData);
      }
    }

    return studentsErrors;
  }

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

    const totalItems = await queryBuilder.getCount();

    const data = await paginate(queryBuilder, {
      page,
      limit,
      paginationType: PaginationTypeEnum.TAKE_AND_SKIP,
      countQueries: true,
      metaTransformer: ({ currentPage, itemCount, itemsPerPage }) => {
        const totalPages = Math.ceil(totalItems / itemsPerPage);
        return {
          currentPage,
          itemCount,
          itemsPerPage,
          totalItems,
          totalPages: totalPages === 0 ? 1 : totalPages,
        };
      },
    });

    return data;
  }

  async testeNewImport(file: Express.Multer.File, user: User) {
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
        index,
      };
    });

    let county: County = null;
    let schoolsObj = {};
    try {
     const filterSchools = data
        .filter(function (a) {
          return (
            !this[JSON.stringify(a.ALU_ESC_INEP)] &&
            (this[JSON.stringify(a.ALU_ESC_INEP)] = true)
          );
        }, Object.create(null))
        .map((line) => line.ALU_ESC_INEP);

      console.log(filterSchools)


      const schools = await this.connection
        .getRepository(School)
        .createQueryBuilder("School")
        .select(["School.ESC_ID", "School.ESC_INEP"])
        .where("School.ESC_INEP IN(:...ineps)", { ineps: filterSchools })
        .getMany();

      const school = await this.connection.getRepository(School).findOne({
        where: {
          ESC_ID: schools[0].ESC_ID,
        },
        relations: ["ESC_MUN"],
      });


      county = school.ESC_MUN;

      schools.forEach((school) => {
        schoolsObj[school.ESC_INEP] = school.ESC_ID;
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
        schoolsObj[line.ALU_ESC_INEP] +
        " " +
        series[line.TUR_SER_NUMBER] +
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
          schoolClassYear: dataGroupped[key][0].TUR_ANO,
        })
        .andWhere("TUR_NOME = :schoolClassName", {
          schoolClassName: dataGroupped[key][0].TUR_NOME,
        })
        .andWhere("TUR_PERIODO = :schoolClassPeriod", {
          schoolClassPeriod: dataGroupped[key][0].TUR_PERIODO,
        })
        .andWhere("TUR_SER_ID = :schoolClassSeries", {
          schoolClassSeries: series[dataGroupped[key][0].TUR_SER_NUMBER],
        })
        .andWhere("TUR_ESC_ID = :school", {
          school: schoolsObj[dataGroupped[key][0].ALU_ESC_INEP],
        });

      if (dataGroupped[key][0].TUR_TIPO?.trim()) {
        queryBuilder.andWhere("TUR_TIPO = :schoolClassType", {
          schoolClassType: dataGroupped[key][0].TUR_TIPO,
        });
      }

      let schoolClass = await queryBuilder.getOne();

      if (!schoolClass) {
        const newSchoolClass = this.connection
          .getRepository(SchoolClass)
          .create({
            TUR_ANO: dataGroupped[key][0].TUR_ANO,
            TUR_NOME: dataGroupped[key][0].TUR_NOME,
            TUR_PERIODO: dataGroupped[key][0].TUR_PERIODO,
            TUR_TIPO: dataGroupped[key][0].TUR_TIPO,
            TUR_SER: series[dataGroupped[key][0].TUR_SER_NUMBER],
            TUR_ESC: schoolsObj[dataGroupped[key][0].ALU_ESC_INEP],
            TUR_MUN: county,
            TUR_ANEXO: dataGroupped[key][0]?.TUR_ANEXO === 'Sim'
          });

        schoolClass = await this.connection
          .getRepository(SchoolClass)
          .save(newSchoolClass);
      }

      const studentRepository = this.connection.getRepository(Student);
      if (schoolClass) {
        await Promise.all(
          dataGroupped[key].map(async (aluno) => {
            const date = parseDate(aluno.ALU_DT_NASC);

            const dtNasc = date + " 23:59:59";

            const formattedPcd = !!String(aluno.ALU_PCD)?.trim()
              ? aluno.ALU_PCD
              : null;

            if (aluno.ALU_CPF !== "") {
              const foundAlunoByCPF = await studentRepository.findOne({
                ALU_CPF: aluno.ALU_CPF,
              });
              if (foundAlunoByCPF) {
                const updatedStudent = await this.studentsService.update(
                  foundAlunoByCPF.ALU_ID,
                  {
                    ...aluno,
                    ALU_SER: series[aluno.TUR_SER_NUMBER],
                    ALU_DT_NASC: dtNasc,
                    ALU_GEN: aluno.ALU_GEN as any,
                    ALU_PCD: formattedPcd as any,
                    ALU_PEL: aluno.ALU_PEL as any,
                    ALU_ESC: schoolsObj[aluno.ALU_ESC_INEP],
                    ALU_STATUS: "Enturmado",
                    ALU_TUR: schoolClass,
                    ALU_ATIVO: true,
                  },
                  null,
                );
                indexUsersImport.push(Number(aluno.index));
                await this.studentsService.zoera(updatedStudent);
                return;
              }
            }

            if (aluno.ALU_INEP !== "") {
              const foundAlunoByInep = await studentRepository.findOne({
                ALU_INEP: aluno.ALU_INEP,
              });
              if (foundAlunoByInep) {
                const updatedStudent = await this.studentsService.update(
                  foundAlunoByInep.ALU_ID,
                  {
                    ...aluno,
                    ALU_SER: series[aluno.TUR_SER_NUMBER],
                    ALU_DT_NASC: dtNasc,
                    ALU_GEN: aluno.ALU_GEN as any,
                    ALU_PCD: formattedPcd as any,
                    ALU_PEL: aluno.ALU_PEL as any,
                    ALU_ESC: schoolsObj[aluno.ALU_ESC_INEP],
                    ALU_STATUS: "Enturmado",
                    ALU_TUR: schoolClass,
                    ALU_ATIVO: true,
                  },
                  null,
                );
                indexUsersImport.push(Number(aluno.index));
                await this.studentsService.zoera(updatedStudent);
                return;
              }
            }

            if (
              await this.validateAndUpsertAlunoByNameAndMotherName({
                ...aluno,
                ALU_SER: series[aluno.TUR_SER_NUMBER],
                ALU_DT_NASC: dtNasc,
                ALU_GEN: aluno.ALU_GEN as any,
                ALU_PCD: formattedPcd as any,
                ALU_PEL: aluno.ALU_PEL as any,
                ALU_ESC: schoolsObj[aluno.ALU_ESC_INEP],
                ALU_STATUS: "Enturmado",
                ALU_TUR: schoolClass,
                ALU_ATIVO: true,
              })
            ) {
              indexUsersImport.push(Number(aluno.index));
              return;
            }

            await this.studentsService.addByImport(
              {
                ...aluno,
                ALU_SER: series[aluno.TUR_SER_NUMBER],
                ALU_DT_NASC: dtNasc,
                ALU_GEN: aluno.ALU_GEN as any,
                ALU_PCD: formattedPcd as any,
                ALU_PEL: aluno.ALU_PEL as any,
                ALU_ESC: schoolsObj[aluno.ALU_ESC_INEP],
                ALU_AVATAR: "",
                ALU_STATUS: "Enturmado",
                ALU_TUR: schoolClass,
                ALU_ATIVO: true,
              },
              null,
            );

            indexUsersImport.push(Number(aluno.index));
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

  async tempImport(filename: string) {
    const escolasSerra = {
      "26021650": 136,
      "26186136": 140,
      "26021811": 144,
      "26021358": 146,
      "26154870": 147,
      "26021676": 151,
      "26021889": 153,
      "26021935": 154,
      "26021625": 156,
      "26021617": 159,
      "26021986": 165,
      "26021897": 313,
      "26021765": 314,
      "26021773": 323,
      "26022770": 329,
      "26155001": 331,
      "26021919": 385,
      "26022290": 388,
      "26021013": 389,
      "26022010": 390,
      "26021226": 399,
      "26021234": 402,
      "26022389": 403,
      "26022397": 547,
      "26021315": 548,
      "26021374": 553,
      "26021404": 554,
      "26022150": 555,
      "26021420": 559,
      "26022303": 560,
      "26022168": 629,
      "26022176": 631,
      "26021528": 634,
      "26022630": 637,
      "26022320": 638,
      "26022346": 644,
      "26022761": 645,
      "26021749": 646,
      "26022478": 650,
      "26021595": 651,
      "26021684": 654,
      "26022494": 655,
      "26022656": 656,
      "26022311": 1192,
      "26022362": 1193,
      "26189151": 1435,
    };

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

    const data = (await this.readCsvFile(
      {
        path: filename,
      },
      headersStudents,
    )) as any[];

    const studentRepository = this.connection.getRepository(Student);

    await Promise.all(
      data.map(async (aluno) => {
        let schoolClass = await this.connection
          .getRepository(SchoolClass)
          .createQueryBuilder()
          .where("TUR_ANO = :schoolClassYear", {
            schoolClassYear: aluno.TUR_ANO,
          })
          .andWhere("TUR_NOME = :schoolClassName", {
            schoolClassName: aluno.TUR_NOME,
          })
          .andWhere("TUR_PERIODO = :schoolClassPeriod", {
            schoolClassPeriod: aluno.TUR_PERIODO,
          })
          .andWhere("TUR_TIPO = :schoolClassType", {
            schoolClassType: aluno.TUR_TIPO,
          })
          .andWhere("TUR_SER_ID = :schoolClassSeries", {
            schoolClassSeries: series[aluno.TUR_SER_NUMBER],
          })
          .getOne();

        const date = parseDate(aluno.ALU_DT_NASC);

        const dtNasc = date + " 23:59:59";

        const formattedPcd = !!String(aluno.ALU_PCD)?.trim()
          ? aluno.ALU_PCD
          : null;

        if (aluno.ALU_INEP !== "") {
          const foundAlunoByInep = await studentRepository.findOne({
            ALU_INEP: aluno.ALU_INEP,
          });
          if (foundAlunoByInep) {
            const updatedStudent = await this.studentsService.update(
              foundAlunoByInep.ALU_ID,
              {
                ...aluno,
                ALU_SER: series[aluno.TUR_SER_NUMBER],
                ALU_DT_NASC: dtNasc,
                ALU_GEN: aluno.ALU_GEN as any,
                ALU_PCD: formattedPcd as any,
                ALU_PEL: aluno.ALU_PEL as any,
                ALU_ESC: escolasSerra[aluno.ALU_ESC_INEP],
                ALU_AVATAR: "",
                ALU_STATUS: "Enturmado",
                ALU_TUR: schoolClass,
                ALU_ATIVO: true,
              },
              null,
            );
            await this.studentsService.zoera(updatedStudent);
            return;
          }
        }

        if (
          await this.validateAndUpsertAlunoByNameAndMotherName({
            ...aluno,
            ALU_SER: series[aluno.TUR_SER_NUMBER],
            ALU_DT_NASC: dtNasc,
            ALU_GEN: aluno.ALU_GEN as any,
            ALU_PCD: formattedPcd as any,
            ALU_PEL: aluno.ALU_PEL as any,
            ALU_ESC: escolasSerra[aluno.ALU_ESC_INEP],
            ALU_AVATAR: "",
            ALU_STATUS: "Enturmado",
            ALU_TUR: schoolClass,
            ALU_ATIVO: true,
          })
        )
          return;

        await this.studentsService.add(
          {
            ...aluno,
            ALU_SER: series[aluno.TUR_SER_NUMBER],
            ALU_DT_NASC: dtNasc,
            ALU_GEN: aluno.ALU_GEN as any,
            ALU_PCD: formattedPcd as any,
            ALU_PEL: aluno.ALU_PEL as any,
            ALU_ESC: escolasSerra[aluno.ALU_ESC_INEP],
            ALU_AVATAR: "",
            ALU_STATUS: "Enturmado",
            ALU_TUR: schoolClass,
            ALU_ATIVO: true,
          },
          null,
        );
      }),
    );
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
      await this.studentsService.zoera(updatedStudent);

      return true;
    }
    return false;
  }
}
