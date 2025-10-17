import { CsvFormatterStream, format } from '@fast-csv/format'
import * as archiver from 'archiver'
import * as fs from 'fs'

import { TypeMicrodata } from '../dto/type-microdata.enum'

export function initialCsvArchive(type: TypeMicrodata) {
  const nameFile = `${Date.now()}-${type}.csv.zip`
  const output = fs.createWriteStream(`./public/microdata/${nameFile}`)

  const archive = archiver('zip', { zlib: { level: 3 } })
  archive.pipe(output)

  output.on('close', () => {
    console.log(`Arquivo zip criado: ${archive.pointer()} bytes`)
  })

  archive.on('error', (err) => {
    throw err
  })

  return {
    nameFile,
    archive,
    streams: {} as Record<string, CsvFormatterStream<any, any>>,
  }
}

export function addCsvToArchive(
  archive: archiver.Archiver,
  streams: Record<string, CsvFormatterStream<any, any>>,
  fileName: string,
  sinal: string,
): CsvFormatterStream<any, any> {
  const csvStream = format({ headers: true, delimiter: sinal })
  streams[fileName] = csvStream
  archive.append(csvStream, { name: fileName })
  return csvStream
}

export function finalizeCsvArchive(
  streams: Record<string, CsvFormatterStream<any, any>>,
  archive: archiver.Archiver,
) {
  Object.values(streams).forEach((s) => s.end())
  archive.finalize()
}
