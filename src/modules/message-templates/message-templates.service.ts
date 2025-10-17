import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { PaginationParams } from 'src/helpers/params'
import { ForbiddenError } from 'src/shared/errors'
import { InternalServerError } from 'src/utils/errors'
import { formatParamsByProfile } from 'src/utils/format-params-by-profile'
import { paginateData } from 'src/utils/paginate-data'
import { Repository } from 'typeorm'

import { TypeSchoolEnum } from '../school/model/enum/type-school.enum'
import { User } from '../user/model/entities/user.entity'
import { CreateMessageTemplateDto } from './dto/create-message-template.dto'
import { UpdateMessageTemplateDto } from './dto/update-message-template.dto'
import { MessageTemplate } from './entities/message-template.entity'

@Injectable()
export class MessageTemplatesService {
  constructor(
    @InjectRepository(MessageTemplate)
    private readonly messageTemplatesRepository: Repository<MessageTemplate>,
  ) {}

  async create(dto: CreateMessageTemplateDto, schoolId: number): Promise<void> {
    const messageTemplate = this.messageTemplatesRepository.create({
      ...dto,
      schoolId,
    })

    try {
      await this.messageTemplatesRepository.save(messageTemplate)
    } catch (e) {
      throw new InternalServerError()
    }
  }

  async findAll(dto: PaginationParams, user: User) {
    const {
      page,
      limit,
      search,
      school,
      county,
      stateId,
      typeSchool,
      verifyProfileForState,
      date,
    } = formatParamsByProfile(dto, user)

    const queryBuilder = this.messageTemplatesRepository
      .createQueryBuilder('MessageTemplate')
      .leftJoin('MessageTemplate.school', 'School')
      .orderBy('MessageTemplate.createdAt', 'DESC')

    if (typeSchool) {
      queryBuilder.andWhere('School.ESC_TIPO = :typeSchool', {
        typeSchool,
      })
    }

    if (school) {
      queryBuilder.andWhere('MessageTemplate.schoolId = :schoolId', {
        schoolId: school,
      })
    }

    if (county) {
      queryBuilder.andWhere('School.ESC_MUN_ID = :countyId', {
        countyId: county,
      })
    }

    if (stateId) {
      queryBuilder.innerJoin(
        'School.ESC_MUN',
        'county',
        'county.stateId = :stateId',
        {
          stateId,
        },
      )
    }

    if (verifyProfileForState) {
      queryBuilder.andWhere('School.ESC_TIPO = :typeSchool', {
        typeSchool: TypeSchoolEnum.ESTADUAL,
      })
    }

    if (search) {
      queryBuilder.andWhere('MessageTemplate.title LIKE :q', {
        q: `%${search}%`,
      })
    }

    if (date) {
      queryBuilder.andWhere('DATE(MessageTemplate.createdAt) = :date', {
        date,
      })
    }

    return await paginateData(page, limit, queryBuilder)
  }

  async findOne(id: number) {
    const messageTemplate = await this.messageTemplatesRepository.findOne({
      where: { id },
    })

    if (!messageTemplate) {
      throw new NotFoundException(
        `Template de mensagem com o ${id} não encontrada.`,
      )
    }

    return { messageTemplate }
  }

  async update(id: number, dto: UpdateMessageTemplateDto, schoolId: number) {
    const { messageTemplate } = await this.findOne(id)

    if (messageTemplate?.schoolId !== schoolId) {
      throw new ForbiddenError()
    }

    try {
      await this.messageTemplatesRepository.update(messageTemplate.id, {
        ...dto,
      })
    } catch (e) {
      throw new InternalServerError()
    }
  }

  async remove(id: number, schoolId: number): Promise<void> {
    const { messageTemplate } = await this.findOne(id)

    if (messageTemplate?.schoolId !== schoolId) {
      throw new ForbiddenError()
    }

    try {
      await this.messageTemplatesRepository.delete(messageTemplate.id)
    } catch (e) {
      throw new InternalServerError()
    }
  }
}
