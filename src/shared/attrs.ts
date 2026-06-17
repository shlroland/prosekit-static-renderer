import type { URLSanitizer, URLSanitizerContext } from '../types.ts'

import { isURLAttribute, sanitizeURLAttribute } from './url.ts'

export interface FilterAttrsOptions {
  tag: string
  target: URLSanitizerContext['target']
  sanitizeURL?: URLSanitizer
}

export function isEventAttribute(name: string): boolean {
  return /^on[a-z]/i.test(name)
}

export function filterStaticAttrs(
  attrs: Record<string, unknown> | undefined | null,
  options: FilterAttrsOptions,
): Record<string, unknown> {
  const output: Record<string, unknown> = {}

  for (const [name, value] of Object.entries(attrs || {})) {
    if (value == null || isEventAttribute(name)) {
      continue
    }

    if (isURLAttribute(name)) {
      const sanitized = sanitizeURLAttribute(
        value,
        { tag: options.tag, attr: name, target: options.target },
        options.sanitizeURL,
      )

      if (sanitized == null) {
        continue
      }

      output[name] = sanitized
      continue
    }

    output[name] = value
  }

  return output
}

export function unsupportedDOMOutputSpecError(spec: unknown): Error {
  return new Error(
    '[prosekit error]: Unsupported DOMOutputSpec type. Static renderers support SSR-friendly DOMOutputSpec strings and arrays only. If toDOM returns a DOM Node, return a DOMOutputSpec instead or provide a custom nodeMapping/markMapping.',
    { cause: spec },
  )
}

export function stringifyStaticAttrValue(value: unknown): string {
  if (typeof value === 'string') {
    return value
  }

  if (
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    typeof value === 'bigint'
  ) {
    return String(value)
  }

  return ''
}
