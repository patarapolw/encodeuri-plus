import { NON_ASCII, URL_CONSTRUCTOR_UNSAFE } from './range'
import { deepAssign, escapeRegExp } from './util'

export type URLPartType = 'pathParam' | 'queryKey' | 'queryValue' | 'hash'

export interface IURLParts {
  base?: string
  segments?: string[]
  query?: Record<string, string | string[]>
  hash?: string
}

export interface IURLEncoderOptions {
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
   * fallback with `encodeURIComponent` and `HTMLEntityEncoder.encode`
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

/**
 * @internal
 */
interface ISegment {
  raw: string
  doEncode?: boolean
  result?: string
}

export class URLEncoder {
  constructor(public opts: IURLEncoderOptions = {}) {}

  encode(
    s: string,
    opts: IURLEncoderOptions & {
      type?: URLPartType
    } = {}
  ) {
    const {
      onError: _onError,
      keep = [],
      throws = [],
      forceEncode = [],
      allowNonAscii = true,
      encoder = encodeURI,
    } = deepAssign(opts, this.opts)
    const onError = this._getOnError(_onError)

    if (opts.type === 'pathParam') {
      if (keep && keep.some((k) => '.'.match(k))) {
        throws.push(/^\.{1,2}$/)
      }

      const unsafe = URL_CONSTRUCTOR_UNSAFE.get('pathname').filter(
        (c) => c !== '.'
      )

      forceEncode.push(...unsafe, /^\.{1,2}$/)
    } else if (opts.type === 'queryKey') {
      forceEncode.push(...URL_CONSTRUCTOR_UNSAFE.get('key'))
    } else if (opts.type === 'queryValue') {
      forceEncode.push(...URL_CONSTRUCTOR_UNSAFE.get('value'))
    } else if (opts.type === 'hash') {
      forceEncode.push(...URL_CONSTRUCTOR_UNSAFE.get('hash'))
    }

    if (throws && throws.some((t) => s.match(t))) {
      onError(new Error(`${s} is not allowed.`))
    }

    if (allowNonAscii) {
      keep.push(NON_ASCII)
    }

    let segments: ISegment[] = [{ raw: s }]
    segments = this._parseKeep(segments, keep)
    segments = this._parseForced(segments, forceEncode)

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

  decode(
    s: string,
    opts: {
      type?: URLPartType
    } = {}
  ) {
    const r = decodeURIComponent(s)
    if (
      opts.type === 'pathParam' &&
      !(this.opts.keep && this.opts.keep.some((keep) => '.'.match(keep)))
    ) {
      return r.replace(
        new RegExp(escapeRegExp(HTMLEntityEncoder.encode('.')), 'g'),
        '.'
      )
    }

    return r
  }

  makeUrl(urlParts: IURLParts, opts: IURLEncoderOptions = {}) {
    const { base = '', segments = [], query = {}, hash } = urlParts

    let u = '/'
    u += segments
      .map((s) =>
        this.encode(s, {
          ...opts,
          type: 'pathParam',
        })
      )
      .join('/')

    if (Object.keys(query).length) {
      u +=
        '?' +
        Object.entries(query)
          .map(([k, vs]) => {
            vs = Array.isArray(vs) ? vs : [vs]

            const encodedKey = this.encode(k, {
              ...opts,
              type: 'queryKey',
            })
            return vs
              .map(
                (v) =>
                  `${encodedKey}=${this.encode(v, {
                    ...opts,
                    type: 'queryValue',
                  })}`
              )
              .join('&')
          })
          .join('&')
    }

    if (typeof hash === 'string') {
      u +=
        '#' +
        this.encode(hash, {
          ...opts,
          type: 'hash',
        })
    }

    return (base.endsWith('/') ? base.slice(0, -1) : base) + u
  }

  parseUrl(s: string, opts: IURLEncoderOptions = {}): IURLParts {
    const onError =
      typeof opts.onError === 'function'
        ? opts.onError
        : opts.onError === false
        ? (_: Error) => null
        : (e: Error) => {
            throw e
          }

    const decoderArray: ((s: string, type: URLPartType | null) => string)[] = [
      (s, type) => {
        return type ? decodeURIComponent(s) : decodeURI(s)
      },
    ]

    if (!(this.opts.keep && this.opts.keep.some((keep) => '.'.match(keep)))) {
      decoderArray.push((s, type) => {
        return type === 'pathParam'
          ? s.replace(
              new RegExp(escapeRegExp(HTMLEntityEncoder.encode('.')), 'g'),
              '.'
            )
          : s
      })
    }

    const decoder = (s: string, type: URLPartType | null) => {
      for (const fn of decoderArray) {
        try {
          s = fn(s, type)
        } catch (e) {
          onError(e)
        }
      }
      return s
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
      .map((el) => decoder(el, 'pathParam'))

    const hash = decoder(url.hash.replace(/^#/, ''), 'hash')

    const output: IURLParts = {
      base: url.origin !== dummyBaseURL ? decoder(url.origin, null) : undefined,
      segments: segments.length ? segments : undefined,
      query: Object.keys(query).length ? query : undefined,
      hash: hash || undefined,
    }

    return Object.assign(JSON.parse(JSON.stringify(output)), { url })
  }

  private _getOnError(onError?: IURLEncoderOptions['onError']) {
    return typeof onError === 'function'
      ? onError
      : onError === false
      ? (_: Error) => null
      : (e: Error) => {
          throw e
        }
  }

  private _parseKeep(
    segments: ISegment[],
    keep: IURLEncoderOptions['keep'] = []
  ) {
    const splitter = (re: RegExp) => {
      segments = segments.flatMap((seg) => {
        const m = seg.raw.match(re) || []

        return seg.raw.split(re).flatMap((s, i) => {
          const out: ISegment[] = [{ raw: s }]
          if (m[i]) {
            out.push({
              raw: m[i],
              doEncode: false,
            })
          }

          return out
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
      splitter(re)
    }

    if (regexParts.length) {
      splitter(new RegExp(`(?:${regexParts.map(escapeRegExp).join('|')})`, 'g'))
    }

    return segments
  }

  private _parseForced(
    segments: ISegment[],
    forceEncode: IURLEncoderOptions['forceEncode'] = []
  ) {
    const splitter = (re: RegExp) => {
      segments = segments.flatMap((seg) => {
        if (seg.doEncode === false || typeof seg.result === 'string') {
          return [seg]
        }

        const m = seg.raw.match(re) || []

        return seg.raw.split(re).flatMap((s, i) => {
          const out: ISegment[] = [{ raw: s }]
          if (m[i]) {
            out.push({
              raw: m[i],
              result: ((s: string) => {
                for (const fn of [
                  encodeURIComponent,
                  /**
                   * Yes, double encoded
                   */
                  (s: string) =>
                    encodeURIComponent(HTMLEntityEncoder.encode(s)),
                ]) {
                  const r = fn(s)
                  if (r !== s) {
                    return r
                  }
                }
                return undefined
              })(m[i]),
            })
          }

          return out
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
      splitter(re)
    }

    if (regexParts.length) {
      splitter(new RegExp(`(?:${regexParts.map(escapeRegExp).join('|')})`, 'g'))
    }

    return segments
  }
}

export const HTMLEntityEncoder = {
  encode(s: string) {
    return s
      .split('')
      .map((c) => `&#${c.charCodeAt(0)};`)
      .join('')
  },
  decode(s: string) {
    return s.replace(/&#(\d+);/g, (_, p1) => String.fromCharCode(parseInt(p1)))
  },
}
