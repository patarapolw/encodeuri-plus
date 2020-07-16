import * as all from './src'
const { URLEncoder, ...remaining } = all

Object.assign(URLEncoder, remaining)
Object.assign(window, { EncodeURIPlus: URLEncoder })
