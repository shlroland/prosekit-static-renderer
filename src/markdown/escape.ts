import { serializeChildrenToHTMLString } from '../dom-output-spec.ts'

export function renderMarkdownText(children?: string | string[]): string {
  return serializeChildrenToHTMLString(children)
}

export function renderInlineCode(children?: string | string[]): string {
  const text = renderMarkdownText(children)
  const fence = '`'.repeat(longestRun(text, '`') + 1)
  const needsPadding =
    text.startsWith('`') || text.endsWith('`') || /^`+$/.test(text)
  const padding = needsPadding ? ' ' : ''

  return `${fence}${padding}${text}${padding}${fence}`
}

export function renderCodeFence(
  children?: string | string[],
  language = '',
): string {
  const text = renderMarkdownText(children)
  const fence = '`'.repeat(Math.max(3, longestRun(text, '`') + 1))

  return `\n${fence}${language}\n${text}\n${fence}\n`
}

export function renderListItem(
  marker: string,
  children?: string | string[],
): string {
  const text = renderMarkdownText(children).trim()
  const lines = text.split('\n')
  const indent = ' '.repeat(marker.length + 1)

  return `${marker} ${lines
    .map((line, index) => {
      if (index === 0) {
        return line
      }
      return line ? `${indent}${line}` : ''
    })
    .join('\n')}\n`
}

export function renderTableCell(children?: string | string[]): string {
  return renderMarkdownText(children)
    .trim()
    .replaceAll('|', String.raw`\|`)
    .replaceAll(/\n+/g, '<br>')
}

export function escapeMarkdownLabel(value: string): string {
  return value
    .replaceAll('\\', '\\\\')
    .replaceAll('[', String.raw`\[`)
    .replaceAll(']', String.raw`\]`)
}

export function escapeMarkdownURL(value: string): string {
  return value
    .replaceAll('\\', '\\\\')
    .replaceAll(' ', '%20')
    .replaceAll(')', String.raw`\)`)
}

function longestRun(value: string, char: string): number {
  let longest = 0
  let current = 0

  for (const valueChar of value) {
    if (valueChar === char) {
      current += 1
      longest = Math.max(longest, current)
    } else {
      current = 0
    }
  }

  return longest
}
