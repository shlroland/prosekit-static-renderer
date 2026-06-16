import { defineBasicExtension } from '@prosekit/basic'
import { createEditor, union } from '@prosekit/core'
import { defineBackgroundColor } from '@prosekit/extensions/background-color'
import { defineFontFamily } from '@prosekit/extensions/font-family'
import { defineHighlight } from '@prosekit/extensions/highlight'
import { defineMath } from '@prosekit/extensions/math'
import { defineMention } from '@prosekit/extensions/mention'
import { definePageBreak } from '@prosekit/extensions/page'
import { defineSubscript } from '@prosekit/extensions/subscript'
import { defineSuperscript } from '@prosekit/extensions/superscript'
import { defineTextAlign } from '@prosekit/extensions/text-align'
import { defineTextColor } from '@prosekit/extensions/text-color'
import { createRoot } from 'react-dom/client'

import { createHTMLRenderer } from '../src/html.ts'
import { createMarkdownRenderer } from '../src/markdown.ts'
import { createReactRenderer } from '../src/react.ts'

const editorElement = document.querySelector<HTMLDivElement>('#editor')
const textOutput = document.querySelector<HTMLElement>('#text-output')
const reactOutput = document.querySelector<HTMLDivElement>('#react-output')
const outputTabs = Array.from(
  document.querySelectorAll<HTMLButtonElement>(
    '[data-output-mode]:not(:disabled)',
  ),
)

if (!editorElement || !textOutput || !reactOutput || outputTabs.length === 0) {
  throw new Error('Failed to find demo elements')
}

const editorRoot = editorElement
const textOutputElement = textOutput
const reactOutputElement = reactOutput

type OutputMode = 'html' | 'markdown' | 'react'

let outputMode: OutputMode = 'html'
let outputUpdateID = 0

async function formatHTML(html: string): Promise<string> {
  const [{ default: prettier }, { default: prettierPluginHtml }] =
    await Promise.all([
      import('prettier/standalone'),
      import('prettier/plugins/html'),
    ])

  return await prettier.format(html, {
    parser: 'html',
    plugins: [prettierPluginHtml],
  })
}

function defineEditorExtension() {
  return union(
    defineBasicExtension(),
    defineTextColor(),
    defineBackgroundColor(),
    defineFontFamily(),
    defineTextAlign({ types: ['paragraph', 'heading'] }),
    defineHighlight(),
    defineSubscript(),
    defineSuperscript(),
    defineMention(),
    definePageBreak(),
    defineMath({
      renderMathBlock: () => {},
      renderMathInline: () => {},
    }),
  )
}

type EditorExtension = ReturnType<typeof defineEditorExtension>

