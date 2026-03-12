import { ReportContext } from '../model/interface/report-context.interface'

const FORBIDDEN_PATTERNS = [
  /ignore\s+(previous|all|above|prior)\s+(instructions?|prompts?)/gi,
  /disregard\s+(previous|all|above|prior)\s+(instructions?|prompts?)/gi,
  /forget\s+(previous|all|above|prior)\s+(instructions?|prompts?)/gi,
  /you\s+are\s+now\s+a/gi,
  /act\s+as\s+if/gi,
  /pretend\s+(you\s+are|to\s+be)/gi,
  /new\s+instructions?:/gi,
  /system\s*:\s*/gi,
  /\[system\]/gi,
  /###\s*(system|instruction)/gi,
  /<\s*script/gi,
  /javascript\s*:/gi,
  /data\s*:\s*text\/html/gi,
  /eval\s*\(/gi,
  /function\s*\(/gi,
]

const MAX_STRING_LENGTH = 1000
const MAX_ARRAY_SIZE = 500
const MAX_NESTED_DEPTH = 10

export function sanitizeString(
  value: string,
  maxLength = MAX_STRING_LENGTH,
): string {
  if (typeof value !== 'string') return ''

  let sanitized = value.trim().slice(0, maxLength)

  for (const pattern of FORBIDDEN_PATTERNS) {
    sanitized = sanitized.replace(pattern, '[FILTERED]')
  }

  sanitized = sanitized.replace(/</g, '&lt;').replace(/>/g, '&gt;')

  return sanitized
}

export function sanitizeNumber(value: unknown): number | undefined {
  if (value === null || value === undefined) return undefined

  const num = Number(value)
  if (isNaN(num) || !isFinite(num)) return undefined

  return num
}

function sanitizeObject(obj: unknown, depth = 0): unknown {
  if (depth > MAX_NESTED_DEPTH) return undefined

  if (obj === null || obj === undefined) return undefined

  if (typeof obj === 'string') {
    return sanitizeString(obj)
  }

  if (typeof obj === 'number') {
    return sanitizeNumber(obj)
  }

  if (typeof obj === 'boolean') {
    return obj
  }

  if (Array.isArray(obj)) {
    return obj
      .slice(0, MAX_ARRAY_SIZE)
      .map((item) => sanitizeObject(item, depth + 1))
      .filter((item) => item !== undefined)
  }

  if (typeof obj === 'object') {
    const sanitized: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(obj)) {
      const sanitizedKey = sanitizeString(key, 100)
      const sanitizedValue = sanitizeObject(value, depth + 1)
      if (sanitizedValue !== undefined) {
        sanitized[sanitizedKey] = sanitizedValue
      }
    }
    return sanitized
  }

  return undefined
}

export function sanitizeReportContext(context: ReportContext): ReportContext {
  if (!context || typeof context !== 'object') {
    return {}
  }

  return sanitizeObject(context) as ReportContext
}

export function sanitizeUserMessage(message: string): string {
  return sanitizeString(message, 5000)
}
