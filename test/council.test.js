import test from 'node:test';
import assert from 'node:assert/strict';
import { IntelligenceCouncil, councilSchemas } from '../src/council.js';

test('council returns the four structured roles with evidence provenance and uncertainty', async () => {
 const council = new IntelligenceCouncil();
 council.apiKey = ''; council.model = '';
 const news = { asOf: new Date().toISOString(), articles: [{ id: 'n1', title: 'Sample headline', url: 'https://news.example/story', publishedAt: new Date().toISOString(), source: 'Example News', provenance: 'Example News', demo: true }] };
 const market = { source: 'seed-demo', asOf: new Date().toISOString(), dataQuality: { fallback: true }, haltStatus: 'unknown', venues: [{ issuer: 'bStocks', thinPrint: true }] };
 const result = await council.analyze({ symbol: 'NVDA', market, news });
 assert.deepEqual(Object.keys(result.analysts).sort(), ['adversarial_risk_analyst','market_structure_analyst','news_catalyst_analyst']);
 assert.equal(result.status, 'fallback');
 assert.equal(result.dataQuality.demo, true);
 assert.equal(result.sources[0].url, 'https://news.example/story');
 assert.ok(result.analysts.news_catalyst_analyst.catalysts[0].headlineId === 'n1');
 assert.ok(result.judge.uncertainty.length > 0);
 assert.deepEqual(Object.keys(result.judge.cases), ['bull','bear','neutral']);
 assert.ok(result.judge.cases.neutral.thesis);
 assert.deepEqual(result.judge.cases.bull.evidenceIds, []);
 assert.ok(councilSchemas.council_judge);
});

test('issuer halt always overrides council stance', async () => {
 const council = new IntelligenceCouncil(); council.apiKey = ''; council.model = '';
 const result = await council.analyze({ symbol: 'TSLA', market: { haltStatus: 'halted', venues: [{ reasonCode: 'ASSET_PAUSED' }] }, news: { articles: [] } });
 assert.equal(result.judge.stance, 'cautious');
 assert.match(result.judge.conclusion, /halt|pause/i);
 assert.ok(result.judge.evidenceIds.includes('issuer-status'));
 assert.deepEqual(result.judge.cases.neutral.evidenceIds, ['issuer-status']);
 assert.equal(result.judge.cases.bull.confidence, 0);
});

test('Qwen-compatible council runs three analysts and a judge against supplied evidence', async t => {
 const env = Object.fromEntries(['LLM_PROVIDER','LLM_MODEL','LLM_API_KEY','LLM_BASE_URL'].map(k => [k, process.env[k]]));
 t.after(() => { for (const [k,v] of Object.entries(env)) v === undefined ? delete process.env[k] : process.env[k] = v; });
 process.env.LLM_PROVIDER = 'qwen'; process.env.LLM_MODEL = 'qwen-test'; process.env.LLM_API_KEY = 'test-key'; process.env.LLM_BASE_URL = 'https://model.example/v1';
 const originalFetch = globalThis.fetch; let calls = 0;
 t.after(() => { globalThis.fetch = originalFetch; });
 globalThis.fetch = async (url, options) => {
  assert.equal(url, 'https://model.example/v1/chat/completions'); assert.equal(options.headers.authorization, 'Bearer test-key'); calls++;
  const system = JSON.parse(options.body).messages[0].content;
  const role = Object.keys(councilSchemas).find(name => system.includes(`the ${name} in`));
  const responses = {
   news_catalyst_analyst: { catalysts: [{ headlineId: 'n1', assessment: 'Headline provided; materiality uncertain.', materiality: 'unknown', confidence: 0.4 }], summary: 'Limited headline evidence.', uncertainty: ['No article body.'] },
   market_structure_analyst: { observations: [{ topic: 'snapshot', assessment: 'Use provided metrics only.', evidenceIds: ['market-snapshot'] }], summary: 'Supplied market snapshot only.', uncertainty: [] },
   adversarial_risk_analyst: { risks: [], invalidators: [], uncertainty: ['Limited evidence.'] },
   council_judge: { conclusion: 'Mixed evidence.', stance: 'mixed', confidence: 0.5, agreements: [], disagreements: ['Headline lacks context.'], keyRisks: [], evidenceIds: ['n1','market-snapshot'], uncertainty: ['Limited evidence.'] }
  };
  return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(responses[role]) } }] }), { status: 200, headers: { 'content-type': 'application/json' } });
 };
 const council = new IntelligenceCouncil(); const result = await council.analyze({ symbol: 'NVDA', market: { haltStatus: 'clear', venues: [] }, news: { articles: [{ id: 'n1', title: 'Test', url: 'https://example.test', publishedAt: new Date().toISOString(), source: 'Test News' }] } });
 assert.equal(calls, 4); assert.equal(result.status, 'council'); assert.equal(result.provider, 'qwen');
 assert.equal(result.judge.stance, 'mixed'); assert.ok(result.judge.evidenceIds.includes('n1'));
});

test('judge signal call requires cited directional evidence and never overrides a halt', async t => {
 const env = Object.fromEntries(['LLM_PROVIDER','LLM_MODEL','LLM_API_KEY','LLM_BASE_URL'].map(k => [k, process.env[k]]));
 t.after(() => { for (const [k,v] of Object.entries(env)) v === undefined ? delete process.env[k] : process.env[k] = v; });
 process.env.LLM_PROVIDER='qwen'; process.env.LLM_MODEL='qwen-test'; process.env.LLM_API_KEY='test-key'; process.env.LLM_BASE_URL='https://model.example/v1';
 const originalFetch=globalThis.fetch; t.after(()=>{globalThis.fetch=originalFetch});
 globalThis.fetch=async(_url,options)=>{const system=JSON.parse(options.body).messages[0].content,role=Object.keys(councilSchemas).find(name=>system.includes(`the ${name} in`));const payload=role==='council_judge'?{conclusion:'Direction supported by supplied factor.',stance:'supportive',confidence:.8,agreements:[],disagreements:[],keyRisks:[],evidenceIds:['price-direction'],uncertainty:[],signalRecommendation:{action:'BUY',horizon:'1–3 sessions',thesis:'Cited directional evidence supports review.',confidence:.8,evidenceIds:['price-direction']}}:role==='news_catalyst_analyst'?{catalysts:[],summary:'No headline claims.',uncertainty:[]}:role==='market_structure_analyst'?{observations:[],summary:'Supplied snapshot only.',uncertainty:[]}:{risks:[],invalidators:[],uncertainty:[]};return new Response(JSON.stringify({choices:[{message:{content:JSON.stringify(payload)}}]}),{status:200})};
 const signal={action:'HOLD',horizon:'1–3 sessions',thesis:'Baseline hold',confidence:60,evidence:[{id:'price-direction',value:1}]};
 const council=new IntelligenceCouncil();const news={articles:[]};
 const active=await council.analyze({symbol:'NVDA',market:{haltStatus:'clear',venues:[]},news,signal});
 assert.equal(active.judge.signalRecommendation.action,'BUY');assert.ok(active.judge.signalRecommendation.evidenceIds.includes('price-direction'));
 assert.deepEqual(Object.keys(active.judge.cases), ['bull','bear','neutral']);
 const halted=await council.analyze({symbol:'TSLA',market:{haltStatus:'unknown',events:[{type:'Trading halted'}],venues:[]},news,signal});
 assert.equal(halted.judge.signalRecommendation.action,'HOLD');
});
