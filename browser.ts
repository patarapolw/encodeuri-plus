import * as all from './src'
const { encode } = all

Object.assign(encode, all)
Object.assign(window, { encodeURIPlus: encode })
