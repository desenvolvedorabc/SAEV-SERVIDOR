import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { paginateRaw } from 'nestjs-typeorm-paginate'
import { Student } from 'src/modules/student/model/entities/student.entity'
import { formatAverageTime } from 'src/modules/tutor-messages/helpers'
import { User } from 'src/modules/user/model/entities/user.entity'
import { formatParamsByProfile } from 'src/utils/format-params-by-profile'
import { Connection, Repository } from 'typeorm'

import { ListResponsiblesParamsDto } from '../dto/list-responsibles-params.dto'
import { Responsible } from '../entities/responsible.entity'
import { ResponsibleNotification } from '../entities/responsible-notification.entity'

@Injectable()
export class ResponsibleListingService {
  constructor(
    @InjectRepository(Responsible)
    private readonly responsibleRepository: Repository<Responsible>,
    private readonly connection: Connection,
  ) {}

  async findAll(params: ListResponsiblesParamsDto, user: User) {
    const { page, limit, search, order, column, isCsv, school } =
      formatParamsByProfile(params as any, user)

    const qb = this.buildListingQuery(school)

    if (search) {
      const searchPattern = `%${search}%`
      qb.andWhere(
        `(r.name LIKE :search OR r.email LIKE :search
          OR EXISTS (
            SELECT 1 FROM ${this.connection.getRepository(Student).metadata.tableName} s2
            WHERE s2.ALU_RES_ID = r.id
              AND s2.ALU_ESC_ID = :schoolId
              AND s2.ALU_NOME LIKE :search
          ))`,
        { search: searchPattern, schoolId: school },
      )
    }

    qb.groupBy('r.id').addGroupBy('r.name').addGroupBy('r.email')

    const orderDirection = order === 'DESC' ? 'DESC' : 'ASC'
    switch (column) {
      case 'visualizadas':
        qb.orderBy('visualizadas', orderDirection)
        break
      case 'naoVisualizadas':
        qb.orderBy('naoVisualizadas', orderDirection)
        break
      case 'media':
        qb.orderBy('avgMinutes', orderDirection)
        break
      default:
        qb.orderBy('responsavel', orderDirection)
        break
    }

    if (isCsv) {
      const items = await qb.getRawMany()
      return this.mapItemsForExport(items)
    }

    const data = await paginateRaw(qb, { page, limit })

    return {
      ...data,
      items: this.mapItems(data.items),
    }
  }

  async exportCsv(params: ListResponsiblesParamsDto, user: User) {
    const { school } = formatParamsByProfile(params as any, user)

    const qb = this.responsibleRepository
      .createQueryBuilder('r')
      .select([
        'County.MUN_NOME AS municipio',
        'School.ESC_NOME AS escola',
        'SchoolClass.TUR_ANO AS anoLetivo',
        'Serie.SER_NOME AS serieAno',
        'SchoolClass.TUR_NOME AS turma',
        's.ALU_NOME AS aluno',
        'COALESCE(r.name, r.email) AS responsavel',
        'r.email AS email',
        'COUNT(CASE WHEN rn.readAt IS NOT NULL THEN 1 END) AS visualizadas',
        'COUNT(CASE WHEN rn.readAt IS NULL THEN 1 END) AS naoVisualizadas',
        `AVG(CASE WHEN rn.readAt IS NOT NULL THEN TIMESTAMPDIFF(MINUTE, rn.createdAt, rn.readAt) END) AS avgMinutes`,
      ])
      .innerJoin(
        Student,
        's',
        's.ALU_RES_ID = r.id AND s.ALU_ESC_ID = :schoolId',
        { schoolId: school },
      )
      .innerJoin('s.ALU_ESC', 'School')
      .innerJoin('School.ESC_MUN', 'County')
      .leftJoin('s.ALU_SER', 'Serie')
      .leftJoin('s.ALU_TUR', 'SchoolClass')
      .leftJoin(
        ResponsibleNotification,
        'rn',
        'rn.responsibleId = r.id AND rn.studentId = s.ALU_ID',
      )
      .where('r.active = 1')
      .groupBy('r.id')
      .addGroupBy('r.email')
      .addGroupBy('r.name')
      .addGroupBy('s.ALU_ID')
      .addGroupBy('s.ALU_NOME')
      .addGroupBy('County.MUN_NOME')
      .addGroupBy('School.ESC_NOME')
      .addGroupBy('SchoolClass.TUR_ANO')
      .addGroupBy('Serie.SER_NOME')
      .addGroupBy('SchoolClass.TUR_NOME')
      .orderBy('responsavel', 'ASC')
      .addOrderBy('s.ALU_NOME', 'ASC')

    const items = await qb.getRawMany()

    return items.map((item) => ({
      Município: item.municipio,
      Escola: item.escola,
      'Ano Letivo': item.anoLetivo ?? 'N/A',
      Série: item.serieAno ?? 'N/A',
      Turma: item.turma ?? 'N/A',
      Aluno: item.aluno,
      Responsável: item.responsavel ?? 'N/A',
      'E-mail': item.email ?? '',
      Visualizadas: Number(item.visualizadas ?? 0),
      'Não Visualizadas': Number(item.naoVisualizadas ?? 0),
      'Média Visualização (min)': item.avgMinutes
        ? Math.round(Number(item.avgMinutes))
        : 'N/A',
    }))
  }

