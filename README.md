# Bond AMM token list for 0G

This repository is the public token list for assets available in Bond AMM integrations on 0G mainnet (chain `16661`). Apps should read the list directly from:

`https://raw.githubusercontent.com/Bond-xyz/token-list/main/tokenlist.json`

## Add a token

1. Fork this repository.
2. Add one entry to `tokenlist.json`.
3. Open a pull request.

## Requirements

- The token must be deployed on chain `16661`.
- Use its EIP-55 checksummed contract address.
- `decimals` and `symbol` must match the values returned by the token contract on-chain.
- If included, a logo must be a 256x256 PNG or SVG served over `https` or `ipfs`.

## Review

Reviewers check the submitted address, on-chain metadata, duplicate entries, logo format and availability, and whether the entry follows the token-list schema. Automated checks also validate the JSON schema, address checksum, chain ID, duplicate addresses and symbols, and on-chain decimals and symbols.

Listing here does not imply endorsement by Bond. A listed token still needs an AMM pool before it can be traded.
