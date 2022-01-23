class LinqArray_Tests extends Tests{
	#Data=[1,3,2];

	Construction_Test(){
		// Constructor
		let arr=this.Catch(()=>new LinqArray(this.#Data.slice()));
		this.Assert(arr.SequenceEqual(this.#Data));
		arr[0]=0;
		this.Assert(!arr.SequenceEqual(this.#Data));

		// Global From (uses static From)
		this.Catch(()=>arr=From(this.#Data.slice()));
		this.AssertNotEqual(arr,null)
			.Assert(arr instanceof LinqArray)
			.Assert(arr.SequenceEqual(this.#Data));
		arr[0]=0;
		this.Assert(!arr.SequenceEqual(this.#Data));

		// Extend array
		let temp=this.#Data.slice();
		this.Catch(()=>arr=LinqArray.ExtendObject(temp));
		this.AssertNotEqual(arr,null)
			.Assert(arr instanceof LinqArray)
			.Assert(arr.SequenceEqual(this.#Data))
			.AssertEqual(arr.Extended,temp,true);
		temp[0]=0;
		this.Assert(arr.SequenceEqual(temp))
			.Assert(!arr.SequenceEqual(this.#Data));

		// Array extension
		LinqArray.ExtendArray();
		this.Catch(()=>arr=this.#Data.slice().ToLinqArray());
		this.AssertNotEqual(arr,null)
			.Assert(arr instanceof LinqArray)
			.Assert(arr.SequenceEqual(this.#Data));
		arr[0]=0;
		this.Assert(!arr.SequenceEqual(this.#Data));
	}

	Properties_Test(){
		this.AssertEqual(LinqArray.VERSION,0,true)
			.AssertEqual(typeof LinqArray.Helper,'object',true);
		let arr=new LinqArray(),
			arr2=arr.ToLinqArray();
		this.AssertEqual(arr.Parent,null)
			.AssertEqual(arr2.Parent,arr,true);
		arr=From(this.#Data);
		this.Assert(!arr.IsGenerated)
			.Assert(arr.EnsureGenerated().IsGenerated)
			.AssertEqual(arr.Extended,null)
			.AssertEqual(arr.Tag,null);
		arr.Tag=true;
		this.AssertEqual(arr.Tag,true,true)
			.Assert(arr.SupportsDynamic);
	}

	Store_Test(){
		// Store disabled
		let arr=this.Catch(()=>From(this.#Data,false));
		this.Assert(!arr.Store)
			.Assert(!arr.PassStore)
			.AssertEqual(arr.Count(),3,true)
			.AssertEqual(arr.ToArray().length,3,true)
			.AssertException(()=>arr.ToArray().length===3,TypeError)
			.AssertEqual(arr.Count(),3,true)
			.Assert(!arr.SupportsDynamic);

		// Not passing store
		this.Catch(()=>arr=From(this.#Data,false));
		let arr2=arr.ToLinqArray();
		this.Assert(arr2.Store)
			.Assert(!arr2.SupportsDynamic);

		// Passing store
		this.Catch(()=>arr=From(this.#Data,false,true));
		this.Catch(()=>arr2=arr.ToLinqArray());
		this.Assert(arr.PassStore)
			.Assert(!arr2.Store)
			.Assert(arr2.PassStore)
			.AssertEqual(arr2.ToArray().length,3,true)
			.AssertException(()=>arr.ToArray(),TypeError)
			.AssertException(()=>arr2.ToArray(),TypeError)
			.Assert(!arr2.SupportsDynamic);
		
		// Disable store
		arr=From(this.#Data);
		this.Assert(!arr.DisableStore().Store)
			.AssertException(()=>arr.DisableStore(),TypeError)
			.AssertEqual(arr.ToArray().length,3,true)
			.AssertException(()=>arr.ToArray(),TypeError);
	}

	Dynamic_Test(){
		// Dynamic
		let temp=this.#Data.slice(),
			arr=this.Catch(()=>(new LinqArray()).SetDynamicData(temp));
		this.Assert(arr.SequenceEqual(this.#Data))
			.Assert(arr.IsDynamic)
			.AssertEqual(arr.Count(),3,true);
		
		// Modify source
		temp[0]=0;
		this.Assert(!arr.SequenceEqual(this.#Data));
		temp.push(1);
		this.AssertEqual(arr.Count(),4,true);

		// To undynamic
		let arr2=this.Catch(()=>arr.DisableDynamic(false));
		this.Assert(arr.SequenceEqual(arr2))
			.Assert(!arr2.IsDynamic);
		temp[0]=4;
		this.Assert(!arr.SequenceEqual(arr2));

		// Make undynamic
		this.Catch(()=>arr.DisableDynamic());
		this.Assert(arr.SequenceEqual(temp))
			.Assert(!arr.IsDynamic);
		temp[0]=0;
		this.Assert(!arr.SequenceEqual(temp))
			.Assert(!arr.SequenceEqual(arr2));
		
		// To dynamic
		arr=From(temp);
		this.Assert(!arr.IsDynamic);
		this.Catch(()=>arr2=arr.ToDynamic());
		this.Assert(arr2.SequenceEqual(arr))
			.Assert(arr2.IsDynamic);
		arr[0]=0;
		this.Assert(arr2.SequenceEqual(arr));
	}

	async Json_Test(){
		// Serialization
		let arr=From(this.#Data.slice()),
			json=this.Catch(()=>arr.ToJson());
		this.AssertEqual(typeof json,'string',true);

		// Deserialization
		this.Catch(()=>arr=LinqArray.FromJson(json));
		this.AssertNotEqual(arr,null)
			.Assert(arr instanceof LinqArray)
			.Assert(arr.SequenceEqual(this.#Data));
		
		// JSON URI
		await this.CatchAsync(async ()=>arr=await LinqArray.FromJsonUri('data:application/json;base64,'+btoa(JSON.stringify(this.#Data))));
		this.AssertNotEqual(arr,null)
			.Assert(arr instanceof LinqArray)
			.Assert(arr.SequenceEqual(this.#Data));
		await this.CatchAsync(async ()=>arr=await LinqArray.FromJsonUri('data:application/json;base64,'+btoa(arr.ToJson()),true));
		this.AssertNotEqual(arr,null)
			.Assert(arr instanceof LinqArray)
			.Assert(arr.SequenceEqual(this.#Data));
	}

	Range_Test(){
		// Incrementing
		let arr=this.Catch(()=>LinqArray.Range(1,4).EnsureGenerated());
		this.Assert(arr.SequenceEqual([1,2,3]));
		
		// Decrementing
		arr=this.Catch(()=>LinqArray.Range(3,0));
		this.Assert(arr.SequenceEqual([3,2,1]));
	}

	Empty_Test(){
		let arr=this.Catch(()=>LinqArray.Empty());
		this.AssertNotEqual(arr,null)
			.Assert(arr instanceof LinqArray)
			.AssertEqual(arr.EnsureGenerated().length,0,true);
	}

	async Repeat_Test(){
		// Value
		let arr=this.Catch(()=>LinqArray.Repeat(0,3).EnsureGenerated());
		this.AssertNotEqual(arr,null)
			.Assert(arr instanceof LinqArray)
			.AssertEqual(arr.length,3,true)
			.Assert(arr.SequenceEqual([0,0,0]));
		
		// Value factory
		this.Catch(()=>arr=LinqArray.Repeat(()=>1,3).EnsureGenerated());
		this.AssertNotEqual(arr,null)
			.Assert(arr instanceof LinqArray)
			.AssertEqual(arr.length,3,true)
			.Assert(arr.SequenceEqual([1,1,1]));
		
		// Asynchronous value factory
		await this.CatchAsync(async ()=>arr=(await LinqArray.RepeatAsync(()=>2,3)).EnsureGenerated());
		this.AssertNotEqual(arr,null)
			.Assert(arr instanceof LinqArray)
			.AssertEqual(arr.length,3,true)
			.Assert(arr.SequenceEqual([2,2,2]));
	}

	Helper_Test(){
		this.Assert(LinqArray.Helper.IsLinqArray(new LinqArray()))
			.Assert(!LinqArray.Helper.IsLinqArray([]))
			.Assert(LinqArray.Helper.EnsureLinqArray(this.#Data.slice()) instanceof LinqArray)
			.AssertEqual(LinqArray.Helper.EnsureFinalArray(this.#Data.slice()).length,3,true)
			.AssertEqual(LinqArray.Helper.EnsureFinalArray(From(this.#Data.slice())).length,3,true)
			.AssertEqual(LinqArray.Helper.GetArrayLength(this.#Data.slice()),3,true)
			.AssertEqual(LinqArray.Helper.GetArrayLength(From(this.#Data.slice())),3,true)
			.Assert(LinqArray.Helper.IsUndefined(undefined))
			.Assert(!LinqArray.Helper.IsUndefined(true))
			.Assert(LinqArray.Helper.IsFunction(()=>false))
			.Assert(!LinqArray.Helper.IsFunction(true))
			.Assert(LinqArray.Helper.IsString('test'))
			.Assert(!LinqArray.Helper.IsString(true));
	}

	async Count_Test(){
		let arr=From(this.#Data.slice());
		this.Assert(!arr.IsGenerated)
			.AssertEqual(arr.Count(),3,true)
			.Assert(!arr.IsGenerated)
			.AssertEqual(arr.Count(i=>i===2),1,true)
			.Assert(arr.IsGenerated)
			.AssertEqual((await arr.CountAsync(i=>i===2)),1,true);
		arr.pop();
		this.AssertEqual(arr.Count(),2,true)
			.AssertEqual(arr.Count(i=>i===2),0,true)
			.AssertEqual((await arr.CountAsync(i=>i===2)),0,true);
	}

	IsEmpty_Test(){
		this.Assert(this.Catch(()=>LinqArray.Empty().IsEmpty()))
			.Assert(!From(this.#Data.slice()).IsEmpty())
			.Assert(From(this.#Data.slice()).Clear().IsEmpty());
	}

	Contains_Test(){
		let arr=From(this.#Data.slice());
		this.Assert(arr.Contains(2))
			.Assert(!arr.Contains('test'));
	}

	async Where_Test(){
		let arr=From(this.#Data.slice());
		this.AssertEqual(arr.Where(i=>i===2).Count(),1,true)
			.AssertEqual((await arr.WhereAsync(async (i)=>i===2)).Count(),1,true);
	}

	async Select_Test(){
		// Select
		let arr=this.Catch(()=>From(this.#Data.slice()).Select(i=>i*2));
		this.Assert(arr.SequenceEqual([2,6,4]));

		// Select async
		arr=await this.CatchAsync(()=>From(this.#Data.slice()).SelectAsync(async (i)=>i*2));
		this.Assert(arr.SequenceEqual([2,6,4]));
	}

	async All_Test(){
		let arr=From(this.#Data.slice());
		this.Assert(arr.All(i=>i<4))
			.Assert((await arr.AllAsync(async (i)=>i<4)))
			.Assert(!arr.All(i=>i==1))
			.Assert(!(await arr.AllAsync(async (i)=>i==1)));
	}

	async Any_Test(){
		let arr=From(this.#Data.slice());
		this.Assert(arr.Any(i=>i<2))
			.Assert((await arr.AnyAsync(async (i)=>i<2)))
			.Assert(!arr.Any(i=>i>3))
			.Assert(!(await arr.AnyAsync(async (i)=>i>3)));
	}

	Distinct_Test(){
		// Distinct
		let arr=From(this.#Data.slice()).EnsureGenerated();
		arr.push(2);
		let arr2=this.Catch(()=>arr.Distinct());
		this.Assert(arr2.SequenceEqual(this.#Data))
			.Assert(!arr.SequenceEqual(arr2));
		
		// Distinct by
		this.Catch(()=>arr2=arr.DistinctBy(i=>i*2));
		this.Assert(arr2.SequenceEqual(this.#Data));
	}

	Union_Test(){
		// Union
		let arr=From(this.#Data.slice()),
			arr2=this.Catch(()=>arr.Union([1,4]).EnsureGenerated());
		this.AssertEqual(arr2.pop(),4,true)
			.Assert(arr2.SequenceEqual(this.#Data));

		// Union in place
		this.AssertEqual(this.Catch(()=>arr.Union([1,4],null,true).EnsureGenerated().pop()),4,true)
			.Assert(arr.SequenceEqual(this.#Data));

		// Union by
		this.Catch(()=>arr2=arr.UnionBy([1,4],i=>i*2).EnsureGenerated());
		this.AssertEqual(arr2.pop(),4,true)
			.Assert(arr2.SequenceEqual(this.#Data));

		// Union by in place
		this.AssertEqual(this.Catch(()=>arr.UnionBy([1,4],i=>i*2,null,true).EnsureGenerated().pop()),4,true)
			.Assert(arr.SequenceEqual(this.#Data));
		
		// Union dynamic
		arr=From(this.#Data.slice()).ToDynamic();
		this.Catch(()=>arr2=arr.Union([1,4]));
		this.AssertEqual(arr2.Last(),4,true);

		// Union in place dynamic
		this.AssertEqual(arr.Union([1,4],null,true).Last(),4,true);

		// Union by dynamic
		arr=From(this.#Data.slice()).ToDynamic();
		this.Catch(()=>arr2=arr.UnionBy([1,4],i=>i*2));
		this.AssertEqual(arr2.Last(),4,true);

		// Union by in place dynamic
		this.AssertEqual(this.Catch(()=>arr.UnionBy([1,4],i=>i*2,null,true).Last()),4,true);
	}

	OfType_Test(){
		//TODO Strict tests
		let arr=From(this.#Data.slice());
		this.AssertEqual(this.Catch(()=>arr.OfType('string')).Count(),0,true)
			.AssertEqual(this.Catch(()=>arr.OfType('number')).Count(),3,true)
			.AssertEqual(this.Catch(()=>arr.OfType(Number)).Count(),0,true)
			.AssertEqual(this.Catch(()=>arr.OfType('Number')).Count(),3,true);
		arr=From([null,new LinqArrayExt(),true]);
		this.AssertEqual(this.Catch(()=>arr.OfType(LinqArray)).Count(),1,true)
			.AssertEqual(this.Catch(()=>arr.OfType(LinqArray,true)).Count(),0,true)
			.AssertEqual(this.Catch(()=>arr.OfType('boolean',true)).Count(),1,true)
			.AssertEqual(this.Catch(()=>arr.OfType('linqArray',true)).Count(),0,true);
	}

	constructor(){super();}
}
