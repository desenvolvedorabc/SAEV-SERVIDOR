import * as archiver from 'archiver'
import { stringify } from 'csv-stringify'

import { dictionaryFileName, microdataDictionaries } from '../dictionaries'
import { TypeMicrodata } from '../dto/type-microdata.enum'

export function addDictionaryToArchive(
  archive: archiver.Archiver,
  type: TypeMicrodata,
) {
  const entries = microdataDictionaries[type]
  const fileName = dictionaryFileName[type]

  if (!entries || !fileName) return

  const csvStream = stringify({
    header: true,
    delimiter: ';',
  })

  archive.append(csvStream, { name: fileName })

  for (const entry of entries) {
    csvStream.write(entry)
  }

  csvStream.end()
}

export function addNormalizedDictionariesToArchive(archive: archiver.Archiver) {
  const subFiles = [
    'avaliacao',
    'escolas',
    'alunos',
    'municipios',
    'testes',
    'descritores',
  ]

  const csvStream = stringify({
    header: true,
    delimiter: ';',
  })

  archive.append(csvStream, {
    name: dictionaryFileName[TypeMicrodata.AVALIACAO_NORMALIZADA],
  })

  let isFirst = true

  for (const subFile of subFiles) {
    const key = `${TypeMicrodata.AVALIACAO_NORMALIZADA}_${subFile}`
    const entries = microdataDictionaries[key]

    if (!entries) continue

    if (!isFirst) {
      csvStream.write({
        Campo: '',
        Descricao: '',
        Tipo: '',
        Observacoes: '',
      })
    }

    csvStream.write({
      Campo: `--- Arquivo: ${subFile}.csv ---`,
      Descricao: '',
      Tipo: '',
      Observacoes: '',
    })

    for (const entry of entries) {
      csvStream.write(entry)
    }

    isFirst = false
  }

  csvStream.end()
}
