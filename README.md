# encodeURI-plus

[![npm version](https://badge.fury.io/js/encodeuri-plus.svg)](https://badge.fury.io/js/encodeuri-plus) [![Website shields.io](https://img.shields.io/website-up-down-green-red/https/encodeuri-plus.netlify.app.svg)](https://encodeuri-plus.netlify.app/)

Minimally and safely encode URIComponents for use in shorter URLs. Avoid Percent-encoding.

## Features

- Allow non-ASCII characters
- Allow reserved characters in querystring values and hash
- Customizable options.

```ts
export interface IURLEncoderOptions {
  /**
   * Do not encode non-ASCII, i.e. `/[^\x00-\x7F]/`
   *
   * @default true
   */
  allowNonAscii?: boolean
  /**
   * Do not encode
   */
  keep?: (string | RegExp)[]
  /**
   * Fallback with `fixedEncodeURIComponent`, which is a stricter version of `encodeURIComponent`
   * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/encodeURIComponent
   *
   * As `fixedEncodeURIComponent` will NOT encode UNRESERVED characters
   * and `/`, `\` may throw errors even if they are percent-encoded.
   * Further force encoding is required -- `StarEncoder.encode`.
   *
   * For `.`, `..`, as long as it is not alone, it should work.
   * Perhaps prefix it with `"` (in JSON)?
   */
  forceEncode?: (string | RegExp)[]
  /**
   * Throw error if matches
   */
  throws?: (string | RegExp)[]
  /**
   * `encodeURI` is required to make RESERVED set work by default.
   *
   * However, it can be enhanced with `forceEncode`
   *
   * @default encodeURI
   */
  encoder?: (s: string) => string
  /**
   * decodeURIComponent seems to decode all percent-encoded anyway, and doesn't need fallback.
   *
   * @default decodeURIComponent
   */
  decoder?: (s: string) => string
  /**
   * Set to `false` to disable error
   */
  onError?: boolean | ((e: Error) => any)
}
```

## Caveats

Path params seem to have to most limitations. Avoid `./\`, or encode it first.

## Usage

This library has no dependencies, and is browser-compatible, therefore

```html
<script src="https://unpkg.com/encodeuri-plus"></script>
```

Also available on NPM.

```sh
npm i encodeuri-plus
```
