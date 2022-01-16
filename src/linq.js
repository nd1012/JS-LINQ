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
		EnsureValueGetter:(key)=>typeof key=='function'?key:(obj)=>obj[key]
	};

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
	get Pass(){return this.#Pass;}

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
	get _Iterable(){return this.#Extended??this;}

	/**
	 * Count items
	 * 
	 * @param {Function<any,bool>} action (optional) Filter action
	 * @return {int} Number of items
	 */
	Count(action=null){
		if(!action){
			if(this.#EstimatedCount!=null) return this.#EstimatedCount;
			if(this.#Extended) return this.#Extended.length;
			if(this.#IsGenerated) return this.length;
		}else if(this.#Extended){
			return this.Where(action).Count();
		}
		return this.filter(item=>action(item)).length;
	}

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
		if(!comp) return this.#Extended?this.Any(i=>item==i):this.includes(item);
		return this.Any(i=>comp(item,i));
	}

	/**
	 * Join this array with another array by their common keys
	 * 
	 * @param {Array} arr Array
	 * @param {Function<any,any>|string} action Key action or item property name
	 * @param {Function<any,any>|string} arrAction Key action or array item property name
	 * @param {Function<any,any,any>} result Value returning action (gets the item and the array item as parameters and needs to return the final result to use)
	 * @param {Function<any,any,boolean>} comp (optional) Key comparer action
	 * @return {LinqArray} Resulting LINQ array
	 */
	Join(arr,action,arrAction,result,comp=null){
		const self=this;
		action=LinqArray.Helper.EnsureValueGetter(action);
		arrAction=LinqArray.Helper.EnsureValueGetter(arrAction);
		return this._CreateGenerated(function*(){
			let vA,
				a,
				b;
			for(a of self._Iterable){
				vA=action(a);
				for(b of arr){
					if(comp?!comp(vA,arrAction(b)):vA!=arrAction(b)) continue;
					yield result(a,b);
				}
			}
		}());
	}

	/**
	 * Group join this array with another array by their common keys
	 * 
	 * @param {Array} arr Array
	 * @param {Function<any,any>|string} action Key action or item property name
	 * @param {Function<any,any>|string} arrAction Key action or array item property name
	 * @param {Function<any,LinqArray,any} result Value returning action (gets the item, the group (as LINQ array) and the group key as parameters, needs to return the final result to use)
	 * @param {Function<any,any,boolean>} comp (optional) Key comparer action
	 * @return {LinqArray} Resulting LINQ array
	 */
	GroupJoin(arr,action,arrAction,result,comp=null){
		const self=this;
		action=LinqArray.Helper.EnsureValueGetter(action);
		arrAction=LinqArray.Helper.EnsureValueGetter(arrAction);
		arr=LinqArray.Helper.EnsureLinqArray(arr,true);
		return this._CreateGenerated(function*(){
			let vA,
				group,
				a,
				b;
			for(a of self._Iterable){
				vA=action(a);
				group=arr.Where((item)=>comp?comp(vA,arrAction(item)):vA==arrAction(item));
				for(b of arr) yield result(a,group,vA);
			}
		}());
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
			for(item of self._Iterable){
				if(action(item,index)) yield item;
				index++;
			}
		}());
	}

	/**
	 * Determine if a filter applies to all values
	 * 
	 * @param {Function<any,int,boolean>} action Filter action
	 * @return {boolean} Applies to all?
	 */
	All(action){
		let res;
		for(res of this.Execute(action)) if(!res) return false;
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
		let res;
		for(res of this.Execute(action)) if(res) return true;
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
			const values=comp?new LinqArray():[];
			let item;
			for(item of self._Iterable){
				if(comp?values.Contains(item,comp):values.includes(item)) continue;
				yield item;
				values.push(item);
			}
		}());
	}

	/**
	 * Ensure distinct values
	 * 
	 * @param {Function<any,any>|string} action Value action or item key name
	 * @param {Function<any,any,boolean>} comp (optional) Comparer action
	 * @return {LinqArray} LINQ array with distinct values
	 */
	DistinctBy(action,comp=null){
		const self=this;
		return this._CreateGenerated(function*(){
			const values=comp?new LinqArray():[];
			action=LinqArray.Helper.EnsureValueGetter(action);
			let value,
				item;
			for(item of self._Iterable){
				value=action(item);
				if(comp?values.Contains(value,comp):values.includes(value)) continue;
				yield item;
				values.push(value);
			}
		}());
	}

	/**
	 * Append only non-contained values
	 * 
	 * @param {Array} arr Array
	 * @param {Function<any,any,boolean>} comp (optional) Comparer action
	 * @param {boolean} inPlace (optional) Append to THIS LINQ array (default: `false`)
	 * @return {LinqArray} Extended LINQ array
	 */
	Union(arr,comp=null,inPlace=false){
		const res=inPlace?this.EnsureGenerated():this.EnsureGenerated().slice(),
			values=this._CreateInstance(this);
		res.#IsGenerated=false;
		res.#Generator=function*(){
			let item;
			for(item of arr){
				if(values.Contains(item,comp)) continue;
				yield item;
				values.push(item);
			}
		}();
		res.#EstimatedCount=null;
		return res;
	}

	/**
	 * Append only non-contained values
	 * 
	 * @param {Array} arr Array
	 * @param {Function<any,any>|string} action Value action or item key name
	 * @param {Function<any,any,boolean>} comp (optional) Comparer action
	 * @param {boolean} inPlace (optional) Append to THIS LINQ array (default: `false`)
	 * @return {LinqArray} Extended LINQ array
	 */
	UnionBy(arr,action,comp=null,inPlace=false){
		action=LinqArray.Helper.EnsureValueGetter(action);
		const res=inPlace?this.EnsureGenerated():this.EnsureGenerated().slice(),
			self=this;
		res.#IsGenerated=false;
		res.#Generator=function*(){
			const values=self.Select(action);
			let value,
				item;
			for(item of arr){
				value=action(item);
				if(values.Contains(value,comp)) continue;
				yield item;
				values.push(value);
			}
		}();
		res.#EstimatedCount=null;
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
			for(item of self._Iterable){
				yield action(item,index);
				index++;
			}
		}(),this.TryGetNonEnumeratedCount());
	}

	/**
	 * Select many items
	 * 
	 * @param {Function<any,int,Array>|string} selector Items selector (will get a source item and the index as parameters, and needs to return an array of items to use) or item key name
	 * @param {Function<any,any,any>} result (optional) Result action (will get a source item and one of the selected items as parameters, and needs to return the final item to use)
	 * @return {LinqArray} Resulting items LINQ arary
	 */
	SelectMany(selector,result=null){
		const self=this;
		return this._CreateGenerated(function*(){
			let index=0,
				item,
				selected,
				i;
			selector=LinqArray.Helper.EnsureValueGetter(selector);
			for(item of self._Iterable){
				if(result){
					for(selected of selector(item,index))
						for(i of selected)
							yield result(i,selected);
				}else{
					for(i of selector(item,index)) yield i;
				}
				index++;
			}
		}());
	}

	/**
	 * Combine sequences
	 * 
	 * @param {Array} arr Second sequence
	 * @param {Function<any,any,any>|Array} action (optional) Result returning action (will get item A and B and needs to return the resulting value) or the third sequence 
	 * @return {LinqArray} New LINQ array
	 */
	Zip(arr,action=null){
		const self=this,
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
					yield action(self[i],arr[i]);
				}else{
					yield [self[i],arr[i]];
				}
		}(),len);
	}

	/**
	 * Filter by item type
	 * 
	 * @param {string} type Type
	 * @return {LinqArray} Filtered LINQ array
	 */
	OfType(type){
		const self=this;
		return this._CreateGenerated(function*(){
			let item;
			for(item of self._Iterable) if(typeof item==type) yield item;
		}());
	}

	/**
	 * Exclude items
	 * 
	 * @param {Array} exclude Values to exclude
	 * @param {Function<any,any,boolean>} comp (optional) Comparer action
	 * @return {LinqArray} Filtered LINQ array
	 */
	Except(exclude,comp=null){
		const self=this;
		return this._CreateGenerated(function*(){
			const isLinq=LinqArray.Helper.IsLinqArray(exclude);
			let item;
			for(item of self._Iterable)
				if(comp
					?!(isLinq?exclude.Any((b)=>comp(item,b)):exclude.some((b)=>comp(item,b)))
					:!(isLinq?exclude.Contains(item):exclude.includes(item)))
					yield item;
		}());
	}

	/**
	 * Exclude items
	 * 
	 * @param {Array} exclude Values to exclude
	 * @param {Function<any,any>|string} action Key action or item key name
	 * @param {Function<any,any,boolean>} comp (optional) Comparer action
	 * @return {LinqArray} Filtered LINQ array
	 */
	ExceptBy(exclude,action,comp=null){
		const self=this;
		return this._CreateGenerated(function*(){
			const isLinq=LinqArray.Helper.IsLinqArray(exclude);
			action=LinqArray.Helper.EnsureValueGetter(action);
			let k,
				item;
			for(item of self._Iterable){
				k=action(item);
				if(comp
					?!(isLinq?exclude.Any((b)=>comp(k,action(b))):exclude.some((b)=>comp(k,action(b))))
					:!(isLinq?exclude.Any((b)=>k==action(b)):exclude.some((b)=>k==action(b))))
					yield item;
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
		const self=this;
		return this._CreateGenerated(function*(){
			if(comp) arr=LinqArray.Helper.EnsureLinqArray(arr);
			const lenA=self.TryGetNonEnumeratedCount(),
				lenB=LinqArray.Helper.GetArrayLength(arr),
				a=lenA!=null&&lenB!=null&&lenA<lenB?self:arr,
				b=a==self?arr:self,
				isLinq=LinqArray.Helper.IsLinqArray(b);
			let item;
			for(item of a) if(isLinq?b.Any((b)=>comp(item,b)):b.includes(item)) yield item;
		}());
	}

	/**
	 * Find intersecting values
	 * 
	 * @param {Array} arr Array
	 * @param {Function<any,any>|string} action Key action or item key name
	 * @param {Function<any,any,boolean>} comp (optional) Comparer action
	 * @return {LinqArray} Values that are contained in this and the array
	 */
	IntersectBy(arr,action,comp=null){
		const self=this;
		return this._CreateGenerated(function*(){
			const lenA=self.TryGetNonEnumeratedCount();
			let v,
				item;
			action=LinqArray.Helper.EnsureValueGetter(action);
			if(LinqArray.Helper.IsLinqArray(arr)){
				const lenB=arr.TryGetNonEnumeratedCount(),
					a=lenA!=null&&lenB!=null&&lenA<lenB?self:arr,
					b=a==self?arr:self;
				for(item of a){
					v=action(item);
					if(comp?b.Any((b)=>comp(v,action(b))):b.Any((b)=>v==action(b))) yield item;
				}
			}else{
				const lenB=LinqArray.Helper.IsLinqArray(arr)?arr.TryGetNonEnumeratedCount():arr.length,
					a=lenA!=null&&lenB!=null&&lenA<lenB?self:arr,
					b=a==self?arr:self,
					isLinq=LinqArray.Helper.IsLinqArray(b);
				for(item of a){
					v=action(item);
					if(comp?(isLinq?b.Any((b)=>comp(v,action(b))):b.some((b)=>comp(v,action(b)))):(isLinq?b.Any((b)=>v==action(b)):b.some((b)=>v==action(b)))) yield item;
				}
			}
		}());
	}

	/**
	 * Get the first item
	 * 
	 * @param {Function<any,boolean>} action (optional) Filter action
	 * @return {any} First item
	 */
	First(action=null){
		if(!action){
			const first=this._GetIterator().next();
			if(first.done) throw new RangeError();
			return first.value;
		}
		let item;
		for(item of this._Iterable) if(action(item)) return item;
		throw new RangeError();
	}

	/**
	 * Get the first item or a default result
	 * 
	 * @param {Function<any,boolean>|any} action Filter action or default result
	 * @param {any} defaultResult (optional) Default result (default: `null`)
	 * @return {any} First item or the default result
	 */
	FirstOrDefault(action,defaultResult=null){
		[action,defaultResult]=this.#EnsureActionOrDefaultResult(action,defaultResult);
		if(!action){
			const first=this._GetIterator().next();
			return first.done?defaultResult:first.value;
		}
		let item;
		for(item of this._Iterable) if(action(item)) return item;
		return defaultResult;
	}

	/**
	 * Get the last item
	 * 
	 * @param {Function<any,boolean>} action (optional) Filter action
	 * @return {any} Last item
	 */
	Last(action=null){
		if(!action){
			const len=this.EnsureGenerated()._Iterable.length;
			if(!len) throw new RangeError();
			return this._Iterable[len-1];
		}
		let item;
		for(item of this.EnsureGenerated().slice().reverse()) if(action(item)) return item;
		throw new RangeError();
	}

	/**
	 * Get the last item or a default result
	 * 
	 * @param {Function<any,boolean>|any} action Filter action or default result
	 * @param {any} defaultResult (optional) Default result (default: `null`)
	 * @return {any} Last item or the default result
	 */
	LastOrDefault(action,defaultResult=null){
		[action,defaultResult]=this.#EnsureActionOrDefaultResult(action,defaultResult);
		if(!action) return this.EnsureGenerated()._Iterable.length?this._Iterable[this._Iterable.length-1]:defaultResult;
		let item;
		for(item of this.EnsureGenerated().slice().reverse()) if(action(item)) return item;
		return defaultResult;
	}

	/**
	 * Find a single distinct value
	 * 
	 * @param {Function<any,boolean>} action (optional) Filter action
	 * @return {any} Distinct value
	 */
	Single(action=null){
		if(!action)
			switch(this.EnsureGenerated(2)._Iterable.length){
				case 0:throw new RangeError();
				case 1:return this._Iterable[0];
				default:throw new RangeError('Many items');
			}
		let res,
			found=false;
		this.ForEach(item=>{
			if(!action(item)) return;
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
	 * @param {Function<any,boolean>|any} action Filter action (gets the item as parameter and needs to return if to use the item) or default result
	 * @param {any} defaultResult (optional) Default result (default: `null`)
	 * @return {any} Distinct value
	 */
	SingleOrDefault(action,defaultResult=null){
		[action,defaultResult]=this.#EnsureActionOrDefaultResult(action,defaultResult);
		let found=false;
		this.ForEach(item=>{
			if(action&&!action(item)) return;
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
	DefaultIfEmpty(defaultItem){return this._GetIterator().next().done?this._CreateInstance([defaultItem]):this;}

	/**
	 * Order
	 * 
	 * @param {Function<any,any>|string} action (optional) Value action or item key name
	 * @param {Function<any,any,boolean,any,any,int>} order (optional) Ordering action
	 * @param {boolean} inPlace (optional) Order THIS LINQ array (default: `false`)
	 * @return {LinqArray} Ordered LINQ array
	 */
	OrderBy(action=null,order=null,inPlace=false){return this.#_OrderBy(action,order,inPlace,false);}

	/**
	 * Order descending
	 * 
	 * @param {Function<any,any>|string} action (optional) Value action or item key name
	 * @param {Function<any,any,boolean,any,any,int>} order (optional) Ordering action
	 * @param {boolean} inPlace (optional) Order THIS LINQ array (default: `false`)
	 * @return {LinqArray} Ordered LINQ array
	 */
	OrderByDescending(action=null,order=null,inPlace=false){return this.#_OrderBy(action,order,inPlace,true);}

	/**
	 * Order ascending/descending
	 * 
	 * @param {Function<any,any>|string} action (optional) Value action or item key name
	 * @param {Function<any,any,boolean,any,any,int>} order (optional) Ordering action
	 * @param {boolean} inPlace (optional) Order THIS LINQ array (default: `false`)
	 * @param {boolean} desc Order descending?
	 * @return {LinqArray} Ordered LINQ array
	 */
	#_OrderBy(action,order,inPlace,desc){
		if(action!=null) action=LinqArray.Helper.EnsureValueGetter(action);
		order??=LinqArray.Helper.DefaultOrdering;
		const res=inPlace?this.EnsureGenerated():this.EnsureGenerated().slice();
		res.#OrderAction=action;
		res.#Ordering=order;
		res.#OrderDescending=desc;
		return res.sort(action?(a,b)=>order(action(a),action(b),desc,a,b):(a,b)=>order(a,b,desc,a,b));
	}

	/**
	 * Order
	 * 
	 * @param {Function<any,any>|string} action Value action or item key name
	 * @param {Function<any,any,boolean,any,any,int>} order (optional) Ordering action
	 * @return {LinqArray} Ordered LINQ array
	 */
	ThenBy(action,order=null){return this.#_ThenBy(action,order,false);}

	/**
	 * Order descending
	 * 
	 * @param {Function<any,any>|string} action Value action or item key name
	 * @param {Function<any,any,boolean,any,any,int>} order (optional) Ordering action
	 * @return {LinqArray} Ordered LINQ array
	 */
	ThenByDescending(action,order=null){return this.#_ThenBy(action,order,true);}

	/**
	 * Order ascending/descending
	 * 
	 * @param {Function<any,any>|string} action Value action or item key name
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
	 * @param {Function<any,any>|string} action (optional) Group key action or item key name
	 * @param {Function<any,any>} result (optional) Result action
	 * @return {LinqArray[]} Groups (as LINQ array of LINQ arrays)
	 */
	GroupBy(action=null,result=null){
		const map=new Map();
		let k,
			e;
		if(action!=null) action=LinqArray.Helper.EnsureValueGetter(action);
		this.ForEach(item=>{
			k=action?action(item):item;
			if(!map.has(k)){
				map.set(k,e=(new this.constructor()).AppendThis(result?result(item):item));
				e.#GroupKey=k;
			}else{
				map.get(k).push(result?result(item):item);
			}
		});
		return (new this.constructor()).AppendThis(...map.values());
	}

	/**
	 * Try to get the count without enumerating items
	 * 
	 * @return {int} Count or `null` (if an enumeration is required, first)
	 */
	TryGetNonEnumeratedCount(){return this.#IsGenerated?this._Iterable.length:this.#EstimatedCount;}

	/**
	 * Skip X items
	 * 
	 * @param {int} count (optional) Count (default: `1`)
	 * @return {LinqArray} Reduced LINQ array
	 */
	Skip(count=1){
		if(count<0) return this.SkipLast(+count);
		if(count<1) return this.ToLinqArray();
		const self=this;
		return this._CreateGenerated(function*(){
			const generator=self._GetIterator();
			let item;
			for(;count&&!(item=generator.next()).done;count--);
			if(!item.done) yield* generator;
		}());
	}

	/**
	 * Skip the last item(s)
	 * 
	 * @param {int} count (optional) Count (default: `1`)
	 * @return {LinqArray} Reduced LINQ array
	 */
	SkipLast(count=1){
		if(!count) return this.ToLinqArray();
		const self=this.EnsureGenerated();
		return count=this._Iterable.length-count?this._CreateGenerated(function*(){
			const generator=self._GetIterator();
			for(let item;count&&!(item=generator.next()).done;count--) yield item.value;
		}(),Math.max(0,this._Iterable.length-count)):this._CreateInstance();
	}

	/**
	 * Skip items until the filter action returned `false` once
	 * 
	 * @param {Function<any,boolean>} action Filter action
	 * @return {LinqArray} Reduced LINQ array
	 */
	SkipWhile(action){return this._CreateGenerated(this.GetWhenNot(action));}

	/**
	 * Get items after the filter action returns `false`
	 * 
	 * @param {Function<any,boolean>} action Filter action
	 * @return {...any} Items
	 */
	*GetWhenNot(action){
		const generator=this._GetIterator();
		let item;
		for(item=generator.next();!item.done&&action(item.value);item=generator.next());
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
		if(count<0) return this.TakeLast(+count);
		if(count<1) return this._CreateInstance();
		const self=this,
			estimatedCount=this.TryGetNonEnumeratedCount();
		return this._CreateGenerated(function*(){
			const generator=self._GetIterator();
			for(let item;count&&!(item=generator.next()).done;count--) yield item;
		}(),estimatedCount==null?null:Math.max(0,Math.min(estimatedCount,count)));
	}

	/**
	 * Take the last n items
	 * 
	 * @param {int} count Count
	 * @return {LinqArray} Reduced LINQ array
	 */
	TakeLast(count){
		if(!count) return this._CreateInstance();
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
	 * @param {Function<any,boolean>} action Filter action
	 * @return {LinqArray} Reduced LINQ array
	 */
	TakeWhile(action){return this._CreateGenerated(this.GetWhile(action));}

	/**
	 * Get items until the filter action returns `false`
	 * 
	 * @param {Function<any,boolean>} action Filter action
	 * @return {...any} Items
	 */
	*GetWhile(action){
		const generator=this._GetIterator();
		for(let item=generator.next();!item.done&&action(item.value);item=generator.next()) yield item.value;
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
		const self=this,
			isFinalArray=!LinqArray.Helper.IsLinqArray(items)||items.IsGenerated,
			estimatedCount=isFinalArray?this.TryGetNonEnumeratedCount():null;
		return !isFinalArray||items.length?this._CreateGenerated(function*(){
			let item;
			for(item of self._Iterable) yield item;
			yield* items[Symbol.iterator]();
		}(),estimatedCount==null?null:estimatedCount+items.length):this.ToLinqArray();
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
		const self=this,
			isFinalArray=!LinqArray.Helper.IsLinqArray(items)||items.IsGenerated,
			estimatedCount=isFinalArray?this.TryGetNonEnumeratedCount():null;
		return !isFinalArray||items.length?this._CreateGenerated(function*(){
			let item;
			for(item of items) yield item;
			yield* self._GetIterator();
		}(),estimatedCount==null?null:estimatedCount+items.length):this.ToLinqArray();
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
		const len=LinqArray.Helper.GetArrayLength(items);
		if(!len) return this;
		this.unshift(...items);
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
		const self=this,
			res=this._CreateGenerated(function*(){
				let item,
					arr;
				for(item of self._Iterable) yield item;
				if(!arrs.some(item=>LinqArray.Helper.IsLinqArray(item)&&!item.IsGenerated))
					res.#EstimatedCount=res.length+arrs.map(i=>i.length).reduce((total,current)=>total+current,0);
				for(arr of arrs)
					for(item of arr)
						yield item;
			}());
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
		this.EnsureGenerated().#IsGenerated=false;
		this.#Generator=function*(){
			let arr,
				item;
			for(arr of arrs)
				for(item of arr)
					yield item;
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
		const self=this,
			estimatedCount=this.TryGetNonEnumeratedCount();
		return this._CreateGenerated(function*(){
			const generator=self._GetIterator();
			for(let item={done:false},data;!item.done;){
				data=[];
				for(;data.length<count&&!(item=generator.next()).done;data.push(item.value));
				if(data.length) yield self._CreateInstance(data);
			}
		}(),estimatedCount==null?null:Math.ceil(estimatedCount/count));
	}

	/**
	 * Reverse
	 * 
	 * @param {boolean} inPlace (optional) Reverse THIS LINQ array (default: `false`)
	 * @return {LinqArray} Reversed LINQ array
	 */
	Reverse(inPlace=false){return inPlace?this.reverse():this.EnsureGenerated().slice().reverse();}

	/**
	 * Maximum value
	 * 
	 * @param {Function<any,any>|string} action (optional) Value action or item key name
	 * @return {number} Maximum value
	 */
	Max(action=null){
		switch(this.EnsureGenerated()._Iterable.length){
			case 0:throw new RangeError();
			case 1:return this.First();
			default:return Math.max(...(action==null?this:this.Select(action)));
		}
	}

	/**
	 * Item with the maximum
	 * 
	 * @param {Function<any,any>|string} action Value action or item key name
	 * @return {any} Item with the maximum
	 */
	MaxBy(action){
		switch(this.EnsureGenerated()._Iterable.length){
			case 0:throw new RangeError();
			case 1:return this.First();
		}
		let max=null,
			res,
			v,
			item;
		action=LinqArray.Helper.EnsureValueGetter(action);
		for(item of this._Iterable){
			v=action(item);
			if(v==Number.MAX_VALUE) return item;
			if(max!=null&&v<=max) continue;
			max=v;
			res=item;
		}
		return res;
	}

	/**
	 * Minimum value
	 * 
	 * @param {Function<any,any>|string} action (optional) Value action or item key name
	 * @return {number} Minimum value
	 */
	Min(action=null){
		switch(this.EnsureGenerated()._Iterable.length){
			case 0:throw new RangeError();
			case 1:return this.First();
			default:return Math.min(...(action==null?this:this.Select(action)));
		}
	}

	/**
	 * Item with the minimum
	 * 
	 * @param {Function<any,any>|string} action Value action or item key name
	 * @return {any} Item with the minimum
	 */
	MinBy(action){
		switch(this.EnsureGenerated()._Iterable.length){
			case 0:throw new RangeError();
			case 1:return this.First();
		}
		let min=null,
			res,
			v,
			item;
		action=LinqArray.Helper.EnsureValueGetter(action);
		for(item of this._Iterable){
			v=action(item);
			if(v==Number.MIN_VALUE) return item;
			if(min!=null&&v>=min) continue;
			min=v;
			res=item;
		}
		return res;
	}

	/**
	 * Summarize
	 * 
	 * @param {Function<any,any>|string} action (optional) Value action or item property name
	 * @return {number} Summary of all values
	 */
	Sum(action=null){return (action==null?this:this.Select(action)).EnsureGenerated().reduce((total,current)=>total+current,0);}

	/**
	 * Average value
	 * 
	 * @param {Function<any,any>|string} action (optional) Value action or item property name
	 * @return {number} Average value
	 */
	Average(action=null){
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
		const len=this.EnsureGenerated()._Iterable.length;
		if(len!=LinqArray.Helper.GetArrayLength(arr)) return false;
		if(!len) return true;
		if(!comp) comp=(a,b)=>(!strict&&a==b)||(strict&&a===b);
		arr=LinqArray.Helper.EnsureFinalArray(arr);
		for(let i=0;i<len;i++) if(!comp(this._Iterable[i],arr[i],strict)) return false;
		return true;
	}

	/**
	 * Aggregate
	 * 
	 * @param {Function<any,any,any>} action Action per item that returns the next seed (and will get the seed and the item as parameters)
	 * @param {any} seed (optional) Initial value
	 * @param {Function<any,any>} result (optional) Result action
	 * @return {any} Result
	 */
	Aggregate(action,seed=undefined,result=null){
		const len=this.EnsureGenerated()._Iterable.length;
		if(!len) return result?result(seed):seed;
		if(LinqArray.Helper.IsUndefined(seed)){
			if(len==1) return result?result(this._Iterable[0]):this._Iterable[0];
			let first=true;
			this.ForEach(item=>{
				if(first){
					seed=item;
					first=false;
				}else{
					seed=action(seed,item);
				}
			});
		}else{
			this.ForEach(item=>seed=action(seed,item));
		}
		return result?result(seed):seed;
	}

	/**
	 * Execute an action for all items (until interrupted)
	 * 
	 * @param {Function<any,any>} action Action with a return value
	 * @return {...any} Return values
	 */
	*Execute(action){
		let item;
		for(item of this._Iterable) yield action(item);
	}

	/**
	 * Execute an asynchronous action for all items (until interrupted)
	 * 
	 * @param {AsyncFunction<any,Promise<any>>} action Asynchronous action with a return value
	 * @return {...any} Return values
	 */
	async *ExecuteAsync(action){
		let item;
		for(item of this._Iterable) yield await action(item);
	}

	/**
	 * Execute an action for each item
	 * 
	 * @param {Function<any,int,boolean?>} action Action (gets the item and the index as parameters, may return `false` to break the loop (and cut the resulting array, too!))
	 * @param {boolean} inPlace (optional) Execute for THIS LINQ array (don't create a new LINQ array) (default: `true`)?
	 * @return {LinqArray} New LINQ array or this
	 */
	ForEach(action,inPlace=true){
		const self=this;
		if(inPlace){
			let index=0,
				item;
			for(item of this._Iterable){
				if(action(item,index)===false) break;
				index++;
			}
		}
		return inPlace
			?this
			:this._CreateGenerated(function*(){
				let index=0,
					item;
				for(item of self._Iterable){
					if(action(item,index)===false) break;
					yield item;
					index++;
				}
			}());
	}

	/**
	 * Execute an asynchronous action for each item IN PLACE
	 * 
	 * @param {AsyncFunction<any,int,boolean?>} action Action (gets the item and the index as parameters, may return `false` to break the loop (and cut the resulting array, too!))
	 * @return {LinqArray} This
	 */
	async ForEachAsync(action){
		let index=0,
			item;
		for(item of this._Iterable){
			if(await action(item,index)===false) break;
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
		if(!deep) return count==null?[...this]:this.Take(count).ToArray();
		if(count!=null) return this.Take(count).ToArray(null,true);
		const res=[...this],
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
	ToList(count=null){return this.ToArray(count);}

	/**
	 * Create a map (a dictionary)
	 * 
	 * The generator functions will get the item as first, and the resulting map as second parameter.
	 * 
	 * @param {Function<any,any>|string} key Key action or item key name
	 * @param {Function<any,any,any>} value (optional) Value action (gets the item and the generated key as parameters and needs to return the value to use) (default: `null`)
	 * @return {Map<any>} Map
	 */
	ToDictionary(key,value=null){
		const self=this;
		key=LinqArray.Helper.EnsureValueGetter(key);
		return new Map(function*(){
			let k,
				item;
			for(item of self._Iterable){
				k=key(item);
				yield [k,value?value(item,k):item];
			}
		}());
	}

	/**
	 * Create a set (with distinct values)
	 * 
	 * @param {Function<any,Set,any>|string} value (optional) Value action (gets the item and the resulting set as parameters and needs to return the value to use) or item key name (default: `null`)
	 * @return {Set} Set
	 */
	ToHashSet(value=null){
		const self=this;
		if(value!=null) value=LinqArray.Helper.EnsureValueGetter(value);
		const res=new Set(value?function*(){
			let item;
			for(item of self._Iterable) yield value?value(item,res):item;
		}():this);
		return res;
	}

	/**
	 * Create a lookup map (a dictionary with multiple values per key)
	 * 
	 * @param {Function<any,any>|string} key (optional) Key action or item key name (default: `null`)
	 * @param {Function<any,any,any>} value (optional) Value action (gets the item and the generated key as parameters and needs to return the value to use)
	 * @return {Map} Lookup map
	 */
	ToLookup(key,value=null){
		const res=new Map();
		let lookup,
			v;
		if(key!=null) key=LinqArray.Helper.EnsureValueGetter(key);
		this.ForEach(item=>{
			lookup=key?key(item):item;
			v=value?value(item):item;
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
	ToLinqArray(count=null){return count==null?this._CreateInstance(this):this.Take(count);}

	/**
	 * Ensure all items are generated
	 * 
	 * @param {int} until (optional) Until item number `until` (default: `null`)
	 * @return {LinqArray} This
	 */
	EnsureGenerated(until=null){
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
	 * Finalize the item generator
	 * 
	 * @return {LinqArray} This
	 */
	Finalize(){
		if(this.#IsGenerated||!this.#Generator) return this;
		if(this.#Store) return this.EnsureGenerated();
		for(let generator=this.#Generator;!generator.next().done;);
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
		this.Clear();
		if(useGenerator){
			this.#IsGenerated=false;
			this.#EstimatedCount=LinqArray.Helper.IsLinqArray(items)?items.TryGetNonEnumeratedCount():items.length;
			this.#Generator=function*(){yield* items[Symbol.iterator]();}();
		}else{
			this.push(...items);
		}
		return this;
	}

	/**
	 * Clear this instance
	 * 
	 * @return {LinqArray} This
	 */
	Clear(){
		if(!this.#Extended&&this.length) this.length=0;
		this.#OrderAction=null;
		this.#Ordering=null;
		this.#OrderDescending=null;
		this.#GroupKey=undefined;
		this.#IsGenerated=true;
		this.#EstimatedCount=null;
		this.#Generator=null;
		this.#Store=!this.#Extended;
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
	 * Clear and use an item generator
	 * 
	 * @param {Iterator} items Item generator
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
	 * Create a new instance
	 * 
	 * @param {Array} data (optional) Data
	 * @return {LinqArray} New instance
	 */
	_CreateInstance(data=null){
		const res=new this.constructor();
		if(this.#PassStore){
			res.#Store=this.#Store;
			res.#PassStore=true;
		}
		if(data) res.SetAllData(data,true);
		return res;
	}

	/**
	 * Create a generated instance
	 * 
	 * @param {Generator} generator Generator
	 * @param {int} length (optional) Estimated length
	 * @return {LinqArray} New LINQ array
	 */
	_CreateGenerated(generator,length=null){
		const res=this._CreateInstance();
		res.#IsGenerated=false;
		res.#Generator=generator;
		res.#EstimatedCount=length;
		return res;
	}

	/**
	 * Get an iterator
	 * 
	 * @return {Iterator} Iterator
	 */
	_GetIterator(){return this._Iterable[Symbol.iterator]();}

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
		if(this.#Extended){
			yield* this.#Extended[Symbol.iterator];
		}else{
			const generator=this.#Generator,
				superGenerator=super[Symbol.iterator]();
			if(!generator){
				if(!this.#Store) throw new TypeError('Iterated already - buffer is disabled');
				yield* superGenerator;
			}else if(generator){
				if(superGenerator) for(let item=superGenerator.next();!item.done;item=superGenerator.next()) yield item.value;
				for(let item=generator.next();!item.done;item=generator.next()){
					if(this.#Store) this.push(item.value);
					yield item.value;
				}
				this.#Generator=null;
				this.#IsGenerated=true;
				this.#EstimatedCount=null;
			}
		}
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
	 * @param {boolean} store (optional) Store generated items (default: `true`)?
	 * @param {boolean} pass (optional) Pass this behavior to created instances?
	 * @return {LinqArray} Empty LINQ array
	 */
	static Empty(store=true,pass=false){return new this(null,store,pass);}

	/**
	 * Repeat an element
	 * 
	 * @param {any|Function<int,any>} e Element or action that returns an element (gets the index as parameter)
	 * @param {int} count Count
	 * @param {boolean} store (optional) Store generated items (default: `true`)?
	 * @param {boolean} pass (optional) Pass this behavior to created instances?
	 * @return {LinqArray} LINQ array
	 */
	static Repeat(e,count,store=true,pass=false){
		const res=new this(null,store,pass),
			isFnc=LinqArray.Helper.IsFunction(e);
		res.#IsGenerated=false;
		res.#Generator=function*(){for(let i=0;i<count;i++) yield isFnc?e(i):e;}();
		res.#EstimatedCount=count;
		return res;
	}

	/**
	 * Extend the `Array` prototype with a `ToLinqArray` method that works as the `ToLinqArray` method from the `LinqArray` type
	 * 
	 * **WARNING**: This may have a negative impact on the performance when working with `Array`!
	 */
	static ExtendArray(){
		if(!LinqArray.Helper.IsUndefined(Array.prototype.ToLinqArray)) return;
		const linqArray=this;
		Array.prototype.ToLinqArray=(count=null)=>count==null?new linqArray(this):new linqArray().SetAllData(this,true).Take(count);
	}

	/**
	 * Extend an iterable object with LINQ array methods
	 * 
	 * **NOTE**: Existing keys won't be overwritten! `Array` methods and properties of the returned LINQ array won't work.
	 * 
	 * @param {Iterable} obj Object
	 * @return {LinqArray} LINQ array
	 */
	static ExtendObject(obj){
		//TODO In this case don't use any Array methods/properties!
		const linq=new this(obj,false),
			map=new Map(Object.entries(obj));
		let k,
			v;
		linq.#Extended=obj;
		for([k,v] of Object.entries(linq)){
			if(
				/^[_|\#|a-z]/.test(k)||
				!LinqArray.Helper.IsFunction(v)||
				v instanceof AsyncFunction||
				v instanceof GeneratorFunction||
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
if(window&&LinqArray.Helper.IsUndefined(window.From)) window.From=(arr,store=true,pass=false)=>LinqArray.From(arr,store,pass);