const defaultContent = {
  type: 'doc',
  content: [
    {
      type: 'heading',
      attrs: { level: 1, textAlign: 'center' },
      content: [{ type: 'text', text: 'Static Renderer Demo' }],
    },
    {
      type: 'paragraph',
      attrs: { textAlign: 'left' },
      content: [
        { type: 'text', text: 'Render ' },
        { type: 'text', marks: [{ type: 'bold' }], text: 'ProseKit JSON' },
        { type: 'text', text: ' without creating another editor instance.' },
      ],
    },
    {
      type: 'paragraph',
      attrs: { textAlign: 'left' },
      content: [
        {
          type: 'text',
          marks: [{ type: 'link', attrs: { href: 'https://prosekit.dev' } }],
          text: 'Links',
        },
        {
          type: 'text',
          text: ', marks, headings, lists, tables, mentions, math, and page breaks can be rendered statically.',
        },
      ],
    },
    {
      type: 'paragraph',
      attrs: { textAlign: 'right' },
      content: [
        { type: 'text', text: 'Extra extensions: ' },
        {
          type: 'text',
          marks: [{ type: 'textColor', attrs: { color: '#2563eb' } }],
          text: 'color',
        },
        { type: 'text', text: ', ' },
        {
          type: 'text',
          marks: [{ type: 'backgroundColor', attrs: { color: '#fef3c7' } }],
          text: 'background',
        },
        { type: 'text', text: ', ' },
        {
          type: 'text',
          marks: [{ type: 'fontFamily', attrs: { family: 'Inter' } }],
          text: 'font',
        },
        { type: 'text', text: ', ' },
        {
          type: 'text',
          marks: [{ type: 'highlight' }],
          text: 'highlight',
        },
        { type: 'text', text: ', ' },
        {
          type: 'text',
          marks: [{ type: 'subscript' }],
          text: 'sub',
        },
        { type: 'text', text: ', ' },
        {
          type: 'text',
          marks: [{ type: 'superscript' }],
          text: 'sup',
        },
        { type: 'text', text: ', and ' },
        { type: 'mention', attrs: { id: '1', value: 'Ada', kind: 'user' } },
        { type: 'text', text: '.' },
      ],
    },
    {
      type: 'list',
      attrs: { kind: 'bullet', order: null, checked: false, collapsed: false },
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'HTML string output' }],
        },
      ],
    },
    {
      type: 'list',
      attrs: { kind: 'task', order: null, checked: true, collapsed: false },
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'React element output' }],
        },
      ],
    },
    {
      type: 'mathBlock',
      attrs: { language: 'tex' },
      content: [{ type: 'text', text: 'E = mc^2' }],
    },
    {
      type: 'paragraph',
      attrs: { textAlign: 'left' },
      content: [
        { type: 'text', text: 'Inline math ' },
        { type: 'mathInline', content: [{ type: 'text', text: 'x + y' }] },
        { type: 'text', text: ' is rendered too.' },
      ],
    },
    { type: 'pageBreak' },
  ],
}

function start() {
  const extension = defineEditorExtension()
  const renderHTML = createHTMLRenderer({ extension })
  const renderMarkdown = createMarkdownRenderer({ extension })
  const renderReact = createReactRenderer({ extension })
  const reactRoot = createRoot(reactOutputElement)
  const editor = createEditor<EditorExtension>({
    extension,
    defaultContent,
  })

  async function updateOutput() {
    const updateID = ++outputUpdateID
    const doc = editor.getDocJSON()
    const isReactMode = outputMode === 'react'

    textOutputElement.hidden = isReactMode
    reactOutputElement.hidden = !isReactMode

    if (outputMode === 'html') {
      reactRoot.render(null)
      const html = await formatHTML(renderHTML(doc))
      if (updateID === outputUpdateID && outputMode === 'html') {
        textOutputElement.textContent = html
      }
    } else if (outputMode === 'markdown') {
      textOutputElement.textContent = renderMarkdown(doc)
      reactRoot.render(null)
    } else {
      textOutputElement.textContent = ''
      reactRoot.render(renderReact(doc))
    }
  }

  function setOutputMode(nextMode: OutputMode) {
    outputMode = nextMode
    for (const tab of outputTabs) {
      const isActive = tab.dataset.outputMode === nextMode
      tab.classList.toggle('active', isActive)
      tab.setAttribute('aria-pressed', String(isActive))
    }
    void updateOutput()
  }

  editor.mount(editorRoot)
  for (const tab of outputTabs) {
    tab.addEventListener('click', () => {
      const nextMode = tab.dataset.outputMode
      if (
        nextMode === 'html'
        || nextMode === 'markdown'
        || nextMode === 'react'
      ) {
        setOutputMode(nextMode)
      }
    })
  }
  void updateOutput()
  editorRoot.addEventListener('input', () => void updateOutput())
  editorRoot.addEventListener('keyup', () => void updateOutput())
  editorRoot.addEventListener('mouseup', () => void updateOutput())
}

try {
  start()
} catch (error) {
  editorRoot.textContent = 'Failed to start the demo. See console for details.'
  throw error
}
