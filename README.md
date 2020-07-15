# encodeURI-plus

[![npm version](https://badge.fury.io/js/encodeuri-plus.svg)](https://badge.fury.io/js/encodeuri-plus) [![Website shields.io](https://img.shields.io/website-up-down-green-red/https/encodeuri-plus.netlify.app.svg)](https://encodeuri-plus.netlify.app/)

Minimally and safely encode URIComponents for use in shorter URLs. Avoid Percent-encoding.

## Features

- Allow non-ASCII characters
- Allow reserved characters in querystring values and hash
- Some characters will break serialization-deserialization, therefore they have to be encoded, e.g. `#&+` in querystring values
- Customizable options.

```ts
export interface IEncodeOptions {
  /**
   * Do not encode non-ASCII
   *
   * @default true
   */
  allowNonAscii?: boolean
  /**
   * Do not encode
   */
  allowed?: string[]
  allowedRegex?: RegExp[]
  /**
   * Do encode, if possible
   */
  disallowed?: string[]
  disallowedRegex?: RegExp[]
  /**
   * Throw error if matches
   */
  throws?: (string | RegExp)[]
  /**
   * Extra replaceMap beyond `encoder`
   */
  replaceMap?: Record<string, string>
  /**
   * @default encodeURIComponent
   */
  encoder?: (s: string) => string
}
```

## Usage

This library has no dependencies, and is browser-compatible, therefore

```html
<script src="https://unpkg.com/encodeuri-plus"></script>
```

Also available on NPM.

```sh
npm i encodeuri-plus
```
