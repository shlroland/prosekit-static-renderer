import { filterStaticAttrs } from '../shared/attrs.ts'
import type { URLSanitizer } from '../types.ts'

const BOOLEAN_PROPS = new Set([
  'allowFullScreen',
  'async',
  'autoFocus',
  'autoPlay',
  'checked',
  'controls',
  'default',
  'defer',
  'disabled',
  'disablePictureInPicture',
  'disableRemotePlayback',
  'formNoValidate',
  'hidden',
  'inert',
  'loop',
  'multiple',
  'muted',
  'noModule',
  'noValidate',
  'open',
  'playsInline',
  'readOnly',
  'required',
  'reversed',
  'scoped',
  'seamless',
  'selected',
])

const ATTR_ALIASES: Record<string, string> = {
  acceptcharset: 'acceptCharset',
  accesskey: 'accessKey',
  allowfullscreen: 'allowFullScreen',
  allowtransparency: 'allowTransparency',
  autocomplete: 'autoComplete',
  autofocus: 'autoFocus',
  autoplay: 'autoPlay',
  cellpadding: 'cellPadding',
  cellspacing: 'cellSpacing',
  charset: 'charSet',
  class: 'className',
  classid: 'classID',
  classname: 'className',
  colspan: 'colSpan',
  contenteditable: 'contentEditable',
  contextmenu: 'contextMenu',
  crossorigin: 'crossOrigin',
  datetime: 'dateTime',
  defaultchecked: 'defaultChecked',
  defaultvalue: 'defaultValue',
  enctype: 'encType',
  enterkeyhint: 'enterKeyHint',
  fetchpriority: 'fetchPriority',
  for: 'htmlFor',
  formmethod: 'formMethod',
  formaction: 'formAction',
  formenctype: 'formEncType',
  formnovalidate: 'formNoValidate',
  formtarget: 'formTarget',
  frameborder: 'frameBorder',
  hreflang: 'hrefLang',
  htmlfor: 'htmlFor',
  httpequiv: 'httpEquiv',
  inputmode: 'inputMode',
  itemid: 'itemID',
  itemprop: 'itemProp',
  itemref: 'itemRef',
  itemscope: 'itemScope',
  itemtype: 'itemType',
  maxlength: 'maxLength',
  minlength: 'minLength',
  nomodule: 'noModule',
  novalidate: 'noValidate',
  playsinline: 'playsInline',
  readonly: 'readOnly',
  referrerpolicy: 'referrerPolicy',
  rowspan: 'rowSpan',
  spellcheck: 'spellCheck',
  srcdoc: 'srcDoc',
  srclang: 'srcLang',
  srcset: 'srcSet',
  tabindex: 'tabIndex',
  usemap: 'useMap',

  accentheight: 'accentHeight',
  'accent-height': 'accentHeight',
  alignmentbaseline: 'alignmentBaseline',
  'alignment-baseline': 'alignmentBaseline',
  arabicform: 'arabicForm',
  'arabic-form': 'arabicForm',
  baselineshift: 'baselineShift',
  'baseline-shift': 'baselineShift',
  capheight: 'capHeight',
  'cap-height': 'capHeight',
  clippath: 'clipPath',
  'clip-path': 'clipPath',
  clippathunits: 'clipPathUnits',
  cliprule: 'clipRule',
  'clip-rule': 'clipRule',
  colorinterpolation: 'colorInterpolation',
  'color-interpolation': 'colorInterpolation',
  colorinterpolationfilters: 'colorInterpolationFilters',
  'color-interpolation-filters': 'colorInterpolationFilters',
  colorprofile: 'colorProfile',
  'color-profile': 'colorProfile',
  colorrendering: 'colorRendering',
  'color-rendering': 'colorRendering',
  dominantbaseline: 'dominantBaseline',
  'dominant-baseline': 'dominantBaseline',
  enablebackground: 'enableBackground',
  'enable-background': 'enableBackground',
  fillopacity: 'fillOpacity',
  'fill-opacity': 'fillOpacity',
  fillrule: 'fillRule',
  'fill-rule': 'fillRule',
  floodcolor: 'floodColor',
  'flood-color': 'floodColor',
  floodopacity: 'floodOpacity',
  'flood-opacity': 'floodOpacity',
  fontfamily: 'fontFamily',
  'font-family': 'fontFamily',
  fontsize: 'fontSize',
  'font-size': 'fontSize',
  fontsizeadjust: 'fontSizeAdjust',
  'font-size-adjust': 'fontSizeAdjust',
  fontstretch: 'fontStretch',
  'font-stretch': 'fontStretch',
  fontstyle: 'fontStyle',
  'font-style': 'fontStyle',
  fontvariant: 'fontVariant',
  'font-variant': 'fontVariant',
  fontweight: 'fontWeight',
  'font-weight': 'fontWeight',
  glyphname: 'glyphName',
  'glyph-name': 'glyphName',
  glyphorientationhorizontal: 'glyphOrientationHorizontal',
  'glyph-orientation-horizontal': 'glyphOrientationHorizontal',
  glyphorientationvertical: 'glyphOrientationVertical',
  'glyph-orientation-vertical': 'glyphOrientationVertical',
  horizadvx: 'horizAdvX',
  'horiz-adv-x': 'horizAdvX',
  horizoriginx: 'horizOriginX',
  'horiz-origin-x': 'horizOriginX',
  imagerendering: 'imageRendering',
  'image-rendering': 'imageRendering',
  letterspacing: 'letterSpacing',
  'letter-spacing': 'letterSpacing',
  lightingcolor: 'lightingColor',
  'lighting-color': 'lightingColor',
  markerend: 'markerEnd',
  'marker-end': 'markerEnd',
  markermid: 'markerMid',
  'marker-mid': 'markerMid',
  markerstart: 'markerStart',
  'marker-start': 'markerStart',
  maskcontentunits: 'maskContentUnits',
  maskunits: 'maskUnits',
  overlineposition: 'overlinePosition',
  'overline-position': 'overlinePosition',
  overlinethickness: 'overlineThickness',
  'overline-thickness': 'overlineThickness',
  paintorder: 'paintOrder',
  'paint-order': 'paintOrder',
  pointerevents: 'pointerEvents',
  'pointer-events': 'pointerEvents',
  renderingintent: 'renderingIntent',
  'rendering-intent': 'renderingIntent',
  shaperendering: 'shapeRendering',
  'shape-rendering': 'shapeRendering',
  stopcolor: 'stopColor',
  'stop-color': 'stopColor',
  stopopacity: 'stopOpacity',
  'stop-opacity': 'stopOpacity',
  strikethroughposition: 'strikethroughPosition',
  'strikethrough-position': 'strikethroughPosition',
  strikethroughthickness: 'strikethroughThickness',
  'strikethrough-thickness': 'strikethroughThickness',
  strokeDasharray: 'strokeDasharray',
  strokedasharray: 'strokeDasharray',
  'stroke-dasharray': 'strokeDasharray',
  strokedashoffset: 'strokeDashoffset',
  'stroke-dashoffset': 'strokeDashoffset',
  strokelinecap: 'strokeLinecap',
  'stroke-linecap': 'strokeLinecap',
  strokelinejoin: 'strokeLinejoin',
  'stroke-linejoin': 'strokeLinejoin',
  strokemiterlimit: 'strokeMiterlimit',
  'stroke-miterlimit': 'strokeMiterlimit',
  strokeopacity: 'strokeOpacity',
  'stroke-opacity': 'strokeOpacity',
  strokewidth: 'strokeWidth',
  'stroke-width': 'strokeWidth',
  textanchor: 'textAnchor',
  'text-anchor': 'textAnchor',
  textdecoration: 'textDecoration',
  'text-decoration': 'textDecoration',
  textlength: 'textLength',
  'text-rendering': 'textRendering',
  textrendering: 'textRendering',
  underlineposition: 'underlinePosition',
  'underline-position': 'underlinePosition',
  underlinethickness: 'underlineThickness',
  'underline-thickness': 'underlineThickness',
  unicodebidi: 'unicodeBidi',
  'unicode-bidi': 'unicodeBidi',
  unicodeRange: 'unicodeRange',
  'unicode-range': 'unicodeRange',
  unitsperem: 'unitsPerEm',
  'units-per-em': 'unitsPerEm',
  vectorEffect: 'vectorEffect',
  'vector-effect': 'vectorEffect',
  vertadvy: 'vertAdvY',
  'vert-adv-y': 'vertAdvY',
  vertoriginx: 'vertOriginX',
  'vert-origin-x': 'vertOriginX',
  vertoriginy: 'vertOriginY',
  'vert-origin-y': 'vertOriginY',
  viewbox: 'viewBox',
  viewtarget: 'viewTarget',
  'x-height': 'xHeight',
  xheight: 'xHeight',
  xlinkactuate: 'xlinkActuate',
  'xlink:actuate': 'xlinkActuate',
  xlinkarcrole: 'xlinkArcrole',
  'xlink:arcrole': 'xlinkArcrole',
  xlinkhref: 'xlinkHref',
  'xlink:href': 'xlinkHref',
  xlinkrole: 'xlinkRole',
  'xlink:role': 'xlinkRole',
  xlinkshow: 'xlinkShow',
  'xlink:show': 'xlinkShow',
  xlinktitle: 'xlinkTitle',
  'xlink:title': 'xlinkTitle',
  xlinktype: 'xlinkType',
  'xlink:type': 'xlinkType',
  xmlbase: 'xmlBase',
  'xml:base': 'xmlBase',
  xmllang: 'xmlLang',
  'xml:lang': 'xmlLang',
  xmlnsxlink: 'xmlnsXlink',
  'xmlns:xlink': 'xmlnsXlink',
  xmlspace: 'xmlSpace',
  'xml:space': 'xmlSpace',
}

