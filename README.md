# encodeURI-plus

Minimally and safely encode URIComponents for use in shorter URLs. Avoid Percent-encoding.

## Features

- Allow non-ASCII characters
- Allow reserved characters in querystring values and hash
- Some characters will break serialization-deserialization, therefore they have to be encoded.
  - Querystring values - `&+` in reseved list
  - Path params - `/`
- Customizable options.

```ts
export interface IEncodeOptions {
  /**
   * @default true
   */
  allowNonAscii?: boolean
  allowed?: string[]
  disallowed?: string[]
  allowedRegex?: RegExp[]
  disallowedRegex?: RegExp[]
  throws?: (string | RegExp)[]
  replaceMap?: Record<string, string>
  /**
   * Default is encodeURIComponent
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
