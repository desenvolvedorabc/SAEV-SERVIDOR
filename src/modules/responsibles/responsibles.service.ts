import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { writeFileSync } from 'fs'
import { editFileName } from 'src/helpers/utils'
import { Student } from 'src/modules/student/model/entities/student.entity'
import { InternalServerError } from 'src/utils/errors'
import { Connection, Repository } from 'typeorm'

import { RegisterDeviceDto } from './dto/register-device.dto'
import { UpdateResponsibleDto } from './dto/update-responsible.dto'
import { ForgetPasswordResponsible } from './entities/forget-password-responsible.entity'
import { Responsible } from './entities/responsible.entity'
import { ResponsibleDevice } from './entities/responsible-device.entity'

@Injectable()
export class ResponsiblesService {
  constructor(
    @InjectRepository(Responsible)
    private readonly responsibleRepository: Repository<Responsible>,

    @InjectRepository(ResponsibleDevice)
    private readonly responsibleDeviceRepository: Repository<ResponsibleDevice>,

    @InjectRepository(ForgetPasswordResponsible)
    private readonly forgetPasswordRepository: Repository<ForgetPasswordResponsible>,

    private readonly connection: Connection,
  ) {}

  async findOrCreateByEmail(
    email: string,
    name?: string,
  ): Promise<Responsible | null> {
    if (!email?.trim()) {
      return null
    }

    const normalizedEmail = email.toLowerCase().trim()

    let responsible = await this.responsibleRepository.findOne({
      where: { email: normalizedEmail },
    })

    if (!responsible) {
      try {
        responsible = await this.responsibleRepository.save(
          this.responsibleRepository.create({
            email: normalizedEmail,
            name: name || null,
            active: true,
          }),
        )
      } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
          responsible = await this.responsibleRepository.findOne({
            where: { email: normalizedEmail },
          })
        } else {
          throw new InternalServerError()
        }
      }
    }

    return responsible
  }

  async deleteAccount(id: number): Promise<void> {
    const { responsible } = await this.findOne(id)

    try {
      await this.forgetPasswordRepository.delete({
        responsibleId: responsible.id,
      })

      await this.connection
        .getRepository(Student)
        .createQueryBuilder()
        .update()
        .set({ ALU_RES: null })
        .where('ALU_RES_ID = :id', { id: responsible.id })
        .execute()

      await this.responsibleRepository.delete(responsible.id)
    } catch (e) {
      throw new InternalServerError()
    }
  }

  async findStudents(responsibleId: number) {
    const students = await this.connection
      .getRepository(Student)
      .createQueryBuilder('Students')
      .select(['Students.ALU_ID', 'Students.ALU_NOME'])
      .where('Students.ALU_RES_ID = :responsibleId', { responsibleId })
      .orderBy('Students.ALU_NOME', 'ASC')
      .getMany()

    return {
      students,
    }
  }

  async findOne(id: number) {
    const responsible = await this.responsibleRepository.findOne({
      where: { id },
    })

    if (!responsible) {
      throw new NotFoundException('Responsável não encontrado.')
    }

    return { responsible }
  }

  async updateProfile(
    id: number,
    updateDto: UpdateResponsibleDto,
  ): Promise<Responsible> {
    const { responsible } = await this.findOne(id)

    if (updateDto.name !== undefined) {
      responsible.name = updateDto.name
    }

    try {
      return this.responsibleRepository.save(responsible)
    } catch (e) {
      throw new InternalServerError()
    }
  }

  async registerDevice(responsibleId: number, dto: RegisterDeviceDto) {
    const deviceRepository = this.responsibleDeviceRepository

    await deviceRepository.update(
      { responsibleId, active: true },
      { active: false },
    )

    const existing = await deviceRepository.findOne({
      where: { pushToken: dto.pushToken },
    })

    if (existing) {
      await deviceRepository.update(
        { id: existing.id },
        {
          responsibleId,
          active: true,
        },
      )
    } else {
      await deviceRepository.save(
        deviceRepository.create({
          responsibleId,
          pushToken: dto.pushToken,
          active: true,
        }),
      )
    }
  }

  async unregisterDevice(responsibleId: number): Promise<void> {
    await this.responsibleDeviceRepository.update(
      { responsibleId, active: true },
      { active: false },
    )
  }

  async acceptTerms(responsibleId: number): Promise<void> {
    await this.responsibleRepository.update(responsibleId, {
      termsAcceptedAt: new Date(),
    })
  }

  async updateAvatar(
    id: number,
    filename: string,
    base64: string,
  ): Promise<string> {
    const { responsible } = await this.findOne(id)

    try {
      const folderName = './public/responsible/avatar/'
      const newFileName = editFileName(filename)

      responsible.avatar = newFileName
      writeFileSync(`${folderName}${newFileName}`, base64, {
        encoding: 'base64',
      })
      await this.responsibleRepository.save(responsible)

      return newFileName
    } catch (e) {
      throw new InternalServerError()
    }
  }
}
