# AGENTS.md — Zapper Redirects

@README.md

## Project Overview

Cloudflare Worker that redirects `sblr.to/<slug>` to Zapper bundle URLs. Contract addresses are dynamically sourced from
the `sablier` npm package — no hardcoded URLs.

## Architecture

- `src/index.ts` — Worker entry point. Routes requests through the redirect map.
- `src/redirects.ts` — Generates the `Record<string, string>` redirect map at module load time using the `sablier` SDK.

The slug format is `{protocol}-{version}` where dots are replaced with dashes (e.g., `lockup-v3-0`).

## Constraints

### Zapper 20-address limit

Zapper bundle URLs support a **maximum of 20 addresses**. This is enforced via `MAX_ADDRESSES` in `src/redirects.ts`.

- **Lockup v2.0+, Flow**: One contract per chain (`SablierLockup` / `SablierFlow`). Deployments are sorted by
  `CHAIN_PRIORITY` (ranked by DeFi TVL / ecosystem significance) and capped at 20. When a new chain is added to the SDK,
  also add it to `CHAIN_PRIORITY` — chains not in the list sort last.
- **Lockup v1.x**: Multiple contracts per chain (`SablierV2LockupLinear`, `SablierV2LockupDynamic`,
  `SablierV2LockupTranched`). To stay under 20, these versions are restricted to 6 chains via `V1_CHAIN_IDS`: Ethereum,
  Base, BSC, Arbitrum, Polygon, Optimism.

If you add a new Lockup v1.x chain to `V1_CHAIN_IDS`, verify the total address count stays at or below 20. If you add a
new chain to `CHAIN_PRIORITY`, place it according to its relative TVL / ecosystem significance.

### Contract name selection

Only user-facing streaming contracts are included in bundle URLs. Do **not** include helpers, NFT descriptors, batch
contracts, or comptrollers — those are not relevant to Zapper portfolio tracking.

## How to Add a New Protocol Version

1. Add a new entry to `LOCKUP_VERSIONS` or `FLOW_VERSIONS` in `src/redirects.ts`.
2. Set `contracts` to the user-facing contract name(s) from the version's manifest in the `sablier` SDK (check
   `~/sablier/sdk/src/evm/releases/{protocol}/{version}/manifest.ts`).
3. Run `bun run dev` and verify the redirect with `curl -I http://localhost:8787/<slug>`.
4. Deploy with `bun run deploy`.

## How to Update After New Chain Deployments

No code changes needed. Update the `sablier` package and redeploy:

```sh
bun update sablier
bun run deploy
```

## Development & Testing

```sh
bun install
bun run dev
curl -I http://localhost:8787/lockup-v3-0  # Expect 301
curl -I http://localhost:8787/nonexistent           # Expect 404
```

## Deployment

Wrangler is installed as a local dev dependency — always run it through `bun`:

```sh
bun run deploy          # alias for: bun wrangler deploy
bun wrangler <command>  # run any wrangler command
```

Do **not** use a globally installed `wrangler` — the local version in `devDependencies` ensures consistency.

### Authentication

Wrangler must be authenticated before deploying. If running in a non-interactive environment, set the
`CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` environment variables. Otherwise:

```sh
bun wrangler login
```

The Sablier Cloudflare account ID is `b29fcc290093d5e96dde439d303315ae`.

### Pushing updates

```sh
bun update sablier      # pull latest contract deployments from the SDK
bun run deploy          # build & deploy to Cloudflare
```

To preview changes locally first:

```sh
bun run dev                                    # start local dev server
curl -I http://localhost:8787/lockup-v3-0      # verify redirects
```

## Zapper Chain Support

**Docs:** <https://build.zapper.xyz/docs/api/supported-chains>

Zapper supports **56 chains** as of April 2026:

Abstract, Apechain, Arbitrum, Arbitrum Nova, Astar, Avalanche, Base, Berachain, Bitcoin, Blast, BNB Chain, Bob, Celo,
Core, Cyber, Degen, Ethereum, Flow, Fraxtal, Gnosis, HyperEVM, Hyperliquid, ImmutableX, Ink, Lens, Linea, Mantle,
MegaETH, Metis, Mode, Monad, Moonbeam, Morph, opBNB, Optimism, Polygon, Polygon zkEVM, Redstone, Ronin, Rootstock,
Scroll, Shape, Solana, Soneium, Sonic, Story, Superseed, Taiko, Tempo, Unichain, World Chain, XAI, Zero, ZKsync, Zora.

### Sablier chains NOT supported by Zapper

Contracts on these chains are excluded from bundle URLs since Zapper cannot track them:

| Chain       | Chain ID |
| ----------- | -------- |
| Chiliz      | 88888    |
| Denergy     | 369369   |
| Lightlink   | 1890     |
| Sei         | 1329     |
| Sophon      | 50104    |
| Tangle      | 5845     |
| XDC Network | 50       |

When a new Sablier chain deployment is added, check whether Zapper supports it before expecting it to appear in bundle
URLs.

### Ronin

Ronin is supported by Zapper but excluded from this Worker because Sablier has no v2+ deployments on Ronin. Only
[Sablier Legacy](https://legacy-sender.sablier.com) supports Ronin.

## Stack

- Runtime: Cloudflare Workers
- Language: TypeScript
- Package manager: bun
- Formatter/linter: Biome
- Deployment: `wrangler deploy`
