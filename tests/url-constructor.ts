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
          let cs: string = it[status] || ''
          if (status === 'encoded' && current[type] === 'encoded') {
            cs += current.c
          } else if (status === 'destroyed' && current[type] === false) {
            cs += current.c
          } else if (status === 'error' && current[type] instanceof Error) {
            cs += current.c
          }

          if (cs.length) {
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
        error?: string
      }
    >
  )

const notEncoded = Object.values(urlConstructorStatus)
  .reduce(
    (prev, { destroyed = '', error = '' }) => [...prev, ...destroyed, ...error],
    [] as string[]
  )
  .filter((c, i, arr) => arr.indexOf(c) === i)
  .filter((c) => {
    return encodeURIComponent(c) === c
  })
  .join('')

fs.writeFileSync(
  'tests/url-constructor.out.json',
  JSON.stringify(Object.assign(urlConstructorStatus, { notEncoded }), null, 2)
)
