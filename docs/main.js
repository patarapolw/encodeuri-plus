// @ts-check
/* global encodeURIPlus */

const {
  encodePath,
  encodeQueryKey,
  encodeQueryValue,
  encodeHash,
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

  const section = target.closest('section')
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

  const result = handler(target.value)

  const output = section.querySelector('code')
  if (output) {
    output.innerText = result
  }

  buildUrl()
}

function buildUrl() {
  let u = ''
  let isQueryStarted = false

  document.querySelectorAll('input[aria-label^="url-"]').forEach((inp) => {
    const currentLabel = inp.getAttribute('aria-label')

    if (inp instanceof HTMLInputElement) {
      const section = inp.closest('section')
      if (!section) {
        return
      }

      const output = section.querySelector('code')
      if (output && output.innerText) {
        const prefix =
          {
            'url-qs-key': isQueryStarted ? '&' : '?',
            'url-segment': '/',
            'url-hash': '#',
          }[currentLabel] || ''

        const postfix =
          {
            'url-qs-key': '=',
          }[currentLabel] || ''

        u += prefix + output.innerText + postfix

        if (currentLabel === 'url-qs-key') {
          isQueryStarted = true
        }
      }
    }
  })

  if (u[0] !== '/') {
    u = '/' + u
  }

  const url = new URL(u, 'https://www.example.com')

  document.querySelectorAll('code[data-output]').forEach((code) => {
    if (code instanceof HTMLElement) {
      const outputType = code.getAttribute('data-output')

      if (outputType === 'full') {
        code.innerText = u
        return
      }

      if (outputType === 'qs') {
        /**
         * @type {Record<string, string | string[]>}
         */
        const qs = {}

        for (const [k, v] of url.searchParams) {
          const prev = qs[k]

          if (Array.isArray(prev)) {
            prev.push(v)
          } else if (typeof prev === 'string') {
            qs[k] = [prev, v]
          } else {
            qs[k] = v
          }
        }

        code.innerText = Object.keys(qs).length
          ? JSON.stringify(qs, null, 2)
          : ''
        return
      }

      const segment = url[outputType]
      if (typeof segment === 'string') {
        code.innerText = segment
      }
    }
  })
}
