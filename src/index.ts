import { PercentEncoder } from './encoder'
import { NON_ASCII } from './range'
import { escapeRegExp } from './util'

export const URL_CONSTRUCTOR_UNSAFE = {
  data: {
    pathname: {
      destroyed: ' #.?',
      encoded: '"<>`{}',
      error: '/\\',
    },
    key: {
      destroyed: '#&+=',
    },
    value: {
      destroyed: ' #&+',
    },
    hash: {
      destroyed: ' ',
      encoded: '"<>`',
    },
    notEncoded: '.',
  },
  get(key: 'pathname' | 'key' | 'value' | 'hash') {
    return Object.values(this.data[key]).join('').split('')
  },
}

export interface IEncodeOptions {
  /**
   * Do not encode non-ASCII
   *
   * @default true
   */
  allowNonAscii?: boolean
  /**
   * Do not encode
   */
  keep?: (string | RegExp)[]
  /**
   * forceEncode with `encodeAlways` function
   */
  forceEncode?: (string | RegExp)[]
  /**
   * Throw error if matches
   */
  throws?: (string | RegExp)[]
  /**
   * `encodeURI` is required to make RESERVED set work by default.
   *
   * However, it is enhanced with `forceEncode`
   *
   * @default encodeURI
   */
  encoder?: (s: string) => string
  /**
   * Set to `false` to disable error
   */
  onError?: boolean | ((e: Error) => any)
}

export interface IDecodeOptions {
  /**
   * Decoder with always run on URI Components, which decodes all percent encoded
   *
   * `decodeURI` will not decode these, `#$&+,/:;=?@`
   *
   * @default decodeURIComponent
   */
  decoder?: (s: string) => string
  /**
   * if `true`, it will attempt to use `decodeURI` first.
   *
   * Set to `"inherit"` to use `decoder`
   *
   * @default false
   */
  decodeBaseUrl?: boolean | 'inherit' | ((s: string) => string)
  /**
   * In particular, `%`
   *
   * Set to `false` to disable error
   */
  onError?: boolean | ((e: Error) => any)
}

/**
 * '/', '\\', '.' are encoded, but you may wish for it to throw instead.
 * @see https://stackoverflow.com/questions/3856693/a-url-resource-that-is-a-dot-2e
 * @see https://stackoverflow.com/questions/3235219/urlencoded-forward-slash-is-breaking-url
 *
 * As far as as I have tested, '.' and '..', even encoded version always throw an error.
 *
 * But not '...'
 */
export function encodePath(s: string, opts: IEncodeOptions = {}) {
  const { forceEncode = [], throws = [], ...remaining } = opts
  const { encoder } = remaining
  if (!encoder || [encodeURI, encodeURIComponent].includes(encoder)) {
    throws.push(/^\.{1,2}$/)
  }

  return encode(s, {
    ...remaining,
    forceEncode: [...forceEncode, ...URL_CONSTRUCTOR_UNSAFE.get('pathname')],
    throws,
  })
}

export function encodeQueryKey(s: string, opts: IEncodeOptions = {}) {
  const { forceEncode = [], ...remaining } = opts
  return encode(s, {
    ...remaining,
    forceEncode: [...forceEncode, ...URL_CONSTRUCTOR_UNSAFE.get('key')],
  })
}

/**
 * You might also want to disallow '=', if that makes your parsing harder.
 */
export function encodeQueryValue(s: string, opts: IEncodeOptions = {}) {
  const { forceEncode = [], ...remaining } = opts
  return encode(s, {
    ...remaining,
    forceEncode: [...forceEncode, ...URL_CONSTRUCTOR_UNSAFE.get('value')],
  })
}

export function encodeHash(s: string, opts: IEncodeOptions = {}) {
  const { forceEncode = [], ...remaining } = opts
  return encode(s, {
    ...remaining,
    forceEncode: [...forceEncode, ...URL_CONSTRUCTOR_UNSAFE.get('hash')],
  })
}

