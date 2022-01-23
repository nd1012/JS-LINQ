/**
 * Parallel LINQ-like execution
 * 
 * @github https://github.com/nd1012/JS-LINQ
 * @license MIT
 * @copyright (c)2022 Andreas Zimmermann, wan24.de
 */
class PLinq{
	/**
	 * Default thread count
	 */
	static #DefaultThreadCount=10;
	/**
	 * Maximum number of threads
	 * 
	 * @var {int}
	 */
	static #MaxThreads=null;
	/**
	 * Number of threads to pre-fork
	 * 
	 * @var {int}
	 */
	static #PreFork=0;
	/**
	 * Context prototype
	 * 
	 * @var {object}
	 */
	static #Context={};
	/**
	 * URI to the worker
	 * 
	 * @var {string}
	 */
	static #WorkerUri=null;
	/**
	 * LINQ array type script names
	 * 
	 * @var {object}
	 */
	static #TypeInfo={};
	/**
	 * Queries
	 * 
	 * @var {Map<PLinqQuery>}
	 */
	static #Queries=new Map();
	/**
	 * All threads
	 * 
	 * @var {Map<PLinqThread>}
	 */
	static #AllThreads=new Map();
	/**
	 * Pre-forked threads
	 * 
	 * @var {PLinqThread[]}
	 */
	static #PreForked=[];
	/**
	 * Pre-fork thread
	 * 
	 * @var {Promise}
	 */
	static #ForkThread=null;

