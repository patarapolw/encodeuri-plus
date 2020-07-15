export const RESERVED = ';,/?:@&=+$'.split('')
export const UNRESERVED = /[A-Za-z0-9-_.~]/
// eslint-disable-next-line no-control-regex
export const NON_ASCII = /[^\x00-\x7F]/

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
  allowed?: string[]
  /**
   * Do not encode
   */
  allowedRegex?: RegExp[]
  /**
   * Do encode, if possible
   */
  disallowed?: string[]
  /**
   * Do encode, if possible
   */
  disallowedRegex?: RegExp[]
  /**
   * Throw error if matches
   */
  throws?: (string | RegExp)[]
  /**
   * Extra replaceMap beyond `encoder`
   */
  replaceMap?: Record<string, string>
  /**
   * @default encodeURIComponent
   */
  encoder?: (s: string) => string
}

export interface IDecodeOptions {
  /**
   * Extra replaceMap beyond decodeURIComponent
   */
  replaceMap?: Record<string, string>
  /**
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
  const {
    disallowed = [],
    allowNonAscii = true,
    allowedRegex = [],
    throws = [],
    ...remaining
  } = opts
  const { encoder } = remaining
  if (!encoder || [encodeURI, encodeURIComponent].includes(encoder)) {
    throws.push(/^\.{1,2}$/)
  }

  return encode(s, {
    ...remaining,
    disallowed: [...disallowed, ...URL_CONSTRUCTOR_UNSAFE.get('pathname')],
    throws,
    allowedRegex: allowNonAscii ? [...allowedRegex, NON_ASCII] : allowedRegex,
  })
}

export function encodeQueryKey(s: string, opts: IEncodeOptions = {}) {
  const {
    disallowed = [],
    allowNonAscii = true,
    allowedRegex = [],
    ...remaining
  } = opts
  return encode(s, {
    ...remaining,
    disallowed: [...disallowed, ...URL_CONSTRUCTOR_UNSAFE.get('key')],
    allowedRegex: allowNonAscii ? [...allowedRegex, NON_ASCII] : allowedRegex,
  })
}

/**
 * You might also want to disallow '=', if that makes your parsing harder.
 */
export function encodeQueryValue(s: string, opts: IEncodeOptions = {}) {
  const {
    allowNonAscii = true,
    allowed = [],
    disallowed = [],
    allowedRegex = [],
    ...remaining
  } = opts
  return encode(s, {
    ...remaining,
    allowed: [...allowed, ...RESERVED],
    disallowed: [...disallowed, ...URL_CONSTRUCTOR_UNSAFE.get('value')],
    allowedRegex: allowNonAscii ? [...allowedRegex, NON_ASCII] : allowedRegex,
  })
}

export function encodeHash(s: string, opts: IEncodeOptions = {}) {
  const {
    allowNonAscii = true,
    allowed = [],
    disallowed = [],
    allowedRegex = [],
    ...remaining
  } = opts
  return encode(s, {
    ...remaining,
    allowed: [...allowed, ...RESERVED],
    disallowed: [...disallowed, ...URL_CONSTRUCTOR_UNSAFE.get('hash')],
    allowedRegex: allowNonAscii ? [...allowedRegex, NON_ASCII] : allowedRegex,
  })
}

export function encode(s: string, opts: IEncodeOptions = {}) {
  const {
    allowNonAscii = true,
    allowed = [],
    disallowed = [],
    allowedRegex = [],
    disallowedRegex = [],
    throws = [],
    replaceMap = {},
    encoder = encodeURIComponent,
  } = opts
  if (allowNonAscii) {
    allowedRegex.push(NON_ASCII)
  }

  const allowedSet = new Set(allowed)
  const disallowedSet = new Set(disallowed)

  if (disallowed.length) {
    disallowed.map((el) => allowedSet.delete(el))
  }

  if (throws.some((t) => s.match(t))) {
    throw new Error(`${s} is not allowed.`)
  }

  let cs: string[] = [s]

  if (allowedSet.size) {
    cs = cs.flatMap((c) => {
      return c.split(
        new RegExp(`(${Array.from(allowedSet).map(escapeRegExp).join('|')})`)
      )
    })
  }

  allowedRegex.map((re) => {
    cs = cs.flatMap((c) => c.split(new RegExp(`(${re.source})`, re.flags)))
  })

  const replaceRegex = Object.keys(replaceMap).length
    ? new RegExp(`(${Object.keys(replaceMap).map(escapeRegExp).join('|')})`)
    : null

  return cs
    .flatMap((c) => {
      if (
        !disallowedSet.has(c) &&
        !disallowedRegex.some((re) => re.test(c)) &&
        (allowedSet.has(c) || allowedRegex.some((re) => re.test(c)))
      ) {
        return c
      }

      if (replaceRegex && Object.keys(replaceMap).some((k) => c.includes(k))) {
        return c.replace(replaceRegex, (c0) => {
          return replaceMap[c0] || encoder(c0)
        })
      }

      return encoder(c)
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
  const {
    replaceMap = {},
    decoder: _decoder = decodeURIComponent,
    decodeBaseUrl: _decodeBaseUrl = false,
  } = opts
  const decoder = Object.keys(replaceMap).length
    ? (s: string) => {
        const replaceRegex = Object.keys(replaceMap).length
          ? new RegExp(
              `(${Object.keys(replaceMap).map(escapeRegExp).join('|')})`
            )
          : null

        if (replaceRegex) {
          return s.replace(replaceRegex, (s0) => {
            return replaceMap[s0] || _decoder(s0)
          })
        }

        return _decoder(s)
      }
    : _decoder
  const decodeBaseUrl = _decodeBaseUrl
    ? _decodeBaseUrl === 'inherit'
      ? decoder
      : typeof _decodeBaseUrl === 'function'
      ? _decodeBaseUrl
      : decodeURI
    : (s: string) => s

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

/**
 * @see https://stackoverflow.com/questions/3446170/escape-string-for-use-in-javascript-regex
 * @param s
 */
function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // $& means the whole matched string
}
