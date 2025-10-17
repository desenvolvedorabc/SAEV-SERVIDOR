import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { PaginationParams } from 'src/helpers/params'
import { County } from 'src/modules/counties/model/entities/county.entity'
import { NotificationsService } from 'src/modules/notifications/service/notification.service'
import { School } from 'src/modules/school/model/entities/school.entity'
import { User } from 'src/modules/user/model/entities/user.entity'
import { InternalServerError } from 'src/utils/errors'
import { formatParamsByProfile } from 'src/utils/format-params-by-profile'
import { paginateData } from 'src/utils/paginate-data'
import { Repository } from 'typeorm'

import { CreateMessageDto } from '../model/dto/create-message.dto'
import { Message } from '../model/entities/message.entity'

@Injectable()
export class MessagesService {
  constructor(
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,

    @InjectRepository(County)
    private countyRepository: Repository<County>,

    @InjectRepository(School)
    private schoolRepository: Repository<School>,

    private notificationService: NotificationsService,
  ) {}

  async findOne(MEN_ID: number): Promise<Message> {
    const mensagem = await this.messageRepository.findOne({
      where: {
        MEN_ID,
      },
      relations: ['municipios', 'schools'],
    })

    if (!mensagem) {
      throw new NotFoundException('Mensagem não encontrada')
    }

    return mensagem
  }

  async delete(MEN_ID: number, user: User): Promise<Message> {
    const mensagem = await this.findOne(MEN_ID)

    mensagem.MEN_IS_DELETE = true

    return await this.messageRepository.save(mensagem, {
      data: user,
    })
  }

  /**
   * Criar mensagem
   *
   * @param createMessageDto objeto referente a criação de turma
   * @returns informa que a mensagem foi criada
   */
  async create(createMessageDto: CreateMessageDto, user: User) {
    const { MEN_TEXT, MEN_TITLE, ESCOLAS, MUNICIPIOS } = createMessageDto

    const municipios = []
    const schools = []

    for (const MUN_ID of MUNICIPIOS) {
      const municipio = await this.countyRepository.findOne({
        where: {
          MUN_ID,
        },
        relations: ['users'],
      })

      if (municipio) {
        municipios.push(municipio)
        for (const user of municipio.users) {
          this.notificationService.create(MEN_TITLE, MEN_TEXT, user)
        }
      }
    }

    for (const ESC_ID of ESCOLAS) {
      const school = await this.schoolRepository.findOne({
        where: {
          ESC_ID,
        },
        relations: ['ESC_USU'],
      })

      if (school) {
        schools.push(school)
        for (const user of school.ESC_USU) {
          this.notificationService.create(MEN_TITLE, MEN_TEXT, user)
        }
      }
    }

    if (!municipios.length && !schools.length) {
      throw new BadRequestException()
    }

    const message = this.messageRepository.create({
      MEN_TITLE,
      MEN_TEXT,
      municipios,
      schools,
    })

    try {
      return this.messageRepository.save(message, { data: user })
    } catch (err) {
      throw new InternalServerError()
    }
  }

  async paginate(paginationParams: PaginationParams, user: User) {
    const { limit, page, search, column, order, stateId, county, school } =
      formatParamsByProfile(paginationParams, user)

    const queryBuilder = this.messageRepository
      .createQueryBuilder('Messages')
      .select(['Messages', 'municipios.MUN_ID', 'municipios.MUN_NOME'])
      .leftJoin('Messages.municipios', 'municipios')

    if (stateId) {
      queryBuilder.andWhere('municipios.stateId = :stateId', { stateId })
    }

    if (county) {
      queryBuilder.andWhere('municipios.MUN_ID = :county', { county })
    }

    if (school) {
      queryBuilder
        .innerJoin('Messages.schools', 'schools')
        .andWhere('schools.ESC_ID = :school', { school })
    }

    switch (column) {
      case 'MEN_TITLE':
        queryBuilder.orderBy('Messages.MEN_TITLE', order)
        break
      case 'MEN_DT_CRIACAO':
        queryBuilder.orderBy('Messages.MEN_DT_CRIACAO', order)
        break
      default:
        queryBuilder.orderBy('Messages.MEN_DT_CRIACAO', 'DESC')
        break
    }

    if (search) {
      const formatSearch = search.replace('°', 'º')
      queryBuilder.andWhere(
        '(MEN_TITLE LIKE :search OR MEN_TEXT LIKE :search)',
        {
          search: `%${formatSearch}%`,
        },
      )
    }

    const data = await paginateData(page, limit, queryBuilder)

    return data
  }
}
