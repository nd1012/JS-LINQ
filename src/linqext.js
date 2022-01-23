/**
 * LINQ array extensions
 * 
 * @github https://github.com/nd1012/JS-LINQ
 * @license MIT
 * @copyright (c)2022 Andreas Zimmermann, wan24.de
 */
class LinqArrayExt extends LinqArray{
	/**
	 * Get the LINQ array type
	 * 
	 * @return {string} Type name
	 */
	get Type(){return 'LinqArrayExt';}//TEST

	/**
	 * Inner join this array with another array by their common keys
	 * 
	 * @param {Array} arr Array
	 * @param {Function<any,int,any>|string} action Key action or item key name
	 * @param {Function<any,int,any>|string} arrAction Key action or array item key name
	 * @param {Function<any,Array,int,int,any>} result (optional) Value action (gets the item, the array item, the index and the array index as parameters and needs to return the final result to use)
	 * @param {Function<any,any,boolean>} comp (optional) Key comparing action
	 * @return {LinqArrayExt} Resulting LINQ array
	 */
	InnerJoin(arr,action,arrAction,result=null,comp=null){return this.Join(arr,action,arrAction,result??((a,b)=>({...a,...b})),comp);}//TEST

	/**
	 * Left join this array with another array by their common keys
	 * 
	 * @param {Array} arr Array
	 * @param {Function<any,int,any>|string} action Key action or item key name
	 * @param {Function<any,int,any>|string} arrAction Key action or array item key name
	 * @param {Function<any,Array,int,int,any>} result (optional) Value action (gets the item, the array item, the index and the array index as parameters and needs to return the final result to use)
	 * @param {Function<any,any,boolean>} comp (optional) Key comparing action
	 * @return {LinqArrayExt} Resulting LINQ array
	 */
	LeftJoin(arr,action,arrAction,result,comp=null){
		//TEST
		return LinqArray.Helper.EnsureLinqArray(arr,true)
			.GroupJoin(this,action,arrAction,(a,b)=>{a,b},comp)
			.SelectMany((item)=>item.b,(a,b,ai,bi)=>result(a.a,b,ai,bi));
	}

	/**
	 * Right join this array with another array by their common keys
	 * 
	 * @param {Array} arr Array
	 * @param {Function<any,int,any>|string} action Key action or item key name
	 * @param {Function<any,int,any>|string} arrAction Key action or array item key name
	 * @param {Function<any,Array,int,int,any>} result (optional) Value action (gets the item, the array item, the index and the array index as parameters and needs to return the final result to use)
	 * @param {Function<any,any,boolean>} comp (optional) Key comparing action
	 * @return {LinqArrayExt} Resulting LINQ array
	 */
	RightJoin(arr,action,arrAction,result,comp=null){
		//TEST
		return LinqArray.Helper.EnsureLinqArray(arr,true)
			.GroupJoin(this,arrAction,action,(a,b)=>{a,b},comp)
			.SelectMany((item)=>item.b,(a,b,ai,bi)=>result(b,a.a,ai,bi));
	}

	/**
	 * Full join this array with another array by their common keys
	 * 
	 * @param {Array} arr Array
	 * @param {Function<any,int,any>|string} action Key action or item key name
	 * @param {Function<any,int,any>|string} arrAction Key action or array item key name
	 * @param {Function<any,Array,int,int,any>} leftResult (optional) Value action (gets the item, the array item, the index and the array index as parameters and needs to return the final result to use)
	 * @param {Function<any,Array,int,int,any>} rightResult (optional) Value action (gets the item, the array item, the index and the array index as parameters and needs to return the final result to use)
	 * @param {Function<any,any,boolean>} comp (optional) Key comparing action
	 * @return {LinqArrayExt} Resulting LINQ array
	 */
	FullJoin(arr,action,arrAction,leftResult,rightResult,comp=null){
		//TEST
		action=LinqArray.Helper.EnsureValueGetter(action);
		arrAction=LinqArray.Helper.EnsureValueGetter(arrAction);
		arr=LinqArray.Helper.EnsureLinqArray(arr,true);
		return this.LeftJoin(arr,action,arrAction,leftResult,comp).Union(this.RightJoin(arr,action,arrAction,rightResult,comp));
	}

