# Zapper Redirects

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Cloudflare Worker that provides short URL redirects for Sablier's [Zapper](https://zapper.xyz) bundle links.

**Live at:** [`sblr.to`](https://sblr.to)

## How It Works

Redirect URLs are **dynamically generated** from the [`sablier`](https://www.npmjs.com/package/sablier) SDK. At build
time, the Worker queries the SDK for all mainnet contract deployments per protocol version and constructs Zapper bundle
URLs automatically.

Requests to `sblr.to/<slug>` return a **301 Moved Permanently** redirect to the corresponding Zapper bundle URL.
Requests to `sblr.to` (no slug) redirect to [sablier.com](https://sablier.com). Unknown slugs return 404.

## Available Redirects

| Slug                                                   | Redirect                                            |
| ------------------------------------------------------ | --------------------------------------------------- |
| [`sblr.to/lockup-v4-0`](https://sblr.to/lockup-v4-0) | Zapper bundle for all Lockup v4.0 mainnet contracts |
| [`sblr.to/lockup-v3-0`](https://sblr.to/lockup-v3-0) | Zapper bundle for all Lockup v3.0 mainnet contracts |
| [`sblr.to/lockup-v2-0`](https://sblr.to/lockup-v2-0) | Zapper bundle for all Lockup v2.0 mainnet contracts |
| [`sblr.to/lockup-v1-2`](https://sblr.to/lockup-v1-2) | Zapper bundle for all Lockup v1.2 mainnet contracts |
| [`sblr.to/lockup-v1-1`](https://sblr.to/lockup-v1-1) | Zapper bundle for all Lockup v1.1 mainnet contracts |
| [`sblr.to/lockup-v1-0`](https://sblr.to/lockup-v1-0) | Zapper bundle for all Lockup v1.0 mainnet contracts |
| [`sblr.to/flow-v3-0`](https://sblr.to/flow-v3-0)     | Zapper bundle for all Flow v3.0 mainnet contracts   |
| [`sblr.to/flow-v2-0`](https://sblr.to/flow-v2-0)     | Zapper bundle for all Flow v2.0 mainnet contracts   |
| [`sblr.to/flow-v1-1`](https://sblr.to/flow-v1-1)     | Zapper bundle for all Flow v1.1 mainnet contracts   |
| [`sblr.to/flow-v1-0`](https://sblr.to/flow-v1-0)     | Zapper bundle for all Flow v1.0 mainnet contracts   |

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          BUILD TIME (bun run deploy)                    │
│                                                                         │
│  ┌──────────────┐     ┌────────────────────────────────────────────┐    │
│  │  sablier SDK  │────▶│  For each protocol version (Lockup, Flow)  │    │
│  │  (npm)        │     │                                            │    │
│  │              │     │  1. Query SDK for mainnet deployments       │    │
│  │  Chains ─────┤     │  2. Filter by Zapper-supported chains      │    │
│  │  Contracts ──┤     │  3. Sort by CHAIN_PRIORITY (TVL rank)      │    │
│  │  Versions ───┘     │  4. Cap at 20 addresses (Zapper limit)     │    │
│  └──────────────┘     │  5. Build Zapper bundle URL                │    │
│                        └──────────────┬─────────────────────────────┘    │
│                                       │                                  │
│                                       ▼                                  │
│                        ┌──────────────────────────────┐                  │
│                        │  Redirect Map (slug → URL)   │                  │
│                        └──────────────┬───────────────┘                  │
│                                       │                                  │
│                                       ▼                                  │
│                        ┌──────────────────────────────┐                  │
│                        │   Bundled into Worker code   │                  │
│                        └──────────────────────────────┘                  │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                          RUNTIME (Cloudflare Edge)                       │
│                                                                         │
│  GET sblr.to/lockup-v3-0                                                │
│       │                                                                  │
│       ▼                                                                  │
│  ┌──────────┐    ┌──────────────┐    ┌─────────────────────────────┐    │
│  │  Extract  │───▶│  Look up in  │───▶│  301 → zapper.xyz/bundle/   │    │
│  │  slug     │    │  redirect    │    │  0xcf8c…,0xf12a…,… (×20)   │    │
│  │          │    │  map         │    │  ?label=Sablier+Lockup+v3.0 │    │
│  └──────────┘    └──────────────┘    └─────────────────────────────┘    │
│                         │                                                │
│                    (miss)│                                                │
│                         ▼                                                │
│                  ┌──────────┐                                            │
│                  │   404    │                                            │
│                  └──────────┘                                            │
└─────────────────────────────────────────────────────────────────────────┘
```

## 🌐 DNS Setup

The custom domain is declared in `wrangler.toml` and normally provisioned automatically on deploy. If it's missing or
misconfigured:

1. Go to **Workers & Pages** → **zapper-redirects** → **Settings** → **Domains & Routes**
2. Click **Add Custom Domain** → enter `sblr.to`
3. Cloudflare auto-creates the required DNS record

## 📄 License

This project is licensed under the MIT License — see [LICENSE](LICENSE) for details.
