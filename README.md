# Hyperlane Explorer App

An interchain explorer for the Hyperlane protocol and network.

## Midnight fork

This fork adds first-class support for the Midnight chain (domain 1234),
shaped so every piece maps onto an upstream submission:

- `@hyperlane-xyz/utils` is overridden (see `pnpm-workspace.yaml`) with a
  build carrying `ProtocolType.Midnight` and its address codecs. The
  canonical changeset lives on `equilibriumco/hyperlane-monorepo` branch
  `feat/midnight-protocol-type` (based on upstream main — the future
  upstream PR, incl. sdk/widgets/TokenStandard); the vendored tarball in
  `vendor/` is built from its 33.0.2 backport (`midnight-utils-33.0.2`)
  because this app pins 33.0.2. utils resolves once in the dependency
  graph, so sdk/widgets pick it up automatically and
  `protocol: 'midnight'` survives metadata validation. Both branches and
  the override disappear once upstream ships the protocol.
- Chain metadata, addresses, logos, and the NIGHT warp route come from
  the registry: point `NEXT_PUBLIC_REGISTRY_URL` /
  `NEXT_PUBLIC_REGISTRY_BRANCH` at `equilibriumco/hyperlane-registry`
  (see `.env.example`) — the upstream custom-registry mechanism, no fork
  code. One real fix supports it: chain logos follow the configured
  registry instead of the hardcoded canonical CDN path.
- `config.apiUrl` reads `NEXT_PUBLIC_API_URL` so the app can point at a
  local scraper + Hasura stack.
- `postgresByteaToAddress` tolerates NULL bytea columns (Midnight
  transactions have no public recipient).
- `MidnightHypNative`/`MidnightHypCollateral` are recognized for
  collateral badges the same way the existing Starknet workaround is,
  until this app's SDK version carries the midnight token standards.

Known limits: `origin_tx_sender` shows "Unknown" (Midnight transactions
have no public sender), there are no Midnight block-explorer links yet, and
the message status timeline and the live-RPC features (Warp Route Security
ISM tree, collateral balances, pending-message debugging) stay EVM-only, as
they are upstream for every non-EVM chain.

## Setup

```sh
# Install dependencies
pnpm install

# Build source and generate types
pnpm run build
```

## Development

```sh
# Start the Next dev server
pnpm run dev
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