	/**
	 * Cross join this array with another array
	 * 
	 * @param {Array} arr Array
	 * @param {Function<any,Array,int,int,any>} result (optional) Value action (gets the item, the array item, the index and the array index as parameters and needs to return the final result to use)
	 * @return {LinqArrayExt} Resulting LINQ array
	 */
	CrossJoin(arr,result){return this.Join(arr,(item)=>item,(item)=>item,result,()=>true);}//TEST

	/**
	 * Create a partition table
	 * 
	 * **NOTE**: There'll be a partition without `GroupKey` that contains all items that didn't match into a partition. The results will be fixed (not dynamic).
	 * 
	 * @param {...object} partitions Partition informations (as returned from `LinqArrayExt.PartitionInfo`)
	 * @return {LinqArrayExt} LINQ array of LINQ array partitions
	 */
	Partition(...partitions){
		//TEST
		const linqArrayExt=this._EnsureFinite().constructor,
			res=LinqArrayExt.Repeat(i=>new linqArrayExt()._SetParent(res)._SetGroupKey(partitions[i].key),partitions.length),
			misfits=partitions[0].misfits?new linqArrayExt():null;
		res._SetParent(this);
		res.EnsureGenerated();
		if(misfits) res.push(misfits);
		let i,
			match;
		this.ForEach((item,index)=>{
			for(i=0,match=false;!match&&i<partitions.length;i++){
				if((partitions[i].max&&res[i].length>=partitions[i].max)||!partitions[i].action(item,index)) continue;
				res[i].push(item);
				match=true;
			}
			if(!match) misfits?.push(item);
		});
		return res;
	}

	/**
	 * Create a partition table
	 * 
	 * **NOTE**: There'll be a partition without `GroupKey` that contains all items that didn't match into a partition. The results will be fixed (not dynamic).
	 * 
	 * @param {...object} partitions Partition informations (as returned from `LinqArrayExt.PartitionInfo`)
	 * @return {LinqArrayExt} LINQ array of LINQ array partitions
	 */
	async PartitionAsync(...partitions){
		//TEST
		const linqArrayExt=this._EnsureFinite().constructor,
			res=LinqArrayExt.Repeat(i=>new linqArrayExt()._SetParent(res)._SetGroupKey(partitions[i].key),partitions.length),
			misfits=partitions[0].misfits?new linqArrayExt():null;
		res._SetParent(this);
		res.EnsureGenerated();
		if(misfits) res.push(misfits);
		let i,
			match;
		await this.ForEachAsync(async (item,index)=>{
			for(i=0,match=false;!match&&i<partitions.length;i++){
				if((partitions[i].max&&res[i].length>=partitions[i].max)||!await partitions[i].action(item,index)) continue;
				res[i].push(item);
				match=true;
			}
			if(!match) misfits?.push(item);
		});
		return res;
	}

	/**
	 * Create a pivot table or summaries
	 * 
	 * Supports:
	 * 
	 * - Optional row group column
	 * - Any row/field group column
	 * - Any row/field partition column
	 * - Any calculated column
	 * - Optional summary row
	 * - Optional summaries only
	 * 
	 * @param {object} row The row column configuration that was created using the static `LinqArrayExt.PivotRowColumn` method, or `null` to skip row grouping
	 * @param {...object} cols The column configurations that were created using the static `LinqArrayExt.Pivot(Group|Partition|Calc)Column` methods
	 * @return {LinqArrayExt|object} Pivot table (fixed, not dynamic) or summaries
	 */
	Pivot(row,...cols){
		//TEST
		const self=this._EnsureFinite(),
			proto=row?{[row.key]:null}:{};
		if(row) row.data??=(group)=>group.GroupKey;
		cols=new LinqArray(cols).ForEach(col=>{
			col.key??=(group)=>group.GroupKey;
			if(col.group==null){
				proto[col.key]=null;
			}else{
				col.groups=self.GroupBy(col.group).OrderBy(group=>group.GroupKey,null,true).ForEach((group,index)=>proto[col.key(group,index)]=null);
			}
			if(LinqArray.Helper.IsFunction(col.data)) return;
			const prop=col.data;
			col.data=(data)=>data.Sum(item=>Number(item[prop]));
		});
		const table=row==null?null:this.GroupBy(row.group??row.key).Select(group=>{
			const item=Object.assign({},proto,{[row.key]:row.data(group)});
			cols.ForEach(col=>(col.group==null
				?item[col.key]=col.data(group)
				:group.GroupBy(col.group).ForEach((colGroup,index)=>item[col.key(colGroup,index)]=col.data(colGroup)),true));
			return item;
		});
		if(table&&!row.summary) return table;
		const summary=Object.assign({},proto);
		cols.ForEach(col=>(col.group==null?summary[col.key]=col.data(self):col.groups.ForEach((colGroup,index)=>summary[col.key(colGroup,index)]=col.data(colGroup)),true));
		return table?.Append(summary)??summary;
	}

