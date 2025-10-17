import { Area } from 'src/modules/area/model/entities/area.entity'
import { Connection } from 'typeorm'
import { Factory, Seeder } from 'typeorm-seeding'

import { areasData } from '../data/areas-data'

export class CreateAreasSeed implements Seeder {
  public async run(_factory: Factory, connection: Connection): Promise<void> {
    const areasRepository = connection.getRepository(Area)

    for (const area of areasData) {
      const existsArea = await areasRepository.findOne({
        where: {
          ARE_NOME: area.name.toUpperCase(),
        },
      })

      if (!existsArea) {
        const newArea = areasRepository.create({
          ARE_NOME: area.name.toUpperCase(),
          ARE_DESCRICAO: area.description,
        })

        await areasRepository.save(newArea)
      }
    }
  }
}
