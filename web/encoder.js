/* global rison, base65536, JSURL, msgpack */

const parser = {
  rison: {
    handler: (s) => rison.encode(s),
    link: 'https://github.com/w33ble/rison-node',
  },
  JSURL: {
    handler: (s) => JSURL.stringify(s),
    link: 'https://github.com/Sage/jsurl',
  },
  'msgpack + base65536': {
    handler: (s) => base65536.encode(msgpack.encode(s)),
    link:
      'https://stackoverflow.com/questions/44553061/most-compact-url-encoding-of-json-data/44553626',
  },
  JSON: (s) => JSON.stringify(s),
}

const encoder = {
  // eslint-disable-next-line no-control-regex
  'encodeURI ascii-only': (s) => (/[^\x00-\x7F]/.test(s) ? s : encodeURI(s)),
  encodeURI: (s) => encodeURI(s),
  encodeURIComponent: (s) => encodeURIComponent(s),
}

const options = {
  RESERVED: ';,/?:@&=+$',
  UNRESERVED: '-_.~',
  ENCODED: '"<>`{}',
  NOT_ENCODED: "'!()",
  ERROR: './\\',
  LETTER: 'abcdefghijklmnopqrstuvwxyz',
  UNICODE: 'お早う😺🥳🦄',
  NUMBER: 1234567890,
  WHITESPACE: ' \r\t\n',
  ARRAY: [1, 'a'],
  OBJECT: { a: 1 },
  REGEXP: /[A-Z]/gi,
  DATE: new Date(),
}

const presetEl = document.getElementById('preset')
const qEl = document.getElementById('q')

function parseLang(lang) {
  const v = presetEl.value ? JSON.parse(presetEl.value).v : qEl.value
  const handler = parser[lang].handler || parser[lang]
  const result = handler(v)

  document.querySelector(`section[data-lang="${lang}"] code`).innerText = result

  Object.entries(encoder).map(([k, fn]) => {
    document.querySelector(
      `section[data-lang="${lang}"] [data-encode="${k}"]`
    ).innerText = fn(result)
  })
}

function onChange() {
  document.querySelectorAll('.notice').forEach((el) => {
    el.style.display =
      presetEl.value &&
      el.getAttribute('data-key') === JSON.parse(presetEl.value).k
        ? 'block'
        : 'none'
  })

  qEl.style.display = presetEl.value ? 'none' : 'block'
  Object.keys(parser).map(parseLang)
}

function stringify(a) {
  if (typeof a === 'object') {
    if (a instanceof RegExp) {
      return a + ''
    }
    return JSON.stringify(a)
  }
  return a + ''
}

function buildPage() {
  Object.entries(options).map(([k, v]) => {
    const optEl = document.createElement('option')
    optEl.value = JSON.stringify({ k, v })
    optEl.innerText = `${stringify(v)} (${k})`

    optEl.defaultSelected = k === 'ERROR'

    presetEl.appendChild(optEl)
  })

  const optEl = document.createElement('option')
  optEl.value = ''
  optEl.innerText = 'Custom'

  presetEl.appendChild(optEl)

  const articleEl = document.querySelector('article')

  Object.entries(parser).map(([p, { link }]) => {
    const clone = document.querySelector('template').content.cloneNode(true)

    clone.querySelector('section').setAttribute('data-lang', p)

    if (link) {
      const aEl = clone.querySelector('h2 a')
      aEl.href = link
      aEl.innerText = p
    } else {
      clone.querySelector('h2 span').innerText = p
    }

    const ulEl = clone.querySelector('ul')
    Object.keys(encoder).map((enc) => {
      const li = clone.querySelector('template').content.cloneNode(true)

      li.querySelector('p').innerText = enc
      li.querySelector('code').setAttribute('data-encode', enc)

      ulEl.appendChild(li)
    })

    articleEl.appendChild(clone)
  })

  presetEl.addEventListener('input', () => {
    onChange()
  })

  qEl.addEventListener('input', () => {
    onChange()
  })

  onChange()
}

buildPage()
