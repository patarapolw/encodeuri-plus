/**
 * First 32 characters are control characters
 */
export const ASCII = Array.from({ length: 128 - 32 }, (_, i) => i).map(
  (_, i) => {
    i += 32
    return String.fromCharCode(i)
  }
)

export const RESERVED = ';,/?:@&=+$'.split('')
export const UNRESERVED = ASCII.filter((c) => /[A-Za-z0-9-_.~]/.test(c))
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
