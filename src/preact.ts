import type { NodeJSON } from '@prosekit/core'
import type { ProseMirrorNode } from '@prosekit/pm/model'
import { Fragment, h, type VNode } from 'preact'

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

/**
 * Map HTML attribute names to Preact prop names.
 */
function mapAttrsToProps(
  attrs?: Record<string, any>,
  key?: string,
  tag = '',
  sanitizeURL?: URLSanitizer,
): Record<string, any> {
  const filteredAttrs = filterStaticAttrs(attrs, {
    tag,
    target: 'preact',
    sanitizeURL,
  })

  if (Object.keys(filteredAttrs).length === 0) {
    return key !== undefined ? { key } : {}
  }

  const result: Record<string, any> = key !== undefined ? { key } : {}

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
 * Convert a ProseMirror DOMOutputSpec to a Preact VNode renderer.
 */
function createDOMOutputSpecToPreactElement(
  options: { sanitizeURL?: URLSanitizer } = {},
): DomOutputSpecToElement<VNode<any>> {
  const domOutputSpecToPreactElement: DomOutputSpecToElement<VNode<any>> = (
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
          h(
            tag,
            mapAttrsToProps(undefined, undefined, tag, options.sanitizeURL),
          )
      }

      // No attributes, content placeholder is 0
      if (attrs === 0) {
        return (child) =>
          h(
            tag,
            mapAttrsToProps(undefined, undefined, tag, options.sanitizeURL),
            child,
          )
      }

      // Object attrs
      if (typeof attrs === 'object') {
        // attrs is actually an array (child element spec)
        if (Array.isArray(attrs)) {
          const renderChild = domOutputSpecToPreactElement(
            attrs as DOMOutputSpecArray,
          )

          if (children === undefined) {
            return (child) =>
              h(
                tag,
                mapAttrsToProps(undefined, undefined, tag, options.sanitizeURL),
                renderChild(child),
              )
          }
          if (children === 0) {
            return (child) =>
              h(
                tag,
                mapAttrsToProps(undefined, undefined, tag, options.sanitizeURL),
                renderChild(child),
              )
          }
          return (child) =>
            h(
              tag,
              mapAttrsToProps(undefined, undefined, tag, options.sanitizeURL),
              [
                renderChild(child),
                ...[children]
                  .concat(rest)
                  .map((s) => domOutputSpecToPreactElement(s)(child)),
              ],
            )
        }

        // attrs is an attributes object
        if (children === undefined) {
          return () =>
            h(tag, mapAttrsToProps(attrs, undefined, tag, options.sanitizeURL))
        }
        if (children === 0) {
          return (child) =>
            h(
              tag,
              mapAttrsToProps(attrs, undefined, tag, options.sanitizeURL),
              child,
            )
        }
        return (child) =>
          h(
            tag,
            mapAttrsToProps(attrs, undefined, tag, options.sanitizeURL),
            [children]
              .concat(rest)
              .map((s) => domOutputSpecToPreactElement(s)(child)),
          )
      }
    }

    throw unsupportedDOMOutputSpecError(spec)
  }
  return domOutputSpecToPreactElement
}

/**
 * Create a reusable renderer function that converts ProseMirror document JSON
 * to Preact VNodes. The renderer can be used multiple times with different
 * content, avoiding repeated schema initialization.
 *
 * @example
 * ```tsx
 * import { createPreactRenderer } from 'prosekit-static-renderer/preact'
 * import { defineExtension } from './my-extension'
 *
 * const render = createPreactRenderer({
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
export function createPreactRenderer(
  options: StaticRendererCreateOptions & CustomMappingOptions<VNode>,
): (content: NodeJSON | ProseMirrorNode) => VNode {
  return createRenderer<VNode>({
    ...options,
    domOutputSpecToElement: createDOMOutputSpecToPreactElement({
      sanitizeURL: options.sanitizeURL,
    }),
    mapDefinedTypes: {
      doc: ({ children }) => h(Fragment, null, children),
      text: ({ node }) => h(Fragment, null, node.text),
    },
    nodeMapping: options.nodeMapping,
    markMapping: options.markMapping,
    unhandledNode: options.unhandledNode,
    unhandledMark: options.unhandledMark,
  })
}

/**
 * Render a ProseMirror document JSON to a Preact VNode without creating
 * an editor instance.
 *
 * @example
 * ```tsx
 * import { renderToPreactElement } from 'prosekit-static-renderer/preact'
 * import { defineExtension } from './my-extension'
 *
 * const vnode = renderToPreactElement({
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
export function renderToPreactElement(
  options: StaticRendererOptions & CustomMappingOptions<VNode>,
): VNode {
  const render = createPreactRenderer(options)

  if (!options.content) {
    throw new Error(
      '[prosekit error]: content is required for renderToPreactElement. Use createPreactRenderer() if you want to create a reusable renderer.',
    )
  }

  return render(options.content)
}