	/**
	 * Get the default thread count
	 * 
	 * @return {int} Default thread count
	 */
	static get DefaultThreadCount(){return this.#DefaultThreadCount;}
	/**
	 * Set the default thread count
	 * 
	 * @param {int} value Default thread count
	 */
	static set DefaultThreadCount(value){this.#DefaultThreadCount=value;}
 
	/**
	 * Get the maximum number of threads
	 * 
	 * @return {int} Maximum number of threads or zero for unlimited
	 */
	static get MaxThreads(){return this.#MaxThreads;}
	/**
	 * Set the maximum number of threads
	 * 
	 * @param {int} value Maximum number of threads or zero for unlimited
	 */
	static set MaxThreads(value){this.#MaxThreads=value;}

	/**
	 * Get the number of running threads
	 * 
	 * @return {int} Number of running threads
	 */
	static get CurrentThreadCount(){
		let count=0,
			threads;
		for(threads of this.#Queries.values()) count+=threads.length;
		return count;
	};

	/**
	 * Get all (incl. pre-forked) thread count
	 * 
	 * @return {int} Number of used threads
	 */
	static get AllThreadCount(){return this.#AllThreads.size;}

	/**
	 * Get the number of threads to prefork
	 * 
	 * @return {int}
	 */
	static get PreFork(){return this.#PreFork;}
	/**
	 * Set the number of threads to prefork
	 * 
	 * @param {int} value Number of threads or zero to disable pre-forking
	 */
	static set PreFork(value){
		//TEST
		if(value&&this.#MaxThreads&&value>this.#MaxThreads) throw new RangeError();
		this.#PreFork=value;
		if(value){
			this.EnsurePreForked(true);
			return;
		}
		let thread;
		for(thread of this.#PreForked){
			thread.Resolve();
			thread.Worker.terminate();
			this._DisposeThread(thread);
		}
		this.#PreForked.splice();
	}
 
	/**
	 * Get the context prototype
	 * 
	 * These keys are reserved and will be set automatic:
	 * 
	 * - `UUID` (query UUID)
	 * - `ID` (thread ID)
	 * - `Type` (LINQ array type)
	 * - `TypeInfo`* (type information)
	 * - `Method` (method name)
	 * - `Parameters` (method parameters)
	 * - `Items` (items)
	 * 
	 * However, you can overwrite the values (*) of these keys in the context prototype, if required.
	 * 
	 * @return {object} Context
	 */
	static get Context(){return this.#Context;}

	/**
	 * Get the cloned and useable context prototype
	 * 
	 * @return {object} Context
	 */
	static get UseableContext(){
		//TEST
		const context=Object.assign({
			TypeInfo:this.TypeInfo
		},this.Context);
		return JSON.parse(JSON.stringify(context));
	}

	/**
	 * Get the URI to the worker
	 * 
	 * @return {string} URI
	 */
	static get WorkerUri(){return this.#WorkerUri;}
	/**
	 * Set the URI to the worker
	 * 
	 * @param {string} value URI
	 */
	static set WorkerUri(value){this.#WorkerUri=value}

	/**
	 * LINQ array type script names
	 * 
	 * The key is a LINQ array type name, like `LinqArray`, the value the script filename to use (like `linq.min.js`).
	 * 
	 * @return {object} Type info
	 */
	static get TypeInfo(){return this.#TypeInfo;}

	/**
	 * Determine if it's possible to create a new thread
	 * 
	 * @return {boolean} Can create a new thread?
	 */
	static get CanCreateThread(){return !this.#MaxThreads||this.AllThreadCount<this.#MaxThreads;}//TEST

	/**
	 * Get a query result handler that creates a new LINQ array with all the results as items
	 * 
	 * This handler does not assume the thread returns an array.
	 * 
	 * @return {Function<PLinqQuery,LinqArray>} Handler
	 */
	static get AppendResultHandler(){return (query)=>new query.Array.constructor(Array.from(Object.values(query.Result)))._SetParent(query.Array)};//TEST

	/**
	 * Get a query result handler that joins resulting groups
	 * 
	 * This handler assumes that each thread returns a result like `GroupBy`.
	 * 
	 * @return {Function<PLinqQuery,LinqArray>} Handler
	 */
	static get JoinGroupsResultHandler(){
		//TEST
		return (query)=>{
			const res=new query.Array.constructor()._SetParent(query.Array);
			let result,
				group;
			for(result of Object.values(query.Result)){
				group=res.FirstOrDefault(group=>group.GroupKey==result.GroupKey);
				if(group){
					group.AppendAllThis(result);
				}else{
					group=new query.Array.constructor(result);
					group._SetGroupKey(result.GroupKey);
					res.push(group);
				}
			}
			return res;
		};
	}

	/**
	 * Create a context
	 * 
	 * **NOTE**: Keys from the context prototype and some fixed keys will overwrite existing keys in the given context!
	 * 
	 * You may configure a query using these keys:
	 * 
	 * - `Threads`: Number of threads to use
	 * - `Import`: URIs of JavaScripts to import into each webworker context
	 * 
	 * @param {object} context (optional) Context
	 * @return {object} Context
	 */
	static CreateContext(context={}){return Object.assign(context,this.UseableContext);}//TEST

	/**
	 * Ensure pre-forked threads
	 * 
	 * @param {boolean} timer (optional) Set a timer (default: `false`)?
	 */
	static EnsurePreForked(timer=false){
		//TEST
		if(!this.#PreFork) return;
		if(timer&&this.CanCreateThread&&this.#PreForked.length<this.#PreFork){
			setTimeout(()=>PLinq.EnsurePreForked(),0);
			return;
		}
		const self=this,
			reuse=(thread)=>{
				if(!self.#PreFork||self.#PreForked.length>=self.#PreFork||(self.#MaxThreads&&self.AllThreadCount>self.#MaxThreads)) return false;
				self.#PreForked.push(thread);
				return true;
			}
		this.#ForkThread=(async ()=>{
			for(let i=self.#PreForked.length-1,thread;i<self.#PreFork&&self.CanCreateThread;i++){
				thread=new PLinqThread(reuse);
				self.#AllThreads.set(thread.ID,thread);
				self.#PreForked.push(thread);
			}
			self.#ForkThread=null;
		})();
	}

	/**
	 * Parallel query that works with chunks of a LINQ array
	 * 
	 * The default chunking handler will chunk the source array into a number of chunks that is calculated using this formula:
	 * 
	 * 	chunk = MIN(1, FLOOR(count / threads))
	 * 
	 * A custom chunking handler will get these parameters:
	 * 
	 * - LINQ array
	 * - Context
	 * - Number of threads
	 * - Thread context array
	 * 
	 * The handler needs to fill the thread context array with one context for each thread, that contains an array of items to work with in the `Items` property.
	 * 
	 * The default result handler will concat all resulting arrays into a new LINQ array instance. If the threads won't return flat arrays, you can use the 
	 * `PLinq.*ResultHandler` instead (or use any custom handler).
	 * 
	 * **NOTE**: The result handler won't be able to access the thread(s) (contexts) anymore!
	 * 
	 * Per default all available threads will be used (can be configured with a `context` having the thread count in `Threads`).
	 * 
	 * @param {LinqArray} arr LINQ array
	 * @param {string} method Method to execute
	 * @param {any[]} param (optional) Parameters
	 * @param {object} context (optional) Context
	 * @param {int} threads (optional) Number of threads to use
	 * @param {AsyncFunction<PLinqQuery,any>} result (optional) Result handler (gets the query as parameter and needs to return the result to use)
	 * @param {AsyncFunction<LinqArray,object,int,object[],void>} chunking (optional) Chunking handler
	 * @return {any} Result
	 */
	static async QueryChunked(arr,method,param=null,context=null,threads=null,result=null,chunking=null){
		//TEST
		arr._EnsureFinite();
		context??=this.CreateContext();
		context.Type=arr.Type;
		context.Method=method;
		context.Parameters=this._CreateParameterInfo(param);
		threads??=LinqArray.Helper.IsUndefined(context['Threads'])
			?Math.min(2,this.#MaxThreads?this.#MaxThreads-this.AllThreadCount:PLinq.DefaultThreadCount)
			:context.Threads;
		const threadContext=[];
		if(chunking){
			await chunking(arr,context,threads,threadContext);
		}else{
			const len=Math.min(1,Math.floor(arr.Count()/threads));
			let chunk;
			for(chunk of arr.Chunk(len)) threadContext.push(Object.assign(context,{Items:chunk}));
		}
		let query=null;
		try{
			query=await this._CreateQuery(arr,context,threadContext);
			const res=await query.Result;
			return result?await result(query):(new arr.constructor())._SetParent(arr).ConcatAllThis(Array.from(Object.values(res)));
		}finally{
			if(query) this.#Queries.delete(query.UUID);
		}
	}

	/**
	 * Create a thread
	 * 
	 * @return {PLinqThread} Thread
	 */
	static async _CreateThread(){
		//TEST
		const self=this;
		for(;this.#ForkThread;){
			await this.#ForkThread;
			if(this.#PreForked.length||this.CanCreateThread) break;
			await new Promise(resolve=>{
				const check=()=>{
					if(!self.#PreForked.length&&!self.CanCreateThread){
						setTimeout(check,50);
					}else{
						resolve();
					}
				};
				setTimeout(check,50);
			});
		}
		if(this.#PreForked.length) return this.#PreForked.pop();
		const res=new PLinqThread();
		this.#AllThreads.set(res.ID,res);
		return res;
	}

	/**
	 * Dispose a thread
	 * 
	 * @param {PLinqThread} thread Thread
	 */
	static _DisposeThread(thread){
		//TEST
		if(this.#AllThreads.has(thread.ID)) this.#AllThreads.delete(thread.ID);
		this.EnsurePreForked(true);
	}

	/**
	 * Create a query
	 * 
	 * @param {LinqArray} arr LINQ array
	 * @param {object} mainContext Main context
	 * @param {object[]} threadContext Thread contexts
	 * @return {PLinqQuery} Query
	 */
	static async _CreateQuery(arr,mainContext,threadContext){
		//TEST
		const threads=[];
		let context,
			thread;
		for(context of threadContext){
			thread=await this._CreateThread();
			thread.Prepare(context);
			threads.push(thread);
		}
		const res=new PLinqQuery(arr,mainContext,threads);
		this.#Queries.set(res.UUID,res);
		return res;
	}

	/**
	 * Create parameter informations
	 * 
	 * @param {any[]} param Parameters
	 * @return {any[]} Parameter informations
	 */
	static _CreateParameterInfo(param){
		//TEST
		//TODO Deep parameter encoding
		const res=[];
		let p;
		for(p of param)
			switch(true){
				case p instanceof LinqArray:
					res.push({
						_isParameterInfo:true,
						type:'JS-LINQ',
						value:p.ToJson()
					});
					break;
				case LinqArray.Helper.IsFunction(p):
					res.push({
						_isParameterInfo:true,
						type:'function',
						value:p.toString()
					});
					break;
				default:
					res.push({
						_isParameterInfo:true,
						type:null,
						value:p
					});
					break;
			}
		return res;
	}
}

// Determine the maximum number of threads
PLinq.MaxThreads=Math.max(10,Math.min(2,'hardwareConcurrency' in navigator?navigator.hardwareConcurrency-4:PLinq.DefaultThreadCount));

// Determine the PLINQ worker URI
if(window&&'document' in window) PLinq.WorkerUri=document.currentScript.src.replace(/^(.*)(\/[^\/]*)?$/,"$1")+'/plinqworker.min.js';

/**
 * PLINQ query
 */
class PLinqQuery{
	/**
	 * ID
	 * 
	 * @var {string}
	 */
	#ID=null;
	/**
	 * LINQ array
	 * 
	 * @var {LinqArray}
	 */
	#Array=null;
	/**
	 * Context
	 * 
	 * @var {object}
	 */
	#Context=null;
	/**
	 * Threads
	 * 
	 * @var {PLinqThread[]}
	 */
	#Threads=null;
	/**
	 * Promise
	 * 
	 * @var {Promise}
	 */
	#Promise=null;
	/**
	 * Results
	 * 
	 * @var {object}
	 */
	#Result={};

	/**
	 * Get the ID
	 * 
	 * @return {string} ID
	 */
	get ID(){return this.#ID;}

	/**
	 * Get the LINQ array
	 * 
	 * @return {LinqArray} LINQ array
	 */
	get Array(){return this.#Array;}
 
	/**
	 * Get the context
	 * 
	 * @return {object} Context
	 */
	get Context(){return this.#Context;}
 
	/**
	 * Get the threads
	 * 
	 * @return {PLinqThread[]} Threads
	 */
	get Threads(){return this.#Threads;}

	/**
	 * Get the promise
	 * 
	 * @return {Promise<object>} Promise
	 */
	get Promise(){return this.#Promise;}

	/**
	 * Get the results
	 * 
	 * @return {object} Results
	 */
	get Result(){return this.#Result;}
 
	/**
	 * Constructor
	 * 
	 * @param {LinqArray} arr LINQ array
	 * @param {object} context Context
	 * @param {PLinqThread[]} threads Threads
	 */
	constructor(arr,context,threads){
		this.#ID=PLinqThread.CreateUUID();
		this.#Array=arr;
		this.#Context=context;
		this.#Threads=threads;
		let thread;
		for(thread of threads){
			thread.Context.UUID=this.#ID;
			thread.Start();
		}
		const self=this;
		this.#Promise=(async ()=>{
			const errors=[];
			let thread;
			for(thread of self.#Threads)
				try{
					self.#Result[thread.ID]=await thread.Promise;
					thread.Finish();
				}catch(ex){
					debugger;
					errors.push(ex);
					PLinq._DisposeThread(thread);
				}
			self.#Threads=null;
			if(errors.length){
				const msg='PLINQ query ID '+self.ID+' had errors';
				console.error(msg,self,errors);
				debugger;
				throw new Error(msg);
			}
			return self.#Result;
		})();
	}
}

/**
 * PLINQ thread
 */
class PLinqThread{
	/**
	 * ID
	 * 
	 * @var {string}
	 */
	#ID=null;
	/**
	 * Worker
	 * 
	 * @var {Worker}
	 */
	#Worker=null;
	/**
	 * Promise
	 * 
	 * @var {Promise}
	 */
	#Promise=null;
	/**
	 * Resolve action
	 * 
	 * @var {Function<any>}
	 */
	#Resolve=null;
	/**
	 * Context
	 * 
	 * @var {object}
	 */
	#Context=null;
	/**
	 * Reuse action
	 * 
	 * @var {Function<PLinqThread,boolean>}
	 */
	#Reuse=null;

	/**
	 * Get the ID
	 * 
	 * @return {string} ID
	 */
	get ID(){return this.#ID;}

	/**
	 * Get the worker
	 * 
	 * @return {Worker} Worker
	 */
	get Worker(){return this.#Worker;}

	/**
	 * Get the promise
	 * 
	 * @return {Promise} Promise
	 */
	get Promise(){return this.#Promise;}

	/**
	 * Get the resolve action
	 * 
	 * @return {Function<any>} Resolve action
	 */
	get Resolve(){return this.#Resolve;}
 
	/**
	 * Get the context
	 * 
	 * @return {object} Context
	 */
	get Context(){return this.#Context;}

	/**
	 * Prepare
	 * 
	 * @param {object} context Context
	 * @return {PLinqThread} This
	 */
	Prepare(context){
		context.ID=this.#ID;
		this.#Context=context;
		return this;
	}

	/**
	 * Start the thread
	 */
	Start(){this.#Worker.postMessage(this.Context);}

	/**
	 * Finish the thread
	 */
	Finish(){
		if(this.#Reuse&&this.#Reuse(this)){
			this.#Init();
		}else{
			PLinq._DisposeThread(this);
		}
	}

	/**
	 * (Re-)Initialize
	 */
	#Init(){
		const self=this;
		this.#Promise=new Promise(resolve=>self.#Resolve=resolve);
		this.#Context=null;
	}

	/**
	 * Constructor
	 * 
	 * @param {Function<PLinqThread,boolean>} reuse (optional) Reuse action
	 */
	constructor(reuse=null){
		this.#ID=PLinqThread.CreateUUID();
		this.#Worker=new Worker(PLinq.Uri);
		this.#Reuse=reuse;
		const self=this;
		this.#Worker.addEventListener('error',e=>{
			const msg='PLINQ worker ID '+self.ID+' raised an error: '+e.message+' (line #'+e.lineno+' in "'+e.filename+'")';
			console.error(msg,self,!!reuse,e);
			debugger;
			self.#Reuse=null;
			PLinq._DisposeThread(self);
			throw new Error(msg);
		});
		this.#Worker.addEventListener('message',e=>{
			if(e.data.exception){
				const msg='PLINQ worker ID '+self.ID+' responded an exception: '+e.data.exception.message;
				console.error(msg,self,e);
				debugger;
				self.#Reuse=null;
				PLinq._DisposeThread(self);
				throw new Error(msg);
			}
			let res=JSON.parse(e.data.result);
			if(
				res&&
				typeof res=='object'&&
				LinqArray.Helper.IsString(res['Type'])&&
				!LinqArray.Helper.IsUndefined(res['GroupKey'])&&
				!LinqArray.Helper.IsUndefined(res['Tag'])
				)
				res=LinqArray.FromJson(res);
			self.Resolve(res);
		});
		this.#Init();
	}

	/**
	 * Create an UUID
	 * 
	 * @return {string} UUID
	 */
	static CreateUUID(){return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g,(c)=>(c^crypto.getRandomValues(new Uint8Array(1))[0]&15>>c/4).toString(16));}
}
