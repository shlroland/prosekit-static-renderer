import {
  cloneElement,
  createElement,
  type ReactElement,
  type ReactNode,
} from 'react'

import { unsupportedDOMOutputSpecError } from '../shared/attrs.ts'
import type {
  DOMOutputSpecArray,
  DomOutputSpecToElement,
  URLSanitizer,
} from '../types.ts'

import { mapAttrsToReactProps } from './attrs.ts'

interface ReactDomOutputSpecOptions {
  sanitizeURL?: URLSanitizer
}

function addKeyToElement(element: ReactNode, key: number): ReactNode {
  if (
    element &&
    typeof element === 'object' &&
    'type' in element &&
    'props' in element
  ) {
    return cloneElement(element as ReactElement, { key })
  }
  return element
}

export function createDOMOutputSpecToReactElement(
  options: ReactDomOutputSpecOptions = {},
): DomOutputSpecToElement<ReactNode> {
  const domOutputSpecToReactElement: DomOutputSpecToElement<ReactNode> = (
    spec,
  ) => {
    if (typeof spec === 'string') {
      return () => spec
    }

    if (typeof spec === 'object' && spec && 'length' in spec) {
      let [otag, attrs, children, ...rest] = spec as DOMOutputSpecArray
      let tag = otag

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

      if (attrs === undefined) {
        return () =>
          createElement(
            tag,
            mapAttrsToReactProps(undefined, {
              tag,
              sanitizeURL: options.sanitizeURL,
            }),
          )
      }

      if (attrs === 0) {
        return (child) =>
          createElement(
            tag,
            mapAttrsToReactProps(undefined, {
              tag,
              sanitizeURL: options.sanitizeURL,
            }),
            ...(Array.isArray(child) ? child : [child]),
          )
      }

      if (typeof attrs === 'object') {
        if (Array.isArray(attrs)) {
          const renderChild = domOutputSpecToReactElement(
            attrs as DOMOutputSpecArray,
          )

          if (children === undefined) {
            return (child) =>
              createElement(
                tag,
                mapAttrsToReactProps(undefined, {
                  tag,
                  sanitizeURL: options.sanitizeURL,
                }),
                renderChild(child),
              )
          }
          if (children === 0) {
            return (child) =>
              createElement(
                tag,
                mapAttrsToReactProps(undefined, {
                  tag,
                  sanitizeURL: options.sanitizeURL,
                }),
                renderChild(child),
              )
          }
          return (child) => {
            const childElements = [children].concat(rest).map((s, i) => {
              const element = domOutputSpecToReactElement(s)(child)
              return addKeyToElement(element, i)
            })
            return createElement(
              tag,
              mapAttrsToReactProps(undefined, {
                tag,
                sanitizeURL: options.sanitizeURL,
              }),
              renderChild(child),
              ...childElements,
            )
          }
        }

        if (children === undefined) {
          return () =>
            createElement(
              tag,
              mapAttrsToReactProps(attrs, {
                tag,
                sanitizeURL: options.sanitizeURL,
              }),
            )
        }
        if (children === 0) {
          return (child) =>
            createElement(
              tag,
              mapAttrsToReactProps(attrs, {
                tag,
                sanitizeURL: options.sanitizeURL,
              }),
              ...(Array.isArray(child) ? child : [child]),
            )
        }
        return (child) => {
          const childElements = [children].concat(rest).map((s, i) => {
            const element = domOutputSpecToReactElement(s)(child)
            return addKeyToElement(element, i)
          })
          return createElement(
            tag,
            mapAttrsToReactProps(attrs, {
              tag,
              sanitizeURL: options.sanitizeURL,
            }),
            ...childElements,
          )
        }
      }
    }

    throw unsupportedDOMOutputSpecError(spec)
  }
  return domOutputSpecToReactElement
}
