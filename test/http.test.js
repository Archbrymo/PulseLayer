import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';

test('HTTP API, council demo endpoints, x402 protection, MCP and discovery', async t => {
 const port = Number(process.env.TEST_PORT || 18878);
 const child = spawn(process.execPath, ['src/server.js'], { env: { ...process.env, PORT: String(port), HOST: '127.0.0.1', PAYMENTS_ENABLED: 'false', PULSE_DATA_MODE: 'demo' }, stdio: 'ignore' });
 t.after(() => child.kill());
 const base = `http://127.0.0.1:${port}`; let ready = false;
 for (let i = 0; i < 40; i++) { try { await fetch(base + '/health'); ready = true; break; } catch { await new Promise(resolve => setTimeout(resolve, 50)); } }
 assert.ok(ready);
 let r = await fetch(base + '/api/v1/assets'); assert.equal(r.status, 200);
 r = await fetch(base + '/health'); assert.equal((await r.json()).payments.status, 'setup-required');
 r = await fetch(base + '/api/v1/state?symbol=NVDA'); assert.equal(r.status, 503);
 r = await fetch(base + '/api/v1/state?symbol=NVDA', { headers: { 'x402-payment': 'demo' } }); assert.equal(r.status, 503, 'a demo header must not bypass B402');
 r = await fetch(base + '/v1/intelligence/NVDA'); assert.equal(r.status, 200);
 const intelligence = (await r.json()).data;
 assert.equal(intelligence.symbol, 'NVDA'); assert.equal(intelligence.reasoning.status, 'fallback');
 assert.equal(intelligence.reasoning.dataQuality.demo, true);
 assert.ok(intelligence.reasoning.analysts.adversarial_risk_analyst);
 assert.ok(['BUY','SELL','HOLD'].includes(intelligence.signal.action));
 assert.equal(intelligence.signal.brain.status,'fallback');
 assert.ok(intelligence.reasoning.judge.signalRecommendation);
 assert.deepEqual(Object.keys(intelligence.reasoning.judge.cases), ['bull','bear','neutral']);
 assert.deepEqual(Object.keys(intelligence.signal.council.judge.cases), ['bull','bear','neutral']);
 r = await fetch(base + '/v1/news/NVDA'); const news = (await r.json()).data;
 assert.equal(r.status, 200); assert.equal(news.symbol, 'NVDA'); assert.ok(Array.isArray(news.articles));
 r = await fetch(base + '/api/v1/reasoning/NVDA'); const reasoning = (await r.json()).data;
 assert.equal(r.status, 200); assert.equal(reasoning.judge.stance, 'insufficient_evidence');
 r = await fetch(base + '/v1/intelligence/NOTREAL'); assert.equal(r.status, 404);
 r = await fetch(base + '/assets/app.js'); assert.equal(r.status, 200); assert.match(await r.text(), /api\/v1\/bstocks\/news/);
 r = await fetch(base + '/.well-known/agent.json'); assert.equal((await r.json()).name, 'PulseLayer');
 r = await fetch(base + '/.well-known/b402.json'); const seller = await r.json(); assert.equal(seller.provider, '@bnb-chain/b402'); assert.equal(seller.seller.discovery.status, 'not-registered'); assert.equal(seller.status, 'setup-required');
 r = await fetch(base + '/mcp', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }) });
 const listed = (await r.json()).result.tools; assert.ok(listed.some(x => x.name === 'quote_pack')); assert.ok(listed.some(x => x.name === 'signal_call'));
 r = await fetch(base + '/mcp', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'quote_pack', arguments: { symbol: 'NVDA' } } }) }); assert.equal(r.status, 503);
});
