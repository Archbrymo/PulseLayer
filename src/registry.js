// Static identity metadata only. Contract mappings come from Binance's live issuer catalog.
export const registry = {
 NVDA:{name:'NVIDIA Corporation',type:'equity',referenceSymbol:'NVDA',issuers:['Ondo','xStocks','bStocks']},
 TSLA:{name:'Tesla, Inc.',type:'equity',referenceSymbol:'TSLA',issuers:['Ondo','xStocks','bStocks']},
 QQQ:{name:'Invesco QQQ Trust',type:'etf',referenceSymbol:'QQQ',issuers:['Ondo','xStocks','bStocks']}
};
const ISSUERS={1:'Ondo',2:'xStocks',3:'bStocks'};
let liveCatalogLoaded=false,liveCatalogAsOf=null;
export const catalogStatus=()=>({live:liveCatalogLoaded,asOf:liveCatalogAsOf});
export function registerCatalogItems(items=[]){
 const grouped=new Map();
 for(const item of items){
  const ticker=String(item.ticker||'').trim().toUpperCase(),issuer=ISSUERS[Number(item.type)];
  if(!/^[A-Z0-9.-]{1,16}$/.test(ticker)||!issuer||String(item.chainId)!=='56'||!/^0x[a-f\d]{40}$/i.test(String(item.contractAddress||'')))continue;
  const entry=grouped.get(ticker)||[];entry.push({issuer,symbol:item.symbol||ticker,address:item.contractAddress,chainId:Number(item.chainId)||56,decimals:Number(item.d)||18,catalogUpdatedAt:item.lastUpdateTime?new Date(item.lastUpdateTime).toISOString():null});grouped.set(ticker,entry);
 }
 for(const [ticker,instruments] of grouped){
  const prior=registry[ticker]||{};
  registry[ticker]={name:prior.name||instruments[0]?.name||ticker,type:prior.type||'equity',referenceSymbol:ticker,issuers:[...new Set(instruments.map(x=>x.issuer))],instruments};
 }
 liveCatalogLoaded=true;liveCatalogAsOf=new Date().toISOString();
 return registry;
}
export const resolve=s=>registry[String(s||'').toUpperCase()]?{underlying:String(s).toUpperCase(),...registry[String(s).toUpperCase()]}:null;
