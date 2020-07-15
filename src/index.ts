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
   * @default true
   */
  allowNonAscii?: boolean
  allowed?: string[]
  disallowed?: string[]
  allowedRegex?: RegExp[]
  disallowedRegex?: RegExp[]
  throws?: (string | RegExp)[]
  replaceMap?: Record<string, string>
  /**
   * Default is encodeURIComponent
   */
  encoder?: (s: string) => string
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
    encoder,
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

  return cs
    .flatMap((c) => {
      if (
        !disallowedSet.has(c) &&
        !disallowedRegex.some((re) => re.test(c)) &&
        (allowedSet.has(c) || allowedRegex.some((re) => re.test(c)))
      ) {
        return c
      }

      console.log(c, replaceMap)

      if (Object.keys(replaceMap).some((k) => c.includes(k))) {
        return c
          .split('')
          .map((c0) => replaceMap[c0] || (encoder || encodeURIComponent)(c0))
          .join('')
      }

      return (encoder || encodeURIComponent)(c)
    })
    .join('')
}

export function makeUrl(
  urlParams: {
    segments?: string[]
    query?: Record<string, string | string[]>
    hash?: string
  },
  opts: IEncodeOptions = {}
) {
  const { segments = [], query = {}, hash } = urlParams

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

  return u
}

/**
 * @see https://stackoverflow.com/questions/3446170/escape-string-for-use-in-javascript-regex
 * @param s
 */
function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // $& means the whole matched string
}
