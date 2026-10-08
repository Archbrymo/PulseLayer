import {PulseLayer} from './client.js';
const pulse=new PulseLayer(process.env.PULSELAYER_URL||'http://localhost:8787');
console.log(await pulse.resolve('NVDA'));
console.log(await pulse.lastPrice('NVDA'));
// Paid requests take a wallet signer callback. It receives the 402 challenge
// and must return the signed x402 v2 B402 payment payload:
// const state=await pulse.marketState('NVDA',agentWallet.signB402.bind(agentWallet));
