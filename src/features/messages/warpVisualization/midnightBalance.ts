import { logger } from '../../../utils/logger';

interface MidnightBalanceToken {
  chainName: string;
  addressOrDenom: string;
  standard?: string;
}

// Client for /api/midnight-warp-route-balance (see the API route for the
// server-side details): returns the warp contract's locked native NIGHT in
// atomic units, or undefined when the balance is unavailable. Shared by the
// Warp Route Overview balances and the destination collateral check.
export async function fetchMidnightWarpRouteBalance(
  token: MidnightBalanceToken,
): Promise<bigint | undefined> {
  const params = new URLSearchParams({
    chainName: token.chainName,
    addressOrDenom: token.addressOrDenom,
    standard: token.standard || '',
  });

  const response = await fetch(`/api/midnight-warp-route-balance?${params.toString()}`);
  if (!response.ok) {
    logger.debug(`Midnight balance API ${response.status} for ${token.chainName}`);
    return undefined;
  }

  const { balance } = (await response.json()) as { balance?: unknown };
  if (typeof balance !== 'string') return undefined;
  return BigInt(balance);
}
