import {
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { writeFileSync } from "fs";
import * as crypto from "crypto";
import {
  paginate,
  IPaginationOptions,
  Pagination,
} from "nestjs-typeorm-paginate";
import { hashPassword } from "../../helpers/crypto";
import { editFileName } from "../../helpers/utils";
import { CreateUserDto } from "../../user/model/dto/CreateUserDto";
import { UpdateUserDto } from "../../user/model/dto/UpdateUserDto";
import { User } from "../../user/model/entities/user.entity";
import { IUser } from "../../user/model/interface/user.interface";
import { Not, Repository } from "typeorm";
import { PaginationParams } from "src/helpers/params";
import { ForgetPassword } from "../model/entities/forget-password.entity";
import { sendEmail } from "src/helpers/sendMail";
import { welcomeTemplate } from "templates/welcome";

@Injectable()
export class UserService {
  private readonly clientAppUrl: string;

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,

    @InjectRepository(ForgetPassword)
    private readonly forgetPasswordRepository: Repository<ForgetPassword>,
  ) {
    this.clientAppUrl = process.env.FRONT_APP_URL;
  }

  /**
   *
   * @param id informação referente a identificação do usuário
   * @param filename nome do arquivo salvo
   * @returns informa que o usuário foi atualizada
   */
  async updateAvatar(
    USU_ID: number,
    filename: string,
    base64: string,
    userLogin: User,
  ): Promise<string> {
    let user = await this.userRepository.findOne({ USU_ID: USU_ID });
    const folderName = "./public/user/avatar/";
    const newFileName = editFileName(filename);
    if (user) {
      user.USU_AVATAR = newFileName;
      writeFileSync(`${folderName}${newFileName}`, base64, {
        encoding: "base64",
      });
      await this.update(USU_ID, user, userLogin);
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
    paginationParams: PaginationParams,
    user: User,
  ): Promise<Pagination<User>> {
    let {
      search,
      column,
      order: orderBy,
      county,
      school,
      profileBase,
      subProfile,
    } = paginationParams;
    const queryBuilder = this.userRepository
      .createQueryBuilder("USUARIO")
      .select([
        "USUARIO.USU_ID",
        "USUARIO.USU_NOME",
        "USUARIO.USU_EMAIL",
        "USU_MUN.MUN_ID",
        "USU_MUN.MUN_NOME",
        "USU_ESC.ESC_ID",
        "USU_ESC.ESC_NOME",
        "USU_SPE.SPE_ID",
        "USU_SPE.SPE_NOME",
        "SPE_PER.PER_ID",
        "SPE_PER.PER_NOME",
      ])
      .leftJoin("USUARIO.USU_MUN", "USU_MUN")
      .leftJoin("USUARIO.USU_ESC", "USU_ESC")
      .leftJoin("USUARIO.USU_SPE", "USU_SPE")
      .leftJoin("USU_SPE.SPE_PER", "SPE_PER");

    let strQuery = "";
    if (search) {
      search = search.replace("°", "º");
      strQuery = ` ( USUARIO.USU_NOME LIKE '%${search}%' OR USUARIO.USU_EMAIL LIKE '%${search}%' OR 
                   USU_MUN.MUN_NOME LIKE '%${search}%' OR USU_ESC.ESC_NOME LIKE '%${search}%' OR 
                   USU_SPE.SPE_NOME LIKE '%${search}%' OR SPE_PER.PER_NOME LIKE '%${search}%' ) `;
    }

    if (county) {
      if (strQuery) {
        strQuery += " AND ";
      }
      strQuery += `USUARIO.USU_MUN.MUN_ID = '${county}'`;
    }

    if (school) {
      if (strQuery) {
        strQuery += " AND ";
      }
      strQuery += `USU_ESC.ESC_ID = '${school}'`;
    }

    if (profileBase) {
      if (strQuery) {
        strQuery += " AND ";
      }
      strQuery += `SPE_PER.PER_ID = '${profileBase}'`;
    }

    if (subProfile) {
      if (strQuery) {
        strQuery += " AND ";
      }
      strQuery += `USU_SPE.SPE_ID = '${subProfile}'`;
    }

    if (user.USU_SPE.SPE_PER.PER_NOME === "Município") {
      if (strQuery) {
        strQuery += " AND ";
      }
      strQuery += `USU_MUN.MUN_ID = '${user?.USU_MUN?.MUN_ID}'`;
    }

    if (user.USU_SPE.SPE_PER.PER_NOME === "Escola") {
      if (strQuery) {
        strQuery += " AND ";
      }
      strQuery += `USU_MUN.MUN_ID = '${user?.USU_MUN?.MUN_ID}'`;
      if (strQuery) {
        strQuery += " AND ";
      }
      strQuery += `USU_ESC.ESC_ID = '${user?.USU_ESC?.ESC_ID}'`;
    }

    queryBuilder.where(strQuery);
    const order: any = orderBy;

    switch (column) {
      case "USU_NOME":
        queryBuilder.orderBy("USUARIO.USU_NOME", order);
        break;
      case "USU_EMAIL":
        queryBuilder.orderBy("USUARIO.USU_EMAIL", order);
        break;
      case "USU_MUN":
        queryBuilder.orderBy("USU_MUN.MUN_NOME", order);
        break;
      case "USU_ESC":
        queryBuilder.orderBy("USU_ESC.ESC_NOME", order);
        break;
      case "USU_SUBPERFIL":
        queryBuilder.orderBy("USU_SPE.SPE_NOME", order);
        break;
      case "USU_PERFIL":
        queryBuilder.orderBy("SPE_PER.PER_NOME", order);
        break;
      default:
        break;
    }

    return paginate<User>(queryBuilder, options);
  }

  async add(createdUserDto: CreateUserDto, userLogin: User): Promise<IUser> {
    if (await this.mailExists(createdUserDto.USU_EMAIL)) {
      throw new ConflictException("Já existe um usuário com esse email.");
    }

    if (await this.cpfExists(createdUserDto.USU_DOCUMENTO)) {
      throw new ConflictException("Já existe um usuário com esse CPF.");
    }

    createdUserDto.USU_SENHA = await this.hashPassword(
      createdUserDto.USU_SENHA,
    );

    const newUser = await this.userRepository.save(createdUserDto, {
      data: userLogin,
    });

    this.welcomePasswordChangeLink(newUser.USU_ID);

    const { USU_SENHA, ...user } = newUser;

    return user;
  }

  async welcomePasswordChangeLink(userId: number) {
    const user = await this.findOne(userId);

    if (!user) {
      throw new NotFoundException("Usuário não encontrado");
    }

    let forgetPassword = await this.forgetPasswordRepository.findOne({
      where: {
        user,
      },
      relations: ["user"],
    });

    const code = crypto.randomUUID().substring(0, 6);

    if (!forgetPassword) {
      forgetPassword = this.forgetPasswordRepository.create({
        token: code,
        isValid: true,
        user,
      });
    } else {
      forgetPassword.token = code;
      forgetPassword.isValid = true;
    }

    await this.forgetPasswordRepository.save(forgetPassword);
    const forgotLink = `${this.clientAppUrl}/nova-senha?token=${code}`;

    const html = welcomeTemplate(this.clientAppUrl, forgotLink);

    await sendEmail(user.USU_EMAIL, "Saev | Seja Bem-vindo ao SAEV!", html);
  }

  async hashPassword(password: string): Promise<any> {
    return hashPassword(password);
  }

  findAll(): Promise<IUser[]> {
    return this.userRepository.find({
      order: { USU_NOME: "ASC" },
      relations: ["USU_MUN", "USU_ESC", "USU_SPE"],
    });
  }

  findOne(USU_ID: number): Promise<IUser> {
    return this.userRepository.findOne(
      { USU_ID: USU_ID },
      { relations: ["USU_MUN", "USU_ESC", "USU_SPE", "USU_SPE.SPE_PER"] },
    );
  }

  findUserByEmail(USU_EMAIL: string): Promise<IUser> {
    return this.userRepository.findOne(
      { USU_EMAIL },
      { select: ["USU_ID", "USU_EMAIL", "USU_NOME", "USU_SENHA", "USU_ATIVO"] },
    );
  }

  async mailExists(USU_EMAIL: string): Promise<boolean> {
    const user = await this.userRepository.findOne({ USU_EMAIL });
    if (user) {
      return true;
    } else {
      return false;
    }
  }

  async cpfExists(cpf: string): Promise<boolean> {
    const user = await this.userRepository.findOne({
      where: {
        USU_DOCUMENTO: cpf,
      },
    });
    if (user) {
      return true;
    } else {
      return false;
    }
  }

  async verifyExistEmailOrCpf(idUser: number, email?: string, cpf?: string) {
    let findUser = null;

    if (email) {
      findUser = await this.userRepository.findOne({
        where: {
          USU_EMAIL: email,
          USU_ID: Not(idUser),
        },
      });
    } else if (cpf) {
      findUser = await this.userRepository.findOne({
        where: {
          USU_DOCUMENTO: cpf,
          USU_ID: Not(idUser),
        },
      });
    }

    if (findUser) {
      return true;
    } else {
      return false;
    }
  }

  async update(
    USU_ID: number,
    updateUserDto: UpdateUserDto,
    user: User,
  ): Promise<IUser> {
    return this.userRepository.save(
      { ...updateUserDto, USU_ID },
      { data: user },
    );
  }

  async updateIsChangePasswordWelcome(user: User): Promise<IUser> {
    return this.userRepository.save({
      ...user,
      isChangePasswordWelcome: true,
    });
  }

  async updateUser(
    id: number,
    updateUserDto: UpdateUserDto,
    user: User,
  ): Promise<IUser> {
    if (await this.verifyExistEmailOrCpf(id, updateUserDto.USU_EMAIL, null)) {
      throw new ConflictException("Já existe um usuário com esse email.");
    }

    if (
      await this.verifyExistEmailOrCpf(id, null, updateUserDto.USU_DOCUMENTO)
    ) {
      throw new ConflictException("Já existe um usuário com esse CPF.");
    }

    if (updateUserDto.USU_SENHA) {
      return this.hashPassword(updateUserDto.USU_SENHA).then(
        (passwordHash: string) => {
          updateUserDto.USU_SENHA = passwordHash;
          return this.userRepository.save(
            { ...updateUserDto, USU_ID: id },
            { data: user },
          );
        },
      );
    }

    return this.userRepository.save(
      { ...updateUserDto, USU_ID: id },
      { data: user },
    );
  }

  async updatePassword(USU_ID: number, password: string): Promise<IUser> {
    const user = (await this.userRepository.findOne({
      USU_ID,
    })) as UpdateUserDto;
    if (user) {
      user.USU_SENHA = password;
      return this.userRepository.save({ ...user, USU_ID });
    }
  }
}