	/**
	 * Create a pivot table or summaries
	 * 
	 * Supports:
	 * 
	 * - Optional row group column
	 * - Any row/field group column
	 * - Any row/field partition column
	 * - Any calculated column
	 * - Optional summary row
	 * - Optional summaries only
	 * 
	 * @param {object} row The row column configuration that was created using the static `LinqArrayExt.PivotRowColumn` method, or `null` to skip row grouping
	 * @param {...object} cols The column configurations that were created using the static `LinqArrayExt.Pivot(Group|Partition|Calc)Column` methods
	 * @return {LinqArrayExt|object} Pivot table (fixed, not dynamic) or summaries
	 */
	async PivotAsync(row,...cols){
		//TEST
		const self=this._EnsureFinite(),
			proto=row?{[row.key]:null}:{};
		if(row) row.data??=(group)=>group.GroupKey;
		cols=await new LinqArray(cols).ForEachAsync(async (col)=>{
			col.key??=(group)=>group.GroupKey;
			if(col.group==null){
				proto[col.key]=null;
			}else{
				col.groups=await (await self.GroupByAsync(col.group))
					.OrderBy(group=>group.GroupKey,null,true)
					.ForEachAsync(async (group,index)=>proto[await col.key(group,index)]=null);
			}
			if(LinqArray.Helper.IsFunction(col.data)) return;
			const prop=col.data;
			col.data=(data)=>data.Sum(item=>Number(item[prop]));
		});
		const table=row==null?null:await (await this.GroupByAsync(row.group??row.key)).SelectAsync(async (group)=>{
			const item=Object.assign({},proto,{[row.key]:await row.data(group)});
			await cols.ForEachAsync(async (col)=>(col.group==null
				?item[col.key]=await col.data(group)
				:await (await group.GroupByAsync(col.group)).ForEachAsync(async (colGroup,index)=>item[await col.key(colGroup,index)]=await col.data(colGroup)),true));
			return item;
		});
		if(table&&!row.summary) return table;
		const summary=Object.assign({},proto);
		await cols.ForEachAsync(async (col)=>(col.group==null
			?summary[col.key]=await col.data(self)
			:await col.groups.ForEachAsync(async (colGroup,index)=>summary[await col.key(colGroup,index)]=await col.data(colGroup)),true));
		return table?.Append(summary)??summary;
	}

	/**
	 * Calculate the moving average
	 * 
	 * @param {number} ma (optional) Initial value (default: `0`)
	 * @return {number} Moving average
	 */
	MovingAverage(ma=0){return this.Aggregate((ma,current)=>(ma+current)/2,ma);}//TEST
	
	/**
	 * Calculate the moving averages
	 * 
	 * @param {number} ma (optional) Initial value (default: `0`)
	 * @return {LinqArrayExt} Moving averages
	 */
	MovingAverages(ma=0){return this.Select((item)=>ma=(ma+item)/2);}//TEST

	/**
	 * Take a stepped subset
	 * 
	 * @param {int} stepping Stepping count
	 * @return {LinqArrayExt} Subset
	 */
	TakeEvery(stepping){
		//TEST
		let count=0;
		return this.Where(()=>!(++count==stepping?count=0:count));
	}

	/**
	 * Takes one random item
	 * 
	 * @return {any} Random item
	 */
	TakeRandom(){
		//TEST
		const values=this.IsDynamic?this.ToArray():null,
			len=(values??this.EnsureGenerated()).length;
		if(!len) throw new RangeError();
		return this.IsDynamic?values[Math.floor(Math.random()*len)]:this.ElementAt(Math.floor(Math.random()*len));
	}

	/**
	 * Use this instance or a fallback, if this instance is empty
	 * 
	 * @param {Function<LinqArray,LinqArray>|LinqArray} fallback Fallback factory (gets the instance as parameter and needs to return the result) or LINQ array
	 * @return {LinqArray} LINQ array
	 */
	FallbackIfEmpty(fallback){return this.IsEmpty()?(LinqArray.Helper.IsFunction(fallback)?fallback(this):fallback):this;}//TEST

