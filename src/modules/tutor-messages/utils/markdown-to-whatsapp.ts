/* eslint-disable no-control-regex */
/**
 * Converte HTML em texto de uma única linha (sem quebras).
 * - Remove tags e conteúdos <script>/<style>
 * - Converte entidades (&nbsp;, &amp;, &#xNN;, &#NN;)
 * - Transforma qualquer whitespace (incluindo \n, \r) em espaço simples
 * - Colapsa espaços múltiplos e faz trim
 */
export function htmlToSingleLine(input: string): string {
  if (!input) return ''

  let s = String(input)

  // 1) remove <script> e <style> (conteúdo inteiro)
  s = s.replace(/<script[\s\S]*?<\/script>/gi, ' ')
  s = s.replace(/<style[\s\S]*?<\/style>/gi, ' ')

  // 2) substitui quebras típicas de bloco por espaço (sem usar \n)
  //    (fechamentos de p/div/section/article/header/footer/main/br)
  s = s.replace(/<\/(p|div|section|article|header|footer|main)\b[^>]*>/gi, ' ')
  s = s.replace(/<(br)\b[^>]*\/?>/gi, ' ')

  // 3) remove o restante das tags
  s = s.replace(/<[^>]+>/g, ' ')

  // 4) decodifica entidades HTML comuns
  s = decodeEntitiesToText(s)

  // 5) normaliza qualquer whitespace em espaço simples e remove sobras
  s = s
    .replace(/[\u0000-\u001F\u007F]/g, ' ') // chars de controle
    .replace(/\s+/g, ' ') // qualquer whitespace -> espaço simples
    .trim()

  return s
}

/** Decodifica entidades HTML básicas, decimais e hexadecimais. */
function decodeEntitiesToText(s: string): string {
  // básicas
  s = s
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")

  // numéricas decimais: &#1234;
  s = s.replace(/&#(\d+);/g, (_, dec: string) => {
    const code = Number(dec)
    return safeFromCodePoint(code)
  })

  // numéricas hex: &#x1F60A;
  s = s.replace(/&#x([0-9a-fA-F]+);/g, (_, hex: string) => {
    const code = parseInt(hex, 16)
    return safeFromCodePoint(code)
  })

  return s
}

function safeFromCodePoint(cp: number): string {
  try {
    if (!Number.isFinite(cp) || cp < 0) return ''
    return String.fromCodePoint(cp)
  } catch {
    return ''
  }
}
