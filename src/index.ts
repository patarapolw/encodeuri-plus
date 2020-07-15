export const RESERVED = ';,/?:@&=+$'.split('')
export const UNRESERVED = /[A-Za-z0-9-_.~]/
// eslint-disable-next-line no-control-regex
export const UNSAFE = /[\x00-\x7F #]/
export const POTENTIALLY_USABLE = new RegExp(
  `[^\\x00-\\x7F #${RESERVED.join('')}${UNRESERVED.source
    .substr(1)
    .slice(0, -1)}]`
)

export interface IEncodeOptions {
  /**
   * @default true
   */
  allowUnicode?: boolean
  allowed?: string[]
  disallowed?: string[]
  allowedRegex?: RegExp[]
  disallowedRegex?: RegExp[]
  replaceMap?: Record<string, string>
  /**
   * Default is encodeURIComponent
   */
  encoder?: (s: string) => string
}

export function encodePath(s: string, opts: IEncodeOptions = {}) {
  const {
    allowUnicode = true,
    allowedRegex = [],
    replaceMap = {},
    ...remaining
  } = opts
  return encode(s, {
    ...remaining,
    replaceMap: Object.assign(
      {
        '/': '%2F',
      },
      replaceMap
    ),
    allowedRegex: allowUnicode
      ? [...allowedRegex, POTENTIALLY_USABLE]
      : allowedRegex,
  })
}

export function encodeQueryKey(s: string, opts: IEncodeOptions = {}) {
  const { allowUnicode = true, allowedRegex = [], ...remaining } = opts
  return encode(s, {
    ...remaining,
    allowedRegex: allowUnicode
      ? [...allowedRegex, POTENTIALLY_USABLE]
      : allowedRegex,
  })
}

/**
 * You might also want to disallow '=', if that makes your parsing harder.
 */
export function encodeQueryValue(s: string, opts: IEncodeOptions = {}) {
  const {
    allowUnicode = true,
    allowed = [],
    disallowed = [],
    allowedRegex = [],
    ...remaining
  } = opts
  return encode(s, {
    ...remaining,
    allowed: [...allowed, ...RESERVED],
    disallowed: [...disallowed, '&', '+'],
    allowedRegex: allowUnicode
      ? [...allowedRegex, POTENTIALLY_USABLE]
      : allowedRegex,
  })
}

export function encodeHash(s: string, opts: IEncodeOptions = {}) {
  const {
    allowUnicode = true,
    allowed = [],
    allowedRegex = [],
    ...remaining
  } = opts
  return encode(s, {
    ...remaining,
    allowed: [...allowed, ...RESERVED],
    allowedRegex: allowUnicode
      ? [...allowedRegex, POTENTIALLY_USABLE]
      : allowedRegex,
  })
}

export function encode(s: string, opts: IEncodeOptions = {}) {
  const {
    allowUnicode = true,
    allowed = [],
    disallowed = [],
    allowedRegex = [],
    disallowedRegex = [],
    replaceMap = {},
    encoder,
  } = opts
  if (allowUnicode) {
    allowedRegex.push(POTENTIALLY_USABLE)
  }

  const allowedSet = new Set(allowed)
  const disallowedSet = new Set(disallowed)

  if (disallowed.length) {
    disallowed.map((el) => allowedSet.delete(el))
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
