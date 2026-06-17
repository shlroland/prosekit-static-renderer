import type { NodeJSON } from '@prosekit/core'
import type { ProseMirrorNode } from '@prosekit/pm/model'
import { Fragment, h, type VNode } from 'vue'

import { createRenderer } from './renderer.ts'
import {
  filterStaticAttrs,
  stringifyStaticAttrValue,
  unsupportedDOMOutputSpecError,
} from './shared/attrs.ts'
import type {
  CustomMappingOptions,
  DOMOutputSpecArray,
  DomOutputSpecToElement,
  StaticRendererCreateOptions,
  StaticRendererOptions,
  StaticRendererSchemaOptions,
  StaticRendererSecurityOptions,
  URLSanitizer,
  URLSanitizerContext,
} from './types.ts'

export type {
  CustomMappingOptions,
  StaticRendererCreateOptions,
  StaticRendererOptions,
  StaticRendererSchemaOptions,
  StaticRendererSecurityOptions,
  URLSanitizer,
  URLSanitizerContext,
}

type VueElement = string | VNode

/**
 * Map HTML attribute names to Vue prop names.
 */
function mapAttrsToProps(
  attrs?: Record<string, any>,
  tag = '',
  sanitizeURL?: URLSanitizer,
): Record<string, any> {
  const filteredAttrs = filterStaticAttrs(attrs, {
    tag,
    target: 'vue',
    sanitizeURL,
  })

  if (Object.keys(filteredAttrs).length === 0) {
    return {}
  }

  const result: Record<string, any> = {}

  for (const [name, value] of Object.entries(filteredAttrs)) {
    if (value == null) continue

    if (name === 'class') {
      result.class = stringifyStaticAttrValue(value)
    } else if (name === 'style' && typeof value === 'string') {
      result.style = value
    } else {
      result[name] = stringifyStaticAttrValue(value)
    }
  }

  return result
}

/**
 * Convert a ProseMirror DOMOutputSpec to a Vue VNode renderer.
 */
function createDOMOutputSpecToVueElement(
  options: { sanitizeURL?: URLSanitizer } = {},
): DomOutputSpecToElement<VueElement> {
  const domOutputSpecToVueElement: DomOutputSpecToElement<VueElement> = (
    spec,
  ) => {
    if (typeof spec === 'string') {
      return () => spec
    }

    if (typeof spec === 'object' && spec && 'length' in spec) {
      let [otag, attrs, children, ...rest] = spec as DOMOutputSpecArray
      let tag = otag

      // Handle namespaced tags
      const parts = tag.split(' ')
      if (parts.length > 1) {
        tag = parts[1]
        if (attrs === undefined) {
          attrs = { xmlns: parts[0] }
        } else if (attrs === 0) {
          attrs = { xmlns: parts[0] }
          children = 0
        } else if (typeof attrs === 'object' && !Array.isArray(attrs)) {
          attrs = { ...attrs, xmlns: parts[0] }
        }
      }

      // Self-closing tag
      if (attrs === undefined) {
        return () =>
          h(tag, mapAttrsToProps(undefined, tag, options.sanitizeURL))
      }

      // No attributes, content placeholder is 0
      if (attrs === 0) {
        return (child) =>
          h(tag, mapAttrsToProps(undefined, tag, options.sanitizeURL), child)
      }

      // Object attrs
      if (typeof attrs === 'object') {
        // attrs is actually an array (child element spec)
        if (Array.isArray(attrs)) {
          const renderChild = domOutputSpecToVueElement(
            attrs as DOMOutputSpecArray,
          )

          if (children === undefined) {
            return (child) =>
              h(
                tag,
                mapAttrsToProps(undefined, tag, options.sanitizeURL),
                renderChild(child),
              )
          }
          if (children === 0) {
            return (child) =>
              h(
                tag,
                mapAttrsToProps(undefined, tag, options.sanitizeURL),
                renderChild(child),
              )
          }
          return (child) =>
            h(tag, mapAttrsToProps(undefined, tag, options.sanitizeURL), [
              renderChild(child),
              ...[children]
                .concat(rest)
                .map((s) => domOutputSpecToVueElement(s)(child)),
            ])
        }

        // attrs is an attributes object
        if (children === undefined) {
          return () => h(tag, mapAttrsToProps(attrs, tag, options.sanitizeURL))
        }
        if (children === 0) {
          return (child) =>
            h(tag, mapAttrsToProps(attrs, tag, options.sanitizeURL), child)
        }
        return (child) =>
          h(
            tag,
            mapAttrsToProps(attrs, tag, options.sanitizeURL),
            [children]
              .concat(rest)
              .map((s) => domOutputSpecToVueElement(s)(child)),
          )
      }
    }

    throw unsupportedDOMOutputSpecError(spec)
  }
  return domOutputSpecToVueElement
}

/**
 * Create a reusable renderer function that converts ProseMirror document JSON
 * to Vue VNodes. The renderer can be used multiple times with different
 * content, avoiding repeated schema initialization.
 *
 * @example
 * ```ts
 * import { createVueRenderer } from 'prosekit-static-renderer/vue'
 * import { defineExtension } from './my-extension'
 *
 * const render = createVueRenderer({
 *   extension: defineExtension(),
 * })
 *
 * const vnode1 = render({
 *   type: 'doc',
 *   content: [
 *     { type: 'paragraph', content: [{ type: 'text', text: 'Hello' }] },
 *   ],
 * })
 * ```
 */
export function createVueRenderer(
  options: StaticRendererCreateOptions & CustomMappingOptions<VueElement>,
): (content: NodeJSON | ProseMirrorNode) => VueElement {
  return createRenderer<VueElement>({
    ...options,
    domOutputSpecToElement: createDOMOutputSpecToVueElement({
      sanitizeURL: options.sanitizeURL,
    }),
    mapDefinedTypes: {
      doc: ({ children }) => h(Fragment, null, children),
      text: ({ node }) => node.text ?? '',
    },
    nodeMapping: options.nodeMapping,
    markMapping: options.markMapping,
    unhandledNode: options.unhandledNode,
    unhandledMark: options.unhandledMark,
  })
}

/**
 * Render a ProseMirror document JSON to a Vue VNode without creating
 * an editor instance.
 *
 * @example
 * ```ts
 * import { renderToVueElement } from 'prosekit-static-renderer/vue'
 * import { defineExtension } from './my-extension'
 *
 * const vnode = renderToVueElement({
 *   extension: defineExtension(),
 *   content: {
 *     type: 'doc',
 *     content: [
 *       { type: 'paragraph', content: [{ type: 'text', text: 'Hello World' }] },
 *     ],
 *   },
 * })
 * ```
 */
export function renderToVueElement(
  options: StaticRendererOptions & CustomMappingOptions<VueElement>,
): VueElement {
  const render = createVueRenderer(options)

  if (!options.content) {
    throw new Error(
      '[prosekit error]: content is required for renderToVueElement. Use createVueRenderer() if you want to create a reusable renderer.',
    )
  }

  return render(options.content)
}
