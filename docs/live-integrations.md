# Live integrations and operator setup

## Market data

The live pipeline uses:

1. Binance's public RWA stock catalog to resolve current BNB Chain issuer listings and real token contract addresses.
2. Binance RWA dynamic and asset status endpoints for token/reference prices, multipliers, issuer halt/status reasons, dividends, and status timestamps.
3. Yahoo Finance chart data as the underlying equity price and latest completed official session close. If this feed is unavailable, PulseLayer retains the issuer's own reference price when supplied and marks the official close unavailable.
4. DexScreener BNB Chain token pools for observed pool price, pool liquidity, 24h volume, trades, and pair metadata.
5. PancakeSwap's routing API for exact-input buy quotes at $100, $500, $1,000, and $5,000. The largest sampled size at or below 0.5% quoted price impact is published as the estimated executable size. When the router cannot be reached or returns no quote, the size and slippage stay unavailable; pool depth is not presented as an execution quote. Quotes are read-only; PulseLayer never submits a swap.

Provider results are cached briefly and labeled in state responses. Issuer token prices remain the primary cross-issuer comparison; DEX spot is retained separately. A pool is marked routable only when it has a recognized USD stable quote, at least $15,000 reported liquidity, at least 8 daily trades, and no reported halt. Seed fallback data contains no contract addresses and is labeled `seed-demo`. Do not treat the thin-print threshold, sampled sizes, or route quote as an execution guarantee.

For xStocks, the service also reads the issuer's public asset quote and trading-hours/halt metadata. Binance RWA catalog remains the active BNB Chain registry because it reports current issuer families and contract addresses.

## B402 payments

The paid HTTP routes and paid MCP tools use the BNB Chain-maintained `@bnb-chain/b402` server adapter with the official x402 Express middleware. Real settlement stays off until `PAYMENTS_ENABLED=true` and all B402 credentials and merchant payment details are supplied. Startup fails closed when the B402 config is incomplete. Do not set the production flag with a placeholder payout wallet or token.

Configure `B402_BASE_URL`, `B402_CLIENT_ID`, `B402_ACCESS_TOKEN`, and `B402_PRIVATE_KEY` from merchant onboarding. Set `PAYMENT_RECIPIENT`, `PAYMENT_TOKEN_ADDRESS`, and `PAYMENT_AMOUNT_ATOMIC` for the desired BSC payment terms. The current sample token domain defaults describe United Stables (`United Stables`, version `1`) and the `eip3009` method; verify those terms and facilitator-supported methods with the actual merchant account before enabling payments.

The dashboard's **Connect BNB wallet** control connects an injected Binance/EVM wallet for account display; it is not a backend login or identity proof. A paid call reads the x402 v2 `PAYMENT-REQUIRED` header, checks its recipient and token against PulseLayer's published `/health` payment terms, requests an EIP-3009 typed-data signature, and retries with `PAYMENT-SIGNATURE`. It only displays the paid payload after a successful B402 settlement and `PAYMENT-RESPONSE`. The browser payer currently supports `eip3009`; configure `PAYMENT_TRANSFER_METHOD=eip3009` and a compatible facilitator/token. Unsupported transfer methods fail before signing. The sample browser uses the injected wallet provider and does not export or store private keys.

The dashboard demo is a browser-local preview backed by explicitly labeled sample fixtures. It never sends a paid request, creates a simulated receipt, or changes API/MCP authorization. Paid HTTP routes and MCP tools always require a wallet-signed B402 payment when enabled. When B402 merchant configuration is absent, paid endpoints fail closed; configure merchant credentials before connecting a wallet to a paid call.

A file-backed replay store protects a single service process across restarts. Before running multiple replicas, replace it with a shared, atomic Redis or Postgres store and provide an on-settlement-unknown reconciliation workflow.

## Persistence

Market snapshots append to `data/history.jsonl`; set `HISTORY_FILE` to move it. Replay state is stored at `data/b402-replay.json`. These runtime files are ignored by Git.

## Dynamic listings and dashboard views

At startup, PulseLayer imports the full BNB Chain stock catalog, registers discovered tickers, and exposes every bStocks contract through `GET /api/v1/issuers/bstocks`. If Binance's catalog is unavailable, the app keeps its core tracked symbols and reports an empty live bStocks catalog rather than inventing listings. The dashboard focuses on Overview, Weekend and market dislocations, and bStocks inventory. Dislocation signals cover the NVDA, TSLA, and QQQ focus list; selecting another catalog-listed asset adds its live state to that view.