	/**
	 * Use this instance or a fallback, if this instance is empty
	 * 
	 * @param {AsyncFunction<LinqArray,LinqArray>} fallback Fallback factory (gets the instance as parameter and needs to return the result)
	 * @return {LinqArray} LINQ array
	 */
	async FallbackIfEmptyAsync(fallback){return this.IsEmpty()?await fallback(this):this;}//TEST

	/**
	 * Shuffle the items
	 * 
	 * @param {boolean} inPlace (optional) Shuffle THIS LINQ array (default: `false`)
	 * @return {LinqArrayExt} Resulting LINQ array
	 */
	Shuffle(inPlace=false){
		//TEST
		if(inPlace&&this.IsDynamic) throw new TypeError();
		return this.OrderBy(()=>Math.random(),null,inPlace);
	}

	/**
	 * Find doubles
	 * 
	 * @param {Function<any,int,any>|string} action (optional) Key action or item key name
	 * @return {LinqArrayExt} Doubles as LINQ array of LINQ arrays which contains the double items and having the group key in the `GroupKey` property
	 */
	Doubles(action=null){return this.GroupBy(action).Where(group=>group.length>1);}//TEST

	/**
	 * Find doubles
	 * 
	 * @param {AsyncFunction<any,int,any>} action Key action
	 * @return {LinqArrayExt} Doubles as LINQ array of LINQ arrays which contains the double items and having the group key in the `GroupKey` property
	 */
	async DoublesAsync(action){return (await this.GroupByAsync(action)).Where(group=>group.length>1);}//TEST

	/**
	 * Replace items with another item
	 * 
	 * @param {Function<any,int,boolean>|any} search Filter action
	 * @param {Function<any,int,any>|any} replace (optional) Value action
	 * @param {Function<any,any,boolean>} comp (optional) Comparing action
	 * @param {boolean} inPlace (optional) Replace in THIS LINQ array (default: `false`)?
	 * @return {LinqArrayExt} Resulting LINQ array
	 */
	Replace(search,replace=null,comp=null,inPlace=false){
		//TEST
		if(inPlace&&this.IsDynamic) throw new TypeError();
		const self=this._EnsureFinite(),
			sFnc=LinqArray.Helper.IsFunction(search),
			rFnc=LinqArray.Helper.IsFunction(replace),
			res=inPlace?null:this._CreateGenerated(function*(){
				self.ForEach((item,index)=>{
					if((sFnc&&search(item,index))||(!sFnc&&(comp?comp(search,item):search==item))) res[index]=rFnc?replace(item,index):replace;
				});
			});
		if(inPlace)
			this.ForEach((item,index)=>{
				if((sFnc&&search(item,index))||(!sFnc&&(comp?comp(search,item):search==item))) self._Iterable[index]=rFnc?replace(item,index):replace;
			});
		return res??this;
	}

	/**
	 * Replace items with another item
	 * 
	 * @param {AsyncFunction<any,int,boolean>|any} search Filter action
	 * @param {AsyncFunction<any,int,any>|any} replace (optional) Value action
	 * @param {Function<any,any,boolean>} comp (optional) Comparing action
	 * @param {boolean} inPlace (optional) Replace in THIS LINQ array (default: `false`)?
	 * @return {LinqArrayExt} Resulting LINQ array
	 */
	async ReplaceAsync(search,replace=null,comp=null,inPlace=false){
		//TEST
		if(inPlace&&this.IsDynamic) throw new TypeError();
		this._EnsureFinite();
		const sFnc=LinqArray.Helper.IsFunction(search),
			rFnc=LinqArray.Helper.IsFunction(replace),
			res=inPlace?this:(new this.constructor(this)).EnsureGenerated();
		if(!inPlace) res._SetParent(this);
		await this.ForEachAsync(async (item,index)=>{
			if((sFnc&&await search(item,index))||(!sFnc&&(comp?comp(search,item):search==item))) res[index]=rFnc?await replace(item,index):replace;
		});
		return res;
	}

