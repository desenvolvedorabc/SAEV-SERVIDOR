import * as archiver from 'archiver'
import { stringify } from 'csv-stringify'

import { ExtractionMetadata } from './build-extraction-metadata'

const METADATA_FILE_NAME = 'parametros_extracao.csv'

export function addMetadataToArchive(
  archive: archiver.Archiver,
  metadata: ExtractionMetadata,
): void {
  try {
    const csvStream = stringify({
      header: true,
      delimiter: ';',
      bom: true,
      columns: [
        { key: 'parametro', header: 'Parametro' },
        { key: 'valor', header: 'Valor' },
      ],
    })

    archive.append(csvStream, { name: METADATA_FILE_NAME })

    const rows: Array<{ parametro: string; valor: string }> = [
      { parametro: 'Tipo de Microdado', valor: metadata.tipoMicrodado },
      { parametro: 'Estado', valor: metadata.estado },
      { parametro: 'Município', valor: metadata.municipio },
      { parametro: 'Rede', valor: metadata.rede },
      { parametro: 'Ano', valor: metadata.ano },
      { parametro: 'Edição', valor: metadata.edicao },
      {
        parametro: 'Formato de Exportação',
        valor: metadata.formatoExportacao,
      },
      {
        parametro: 'Data e Hora da Extração',
        valor: metadata.dataHoraExtracao,
      },
      { parametro: 'Usuário', valor: metadata.usuario },
    ]

    for (const row of rows) {
      csvStream.write(row)
    }

    csvStream.end()
  } catch (err) {
    console.error('Falha ao gerar arquivo de metadados da extração:', err)
  }
}
