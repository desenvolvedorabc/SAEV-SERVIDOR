import { Skin } from 'src/modules/teacher/model/entities/skin.entity'
import { Connection } from 'typeorm'
import { Factory, Seeder } from 'typeorm-seeding'

import { racesData } from '../data/races-data'

export class CreateRacesSeed implements Seeder {
  public async run(_factory: Factory, connection: Connection): Promise<void> {
    const racesRepository = connection.getRepository(Skin)

    for (const race of racesData) {
      const existsRace = await racesRepository.findOne({
        where: {
          PEL_NOME: race.name,
        },
      })

      if (!existsRace) {
        const newRace = racesRepository.create({
          PEL_NOME: race.name,
        })

        await racesRepository.save(newRace)
      }
    }
  }
}
