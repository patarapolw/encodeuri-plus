import fs from 'fs'

/**
 * First 32 characters are control characters
 */
const cs = Array(128 - 32)
  .fill(null)
  .map((_, i) => {
    i += 32
    return { i, c: String.fromCharCode(i) }
  })

const urlConstructorStatus = cs
  .map((el) => {
    const getPathname = () => {
      try {
        const u = new URL(`/${el.c}`, 'https://www.example.com')
        return u.pathname === `/${el.c}`
          ? 'unencoded'
          : decodeURIComponent(u.pathname) === `/${el.c}`
          ? 'encoded'
          : false
      } catch (e) {
        return e
      }
    }

    const getKey = () => {
      try {
        const u = new URL(`?${el.c}=`, 'https://www.example.com')
        return Array.from(u.searchParams).find(([k]) => k === el.c)
          ? 'unencoded'
          : Array.from(u.searchParams).find(
              ([k]) => decodeURIComponent(k) === el.c
            )
          ? 'encoded'
          : false
      } catch (e) {
        return e
      }
    }

    const getValue = () => {
      try {
        const u = new URL(`?q=${el.c}`, 'https://www.example.com')
        return u.searchParams.get('q') === el.c
          ? 'unencoded'
          : decodeURIComponent(u.searchParams.get('q')!) === el.c
          ? 'encoded'
          : false
      } catch (e) {
        return e
      }
    }

    const getHash = () => {
      try {
        const u = new URL(`#${el.c}`, 'https://www.example.com')
        return u.hash === `#${el.c}`
          ? 'unencoded'
          : decodeURIComponent(u.hash) === `#${el.c}`
          ? 'encoded'
          : false
      } catch (e) {
        return e
      }
    }

    return {
      ...el,
      pathname: getPathname(),
      key: getKey(),
      value: getValue(),
      hash: getHash(),
    }
  })
  .filter(({ pathname, key, value, hash }) =>
    [pathname, key, value, hash].some((el) => el !== 'unencoded')
  )
  .reduce(
    (prev, current: any) => {
      ;['pathname', 'key', 'value', 'hash'].map((type) => {
        const it: any = prev[type] || {}
        ;['encoded', 'destroyed', 'error'].map((status) => {
          let cs = it[status]
          if (status === 'encoded' && current[type] === 'encoded') {
            cs = (cs || '') + current.c
            it[status] = cs
          } else if (status === 'destroyed' && current[type] === false) {
            cs = (cs || '') + current.c
            it[status] = cs
          } else if (status === 'error' && current[type] instanceof Error) {
            const { message } = current[type]
            cs = cs || {}
            cs[message] = (cs[message] || '') + current.c
            it[status] = cs
          }
        })
        prev[type] = it
      })

      return prev
    },
    {} as Record<
      string,
      {
        encoded?: string
        destroyed?: string
        error?: Record<string, string>
      }
    >
  )

const getNotEncoded = (fn: (s: string) => string) => {
  return (
    cs
      .map(({ c }) => c)
      .filter((c) => !/[A-Za-z0-9]/.test(c))
      .filter((c) => {
        return fn(c) === c
      })
      .join('') || undefined
  )
}

const getNotDecoded = (
  decodeFn: (s: string) => string,
  encodeFn: (s: string) => string
) => {
  return (
    cs
      .filter(({ c }) => !/[A-Za-z0-9]/.test(c))
      .filter(({ c }) => {
        const encoded = encodeFn(c)
        return decodeFn(encoded) === encoded
      })
      .map(({ c }) => c)
      .join('') || undefined
  )
}

/**
 * Percent-encoding a reserved character involves converting the character to its corresponding byte value in ASCII and then representing that value as a pair of hexadecimal digits. The digits, preceded by a percent sign (%) which is used as an escape character, are then used in the URI in place of the reserved character. (For a non-ASCII character, it is typically converted to its byte sequence in UTF-8, and then each byte value is represented as above.)
 * @see https://en.wikipedia.org/wiki/Percent-encoding
 */
const encodeAll = (s: string) =>
  s
    .split('')
    .map((x) => `%${x.charCodeAt(0).toString(16).toUpperCase()}`)
    .join('')

fs.writeFileSync(
  'tests/url-constructor.out.json',
  JSON.stringify(
    Object.assign(urlConstructorStatus, {
      notEncoded: {
        encodeURI: getNotEncoded(encodeURI),
        encodeURIComponent: getNotEncoded(encodeURIComponent),
        escape: getNotEncoded(escape),
        encodeAll: getNotEncoded(encodeAll),
      },
      notDecoded: {
        decodeURI: getNotDecoded(decodeURI, encodeAll),
        decodeURIComponent: getNotDecoded(decodeURIComponent, encodeAll),
      },
    }),
    null,
    2
  )
)
