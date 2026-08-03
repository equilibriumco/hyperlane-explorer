import { GithubRegistry } from '@hyperlane-xyz/registry';
import type { ChainMetadata } from '@hyperlane-xyz/sdk/metadata/chainMetadataTypes';
import type { WarpRouteConfigs } from '@hyperlane-xyz/sdk/warp/read';
import { isValidAddressMidnight, strip0x } from '@hyperlane-xyz/utils';
import type { NextApiRequest, NextApiResponse } from 'next';

import { config } from '../../consts/config';
import { SUPPORTED_MIDNIGHT_BALANCE_STANDARDS } from '../../features/messages/warpVisualization/tokenStandards';
import { logger } from '../../utils/logger';

// Server-side balance reads for Midnight warp route tokens, mirroring the
// Sealevel handler (sealevel-warp-route-balance.ts): the browser bundle has
// no Midnight provider, so the read happens here against the chain's indexer
// GraphQL endpoint (the `rpcUrls` entry in the chain's registry metadata).
//
// Only the native standard is supported: the deployed Midnight warp contract
// locks native NIGHT, which the indexer reports under the all-zeros token
// type. A collateral variant would additionally need a mapping from the
// registry's collateralAddressOrDenom to an unshielded token type.
const MIDNIGHT_STANDARDS = new Set<string>(SUPPORTED_MIDNIGHT_BALANCE_STANDARDS);
const NATIVE_TOKEN_TYPE = '0'.repeat(64);
const REGISTRY_DATA_CACHE_MS = 5 * 60 * 1000;
const INDEXER_TIMEOUT_MS = 10_000;

const BALANCE_QUERY = `query ($address: HexEncoded!) {
  contractAction(address: $address) {
    unshieldedBalances {
      tokenType
      amount
    }
  }
}`;

interface RegistryData {
  chains: Record<string, ChainMetadata>;
  warpRouteConfigs: WarpRouteConfigs;
}

interface UnshieldedBalance {
  tokenType: string;
  amount: string;
}

let registryDataRequest: Promise<RegistryData> | null = null;
let registryDataExpiresAt = 0;

function getSingleQueryParam(value: string | string[] | undefined): string | undefined {
  if (typeof value === 'string') return value;
  return undefined;
}

function isRegisteredTokenRequest(
  warpRouteConfigs: WarpRouteConfigs,
  {
    chainName,
    addressOrDenom,
    standard,
  }: {
    chainName: string;
    addressOrDenom: string;
    standard: string;
  },
): boolean {
  return Object.values(warpRouteConfigs).some((config) =>
    config.tokens.some(
      (token) =>
        token.chainName === chainName &&
        token.addressOrDenom === addressOrDenom &&
        token.standard === standard,
    ),
  );
}

async function getRegistryData() {
  if (!registryDataRequest || (registryDataExpiresAt > 0 && Date.now() >= registryDataExpiresAt)) {
    registryDataExpiresAt = 0;
    const registry = new GithubRegistry({
      proxyUrl: config.githubProxy,
      uri: config.registryUrl,
      branch: config.registryBranch,
    });
    registryDataRequest = Promise.all([registry.getMetadata(), registry.getWarpRoutes()])
      .then(([metadata, warpRouteConfigs]) => {
        registryDataExpiresAt = Date.now() + REGISTRY_DATA_CACHE_MS;
        return { chains: metadata, warpRouteConfigs };
      })
      .catch((error) => {
        registryDataRequest = null;
        registryDataExpiresAt = 0;
        throw error;
      });
  }
  return registryDataRequest;
}

async function fetchUnshieldedBalances(
  indexerUrl: string,
  address: string,
): Promise<UnshieldedBalance[] | undefined> {
  const response = await fetch(indexerUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: BALANCE_QUERY,
      variables: { address: strip0x(address) },
    }),
    signal: AbortSignal.timeout(INDEXER_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`Indexer responded ${response.status}`);

  const result = (await response.json()) as {
    data?: { contractAction?: { unshieldedBalances: UnshieldedBalance[] } | null };
    errors?: Array<{ message: string }>;
  };
  if (result.errors?.length) throw new Error(`Indexer error: ${result.errors[0].message}`);

  // A null contractAction means the indexer has never seen this contract.
  if (!result.data?.contractAction) return undefined;
  return result.data.contractAction.unshieldedBalances;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const chainName = getSingleQueryParam(req.query.chainName);
  const addressOrDenom = getSingleQueryParam(req.query.addressOrDenom);
  const standard = getSingleQueryParam(req.query.standard);

  if (!chainName || !addressOrDenom || !standard || !MIDNIGHT_STANDARDS.has(standard)) {
    return res.status(400).json({ error: 'Unsupported balance request' });
  }

  if (!isValidAddressMidnight(addressOrDenom)) {
    return res.status(400).json({ error: 'Invalid Midnight address' });
  }

  try {
    const { chains, warpRouteConfigs } = await getRegistryData();
    const chain = chains[chainName];
    if (!chain || chain.protocol !== 'midnight') {
      return res.status(400).json({ error: 'Unsupported chain' });
    }

    if (!isRegisteredTokenRequest(warpRouteConfigs, { chainName, addressOrDenom, standard })) {
      return res.status(400).json({ error: 'Unknown warp route token' });
    }

    const indexerUrl = chain.rpcUrls?.[0]?.http;
    if (!indexerUrl || !indexerUrl.startsWith('http')) {
      return res.status(400).json({ error: 'Chain has no queryable indexer' });
    }

    const unshieldedBalances = await fetchUnshieldedBalances(indexerUrl, addressOrDenom);
    if (unshieldedBalances === undefined) {
      return res.status(404).json({ error: 'Balance unavailable' });
    }

    // A contract that has released all (or never held) native NIGHT simply
    // has no row for the native token type.
    const native = unshieldedBalances.find(
      (entry) => strip0x(entry.tokenType).toLowerCase() === NATIVE_TOKEN_TYPE,
    );

    res.setHeader('Cache-Control', 's-maxage=15, stale-while-revalidate=60');
    return res.status(200).json({ balance: native?.amount ?? '0' });
  } catch (error) {
    logger.error('midnight-warp-route-balance failed', error);
    return res.status(500).json({ error: 'Failed to fetch balance' });
  }
}
