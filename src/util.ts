/**
 * @see https://stackoverflow.com/questions/3446170/escape-string-for-use-in-javascript-regex
 * @param s
 */
export function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // $& means the whole matched string
}

export function deepAssign<T>(dst: T, src: T): T {
  if (src && typeof src === 'object') {
    if (Array.isArray(src)) {
      return src.map((s1, i) =>
        deepAssign(Array.isArray(dst) ? dst[i] : dst, s1)
      ) as any
    } else if ((src as any).constructor === Object) {
      const r = Object.entries(src).reduce(
        (prev, [k, v]) => ({ ...prev, [k]: deepAssign((dst as any)[k], v) }),
        dst as any
      )
      return r
    }
    return src
  } else if (typeof src !== 'undefined') {
    return src
  }
  return dst
}