export function encode(s: string, opts: IEncodeOptions = {}) {
  const {
    allowNonAscii = true,
    keep = [],
    forceEncode = [],
    throws = [],
    encoder = encodeURI,
  } = opts

  const onError =
    typeof opts.onError === 'function'
      ? opts.onError
      : opts.onError === false
      ? (_: Error) => null
      : (e: Error) => {
          throw e
        }

  if (throws.some((t) => s.match(t))) {
    onError(new Error(`${s} is not allowed.`))
  }

  if (allowNonAscii) {
    keep.push(NON_ASCII)
  }

  interface ISegment {
    raw: string
    doEncode?: boolean
    result?: string
  }

  let segments: ISegment[] = [{ raw: s }]

  ;(() => {
    const splitter = (re: RegExp) => {
      segments = segments.flatMap((seg) => {
        return seg.raw.split(re).map((s) => {
          return {
            raw: s,
            doEncode: !re.test(s),
          }
        })
      })
    }

    const regexParts: string[] = []
    for (const re of keep
      .filter((s) => {
        if (typeof s === 'string') {
          regexParts.push(s)
          return false
        }

        return true
      })
      .map((el) => el as RegExp)) {
      splitter(new RegExp(`(${re.source})`, re.flags))
    }

    if (regexParts.length) {
      splitter(new RegExp(`(${regexParts.map(escapeRegExp).join('|')})`, 'g'))
    }
  })()
  ;(() => {
    const splitter = (re: RegExp) => {
      segments = segments.flatMap((seg) => {
        if (seg.doEncode === false) {
          return [seg]
        }

        return seg.raw.split(re).map((s) => {
          return {
            raw: s,
            result: re.test(s) ? PercentEncoder.encodeAlways(s) : undefined,
          }
        })
      })
    }

    const regexParts: string[] = []
    for (const re of forceEncode
      .filter((s) => {
        if (typeof s === 'string') {
          regexParts.push(s)
          return false
        }

        return true
      })
      .map((el) => el as RegExp)) {
      splitter(new RegExp(`(${re.source})`, re.flags))
    }

    if (regexParts.length) {
      splitter(new RegExp(`(${regexParts.map(escapeRegExp).join('|')})`, 'g'))
    }
  })()

  return segments
    .map(({ raw, doEncode, result }) => {
      if (typeof result === 'string') {
        return result
      }

      if (doEncode === false) {
        return raw
      }

      return encoder(raw)
    })
    .join('')
}

export interface IURLParts {
  base?: string
  segments?: string[]
  query?: Record<string, string | string[]>
  hash?: string
}

export function makeUrl(urlParts: IURLParts, opts: IEncodeOptions = {}) {
  const { base = '', segments = [], query = {}, hash } = urlParts

  let u = '/'
  u += segments.map((s) => encodePath(s, opts)).join('/')

  if (Object.keys(query).length) {
    u +=
      '?' +
      Object.entries(query)
        .map(([k, vs]) => {
          vs = Array.isArray(vs) ? vs : [vs]

          const encodedKey = encodeQueryKey(k, opts)
          return vs
            .map((v) => `${encodedKey}=${encodeQueryValue(v, opts)}`)
            .join('&')
        })
        .join('&')
  }

  if (typeof hash === 'string') {
    u += '#' + encodeHash(hash, opts)
  }

  return (base.endsWith('/') ? base.slice(0, -1) : base) + u
}

export function parseUrl(s: string, opts: IDecodeOptions = {}): IURLParts {
  const onError =
    typeof opts.onError === 'function'
      ? opts.onError
      : opts.onError === false
      ? (_: Error) => null
      : (e: Error) => {
          throw e
        }

  let decoder = opts.decoder || decodeURIComponent

  let decodeBaseUrl =
    typeof opts.decodeBaseUrl === 'function'
      ? opts.decodeBaseUrl
      : opts.decodeBaseUrl === 'inherit'
      ? decoder
      : opts.decodeBaseUrl
      ? decodeURI
      : (s: string) => s

  if (onError) {
    const _decoder = decoder
    decoder = (s) => {
      try {
        return _decoder(s)
      } catch (e) {
        onError(e)
      }
      return s
    }

    const _decodeBaseUrl = decodeBaseUrl
    decodeBaseUrl = (s) => {
      try {
        return _decodeBaseUrl(s)
      } catch (e) {
        onError(e)
      }
      return s
    }
  }

  const URL =
    typeof window !== 'undefined'
      ? window.URL
      : (require('url').URL as typeof globalThis.URL)

  const dummyBaseURL = `https://${Math.random().toString(36)}`
  const url = new URL(s, dummyBaseURL)
  const query: Record<string, string | string[]> = ((
    qs: Record<string, string | string[]>
  ) => {
    for (const [k, v] of Array.from(url.searchParams)) {
      const prev = qs[k]

      if (Array.isArray(prev)) {
        prev.push(v)
      } else if (typeof prev === 'string') {
        qs[k] = [prev, v]
      } else {
        qs[k] = v
      }
    }

    return qs
  })({})

  const segments = url.pathname
    .split('/')
    .filter((el) => el)
    .map((el) => decoder(el))
  const hash = decoder(url.hash.replace(/^#/, ''))

  const output: IURLParts = {
    base: url.origin !== dummyBaseURL ? decodeBaseUrl(url.origin) : undefined,
    segments: segments.length ? segments : undefined,
    query: Object.keys(query).length ? query : undefined,
    hash: hash || undefined,
  }

  return Object.assign(JSON.parse(JSON.stringify(output)), { url })
}
