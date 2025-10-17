/* eslint-disable @typescript-eslint/ban-types */
import { Transform } from 'stream'

export class CsvTransformStream extends Transform {
  private headerWritten = false
  private fields: string[]

  constructor(fields: string[]) {
    super({ objectMode: true })
    this.fields = fields
  }

  _transform(chunk: any, _encoding: BufferEncoding, callback: Function) {
    if (!this.headerWritten) {
      this.push(this.fields.join(';') + '\n')
      this.headerWritten = true
    }

    const line = this.fields.map((key) => {
      const value = chunk[key]
      return (value ?? '').toString().replace(/;/g, ',')
    })

    this.push(line.join(';') + '\n')
    callback()
  }
}