	/**
	 * Constructor
	 * 
	 * @param {Array} items (optional) Items
	 * @param {boolean} store (optional) Store generated items (default: `true`)?
	 * @param {boolean} pass (optional) Pass this behavior to created instances?
	 */
	constructor(items=null,store=true,pass=false){super(items,store,pass);}

	/**
	 * Parse a RFC 4180-like CSV table
	 * 
	 * A string delimiter within a string needs to be escaped by the string delimiter - for example with double quotes as string delimiter:
	 * 
	 * 	"A string value with escaped ""delimiter""";...
	 * 
	 * @param {string} csv CSV data
	 * @param {boolean|Array} header (optional) If `true`, a header row is assumed, else a column key array is expected, or the column index will be used (default: `true`)
	 * @param {string} fieldDelimiter (optional) Field delimiter character (default: `,`)
	 * @param {string} stringDelimiter (optional) String delimiter character or `null` (default: `"`)
	 * @param {Function<object,Array,int,any>} result (optional) Action to execute per item (gets the item, the header and the index as parameters, needs to return the item)
	 * @param {boolean} store (optional) Store generated items (default: `true`)?
	 * @param {boolean} pass (optional) Pass this behavior to created instances?
	 * @return {LinqArrayExt} LINQ array
	 */
	static FromCsv(csv,header=true,fieldDelimiter=',',stringDelimiter='"',result=null,store=true,pass=false){
		//TEST
		if(!csv.endsWith("\n")) csv+="\n";
		return (new this(null,store,pass)).Generate(function*(){
			let prev,
				row=[prev=''],
				col,
				stream=true,
				c,
				item,
				index=col=0;
			for(c of csv){
				if(c==stringDelimiter){
					if(!(stream=!stream)&&c==prev) row[col]+=c;
				}else if(stream&&c==fieldDelimiter){
					c=row[++col]='';
				}else if(stream&&c=="\n"){
					if(prev=="\r") row[col]=row[col].slice(0,-1);
					if(!header){
						header=LinqArray.Range(0,row.length).ToArray();
					}else if(header===true){
						header=row;
						row=null;
					}
					if(row){
						if(row.length!=header.length)
							throw new RangeError('Invalid row #'+index+' length (expected '+header.length+' fields, got '+row.length+'): '+JSON.stringify(row));
						item={};
						for(col=0;col<row.length;item[header[col]]=row[col],col++);
						yield result?result(item,header,index):item;
					}
					row=[c=''];
					col=0;
					index++;
				}else{
					row[col]+=c;
				}
				prev=c;
			}
		}(),Math.max(0,csv.trim().split("\n").length-(header?1:0)));
	}

	/**
	 * Parse a XML document
	 * 
	 * **NOTE**: It's assumed, that the root node contains the item nodes! Example:
	 * 
	 * 	<root>
	 * 		<item>1</item>
	 * 		<item>2</item>
	 * 		...
	 * 	</root>
	 * 
	 * @param {string} xml XML
	 * @param {string} mime (optional) MIME type (default: `application/xml`)
	 * @param {boolean} store (optional) Store generated items (default: `true`)?
	 * @param {boolean} pass (optional) Pass this behavior to created instances?
	 * @return {LinqArrayExt} LINQ array
	 */
	static FromXml(xml,mime='application/xml',store=true,pass=false){
		//TEST
		const dom=(new DOMParser()).parseFromString(xml,mime);
		let node=null,
			child;
		for(child of dom.childNodes){
			if(child.nodeType!=Node.ELEMENT_NODE) continue;
			node=child;
			break;
		}
		return node&&node.childNodes.length?this.FromNode(node,false,store,pass):new this(store,pass);
	}

