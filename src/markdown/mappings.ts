import { serializeChildrenToHTMLString } from '../dom-output-spec.ts'
import { sanitizeURLAttribute } from '../shared/url.ts'
import type { MarkMapping, NodeMapping, URLSanitizer } from '../types.ts'

import {
  escapeMarkdownLabel,
  escapeMarkdownURL,
  renderCodeFence,
  renderInlineCode,
  renderListItem,
  renderMarkdownText,
  renderTableCell,
} from './escape.ts'

export interface MarkdownMappingOptions {
  sanitizeURL?: URLSanitizer
}

export function createDefaultMarkdownNodeMapping(
  options: MarkdownMappingOptions = {},
): NodeMapping<string> {
  return {
    paragraph({ children }) {
      return `\n${renderMarkdownText(children)}\n`
    },
    heading({ node, children }) {
      const level = node.attrs.level as number
      return `${'#'.repeat(level)} ${renderMarkdownText(children)}\n`
    },
    codeBlock({ node, children }) {
      const language = (node.attrs.language as string) || ''
      return renderCodeFence(children, language)
    },
    blockquote({ children }) {
      return `\n${renderMarkdownText(children)
        .trim()
        .split('\n')
        .map((line) => `> ${line}`)
        .join('\n')}\n`
    },
    bulletList({ children }) {
      return `\n${renderMarkdownText(children)}`
    },
    orderedList({ children }) {
      return `\n${renderMarkdownText(children)}`
    },
    list({ node, children, parent }) {
      const kind = node.attrs.kind as string | undefined
      let marker = '-'

      if (kind === 'ordered') {
        let number = (node.attrs.order as number | null) || 1
        parent?.forEach((child, _offset, index) => {
          if (node === child) {
            number = index + 1
          }
        })
        marker = `${number}.`
      } else if (kind === 'task') {
        marker = node.attrs.checked ? '- [x]' : '- [ ]'
      }

      return renderListItem(marker, children)
    },
    listItem({ node, children, parent }) {
      if (parent?.type.name === 'orderedList') {
        let number = (parent.attrs.start as number) || 1
        parent.forEach((child, _offset, index) => {
          if (node === child) {
            number = index + 1
          }
        })
        return renderListItem(`${number}.`, children)
      }
      return renderListItem('-', children)
    },
    hardBreak() {
      return '\n'
    },
    horizontalRule() {
      return '\n---\n'
    },
    image({ node }) {
      const alt = escapeMarkdownLabel((node.attrs.alt as string) || '')
      const src = sanitizeMarkdownURL(
        (node.attrs.src as string) || '',
        'img',
        'src',
        options,
      )
      return src ? `![${alt}](${escapeMarkdownURL(src)})` : `![${alt}]()`
    },
    table({ children, node }) {
      if (!Array.isArray(children)) {
        return `\n${renderMarkdownText(children)}\n`
      }
      const columnCount = node.firstChild?.childCount ?? 0
      const separator = Array.from({ length: columnCount })
        .fill('---')
        .join(' | ')
      return `\n${serializeChildrenToHTMLString(children[0])}| ${separator} |\n${serializeChildrenToHTMLString(children.slice(1))}\n`
    },
    tableRow({ children }) {
      const cells = Array.isArray(children) ? children : [children]
      return `| ${cells.map((c) => renderTableCell(c)).join(' | ')} |\n`
    },
    tableHeader({ children }) {
      return renderMarkdownText(children).trim()
    },
    tableHeaderCell({ children }) {
      return renderMarkdownText(children).trim()
    },
    tableCell({ children }) {
      return renderMarkdownText(children).trim()
    },
    mention({ node }) {
      const value = (node.attrs.value as string) || ''
      return value ? `@${value}` : ''
    },
    pageBreak() {
      return '\n---\n'
    },
    mathInline({ children }) {
      return `$${renderMarkdownText(children).trim()}$`
    },
    mathBlock({ children }) {
      return `\n$$\n${renderMarkdownText(children).trim()}\n$$\n`
    },
  }
}

export function createDefaultMarkdownMarkMapping(
  options: MarkdownMappingOptions = {},
): MarkMapping<string> {
  return {
    bold({ children }) {
      return `**${renderMarkdownText(children)}**`
    },
    italic({ children }) {
      return `_${renderMarkdownText(children)}_`
    },
    code({ children }) {
      return renderInlineCode(children)
    },
    strike({ children }) {
      return `~~${renderMarkdownText(children)}~~`
    },
    underline({ children }) {
      return `<u>${renderMarkdownText(children)}</u>`
    },
    subscript({ children }) {
      return `<sub>${renderMarkdownText(children)}</sub>`
    },
    superscript({ children }) {
      return `<sup>${renderMarkdownText(children)}</sup>`
    },
    link({ mark, children }) {
      const href = sanitizeMarkdownURL(
        (mark.attrs.href as string) || '',
        'a',
        'href',
        options,
      )
      const label = escapeMarkdownLabel(renderMarkdownText(children))
      return href ? `[${label}](${escapeMarkdownURL(href)})` : label
    },
    highlight({ children }) {
      return `==${renderMarkdownText(children)}==`
    },
  }
}

function sanitizeMarkdownURL(
  value: string,
  tag: string,
  attr: string,
  options: MarkdownMappingOptions,
): string | null {
  return sanitizeURLAttribute(
    value,
    { tag, attr, target: 'markdown' },
    options.sanitizeURL,
  )
}
