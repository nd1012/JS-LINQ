/**
 * An array with LINQ-like methods
 * 
 * @github https://github.com/nd1012/JS-LINQ
 * @license MIT
 * @copyright (c)2022 Andreas Zimmermann, wan24.de
 */
class LinqArray extends Array{
	/**
	 * Version number
	 * 
	 * @var {int}
	 */
	static #VERSION=0;// ALPHA!
	/**
	 * Static helper methods
	 * 
	 * @var object
	 */
	static #Helper={
		IsLinqArray:(obj)=>obj instanceof LinqArray,
		EnsureLinqArray:(arr,useGenerator=false)=>arr instanceof LinqArray?arr:(new LinqArray()).SetAllData(arr,useGenerator),
		EnsureFinalArray:(arr)=>arr instanceof LinqArray?arr.EnsureGenerated():arr,
		GetArrayLength:(arr)=>arr instanceof LinqArray?arr.EnsureGenerated()._Iterable.length:arr.length,
		IsUndefined:(obj)=>typeof obj=='undefined',
		IsFunction:(obj)=>typeof obj=='function',
		IsString:(obj)=>typeof obj=='string',
		DefaultOrdering:(a,b,desc=false)=>{
			switch(true){
				case typeof a=='string':
					const res=a.localeCompare(b?.toString());
					switch(true){
						case res<0:return desc?1:-1;
						case res>0:return desc?-1:1;
						default:return 0;
					}
				case a<b:return desc?1:-1;
				case a>b:return desc?-1:1;
				default:return 0;
			}
		},
		DefaultComparing:(a,b,strict=false)=>strict?a===b:LinqArray.Helper.DefaultOrdering(a,b)==0,
		EnsureValueGetter:(key)=>typeof key=='function'?key:(obj)=>obj[key],
	};

	/**
	 * Parent LINQ array
	 * 
	 * @var {LinqArray}
	 */
	#Parent=null;
	/**
	 * Order action
	 * 
	 * @var {Function<any,int,any>}
	 */
	#OrderAction=null;
	/**
	 * Ordering action
	 * 
	 * @var {Function<any,any,boolean,any,any,int>}
	 */
	#Ordering=null;
	/**
	 * If ordered descending
	 * 
	 * @var {boolean}
	 */
	#OrderDescending=null;
	/**
	 * Group key
	 * 
	 * @var {any}
	 */
	#GroupKey=undefined;
	/**
	 * Running generator of this instance
	 * 
	 * @var {Iterator}
	 */
	#Generator=null;
	/**
	 * Is generated?
	 * 
	 * @var {boolean}
	 */
	#IsGenerated=true;
	/**
	 * Is dynamic?
	 * 
	 * @var {boolean}
	 */
	#IsDynamic=false;
	 /**
	 * Estimated count or `null`
	 * 
	 * @var {int}
	 */
	#EstimatedCount=null;
	/**
	 * Store generated items?
	 * 
	 * @var {boolean}
	 */
	#Store=true;
	/**
	 * Iterated already?
	 * 
	 * @var {boolean}
	 */
	#Iterated=false;
	/**
	 * Pass the `Store` property value to created instances?
	 * 
	 * @var {boolean}
	 */
	#PassStore=false;
	/**
	 * Extended object
	 * 
	 * @var {Iterable}
	 */
	#Extended=null;
	/**
	 * A tagged object
	 * 
	 * @var {any}
	 */
	#Tag=null;

	/**
	 * Get the version
	 * 
	 * @return {int} Version
	 */
	static get VERSION(){return LinqArray.#VERSION;}

	/**
	 * Get static helper functions
	 * 
	 * @return {object} Helper functions
	 */
	static get Helper(){return LinqArray.#Helper;}

	/**
	 * Get the parent LINQ array
	 * 
	 * @return {LinqArray} Parent LINQ array or `null`
	 */
	get Parent(){return this.#Parent;}
	
	/**
	 * Get the group key
	 * 
	 * @return {string} Group key
	 */
	get GroupKey(){return this.#GroupKey;}

	/**
	 * Get if all items are generated
	 * 
	 * @return {boolean} All items are generated?
	 */
	get IsGenerated(){return this.#IsGenerated;}

	/**
	 * Get if the item generator is dynamic
	 * 
	 * @return {boolean} Is dynamic?
	 */
	get IsDynamic(){return this.#IsDynamic;}

	/**
	 * Get if generated items will be stored in the array buffer
	 * 
	 * @return {boolean} Storing is active?
	 */
	get Store(){return this.#Store;}

	/**
	 * Get if created instances won't store generated items, too
	 * 
	 * @return {boolean} Pass disabled storing to new instances?
	 */
	get PassStore(){return this.#PassStore;}

	/**
	 * Get the extended object
	 * 
	 * @return {Iterable} Object
	 */
	get Extended(){return this.#Extended;}

	/**
	 * Get an iterable object of this instance
	 * 
	 * @return {Iterable} Iterable
	 */
	get _Iterable(){return this.#IsDynamic?this:this.#Extended??this;}

	/**
	 * Get the tagged object
	 * 
	 * @return {any} Tagged object
	 */
	get Tag(){return this.#Tag;}
	/**
	 * Set the tagged object
	 * 
	 * @param {any} value Tagged object
	 */
	set Tag(value){this.#Tag=value;}

	/**
	 * Get the LINQ array type
	 * 
	 * @return {string} Type name
	 */
	get Type(){return 'LinqArray';}

	/**
	 * Determine if the LINQ array tree could support dynamic
	 * 
	 * @return {boolean} Could support dynamic?
	 */
	get SupportsDynamic(){
		for(let parent=this;parent;parent=parent.Parent) if(!parent.Store) return false;
		return true;
	}

	/**
	 * Count items
	 * 
	 * @param {Function<any,int,int,bool>} action (optional) Filter action (gets the item, its index and the current count and needs to return if to count the item)
	 * @return {int} Number of items
	 */
	Count(action=null){
		if(!action){
			if(this.#EstimatedCount!=null) return this.#EstimatedCount;
			if(this.#Extended) return this.#Extended.length;
			if(this.#IsGenerated) return this.length;
			if(!this.#Store&&this.#Iterated) throw new TypeError();
		}
		return action?this.Aggregate((count,item,index)=>action(item,index,count)?++count:count,0):this.Aggregate((count)=>++count,0);
	}

	/**
	 * Count items
	 * 
	 * @param {AsyncFunction<any,int,int,bool>} action Filter action (gets the item, its index and the current count and needs to return if to count the item)
	 * @return {int} Number of items
	 */
	async CountAsync(action){return await this.AggregateAsync(async (count,item,index)=>await action(item,index)?++count:count,0);}

	/**
	 * Determine if this array is empty
	 * 
	 * @return {boolean} Is empty?
	 */
	IsEmpty(){return this._GetIterator().next().done;}

	/**
	 * Determine if an item is contained
	 * 
	 * @param {any} item Item
	 * @param {Function<any,any,boolean>} comp (optional) Comparer action
	 * @return {boolean} Contains the item?
	 */
	Contains(item,comp=null){
		if(!comp)
			if(this.#IsGenerated&&this.#Store){
				return this.includes(item);
			}else{
				if(this.#Iterated) throw new TypeError();
				if(!this.#IsGenerated&&this.#Store) return this.EnsureGenerated().includes(item);
				let i;
				for(i of this._GetIterator()) if(i==item) return true;
				return false;
			}
		let i;
		for(i of this._GetIterator()) if(comp(i,item)) return true;
		return false;
	}

	/**
	 * Join this array with another array by their common keys
	 * 
	 * @param {Array} arr Array
	 * @param {Function<any,int,any>|string} action Key action or item property name
	 * @param {Function<any,int,any>|string} arrAction Key action or array item property name
	 * @param {Function<any,any,int,int,any>} result Value returning action (gets the item, the array item, the index and the array index as parameters and needs to return the final result to use)
	 * @param {Function<any,any,boolean>} comp (optional) Key comparer action
	 * @return {LinqArray} Resulting LINQ array
	 */
	Join(arr,action,arrAction,result,comp=null){
		//TEST
		const self=this;
		action=LinqArray.Helper.EnsureValueGetter(action);
		arrAction=LinqArray.Helper.EnsureValueGetter(arrAction);
		if(LinqArray.Helper.IsLinqArray(arr)) arr._EnsureFinite();
		return this._EnsureFinite()._CreateGenerated(function*(){
			let vA,
				a,
				b,
				i,
				index=0;
			for(a of self._GetIterator()){
				vA=action(a,index);
				i=0;
				for(b of arr){
					if(comp?!comp(vA,arrAction(b,i)):vA!=arrAction(b,i)) continue;
					yield result(a,b,index,i);
					i++;
				}
				index++;
			};
		});
	}

	/**
	 * Group join this array with another array by their common keys
	 * 
	 * @param {Array} arr Array
	 * @param {Function<any,int,any>|string} action Key action or item property name
	 * @param {Function<any,int,any>|string} arrAction Key action or array item property name
	 * @param {Function<any,LinqArray,any,int,int,any} result Value returning action (gets the item, the group (as LINQ array), the group key, the item index and the array index as parameters, needs to return the final result to use)
	 * @param {Function<any,any,boolean>} comp (optional) Key comparer action
	 * @return {LinqArray} Resulting LINQ array
	 */
	GroupJoin(arr,action,arrAction,result,comp=null){
		//TEST
		const self=this._EnsureFinite();
		action=LinqArray.Helper.EnsureValueGetter(action);
		arrAction=LinqArray.Helper.EnsureValueGetter(arrAction);
		arr=LinqArray.Helper.EnsureLinqArray(arr,true)._EnsureFinite();
		return this._CreateGenerated(function*(){
			let vA,
				group,
				a,
				b,
				i,
				index=0;
			for(a of self._GetIterator()){
				vA=action(a,index);
				group=arr.Where((item,ii)=>comp?comp(vA,arrAction(item,ii)):vA==arrAction(item,ii));
				i=0;
				for(b of arr){
					yield result(a,group,vA,index,i);
					i++;
				}
				index++;
			};
		});
	}

	/**
	 * Apply a filter
	 * 
	 * @param {Function<any,int,boolean>} action Filter action
	 * @return {LinqArray} Filtered LINQ array
	 */
	Where(action){
		const self=this;
		return this._CreateGenerated(function*(){
			let index=0,
				item;
			for(item of self._GetIterator()){
				if(action(item,index)) yield item;
				index++;
			}
		});
	}

	/**
	 * Apply a filter
	 * 
	 * @param {AsyncFunction<any,int,boolean>} action Filter action
	 * @return {LinqArray} Filtered LINQ array
	 */
	async WhereAsync(action){
		const res=new this.constructor();
		res.#Parent=this;
		await this.ForEachAsync(async (item,index)=>{
			if(await action(item,index)) res.push(item);
		});
		return res;
	}

	/**
	 * Determine if a filter applies to all values
	 * 
	 * @param {Function<any,int,boolean>} action Filter action
	 * @return {boolean} Applies to all?
	 */
	All(action){
		let item;
		for(item of this._EnsureFinite()._GetIterator()) if(!action(item)) return false;
		return true;
	}

	/**
	 * Determine if a filter applies to all values
	 * 
	 * @param {AsyncFunction<any,int,boolean>} action Filter action
	 * @return {boolean} Applies to all?
	 */
	async AllAsync(action){
		let item;
		for await (item of this._EnsureFinite()._GetIterator()) if(!await action(item)) return false;
		return true;
	}

	/**
	 * Determine if a filter applies to any value
	 * 
	 * @param {Function<any,int,boolean>} action (optional) Filter action
	 * @return {boolean} Applies to a value?
	 */
	Any(action=null){
		if(!action) return !this.IsEmpty();
		let item;
		for(item of this._GetIterator()) if(action(item)) return true;
		return false;
	}

	/**
	 * Determine if a filter applies to any value
	 * 
	 * @param {AsyncFunction<any,int,boolean>} action Filter action
	 * @return {boolean} Applies to a value?
	 */
	async AnyAsync(action){
		let item;
		for(item of this._GetIterator()) if(await action(item)) return true;
		return false;
	}

	/**
	 * Ensure distinct values
	 * 
	 * @param {Function<any,any,boolean>} comp (optional) Comparer action
	 * @return {LinqArray} LINQ array with distinct values
	 */
	Distinct(comp=null){
		const self=this;
		return this._CreateGenerated(function*(){
			const values=new LinqArray();
			let item;
			for(item of self._GetIterator()){
				if(values.Contains(item,comp)) continue;
				yield item;
				values.push(item);
			}
		});
	}

	/**
	 * Ensure distinct values
	 * 
	 * @param {Function<any,int,any>|string} action Value action or item key name
	 * @param {Function<any,any,boolean>} comp (optional) Comparer action
	 * @return {LinqArray} LINQ array with distinct values
	 */
	DistinctBy(action,comp=null){
		const self=this;
		action=LinqArray.Helper.EnsureValueGetter(action);
		return this._CreateGenerated(function*(){
			const values=new LinqArray();
			let value,
				item,
				index=0;
			for(item of self._GetIterator()){
				value=action(item,index);
				index++;
				if(values.Contains(value,comp)) continue;
				yield item;
				values.push(value);
			}
		});
	}

	/**
	 * Append only new values
	 * 
	 * @param {Array} arr Array
	 * @param {Function<any,any,boolean>} comp (optional) Comparer action
	 * @param {boolean} inPlace (optional) Append to THIS LINQ array (default: `false`)
	 * @return {LinqArray} Extended LINQ array
	 */
	Union(arr,comp=null,inPlace=false){
		if(this._EnsureFinite().#IsDynamic)
			if(inPlace){
				const generator=this.#Generator;
				this.#Generator=function*(){
					let item,
						values=new LinqArray();
					for(item of generator()){
						yield item;
						values.push(item);
					}
					for(item of arr){
						if(values.Contains(item,comp)) continue;
						yield item;
						values.push(item);
					}
				};
				return this;
			}else{
				const self=this;
				return this._CreateInstance().GenerateDynamic(function*(){
					let item,
						values=new LinqArray();
					for(item of self){
						yield item;
						values.push(item);
					}
					for(item of arr){
						if(values.Contains(item,comp)) continue;
						yield item;
						values.push(item);
					}
				});
			}
		const res=inPlace?this.EnsureGenerated():this.EnsureGenerated().slice(),
			values=new LinqArray(res.slice());
		if(!inPlace) res.#Parent=this;
		res.#IsGenerated=false;
		res.#Generator=function*(){
			let item;
			for(item of arr){
				if(values.Contains(item,comp)) continue;
				yield item;
				values.push(item);
			}
		}();
		return res;
	}

	/**
	 * Append only new values
	 * 
	 * @param {Array} arr Array
	 * @param {Function<any,int,any>|string} action Value action or item key name
	 * @param {Function<any,any,boolean>} comp (optional) Comparer action
	 * @param {boolean} inPlace (optional) Append to THIS LINQ array (default: `false`)
	 * @return {LinqArray} Extended LINQ array
	 */
	UnionBy(arr,action,comp=null,inPlace=false){
		action=LinqArray.Helper.EnsureValueGetter(action);
		if(this._EnsureFinite().#IsDynamic)
			if(inPlace){
				const generator=this.#Generator;
				this.#Generator=function*(){
					let item,
						values=new LinqArray(),
						index=0,
						value;
					for(item of generator()){
						yield item;
						values.push(action(item));
						index++;
					}
					for(item of arr){
						value=action(item,index);
						index++;
						if(values.Contains(value,comp)) continue;
						yield item;
						values.push(value);
					}
				};
				return this;
			}else{
				const self=this;
				return this._CreateInstance().GenerateDynamic(function*(){
					let item,
						values=new LinqArray(),
						index=0,
						value;
					for(item of self){
						yield item;
						values.push(action(item));
						index++;
					}
					for(item of arr){
						value=action(item,index);
						index++;
						if(values.Contains(value,comp)) continue;
						yield item;
						values.push(value);
					}
				});
			}
		const res=inPlace?this.EnsureGenerated():this.EnsureGenerated().slice(),
			values=new LinqArray(res.slice());
		if(!inPlace) res.#Parent=this;
		res.#IsGenerated=false;
		res.#Generator=function*(){
			let item,
				value,
				index=0;
			for(item of arr){
				value=action(item,index);
				index++;
				if(values.Contains(value,comp)) continue;
				yield item;
				values.push(value);
			}
		}();
		return res;
	}

	/**
	 * Create a value list
	 * 
	 * @param {Function<any,int,any>|string} action Value action or item key name
	 * @return {LinqArray} New LINQ array with the selected values
	 */
	Select(action){
		const self=this;
		action=LinqArray.Helper.EnsureValueGetter(action);
		return this._CreateGenerated(function*(){
			let index=0,
				item;
			for(item of self._GetIterator()){
				yield action(item,index);
				index++;
			}
		},this.TryGetNonEnumeratedCount());
	}

	/**
	 * Create a value list
	 * 
	 * @param {AsyncFunction<any,int,any>} action Value action
	 * @return {LinqArray} New LINQ array with the selected values
	 */
	async SelectAsync(action){
		const res=new this.constructor();
		res.#Parent=this;
		await this.ForEachAsync(async (item,index)=>res.push(await action(item,index)));
		return res;
	}

	/**
	 * Select many items
	 * 
	 * @param {Function<any,int,Array>|string} selector Items selector (will get a source item and the index as parameters, and needs to return an array of items to use) or item key name
	 * @param {Function<any,any,int,int,any>} result (optional) Result action (will get a source item, one of the selected items, the source index and the selected index as parameters, and needs to return the final item to use)
	 * @return {LinqArray} Resulting items LINQ arary
	 */
	SelectMany(selector,result=null){
		//TEST
		const self=this;
		selector=LinqArray.Helper.EnsureValueGetter(selector);
		return this._CreateGenerated(function*(){
			let index=0,
				item,
				selected,
				i,
				ii;
			if(result){
				for(item of self._GetIterator()){
					for(selected of selector(item,index)){
						ii=0;
						for(i of selected){
							yield result(i,selected,index,ii);
							ii++;
						}
					}
					index++;
				}
				return;
			}
			for(item of self._GetIterator()){
				for(i of selector(item,index)) yield i;
				index++;
			}
		});
	}

	/**
	 * Select many items
	 * 
	 * @param {AsyncFunction<any,int,Array>} selector Items selector (will get a source item and the index as parameters, and needs to return an array of items to use)
	 * @param {AsyncFunction<any,any,int,int,any>} result (optional) Result action (will get a source item, one of the selected, the source index and the selected index items as parameters, and needs to return the final item to use)
	 * @return {LinqArray} Resulting items LINQ arary
	 */
	async SelectManyAsync(selector,result=null){
		//TEST
		const res=new this.constructor();
		res.#Parent=this;
		let selected,
			i,
			ii;
		await this.ForEachAsync(async (item,index)=>{
			if(result){
				for(selected of await selector(item,index)){
					ii=0;
					for(i of selected){
						res.push(await result(i,selected,index,ii));
						ii++;
					}
				}
				return;
			}
			for(i of await selector(item,index)) res.push(i);
		});
		return res;
	}

	/**
	 * Combine sequences
	 * 
	 * **NOTE**: This method can't be executed on unbuffered or dynamic LINQ arrays!
	 * 
	 * @param {Array} arr Second sequence
	 * @param {Function<any,any,int,any>|Array} action (optional) Result returning action (will get item A, B and the index and needs to return the resulting value) or the third sequence 
	 * @return {LinqArray} New LINQ array
	 */
	Zip(arr,action=null){
		//TEST
		if(LinqArray.Helper.IsLinqArray(arr)) arr._EnsureFinite();
		const self=this._EnsureFinite(),
			hasAction=LinqArray.Helper.IsFunction(action),
			isSeq=!hasAction&&action!=null,
			lenB=LinqArray.Helper.GetArrayLength(arr),
			lenC=isSeq?LinqArray.Helper.GetArrayLength(action):null;
		this.EnsureGenerated(lenC==null?lenB:Math.min(lenB,lenC));
		const len=isSeq?Math.min(this._Iterable.length,lenB,lenC):Math.min(this._Iterable.length,lenB);
		return this._CreateGenerated(function*(){
			for(let i=0;i<len;i++)
				if(isSeq){
					yield [self[i],arr[i],action[i]];
				}else if(hasAction){
					yield action(self[i],arr[i],i);
				}else{
					yield [self[i],arr[i]];
				}
		}(),len);
	}

	/**
	 * Filter by item type
	 * 
	 * @param {Function<any>|string} type Type (name) to filter
	 * @param {boolean} strict (optional) Strict type comparing?
	 * @return {LinqArray} Filtered LINQ array
	 */
	OfType(type,strict=false){
		//TEST Extend
		const isString=LinqArray.Helper.IsString(type),
			name=isString&&!strict?type.toLowerCase():type;
		return isString
			?this.Where(item=>typeof item==name||(strict?item?.constructor?.name:item?.constructor?.name?.toLowerCase())===name)
			:this.Where(item=>item instanceof type&&(!strict||item.constructor.name===type.name));
	}

	/**
	 * Filter by item type
	 * 
	 * @param {Function<any>|string} type Type (name) to filter out
	 * @param {boolean} strict (optional) Strict type comparing?
	 * @return {LinqArray} Filtered LINQ array
	 */
	NotOfType(type,strict=false){
		//TEST
		const isString=LinqArray.Helper.IsString(type),
			name=isString&&!strict?type.toLowerCase():type;
		return isString
			?this.Where(item=>typeof item!=name&&(strict?item?.constructor?.name:item?.constructor?.name?.toLowerCase())!==name)
			:this.Where(item=>!(item instanceof type)||(strict&&item.constructor.name!==type.name));
	}

	/**
	 * Exclude items
	 * 
	 * @param {Array} exclude Values to exclude
	 * @param {Function<any,any,boolean>} comp (optional) Comparer action
	 * @return {LinqArray} Filtered LINQ array
	 */
	Except(exclude,comp=null){
		//TEST
		const self=this,
			isLinq=LinqArray.Helper.IsLinqArray(exclude);
		if(isLinq) exclude._EnsureFinite();
		return this._CreateGenerated(function*(){
			let item;
			for(item of self._GetIterator())
				if(comp
					?!(isLinq?exclude.Any((b)=>comp(item,b)):exclude.some((b)=>comp(item,b)))
					:!(isLinq?exclude.Contains(item):exclude.includes(item)))
					yield item;
		});
	}

	/**
	 * Exclude items
	 * 
	 * @param {Array} exclude Values to exclude
	 * @param {Function<any,int,any>|string} action Key action or item key name
	 * @param {Function<any,any,boolean>} comp (optional) Comparer action
	 * @return {LinqArray} Filtered LINQ array
	 */
	ExceptBy(exclude,action,comp=null){
		//TEST
		const self=this,
			isLinq=LinqArray.Helper.IsLinqArray(exclude);
		if(isLinq) exclude._EnsureFinite();
		action=LinqArray.Helper.EnsureValueGetter(action);
		return this._CreateGenerated(function*(){
			let k,
				item,
				index=0;
			for(item of self._GetIterator()){
				k=action(item,index);
				if(comp
					?!(isLinq?exclude.Any((b)=>comp(k,action(b))):exclude.some((b)=>comp(k,action(b))))
					:!(isLinq?exclude.Any((b)=>k==action(b)):exclude.some((b)=>k==action(b))))
					yield item;
				index++;
			}
		}());
	}

	/**
	 * Find intersecting values
	 * 
	 * @param {Array} arr Array
	 * @param {Function<any,any,boolean>} comp (optional) Comparer action
	 * @return {LinqArray} Values that are contained in this and the array
	 */
	Intersect(arr,comp=null){
		//TEST
		const self=this._EnsureFinite();
		return this._CreateGenerated(function*(){
			if(comp) arr=LinqArray.Helper.EnsureLinqArray(arr)._EnsureFinite();
			const lenA=self.TryGetNonEnumeratedCount(),
				lenB=LinqArray.Helper.GetArrayLength(arr),
				a=lenA!=null&&lenB!=null&&lenA<lenB?self:arr,
				b=a==self?arr:self,
				isLinq=LinqArray.Helper.IsLinqArray(b);
			let item;
			for(item of a) if(isLinq?b.Any((b)=>comp(item,b)):b.includes(item)) yield item;
		});
	}

	/**
	 * Find intersecting values
	 * 
	 * @param {Array} arr Array
	 * @param {Function<any,int,any>|string} action Key action or item key name
	 * @param {Function<any,any,boolean>} comp (optional) Comparer action
	 * @return {LinqArray} Values that are contained in this and the array
	 */
	IntersectBy(arr,action,comp=null){
		//TEST
		const self=this._EnsureFinite();
		action=LinqArray.Helper.EnsureValueGetter(action);
		return this._CreateGenerated(function*(){
			const lenA=self.TryGetNonEnumeratedCount();
			let v,
				item,
				index=0;
			if(LinqArray.Helper.IsLinqArray(arr)){
				arr._EnsureFinite();
				const lenB=arr.TryGetNonEnumeratedCount(),
					a=lenA!=null&&lenB!=null&&lenA<lenB?self:arr,
					b=a==self?arr:self;
				for(item of a){
					v=action(item,index);
					if(comp?b.Any((b)=>comp(v,action(b))):b.Any((b)=>v==action(b))) yield item;
					index++;
				}
				return;
			}
			const lenB=arr.length,
				a=lenA!=null&&lenB!=null&&lenA<lenB?self:arr,
				b=a==self?arr:self,
				isLinq=LinqArray.Helper.IsLinqArray(b);
			for(item of a){
				v=action(item,index);
				if(comp?(isLinq?b.Any((b)=>comp(v,action(b))):b.some((b)=>comp(v,action(b)))):(isLinq?b.Any((b)=>v==action(b)):b.some((b)=>v==action(b)))) yield item;
				index++;
			}
		});
	}

	/**
	 * Get the first item
	 * 
	 * @param {Function<any,int,boolean>} action (optional) Filter action
	 * @return {any} First item
	 */
	First(action=null){
		//TEST
		if(!action){
			const first=this._GetIterator().next();
			if(first.done) throw new RangeError();
			return first.value;
		}
		let item,
			index=0;
		for(item of this._GetIterator()){
			if(action(item,index)) return item;
			index++;
		}
		throw new RangeError();
	}

	/**
	 * Get the first item
	 * 
	 * @param {AsyncFunction<any,int,boolean>} action Filter action
	 * @return {any} First item
	 */
	async FirstAsync(action){
		//TEST
		let item,
			index=0;
		for(item of this._GetIterator()){
			if(await action(item,index)) return item;
			index++;
		}
		throw new RangeError();
	}

	/**
	 * Get the first item or a default result
	 * 
	 * @param {Function<any,int,boolean>|any} action Filter action or default result
	 * @param {any} defaultResult (optional) Default result (default: `null`)
	 * @return {any} First item or the default result
	 */
	FirstOrDefault(action,defaultResult=null){
		//TEST
		[action,defaultResult]=this.#EnsureActionOrDefaultResult(action,defaultResult);
		if(!action){
			const first=this._GetIterator().next();
			return first.done?defaultResult:first.value;
		}
		let item,
			index=0;
		for(item of this._GetIterator()){
			if(action(item,index)) return item;
			index++;
		}
		return defaultResult;
	}

	/**
	 * Get the first item or a default result
	 * 
	 * @param {AsyncFunction<any,int,boolean>} action Filter action
	 * @param {any} defaultResult (optional) Default result (default: `null`)
	 * @return {any} First item or the default result
	 */
	async FirstOrDefaultAsync(action,defaultResult=null){
		//TEST
		let item,
			index=0;
		for(item of this._GetIterator()){
			if(await action(item,index)) return item;
			index++;
		}
		return defaultResult;
	}

	/**
	 * Get the last item
	 * 
	 * @param {Function<any,int,boolean>} action (optional) Filter action
	 * @return {any} Last item
	 */
	Last(action=null){
		//TEST
		let item,
			index=0;
		if(this.#IsDynamic){
			let res,
				found=false;
			for(item of this){
				if(action&&!action(item,index)){
					index++;
					continue;
				}
				res=item;
				found=true;
				index++;
			}
			if(!found) throw new RangeError();
			return res;
		}
		if(!action){
			const len=this.EnsureGenerated()._Iterable.length;
			if(!len) throw new RangeError();
			return this._Iterable[len-1];
		}
		for(item of this.EnsureGenerated().slice().reverse()){
			if(action(item,index)) return item;
			index++;
		}
		throw new RangeError();
	}

	/**
	 * Get the last item
	 * 
	 * @param {AsyncFunction<any,int,boolean>} action Filter action
	 * @return {any} Last item
	 */
	async LastAsync(action){
		//TEST
		let item,
			index=0;
		if(this.#IsDynamic){
			let res,
				found=false;
			for(item of this){
				if(!await action(item,index)){
					index++;
					continue;
				}
				res=item;
				found=true;
				index++;
			}
			if(!found) throw new RangeError();
			return res;
		}
		for(item of this.EnsureGenerated().slice().reverse()){
			if(await action(item,index)) return item;
			index++;
		}
		throw new RangeError();
	}

	/**
	 * Get the last item or a default result
	 * 
	 * @param {Function<any,int,boolean>|any} action (optional) Filter action or default result
	 * @param {any} defaultResult (optional) Default result (default: `null`)
	 * @return {any} Last item or the default result
	 */
	LastOrDefault(action,defaultResult=null){
		//TEST
		[action,defaultResult]=this.#EnsureActionOrDefaultResult(action,defaultResult);
		let item,
			index=0;
		if(this.#IsDynamic){
			for(item of this){
				if(!action||action(item,index)) defaultResult=item;
				index++;
			}
			return defaultResult;
		}
		if(!action) return this.EnsureGenerated()._Iterable.length?this._Iterable[this._Iterable.length-1]:defaultResult;
		for(item of this.EnsureGenerated().slice().reverse()){
			if(!action||action(item,index)) return item;
			index++;
		}
		return defaultResult;
	}

	/**
	 * Get the last item or a default result
	 * 
	 * @param {AsyncFunction<any,int,boolean>} action Filter action
	 * @param {any} defaultResult (optional) Default result (default: `null`)
	 * @return {any} Last item or the default result
	 */
	async LastOrDefaultAsync(action,defaultResult=null){
		//TEST
		let item,
			index=0;
		if(this.#IsDynamic){
			await this.ForEachAsync(async (item,index)=>{
				if(await action(item,index)) defaultResult=item;
			});
			return defaultResult;
		}
		for(item of this.EnsureGenerated().slice().reverse()){
			if(await action(item,index)) return item;
			index++;
		}
		return defaultResult;
	}

	/**
	 * Find a single distinct value
	 * 
	 * @param {Function<any,int,boolean>} action (optional) Filter action
	 * @return {any} Distinct value
	 */
	Single(action=null){
		//TEST
		if(this._EnsureFinite().#IsDynamic){
			const items=(action?this.Where(action):this).Take(2).ToArray();
			switch(items.length){
				case 0:throw new RangeError();
				case 1:return items[0];
				default:throw new RangeError('Many items');
			}
		}else if(!action){
			switch(this.EnsureGenerated(2)._Iterable.length){
				case 0:throw new RangeError();
				case 1:return this.First();
				default:throw new RangeError('Many items');
			}
		}
		let res,
			found=false;
		this.ForEach((item,index)=>{
			if(!action(item,index)) return;
			if(found) throw new RangeError('Many items');
			res=item;
			found=true;
		});
		if(!found) throw new RangeError();
		return res;
	}

	/**
	 * Find a single distinct value
	 * 
	 * @param {AsyncFunction<any,int,boolean>} action Filter action
	 * @return {any} Distinct value
	 */
	async SingleAsync(action){
		//TEST
		if(this._EnsureFinite().#IsDynamic){
			const items=(await this.WhereAsync(action)).Take(2).ToArray();
			switch(items.length){
				case 0:throw new RangeError();
				case 1:return items[0];
				default:throw new RangeError('Many items');
			}
		}
		let res,
			found=false;
		await this.ForEachAsync(async (item,index)=>{
			if(!await action(item,index)) return;
			if(found) throw new RangeError('Many items');
			res=item;
			found=true;
		});
		if(!found) throw new RangeError();
		return res;
	}

	/**
	 * Find a single distinct value or a default result
	 * 
	 * @param {Function<any,int,boolean>|any} action Filter action (gets the item as parameter and needs to return if to use the item) or default result
	 * @param {any} defaultResult (optional) Default result (default: `null`)
	 * @return {any} Distinct value
	 */
	SingleOrDefault(action,defaultResult=null){
		//TEST
		let found=false;
		this.ForEach((item,index)=>{
			if(action&&!action(item,index)) return;
			if(found) throw new RangeError('Many items');
			defaultResult=item;
			found=true;
		});
		return defaultResult;
	}

	/**
	 * Find a single distinct value or a default result
	 * 
	 * @param {AsyncFunction<any,int,boolean>} action Filter action (gets the item as parameter and needs to return if to use the item)
	 * @param {any} defaultResult (optional) Default result (default: `null`)
	 * @return {any} Distinct value
	 */
	async SingleOrDefaultAsync(action,defaultResult=null){
		//TEST
		let found=false;
		await this.ForEachAsync(async (item,index)=>{
			if(!await action(item,index)) return;
			if(found) throw new RangeError('Many items');
			defaultResult=item;
			found=true;
		});
		return defaultResult;
	}

	/**
	 * Get an element
	 * 
	 * @param {int} index Index (negative to count from the total number of items)
	 * @return {any} Element
	 */
	ElementAt(index){
		//TEST
		if(this.#IsDynamic||(this.#EstimatedCount!=null&&!Number.isFinite(this.#EstimatedCount))){
			let i=0,
				item;
			for(item of this){
				if(i==index) return item;
				i++;
			}
			throw new RangeError();
		}
		if(index<0) index=this.Count()-index;
		this.EnsureGenerated(index+1);
		if(index<0||index>=this._Iterable.length) throw new RangeError();
		return this._Iterable[index];
	}

	/**
	 * Get an element or a default result
	 * 
	 * @param {int} index Index (negative to count from the total number of items)
	 * @param {any} defaultResult (optional) Default result (default: `null`)
	 * @return {any} Element or the default result
	 */
	ElementAtOrDefault(index,defaultResult=null){
		//TEST
		if(this.#IsDynamic||(this.#EstimatedCount!=null&&!Number.isFinite(this.#EstimatedCount))){
			let i=0,
				item;
			for(item of this){
				if(i==index) return item;
				i++;
			}
			return defaultResult;
		}
		if(index<0) index=this.Count()-index;
		this.EnsureGenerated(index+1);
		return index<0||index>=this._Iterable.length?defaultResult:this._Iterable[index];
	}

	/**
	 * Ensure a non-empty array
	 * 
	 * @param {any} defaultItem Default item
	 * @return {LinqArray} This or a new LINQ array with the default item
	 */
	DefaultIfEmpty(defaultItem){return this._GetIterator().next().done?this._CreateInstance([defaultItem]):this;}//TEST

	/**
	 * Order
	 * 
	 * @param {Function<any,int,any>|string} action (optional) Value action or item key name
	 * @param {Function<any,any,boolean,any,any,int>} order (optional) Ordering action
	 * @param {boolean} inPlace (optional) Order THIS LINQ array (default: `false`)
	 * @return {LinqArray} Ordered LINQ array
	 */
	OrderBy(action=null,order=null,inPlace=false){return this.#_OrderBy(action,order,inPlace,false);}//TEST

	/**
	 * Order descending
	 * 
	 * @param {Function<any,int,any>|string} action (optional) Value action or item key name
	 * @param {Function<any,any,boolean,any,any,int>} order (optional) Ordering action
	 * @param {boolean} inPlace (optional) Order THIS LINQ array (default: `false`)
	 * @return {LinqArray} Ordered LINQ array
	 */
	OrderByDescending(action=null,order=null,inPlace=false){return this.#_OrderBy(action,order,inPlace,true);}//TEST

	/**
	 * Order ascending/descending
	 * 
	 * @param {Function<any,int,any>|string} action (optional) Value action or item key name
	 * @param {Function<any,any,boolean,any,any,int>} order (optional) Ordering action
	 * @param {boolean} inPlace (optional) Order THIS LINQ array (default: `false`)
	 * @param {boolean} desc Order descending?
	 * @return {LinqArray} Ordered LINQ array
	 */
	#_OrderBy(action,order,inPlace,desc){
		if(inPlace&&this._EnsureFinite().#IsDynamic) throw new TypeError('Is dynamic');
		if(action!=null) action=LinqArray.Helper.EnsureValueGetter(action);
		order??=LinqArray.Helper.DefaultOrdering;
		const res=inPlace?this.EnsureGenerated():this.EnsureGenerated().slice();
		if(!inPlace) res.#Parent=this;
		res.#OrderAction=action;
		res.#Ordering=order;
		res.#OrderDescending=desc;
		let index=0;
		return res.sort(action
			?(a,b)=>{
				let res=order(action(a,index),action(b,index),desc,a,b);
				index++;
				return res;
			}
			:(a,b)=>order(a,b,desc,a,b));
	}

	/**
	 * Order
	 * 
	 * @param {Function<any,int,any>|string} action Value action or item key name
	 * @param {Function<any,any,boolean,any,any,int>} order (optional) Ordering action
	 * @return {LinqArray} Ordered LINQ array
	 */
	ThenBy(action,order=null){return this.#_ThenBy(action,order,false);}//TEST

	/**
	 * Order descending
	 * 
	 * @param {Function<any,int,any>|string} action Value action or item key name
	 * @param {Function<any,any,boolean,any,any,int>} order (optional) Ordering action
	 * @return {LinqArray} Ordered LINQ array
	 */
	ThenByDescending(action,order=null){return this.#_ThenBy(action,order,true);}//TEST

	/**
	 * Order ascending/descending
	 * 
	 * @param {Function<any,int,any>|string} action Value action or item key name
	 * @param {Function<any,any,boolean,any,any,int>} order (optional) Ordering action
	 * @param {boolean} desc Order descending?
	 * @return {LinqArray} Ordered LINQ array
	 */
	#_ThenBy(action,order,desc){
		if(this.#Ordering==null) return this.#_OrderBy(action,order,false,desc);
		const self=this,
			addOrder=(a,b,desc,itemA,itemB)=>{
				const prev=self.#OrderAction
					?self.#Ordering(self.#OrderAction(itemA),self.#OrderAction(itemB),self.#OrderDescending,itemA,itemB)
					:self.#Ordering(itemA,itemB,self.#OrderDescending,itemA,itemB);
				return prev!=0?prev:order(a,b,desc,itemA,itemB);
			};
		action=LinqArray.Helper.EnsureValueGetter(action);
		order??=LinqArray.Helper.DefaultOrdering;
		return this.#_OrderBy(action,addOrder,false,desc);
	}

	/**
	 * Group
	 * 
	 * @param {Function<any,int,any>|string} action (optional) Group key action or item key name
	 * @param {Function<any,int,any>} result (optional) Result action
	 * @return {LinqArray[]} Groups (as LINQ array of LINQ arrays)
	 */
	GroupBy(action=null,result=null){
		//TEST
		this._EnsureFinite();
		const map=new Map();
		let k,
			e;
		if(action!=null) action=LinqArray.Helper.EnsureValueGetter(action);
		this.ForEach((item,index)=>{
			k=action?action(item,index):item;
			if(!map.has(k)){
				map.set(k,e=(new this.constructor()).AppendThis(result?result(item,index):item));
				e.#Parent=this;
				e.#GroupKey=k;
			}else{
				map.get(k).push(result?result(item,index):item);
			}
		});
		const res=new this.constructor(Array.from(map.values()));
		res.#Parent=this;
		return res;
	}

	/**
	 * Group
	 * 
	 * @param {AsyncFunction<any,int,any>|string} action (optional) Group key action or item key name
	 * @param {AsyncFunction<any,int,any>} result (optional) Result action
	 * @return {LinqArray[]} Groups (as LINQ array of LINQ arrays)
	 */
	async GroupByAsync(action=null,result=null){
		//TEST
		this._EnsureFinite();
		const map=new Map();
		let k,
			e;
		if(action!=null) action=LinqArray.Helper.EnsureValueGetter(action);
		await this.ForEachAsync(async (item,index)=>{
			k=action?await action(item,index):item;
			if(!map.has(k)){
				map.set(k,e=(new this.constructor()).AppendThis(result?await result(item,index):item));
				e.#Parent=this;
				e.#GroupKey=k;
			}else{
				map.get(k).push(result?await result(item,index):item);
			}
		});
		const res=new this.constructor(Array.from(map.values()));
		res.#Parent=this;
		return res;
	}

	/**
	 * Try to get the count without enumerating items
	 * 
	 * @return {int} Count or `null` (if an enumeration is required, first)
	 */
	TryGetNonEnumeratedCount(){return this.#IsGenerated&&!this.#IsDynamic?this._Iterable.length:this.#EstimatedCount;}//TEST

	/**
	 * Skip X items
	 * 
	 * @param {int} count (optional) Count (default: `1`)
	 * @return {LinqArray} Reduced LINQ array
	 */
	Skip(count=1){
		//TEST
		if(count<0) return this.SkipLast(+count);
		if(count<1) return this.ToLinqArray();
		const self=this;
		return this._CreateGenerated(function*(){
			const generator=self._GetIterator();
			let item;
			for(;count&&!(item=generator.next()).done;count--);
			if(!item.done) yield* generator;
		});
	}

	/**
	 * Skip the last item(s)
	 * 
	 * @param {int} count (optional) Count (default: `1`)
	 * @return {LinqArray} Reduced LINQ array
	 */
	SkipLast(count=1){
		//TEST
		if(!count) return this.ToLinqArray();
		const self=this._EnsureFinite();
		if(this.#IsDynamic) return this._CreateGenerated(function*(){
			const res=self._EnsureFinite().DisableDynamic(false).EnsureGenerated();
			if(count<res.length) yield* res.Take(res.length-count)._GetIterator();
		});
		return count=this.EnsureGenerated()._Iterable.length-count?this._CreateGenerated(function*(){
			const generator=self._GetIterator();
			for(let item;count&&!(item=generator.next()).done;count--) yield item.value;
		}(),Math.max(0,this._Iterable.length-count)):this._CreateInstance();
	}

	/**
	 * Skip items until the filter action returned `false` once
	 * 
	 * @param {Function<any,int,boolean>} action Filter action
	 * @return {LinqArray} Reduced LINQ array
	 */
	SkipWhile(action){
		//TEST
		const self=this;
		return this._CreateGenerated(this.#IsDynamic?function*(){yield* self.GetWhenNot(action);}:this.GetWhenNot(action));
	}

	/**
	 * Skip items until the filter action returned `false` once
	 * 
	 * @param {AsyncFunction<any,int,boolean>} action Filter action
	 * @return {LinqArray} Reduced LINQ array
	 */
	async SkipWhileAsync(action){
		//TEST
		const res=new this.constructor();
		res.#Parent=this;
		let item;
		for await (item of this.GetWhenNotAsync(action)) res.push(item);
		return res;
	}

	/**
	 * Get items after the filter action returns `false`
	 * 
	 * @param {Function<any,int,boolean>} action Filter action
	 * @return {...any} Items
	 */
	*GetWhenNot(action){
		const generator=this._GetIterator();
		let item,
			index=0;
		for(item=generator.next();!item.done&&action(item.value,index);item=generator.next(),index++);
		if(!item.done){
			yield item;
			yield* generator;
		}
	}

	/**
	 * Get items after the filter action returns `false`
	 * 
	 * @param {AsyncFunction<any,int,boolean>} action Filter action
	 * @return {...any} Items
	 */
	async *GetWhenNotAsync(action){
		const generator=this._GetIterator();
		let item,
			index=0;
		for(item=generator.next();!item.done&&await action(item.value,index);item=generator.next(),index++);
		if(!item.done){
			yield item;
			yield* generator;
		}
	}

	/**
	 * Take X items
	 * 
	 * @param {int} count Count
	 * @return {LinqArray} Reduced LINQ array
	 */
	Take(count){
		//TEST
		if(count<0) return this.TakeLast(+count);
		if(count<1) return this._CreateInstance();
		const self=this,
			estimatedCount=this.TryGetNonEnumeratedCount();
		return this._CreateGenerated(function*(){
			const generator=self._GetIterator();
			for(let item;count&&!(item=generator.next()).done;count--) yield item;
		},estimatedCount==null?null:Math.max(0,Math.min(estimatedCount,count)));
	}

	/**
	 * Take the last n items
	 * 
	 * @param {int} count Count
	 * @return {LinqArray} Reduced LINQ array
	 */
	TakeLast(count){
		//TEST
		if(!count) return this._CreateInstance();
		if(this._EnsureFinite().#IsDynamic){
			const self=this;
			return this._CreateGenerated(function*(){
				const buffer=[];
				let item;
				for(item of self){
					buffer.push(item);
					if(buffer.length>count) buffer.shift();
				}
				yield* buffer[Symbol.iterator]();
			});
		}
		const len=this.EnsureGenerated()._Iterable.length;
		switch(true){
			case !len:return this._CreateInstance();
			case len<count:return this.ToLinqArray();
			default:return this.Skip(len-count);
		}
	}

	/**
	 * Take items until the filter action returns `false`
	 * 
	 * @param {Function<any,int,boolean>} action Filter action
	 * @return {LinqArray} Reduced LINQ array
	 */
	TakeWhile(action){
		//TEST
		const self=this;
		return this._CreateGenerated(this.#IsDynamic?function*(){yield* self.GetWhile(action);}:this.GetWhile(action));
	}

	/**
	 * Take items until the filter action returns `false`
	 * 
	 * @param {AsyncFunction<any,int,boolean>} action Filter action
	 * @return {LinqArray} Reduced LINQ array
	 */
	async TakeWhileAsync(action){
		//TEST
		const res=new this.constructor();
		res.#Parent=this;
		let item;
		for await (item of this.GetWhileAsync(action)) res.push(item);
		return res;
	}

	/**
	 * Get items until the filter action returns `false`
	 * 
	 * @param {Function<any,int,boolean>} action Filter action
	 * @return {...any} Items
	 */
	*GetWhile(action){
		const generator=this._GetIterator();
		for(let item=generator.next(),index=0;!item.done&&action(item.value,index);item=generator.next(),index++) yield item.value;
	}

	/**
	 * Get items until the filter action returns `false`
	 * 
	 * @param {AsyncFunction<any,int,boolean>} action Filter action
	 * @return {...any} Items
	 */
	async *GetWhileAsync(action){
		const generator=this._GetIterator();
		for(let item=generator.next(),index=0;!item.done&&await action(item.value,index);item=generator.next(),index++) yield item.value;
	}

	/**
	 * Append item(s)
	 * 
	 * @param  {...any} items Items
	 * @return {LinqArray} Extended LINQ array
	 */
	Append(...items){return this.AppendAll(items);}

	/**
	 * Append item(s)
	 * 
	 * @param  {Array} items Items
	 * @return {LinqArray} Extended LINQ array
	 */
	AppendAll(items){
		//TEST
		const self=this._EnsureFinite(),
			isFinalArray=this.#IsDynamic?false:!LinqArray.Helper.IsLinqArray(items)||items.IsGenerated,
			estimatedCount=isFinalArray?this.TryGetNonEnumeratedCount():null;
		return this._CreateGenerated(function*(){
			const generator=self._GetIterator();
			let item;
			for(item of generator) yield item;
			yield* items[Symbol.iterator]();
		},estimatedCount==null?null:estimatedCount+items.length);
	}

	/**
	 * Append item(s) to THIS LINQ array
	 * 
	 * @param  {...any} items Items
	 * @return {LinqArray} This
	 */
	AppendThis(...items){return this.AppendAllThis(items);}

	/**
	 * Append item(s) to THIS LINQ array
	 * 
	 * @param  {Array} items Items
	 * @return {LinqArray} This
	 */
	AppendAllThis(items){
		//TEST
		if(this._EnsureFinite().#IsDynamic){
			const generator=this.#Generator;
			this.#Generator=function*(){
				let item;
				for(item of generator()) yield item;
				yield* items[Symbol.iterator]();
			};
			return this;
		}
		const isFinalArray=!LinqArray.Helper.IsLinqArray(items)||items.IsGenerated;
		if(isFinalArray&&!items.length) return this;
		this.EnsureGenerated().#IsGenerated=false;
		this.#Generator=function*(){yield* items[Symbol.iterator]();}();
		this.#EstimatedCount=isFinalArray?this._Iterable.length+items.length:null;
		return this;
	}

	/**
	 * Prepend item(s)
	 * 
	 * @param  {...any} items Items
	 * @return {LinqArray} Extended LINQ array
	 */
	Prepend(...items){return this.PrependAll(items);}

	/**
	 * Prepend item(s)
	 * 
	 * @param  {Array} items Items
	 * @return {LinqArray} Extended LINQ array
	 */
	PrependAll(items){
		//TEST
		const self=this,
			isLinq=LinqArray.Helper.IsLinqArray(items),
			isFinalArray=this.#IsDynamic?false:!isLinq||items.IsGenerated,
			estimatedCount=isFinalArray?this.TryGetNonEnumeratedCount():null;
		if(isLinq) items._EnsureFinite();
		return this._CreateGenerated(function*(){
			let item;
			for(item of items) yield item;
			yield* self._GetIterator();
		},estimatedCount==null?null:estimatedCount+items.length);
	}

	/**
	 * Prepend item(s) to THIS LINQ array
	 * 
	 * @param  {...any} items Items
	 * @return {LinqArray} This
	 */
	PrependThis(...items){return this.PrependAllThis(items);}

	/**
	 * Prepend item(s) to THIS LINQ array
	 * 
	 * @param {Array} items Items
	 * @return {LinqArray} This
	 */
	PrependAllThis(items){
		//TEST
		const isLinq=LinqArray.Helper.IsLinqArray(items);
		if(isLinq) items._EnsureFinite();
		if(this.#IsDynamic){
			const generator=this.#Generator;
			this.#Generator=function*(){
				let item;
				for(item of items[Symbol.iterator]) yield item;
				yield* generator();
			};
			return this;
		}
		const len=LinqArray.Helper.GetArrayLength(items);
		if(!len) return this;
		this.EnsureGenerated().unshift(...items);
		if(!this.#IsGenerated&&this.#EstimatedCount!=null) this.#EstimatedCount+=len;
		return this;
	}

	/**
	 * Concat array(s)
	 * 
	 * @param  {...Array} arrs Arrays
	 * @return {LinqArray} Extended LINQ array
	 */
	Concat(...arrs){return this.ConcatAll(arrs);}

	/**
	 * Concat array(s)
	 * 
	 * @param  {Array} arrs An array of arrays
	 * @return {LinqArray} Extended LINQ array
	 */
	ConcatAll(arrs){
		//TEST
		const self=this._EnsureFinite(),
			res=this._CreateGenerated(function*(){
				let item,
					arr;
				for(item of self._GetIterator()) yield item;
				if(!self.#IsDynamic&&!arrs.some(arr=>LinqArray.Helper.IsLinqArray(arr)&&!arr.IsGenerated))
					res.#EstimatedCount=res.length+arrs.map(i=>i.length).reduce((total,current)=>total+current,0);
				for(arr of arrs){
					if(LinqArray.Helper.IsLinqArray(arr)) arr._EnsureFinite();
					for(item of arr)
						yield item;
				}
			});
		return res;
	}

	/**
	 * Concat array(s) to THIS LINQ array
	 * 
	 * @param  {...Array} arrs Arrays
	 * @return {LinqArray} This
	 */
	ConcatThis(...arrs){return this.ConcatAllThis(arrs);}

	/**
	 * Concat array(s) to THIS LINQ array
	 * 
	 * @param  {Array} arrs An array of arrays
	 * @return {LinqArray} This
	 */
	ConcatAllThis(arrs){
		//TEST
		if(this._EnsureFinite().#IsDynamic){
			const generator=this.#Generator;
			this.#Generator=function*(){
				let item,
					arr;
				for(item of generator()) yield item;
				for(arr of arrs)
					for(item of arr)
						yield item;
			};
			return this;
		}
		this.EnsureGenerated().#IsGenerated=false;
		this.#Generator=function*(){
			let arr,
				item;
			for(arr of arrs){
				if(LinqArray.Helper.IsLinqArray(arr)) arr._EnsureFinite();
				for(item of arr)
					yield item;
			}
		}();
		this.#EstimatedCount=!arrs.some(item=>LinqArray.Helper.IsLinqArray(item)&&!item.IsGenerated)
			?this._Iterable.length+arrs.map(i=>i.length).reduce((total,current)=>total+current,0)
			:null;
		return this;
	}

	/**
	 * Create chunks
	 * 
	 * @param {int} count Chunk size
	 * @return {LinqArray} Chunks as LINQ arrays
	 */
	Chunk(count){
		//TEST
		const self=this,
			estimatedCount=this.TryGetNonEnumeratedCount();
		return this._CreateGenerated(function*(){
			const generator=self._GetIterator();
			for(let item={done:false},data;!item.done;){
				data=[];
				for(;data.length<count&&!(item=generator.next()).done;data.push(item.value));
				if(data.length) yield self._CreateInstance(data);
			}
		},estimatedCount==null?null:Math.ceil(estimatedCount/count));
	}

	/**
	 * Reverse
	 * 
	 * @param {boolean} inPlace (optional) Reverse THIS LINQ array (default: `false`)
	 * @return {LinqArray} Reversed LINQ array
	 */
	Reverse(inPlace=false){
		//TEST
		const self=this._EnsureFinite();
		if(this.#Extended){
			if(inPlace){
				for(let i=this.#Extended.length,values=this.ToArray(),j=0;i>=0;this[j]=values[i],i--,j++);
				return this;
			}else{
				let res=(new this.constructor()).Generate(function*(){
					for(let i=self.#Extended.length-1;i>=0;i--) yield self[i];
				}());
				res.#Parent=this;
				return res;
			}
		}else if(this.#IsDynamic){
			if(inPlace) throw new TypeError();
			return this._CreateGenerated(function*(){yield* self.ToArray().reverse()[Symbol.iterator]();});
		}
		let res=inPlace?this.EnsureGenerated().reverse():this.EnsureGenerated().slice().reverse();
		res.#Parent=this;
		return res;
	}

	/**
	 * Maximum value
	 * 
	 * @param {Function<any,int,any>|string} action (optional) Value action or item key name
	 * @return {number} Maximum value
	 */
	Max(action=null){
		//TEST
		if(this._EnsureFinite().#IsDynamic){
			if(action!=null) action=LinqArray.Helper.EnsureValueGetter(action);
			let res,
				v,
				found=false;
			this.ForEach((item,index)=>{
				v=action?action(item,index):item;
				if(found&&v<=res) return;
				res=v;
				found=true;
			});
			if(!found) throw new RangeError();
			return res;
		}
		switch(this.EnsureGenerated()._Iterable.length){
			case 0:throw new RangeError();
			case 1:return this.First();
			default:return Math.max(...(action==null?this:this.Select(action)));
		}
	}

	/**
	 * Item with the maximum
	 * 
	 * @param {Function<any,int,any>|string} action Value action or item key name
	 * @return {any} Item with the maximum
	 */
	MaxBy(action){
		//TEST
		action=LinqArray.Helper.EnsureValueGetter(action);
		if(this._EnsureFinite().#IsDynamic){
			let res,
				resV,
				v,
				found=false;
			this.ForEach((item,index)=>{
				v=action(item,index);
				if(found&&v<=resV) return;
				res=item;
				resV=v;
				found=true;
			});
			if(!found) throw new RangeError();
			return res;
		}
		switch(this.EnsureGenerated()._Iterable.length){
			case 0:throw new RangeError();
			case 1:return this.First();
		}
		let max=null,
			res,
			v,
			item,
			index=0;
		for(item of this._GetIterator()){
			v=action(item,index);
			if(v==Number.MAX_VALUE) return item;
			if(max!=null&&v<=max){
				index++;
				continue;
			}
			max=v;
			res=item;
			index++;
		}
		return res;
	}

	/**
	 * Minimum value
	 * 
	 * @param {Function<any,int,any>|string} action (optional) Value action or item key name
	 * @return {number} Minimum value
	 */
	Min(action=null){
		//TEST
		if(this._EnsureFinite().#IsDynamic){
			if(action!=null) action=LinqArray.Helper.EnsureValueGetter(action);
			let res,
				v,
				found=false;
			this.ForEach((item,index)=>{
				v=action?action(item,index):item;
				if(found&&v>=res) return;
				res=v;
				found=true;
			});
			if(!found) throw new RangeError();
			return res;
		}
		switch(this.EnsureGenerated()._Iterable.length){
			case 0:throw new RangeError();
			case 1:return this.First();
			default:return Math.min(...(action==null?this:this.Select(action)));
		}
	}

	/**
	 * Item with the minimum
	 * 
	 * @param {Function<any,int,any>|string} action Value action or item key name
	 * @return {any} Item with the minimum
	 */
	MinBy(action){
		//TEST
		action=LinqArray.Helper.EnsureValueGetter(action);
		if(this._EnsureFinite().#IsDynamic){
			let res,
				resV,
				v,
				found=false;
			this.ForEach((item,index)=>{
				v=action(item,index);
				if(found&&v>=resV) return;
				res=item;
				resV=v;
				found=true;
			});
			if(!found) throw new RangeError();
			return res;
		}
		switch(this.EnsureGenerated()._Iterable.length){
			case 0:throw new RangeError();
			case 1:return this.First();
		}
		let min=null,
			res,
			v,
			item,
			index=0;
		for(item of this._GetIterator()){
			v=action(item,index);
			if(v==Number.MIN_VALUE) return item;
			if(min!=null&&v>=min){
				index++;
				continue;
			}
			min=v;
			res=item;
			index++;
		}
		return res;
	}

	/**
	 * Summarize
	 * 
	 * @param {Function<any,int,any>|string} action (optional) Value action or item property name
	 * @return {number} Summary of all values
	 */
	Sum(action=null){
		//TEST
		if(action!=null) action=LinqArray.Helper.EnsureValueGetter(action);
		return this._EnsureFinite().#IsDynamic
			?this.Aggregate((total,current,index)=>total+(action?action(current,index):current),0)
			:(action==null?this:this.Select(action)).EnsureGenerated().reduce((total,current)=>total+current,0);
	}

	/**
	 * Average value
	 * 
	 * @param {Function<any,int,any>|string} action (optional) Value action or item property name
	 * @return {number} Average value
	 */
	Average(action=null){
		//TEST
		const sum=this.Sum(action),
			len=this._Iterable.length;
		return len?sum/len:0;
	}

	/**
	 * Determine if an array equals this
	 * 
	 * @param {Array} arr Array
	 * @param {Function<any,any,boolean,boolean>} comp (optional) Comparing action
	 * @param {boolean} strict (optional) Be strict (default: `false`)?
	 * @return {boolean} Is equal?
	 */
	SequenceEqual(arr,comp=null,strict=false){
		//TEST
		const iA=this._EnsureFinite()._GetIterator(),
			iB=arr[Symbol.iterator]();
		let a,
			b;
		for(a=iA.next(),b=iB.next();!a.done&&!b.done;a=iA.next(),b=iB.next())
			if(!(comp?comp(a.value,b.value,strict):(strict?a.value===b.value:a.value==b.value)))
				return false;
		return a.done==b.done;
	}

	/**
	 * Aggregate
	 * 
	 * @param {Function<any,any,int,any>} action Action per item that returns the next seed (and will get the seed, the item and the index as parameters)
	 * @param {any} seed (optional) Initial value
	 * @param {Function<any,any>} result (optional) Result action
	 * @return {any} Result
	 */
	Aggregate(action,seed=undefined,result=null){
		//TEST
		const hasSeed=!LinqArray.Helper.IsUndefined(seed);
		if(this._EnsureFinite().#IsDynamic){
			if(hasSeed){
				this.ForEach(item=>seed=action(seed,item));
			}else{
				let first=true;
				this.ForEach((item,index)=>{
					if(first){
						seed=item;
						first=false;
					}else{
						seed=action(seed,item,index);
					}
				});
				if(first) throw new RangeError();
			}
		}else{
			const len=this.EnsureGenerated()._Iterable.length;
			if(!len){
				if(!hasSeed) throw new RangeError();
				return result?result(seed):seed;
			}
			if(hasSeed){
				this.ForEach((item,index)=>seed=action(seed,item,index));
			}else{
				if(len==1) return result?result(this._Iterable[0]):this._Iterable[0];
				let first=true;
				this.ForEach((item,index)=>{
					if(first){
						seed=item;
						first=false;
					}else{
						seed=action(seed,item,index);
					}
				});
			}
		}
		return result?result(seed):seed;
	}

	/**
	 * Aggregate
	 * 
	 * @param {AsyncFunction<any,any,int,any>} action Action per item that returns the next seed (and will get the seed, the item and the index as parameters)
	 * @param {any} seed (optional) Initial value
	 * @param {AsyncFunction<any,any>} result (optional) Result action
	 * @return {any} Result
	 */
	async AggregateAsync(action,seed=undefined,result=null){
		//TEST
		const hasSeed=!LinqArray.Helper.IsUndefined(seed);
		if(this._EnsureFinite().#IsDynamic){
			if(hasSeed){
				await this.ForEachAsync(async (item,index)=>seed=await action(seed,item,index));
			}else{
				let first=true;
				await this.ForEachAsync(async (item,index)=>{
					if(first){
						seed=item;
						first=false;
					}else{
						seed=await action(seed,item,index);
					}
				});
				if(first) throw new RangeError();
			}
		}else{
			const len=this.EnsureGenerated()._Iterable.length;
			if(!len){
				if(!hasSeed) throw new RangeError();
			}else if(hasSeed){
				await this.ForEachAsync(async (item,index)=>seed=await action(seed,item,index));
			}else if(len==1){
				seed=this._Iterable[0];
			}else{
				let first=true;
				await this.ForEachAsync(async (item,index)=>{
					if(first){
						seed=item;
						first=false;
					}else{
						seed=await action(seed,item,index);
					}
				});
			}
		}
		return result?await result(seed):seed;
	}

	/**
	 * Execute an action for all items (until interrupted)
	 * 
	 * @param {Function<any,int,any>} action Action with a return value
	 * @return {...any} Return values
	 */
	*Execute(action){
		let item,
			index=0;
		for(item of this._GetIterator()){
			yield action(item,index);
			index++;
		}
	}

	/**
	 * Execute an asynchronous action for all items (until interrupted)
	 * 
	 * @param {AsyncFunction<any,int,any>} action Asynchronous action with a return value
	 * @return {...any} Return values
	 */
	async *ExecuteAsync(action){
		let item,
			index=0;
		for(item of this._GetIterator()){
			yield await action(item,index);
			index++;
		}
	}

	/**
	 * Execute an action for each item
	 * 
	 * @param {Function<any,int,boolean?>} action Action (gets the item and the index as parameters, may return `false` to break the loop (and cut the resulting array, too!))
	 * @param {boolean} inPlace (optional) Execute for THIS LINQ array (don't create a new LINQ array) (default: `true`)?
	 * @return {LinqArray} New LINQ array or this
	 */
	ForEach(action,inPlace=true){
		//TEST
		const self=this;
		if(inPlace){
			let index=0,
				item;
			for(item of this._GetIterator()){
				if(action(item,index)===false) break;
				index++;
			}
		}
		return inPlace
			?this
			:this._CreateGenerated(function*(){
				let index=0,
					item;
				for(item of self._GetIterator()){
					if(action(item,index)===false) break;
					yield item;
					index++;
				}
			});
	}

	/**
	 * Execute an asynchronous action for each item IN PLACE
	 * 
	 * @param {AsyncFunction<any,int,boolean?>} action Action (gets the item and the index as parameters, may return `false` to break the loop (and cut the resulting array, too!))
	 * @return {LinqArray} This
	 */
	async ForEachAsync(action){
		//TEST
		let index=0,
			item;
		for(item of this._GetIterator()){
			if((await action(item,index))===false) break;
			index++;
		}
		return this;
	}

	/**
	 * Convert to an array
	 * 
	 * @param {int} count (optional) Number of items to put into the array (default: `null` (=all))
	 * @param {boolean} deep (optional) Convert all (directly contained) LINQ array subsets recursive to an array, too (default: `false`)?
	 * @return {Array} Array
	 */
	ToArray(count=null,deep=false){
		//TEST
		if(!deep) return count==null?[...this._EnsureFinite()]:this.Take(count).ToArray();
		if(count!=null) return this.Take(count).ToArray(null,true);
		const res=[...this._EnsureFinite()],
			len=res.length;
		let k,
			v;
		for(let i=0;i<len;i++)
			if(LinqArray.Helper.IsLinqArray(res[i])){
				res[i]=res[i].ToArray(null,true);
			}else if(typeof res[i]=='object'){
				for([k,v] of Object.entries(res[i])) if(LinqArray.Helper.IsLinqArray(v)) res[i][k]=res[i][k].ToArray(null,true);
			}
		return res;
	}

	/**
	 * Convert to an array
	 * 
	 * @param {int} count (optional) Number of items to put into the array (default: `null` (=all))
	 * @return {Array} Array
	 */
	ToList(count=null){return this.ToArray(count);}//TEST

	/**
	 * Create a map (a dictionary)
	 * 
	 * The generator functions will get the item as first, and the resulting map as second parameter.
	 * 
	 * @param {Function<any,int,any>|string} key Key action or item key name
	 * @param {Function<any,any,any>} value (optional) Value action (gets the item and the generated key as parameters and needs to return the value to use) (default: `null`)
	 * @return {Map<any>} Map
	 */
	ToDictionary(key,value=null){
		//TEST
		const self=this._EnsureFinite();
		key=LinqArray.Helper.EnsureValueGetter(key);
		return new Map(function*(){
			let k,
				item,
				index=0;
			for(item of self._GetIterator()){
				k=key(item);
				yield [k,value?value(item,k,index):item];
				index++;
			}
		}());
	}

	/**
	 * Create a set (with distinct values)
	 * 
	 * @param {Function<any,Set,int,any>|string} value (optional) Value action (gets the item, the resulting set and the index as parameters and needs to return the value to use) or item key name (default: `null`)
	 * @return {Set} Set
	 */
	ToHashSet(value=null){
		//TEST
		const self=this._EnsureFinite();
		if(value!=null) value=LinqArray.Helper.EnsureValueGetter(value);
		const res=new Set(value?function*(){
			let item,
				index=0;
			for(item of self._GetIterator()){
				yield value?value(item,res,index):item;
				index++;
			}
		}():this);
		return res;
	}

	/**
	 * Create a lookup map (a dictionary with multiple values per key)
	 * 
	 * @param {Function<any,int,any>|string} key (optional) Key action or item key name (default: `null`)
	 * @param {Function<any,any,int,any>} value (optional) Value action (gets the item, the generated key and the index as parameters and needs to return the value to use)
	 * @return {Map} Lookup map
	 */
	ToLookup(key,value=null){
		//TEST
		this._EnsureFinite();
		const res=new Map();
		let lookup,
			v;
		if(key!=null) key=LinqArray.Helper.EnsureValueGetter(key);
		this.ForEach((item,index)=>{
			lookup=key?key(item,index):item;
			v=value?value(item,index):item;
			if(!res.has(lookup)){
				res.set(lookup,[v]);
			}else{
				res.get(lookup).push(v);
			}
		});
		return res;
	}

	/**
	 * Create a LINQ array from this LINQ array
	 * 
	 * @param {int} count (optional) Number of items to put into the LINQ array (default: `null` (=all))
	 * @return {LinqArray} Generated LINQ array
	 */
	ToLinqArray(count=null){
		//TEST
		if(count) return this.Take(count);
		return this.#IsDynamic?this._CreateInstance().GenerateDynamic(this.#Generator):this._CreateInstance(this);
	}

	/**
	 * Convert this instance to a new dynamic LINQ array
	 * 
	 * @return {LinqArray} Dynamic LINQ array
	 */
	ToDynamic(){
		//TEST
		return this.#IsDynamic
			?this._CreateInstance().GenerateDynamic(this.#Generator)
			:this._EnsureFinite().EnsureGenerated()._CreateInstance().SetDynamicData(this.ToArray());
	}

	/**
	 * Create a JSON object from this instance
	 * 
	 * @return {string} JSON string
	 */
	ToJson(){
		//TEST
		return JSON.stringify({
			Type:this.Type,
			GroupKey:this.GroupKey,
			Tag:this.Tag,
			Items:this.ToArray(null,true)
		});
	}

	/**
	 * Ensure all items are generated
	 * 
	 * @param {int} until (optional) Until item number `until` (default: `null`)
	 * @return {LinqArray} This
	 */
	EnsureGenerated(until=null){
		//TEST
		if(this._EnsureFinite().#IsDynamic) throw new TypeError('Is dynamic');
		if(this.#Extended||this.#IsGenerated||!this.#Generator||(until&&this.length>=until)) return this;
		if(!this.#Store) throw new TypeError('Storing was disabled');
		const generator=this.#Generator;
		let item=null;
		for(let count=until??0;(!until||count)&&!(item=generator.next()).done;this.push(item.value),count--);
		if(!(item?.done??false)) return this;
		this.#Generator=null;
		this.#IsGenerated=true;
		this.#EstimatedCount=null;
		return this;
	}

	/**
	 * Finalize the item generator (or force a dynamic LINQ array to fully iterate once)
	 * 
	 * @return {LinqArray} This
	 */
	Finalize(){
		//TEST
		if(this.#Store) return this.EnsureGenerated();
		const generator=this._EnsureFinite().#IsDynamic?this.#Generator():this.#Generator;
		if(this.#IsGenerated||!generator) return this;
		for(;!generator.next().done;);
		if(this.#IsDynamic) return this;
		this.#Generator=null;
		this.#IsGenerated=true;
		this.#EstimatedCount=null;
		return this;
	}

	/**
	 * Exchange the data
	 * 
	 * @param {...any} items Items
	 * @return {LinqArray} This
	 */
	SetData(...items){return this.SetAllData(items);}

	/**
	 * Exchange the data
	 * 
	 * @param {Array} items Array of items
	 * @param {boolean} useGenerator (optional) Use a generator function to access the items (default: `false`)?
	 * @return {LinqArray} This
	 */
	SetAllData(items,useGenerator=false){
		//TEST
		this.Clear();
		if(useGenerator){
			this.#IsGenerated=false;
			this.#EstimatedCount=LinqArray.Helper.IsLinqArray(items)?items.TryGetNonEnumeratedCount():items.length;
			this.#Generator=function*(){yield* items[Symbol.iterator]();}();
		}else{
			if(LinqArray.Helper.IsLinqArray(items)) items._EnsureFinite();
			this.push(...items);
		}
		return this;
	}

	/**
	 * Exchange the data with dynamic data (data which may change)
	 * 
	 * @param {Array} items Array of items
	 * @return {LinqArray} This
	 */
	SetDynamicData(items){return this.GenerateDynamic(function*(){yield* items[Symbol.iterator]();})}

	/**
	 * Clear this instance
	 * 
	 * **NOTE**: The `Parent` object won't be cleared!
	 * 
	 * @param {boolean} clearParent (optional) Clear the parent property (default: `false`)
	 * @return {LinqArray} This
	 */
	Clear(clearParent=false){
		//TEST
		if(!this.#Extended&&this.length) this.length=0;
		if(clearParent) this.#Parent=null;
		this.#OrderAction=null;
		this.#Ordering=null;
		this.#OrderDescending=null;
		this.#GroupKey=undefined;
		this.#IsGenerated=true;
		this.#IsDynamic=false;
		this.#EstimatedCount=null;
		this.#Generator=null;
		this.#Store=!this.#Extended;
		this.#Iterated=false;
		return this;
	}

	/**
	 * Disable storing generated items in the array buffer
	 * 
	 * **NOTE**: After storing was disabled, this instance can iterate trough generated items only once! Many methods require the store to be enabled and won't 
	 * work anymore, when the store was disabled.
	 * 
	 * @param {boolean} pass (optional) Pass this behavior to created instances?
	 * @return {LinqArray} This
	 */
	DisableStore(pass=false){
		if(!this.#Store) throw new TypeError('Storing is disabled already');
		if(this.length) throw new TypeError('Stored already');
		this.#Store=false;
		this.#PassStore=pass;
		return this;
	}

	/**
	 * Disable the dynamic generator
	 * 
	 * @param {boolean} inPlace (optional) Disable the dynamic generator for THIS LINQ array (default: `true`)?
	 * @return {LinqArray} This or a new generated LINQ array without dynamic generator
	 */
	DisableDynamic(inPlace=true){
		if(!this.#IsDynamic) throw new TypeError('Not dynamic');
		if(!inPlace) return this._CreateInstance().Generate(this.#Generator());
		this.#Generator=this.#Generator();
		this.#IsDynamic=false;
		this.#Store=true;
		this.#PassStore=false;
		return this;
	}

	/**
	 * Clear and use an item iterator
	 * 
	 * @param {Iterator} items Item iterator
	 * @param {int} length (optional) Estimated length
	 * @return {LinqArray} This
	 */
	Generate(items,length=null){
		this.Clear().#IsGenerated=false;
		this.#Generator=items;
		this.#EstimatedCount=length;
		return this;
	}

	/**
	 * Clear and use a dynamic item generator function
	 * 
	 * @param {Generator} generator Generator function
	 * @return {LinqArray} This
	 */
	GenerateDynamic(generator){
		this.Generate(generator).#IsDynamic=true;
		return this.#Store?this.DisableStore():this;
	}

	/**
	 * Create a new instance
	 * 
	 * @param {Array} data (optional) Data
	 * @return {LinqArray} New instance
	 */
	_CreateInstance(data=null){
		const res=new this.constructor(data);
		res._SetParent(this);
		if(this.#PassStore) res.DisableStore(true);
		return res;
	}

	/**
	 * Create a generated instance
	 * 
	 * @param {Generator|Iterator} generator Generator or iterator
	 * @param {int} length (optional) Estimated length
	 * @return {LinqArray} New LINQ array
	 */
	_CreateGenerated(generator,length=null){
		const res=this._CreateInstance();
		if(this.#IsDynamic&&generator.constructor.name=='Generator'){
			res.GenerateDynamic(generator);
		}else{
			res.Generate(generator(),length);
		}
		return res._SetParent(this);
	}

	/**
	 * Get an iterator
	 * 
	 * @return {Iterator} Iterator
	 */
	_GetIterator(){return this.#IsDynamic?this.#Generator():this._Iterable[Symbol.iterator]();}

	/**
	 * Set the group key
	 * 
	 * @param {any} key Key
	 * @return {LinqArray} This
	 */
	_SetGroupKey(key){
		this.#GroupKey=key;
		return this;
	}

	/**
	 * Set the parent
	 * 
	 * @param {LinqArray} parent Parent
	 * @return {LinqArray} This
	 */
	_SetParent(parent){
		this.#Parent=parent;
		return this;
	}

	/**
	 * Ensure a finite sequence
	 * 
	 * @return {LinqArray} This
	 */
	_EnsureFinite(){
		//TEST
		if(this.#EstimatedCount!=null&&!Number.isFinite(this.#EstimatedCount)) throw new TypeError('Is not finite');
		return this;
	}

	/**
	 * Ensure having an action or a default result
	 * 
	 * @param {any} action Action
	 * @param {any} defaultResult Default result
	 * @return {Array} Final action and default result
	 */
	#EnsureActionOrDefaultResult(action,defaultResult){
		if(LinqArray.Helper.IsUndefined(action)) throw new TypeError('Action or default result required');
		if(!LinqArray.Helper.IsFunction(action)){
			defaultResult=action;
			action=null;
		}
		return [action,defaultResult];
	}

	/**
	 * Iterator
	 * 
	 * @return {...any} Items
	 */
	*[Symbol.iterator](){
		if(this.#IsDynamic){
			yield* this.#Generator();
			return;
		}
		if(this.#Extended){
			yield* this.#Extended[Symbol.iterator]();
			return;
		}
		const generator=this.#Generator,
			superGenerator=this.#Store?super[Symbol.iterator]():null;
		if(!generator){
			if(!this.#Store) throw new TypeError('Iterated already - buffer is disabled');
			yield* superGenerator;
			return;
		}
		let count=0;
		if(superGenerator) for(let item=superGenerator.next();!item.done;item=superGenerator.next(),count++) yield item.value;
		for(let item=generator.next();!item.done;item=generator.next(),count++){
			if(this.#Store){
				this.push(item.value);
			}else{
				this.#Iterated=true;
			}
			yield item.value;
		}
		this.#Generator=null;
		this.#IsGenerated=true;
		this.#EstimatedCount=this.#Store||this.#IsDynamic?null:count;
	}

	/**
	 * Constructor
	 * 
	 * @param {Array} items (optional) Items
	 * @param {boolean} store (optional) Store generated items (default: `true`)?
	 * @param {boolean} pass (optional) Pass this behavior to created instances?
	 */
	constructor(items=null,store=true,pass=false){
		super();
		if(!store) this.DisableStore(pass);
		if(!items) return;
		const isLinq=LinqArray.Helper.IsLinqArray(items),
			len=isLinq?items.TryGetNonEnumeratedCount():items.length;
		if(!isLinq&&!len) return;
		this.#IsGenerated=false;
		this.#Generator=function*(){yield* items[Symbol.iterator]();}();
		this.#EstimatedCount=len;
	}

	/**
	 * Create a new LINQ array
	 * 
	 * @param {Array} arr Array
	 * @param {boolean} store (optional) Store generated items (default: `true`)?
	 * @param {boolean} pass (optional) Pass this behavior to created instances?
	 * @return {LinqArray} LINQ array
	 */
	static From(arr,store=true,pass=false){return new this(arr,store,pass);}

	/**
	 * Deserialize a JSON string or object
	 * 
	 * @param {string|object} json JSON string or object
	 * @return {LinqArray} LINQ array
	 */
	static FromJson(json){
		if(LinqArray.Helper.IsString(json)) json=JSON.parse(json);
		if(typeof json!='object') throw new TypeError();
		const res=(new Function('data','return new '+json.Type+'(data);'))(json.Items);
		res._SetGroupKey(json.GroupKey).Tag=json.Tag;
		return res;
	}

	/**
	 * Create from a JSON URI
	 * 
	 * @param {string} uri URI
	 * @return {LinqArray} LINQ array
	 */
	static async FromJsonUri(uri){
		const json=await (await fetch(uri)).json();
		return json instanceof Array?new this(json):this.FromJson(json);
	}

	/**
	 * Create a number range
	 * 
	 * @param {int} fromIncluding From including
	 * @param {int} toExcluding To excluding
	 * @param {boolean} store (optional) Store generated items (default: `true`)?
	 * @param {boolean} pass (optional) Pass this behavior to created instances?
	 * @return {LinqArray} LINQ array
	 */
	static Range(fromIncluding,toExcluding,store=true,pass=false){
		const res=new this(null,store,pass);
		res.#IsGenerated=false;
		res.#Generator=function*(){
			if(fromIncluding<toExcluding){
				for(let i=fromIncluding;i<toExcluding;i++) yield i;
			}else{
				for(let i=fromIncluding;i>toExcluding;i--) yield i;
			}
		}();
		res.#EstimatedCount=fromIncluding<toExcluding?toExcluding-fromIncluding:fromIncluding-toExcluding;
		return res;
	}

	/**
	 * Create an empty LINQ array
	 * 
	 * @return {LinqArray} Empty LINQ array
	 */
	static Empty(){return new this();}

	/**
	 * Repeat an element
	 * 
	 * @param {any|Function<int,LinqArray,any>} e Element or action that returns an element (gets the index and the LINQ array as parameters)
	 * @param {int} count Count
	 * @param {boolean} store (optional) Store generated items (default: `true`)?
	 * @param {boolean} pass (optional) Pass this behavior to created instances?
	 * @return {LinqArray} LINQ array
	 */
	static Repeat(e,count,store=true,pass=false){
		const res=new this(null,store,pass),
			isFnc=LinqArray.Helper.IsFunction(e);
		res.#IsGenerated=false;
		res.#Generator=function*(){for(let i=0;i<count;i++) yield isFnc?e(i,res):e;}();
		res.#EstimatedCount=count;
		return res;
	}

	/**
	 * Repeat an element
	 * 
	 * @param {AsyncFunction<int,LinqArray,any>} e Action that returns an element (gets the index and the LINQ array as parameters)
	 * @param {int} count Count
	 * @return {LinqArray} LINQ array
	 */
	static async RepeatAsync(e,count){
		const res=new this();
		for(let i=0;i<count;res.push(await e(i,res)),i++);
		return res;
	}

	/**
	 * Extend the `Array` prototype with a `ToLinqArray` method that works as the `ToLinqArray` method from the `LinqArray` type
	 * 
	 * **WARNING**: This may have a negative impact on the performance when working excessive with `Array`!
	 */
	static ExtendArray(){
		const linqArray=this;
		Array.prototype.ToLinqArray=function(count=null){return new linqArray(count?this.slice(0,count):this)};
	}

	/**
	 * Extend an iterable object with LINQ array methods (EXPERIMENTAL!)
	 * 
	 * **NOTE**: Existing keys won't be overwritten! `Array` methods and properties (and the array accessor) of the returned LINQ array won't work.
	 * 
	 * @param {Iterable} obj Iterable object with a length property
	 * @return {LinqArray} LINQ array
	 */
	static ExtendObject(obj){
		if(obj instanceof LinqArray) return obj;
		//TODO In this case don't use any Array methods/properties!
		if(!LinqArray.Helper.IsFunction(obj[Symbol.iterator])) throw new TypeError('Object is not iterable');
		if(LinqArray.Helper.IsUndefined(obj['length'])) throw new TypeError('Object needs a length property');
		const linq=new this(obj,false),
			map=new Map(Object.entries(obj)),
			rx=/^[_|\#|a-z]/;
		let k,
			v;
		linq.#Extended=obj;
		for([k,v] of Object.entries(linq)){
			if(
				rx.test(k)||
				!LinqArray.Helper.IsFunction(v)||
				v.constructor.name=='AsyncFunction'||
				v.constructor.name=='GeneratorFunction'||
				map.kas(k)||
				!(v.prototype instanceof LinqArray)
				)
				continue;
			obj[k]=(...args)=>linq[k](...args);
		}
		return linq;
	}
}

/**
 * Create a new LINQ array
 * 
 * @param {Array} arr Array
 * @param {boolean} store (optional) Store generated items (default: `true`)?
 * @param {boolean} pass (optional) Pass this behavior to created instances?
 * @return {LinqArray} LINQ array
 */
if(window&&LinqArray.Helper.IsUndefined(window['From'])) window.From=(arr,store=true,pass=false)=>LinqArray.From(arr,store,pass);

// Initialize PLINQ
if(window&&'document' in window&&!LinqArray.Helper.IsUndefined(window['PLinq'])) PLinq.TypeInfo['LinqArray']=document.currentScript.src;
