# PulseLayer

PulseLayer is a paid intelligence layer and shared book of record for agents using tokenized stocks on BNB Chain. It returns the context agents need before they trade, borrow, pool, margin, or report an asset; it does not execute trades or supply a strategy agent. The product requirements are defined in the [PulseLayer build brief](docs/build-brief.md).

## Run

- Node.js 20.6+: `cp .env.example .env && npm start`
- Open `http://localhost:8787` for the control room and `/docs` for API/MCP documentation.
- Docker: `cp .env.example .env && docker compose up --build`
- Verify the implementation: `npm test`

The service uses live issuer, reference-price, and pool feeds when available, then falls back to clearly labeled deterministic demo data. Contract addresses are resolved from the live Binance RWA catalog; demo records contain no contract addresses.

## Product surface

Free endpoints: live asset catalog, complete bStocks contract inventory, issuer resolution and normalized last price. The Binance catalog currently contributes hundreds of BNB Chain instruments and is refreshed from the upstream listing feed. Paid packs: full market state, issuer comparison, executable-size estimates, events and in-process history. Paid routes return HTTP 402 and an x402 challenge. Real settlement is implemented through the BNB Chain-maintained `@bnb-chain/b402` package and official x402 Express middleware. It remains disabled until valid merchant B402 credentials, payout wallet, token contract, and amount are configured. The browser-only dashboard demo uses clearly labeled local fixtures and never authorizes an HTTP or MCP call. Paid HTTP and MCP calls fail closed until B402 settlement is configured and require wallet-signed payment when enabled; there is no simulated payment bypass. See [live integrations](docs/live-integrations.md).

The HTTP API schema is at `/docs/openapi.json`; MCP Streamable HTTP is at `/mcp`; seller discovery metadata is at `/.well-known/agent.json`. A zero-dependency JavaScript client and Python example are in `examples/`.

## Adapters and deterministic metrics

`src/adapters.js` provides Binance BNB RWA identity/status/prices, Yahoo Finance underlying references, DexScreener pool observations, PancakeSwap route quotes, optional xStocks API access, and a seed fallback. The live Binance catalog registers BNB Chain issuer tickers dynamically; the static registry retains the NVDA, TSLA and QQQ fallback entries. `src/engine.js` performs normalization and deterministic scoring. See `/docs` for formulas and caveats. Historical market state is durably appended to JSONL; the B402 replay guard is file-backed for single-process deployments.

No LLM is required for scoring. The Signal Call layer weighs reference valuation, after-hours/weekend gaps, issuer events, liquidity, and recent multi-source headlines. bStocks News fans out to Google News RSS and five optional API routes: Alpha Vantage NEWS_SENTIMENT, NewsAPI everything, Finnhub company news, Marketaux news, and FMP stock news. Add provider credentials in `.env` to enable them; feed status is shown in the dashboard, results are deduplicated, and sentiment uses provider scores when present with headline wording as fallback. The five-minute cache avoids repeating provider requests on each page render. A configurable OpenAI-compatible Qwen or OpenAI brain may review the deterministic baseline; every call preserves source evidence, its baseline recommendation, confidence, time horizon, and risk flags. Demo headlines are labelled samples. Configure `LLM_PROVIDER`, `LLM_MODEL`, `LLM_API_KEY` (or provider key), and optionally `LLM_BASE_URL`; calls otherwise use the deterministic baseline. No order is ever sent.

## Environment

See `.env.example`. Set `XSTOCKS_API_URL` to override its public metadata source. Real B402 settlement is implemented but disabled by default; enable `PAYMENTS_ENABLED` only after configuring verified merchant credentials, recipient, payment token, and amount.
