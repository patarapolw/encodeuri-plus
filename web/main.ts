interface Window {
  EncodeURIPlus: typeof import('../src')['URLEncoder']
}

type IURLParts = import('../src').IURLParts

const { EncodeURIPlus } = window

const KEYBOARD_EVENT = 'input'
const urlEncoder = new EncodeURIPlus()

document.querySelectorAll('.repeatable input.key').forEach((el) => {
  el.addEventListener(KEYBOARD_EVENT, repeaterListener)
})

document.querySelectorAll('input[aria-label^="url-"]').forEach((inp) => {
  inp.addEventListener(KEYBOARD_EVENT, encodeListener)
})

buildUrl()

function repeaterListener(evt: Event) {
  const { target } = evt

  if (target instanceof HTMLInputElement && target.value) {
    const repeater = target.closest('li')
    const { parentElement } = repeater || {}
    if (!repeater || !parentElement) {
      return
    }

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

function encodeListener(evt: Event) {
  const { target } = evt
  if (!(target instanceof HTMLInputElement)) {
    return
  }

  const section = target.closest('.field')
  if (!section) {
    return
  }

  const label = target.getAttribute('aria-label') || ''

  const handler: Record<string, (s: string, opts: any) => string> = {
    'url-segment': (s, opts) =>
      urlEncoder.encode(s, { type: 'pathParam', ...opts }),
    'url-qs-key': (s, opts) =>
      urlEncoder.encode(s, { type: 'queryKey', ...opts }),
    'url-qs-value': (s, opts) =>
      urlEncoder.encode(s, { type: 'queryValue', ...opts }),
    'url-hash': (s, opts) => urlEncoder.encode(s, { type: 'hash', ...opts }),
  }

  if (!handler[label]) {
    return
  }

  const result = handler[label](target.value, {
    onError: (e: Error) => alert(e.message),
  })
  const output = section.querySelector('code')
  if (output) {
    output.innerText = result
  }

  buildUrl({ label, raw: target.value, result })
}

function buildUrl(pre?: { label: string; raw: string; result: string }) {
  const urlParams: IURLParts = {}

  let lastQueryKey = ''
  let isQueryKeyLast = false
  const err = {
    message: '',
    decodedValue: '',
  }

  document.querySelectorAll('input[aria-label^="url-"]').forEach((inp) => {
    const currentLabel = inp.getAttribute('aria-label') || ''

    if (inp instanceof HTMLInputElement) {
      if (currentLabel === 'url-qs-value' && inp.value && !isQueryKeyLast) {
        return
      }

      if (currentLabel === 'url-qs-key' && inp.value) {
        isQueryKeyLast = true
        lastQueryKey = inp.value
      } else {
        isQueryKeyLast = false
      }

      const handler: Record<string, (s: string) => void> = {
        'url-segment': (s) => {
          if (s) {
            urlParams.segments = urlParams.segments || []
            urlParams.segments.push(s)
          }
        },
        'url-qs-value': (s) => {
          if (lastQueryKey) {
            urlParams.query = urlParams.query || {}
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
        'url-hash': (s) => {
          if (s) {
            urlParams.hash = s
          }
        },
      }

      if (handler[currentLabel]) {
        handler[currentLabel](inp.value)
      }
    }
  })

  /**
   * Error already broadcasted in another function
   */
  const u = urlEncoder.makeUrl(urlParams, { onError: false })
  // @ts-ignore
  const { segments, query, hash, url } = urlEncoder.parseUrl(u, {
    onError: (e) => alert(e.message),
  })

  document.querySelectorAll('[data-output]').forEach((el) => {
    if (el instanceof HTMLElement) {
      const outputType = el.getAttribute('data-output')

      if (outputType === 'full') {
        el.innerText = u
        return
      }

      if (outputType === 'search') {
        if (pre && lastQueryKey && pre.raw && query) {
          const possible = new Set<string>()

          if (pre.label === 'url-qs-key') {
            Object.keys(query).map((k) => possible.add(k))
          } else if (pre.label === 'url-qs-value') {
            Object.entries(query)
              .filter(([k]) => k)
              .map(([, vs]) => (Array.isArray(vs) ? vs : [vs]))
              .reduce((prev, c) => [...prev, ...c], [])
              .map((v) => possible.add(v))
          }

          if (possible.size) {
            const decodedValue = urlEncoder.decode(pre.result, {
              type: pre.label === 'url-qs-key' ? 'queryKey' : 'queryValue',
            })
            if (decodedValue !== pre.raw || !possible.has(decodedValue)) {
              err.message = `Some of the query are mis-parsed: ${pre.result}`
              err.decodedValue = decodedValue
            }
          }
        }

        if (el.tagName === 'CODE') {
          el.innerText = query ? JSON.stringify(query, null, 2) : ''
        } else {
          el.innerText = url.search
        }
        return
      }

      if (outputType === 'pathname') {
        if (pre && pre.raw && pre.label === 'url-segment') {
          const decodedValue = urlEncoder.decode(pre.result, {
            type: 'pathParam',
          })
          if (decodedValue !== pre.raw || !(segments || []).includes(pre.raw)) {
            err.message = `Some of URL segments are mis-parsed: ${pre.raw}`
            err.decodedValue = decodedValue
          }
        }

        if (el.tagName === 'CODE') {
          el.innerText = segments ? JSON.stringify(segments) : ''
        } else {
          el.innerText = url.pathname !== '/' ? url.pathname : ''
        }

        return
      }

      if (outputType === 'hash') {
        if (pre && pre.raw && pre.label === 'url-hash') {
          const decodedValue = urlEncoder.decode(pre.result, { type: 'hash' })
          if (decodedValue !== pre.raw || (hash && hash !== decodedValue)) {
            err.message = `Some of URL segments are mis-parsed: ${pre.raw}`
            err.decodedValue = decodedValue
          }
        }

        if (el.tagName === 'CODE') {
          el.innerText = hash || ''
        } else {
          el.innerText = url.hash
        }
      }
    }
  })

  if (err.message) {
    console.error(Object.assign(err, { pre }))
    alert(err.message)
  }
}
