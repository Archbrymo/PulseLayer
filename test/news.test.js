import test from 'node:test';
import assert from 'node:assert/strict';
import {CompositeAdapter} from '../src/adapters.js';

test('falls back to company-aware Google News RSS when configured RSS is unavailable',async()=>{
 const originalFetch=globalThis.fetch,oldFeed=process.env.NEWS_RSS_URL,oldMode=process.env.PULSE_DATA_MODE;let requests=0;
 try{
  process.env.NEWS_RSS_URL='https://rss.example.test/feed';delete process.env.PULSE_DATA_MODE;
  globalThis.fetch=async url=>{requests++;if(String(url).startsWith('https://rss.example.test/'))return new Response('unavailable',{status:503});assert.match(String(url),/news\.google\.com\/rss\/search/);assert.equal(new URL(String(url)).searchParams.get('q'),'Test Robotics ZZNEWS stock');return new Response('<rss><channel><item><title>Test Robotics beats estimates and raises guidance</title><link>https://example.test/story</link><pubDate>Thu, 08 Oct 2026 20:00:00 GMT</pubDate><source>Example Finance</source></item></channel></rss>',{status:200,headers:{'content-type':'application/rss+xml'}})};
  const news=await new CompositeAdapter().getNews('ZZNEWS','Test Robotics');
  assert.equal(requests,2);assert.equal(news.length,1);assert.equal(news[0].source,'Example Finance');assert.equal(news[0].link,'https://example.test/story');
 }finally{globalThis.fetch=originalFetch;if(oldFeed===undefined)delete process.env.NEWS_RSS_URL;else process.env.NEWS_RSS_URL=oldFeed;if(oldMode===undefined)delete process.env.PULSE_DATA_MODE;else process.env.PULSE_DATA_MODE=oldMode}
});
