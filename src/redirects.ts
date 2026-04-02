import type { Sablier } from "sablier";
import { Protocol, sablier, Version } from "sablier";
import {
  abstract,
  arbitrum,
  avalanche,
  base,
  berachain,
  blast,
  bsc,
  coreDao,
  gnosis,
  hyperevm,
  linea,
  mainnet,
  mode,
  monad,
  morph,
  optimism,
  polygon,
  scroll,
  sonic,
  superseed,
  taiko,
  unichain,
  zksync,
} from "sablier/evm/chains";

// ============================================================================
// Constants
// ============================================================================

// See https://x.com/PaulRBerg/status/1809866304125288456
const MAX_ADDRESSES = 20;
const COLOR = "#FF9900";
const ICON = "\u23F3"; // ⏳

// ============================================================================
// Chain Configuration
// ============================================================================

/**
 * Chains ranked by DeFi TVL / ecosystem significance. Used to pick the top 20 when a version is deployed on more chains.
 * Some Sablier chains (e.g. Chiliz, Sei, Sophon) are omitted because Zapper doesn't support them.
 * See CLAUDE.md § "Sablier chains NOT supported by Zapper" for the full list.
 */
const CHAIN_PRIORITY: number[] = [
  mainnet.id,
  arbitrum.id,
  base.id,
  optimism.id,
  polygon.id,
  bsc.id,
  avalanche.id,
  gnosis.id,
  scroll.id,
  linea.id,
  zksync.id,
  blast.id,
  mode.id,
  berachain.id,
  sonic.id,
  taiko.id,
  unichain.id,
  abstract.id,
  monad.id,
  hyperevm.id,
  morph.id,
  coreDao.id,
  superseed.id,
];
const chainPriorityIndex = new Map(CHAIN_PRIORITY.map((id, i) => [id, i]));
const LOWEST_PRIORITY = CHAIN_PRIORITY.length;

/** Lockup v1.x has multiple contracts per chain, so restrict to 6 major chains to stay under the 20-address Zapper limit. */
const V1_CHAIN_IDS = new Set([mainnet.id, base.id, bsc.id, arbitrum.id, polygon.id, optimism.id]);

// ============================================================================
// Version Definitions
// ============================================================================

/**
 * Lockup protocol versions and their user-facing contract names.
 *
 * - v2.0+ uses a single unified `SablierLockup` contract per chain.
 * - v1.x splits streaming into separate Linear, Dynamic, and (from v1.2) Tranched contracts,
 *   so these versions are restricted to {@link V1_CHAIN_IDS} to stay under the 20-address cap.
 */
const LOCKUP_VERSIONS = [
  {
    contracts: ["SablierLockup"],
    version: Version.Lockup.V4_0,
  },
  {
    contracts: ["SablierLockup"],
    version: Version.Lockup.V3_0,
  },
  {
    contracts: ["SablierLockup"],
    version: Version.Lockup.V2_0,
  },
  {
    contracts: ["SablierV2LockupLinear", "SablierV2LockupDynamic", "SablierV2LockupTranched"],
    version: Version.Lockup.V1_2,
  },
  {
    contracts: ["SablierV2LockupLinear", "SablierV2LockupDynamic"],
    version: Version.Lockup.V1_1,
  },
  {
    contracts: ["SablierV2LockupLinear", "SablierV2LockupDynamic"],
    version: Version.Lockup.V1_0,
  },
] as const;

/** Flow protocol versions — one `SablierFlow` contract per chain across all versions. */
const FLOW_VERSIONS = [
  { contracts: ["SablierFlow"], version: Version.Flow.V3_0 },
  { contracts: ["SablierFlow"], version: Version.Flow.V2_0 },
  { contracts: ["SablierFlow"], version: Version.Flow.V1_1 },
  { contracts: ["SablierFlow"], version: Version.Flow.V1_0 },
] as const;

// ============================================================================
// Helpers
// ============================================================================

const mainnetChainIds = new Set(sablier.evm.chains.getMainnets().map((c) => c.id));

/**
 * Collects lowercased contract addresses for a given protocol version, filtered to mainnets
 * (and optionally a subset via {@link chainFilter}), sorted by {@link CHAIN_PRIORITY}, and
 * capped at {@link MAX_ADDRESSES}.
 */
function getMainnetAddresses(
  protocol: Protocol,
  version: Sablier.EVM.Version,
  contractNames: readonly string[],
  chainFilter?: Set<number>,
): string[] {
  const release = sablier.evm.releases.get({ protocol, version });
  if (!release) return [];

  // Use the explicit chain subset if provided (e.g. V1_CHAIN_IDS), otherwise all mainnets
  const allowedChains = chainFilter ?? mainnetChainIds;
  const nameSet = new Set(contractNames);

  // Keep only mainnet deployments on allowed chains
  const eligibleDeployments = release.deployments.filter(
    (d) => mainnetChainIds.has(d.chainId) && allowedChains.has(d.chainId),
  );

  // Sort chains by DeFi TVL / ecosystem significance so the most important ones survive the cap
  const sorted = eligibleDeployments.sort(
    (a, b) =>
      (chainPriorityIndex.get(a.chainId) ?? LOWEST_PRIORITY) - (chainPriorityIndex.get(b.chainId) ?? LOWEST_PRIORITY),
  );

  // Extract matching contract addresses across all deployments
  const addresses = sorted.flatMap((d) =>
    d.contracts.filter((c) => nameSet.has(c.name)).map((c) => c.address.toLowerCase()),
  );

  // Zapper enforces a 20-address limit per bundle URL
  return addresses.slice(0, MAX_ADDRESSES);
}

/** Constructs a Zapper bundle URL from a list of contract addresses and a display label. */
function buildZapperUrl(addresses: string[], label: string): string {
  const path = addresses.join(",");
  const params = new URLSearchParams({
    label,
  });
  return `https://zapper.xyz/bundle/${path}?${params.toString()}&color=${encodeURIComponent(COLOR)}&icon=${encodeURIComponent(ICON)}`;
}

// ============================================================================
// Redirect Map
// ============================================================================

/** Builds the slug → Zapper bundle URL map for all Lockup and Flow versions. */
function generateRedirects(): Record<string, string> {
  const map: Record<string, string> = {};

  for (const { version, contracts } of LOCKUP_VERSIONS) {
    const slug = `lockup-${version.replace(".", "-")}`;
    const label = `Sablier Lockup ${version}`;
    const isV1 = version.startsWith("v1.");
    const addresses = getMainnetAddresses(
      Protocol.Lockup,
      version,
      contracts,
      isV1 ? V1_CHAIN_IDS : undefined,
    );
    if (addresses.length > 0) {
      map[slug] = buildZapperUrl(addresses, label);
    }
  }

  for (const { version, contracts } of FLOW_VERSIONS) {
    const slug = `flow-${version.replace(".", "-")}`;
    const label = `Sablier Flow ${version}`;
    const addresses = getMainnetAddresses(Protocol.Flow, version, contracts);
    if (addresses.length > 0) {
      map[slug] = buildZapperUrl(addresses, label);
    }
  }

  return map;
}

export const redirects = generateRedirects();
