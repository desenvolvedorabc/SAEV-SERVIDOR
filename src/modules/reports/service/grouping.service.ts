import { Injectable } from '@nestjs/common'
import { PaginationParams } from 'src/helpers/params'
import { User } from 'src/modules/user/model/entities/user.entity'
import { formatParamsByProfile } from 'src/utils/format-params-by-profile'

import { ReportGroupingRepository } from '../repositories/grouping.repository'

@Injectable()
export class GroupingService {
  constructor(
    private readonly reportGroupingRepository: ReportGroupingRepository,
  ) {}

  async handle(paginationParams: PaginationParams, user: User) {
    const params = formatParamsByProfile(paginationParams, user)

    const {
      serie,
      school,
      county,
      schoolClass,
      stateRegionalId,
      municipalityOrUniqueRegionalId,
      stateId,
    } = params

    const dataGrouped =
      await this.reportGroupingRepository.getTotalStudents(params)

    if (schoolClass) {
      const data =
        await this.reportGroupingRepository.getGroupingBySchoolClass(params)

      return {
        ...data,
        totalStudents: dataGrouped.totalGrouped,
        totalGrouped: dataGrouped.totalGrouped,
      }
    }

    if (serie) {
      const data =
        await this.reportGroupingRepository.getGroupingBySerie(params)

      return { ...data, ...dataGrouped }
    }

    if (school) {
      const data =
        await this.reportGroupingRepository.getGroupingBySchool(params)

      return { ...data, ...dataGrouped }
    }

    if (municipalityOrUniqueRegionalId) {
      const data =
        await this.reportGroupingRepository.getGroupingByMunicipality(params)

      return {
        ...data,
        ...dataGrouped,
      }
    }

    if (county) {
      const data = await this.reportGroupingRepository.getGroupingByCounty(
        params,
        user,
      )

      return {
        ...data,
        ...dataGrouped,
      }
    }

    if (stateRegionalId) {
      const data =
        await this.reportGroupingRepository.getGroupingByStateRegional(params)

      return {
        ...data,
        ...dataGrouped,
      }
    }

    if (stateId) {
      const data = await this.reportGroupingRepository.getGroupingByState(
        params,
        user,
      )

      return {
        ...data,
        ...dataGrouped,
      }
    }
  }
}
