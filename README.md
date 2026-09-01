# Hyperlane Explorer App

An interchain explorer for the Hyperlane protocol and network.

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

## Midnight fork

This fork adds support for the Midnight chain (domain 1234). Every piece is
shaped as an upstream submission, so all of it disappears once upstream ships
the protocol.

### Running it against Midnight

Copy `.env.example` to `.env.local` — Next.js does not read `.env.example`
itself — and set the three `NEXT_PUBLIC_*` values it documents. Without them
the app builds and runs fine against Hyperlane's hosted API, which has no
Midnight data, so a successful `pnpm run dev` is not evidence that anything is
configured.

The chain entry in the registry must carry **`gatewayUrls`** pointing at
Midnight's indexer, with the node URL left in `rpcUrls`. Collateral balances
are read server-side from that indexer, because the browser runtime has no
Midnight provider; a chain entry without it returns "Chain has no queryable
indexer" and the balance is silently omitted from the UI.

### What the fork changes

- `@hyperlane-xyz/utils` is overridden (see `pnpm-workspace.yaml`) with a build
  carrying `ProtocolType.Midnight` and its address codecs. utils resolves
  exactly once in this dependency graph, so the override propagates into
  sdk/widgets and `protocol: 'midnight'` survives metadata validation. The
  canonical changeset lives on `equilibriumco/hyperlane-monorepo` branch
  `midnight`; the vendored tarball in `vendor/` is packed straight from it.
- Chain metadata, addresses, logos and the NIGHT warp route come from the
  registry via `NEXT_PUBLIC_REGISTRY_URL` / `_BRANCH` — the upstream
  custom-registry mechanism, no fork code. One real fix supports it: chain
  logos follow the configured registry instead of the hardcoded canonical CDN
  path.
- `config.apiUrl` reads `NEXT_PUBLIC_API_URL`, so the app can point at a local
  scraper and Hasura stack.
- `postgresByteaToAddress` tolerates NULL bytea columns, which is a genuine
  upstream bug: Midnight transactions have no public recipient.
- `MidnightHypNative` / `MidnightHypCollateral` are recognised for collateral
  badges, the same way the existing Starknet workaround is, until this app's
  SDK version carries the Midnight token standards.
- Midnight warp-route collateral balances are fetched server-side through the
  indexer.

### Rebuilding the vendored tarball

Only needed when the utils changeset changes.

```sh
# in a checkout of equilibriumco/hyperlane-monorepo on the midnight branch
cd typescript/utils && pnpm build && pnpm pack
# then copy the tarball over vendor/hyperlane-xyz-utils-41.3.1-midnight.tgz
# in this repo, keeping the filename, and re-run pnpm install
```

The override pins the filename, so keeping the name means no other file needs
touching. Nothing marks the tarball as patched apart from the `file:` path in
the lockfile, so `package.json` still shows a plain `40.0.0`.

### Known limits

`origin_tx_sender` shows "Unknown", because Midnight transactions have no
public sender. There are no Midnight block-explorer links, because the chain
entry has no `blockExplorers` — there is no public explorer to point at. The
Warp Route Security ISM tree and the pending-message debugger stay EVM-only, as
they are upstream for every non-EVM chain, and warp fee rows are not rendered
for Midnight-origin messages.

## Learn more

For more information, see the [Hyperlane documentation](https://v3.hyperlane.xyz).
