import type { NodeJSON } from '@prosekit/core'
import type { ProseMirrorNode } from '@prosekit/pm/model'
import type { JSX } from 'solid-js'
import { createComponent, Dynamic } from 'solid-js/web'

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

type SolidElement = JSX.Element

/**
 * Map HTML attribute names to Solid prop names.
 */
function mapAttrsToProps(
  attrs?: Record<string, any>,
  tag = '',
  sanitizeURL?: URLSanitizer,
): Record<string, any> {
  const filteredAttrs = filterStaticAttrs(attrs, {
    tag,
    target: 'solid',
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
 * Create a Solid element using `createComponent` and `Dynamic` from `solid-js/web`.
 */
function createSolidElement(
  tag: string,
  props: Record<string, any>,
  ...children: SolidElement[]
): SolidElement {
  return createComponent(Dynamic, {
    component: tag,
    ...props,
    // Solid expects children as a getter so they stay reactive.
    get children() {
      return children
    },
  })
}

/**
 * Convert a ProseMirror DOMOutputSpec to a Solid element renderer.
 */
function createDOMOutputSpecToSolidElement(
  options: { sanitizeURL?: URLSanitizer } = {},
): DomOutputSpecToElement<SolidElement> {
  const domOutputSpecToSolidElement: DomOutputSpecToElement<SolidElement> = (
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
          createSolidElement(
            tag,
            mapAttrsToProps(undefined, tag, options.sanitizeURL),
          )
      }

      // No attributes, content placeholder is 0
      if (attrs === 0) {
        return (child) =>
          createSolidElement(
            tag,
            mapAttrsToProps(undefined, tag, options.sanitizeURL),
            child,
          )
      }

      // Object attrs
      if (typeof attrs === 'object') {
        // attrs is actually an array (child element spec)
        if (Array.isArray(attrs)) {
          const renderChild = domOutputSpecToSolidElement(
            attrs as DOMOutputSpecArray,
          )

          if (children === undefined) {
            return (child) =>
              createSolidElement(
                tag,
                mapAttrsToProps(undefined, tag, options.sanitizeURL),
                renderChild(child),
              )
          }
          if (children === 0) {
            return (child) =>
              createSolidElement(
                tag,
                mapAttrsToProps(undefined, tag, options.sanitizeURL),
                renderChild(child),
              )
          }
          return (child) =>
            createSolidElement(
              tag,
              mapAttrsToProps(undefined, tag, options.sanitizeURL),
              renderChild(child),
              ...[children]
                .concat(rest)
                .map((s) => domOutputSpecToSolidElement(s)(child)),
            )
        }

        // attrs is an attributes object
        if (children === undefined) {
          return () =>
            createSolidElement(
              tag,
              mapAttrsToProps(attrs, tag, options.sanitizeURL),
            )
        }
        if (children === 0) {
          return (child) =>
            createSolidElement(
              tag,
              mapAttrsToProps(attrs, tag, options.sanitizeURL),
              child,
            )
        }
        return (child) =>
          createSolidElement(
            tag,
            mapAttrsToProps(attrs, tag, options.sanitizeURL),
            ...[children]
              .concat(rest)
              .map((s) => domOutputSpecToSolidElement(s)(child)),
          )
      }
    }

    throw unsupportedDOMOutputSpecError(spec)
  }
  return domOutputSpecToSolidElement
}

/**
 * Create a reusable renderer function that converts ProseMirror document JSON
 * to Solid elements. The renderer can be used multiple times with different
 * content, avoiding repeated schema initialization.
 *
 * @example
 * ```tsx
 * import { createSolidRenderer } from 'prosekit-static-renderer/solid'
 * import { defineExtension } from './my-extension'
 *
 * const render = createSolidRenderer({
 *   extension: defineExtension(),
 * })
 *
 * const element1 = render({
 *   type: 'doc',
 *   content: [
 *     { type: 'paragraph', content: [{ type: 'text', text: 'Hello' }] },
 *   ],
 * })
 * ```
 */
export function createSolidRenderer(
  options: StaticRendererCreateOptions & CustomMappingOptions<SolidElement>,
): (content: NodeJSON | ProseMirrorNode) => SolidElement {
  return createRenderer<SolidElement>({
    ...options,
    domOutputSpecToElement: createDOMOutputSpecToSolidElement({
      sanitizeURL: options.sanitizeURL,
    }),
    mapDefinedTypes: {
      doc: ({ children }) => children,
      text: ({ node }) => node.text ?? '',
    },
    nodeMapping: options.nodeMapping,
    markMapping: options.markMapping,
    unhandledNode: options.unhandledNode,
    unhandledMark: options.unhandledMark,
  })
}

/**
 * Render a ProseMirror document JSON to a Solid element without creating
 * an editor instance.
 *
 * @example
 * ```tsx
 * import { renderToSolidElement } from 'prosekit-static-renderer/solid'
 * import { defineExtension } from './my-extension'
 *
 * const element = renderToSolidElement({
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
export function renderToSolidElement(
  options: StaticRendererOptions & CustomMappingOptions<SolidElement>,
): SolidElement {
  const render = createSolidRenderer(options)

  if (!options.content) {
    throw new Error(
      '[prosekit error]: content is required for renderToSolidElement. Use createSolidRenderer() if you want to create a reusable renderer.',
    )
  }

  return render(options.content)
}
