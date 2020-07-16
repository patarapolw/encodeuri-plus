/**
 * @see https://stackoverflow.com/questions/3446170/escape-string-for-use-in-javascript-regex
 * @param s
 */
export function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // $& means the whole matched string
}
