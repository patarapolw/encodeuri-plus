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
   * Do not encode if does not affect URL parser
   */
  minimal?: boolean
  allowed?: string[]
  disallowed?: string[]
  allowedRegex?: RegExp[]
  /**
   * Default is encodeURIComponent
   */
  encoder?: (s: string) => string
}

export function encodePath(s: string, opts: IEncodeOptions = {}) {
  const { minimal, allowedRegex = [], ...remaining } = opts
  return encode(s, {
    ...remaining,
    allowedRegex: minimal
      ? [...allowedRegex, POTENTIALLY_USABLE]
      : allowedRegex,
  })
}

export function encodeQueryKey(s: string, opts: IEncodeOptions = {}) {
  const { minimal, allowedRegex = [], ...remaining } = opts
  return encode(s, {
    ...remaining,
    allowedRegex: minimal
      ? [...allowedRegex, POTENTIALLY_USABLE]
      : allowedRegex,
  })
}

/**
 * You might also want to disallow '=', if that makes your parsing harder.
 */
export function encodeQueryValue(s: string, opts: IEncodeOptions = {}) {
  const {
    minimal,
    allowed = [],
    disallowed = [],
    allowedRegex = [],
    ...remaining
  } = opts
  return encode(s, {
    ...remaining,
    allowed: [...allowed, ...RESERVED],
    disallowed: [...disallowed, '&', '+'],
    allowedRegex: minimal
      ? [...allowedRegex, POTENTIALLY_USABLE]
      : allowedRegex,
  })
}

export function encodeHash(s: string, opts: IEncodeOptions = {}) {
  const { minimal, allowed = [], allowedRegex = [], ...remaining } = opts
  return encode(s, {
    ...remaining,
    allowed: [...allowed, ...RESERVED],
    allowedRegex: minimal
      ? [...allowedRegex, POTENTIALLY_USABLE]
      : allowedRegex,
  })
}

export function encode(s: string, opts: IEncodeOptions = {}) {
  const {
    minimal,
    allowed = [],
    disallowed = [],
    allowedRegex = [],
    encoder,
  } = opts
  if (minimal) {
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
        (allowedSet.has(c) || allowedRegex.some((re) => re.test(c)))
      ) {
        return [c]
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
  u += segments.map((s) => encodePath(s, opts))

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
