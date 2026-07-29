import {
  TOKEN_COLLATERALIZED_STANDARDS,
  TOKEN_CROSS_COLLATERAL_STANDARDS,
  TokenStandard,
} from '@hyperlane-xyz/sdk/token/TokenStandard';

export const SUPPORTED_SEALEVEL_BALANCE_STANDARDS: TokenStandard[] = [
  TokenStandard.SealevelHypCollateral,
  TokenStandard.SealevelHypCrossCollateral,
  TokenStandard.SealevelHypNative,
  TokenStandard.SealevelHypSynthetic,
];

// Midnight standards whose balances the explorer can read (server-side, via
// /api/midnight-warp-route-balance). Native only: the deployed Midnight warp
// contract locks native NIGHT; a collateral variant would need a token-type
// mapping in the API route first.
export const SUPPORTED_MIDNIGHT_BALANCE_STANDARDS: TokenStandard[] = [
  'MidnightHypNative' as TokenStandard,
];

export const COLLATERAL_TOKEN_STANDARDS: TokenStandard[] = [
  ...TOKEN_COLLATERALIZED_STANDARDS,
  TokenStandard.EvmHypCollateralFiat,
  TokenStandard.CosmosIbc,
  // Midnight standards ship with the midnight protocol changeset
  // (TokenStandard.MidnightHyp*); until this app's SDK version carries
  // them, recognize the strings directly (same pattern as the Starknet
  // workaround in features/messages/collateral/utils.ts).
  'MidnightHypNative' as TokenStandard,
  'MidnightHypCollateral' as TokenStandard,
];

export const CROSS_COLLATERAL_TOKEN_STANDARDS: TokenStandard[] = Array.from(
  TOKEN_CROSS_COLLATERAL_STANDARDS,
);

export function isCrossCollateralTokenStandard(standard: string | undefined): boolean {
  if (!standard) return false;
  return CROSS_COLLATERAL_TOKEN_STANDARDS.includes(standard as TokenStandard);
}
