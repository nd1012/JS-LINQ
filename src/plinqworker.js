/**
 * Parallel LINQ-like execution worker
 * 
 * @github https://github.com/nd1012/JS-LINQ
 * @license MIT
 * @copyright (c)2022 Andreas Zimmermann, wan24.de
 */

// Ensure a worker context
if(typeof WorkerGlobalScope=='undefined'||!(self instanceof WorkerGlobalScope))
	throw new Error('PLINQ worker seems not to run in a webworker context');

/**
 * PLINQ worker events
 * 
 * @var {EventTarget}
 */
const events=new EventTarget();

/**
 * Import scripts once
 * 
 * @param {string[]} uris Script URIs
 */
const importScriptsOnce=(uris)=>{
	if(!uris.length) return;
	let uri;
	for(uri of uris){
		if(importedScripts.includes(uri)) continue;
		importScripts(uri);
		importedScripts.push(uri);
	}
};

/**
 * Imported script URIs
 * 
 * @var {string[]}
 */
const importedScripts=[];

// Handle messages from the PLINQ master thread
self.addEventListener('message',async (e)=>{
	try{
		const context=e.data;
		importScriptsOnce(Array.from(Object.values(context.TypeInfo.values)));
		if(typeof context['Import']=='array'&&context.Import.length) importScriptsOnce(context.Import);
		const eventData={e,handle:true};
		events.dispatchEvent(new CustomEvent('message',{detail:eventData}));
		if(!eventData.handle) return;
		const arr=(new Function('data','return new '+context.Type+'(data);'))(context.Items),
			param=[];
		if(context.Parameters){
			let p;
			//TODO Deep parameter decoding
			for(p of context.Parameters)
				switch(p.type){
					case 'JS-LINQ':
						param.push(LinqArray.FromJson(p.value));
						break;
					case 'function':
						param.push(p.value.startsWith('async ')
							?new Function('...args','return new Promise(resolve=>resolve(await ('+p.value+')(...args));')
							:new Function('...args','return ('+p.value+')(...args);'));
						break;
					case null:
						param.push(p.value);
						break;
					default:
						debugger;
						throw new TypeError('Unknown parameter type "'+p.type+'"');
				}
		}
		const ed={context,arr,param,result:null,exception:null};
		events.dispatchEvent(new CustomEvent('before',{detail:ed}));
		if(!ed.result&&!ed.exception) ed.result=await arr[context.Method](...param);
		events.dispatchEvent(new CustomEvent('after',{detail:ed}));
		postMessage(ed.exception?{exception:ed.exception}:{result:LinqArray.Helper.IsLinqArray(ed.res)?ed.res.ToJson():JSON.stringify(ed.res)});
	}catch(ex){
		console.error('PLINQ worker exception',e,ex);
		debugger;
		const errorEvent={exception:ex};
		events.dispatchEvent(new CustomEvent('error',{detail:errorEvent}));
		postMessage({exception:errorEvent.exception});
	}
});
