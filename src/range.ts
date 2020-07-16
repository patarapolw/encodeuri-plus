export const RESERVED = ';,/?:@&=+$'.split('')
export const UNRESERVED = /[A-Za-z0-9-_.~]/
// eslint-disable-next-line no-control-regex
export const NON_ASCII = /[^\x00-\x7F]/