	/**
	 * Convert a `Node` object
	 * 
	 * **NOTE**: All child nodes from the given node will be used as object (if they have child nodes, too) or string items (recursive processing). If a node contains 
	 * many child nodes with the same name, the values will be collected as LINQ array.
	 * 
	 * @param {Node} node Node
	 * @param {boolean} dynamic (optional) Generate dynamic (default: `false`)?
	 * @param {boolean} store (optional) Store generated items (default: `true`)?
	 * @param {boolean} pass (optional) Pass this behavior to created instances?
	 * @return {LinqArrayExt} LINQ array
	 */
	static FromNode(node,dynamic=false,store=true,pass=false){
		const nodeToObject=(node)=>{
				const res={},
					text=node.textContent?.trim()??'';
				let child,
					any=false,
					value;
				for(child of node.childNodes)
					switch(child.nodeType){
						case Node.ELEMENT_NODE:
							value=nodeToObject(child);
							if(LinqArray.Helper.IsUndefined(res[child.nodeName])){
								res[child.nodeName]=value;
							}else if(LinqArray.Helper.IsLinqArray(res[child.nodeName])){
								res[child.nodeName].push(value);
							}else{
								res[child.nodeName]=(new this()).SetData(res[child.nodeName],value);
							}
							any=true;
							break;
						case Node.TEXT_NODE:
							if(text==''||(child.textContent?.trim()??'')=='') break;
							return text;
					}
				return any?res:(text==''?null:text);
			},
			generator=function*(){
				let child;
				for(child of node.childNodes) if(child.nodeType==Node.ELEMENT_NODE) yield nodeToObject(child);
			};
		return dynamic||node.childNodes.length?(dynamic?(new this()).GenerateDynamic(generator):(new this(null,store,pass)).Generate(generator())):new this(null,store,pass);
	}

	/**
	 * Use a synchronous indexed DB cursor (available for web workers only!)
	 * 
	 * @param {IDBCursorSync} cursor Synchronous indexed DB cursor
	 * @param {Function<IDBCursorSync,int,any>} key (optional) Next key returning action (gets the cursor and the index as parameters and needs to return the next key to use or `null` to stop)
	 * @param {boolean} store (optional) Store generated items (default: `true`)?
	 * @param {boolean} pass (optional) Pass this behavior to created instances?
	 * @return {LinqArrayExt} LINQ array
	 */
	static FromCursor(cursor,key=null,store=true,pass=false){
		return (new this(null,store,pass)).Generate(function*(){
			for(let k,index=0;cursor.count;index++){
				yield cursor.value;
				if(key){
					k=key(cursor,index);
					if(k==null||!cursor.continue(k)) break;
				}else if(!cursor.continue()){
					break;
				}
			}
		}());
	}

	/**
	 * Use an asynchronous indexed DB cursor
	 * 
	 * @param {IDBCursor} cursor Asynchronous indexed DB cursor
	 * @param {AsyncFunction<IDBCursor,int,any>} key (optional) Next key returning action (gets the cursor and the index as parameters and needs to return the next key to use or `null` to stop)
	 * @return {LinqArrayExt} LINQ array
	 */
	static async FromCursorAsync(cursor,key=null){
		const res=new this();
		for(let k,index=0;cursor.count;index++){
			res.push(cursor.value);
			if(key){
				k=await key(cursor,index);
				if(k==null||!await cursor.continue(k)) break;
			}else if(!await cursor.continue()){
				break;
			}
		}
		return res;
	}

	/**
	 * Use a factory action to create the source for a dynamic LINQ array
	 * 
	 * @param {Function<Iterable>} factory Iterable factory
	 * @return {LinqArrayExt} Dynamic LINQ array
	 */
	static DynamicFromFactory(factory){return (new this()).GenerateDynamic(function*(){yield* factory()[Symbol.iterator]();});}//TEST

	/**
	 * Generate a fibonacci sequence (won't store generated values!)
	 * 
	 * @param {number} pp (optional) A (default: `0`)
	 * @param {number} p (optional) B (default: `1`)
	 * @return {LinqArrayExt} LINQ array with the generated sequence
	 */
	static Fibonacci(pp=0,p=1){
		//TEST
		return (new this(null,false)).Generate(function*(){
			for(let next=pp+p;;pp=p,p=next,next=pp+p) yield next;
		}(),Number.POSITIVE_INFINITY);
	}

	/**
	 * Generate a random integer sequence (won't store generated values!)
	 * 
	 * @param {int} minIncluding (optional) Minimum including
	 * @param {int} maxIncluding (optional) Maximum excluding
	 * @return {LinqArrayExt} LINQ array with the generated sequence
	 */
	static RandomInt(minIncluding=Number.MIN_SAFE_INTEGER,maxExcluding=Number.MAX_SAFE_INTEGER){
		//TEST
		minIncluding=Math.ceil(minIncluding);
		maxExcluding=Math.floor(maxExcluding);
		return (new this(null,false)).Generate(function*(){
			for(;;) yield Math.floor(Math.random()*(maxExcluding-minIncluding))+minIncluding;
		}(),Number.POSITIVE_INFINITY);
	}

