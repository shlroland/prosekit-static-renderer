import type { URLSanitizer, URLSanitizerContext } from '../types.ts'

const URL_ATTRS = new Set([
  'action',
  'cite',
  'formaction',
  'href',
  'poster',
  'src',
  'srcset',
  'xlink:href',
])

const ALLOWED_PROTOCOLS = new Set(['http:', 'https:', 'mailto:', 'tel:'])

export function isURLAttribute(attr: string): boolean {
  return URL_ATTRS.has(normalizeAttrName(attr))
}

export function defaultSanitizeURL(url: string): string | null {
  const trimmed = url.trim()

  if (!trimmed) {
    return trimmed
  }

  if (
    trimmed.startsWith('#') ||
    trimmed.startsWith('/') ||
    trimmed.startsWith('?') ||
    trimmed.startsWith('./') ||
    trimmed.startsWith('../')
  ) {
    return url
  }

  const normalized = trimmed
    .replaceAll(/[\s\u0000-\u001F\u007F]+/g, '')
    .toLowerCase()
  const protocolMatch = /^[a-z][\d+.a-z-]*:/i.exec(normalized)

  if (!protocolMatch) {
    return url
  }

  return ALLOWED_PROTOCOLS.has(protocolMatch[0]) ? url : null
}

export function sanitizeURLAttribute(
  value: unknown,
  context: URLSanitizerContext,
  sanitizeURL: URLSanitizer | undefined,
): string | null {
  const url = String(value)
  if (normalizeAttrName(context.attr) === 'srcset') {
    const srcset = sanitizeSrcset(url, context, sanitizeURL)
    return srcset || null
  }

  const result = (sanitizeURL ?? defaultSanitizeURL)(url, context)

  return result == null ? null : String(result)
}

function normalizeAttrName(attr: string): string {
  return attr.split(' ').at(-1)?.toLowerCase() ?? attr.toLowerCase()
}

function sanitizeSrcset(
  value: string,
  context: URLSanitizerContext,
  sanitizeURL: URLSanitizer | undefined,
): string {
  return value
    .split(',')
    .map((entry) => {
      const trimmed = entry.trim()
      if (!trimmed) return null

      const [url, ...descriptors] = trimmed.split(/\s+/)
      const result = (sanitizeURL ?? defaultSanitizeURL)(url, context)
      if (result == null) return null

      return [result, ...descriptors].join(' ')
    })
    .filter((entry): entry is string => Boolean(entry))
    .join(', ')
}
