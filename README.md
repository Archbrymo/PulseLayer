# PulseLayer

PulseLayer is a paid intelligence layer and shared book of record for agents using tokenized stocks on BNB Chain. It returns the context agents need before they trade, borrow, pool, margin, or report an asset; it does not execute trades or supply a strategy agent. The product requirements are defined in the [PulseLayer build brief](docs/build-brief.md).

## Run

- Node.js 20.6+: `cp .env.example .env && npm start`
- Local fixture demo: `PULSE_DATA_MODE=demo npm run demo` (opens the dashboard and enables the clearly labeled `/v1/...` council endpoints)
- Open `http://localhost:8787` for the control room and `/docs` for API/MCP documentation.
- Docker: `cp .env.example .env && docker compose up --build`
- Verify the implementation: `npm test`

The service uses live issuer, reference-price, and pool feeds when available, then falls back to clearly labeled deterministic demo data. Contract addresses are resolved from the live Binance RWA catalog; demo records contain no contract addresses.

## Product surface

Free endpoints: live asset catalog, complete bStocks contract inventory, issuer resolution and normalized last price. The Binance catalog currently contributes hundreds of BNB Chain instruments and is refreshed from the upstream listing feed. Paid packs: full market state, issuer comparison, executable-size estimates, events and in-process history. Paid routes return HTTP 402 and an x402 challenge. Real settlement is implemented through the BNB Chain-maintained `@bnb-chain/b402` package and official x402 Express middleware. It remains disabled until valid merchant B402 credentials, payout wallet, token contract, and amount are configured. The browser-only dashboard demo uses clearly labeled local fixtures and never authorizes an HTTP or MCP call. Paid HTTP and MCP calls fail closed until B402 settlement is configured and require wallet-signed payment when enabled; there is no simulated payment bypass. See [live integrations](docs/live-integrations.md).

The HTTP API schema is at `/docs/openapi.json`; MCP Streamable HTTP is at `/mcp`; seller discovery metadata is at `/.well-known/agent.json`. A zero-dependency JavaScript client and Python example are in `examples/`.

## Adapters and deterministic metrics

`src/adapters.js` provides Binance BNB RWA identity/status/prices, Yahoo Finance underlying references, DexScreener pool observations, PancakeSwap route quotes, optional xStocks API access, and a seed fallback. The live Binance catalog registers BNB Chain issuer tickers dynamically; the static registry retains the NVDA, TSLA and QQQ fallback entries. `src/engine.js` performs normalization and deterministic scoring. See `/docs` for formulas and caveats. Historical market state is durably appended to JSONL; the B402 replay guard is file-backed for single-process deployments.

No LLM is required for scoring. The Signal Call layer weighs deterministic reference valuation, after-hours/weekend gaps, issuer events, liquidity, and recent multi-source headlines. News comes from Google News RSS and optional Alpha Vantage, NewsAPI, Finnhub, Marketaux, FMP, and configured RSS providers. Items retain headline, source, publication timestamp, URL, provider provenance, and feed coverage; results are deduplicated and cached for five minutes.

The optional OpenAI-compatible council runs a News & Catalyst Analyst, Market Structure Analyst, Adversarial Risk Analyst, and Council Judge over sourced news and the deterministic snapshot. The judge returns bull, bear, and neutral conditional cases with evidence IDs, conditions, and invalidators, plus a BUY/SELL/HOLD signal. Directional calls require cited directional evidence; an issuer-reported halt always forces HOLD. Model output cannot change prices, liquidity, or issuer status. Configure `LLM_PROVIDER`, `LLM_MODEL`, `LLM_API_KEY` (or `OPENAI_API_KEY` / `DASHSCOPE_API_KEY`), and optionally `LLM_BASE_URL`. For a Bitget AI hackathon Qwen key, use `BITGET_QWEN_API_KEY`; the default gateway is `https://hackathon.bitgetops.com/v1` and the model is configured with `LLM_MODEL` (commonly `qwen3.6-plus`). `LLM_REQUEST_TIMEOUT_MS` defaults to 30000 for slower council responses. With no credentials or an unavailable provider, the service returns a clearly labeled deterministic fallback. Results are cached for 60 seconds. Local demo routes mark fixture data and settlement as mock data. No order is ever sent.

Council API (ticker is a supported underlying such as NVDA, TSLA, or QQQ): `GET /v1/intelligence/{ticker}` returns market state, sourced news, council reasoning, and the corresponding signal; `GET /v1/news/{ticker}` returns timestamped source-linked news; `GET /v1/reasoning/{ticker}` returns the four council roles and three scenario cases. `/api/v1/...` aliases are also available. The Opportunities and Signal calls views display the same council cases. The paid quote pack includes its council signal and cases. In the UI, exit “Try dashboard demo” to call the local council; demo market inputs remain explicitly labeled. Live API paths use B402 payment middleware when enabled, and the wallet is prompted only after a user clicks a paid call.

## Environment

See `.env.example`. Set `XSTOCKS_API_URL` to override its public metadata source. Real B402 settlement is implemented but disabled by default; enable `PAYMENTS_ENABLED` only after configuring verified merchant credentials, recipient, payment token, and amount.
