import { defineBasicExtension } from '@prosekit/basic'
import type { NodeJSON } from '@prosekit/core'
import { union } from '@prosekit/core'
import { describe, expect, it } from 'vitest'

import {
  createHTMLRenderer,
  renderToHTMLString,
  renderToMarkdown,
  renderToReactElement,
} from '../src/index.ts'
import { renderToPreactElement } from '../src/preact.ts'
import { renderToSolidElement } from '../src/solid.ts'
import { renderToSvelteAST } from '../src/svelte.ts'
import { renderToVueElement } from '../src/vue.ts'

const extension = union(defineBasicExtension())

describe('renderToHTMLString', () => {
  it('renders basic content using schema toDOM specs', () => {
    expect(
      renderToHTMLString({
        extension,
        content: {
          type: 'doc',
          content: [
            {
              type: 'heading',
              attrs: { level: 1 },
              content: [{ type: 'text', text: 'Title' }],
            },
            {
              type: 'paragraph',
              content: [
                { type: 'text', text: 'Hello ' },
                { type: 'text', marks: [{ type: 'bold' }], text: 'World' },
              ],
            },
          ],
        },
      }),
    ).toBe('<h1>Title</h1><p>Hello <strong>World</strong></p>')
  })

  it('escapes text and attribute values', () => {
    expect(
      renderToHTMLString({
        extension,
        content: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  marks: [
                    {
                      type: 'link',
                      attrs: { href: 'https://example.com?a=1&b="x"' },
                    },
                  ],
                  text: '<script>alert("xss")</script>',
                },
              ],
            },
          ],
        },
      }),
    ).toBe(
      '<p><a href="https://example.com?a=1&amp;b=&quot;x&quot;">&lt;script&gt;alert("xss")&lt;/script&gt;</a></p>',
    )
  })

  it('supports reusable renderers and custom mappings', () => {
    const render = createHTMLRenderer({
      extension,
      nodeMapping: {
        paragraph: ({ children }) => `<div class="paragraph">${children}</div>`,
      },
      markMapping: {
        bold: ({ children }) => `<b>${children}</b>`,
      },
    })

    expect(
      render({
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', marks: [{ type: 'bold' }], text: 'Custom' },
            ],
          },
        ],
      }),
    ).toBe('<div class="paragraph"><b>Custom</b></div>')
  })
})

describe('renderToMarkdown', () => {
  it('renders markdown-specific node and mark mappings', () => {
    expect(
      renderToMarkdown({
        extension,
        content: {
          type: 'doc',
          content: [
            {
              type: 'heading',
              attrs: { level: 2 },
              content: [{ type: 'text', text: 'Title' }],
            },
            {
              type: 'paragraph',
              content: [
                { type: 'text', marks: [{ type: 'italic' }], text: 'Hello' },
                { type: 'text', text: ' markdown' },
              ],
            },
          ],
        },
      }),
    ).toBe('## Title\n\n_Hello_ markdown\n')
  })
})

describe('framework renderers', () => {
  it('creates framework-specific render outputs', () => {
    const content = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Hello' }],
        },
      ],
    } satisfies NodeJSON

    expect(renderToReactElement({ extension, content })).toBeTruthy()
    expect(renderToPreactElement({ extension, content })).toBeTruthy()
    expect(renderToSolidElement({ extension, content })).toBeTruthy()
    expect(renderToSvelteAST({ extension, content })).toMatchObject({
      children: ['Hello'],
      props: {},
      tag: 'p',
    })
    expect(renderToVueElement({ extension, content })).toBeTruthy()
  })
})
