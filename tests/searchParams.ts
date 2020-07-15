import fs from 'fs'

const searchParamsEncoded = Array(256)
  .fill(null)
  .map((_, i) => ({ i, c: String.fromCharCode(i) }))
  // .filter((c) => rePrint.test(c))
  .filter(({ c }) => {
    const u = new URL(`?q=${c}`, 'https://www.example.com')
    return c !== u.searchParams.get('q')
  })
  .map(({ i, c }) => `${i}\t${JSON.stringify(c)}\t${c}`)
  .join('\n')

console.log(searchParamsEncoded)

fs.writeFileSync('tests/searchParams.out.txt', searchParamsEncoded, {
  encoding: 'utf8',
})