export interface ReactAttrsOptions {
  tag: string
  key?: string
  sanitizeURL?: URLSanitizer
}

export function mapAttrsToReactProps(
  attrs: Record<string, any> | undefined,
  options: ReactAttrsOptions,
): Record<string, any> {
  const result: Record<string, any> =
    options.key !== undefined ? { key: options.key } : {}
  const filteredAttrs = filterStaticAttrs(attrs, {
    tag: options.tag,
    target: 'react',
    sanitizeURL: options.sanitizeURL,
  })

  for (const [name, value] of Object.entries(filteredAttrs)) {
    const propName = mapAttrName(name)

    if (propName === 'style' && typeof value === 'string') {
      result.style = parseStyle(value)
    } else if (propName === 'defaultChecked' || propName === 'checked') {
      result.defaultChecked = toBoolean(value)
    } else if (propName === 'defaultValue' || propName === 'value') {
      result.defaultValue = String(value)
    } else if (propName === 'contentEditable') {
      result.contentEditable = toBoolean(value)
      result.suppressContentEditableWarning = true
    } else if (propName === 'tabIndex') {
      result.tabIndex = Number(value)
    } else if (BOOLEAN_PROPS.has(propName)) {
      result[propName] = toBoolean(value)
    } else {
      result[propName] = String(value)
    }
  }

  return result
}

function mapAttrName(name: string): string {
  if (/^(?:aria|data)-/.test(name)) {
    return name
  }

  return ATTR_ALIASES[name] ?? ATTR_ALIASES[name.toLowerCase()] ?? name
}

function parseStyle(value: string): Record<string, string> {
  const styleObj: Record<string, string> = {}

  for (const part of value.split(';')) {
    const colonIndex = part.indexOf(':')
    if (colonIndex === -1) continue
    const styleKey = part.slice(0, colonIndex).trim()
    const styleValue = part.slice(colonIndex + 1).trim()
    if (styleKey && styleValue) {
      const camelCaseKey = styleKey.startsWith('--')
        ? styleKey
        : styleKey.replaceAll(/-([a-z])/g, (_, c: string) => c.toUpperCase())
      styleObj[camelCaseKey] = styleValue
    }
  }

  return styleObj
}

function toBoolean(value: unknown): boolean {
  return (
    value === true || value === '' || value === 'true' || value === 'checked'
  )
}
