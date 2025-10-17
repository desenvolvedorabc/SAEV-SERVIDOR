import { Connection } from 'typeorm'
import { Factory, Seeder } from 'typeorm-seeding'

import { State } from '../../modules/states/model/entities/state.entity'
import { statesData } from '../data/state-data'

export class CreateStatesSeed implements Seeder {
  public async run(_factory: Factory, connection: Connection): Promise<void> {
    const stateRepository = connection.getRepository(State)

    for (const state of statesData) {
      const existsState = await stateRepository.findOne({
        where: {
          abbreviation: state.abbreviation.toUpperCase(),
        },
      })

      if (!existsState) {
        const newState = stateRepository.create({
          name: state.name,
          abbreviation: state.abbreviation.toUpperCase(),
        })

        await stateRepository.save(newState)
      }
    }
  }
}
