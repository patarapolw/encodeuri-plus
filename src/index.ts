/**
 * For the discussion, see
 * @see https://dev.to/patarapolw/encodeuri-vs-encodeuricomponent-vs-something-inbetween-2hg7
 */
export const allowedList = {
  qsValue: ';,/?:+$'.split(''),
  hash: ';,/?:+$#'.split(''),
  reserved: ';,/?:@&=+$'.split(''),
  numberSign: ['#'],
  space: [' '],
  general: ';,:+$'.split(''),
}

export interface IEncodeOptions {
  allowed?: string[]
  disallowed?: string[]
  allowedRegex?: RegExp[]
  encoder?: (s: string) => string
}

export function encodePath(s: string, opts: IEncodeOptions = {}) {
  return encode(s, opts)
}

export function encodeQueryKey(s: string, opts: IEncodeOptions = {}) {
  return encode(s, opts)
}

export function encodeQueryValue(s: string, opts: IEncodeOptions = {}) {
  const { allowed = [] } = opts
  return encode(s, {
    ...opts,
    allowed: [...allowed, ...allowedList.qsValue],
  })
}

export function encodeHash(s: string, opts: IEncodeOptions = {}) {
  const { allowed = [] } = opts
  return encode(s, {
    ...opts,
    allowed: [...allowed, ...allowedList.qsValue],
  })
}

export function encode(s: string, opts: IEncodeOptions = {}) {
  const { allowed = [], disallowed = [], allowedRegex = [], encoder } = opts
  const allowedSet = new Set(allowed)

  if (disallowed.length) {
    disallowed.map((el) => allowedSet.delete(el))
  }

  let cs: string[] = [s]

  if (allowedSet.size) {
    cs = cs.flatMap((c) => {
      return c.split(
        new RegExp(`(${[...allowedSet].map(escapeRegExp).join('|')})`)
      )
    })
  }

  allowedRegex.map((re) => {
    cs = cs.flatMap((c) => c.split(new RegExp(`(${re.source})`, re.flags)))
  })

  return cs
    .flatMap((c) => {
      if (allowedSet.has(c) || allowedRegex.some((re) => re.test(c))) {
        return [c]
      }
      return (encoder || encodeURIComponent)(c)
    })
    .join('')
}

/**
 * @see https://stackoverflow.com/questions/3446170/escape-string-for-use-in-javascript-regex
 * @param s
 */
function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // $& means the whole matched string
}