	/**
	 * Generate a random arbitrary sequence (won't store generated values!)
	 * 
	 * @param {number} minIncluding (optional) Minimum including
	 * @param {number} maxIncluding (optional) Maximum excluding
	 * @return {LinqArrayExt} LINQ array with the generated sequence
	 */
	static RandomArbitrary(minIncluding=Number.MIN_VALUE,maxExcluding=Number.MAX_VALUE){
		//TEST
		return (new this(null,false)).Generate(function*(){
			for(;;) yield Math.random()*(maxExcluding-minIncluding)+minIncluding;
		}(),Number.POSITIVE_INFINITY);
	}

	/**
	 * Create a row column configuration
	 * 
	 * @param {string} key Row object property name
	 * @param {boolean} summary (optional) Create a summary row (default: `false`)?
	 * @param {Function<any,int,any>|AsyncFunction<any,int,any>|string} group (optional) Group key action or item property name (default: the value from `key`)
	 * @param {Function<LinqArray,any>|AsyncFunction<LinqArray,any>|string} data (optional) Row field value action (gets a row group as parameter, needs to return the cell value) or item property name (default: group key)
	 * @return {object} Pivot row field configuration
	 */
	static PivotRowColumn(key,summary=false,group=null,data=null){return {key,group,data,summary};}

	/**
	 * Create a group column configuration (will generate a golumn for each group)
	 * 
	 * @param {Function<any,int,any>|AsyncFunction<any,any>|string} group Group key action or item property name
	 * @param {Function<LinqArray,any>|AsyncFunction<LinqArray,any>|string} data Cell value returning action (gets a row/column group (or column group, if not using a row column, or the whole source for a summary) as parameter, needs to return the cell value) or item property name to summarize
	 * @param {Function<LinqArray,string>|AsyncFunction<LinqArray,string>} key (optional) Row object property name returning action (gets a row/column group (or column group, if not using a row column, or the whole source for a summary) and the column index as parameters, needs to return the property name) (default: group key)
	 * @return {object} Pivot column configuration
	 */
	static PivotGroupColumn(group,data,key=null){return {key,group,data};}

	/**
	 * Create a partition column configuration (will generate a golumn for each partition PLUS a `null` key column for the misfits)
	 * 
	 * **NOTE**: A partition maximum isn't supported here.
	 * 
	 * @param {object[]} partitions Partition informations as created by `LinqArrayExt.PartitionInfo`
	 * @param {Function<LinqArray,any>|AsyncFunction<LinqArray,any>|string} data Cell value returning action (gets a row/column group (or column group, if not using a row column, or the whole source for a summary) as parameter, needs to return the cell value) or item property name to summarize
	 * @return {object} Pivot column configuration
	 */
	static PivotPartitionColumn(partitions,data){
		const len=partitions.length;
		let i;
		return {key:null,group:(item)=>{
			for(i=0;i<len;i++) if(partitions[i].action(item)) return partitions[i].key;
			return null;
		},data};
	}

	/**
	 * Create a calculated column configuration
	 * 
	 * @param {string} key Row object property name
	 * @param {Function<LinqArray,any>|AsyncFunction<LinqArray,any>|string} data Cell value returning action (gets a row group or the whole source data (for the summary row) as parameter, needs to return the cell value) or item property name to summarize
	 * @return {object} Pivot column configuration
	 */
	static PivotCalcColumn(key,data){return {key,group:null,data};}

	/**
	 * Create a partition information
	 * 
	 * **NOTE**: The `misfits` parameter will be taken from the first partition information only.
	 * 
	 * @param {string} key Partition key
	 * @param {Function<any,int,boolean>|AsyncFunction<any,int,boolean>} action Filter action
	 * @param {int} max (optional) Maximum number of items to store
	 * @param {boolean} (optional) Misfits partition (default: `true`)
	 * @return {object} Partition information
	 */
	static PartitionInfo(key,action,max=null,misfits=true){return{key,action,max,misfits};}
}

// Override the global `From` function to generate a LINQ array extensions object from now on
if(window) window.From=(arr,store=true,pass=false)=>LinqArrayExt.From(arr,store,pass);//TEST

// Initialize PLINQ
if(window&&'document' in window&&!LinqArray.Helper.IsUndefined(window['PLinq'])) PLinq.TypeInfo['LinqArrayExt']=document.currentScript.src;
