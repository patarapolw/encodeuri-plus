import { NON_ASCII, RESERVED } from './range'

export class HTMLEntityEncoder {
  static encodeAlways(s: string) {
    return s
      .split('')
      .map((c) => `&#${c.charCodeAt(0)};`)
      .join('')
  }

  static decodeAlways(s: string) {
    return s.replace(/&#(\d+);/g, (_, p1) => String.fromCharCode(parseInt(p1)))
  }

  public convTable: {
    enc: string
    unenc: string
  }[] = []

  public regexRange: RegExp[] = []

  constructor(opts: {
    range?: (string | RegExp)[]
    reserved?: boolean
    letters?: boolean
    numbers?: boolean
    unreservedSymbols?: boolean
    nonAscii?: boolean
  }) {
    const {
      range = [],
      reserved,
      letters,
      numbers,
      unreservedSymbols,
      nonAscii,
    } = opts

    const strRange: string[] = []
    range.map((el) => {
      if (typeof el === 'string') {
        strRange.push(el)
      } else {
        this.regexRange.push(el)
      }
    })

    if (reserved) {
      strRange.push(...RESERVED)
    }

    if (unreservedSymbols) {
      strRange.push(...'-_.~')
    }

    if (nonAscii) {
      this.regexRange.push(NON_ASCII)
    }

    this.regexRange = this.regexRange.map(
      (re) => new RegExp(`(${re.source})`, re.flags)
    )

    /**
     * First 32 characters are control characters
     */
    Array.from({ length: 128 - 32 }, (_, i) => i).map((_, i) => {
      i += 32
      const unenc = String.fromCharCode(i)

      const isEncode =
        strRange.includes(unenc) ||
        (letters && /A-Z/i.test(unenc)) ||
        (numbers && /0-9/.test(unenc))

      if (isEncode) {
        this.convTable.push({
          unenc,
          enc: HTMLEntityEncoder.encodeAlways(unenc),
        })
      }
    })
  }

  encode(s: string) {
    const convMap = this.convTable.reduce((prev, { enc, unenc }) => {
      prev.set(unenc, enc)
      return prev
    }, new Map<string, string>())

    return s
      .split(new RegExp(`(${Array.from(convMap.keys()).join('|')})`, 'g'))
      .map((c) => {
        if (convMap.get(c)) {
          return convMap.get(c)
        }

        let ps: string[] = []

        for (const re of this.regexRange) {
          ps = ps.flatMap((p) =>
            p.split(re).map((q) => {
              return re.test(q) ? HTMLEntityEncoder.encodeAlways(q) : q
            })
          )
        }

        return ps.join('')
      })
      .join('')
  }

  decode(
    s: string,
    opts: {
      decodeAlways?: boolean
    } = {}
  ) {
    const deconvMap = this.convTable.reduce((prev, { enc, unenc }) => {
      prev.set(enc, unenc)
      return prev
    }, new Map<string, string>())

    return s
      .split(new RegExp(`(${Array.from(deconvMap.keys()).join('|')})`, 'g'))
      .map((c) => {
        return (
          deconvMap.get(c) ||
          (opts.decodeAlways ? HTMLEntityEncoder.decodeAlways(c) : c)
        )
      })
      .join('')
  }
}

export class PercentEncoder {
  static encodeAlways(s: string) {
    return s
      .split('')
      .map((x) => `%${x.charCodeAt(0).toString(16).toUpperCase()}`)
      .join('')
  }

  static decodeAlways(s: string) {
    return s.replace(/%([0-9a-f]+);/gi, (_, p1) =>
      String.fromCharCode(parseInt(p1, 16))
    )
  }
}
