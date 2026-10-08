export class PulseLayer {
 constructor(baseUrl='http://localhost:8787',fetcher=fetch){this.base=baseUrl.replace(/\/$/,'');this.fetch=fetcher}
 encode(value){const bytes=new TextEncoder().encode(JSON.stringify(value));let binary='';for(const byte of bytes)binary+=String.fromCharCode(byte);return btoa(binary)}
 async request(path,walletSigner){let r=await this.fetch(this.base+path);let body=await r.json();if(r.status===402&&walletSigner){let challenge=body;const header=r.headers.get('PAYMENT-REQUIRED');if(header){try{challenge=JSON.parse(atob(header.replace(/-/g,'+').replace(/_/g,'/')))}catch{}}const signed=await walletSigner(challenge);r=await this.fetch(this.base+path,{headers:{'payment-signature':this.encode(signed)}});body=await r.json();if(r.ok){const receipt=r.headers.get('PAYMENT-RESPONSE')||r.headers.get('X-PAYMENT-RESPONSE');if(!receipt)throw Object.assign(new Error('Paid response had no B402 settlement receipt; data withheld.'),{status:502,body});let settlement;try{settlement=JSON.parse(atob(receipt.replace(/-/g,'+').replace(/_/g,'/')))}catch{}if(settlement?.success!==true)throw Object.assign(new Error('B402 settlement was not confirmed; data withheld.'),{status:502,body})}}if(!r.ok)throw Object.assign(new Error(body.message||body.error||`Request failed (${r.status})`),{status:r.status,body});return body}
 assets(){return this.request('/api/v1/assets')}
 resolve(symbol){return this.request('/api/v1/resolve?symbol='+encodeURIComponent(symbol))}
 lastPrice(symbol){return this.request('/api/v1/price?symbol='+encodeURIComponent(symbol))}
 async marketState(symbol,walletSigner){return (await this.request('/api/v1/state?symbol='+encodeURIComponent(symbol),walletSigner)).data}
 async compare(symbol,walletSigner){return (await this.request('/api/v1/compare?symbol='+encodeURIComponent(symbol),walletSigner)).data}
 async signal(symbol,walletSigner){return (await this.request('/api/v1/signal?symbol='+encodeURIComponent(symbol),walletSigner)).data}
 async agentCalls(symbols,walletSigner){const q=symbols?.length?'?symbols='+encodeURIComponent(symbols.join(',')):'';return (await this.request('/api/v1/agent-calls'+q,walletSigner)).data}
}
