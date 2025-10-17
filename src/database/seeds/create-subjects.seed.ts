import { Subject } from 'src/modules/subject/model/entities/subject.entity'
import { Connection } from 'typeorm'
import { Factory, Seeder } from 'typeorm-seeding'

import { subjectsData } from '../data/subjects-data'

export class CreateSubjectsSeed implements Seeder {
  public async run(_factory: Factory, connection: Connection): Promise<void> {
    const subjectsRepository = connection.getRepository(Subject)

    for (const subject of subjectsData) {
      const existsSubject = await subjectsRepository.findOne({
        where: {
          DIS_NOME: subject.name,
          DIS_TIPO: subject.type,
        },
      })

      if (!existsSubject) {
        const newSubject = subjectsRepository.create({
          DIS_NOME: subject.name,
          DIS_TIPO: subject.type,
          DIS_COLOR: subject.color,
        })

        await subjectsRepository.save(newSubject)
      }
    }
  }
}
