/* eslint-disable no-control-regex */
/**
 * Converte HTML em texto de uma única linha (sem quebras).
 * - Remove tags e conteúdos <script>/<style>
 * - Converte entidades (&nbsp;, &amp;, &#xNN;, &#NN;)
 * - Transforma qualquer whitespace (incluindo \n, \r) em espaço simples
 * - Colapsa espaços múltiplos e faz trim
 */
// export function htmlToSingleLine(input: string): string {
//   if (!input) return ''

//   let s = String(input)

//   // 1) remove <script> e <style> (conteúdo inteiro)
//   s = s.replace(/<script[\s\S]*?<\/script>/gi, ' ')
//   s = s.replace(/<style[\s\S]*?<\/style>/gi, ' ')

//   // 2) substitui quebras típicas de bloco por espaço (sem usar \n)
//   //    (fechamentos de p/div/section/article/header/footer/main/br)
//   s = s.replace(/<\/(p|div|section|article|header|footer|main)\b[^>]*>/gi, ' ')
//   s = s.replace(/<(br)\b[^>]*\/?>/gi, ' ')

//   // 3) remove o restante das tags
//   s = s.replace(/<[^>]+>/g, ' ')

//   // 4) decodifica entidades HTML comuns
//   s = decodeEntitiesToText(s)

//   // 5) normaliza qualquer whitespace em espaço simples e remove sobras
//   s = s
//     .replace(/[\u0000-\u001F\u007F]/g, ' ') // chars de controle
//     .replace(/\s+/g, ' ') // qualquer whitespace -> espaço simples
//     .trim()

//   return s
// }
export function htmlToSingleLine(htmlContent: string): string {
  // Remove comentários HTML
  let formatted = htmlContent.replace(/<!--[\s\S]*?-->/g, '')

  // Remove scripts e styles
  formatted = formatted.replace(/<script[\s\S]*?<\/script>/gi, '')
  formatted = formatted.replace(/<style[\s\S]*?<\/style>/gi, '')

  // Remove todos os atributos das tags, mantendo apenas o nome da tag
  formatted = formatted.replace(/<(\w+)[^>]*>/g, '<$1>')

  // Processa tags aninhadas (ordem importa!)
  // Combinações de strong/em/u
  formatted = formatted.replace(
    /<strong><em><u>(.*?)<\/u><\/em><\/strong>/gi,
    '*_$1_*',
  )
  formatted = formatted.replace(
    /<em><strong><u>(.*?)<\/u><\/strong><\/em>/gi,
    '*_$1_*',
  )
  formatted = formatted.replace(/<strong><em>(.*?)<\/em><\/strong>/gi, '*_$1_*')
  formatted = formatted.replace(/<em><strong>(.*?)<\/strong><\/em>/gi, '*_$1_*')

  // Tags individuais
  formatted = formatted.replace(/<strong>(.*?)<\/strong>/gi, '*$1*')
  formatted = formatted.replace(/<b>(.*?)<\/b>/gi, '*$1*')
  formatted = formatted.replace(/<em>(.*?)<\/em>/gi, '_$1_')
  formatted = formatted.replace(/<i>(.*?)<\/i>/gi, '_$1_')
  formatted = formatted.replace(/<u>(.*?)<\/u>/gi, '$1') // Remove sublinhado

  // Headers
  formatted = formatted.replace(/<h[1-6]>(.*?)<\/h[1-6]>/gi, '*$1*\n')

  // Links
  formatted = formatted.replace(
    /<a[^>]*href=["']([^"']*)["'][^>]*>(.*?)<\/a>/gi,
    '$2 ($1)',
  )

  // Listas
  formatted = formatted.replace(/<ul>/gi, '')
  formatted = formatted.replace(/<\/ul>/gi, '\n')
  formatted = formatted.replace(/<ol>/gi, '')
  formatted = formatted.replace(/<\/ol>/gi, '\n')
  formatted = formatted.replace(/<li>(.*?)<\/li>/gi, '• $1\n')

  // Blockquote
  formatted = formatted.replace(/<blockquote>(.*?)<\/blockquote>/gi, '> $1\n')

  // Code
  formatted = formatted.replace(/<code>(.*?)<\/code>/gi, '`$1`')
  formatted = formatted.replace(/<pre>(.*?)<\/pre>/gi, '```\n$1\n```\n')

  // Remove span, div, section, article (preserva conteúdo)
  formatted = formatted.replace(/<\/?(?:span|div|section|article)[^>]*>/gi, '')

  // Parágrafos e quebras
  formatted = formatted.replace(/<p><br><\/p>/gi, '\n')
  formatted = formatted.replace(/<p>/gi, '')
  formatted = formatted.replace(/<\/p>/gi, '\n')
  formatted = formatted.replace(/<br\s*\/?>/gi, '\n')

  // Remove qualquer tag restante
  formatted = formatted.replace(/<[^>]+>/g, '')

  // Decodifica entidades HTML
  formatted = formatted
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")

  // Limpeza final
  formatted = formatted
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\*\*+/g, '*')
    .replace(/__+/g, '_')
    .replace(/\* \*/g, '')
    .replace(/_ _/g, '')
    .trim()

  return formatted
}

// export function htmlToSingleLine(htmlContent: string): string {
//   // Remove tags <p><br></p> vazias
//   let formatted = htmlContent.replace(/<p><br><\/p>/g, '\n')

//   // Converte <strong> para *negrito*
//   formatted = formatted.replace(/<strong>(.*?)<\/strong>/g, '*$1*')

//   // Converte <em> para _itálico_
//   formatted = formatted.replace(/<em>(.*?)<\/em>/g, '_$1_')

//   // Converte <ul><li> para lista com bullets
//   formatted = formatted.replace(/<ul>/g, '')
//   formatted = formatted.replace(/<\/ul>/g, '\n')
//   formatted = formatted.replace(/<li>(.*?)<\/li>/g, '• $1\n')

//   // Remove tags <p> e </p>, substituindo por quebras de linha
//   formatted = formatted.replace(/<p>/g, '')
//   formatted = formatted.replace(/<\/p>/g, '\n')

//   // Remove <br> substituindo por quebra de linha
//   formatted = formatted.replace(/<br>/g, '\n')

//   // Remove espaços em branco excessivos
//   formatted = formatted.replace(/\n{3,}/g, '\n\n')

//   // Trim para remover espaços no início e fim
//   formatted = formatted.trim()

//   return formatted
// }

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
