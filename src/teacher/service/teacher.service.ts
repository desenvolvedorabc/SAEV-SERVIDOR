import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { writeFileSync } from "fs";
import {
  paginate,
  IPaginationOptions,
  Pagination,
} from "nestjs-typeorm-paginate";
import { hashPassword } from "../../helpers/crypto";
import { editFileName } from "../../helpers/utils";
import { CreateTeacherDto } from "../../teacher/model/dto/CreateTeacherDto";
import { UpdateTeacherDto } from "../../teacher/model/dto/UpdateTeacherDto";
import { Teacher } from "../../teacher/model/entities/teacher.entity";
import { ITeacher } from "../../teacher/model/interface/teacher.interface";
import { Repository } from "typeorm";
import { IFormation } from "../model/interface/formation.interface";
import { ISkin } from "../model/interface/skin.interface";
import { IGender } from "../model/interface/gender.interface.ts";
import { Skin } from "../model/entities/skin.entity";
import { Formation } from "../model/entities/formation.entity";
import { Gender } from "../model/entities/gender.entity";
import { User } from "src/user/model/entities/user.entity";

@Injectable()
export class TeacherService {
  constructor(
    @InjectRepository(Teacher)
    private teacherRepository: Repository<Teacher>,
    @InjectRepository(Gender)
    private genderRepository: Repository<Gender>,
    @InjectRepository(Skin)
    private skinRepository: Repository<Skin>,
    @InjectRepository(Formation)
    private formationRepository: Repository<Formation>,
  ) {}

