# PulseLayer Build Brief

Reposition PulseLayer. It is not a trading bot and not a human trading dashboard. It is a paid intelligence layer for other agents that trade, borrow, pool, margin, or report tokenized stocks on BNB Chain.

## Product

PulseLayer is the shared book of record across bStocks, Ondo, and xStocks. Other agents keep their strategy. They pay PulseLayer for instrument state before they act. Raw last price is free. Context is the SKU.

## One line

We do not trade the stock. We sell the truth other agents need before they trade, borrow, pool, or margin it.

## What every response must be able to return

- underlying, issuer, contract, price convention
- tradable now, pool eligible, halt or mint/redeem pause
- on-chain price, official close, weekend or after-hours gap, confidence
- cross-issuer gross spread, best quoted venue, and an explicit flag that gross spread is not an executable quote
- dividend convention: bStocks track the share and carry dividend treatment; Ondo is total-return and drifts from the share; xStocks is a third contract
- finance context when known: Venus or Lista collateral eligibility, Binance margin eligibility and collateral ratio, supply venue
- exclusions: fees, redemption limits, shortability, execution timing

## Free tier

Ticker resolve and last price.

## Paid packs

- quote pack: multi-issuer prices, gap, confidence
- spread pack: lowest vs highest venue, pool eligibility, not-a-quote disclaimer
- risk pack: weekend gap, halt, collateral eligibility, liquidation-relevant context
- event pack: dividend, split, earnings, mint/redeem pause
- yield pack: supply venue, dividend convention, weekend basis
- portfolio brief: proof-of-collateral freshness and position state

## Payment

Expose MCP tools and an HTTP face. Paid calls return 402 Payment Required and settle with x402 / B402 on BNB Chain before the payload. The dashboard may run fully on labeled local sample data in demo mode, but demo mode never authorizes HTTP or MCP calls and never creates a simulated receipt. Every paid API/MCP call requires an agent wallet to sign the B402 challenge.

## UI

- Replace "Trading agent control room" with "Agent intelligence" or "Book of record."
- Keep the scanner, but make it one tab called Opportunities.
- Hero is a paid call, not the watchlist: one request, one 402, one settled response for NVDA with gap, best issuer, pool eligible, confidence.
- Cross-issuer table stays, with the existing disclaimer, and "pool not eligible" must stay visible.
- Add a finance row the scanner does not cover: collateral venue, margin eligibility, dividend convention vs Ondo drift, halt status.
- Do not imply 91 names are scanned if the watchlist is 3. Say "3 in focus, 91 listed" or only show what is actually checked.
- Badge the signals "informational," never "trade" or "arbitrage opportunity" without the not-executable caveat.

## Out of scope

Do not build execution, wallets, or a strategy agent. Do not hide non-eligible pools. Do not present gross spread as fillable edge.
