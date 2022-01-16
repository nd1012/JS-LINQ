/**
 * LINQ array extensions
 * 
 * @github https://github.com/nd1012/JS-LINQ
 * @license MIT
 * @copyright (c)2022 Andreas Zimmermann, wan24.de
 */
 class LinqArrayExt extends LinqArray{
	/**
	 * Inner join this array with another array by their common keys
	 * 
	 * @param {Array} arr Array
	 * @param {Function<any,any>|string} action Key action or item key name
	 * @param {Function<any,any>|string} arrAction Key action or array item key name
	 * @param {Function<any,Array,any>} result (optional) Value action (gets the item and the array item as parameters and needs to return the final result to use)
	 * @param {Function<any,any,boolean>} comp (optional) Key comparing action
	 * @return {LinqArrayExt} Resulting LINQ array
	 */
	InnerJoin(arr,action,arrAction,result=null,comp=null){return this.Join(arr,action,arrAction,result??((a,b)=>({...a,...b})),comp);}

	/**
	 * Left join this array with another array by their common keys
	 * 
	 * @param {Array} arr Array
	 * @param {Function<any,any>|string} action Key action or item key name
	 * @param {Function<any,any>|string} arrAction Key action or array item key name
	 * @param {Function<any,Array,any>} result Value action (gets the item and the array item as parameters and needs to return the final result to use)
	 * @param {Function<any,any,boolean>} comp (optional) Key comparing action
	 * @return {LinqArrayExt} Resulting LINQ array
	 */
	LeftJoin(arr,action,arrAction,result,comp=null){
		return LinqArray.Helper.EnsureLinqArray(arr,true)
			.GroupJoin(this,action,arrAction,(a,b)=>{a,b},comp)
			.SelectMany((item)=>item.b,(a,b)=>result(a.a,b));
	}

	/**
	 * Right join this array with another array by their common keys
	 * 
	 * @param {Array} arr Array
	 * @param {Function<any,any>|string} action Key action or item key name
	 * @param {Function<any,any>|string} arrAction Key action or array item key name
	 * @param {Function<any,Array,any>} result Value action (gets the items and an array item as parameters and needs to return the final result to use)
	 * @param {Function<any,any,boolean>} comp (optional) Key comparing action
	 * @return {LinqArrayExt} Resulting LINQ array
	 */
	RightJoin(arr,action,arrAction,result,comp=null){
		return LinqArray.Helper.EnsureLinqArray(arr,true)
			.GroupJoin(this,arrAction,action,(a,b)=>{a,b},comp)
			.SelectMany((item)=>item.b,(a,b)=>result(b,a.a));
	}

	/**
	 * Full join this array with another array by their common keys
	 * 
	 * @param {Array} arr Array
	 * @param {Function<any,any>|string} action Key action or item key name
	 * @param {Function<any,any>|string} arrAction Key action or array item key name
	 * @param {Function<any,Array,any>} leftResult Value action (gets the item and the array item as parameters and needs to return the final result to use)
	 * @param {Function<any,Array,any>} rightResult Value action (gets the items and an array item as parameters and needs to return the final result to use)
	 * @param {Function<any,any,boolean>} comp (optional) Key comparing action
	 * @return {LinqArrayExt} Resulting LINQ array
	 */
	FullJoin(arr,action,arrAction,leftResult,rightResult,comp=null){
		action=LinqArray.Helper.EnsureValueGetter(action);
		arrAction=LinqArray.Helper.EnsureValueGetter(arrAction);
		arr=LinqArray.Helper.EnsureLinqArray(arr,true);
		return this.LeftJoin(arr,action,arrAction,leftResult,comp).Union(this.RightJoin(arr,action,arrAction,rightResult,comp));
	}

	/**
	 * Cross join this array with another array
	 * 
	 * @param {Array} arr Array
	 * @param {Function<any,Array,any>} result Value action (gets the item and the array item as parameters and needs to return the final result to use)
	 * @return {LinqArrayExt} Resulting LINQ array
	 */
	CrossJoin(arr,result){return this.Join(arr,(item)=>item,(item)=>item,result,()=>true);}

	/**
	 * Create a partition table
	 * 
	 * **NOTE**: There'll be a partition without `GroupKey` that contains all items that didn't match into a partition.
	 * 
	 * @param {...object} partitions Partition informations (as returned from `LinqArrayExt.PartitionInfo`)
	 * @return {LinqArrayExt} LINQ array of LINQ array partitions
	 */
	Partition(...partitions){
		const linqArrayExt=this.constructor,
			res=LinqArrayExt.Repeat(i=>i==partitions.length?new linqArrayExt():new linqArrayExt()._SetGroupKey(partitions[i].key),partitions.length+1).EnsureGenerated();
		let item,
			i,
			match;
		for(item of this){
			for(i=0,match=false;!match&&i<partitions.length;i++){
				if((partitions[i].max&&res[i].length>=partitions[i].max)||!partitions[i].action(item)) continue;
				res[i].push(item);
				match=true;
			}
			if(!match) res.Last().push(item);
		}
		return res;
	}

	/**
	 * Create a pivot table or summaries
	 * 
	 * Supports:
	 * 
	 * - Optional row group column
	 * - Any row/field group column
	 * - Any calculated column
	 * - Optional summary row
	 * - Optional summaries only
	 * 
	 * @param {object} row The row column configuration that was created using the static `LinqArrayExt.PivotRowColumn` method, or `null` to skip row grouping
	 * @param {...object} cols The column configurations that were created using the static `LinqArrayExt.PivotGroupColumn` or `LinqArrayExt.PivotCalcColumn` method
	 * @return {LinqArrayExt|object} Pivot table or summaries
	 */
	Pivot(row,...cols){
		const self=this,
			proto=row?{[row.key]:null}:{};
		if(row) row.data??=(group)=>group.GroupKey;
		cols=new LinqArray(cols).ForEach(col=>{
			col.key??=(group)=>group.GroupKey;
			if(col.group==null){
				proto[col.key]=null;
			}else{
				col.groups=self.GroupBy(col.group).OrderBy(group=>group.GroupKey,null,true).ForEach(group=>proto[col.key(group)]=null);
			}
			if(LinqArray.Helper.IsFunction(col.data)) return;
			const prop=col.data;
			col.data=(data)=>data.Sum(item=>Number(item[prop]));
		});
		const table=row==null?null:this.GroupBy(row.group??row.key).Select(group=>{
			const item=Object.assign({},proto,{[row.key]:row.data(group)});
			cols.ForEach(col=>(col.group==null?item[col.key]=col.data(group):group.GroupBy(col.group).ForEach(colGroup=>item[col.key(colGroup)]=col.data(colGroup)),true));
			return item;
		});
		if(table&&!row.summary) return table;
		const summary=Object.assign({},proto);
		cols.ForEach(col=>(col.group==null?summary[col.key]=col.data(self):col.groups.ForEach(colGroup=>summary[col.key(colGroup)]=col.data(colGroup)),true));
		return table?.Append(summary)??summary;
	}

	/**
	 * Calculate the moving average
	 * 
	 * @param {number} ma (optional) Initial value (default: `0`)
	 * @return {number} Moving average
	 */
	MovingAverage(ma=0){return this.EnsureGenerated().length?this.reduce((ma,current)=>(ma+current)/2,ma):ma;};
	
	/**
	 * Calculate the moving averages
	 * 
	 * @param {number} ma (optional) Initial value (default: `0`)
	 * @return {LinqArrayExt} Moving averages
	 */
	MovingAverages(ma=0){return this.Select((item)=>ma=(ma+item)/2);}

	/**
	 * Take a stepped subset
	 * 
	 * @param {int} stepping Stepping count
	 * @return {LinqArrayExt} Subset
	 */
	TakeEvery(stepping){
		let count=0;
		return this.Where(()=>!(++count==stepping?count=0:count));
	}

	/**
	 * Takes one random item
	 * 
	 * @return {any} Random item
	 */
	TakeRandom(){
		const len=this.EnsureGenerated().length;
		if(!len) throw new RangeError();
		return this.ElementAt(Math.floor(Math.random()*len));
	}

	/**
	 * Use this instance or a fallback, if this instance is empty
	 * 
	 * @param {Function<LinqArray>|LinqArray} fallback Fallback factory or LINQ array
	 * @return {LinqArray} LINQ array
	 */
	FallbackIfEmpty(fallback){return this.IsEmpty()?(LinqArray.Helper.IsFunction(fallback)?fallback():fallback):this;}

	/**
	 * Shuffle the items
	 * 
	 * @param {boolean} inPlace (optional) Shuffle THIS LINQ array (default: `false`)
	 * @return {LinqArrayExt} Resulting LINQ array
	 */
	Shuffle(inPlace=false){return this.OrderBy(()=>Math.random(),null,inPlace);}

	/**
	 * Find doubles
	 * 
	 * @param {Function<any,any>|string} action (optional) Key action or item key name
	 * @return {LinqArrayExt} Doubles as LINQ array of LINQ arrays which contains the double items and having the group key in the `GroupKey` property
	 */
	Doubles(action=null){return this.GroupBy(action).Where(group=>group.length>1);}

	/**
	 * Replace items with another item
	 * 
	 * @param {Function<any,boolean>|any} search Search action (gets the item as parameter and needs to return `true` to replace it) or item
	 * @param {Function<any,any>|any} replace (optional) Replace action (gets the item as parameter and needs to return the replacement) or replacement (default: `null`)
	 * @param {Function<any,any,boolean>} comp (optional) Comparing action
	 * @param {boolean} inPlace (optional) Replace in THIS LINQ array (default: `false`)?
	 * @return {LinqArrayExt} Resulting LINQ array
	 */
	Replace(search,replace=null,comp=null,inPlace=false){
		const self=this,
			sFnc=LinqArray.Helper.IsFunction(search),
			rFnc=LinqArray.Helper.IsFunction(replace),
			res=inPlace?null:this._CreateGenerated(function*(){
				let index=0,
					item;
				for(item of self._Iterable){
					if((sFnc&&search(item))||(!sFnc&&(comp?comp(search,item):search==item))) res[index]=rFnc?replace(item):replace;
					index++;
				}
			}());
		if(inPlace){
			let index=0,
				item;
			for(item of this._Iterable){
				if((sFnc&&search(item))||(!sFnc&&(comp?comp(search,item):search==item))) this._Iterable[index]=rFnc?replace(item):replace;
				index++;
			}
		}
		return res??this;
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
	 * @param {Function<object,Array,any>} result (optional) Action to execute per item (gets the item and the header as parameters, needs to return the item)
	 * @return {LinqArrayExt} LINQ array
	 */
	static FromCsv(csv,header=true,fieldDelimiter=',',stringDelimiter='"',result=null){
		if(!csv.endsWith("\n")) csv+="\n";
		return (new this()).Generate(function*(){
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
						yield result?result(item,header):item;
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
	 * @return {LinqArrayExt} LINQ array
	 */
	static FromXml(xml){
		const dom=(new DOMParser()).parseFromString(xml,'application/xml');
		let node=null,
			child;
		for(child of dom.childNodes){
			if(child.nodeType!=Node.ELEMENT_NODE) continue;
			node=child;
			break;
		}
		return node&&node.childNodes.length?this.FromNode(node):new this();
	}

	/**
	 * Convert a `Node` object
	 * 
	 * **NOTE**: All child nodes from the given node will be used as object (if they have child nodes, too) or string items (recursive processing). If a node contains 
	 * many child nodes with the same name, the values will be collected as LINQ array.
	 * 
	 * @param {Node} node Node
	 * @return {LinqArrayExt} LINQ array
	 */
	static FromNode(node){
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
							return node.textContent;
					}
				return any?res:(text==''?null:text);
			};
		return node.childNodes.length?(new this()).Generate(function*(){
			let child;
			for(child of node.childNodes) if(child.nodeType==Node.ELEMENT_NODE) yield nodeToObject(child);
		}()):new this();
	}

	/**
	 * Generate a fibonacci sequence (won't store generated values!)
	 * 
	 * @param {number} pp (optional) A (default: `0`)
	 * @param {number} p (optional) B (default: `1`)
	 * @return {LinqArrayExt} LINQ array with the generated sequence
	 */
	static Fibonacci(pp=0,p=1){
		return (new this()).Generate(function*(){
			for(let next=pp+p;;pp=p,p=next,next=pp+p) yield next;
		}(),Number.POSITIVE_INFINITY).DisableStore();
	}

	/**
	 * Generate a random integer sequence (won't store generated values!)
	 * 
	 * @param {int} minIncluding (optional) Minimum including
	 * @param {int} maxIncluding (optional) Maximum excluding
	 * @return {LinqArrayExt} LINQ array with the generated sequence
	 */
	static RandomInt(minIncluding=Number.MIN_SAFE_INTEGER,maxExcluding=Number.MAX_SAFE_INTEGER){
		minIncluding=Math.ceil(minIncluding);
		maxExcluding=Math.floor(maxExcluding);
		return (new this()).Generate(function*(){
			for(;;) yield Math.floor(Math.random()*(maxExcluding-minIncluding))+minIncluding;
		}(),Number.POSITIVE_INFINITY).DisableStore();
	}

	/**
	 * Generate a random arbitrary sequence (won't store generated values!)
	 * 
	 * @param {number} minIncluding (optional) Minimum including
	 * @param {number} maxIncluding (optional) Maximum excluding
	 * @return {LinqArrayExt} LINQ array with the generated sequence
	 */
	static RandomArbitrary(minIncluding=Number.MIN_VALUE,maxExcluding=Number.MAX_VALUE){
		return (new this()).Generate(function*(){
			for(;;) yield Math.random()*(maxExcluding-minIncluding)+minIncluding;
		}(),Number.POSITIVE_INFINITY).DisableStore();
	}

	/**
	 * Create a row column configuration
	 * 
	 * @param {string} key Row object property name
	 * @param {boolean} summary (optional) Create a summary row (default: `false`)?
	 * @param {Function<any,any>|string} group (optional) Group key action or item property name (default: the value from `key`)
	 * @param {Function<LinqArray,any>|string} data (optional) Row field value action (gets a row group as parameter, needs to return the cell value) or item property name (default: group key)
	 * @return {object} Pivot row field configuration
	 */
	static PivotRowColumn(key,summary=false,group=null,data=null){return {key,group,data,summary};}

	/**
	 * Create a group column configuration (will generate a golumn for each group)
	 * 
	 * @param {Function<any,any>|string} group Group key action or item property name
	 * @param {Function<LinqArray,any>|string} data Cell value returning action (gets a row/column group (or column group, if not using a row column, or the whole source for a summary) as parameter, needs to return the cell value) or item property name to summarize
	 * @param {Function<LinqArray,string>} key (optional) Row object property name returning action (gets a row/column group (or column group, if not using a row column, or the whole source for a summary) and the column index as parameters, needs to return the property name) (default: group key)
	 * @return {object} Pivot column configuration
	 */
	static PivotGroupColumn(group,data,key){return {key,group,data};}

	/**
	 * Create a calculated column configuration
	 * 
	 * @param {string} key Row object property name
	 * @param {Function<LinqArray,any>|string} data Cell value returning action (gets a row group or the whole source data (for the summary row) as parameter, needs to return the cell value) or item property name to summarize
	 * @return {object} Pivot column configuration
	 */
	static PivotCalcColumn(key,data){return {key,group:null,data};}

	/**
	 * Create a partition information
	 * 
	 * @param {string} key Partition key
	 * @param {Function<any,boolean>} action Filter action
	 * @param {int} max (optional) Maximum number of items to store
	 * @return {object} Partition information
	 */
	static PartitionInfo(key,action,max=null){return{key,action,max};}
}

// Override the global `From` function to generate a LINQ array extensions object from now on
if(window) window.From=(arr,store=true,pass=false)=>LinqArrayExt.From(arr,store,pass);
