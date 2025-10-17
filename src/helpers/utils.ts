/* eslint-disable camelcase */
import { randomBytes } from 'crypto'
import { extname } from 'path'

export const removeAccent = (str: string) => {
  let r = str.toLowerCase()
  const non_asciis = {
    a: '[àáâãäå]',
    ae: 'æ',
    c: 'ç',
    e: '[èéêë]',
    i: '[ìíîï]',
    n: 'ñ',
    o: '[òóôõö]',
    oe: 'œ',
    u: '[ùúûűü]',
    y: '[ýÿ]',
  }
  for (const i in non_asciis) {
    r = r.replace(new RegExp(non_asciis[i], 'g'), i)
  }
  return r
}

export const convertToSlug = (text: string) => {
  return text
    .toLowerCase()
    .replace(/ /g, '-')
    .replace(/[^\w-]+/g, '')
}

export const editFileName = (file) => {
  const name = convertToSlug(removeAccent(file.split('.')[0]))
  const fileExtName = extname(file)
  const randomName = Array(4)
    .fill(null)
    .map(() => randomBytes(16).toString('hex'))
    .join('')
  return `${name}-${randomName}${fileExtName}`
}

export const editFileNameWithCallBack = (_req, file, callback) => {
  const name = convertToSlug(removeAccent(file.originalname.split('.')[0]))
  const fileExtName = extname(file.originalname)
  const randomName = Array(4)
    .fill(null)
    .map(() => randomBytes(16).toString('hex'))
    .join('')
  callback(null, `${name}-${randomName}${fileExtName}`)
}
