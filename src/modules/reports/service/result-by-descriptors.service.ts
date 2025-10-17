import { Injectable } from '@nestjs/common'
import { PaginationParams } from 'src/helpers/params'
import { User } from 'src/modules/user/model/entities/user.entity'
import { formatParamsByProfile } from 'src/utils/format-params-by-profile'

import { ResultByDescriptorsRepository } from '../repositories/result-by-descriptors.repository'

@Injectable()
export class ResultByDescriptorsService {
  constructor(
    private readonly resultByDescriptorsRepository: ResultByDescriptorsRepository,
  ) {}

  async handle(paginationParams: PaginationParams, user: User) {
    const params = formatParamsByProfile(paginationParams, user)

    const { topics } =
      await this.resultByDescriptorsRepository.getTopicsBySerie(+params?.serie)

    const { report } =
      await this.resultByDescriptorsRepository.getDataReports(params)

    let items = topics.map((head) => {
      let topics = head.MAR_MTO.map((mto) => {
        let totalCorrectTopic = 0
        let totalTopic = 0

        let descritores = mto.MTO_MTI.map((mti) => {
          const findDescriptor = report?.reports_descriptors?.find(
            (reportDescriptor) =>
              reportDescriptor.descriptor.MTI_ID === mti.MTI_ID,
          )

          if (findDescriptor) {
            totalCorrectTopic += findDescriptor.totalCorrect
            totalTopic += findDescriptor.total

            return {
              id: mti.MTI_ID,
              cod: mti.MTI_CODIGO,
              name: mti.MTI_DESCRITOR,
              value: Math.round(
                (findDescriptor.totalCorrect / findDescriptor.total) * 100,
              ),
            }
          }
        })

        descritores = descritores.filter((data) => !!data?.id)

        if (descritores.length) {
          return {
            id: mto.MTO_ID,
            name: mto.MTO_NOME,
            descritores,
            value: Math.round((totalCorrectTopic / totalTopic) * 100),
          }
        }
      })

      topics = topics.filter((data) => !!data?.id)

      return {
        id: head.MAR_DIS.DIS_ID,
        subject: head.MAR_DIS.DIS_NOME,
        topics,
      }
    })

    items = items.filter((data) => !!data.topics.length)

    let filterSubjects = items.filter(function (a) {
      return (
        !this[JSON.stringify(a?.id)] && (this[JSON.stringify(a?.id)] = true)
      )
    }, Object.create(null))

    filterSubjects = filterSubjects.map((subject) => {
      const topics = items.reduce((acc, cur) => {
        if (cur.id === subject.id) {
          const topics = [...acc, ...cur.topics]
          return topics
        } else {
          return acc
        }
      }, [])

      return {
        id: subject.id,
        subject: subject.subject,
        topics,
      }
    })

    return { items: filterSubjects }
  }
}
