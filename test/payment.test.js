import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import express from 'express';
import { paymentMiddleware } from '@x402/express';
import { x402ResourceServer } from '@x402/core/server';
import { x402Client } from '@x402/core/client';
import { x402HTTPClient } from '@x402/core/http';
import { B402ExactServerScheme, b402ReplayKey, reserveB402Slot, markB402Consumed } from '@bnb-chain/b402/server';
import { B402ExactClientScheme } from '@bnb-chain/b402/client';
import { privateKeyToAccount } from 'viem/accounts';
import { FileReplayStore } from '../src/store.js';

const address = '0x1111111111111111111111111111111111111111';
const token = '0x2222222222222222222222222222222222222222';

test('official x402/B402 middleware issues a 402 challenge, accepts a buyer retry, and returns settlement', async t => {
  const facilitator = {
    async getSupported() {
      return { kinds: [{ x402Version: 2, scheme: 'exact', network: 'eip155:56', extra: {
        assetTransferMethod: 'eip3009', name: 'United Stables', version: '1', signerAddress: address,
      } }] };
    },
    async verify() { return { isValid: true, payer: address }; },
    async settle() { return { success: true, payer: address, transaction: `0x${'a'.repeat(64)}`, network: 'eip155:56' }; },
  };
  const resourceServer = new x402ResourceServer(facilitator)
    .register('eip155:56', new B402ExactServerScheme({ facilitator }));
  await resourceServer.initialize();
  const app = express();
  app.use(express.json());
  const routes = { 'POST /mcp': { accepts: [{ scheme: 'exact', network: 'eip155:56', payTo: address,
    price: { asset: token, amount: '20000000000000000', extra: { assetTransferMethod: 'eip3009', name: 'United Stables', version: '1' } },
  }], description: 'Test paid MCP tool' } };
  const middleware = paymentMiddleware(routes, resourceServer, undefined, undefined, false);
  app.use((req, res, next) => req.method === 'POST' && req.path === '/mcp' && req.body?.params?.name === 'quote_pack' ? middleware(req, res, next) : next());
  app.post('/mcp', (req, res) => res.json({ jsonrpc: '2.0', id: req.body.id, result: { structuredContent: { data: 'paid intelligence' } } }));
  const http = app.listen(0, '127.0.0.1');
  t.after(() => new Promise(resolve => http.close(resolve)));
  await new Promise(resolve => http.once('listening', resolve));
  const url = `http://127.0.0.1:${http.address().port}/mcp`;
  const client = new x402HTTPClient(new x402Client().register('eip155:*', new B402ExactClientScheme({ account: privateKeyToAccount(`0x${'1'.repeat(64)}`), methods: ['eip3009'] })));
  const request = { jsonrpc: '2.0', id: 'buyer-demo', method: 'tools/call', params: { name: 'quote_pack', arguments: { symbol: 'NVDA' } } };
  const challenge = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(request) });
  assert.equal(challenge.status, 402);
  const required = client.getPaymentRequiredResponse(name => challenge.headers.get(name), await challenge.json());
  assert.equal(required.accepts[0].network, 'eip155:56');
  const payload = await client.createPaymentPayload(required);
  const paid = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', ...client.encodePaymentSignatureHeader(payload) }, body: JSON.stringify(request) });
  assert.equal(paid.status, 200);
  assert.deepEqual(await paid.json(), { jsonrpc: '2.0', id: 'buyer-demo', result: { structuredContent: { data: 'paid intelligence' } } });
  assert.equal(client.getPaymentSettleResponse(name => paid.headers.get(name))?.success, true);
});

test('B402 replay reservation survives restart and blocks duplicate settlement', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'pulselayer-b402-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const path = join(dir, 'replay.json');
  const key = b402ReplayKey({ transferMethod: 'eip3009', network: 'eip155:56', asset: token, payer: address, nonce: `0x${'1'.repeat(64)}` });
  const store = new FileReplayStore(path);
  assert.ok(await reserveB402Slot(store, key));
  await markB402Consumed(store, key);
  const afterRestart = new FileReplayStore(path);
  assert.equal(await reserveB402Slot(afterRestart, key), null);
});
