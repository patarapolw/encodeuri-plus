// @ts-nocheck
import * as base65536 from 'base65536'
import yaml from 'js-yaml'
import jsurl from 'jsurl'
import rison from 'rison-node'

const encoder = {
  JSON: {
    encode: JSON.stringify,
    decode: JSON.parse,
  },
  yaml: {
    encode: yaml.safeDump,
    decode: yaml.safeLoad,
  },
  jsurl: {
    encode: jsurl.stringify,
    decode: jsurl.parse,
  },
  rison: {
    encode: rison.encode,
    decode: rison.decode,
  },
  base65536: {
    encode: base65536.encode,
    decode: base65536.decode,
  },
}

const param = '.'

for (const [k, { encode, decode }] of Object.entries(encoder)) {
  const u1 = new URL(`/${encodeURIComponent(encode(param))}`, 'https://.')
  const u2 = new URL('https://.')
  u2.pathname = `/${encodeURIComponent(encode(param))}`

  console.log(k)

  console.log(u1.pathname)
  try {
    console.log(decode(decodeURIComponent(u1.pathname.substr(1))) === param)
  } catch (e) {
    console.error(e)
  }

  console.log(u2.pathname)
  try {
    console.log(decode(decodeURIComponent(u2.pathname.substr(1))) === param)
    console.log(decodeURIComponent('%E1%94%80'))
  } catch (e) {
    console.error(e)
  }
}
