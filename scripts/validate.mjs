import { readFile } from 'node:fs/promises'
import Ajv from 'ajv'
import addFormats from 'ajv-formats'
import { AbiCoder, getAddress } from 'ethers'

const RPC_URL = process.env.OG_RPC_URL ?? 'https://evmrpc.0g.ai'
const CHAIN_ID = 16661
const list = JSON.parse(await readFile(new URL('../tokenlist.json', import.meta.url)))
const registrySnapshot = JSON.parse(await readFile(new URL('../registry-tokens.json', import.meta.url)))
const schema = JSON.parse(await readFile(new URL('../node_modules/@uniswap/token-lists/src/tokenlist.schema.json', import.meta.url)))

// The requested public display name includes parentheses. The upstream schema's
// display-name pattern predates that common punctuation, so extend only this
// presentation-field pattern while retaining the official schema for everything else.
schema.properties.name.pattern = '^[\\w ()]+$'

const ajv = new Ajv({ allErrors: true, strict: false })
addFormats(ajv)
const validateSchema = ajv.compile(schema)
if (!validateSchema(list)) {
  throw new Error(`Schema validation failed:\n${ajv.errorsText(validateSchema.errors, { separator: '\n' })}`)
}

const registryByAddress = new Map(registrySnapshot.tokens.map((token) => [token.address.toLowerCase(), token]))
const addresses = new Set()
const symbols = new Set()
for (const token of list.tokens) {
  if (token.chainId !== CHAIN_ID) throw new Error(`${token.symbol}: chainId must be ${CHAIN_ID}`)
  let checksum
  try { checksum = getAddress(token.address) } catch { throw new Error(`${token.symbol}: invalid address ${token.address}`) }
  if (checksum !== token.address) throw new Error(`${token.symbol}: address must be EIP-55 checksummed (${checksum})`)
  const registryToken = registryByAddress.get(token.address.toLowerCase())
  if (registryToken && (registryToken.symbol !== token.symbol || registryToken.decimals !== token.decimals)) {
    throw new Error(`${token.address}: conflicts with Bond registry (symbol/decimals must be ${registryToken.symbol}/${registryToken.decimals})`)
  }
  const addressKey = token.address.toLowerCase()
  const symbolKey = token.symbol.toLowerCase()
  if (addresses.has(addressKey)) throw new Error(`${token.symbol}: duplicate address ${token.address}`)
  if (symbols.has(symbolKey)) throw new Error(`${token.symbol}: duplicate symbol`)
  addresses.add(addressKey)
  symbols.add(symbolKey)
}

async function ethCall(to, data) {
  const response = await fetch(RPC_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: `${to}-${data}`, method: 'eth_call', params: [{ to, data }, 'latest'] })
  })
  if (!response.ok) throw new Error(`RPC request failed: HTTP ${response.status}`)
  const json = await response.json()
  if (json.error) throw new Error(`RPC eth_call failed for ${to}: ${json.error.message ?? JSON.stringify(json.error)}`)
  if (!json.result || json.result === '0x') throw new Error(`RPC eth_call returned no data for ${to}`)
  return json.result
}

const coder = AbiCoder.defaultAbiCoder()
for (const token of list.tokens) {
  const decimalsResult = await ethCall(token.address, '0x313ce567')
  const decimals = Number(BigInt(decimalsResult))
  if (decimals !== token.decimals) throw new Error(`${token.symbol}: decimals mismatch (list ${token.decimals}, on-chain ${decimals})`)
  const symbolResult = await ethCall(token.address, '0x95d89b41')
  let symbol
  try { symbol = coder.decode(['string'], symbolResult)[0] } catch { throw new Error(`${token.symbol}: token symbol() did not return a string`) }
  if (symbol !== token.symbol) throw new Error(`${token.symbol}: symbol mismatch (list ${token.symbol}, on-chain ${symbol})`)
}

console.log(`Validated ${list.tokens.length} token(s) against schema and 0G mainnet.`)
