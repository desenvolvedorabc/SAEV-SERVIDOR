import {
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import * as crypto from 'crypto'
import { writeFileSync } from 'fs'
import { Pagination } from 'nestjs-typeorm-paginate'
import { PaginationParams } from 'src/helpers/params'
import { sendEmail } from 'src/helpers/sendMail'
import { TypeSchoolEnum } from 'src/modules/school/model/enum/type-school.enum'
import { StatesService } from 'src/modules/states/states.service'
import { RoleProfile } from 'src/shared/enums/role.enum'
import { InternalServerError } from 'src/utils/errors'
import { formatParamsByProfile } from 'src/utils/format-params-by-profile'
import { paginateData } from 'src/utils/paginate-data'
import { welcomeTemplate } from 'templates/welcome'
import { Not, Repository } from 'typeorm'

import { hashPassword } from '../../../helpers/crypto'
import { editFileName } from '../../../helpers/utils'
import { CreateUserDto } from '../model/dto/CreateUserDto'
import { UpdateUserDto } from '../model/dto/UpdateUserDto'
import { ForgetPassword } from '../model/entities/forget-password.entity'
import { User } from '../model/entities/user.entity'
import { IUser } from '../model/interface/user.interface'

@Injectable()
export class UserService {
  private readonly clientAppUrl: string

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,

    @InjectRepository(ForgetPassword)
    private readonly forgetPasswordRepository: Repository<ForgetPassword>,

    private statesService: StatesService,
  ) {
    this.clientAppUrl = process.env.FRONT_APP_URL
  }

  /**
   *
   * @param id informação referente a identificação do usuário
   * @param filename nome do arquivo salvo
   * @returns informa que o usuário foi atualizada
   */
  async updateAvatar(
    id: number,
    filename: string,
    base64: string,
    userLogin: User,
  ): Promise<string> {
    const user = await this.findOne(id)
    const folderName = './public/user/avatar/'
    const newFileName = editFileName(filename)
    if (user) {
      user.USU_AVATAR = newFileName
      writeFileSync(`${folderName}${newFileName}`, base64, {
        encoding: 'base64',
      })
      await this.update(id, user, userLogin)
      return newFileName
    } else {
      throw new HttpException(
        'Não é possível gravar esta imagem.',
        HttpStatus.BAD_GATEWAY,
      )
    }
  }

  async paginate(dto: PaginationParams, user: User): Promise<Pagination<User>> {
    const {
      page,
      limit,
      search,
      column,
      order,
      county,
      school,
      subProfile,
      roleProfile,
      stateId,
      typeSchool,
    } = formatParamsByProfile(dto, user, true)

    const queryBuilder = this.userRepository
      .createQueryBuilder('Users')
      .select([
        'Users.USU_ID',
        'Users.USU_NOME',
        'Users.USU_EMAIL',
        'USU_MUN.MUN_ID',
        'USU_MUN.MUN_NOME',
        'USU_ESC.ESC_ID',
        'USU_ESC.ESC_NOME',
        'USU_SPE.SPE_ID',
        'USU_SPE.SPE_NOME',
        'USU_SPE.role',
      ])
      .leftJoin('Users.USU_MUN', 'USU_MUN')
      .leftJoin('Users.USU_ESC', 'USU_ESC')
      .leftJoin('Users.USU_SPE', 'USU_SPE')
      .orderBy(`Users.${column ?? 'USU_NOME'}`, order)

    if (search) {
      queryBuilder.andWhere(
        '(Users.USU_NOME LIKE :search or Users.USU_EMAIL LIKE :search)',
        {
          search: `%${search}%`,
        },
      )
    }

    if (county) {
      queryBuilder.andWhere('Users.USU_MUN = :countyId', {
        countyId: county,
      })
    }

    if (school) {
      queryBuilder.andWhere('Users.USU_ESC = :schoolId', {
        schoolId: school,
      })
    }

    if (roleProfile) {
      queryBuilder.andWhere('USU_SPE.role = :roleProfile', {
        roleProfile,
      })
    }

    if (subProfile) {
      queryBuilder.andWhere('Users.USU_SPE = :subProfileId', {
        subProfileId: subProfile,
      })
    }

    if (stateId) {
      queryBuilder.andWhere('Users.stateId = :stateId', {
        stateId,
      })
    }

    if (user?.USU_SPE?.role === RoleProfile.ESCOLA) {
      queryBuilder.andWhere(
        '(USU_SPE.role = :role && USU_ESC.ESC_TIPO = :typeSchool)',
        {
          role: RoleProfile.ESCOLA,
          typeSchool,
        },
      )
    }

    if (user?.USU_SPE?.role === RoleProfile.MUNICIPIO_MUNICIPAL) {
      queryBuilder.andWhere(
        `(USU_SPE.role = '${RoleProfile.MUNICIPIO_MUNICIPAL}' or (USU_SPE.role = '${RoleProfile.ESCOLA}' && USU_ESC.ESC_TIPO = '${TypeSchoolEnum.MUNICIPAL}'))`,
      )
    }

    if (user?.USU_SPE?.role === RoleProfile.MUNICIPIO_ESTADUAL) {
      queryBuilder.andWhere(
        `((USU_SPE.role = '${RoleProfile.MUNICIPIO_ESTADUAL}') or 
        (USU_SPE.role = '${RoleProfile.ESCOLA}' && USU_ESC.ESC_TIPO = '${TypeSchoolEnum.ESTADUAL}') or 
        (USU_SPE.role = '${RoleProfile.MUNICIPIO_MUNICIPAL}' && USU_MUN.MUN_COMPARTILHAR_DADOS IS TRUE))`,
      )
    }

    if (user?.USU_SPE?.role === RoleProfile.ESTADO) {
      queryBuilder.andWhere(
        `(USU_SPE.role = '${RoleProfile.ESTADO}' or USU_SPE.role = '${RoleProfile.MUNICIPIO_ESTADUAL}' or 
        (USU_SPE.role = '${RoleProfile.ESCOLA}' && USU_ESC.ESC_TIPO = '${TypeSchoolEnum.ESTADUAL}') or 
        (USU_SPE.role = '${RoleProfile.MUNICIPIO_MUNICIPAL}' && USU_MUN.MUN_COMPARTILHAR_DADOS IS TRUE))`,
      )
    }

    return await paginateData(page, limit, queryBuilder)
  }

  async create(createdUserDto: CreateUserDto, userLogin: User) {
    if (await this.mailExists(createdUserDto.USU_EMAIL)) {
      throw new ConflictException('Já existe um usuário com esse email.')
    }

    if (await this.cpfExists(createdUserDto.USU_DOCUMENTO)) {
      throw new ConflictException('Já existe um usuário com esse CPF.')
    }

    if (createdUserDto?.stateId) {
      await this.statesService.findOne(createdUserDto.stateId)
    }

    createdUserDto.USU_SENHA = await this.hashPassword(createdUserDto.USU_SENHA)

    try {
      const newUser = await this.userRepository.save(createdUserDto, {
        data: userLogin,
      })

      this.welcomePasswordChangeLink(newUser.USU_ID)

      const { USU_SENHA, ...user } = newUser

      return user
    } catch (e) {
      throw new InternalServerError()
    }
  }

  async welcomePasswordChangeLink(userId: number) {
    const user = await this.findOne(userId)

    let forgetPassword = await this.forgetPasswordRepository.findOne({
      where: {
        user,
      },
      relations: ['user'],
    })

    const code = crypto.randomUUID().substring(0, 6)

    if (!forgetPassword) {
      forgetPassword = this.forgetPasswordRepository.create({
        token: code,
        isValid: true,
        user,
      })
    } else {
      forgetPassword.token = code
      forgetPassword.isValid = true
    }

    await this.forgetPasswordRepository.save(forgetPassword)
    const forgotLink = `${this.clientAppUrl}/nova-senha?token=${code}`

    const html = welcomeTemplate(this.clientAppUrl, forgotLink)

    await sendEmail(user.USU_EMAIL, 'Saev | Seja Bem-vindo ao SAEV!', html)
  }

  async hashPassword(password: string): Promise<any> {
    return hashPassword(password)
  }

  findAll(): Promise<IUser[]> {
    return this.userRepository.find({
      order: { USU_NOME: 'ASC' },
      relations: ['USU_MUN', 'USU_ESC', 'USU_SPE'],
    })
  }

  async findOne(
    id: number,
    relations: string[] = ['state', 'USU_MUN', 'USU_ESC', 'USU_SPE'],
  ) {
    const user = await this.userRepository.findOne(
      { USU_ID: id },
      {
        relations,
      },
    )

    if (!user) {
      throw new NotFoundException('Usuário não encontrado!')
    }

    return user
  }

  async findUserByEmail(email: string) {
    const user = await this.userRepository.findOne(
      { USU_EMAIL: email },
      { select: ['USU_ID', 'USU_EMAIL', 'USU_NOME', 'USU_SENHA', 'USU_ATIVO'] },
    )
    if (!user) {
      throw new NotFoundException('Usuário não encontrado!')
    }

    return user
  }

  async mailExists(USU_EMAIL: string): Promise<boolean> {
    const user = await this.userRepository.findOne({ USU_EMAIL })
    if (user) {
      return true
    } else {
      return false
    }
  }

  async cpfExists(cpf: string): Promise<boolean> {
    const user = await this.userRepository.findOne({
      where: {
        USU_DOCUMENTO: cpf,
      },
    })
    if (user) {
      return true
    } else {
      return false
    }
  }

  async verifyExistEmailOrCpf(idUser: number, email?: string, cpf?: string) {
    let findUser = null

    if (email) {
      findUser = await this.userRepository.findOne({
        where: {
          USU_EMAIL: email,
          USU_ID: Not(idUser),
        },
      })
    } else if (cpf) {
      findUser = await this.userRepository.findOne({
        where: {
          USU_DOCUMENTO: cpf,
          USU_ID: Not(idUser),
        },
      })
    }

    if (findUser) {
      return true
    } else {
      return false
    }
  }

  async update(USU_ID: number, updateUserDto: UpdateUserDto, user: User) {
    return this.userRepository.save(
      { ...updateUserDto, USU_ID },
      { data: user },
    )
  }

  async updateIsChangePasswordWelcome(user: User): Promise<IUser> {
    return this.userRepository.save({
      ...user,
      isChangePasswordWelcome: true,
    })
  }

  async updateUser(
    id: number,
    updateUserDto: UpdateUserDto,
    user: User,
  ): Promise<IUser> {
    await this.findOne(id, [])

    if (await this.verifyExistEmailOrCpf(id, updateUserDto.USU_EMAIL, null)) {
      throw new ConflictException('Já existe um usuário com esse email.')
    }

    if (
      await this.verifyExistEmailOrCpf(id, null, updateUserDto.USU_DOCUMENTO)
    ) {
      throw new ConflictException('Já existe um usuário com esse CPF.')
    }

    if (updateUserDto.USU_SENHA) {
      return this.hashPassword(updateUserDto.USU_SENHA).then(
        (passwordHash: string) => {
          updateUserDto.USU_SENHA = passwordHash
          return this.userRepository.save(
            { ...updateUserDto, USU_ID: id },
            { data: user },
          )
        },
      )
    }

    try {
      return await this.userRepository.save(
        { ...updateUserDto, USU_ID: id },
        { data: user },
      )
    } catch (e) {
      throw new InternalServerError()
    }
  }

  async updatePassword(USU_ID: number, password: string): Promise<IUser> {
    const user = (await this.userRepository.findOne({
      USU_ID,
    })) as UpdateUserDto
    if (user) {
      user.USU_SENHA = password
      return this.userRepository.save({ ...user, USU_ID })
    }
  }
}
