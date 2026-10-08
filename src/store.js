import{appendFile,mkdir,readFile,rename,writeFile}from'node:fs/promises';import{dirname,resolve}from'node:path';
export class HistoryStore {
 constructor(path=process.env.HISTORY_FILE||'data/history.jsonl'){this.path=resolve(path);this.queue=Promise.resolve()}
 async load(limit=500){try{const content=await readFile(this.path,'utf8');return content.trim().split('\n').slice(-limit).map(x=>JSON.parse(x)).reverse()}catch(e){if(e.code==='ENOENT')return[];throw e}}
 async append(item){this.queue=this.queue.then(async()=>{await mkdir(dirname(this.path),{recursive:true});await appendFile(this.path,JSON.stringify(item)+'\n','utf8')});return this.queue}
}
export class AgentCallStore {
 constructor(path=process.env.AGENT_CALLS_FILE||'data/agent-calls.jsonl'){this.path=resolve(path);this.queue=Promise.resolve()}
 async recent(limit=100){try{return(await readFile(this.path,'utf8')).trim().split('\n').filter(Boolean).slice(-limit).reverse().map(x=>JSON.parse(x))}catch(e){if(e.code==='ENOENT')return[];throw e}}
 async append(call){this.queue=this.queue.then(async()=>{await mkdir(dirname(this.path),{recursive:true});await appendFile(this.path,JSON.stringify(call)+'\n','utf8')});return this.queue}
}
// Crash-durable single-process replay storage. Multi-replica deployment should use shared Redis/Postgres CAS.
export class PaymentCallStore {
 constructor(path=process.env.PAYMENT_CALLS_FILE||'data/payment-calls.jsonl'){this.path=resolve(path);this.queue=Promise.resolve()}
 async recent(limit=50){try{return(await readFile(this.path,'utf8')).trim().split('\n').filter(Boolean).slice(-limit).reverse().map(x=>JSON.parse(x))}catch(e){if(e.code==='ENOENT')return[];throw e}}
 async append(call){this.queue=this.queue.then(async()=>{await mkdir(dirname(this.path),{recursive:true});await appendFile(this.path,JSON.stringify(call)+'\n','utf8')});return this.queue}
}
export class FileReplayStore {
 constructor(path=process.env.B402_REPLAY_FILE||'data/b402-replay.json'){this.path=resolve(path);this.values=new Map();this.ready=this.#load();this.queue=Promise.resolve()}
 async #load(){try{const x=JSON.parse(await readFile(this.path,'utf8'));for(const[k,v]of Object.entries(x))this.values.set(k,v)}catch(e){if(e.code!=='ENOENT')throw e}}
 async get(key){await this.ready;return this.values.get(key)??null}
 async update(key,fn){await this.ready;let result;const task=this.queue.then(async()=>{const change=fn(this.values.get(key)??null);result=change.result;if(change.op==='set')this.values.set(key,change.value);if(change.op==='delete')this.values.delete(key);if(change.op!=='noop'){await mkdir(dirname(this.path),{recursive:true});const tmp=this.path+'.tmp';await writeFile(tmp,JSON.stringify(Object.fromEntries(this.values)),'utf8');await rename(tmp,this.path)}});this.queue=task.catch(()=>{});await task;return result}
}
