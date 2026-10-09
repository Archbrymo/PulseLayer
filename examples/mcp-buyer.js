import { x402Client } from '@x402/core/client';
import { x402HTTPClient } from '@x402/core/http';
import { B402ExactClientScheme } from '@bnb-chain/b402/client';
import { privateKeyToAccount } from 'viem/accounts';

const base = (process.env.PULSELAYER_URL || 'http://localhost:8787').replace(/\/$/, '');
const privateKey = process.env.BUYER_PRIVATE_KEY;
if (!privateKey) throw new Error('Set BUYER_PRIVATE_KEY in your local environment. Never commit or share it.');

const account = privateKeyToAccount(privateKey);
const payments = new x402HTTPClient(new x402Client().register(
  'eip155:*',
  new B402ExactClientScheme({ account, methods: ['eip3009'] }),
));

async function callMcp(method, params = {}) {
  const url = `${base}/mcp`;
  const request = { jsonrpc: '2.0', id: crypto.randomUUID(), method, params };
  const first = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(request),
  });
  if (first.status !== 402) {
    if (!first.ok) throw new Error(`MCP request failed (${first.status}): ${await first.text()}`);
    return first.json();
  }

  const challengeBody = await first.json();
  const required = payments.getPaymentRequiredResponse(
    name => first.headers.get(name), challengeBody,
  );
  const payload = await payments.createPaymentPayload(required);
  const retry = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...payments.encodePaymentSignatureHeader(payload),
    },
    body: JSON.stringify(request),
  });
  const body = await retry.json();
  if (!retry.ok) throw new Error(`Paid MCP retry failed (${retry.status}): ${JSON.stringify(body)}`);

  const settlement = payments.getPaymentSettleResponse(name => retry.headers.get(name));
  if (settlement?.success !== true) throw new Error('B402 settlement was not confirmed; MCP result withheld.');
  console.log('B402 settlement:', settlement.transaction || settlement.network || 'confirmed');
  return body;
}

const result = await callMcp('tools/call', {
  name: 'quote_pack',
  arguments: { symbol: process.env.PULSE_SYMBOL || 'NVDA' },
});
console.log(JSON.stringify(result.result?.structuredContent ?? result, null, 2));