  /**
   *
   * @param id informação referente a identificação do usuário
   * @param filename nome do arquivo salvo
   * @returns informa que o usuário foi atualizada
   */
  async updateAvatar(
    PRO_ID: number,
    filename: string,
    base64: string,
    user: User,
  ): Promise<string> {
    let teacher = await this.teacherRepository.findOne({ PRO_ID: PRO_ID });
    const folderName = "./public/teacher/avatar/";
    const newFileName = editFileName(filename);
    if (teacher) {
      teacher.PRO_AVATAR = newFileName;
      writeFileSync(`${folderName}${newFileName}`, base64, {
        encoding: "base64",
      });
      await this.update(PRO_ID, teacher, user);
      return newFileName;
    } else {
      throw new HttpException(
        "Não é possível gravar esta imagem.",
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  /**
   * Listagem de usuários com paginação, ordenação e pesquisa por nome
   * @param options adicionar o limite e qual página estamos
   * @param search permitir pesquisa por um termo pelo nome do escola
   * @param order cria a ordenação para a listagem
   * @returns
   */
  async paginate(
    options: IPaginationOptions,
    search: string,
    column: string,
    orderBy: string,
    countyId: number,
  ): Promise<Pagination<Teacher>> {
    const queryBuilder = this.teacherRepository
      .createQueryBuilder("PROFESSOR")
      .select([
        "PROFESSOR.PRO_ID",
        "PROFESSOR.PRO_NOME",
        "PROFESSOR.PRO_DT_NASC",
        "PROFESSOR.PRO_EMAIL",
        "PROFESSOR.PRO_DOCUMENTO",
        "PROFESSOR.PRO_FONE",
        "PROFESSOR.PRO_EMAIL",
        "PRO_FOR.FOR_NOME",
        "PROFESSOR.PRO_COMPLEMENTO",
      ])
      .leftJoin("PROFESSOR.PRO_FOR", "PRO_FOR")
      .leftJoin("PROFESSOR.PRO_MUN", "PRO_MUN");

    const order: any = orderBy;

    switch (column) {
      case "PRO_NOME":
        queryBuilder.orderBy("PROFESSOR.PRO_NOME", order);
        break;
      case "PRO_EMAIL":
        queryBuilder.orderBy("PROFESSOR.PRO_EMAIL", order);
        break;
      case "PRO_FONE":
        queryBuilder.orderBy("PROFESSOR.PRO_FONE", order);
        break;
      case "PRO_DOCUMENTO":
        queryBuilder.orderBy("PROFESSOR.PRO_DOCUMENTO", order);
        break;
      case "PRO_FOR":
        queryBuilder.orderBy("PRO_FOR.FOR_NOME", order);
        break;
      case "PRO_DT_NASC":
        queryBuilder.orderBy("PROFESSOR.PRO_DT_NASC", order);
        break;
      default:
        break;
    }

    let strQuery = "";
    if (search) {
      search = search.replace("°", "º");
      strQuery = ` ( PROFESSOR.PRO_NOME LIKE '%${search}%' OR 
      PROFESSOR.PRO_DOCUMENTO LIKE '%${search}%' OR 
      PROFESSOR.PRO_FONE LIKE '%${search}%' OR 
      PROFESSOR.PRO_EMAIL LIKE '%${search}%' OR 
      PRO_FOR.FOR_NOME LIKE '%${search}%' ) `;
    }

    if (strQuery) {
      strQuery += " AND ";
    }
    strQuery += ` PRO_MUN.MUN_ID = '${countyId}' `;
    queryBuilder.where(strQuery);

    return paginate<Teacher>(queryBuilder, options);
  }

  add(createdTeacherDto: CreateTeacherDto, user: User): Promise<ITeacher> {
    return this.mailExists(createdTeacherDto.PRO_EMAIL).then(
      (exists: boolean) => {
        if (!exists) {
          return this.teacherRepository
            .save(createdTeacherDto, { data: user })
            .then((savedTeacher: ITeacher) => {
              return savedTeacher;
            });
        } else {
          throw new HttpException(
            "Já existe um usuário com esse email.",
            HttpStatus.CONFLICT,
          );
        }
      },
    );
  }

  async hashPassword(password: string): Promise<any> {
    return hashPassword(password);
  }

  findFormationAll(): Promise<IFormation[]> {
    return this.formationRepository.find({ order: { FOR_NOME: "ASC" } });
  }
  findSkinAll(): Promise<ISkin[]> {
    return this.skinRepository.find({ order: { PEL_NOME: "ASC" } });
  }
  findGenderAll(): Promise<IGender[]> {
    return this.genderRepository.find({ order: { GEN_NOME: "ASC" } });
  }

  findAll(MUN_ID: number): Promise<ITeacher[]> {
    return this.teacherRepository.find({
      order: { PRO_NOME: "ASC" },
      where: { PRO_MUN: { MUN_ID: MUN_ID }, PRO_ATIVO: true },
      relations: ["PRO_MUN", "PRO_GEN", "PRO_FOR", "PRO_PEL"],
    });
  }

  async findOne(PRO_ID: number, MUN_ID: number): Promise<ITeacher> {
    const teacher = await this.teacherRepository.findOne(
      { PRO_ID: PRO_ID },
      { relations: ["PRO_MUN", "PRO_GEN", "PRO_FOR", "PRO_PEL"] },
    );
    if (!teacher) {
      throw new HttpException("Professor não encontrado", HttpStatus.NOT_FOUND);
    }
    if (teacher.PRO_MUN["MUN_ID"] !== MUN_ID) {
      throw new HttpException(
        "Sem permissão de visualização",
        HttpStatus.CONFLICT,
      );
    }
    return teacher;
  }

  findTeacherByEmail(PRO_EMAIL: string): Promise<ITeacher> {
    return this.teacherRepository.findOne(
      { PRO_EMAIL },
      { select: ["PRO_ID", "PRO_EMAIL", "PRO_NOME"] },
    );
  }

  async mailExists(PRO_EMAIL: string): Promise<boolean> {
    const teacher = await this.teacherRepository.findOne({ PRO_EMAIL });
    if (teacher) {
      return true;
    } else {
      return false;
    }
  }

  async update(
    PRO_ID: number,
    updateTeacherDto: UpdateTeacherDto,
    user: User,
  ): Promise<ITeacher> {
    return this.teacherRepository.save(
      { ...updateTeacherDto, PRO_ID },
      { data: user },
    );
  }
}
