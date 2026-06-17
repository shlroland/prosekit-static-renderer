import type { NodeJSON } from '@prosekit/core'
import type { ProseMirrorNode } from '@prosekit/pm/model'

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
 * A node in the Svelte AST tree.
 * Can be either a string (text content) or an element with tag, props, and children.
 */
export type SvelteASTNode =
  | string
  | {
      tag: string
      props: Record<string, any>
      children: SvelteASTNode[]
    }

/**
 * Map HTML attribute names to Svelte prop names.
 */
function mapAttrsToProps(
  attrs?: Record<string, any>,
  tag = '',
  sanitizeURL?: URLSanitizer,
): Record<string, any> {
  const filteredAttrs = filterStaticAttrs(attrs, {
    tag,
    target: 'svelte',
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
 * Create a Svelte AST element.
 */
function createSvelteElement(
  tag: string,
  props: Record<string, any>,
  ...children: SvelteASTNode[]
): SvelteASTNode {
  return { tag, props, children: children.filter((c) => c != null && c !== '') }
}

function toChildArray(
  child?: SvelteASTNode | SvelteASTNode[],
): SvelteASTNode[] {
  if (child == null) {
    return []
  }
  return Array.isArray(child) ? child : [child]
}

/**
 * Convert a ProseMirror DOMOutputSpec to a Svelte AST node.
 */
function createDOMOutputSpecToSvelteElement(
  options: { sanitizeURL?: URLSanitizer } = {},
): DomOutputSpecToElement<SvelteASTNode> {
  const domOutputSpecToSvelteElement: DomOutputSpecToElement<SvelteASTNode> = (
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
          createSvelteElement(
            tag,
            mapAttrsToProps(undefined, tag, options.sanitizeURL),
          )
      }

      // No attributes, content placeholder is 0
      if (attrs === 0) {
        return (child) =>
          createSvelteElement(
            tag,
            mapAttrsToProps(undefined, tag, options.sanitizeURL),
            ...toChildArray(child),
          )
      }

      // Object attrs
      if (typeof attrs === 'object') {
        // attrs is actually an array (child element spec)
        if (Array.isArray(attrs)) {
          const renderChild = domOutputSpecToSvelteElement(
            attrs as DOMOutputSpecArray,
          )

          if (children === undefined) {
            return (child) =>
              createSvelteElement(
                tag,
                mapAttrsToProps(undefined, tag, options.sanitizeURL),
                renderChild(child),
              )
          }
          if (children === 0) {
            return (child) =>
              createSvelteElement(
                tag,
                mapAttrsToProps(undefined, tag, options.sanitizeURL),
                renderChild(child),
              )
          }
          return (child) =>
            createSvelteElement(
              tag,
              mapAttrsToProps(undefined, tag, options.sanitizeURL),
              renderChild(child),
              ...[children]
                .concat(rest)
                .map((s) => domOutputSpecToSvelteElement(s)(child)),
            )
        }

        // attrs is an attributes object
        if (children === undefined) {
          return () =>
            createSvelteElement(
              tag,
              mapAttrsToProps(attrs, tag, options.sanitizeURL),
            )
        }
        if (children === 0) {
          return (child) =>
            createSvelteElement(
              tag,
              mapAttrsToProps(attrs, tag, options.sanitizeURL),
              ...toChildArray(child),
            )
        }
        return (child) =>
          createSvelteElement(
            tag,
            mapAttrsToProps(attrs, tag, options.sanitizeURL),
            ...[children]
              .concat(rest)
              .map((s) => domOutputSpecToSvelteElement(s)(child)),
          )
      }
    }

    throw unsupportedDOMOutputSpecError(spec)
  }
  return domOutputSpecToSvelteElement
}

/**
 * Create a reusable renderer function that converts ProseMirror document JSON
 * to Svelte AST nodes. The renderer can be used multiple times with different
 * content, avoiding repeated schema initialization.
 *
 * The returned AST nodes can be rendered using the `ProseMirrorRenderer` component.
 *
 * @example
 * ```svelte
 * <script>
 * import { createSvelteRenderer } from 'prosekit-static-renderer/svelte'
 * import { defineExtension } from './extension'
 *
 * const render = createSvelteRenderer({
 *   extension: defineExtension(),
 * })
 *
 * const content = {
 *   type: 'doc',
 *   content: [
 *     { type: 'paragraph', content: [{ type: 'text', text: 'Hello' }] },
 *   ],
 * }
 *
 * const ast = render(content)
 * </script>
 *
 * <ProseMirrorRenderer node={ast} />
 * ```
 */
export function createSvelteRenderer(
  options: StaticRendererCreateOptions & CustomMappingOptions<SvelteASTNode>,
): (content: NodeJSON | ProseMirrorNode) => SvelteASTNode {
  return createRenderer<SvelteASTNode>({
    ...options,
    domOutputSpecToElement: createDOMOutputSpecToSvelteElement({
      sanitizeURL: options.sanitizeURL,
    }),
    mapDefinedTypes: {
      doc: ({ children }) =>
        children.length === 1
          ? children[0]
          : { tag: 'div', props: {}, children },
      text: ({ node }) => node.text ?? '',
    },
    nodeMapping: options.nodeMapping,
    markMapping: options.markMapping,
    unhandledNode: options.unhandledNode,
    unhandledMark: options.unhandledMark,
  })
}

/**
 * Render a ProseMirror document JSON to a Svelte AST node without creating
 * an editor instance.
 *
 * @example
 * ```svelte
 * <script>
 * import { renderToSvelteAST } from 'prosekit-static-renderer/svelte'
 * import { defineExtension } from './extension'
 *
 * const ast = renderToSvelteAST({
 *   extension: defineExtension(),
 *   content: {
 *     type: 'doc',
 *     content: [
 *       { type: 'paragraph', content: [{ type: 'text', text: 'Hello World' }] },
 *     ],
 *   },
 * })
 * </script>
 *
 * <ProseMirrorRenderer node={ast} />
 * ```
 */
export function renderToSvelteAST(
  options: StaticRendererOptions & CustomMappingOptions<SvelteASTNode>,
): SvelteASTNode {
  const render = createSvelteRenderer(options)

  if (!options.content) {
    throw new Error(
      '[prosekit error]: content is required for renderToSvelteAST. Use createSvelteRenderer() if you want to create a reusable renderer.',
    )
  }

  return render(options.content)
}
