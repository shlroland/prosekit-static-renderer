import { defineBasicExtension } from '@prosekit/basic'
import { createEditor, union } from '@prosekit/core'

import {
  createHTMLRenderer,
  createMarkdownRenderer,
} from '../src/index.ts'

const editorElement = document.querySelector<HTMLDivElement>('#editor')
const htmlOutput = document.querySelector<HTMLElement>('#html-output')
const markdownOutput = document.querySelector<HTMLElement>('#markdown-output')

if (!editorElement || !htmlOutput || !markdownOutput) {
  throw new Error('Failed to find demo elements')
}

const editorRoot = editorElement
const htmlOutputElement = htmlOutput
const markdownOutputElement = markdownOutput

function defineEditorExtension() {
  return union(defineBasicExtension())
}

type EditorExtension = ReturnType<typeof defineEditorExtension>

const defaultContent = {
  type: 'doc',
  content: [
    {
      type: 'heading',
      attrs: { level: 1 },
      content: [{ type: 'text', text: 'Static Renderer Demo' }],
    },
    {
      type: 'paragraph',
      content: [
        { type: 'text', text: 'Render ' },
        { type: 'text', marks: [{ type: 'bold' }], text: 'ProseKit JSON' },
        { type: 'text', text: ' without creating another editor instance.' },
      ],
    },
    {
      type: 'paragraph',
      content: [
        {
          type: 'text',
          marks: [{ type: 'link', attrs: { href: 'https://prosekit.dev' } }],
          text: 'Links',
        },
        { type: 'text', text: ', marks, headings, lists, and custom nodes can be rendered statically.' },
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
      attrs: { kind: 'bullet', order: null, checked: false, collapsed: false },
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Markdown string output' }],
        },
      ],
    },
  ],
}

function start() {
  const extension = defineEditorExtension()
  const renderHTML = createHTMLRenderer({ extension })
  const renderMarkdown = createMarkdownRenderer({ extension })
  const editor = createEditor<EditorExtension>({
    extension,
    defaultContent,
  })

  function updateOutput() {
    const doc = editor.getDocJSON()
    htmlOutputElement.textContent = renderHTML(doc)
    markdownOutputElement.textContent = renderMarkdown(doc)
  }

  editor.mount(editorRoot)
  updateOutput()
  editorRoot.addEventListener('input', updateOutput)
  editorRoot.addEventListener('keyup', updateOutput)
  editorRoot.addEventListener('mouseup', updateOutput)
}

try {
  start()
} catch (error) {
  editorRoot.textContent = 'Failed to start the demo. See console for details.'
  throw error
}
