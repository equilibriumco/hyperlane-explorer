# Hyperlane Explorer App

An interchain explorer for the Hyperlane protocol and network.

## Cardano + Midnight fork

This fork adds support for the Cardano (domain 2003) and Midnight (domain 1234)
chains, shaped so every piece maps onto an upstream submission:

- `@hyperlane-xyz/utils` is overridden (see `pnpm-workspace.yaml`) with a build
  carrying `ProtocolType.Cardano` and `ProtocolType.Midnight` plus their address
  codecs, vendored in `vendor/` and built from
  `equilibriumco/hyperlane-monorepo` branch `midnight-cardano`. utils resolves
  once in the dependency graph, so sdk/widgets pick it up and
  `protocol: 'cardano'` / `'midnight'` survive metadata validation without an
  sdk override. Without it those chains still load, but degrade to
  `ProtocolType.Unknown` (`forwardCompatibleEnum` maps unrecognised values
  rather than rejecting them), losing address formatting, the timeline and the
  warp sections. The override disappears once upstream ships the protocols.
- Chain metadata, addresses, logos, and the wADA/NIGHT warp routes come from the
  registry: point `NEXT_PUBLIC_REGISTRY_URL` / `NEXT_PUBLIC_REGISTRY_BRANCH` at
  `equilibriumco/hyperlane-registry` branch `midnight-cardano` (see
  `.env.example`) — the upstream custom-registry mechanism, no chain data in
  this repo. Chain and warp-route logos follow the configured registry instead
  of the hardcoded canonical CDN path.
- `config.apiUrl` reads `NEXT_PUBLIC_API_URL` so the app can point at a local
  scraper + Hasura stack (see `cardano/e2e-docker` in the monorepo).
- The message status timeline renders for Cardano messages and gets a
  `multiProvider`, so delivered messages show real per-stage timings.
- `postgresByteaToAddress` tolerates NULL bytea columns (a Cardano transaction
  pays out to many UTXOs, so it has no single recipient; Midnight transactions
  have no public recipient).
- `CardanoHypNative`/`CardanoHypCollateral` and
  `MidnightHypNative`/`MidnightHypCollateral` are recognized for collateral
  badges the same way the existing Starknet workaround is, until this app's SDK
  version carries those token standards.
- The Warp Route Overview shows each non-EVM leg's locked collateral, read
  server-side (mirroring the Sealevel route) since the browser bundle has no
  provider for either chain: `/api/cardano-warp-route-balance` needs
  `BLOCKFROST_API_KEY` and returns 501 without it, and the Midnight read queries
  that chain's indexer. Native routes only.

Known limits: for Midnight, `origin_tx_sender` shows "Unknown" (its
transactions have no public sender), there are no Midnight block-explorer links
yet, and the timeline stays off (only Ethereum and Cardano are allowlisted). The
live-RPC features (Warp Route Security ISM tree, pending-message debugging) stay
EVM-only, as they are upstream for every non-EVM chain.

## Running against a self-hosted scraper

```sh
NEXT_PUBLIC_API_URL=http://localhost:8080/v1/graphql \
NEXT_PUBLIC_REGISTRY_URL=https://github.com/equilibriumco/hyperlane-registry \
NEXT_PUBLIC_REGISTRY_BRANCH=midnight-cardano \
  pnpm run dev
```

## Setup

```sh
# Install dependencies
pnpm install

# Build source and generate types
pnpm run build
```

## Test

```sh
# Run all unit tests
pnpm run test

# Lint check code
pnpm run lint
```

## Learn more

For more information, see the [Hyperlane documentation](https://v3.hyperlane.xyz).
