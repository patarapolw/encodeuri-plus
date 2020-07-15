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

  let result = ''
  try {
    result = handler(target.value)
  } catch (e) {
    alert(e.message)
    // throw e
  }
  const output = section.querySelector('code')
  if (output) {
    output.innerText = result
  }

  buildUrl({ label, raw: target.value, result })
}

/**
 *
 * @param {object} [pre={}]
 * @param {string} [pre.label]
 * @param {string} [pre.raw]
 * @param {string} [pre.result]
 */
function buildUrl(pre = {}) {
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
  let errorMessage = ''

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

  document.querySelectorAll('[data-output]').forEach((el) => {
    if (el instanceof HTMLElement) {
      const outputType = el.getAttribute('data-output')

      if (outputType === 'full') {
        el.innerText = u
        return
      }

      if (outputType === 'search') {
        const possible = new Set()

        /**
         * @type {Record<string, string | string[]>}
         */
        const qs = {}

        for (const [k, v] of url.searchParams) {
          if (!isOrphan) {
            if (pre.label === 'url-qs-key' && k) {
              possible.add(k)
            }

            if (pre.label === 'url-qs-value' && v) {
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

        if (possible.size) {
          const decodedValue = decodeURIComponent(pre.result)
          if (decodedValue !== pre.raw || !possible.has(decodedValue)) {
            errorMessage = `Some of the query are mis-parsed: ${pre.result}`
          }
        }

        if (el.tagName === 'CODE') {
          el.innerText = Object.keys(qs).length
            ? JSON.stringify(qs, null, 2)
            : ''
        } else {
          el.innerText = url.search
        }
        return
      }

      if (outputType === 'pathname') {
        const parsedPathname = url.pathname
          .split('/')
          .filter((s) => s)
          .map((s) => decodeURIComponent(s))

        if (pre.label === 'url-segment') {
          const decodedValue = decodeURIComponent(pre.result)
          if (decodedValue !== pre.raw || !parsedPathname.includes(pre.raw)) {
            errorMessage = `Some of URL segments are mis-parsed: ${pre.raw}`
          }
        }

        if (el.tagName === 'CODE') {
          el.innerText = parsedPathname.length
            ? JSON.stringify(parsedPathname)
            : ''
        } else {
          el.innerText = url.pathname
        }
        return
      }

      if (outputType === 'hash') {
        const parsedHash = decodeURIComponent(url.hash.replace(/^#/, ''))

        if (url.hash && pre.label === 'url-hash') {
          const decodedValue = decodeURIComponent(pre.result)
          if (decodedValue !== pre.raw || parsedHash !== pre.raw) {
            alert(`URL hash is mis-parsed: ${pre.raw}`)
          }
        }

        if (el.tagName === 'CODE') {
          el.innerText = parsedHash ? JSON.stringify(parsedHash) : ''
        } else {
          el.innerText = url.hash
        }
      }
    }
  })

  if (errorMessage) {
    alert(errorMessage)
  }
}
