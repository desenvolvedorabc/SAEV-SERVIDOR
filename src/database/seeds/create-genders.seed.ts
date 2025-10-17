import { Gender } from 'src/modules/teacher/model/entities/gender.entity'
import { Connection } from 'typeorm'
import { Factory, Seeder } from 'typeorm-seeding'

import { gendersData } from '../data/genders-data'

export class CreateGendersSeed implements Seeder {
  public async run(_factory: Factory, connection: Connection): Promise<void> {
    const gendersRepository = connection.getRepository(Gender)

    for (const gender of gendersData) {
      const existsGender = await gendersRepository.findOne({
        where: {
          GEN_NOME: gender.name,
        },
      })

      if (!existsGender) {
        const newGender = gendersRepository.create({
          GEN_NOME: gender.name,
        })

        await gendersRepository.save(newGender)
      }
    }
  }
}
