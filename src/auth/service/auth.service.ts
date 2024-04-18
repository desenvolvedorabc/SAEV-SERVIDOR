import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import * as crypto from "crypto";
import { JwtService } from "@nestjs/jwt";
import { sendEmail } from "../../helpers/sendMail";
import { hashPassword, matchPassword } from "../../helpers/crypto";
import { ForgotPasswordDto } from "../model/dto/ForgotPasswordDto";
import { LoginUserDto } from "../model/dto/LoginUserDto";
import { IUser } from "../../user/model/interface/user.interface";
import { UserService } from "../../user/service/user.service";
import { ChangePasswordDto } from "../model/dto/ChangePasswordDto";
import { ForgetPassword } from "src/user/model/entities/forget-password.entity";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { forgetPasswordTemplate } from "templates/forget-password";
import { changePasswordSuccessTemplate } from "templates/change-password-success";
import { User } from "src/user/model/entities/user.entity";

@Injectable()
export class AuthService {
  private readonly clientAppUrl: string;

  constructor(
    private userService: UserService,
    private readonly jwtService: JwtService,

    @InjectRepository(ForgetPassword)
    private readonly forgetPasswordRepository: Repository<ForgetPassword>,
  ) {
    this.clientAppUrl = process.env.FRONT_APP_URL;
  }

  async generateJwt(user: IUser): Promise<string> {
    return this.jwtService.signAsync({ user });
  }

  async hashPassword(password: string): Promise<any> {
    return hashPassword(password);
  }

  async comparePasswords(
    password: string,
    storedPasswordHash: string,
  ): Promise<any> {
    return matchPassword(password, storedPasswordHash);
  }

  async login(loginUserDto: LoginUserDto): Promise<any> {
    return this.userService
      .findUserByEmail(loginUserDto.USU_EMAIL)
      .then((user: IUser) => {
        if (user) {
          return this.validatePassword(
            loginUserDto.USU_SENHA,
            user.USU_SENHA,
          ).then((passwordsMatches: boolean) => {
            if (passwordsMatches) {
              if (!user.USU_ATIVO) {
                throw new HttpException(
                  "Seu usuário não tem permissão para acessar o sistema",
                  HttpStatus.UNAUTHORIZED,
                );
              }

              return this.userService
                .findOne(user.USU_ID)
                .then((_user: IUser) => this.generateJwt(_user));
            } else {
              throw new HttpException(
                "Usuário ou senha inválidos, revise seus dados.",
                HttpStatus.UNAUTHORIZED,
              );
            }
          });
        } else {
          throw new HttpException(
            "Usuário ou senha inválidos, revise seus dados.",
            HttpStatus.UNAUTHORIZED,
          );
        }
      });
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto): Promise<boolean> {
    const user = await this.userService.findUserByEmail(
      forgotPasswordDto.email,
    );
    if (!user) {
      throw new BadRequestException("Email não encontrado");
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

    this.forgetPasswordRepository.save(forgetPassword);

    const forgotLink = `${this.clientAppUrl}/nova-senha?token=${code}`;
    const html = forgetPasswordTemplate(this.clientAppUrl, forgotLink);

    await sendEmail(
      user.USU_EMAIL,
      "Saev | Pedido de redefinição de senha",
      html,
    );
    return true;
  }

  async resetPassword(changePasswordDto: ChangePasswordDto): Promise<boolean> {
    const { password, token } = changePasswordDto;

    const newPassword = await this.userService.hashPassword(password);

    const findUserByToken = await this.forgetPasswordRepository.findOne({
      where: {
        token,
      },
      relations: ["user"],
    });

    if (!findUserByToken || !findUserByToken.isValid) {
      throw new NotFoundException("Token inválido");
    }

    if (!findUserByToken.user.isChangePasswordWelcome) {
      this.userService.updateIsChangePasswordWelcome(findUserByToken.user);
    }

    findUserByToken.isValid = false;

    this.forgetPasswordRepository.save(findUserByToken);

    await this.userService.updatePassword(
      findUserByToken["user"]["USU_ID"],
      newPassword,
    );

    const html = changePasswordSuccessTemplate(this.clientAppUrl);
    await sendEmail(
      findUserByToken["user"]["USU_EMAIL"],
      "Saev | Você alterou sua senha de acesso",
      html,
    );
    return true;
  }

  signUser(user: IUser): Promise<string> {
    return this.generateJwt(user);
  }

  async changePassword(
    headers: string,
    changePasswordDto: ChangePasswordDto,
  ): Promise<boolean> {
    const password = await this.userService.hashPassword(
      changePasswordDto.password,
    );
    const jwt = headers.replace("Bearer ", "");
    const dataUser = this.jwtService.decode(jwt) as IUser;

    await this.userService.updatePassword(dataUser["user"]["USU_ID"], password);

    const html = changePasswordSuccessTemplate(this.clientAppUrl);

    await sendEmail(
      dataUser["user"]["USU_EMAIL"],
      "Saev | Você alterou sua senha de acesso",
      html,
    );
    return true;
  }


  private validatePassword(
    password: string,
    storedPasswordHash: string,
  ): Promise<boolean> {
    return this.comparePasswords(password, storedPasswordHash);
  }
}