  private buildListingQuery(schoolId: number) {
    return this.responsibleRepository
      .createQueryBuilder('r')
      .select([
        'r.id AS responsibleId',
        'COALESCE(r.name, r.email) AS responsavel',
        'r.email AS email',
        `GROUP_CONCAT(DISTINCT s.ALU_NOME ORDER BY s.ALU_NOME SEPARATOR ', ') AS alunos`,
        'COUNT(DISTINCT s.ALU_ID) AS qtdAlunos',
        'COUNT(DISTINCT CASE WHEN rn.readAt IS NOT NULL THEN rn.id END) AS visualizadas',
        'COUNT(DISTINCT CASE WHEN rn.readAt IS NULL THEN rn.id END) AS naoVisualizadas',
        `AVG(CASE WHEN rn.readAt IS NOT NULL THEN TIMESTAMPDIFF(MINUTE, rn.createdAt, rn.readAt) END) AS avgMinutes`,
      ])
      .innerJoin(
        Student,
        's',
        's.ALU_RES_ID = r.id AND s.ALU_ESC_ID = :schoolId',
        { schoolId },
      )
      .leftJoin(
        ResponsibleNotification,
        'rn',
        'rn.responsibleId = r.id AND rn.studentId = s.ALU_ID',
      )
      .where('r.active = 1')
  }

  private mapItems(items: any[]) {
    return items.map((item) => ({
      responsibleId: Number(item.responsibleId),
      responsavel: item.responsavel,
      email: item.email,
      alunos: item.alunos ? item.alunos.split(', ') : [],
      qtdAlunos: Number(item.qtdAlunos ?? 0),
      visualizadas: Number(item.visualizadas ?? 0),
      naoVisualizadas: Number(item.naoVisualizadas ?? 0),
      media: formatAverageTime(
        item.avgMinutes ? Number(item.avgMinutes) : null,
      ),
    }))
  }

  private mapItemsForExport(items: any[]) {
    return items.map((item) => ({
      Responsável: item.responsavel,
      'E-mail': item.email,
      'Associado(s)': item.alunos ?? '',
      'Qtd. Alunos': Number(item.qtdAlunos ?? 0),
      Visualizadas: Number(item.visualizadas ?? 0),
      'Não Visualizadas': Number(item.naoVisualizadas ?? 0),
      'Tempo Médio':
        formatAverageTime(item.avgMinutes ? Number(item.avgMinutes) : null) ??
        '',
    }))
  }
}
