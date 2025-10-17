import * as archiver from 'archiver'
import { Stringifier, stringify } from 'csv-stringify'
import * as fs from 'fs'

import { TypeMicrodata } from '../dto/type-microdata.enum'
import { CsvTransformStream } from './csv-transform-stream'

export function initialCsvStream(sinal: string = ';', type: TypeMicrodata) {
  const nameFile = `${Date.now()}-${type}.csv.zip`

  const output: fs.WriteStream = fs.createWriteStream(
    `./public/microdata/${nameFile}`,
  )

  const archive: archiver.Archiver = archiver('zip', {
    zlib: { level: 9 }, // Nível de compressão
  })

  output.on('close', () => {
    console.log(`Arquivo zip criado: ${archive.pointer()} bytes`)
  })

  archive.on('error', (err) => {
    throw err
  })

  archive.pipe(output)

  const csvStream: Stringifier = stringify({
    header: true,
    delimiter: sinal,
  })

  archive.append(csvStream, { name: 'data.csv' })

  return {
    csvStream,
    nameFile,
    archive,
  }
}

export function endCsvStream(
  csvStream: Stringifier,
  archive: archiver.Archiver,
) {
  csvStream.end()

  archive.finalize()
}

export function safeWrite(stream: any, row: any) {
  stream.write(row)
}

export async function exportCsvToZipStream({
  archive,
  entryName,
  fields,
  source,
}: {
  archive: archiver.Archiver
  entryName: string
  fields: string[]
  source: AsyncGenerator<any>
}) {
  const csvStream = new CsvTransformStream(fields)
  archive.append(csvStream, { name: entryName })

  for await (const item of source) {
    csvStream.write(item)
  }

  csvStream.end()
}
