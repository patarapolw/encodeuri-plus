// @ts-check
/* global encodeURIPlus */

const {
  encodePath,
  encodeQueryKey,
  encodeQueryValue,
  encodeHash,
  makeUrl,
  // @ts-ignore
} = encodeURIPlus

const KEYBOARD_EVENT = 'input'

document.querySelectorAll('.repeatable input.key').forEach((el) => {
  el.addEventListener(KEYBOARD_EVENT, repeaterListener)
})

document.querySelectorAll('input[aria-label^="url-"]').forEach((inp) => {
  inp.addEventListener(KEYBOARD_EVENT, encodeListener)
})

buildUrl()

/**
 *
 * @param {KeyboardEvent} evt
 */
function repeaterListener(evt) {
  const { target } = evt

  if (target instanceof HTMLInputElement && target.value) {
    const repeater = target.closest('li')
    const { parentElement } = repeater

    target.removeEventListener(KEYBOARD_EVENT, repeaterListener)

    const clone = repeater.cloneNode(true)
    if (clone instanceof HTMLLIElement) {
      clone.querySelectorAll('input').forEach((inp) => {
        inp.value = ''
        inp.addEventListener(KEYBOARD_EVENT, encodeListener)

        if (inp.classList.contains('key')) {
          inp.addEventListener(KEYBOARD_EVENT, repeaterListener)
        }
      })
      clone.querySelectorAll('.output').forEach((output) => {
        output.textContent = ''
      })
    }
    parentElement.append(clone)
  }
}

/**
 *
 * @param {KeyboardEvent} evt
 */
function encodeListener(evt) {
  const { target } = evt
  if (!(target instanceof HTMLInputElement)) {
    return
  }

  const section = target.closest('.field')
  if (!section) {
    return
  }

  const label = target.getAttribute('aria-label')
  const handler = {
    'url-segment': encodePath,
    'url-qs-key': encodeQueryKey,
    'url-qs-value': encodeQueryValue,
    'url-hash': encodeHash,
  }[label]

  if (!handler) {
    return
  }

  const result = handler(target.value, { minimal: true })
  const output = section.querySelector('code')
  if (output) {
    output.innerText = result
  }

  buildUrl({ label, raw: target.value, result })
}

/**
 *
 * @param {object} [warn={}]
 * @param {string} [warn.label]
 * @param {string} [warn.raw]
 * @param {string} [warn.result]
 */
function buildUrl(warn = {}) {
  const urlParams = {
    segments: [],
    /**
     * @type {Record<string, string | string[]>}
     */
    query: {},
    /**
     * @type {string | undefined}
     */
    hash: undefined,
  }
  let lastQueryKey = ''
  let isQueryKeyLast = false
  let isOrphan = false

  document.querySelectorAll('input[aria-label^="url-"]').forEach((inp) => {
    const currentLabel = inp.getAttribute('aria-label')

    if (inp instanceof HTMLInputElement) {
      if (currentLabel === 'url-qs-value' && inp.value && !isQueryKeyLast) {
        isOrphan = true
        return
      }

      if (currentLabel === 'url-qs-key' && inp.value) {
        isQueryKeyLast = true
        lastQueryKey = inp.value
      } else {
        isQueryKeyLast = false
      }

      const handler = {
        /**
         * @type {(s: string) => void}
         */
        'url-segment': (s) => {
          if (s) {
            urlParams.segments.push(s)
          }
        },
        /**
         * @type {(s: string) => void}
         */
        'url-qs-value': (s) => {
          if (lastQueryKey) {
            const previousValue = urlParams.query[lastQueryKey]
            /**
             * Can also push empty value
             */
            if (previousValue) {
              const queryValueArray = Array.isArray(previousValue)
                ? previousValue
                : [previousValue]
              queryValueArray.push(s)
              urlParams.query[lastQueryKey] = queryValueArray
            } else {
              urlParams.query[lastQueryKey] = s
            }

            /**
             * Clear when used
             */
            lastQueryKey = ''
          }
        },
        /**
         * @type {(s: string) => void}
         */
        'url-hash': (s) => {
          /**
           * Nullify if empty
           */
          urlParams.hash = s || undefined
        },
      }[currentLabel]

      if (handler) {
        handler(inp.value)
      }
    }
  })

  const u = makeUrl(urlParams, { minimal: true })
  const url = new URL(u, 'https://www.example.com')

  document.querySelectorAll('code[data-output]').forEach((code) => {
    if (code instanceof HTMLElement) {
      const outputType = code.getAttribute('data-output')

      if (outputType === 'full') {
        code.innerText = u
        return
      }

      if (outputType === 'qs') {
        const possible = new Set()

        /**
         * @type {Record<string, string | string[]>}
         */
        const qs = {}

        for (const [k, v] of url.searchParams) {
          if (!isOrphan) {
            if (warn.label === 'url-qs-key' && k) {
              possible.add(k)
            }

            if (warn.label === 'url-qs-value' && v) {
              possible.add(v)
            }
          }

          const prev = qs[k]

          if (Array.isArray(prev)) {
            prev.push(v)
          } else if (typeof prev === 'string') {
            qs[k] = [prev, v]
          } else {
            qs[k] = v
          }
        }

        console.log(isOrphan, possible, warn)

        if (possible.size) {
          const decodedValue = decodeURIComponent(warn.result)
          if (decodedValue !== warn.raw || !possible.has(decodedValue)) {
            alert(`Some of the query are mis-parsed: ${warn.result}`)
          }
        }

        code.innerText = Object.keys(qs).length
          ? JSON.stringify(qs, null, 2)
          : ''
        return
      }

      const segment = url[outputType]
      if (typeof segment === 'string') {
        if (outputType === 'hash' && warn.label === 'url-hash' && segment) {
          const decodedValue = decodeURIComponent(warn.result)
          if (decodedValue !== warn.raw || segment !== `#${warn.result}`) {
            alert(`URL hash is mis-parsed: ${decodedValue}`)
          }
        }

        code.innerText = segment
      }
    }
  })
}
