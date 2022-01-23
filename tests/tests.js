/**
 * Test results
 * 
 * @github https://github.com/nd1012/JS-TESTS
 * @license MIT
 * @copyright (c)2022 Andreas Zimmermann, wan24.de
 */
class TestResults{
	/**
	 * Test types
	 * 
	 * @var {Map<TestResults>}
	 */
	#Types=new Map();
	/**
	 * Test results
	 * 
	 * @var {Map<TestResults>}
	 */
	#TestResults=new Map();
	/**
	 * Assertion counter
	 * 
	 * @var {int}
	 */
	#Assertions=0;
	/**
	 * Test counter
	 * 
	 * @var {int}
	 */
	#Tests=0;
	/**
	 * Runtime in ms
	 * 
	 * @var {int}
	 */
	#Runtime=null;
	/**
	 * Last error
	 * 
	 * @var {Error}
	 */
	#LastError=null;

	/**
	 * Get the tested types results
	 * 
	 * @return {Map<TestResults>} Types and their test results
	 */
	get Types(){return this.#Types;}

	/**
	 * Get the test results
	 * 
	 * @return {Map<TestResults>} Tests and their results
	 */
	get TestResults(){return this.#TestResults;}
  
	/**
	 * Get the assertion counter
	 * 
	 * @return {int} Assertions
	 */
	get Assertions(){return this.#Assertions;}
	/**
	 * Set the assertion counter
	 * 
	 * @param {int} value Assertions
	 */
	set Assertions(value){this.#Assertions=value;}

	/**
	 * Get the tests counter
	 * 
	 * @return {int} Tests
	 */
	get Tests(){return this.#Tests;}
	/**
	 * Set the tests counter
	 * 
	 * @param {int} value Tests
	 */
	set Tests(value){this.#Tests=value;}

	/**
	 * Get the runtime
	 * 
	 * @return {int?} Runtime in ms
	 */
	get Runtime(){return this.#Runtime;}
	/**
	 * Set the runtime
	 * 
	 * @param {int} value Runtime in ms
	 */
	set Runtime(value){this.#Runtime=value;}

	/**
	 * Get the last error
	 * 
	 * @return {Error} Error
	 */
	get LastError(){return this.#LastError;}
	/**
	 * Set the last error
	 * 
	 * @param {Error} value Error
	 */
	set LastError(value){this.#LastError=value;}
 
	/**
	 * 
	 * @param {int} assertions (optional) Assertions
	 * @param {int} tests (optional) Tests
	 * @param {int} runtime (optional) Runtime
	 * @param {Error} lastError (optional) Last error
	 */
	constructor(assertions=0,tests=0,runtime=0,lastError=null){
		this.#Assertions=assertions;
		this.#Tests=tests;
		this.#Runtime=runtime;
		this.#LastError=lastError;
	}
}

/**
 * JavaScript tests base class
 * 
 * @github https://github.com/nd1012/JS-TESTS
 * @license MIT
 * @copyright (c)2022 Andreas Zimmermann, wan24.de
 */
class Tests extends TestResults{
	/**
	 * Current test
	 * 
	 * @var {string}
	 */
	#CurrentTest=null;
	/**
	 * Current test assertion counter
	 * 
	 * @var {int}
	 */
	#TestAssertions=0;
	/**
	 * Benchmarks
	 * 
	 * @var {Map<array[]>}
	 */
	#Benchmarks=new Map();
	/**
	 * Is this the tests fail test?
	 * 
	 * @var {boolean}
	 */
	#IsTestsFailTest=false;

	/**
	 * Get the test methods names
	 * 
	 * @return {string[]} Test method names
	 */
	get TestMethods(){return Object.getOwnPropertyNames(Object.getPrototypeOf(this));}

	/**
	 * Get the benchmarks of the tests
	 * 
	 * @return {Map<int[]>}
	 */
	get Benchmarks(){return this.#Benchmarks;}

	/**
	 * Determine if this is the tests fail test
	 * 
	 * @return {boolean} Is the fail test?
	 */
	get _IsTestsFailtest(){return this.#IsTestsFailTest;}

	/**
	 * Catch an exception of an action (if any)
	 * 
	 * @param {Function<any>} action Action
	 * @return {any} Action return value
	 */
	Catch(action){
		try{
			return action();
		}catch(ex){
			console.groupEnd();
			console.error('Test code exception catched',ex);
			debugger;
			throw ex;
		}
	}

	/**
	 * Catch an exception of an asynchronous action (if any)
	 * 
	 * @param {AsyncFunction<any>} action Action
	 * @return {any} Action return value
	 */
	async CatchAsync(action){
		try{
			return await action();
		}catch(ex){
			console.groupEnd();
			console.error('Test code exception catched',ex);
			debugger;
			throw ex;
		}
	}

	/**
	 * Assertion
	 * 
	 * @param {boolean} condition Condition result
	 * @return {Tests} This
	 */
	Assert(condition){
		this.Assertions++;
		this.#TestAssertions++;
		if(!condition){
			if(!this._IsTestsFailtest){
				console.groupEnd();
				debugger;
			}
			throw new AssertionError('Assertion failed at current test assertion '+this.#TestAssertions,this,this.#CurrentTest,this.#TestAssertions,true,false);
		}
		return this;
	}

	/**
	 * Equal assertion
	 * 
	 * @param {any} a A
	 * @param {any} b B
	 * @param {boolean} strict (optional) Be strict (default: `false`)?
	 * @return {Tests} This
	 */
	AssertEqual(a,b,strict=false){
		this.Assertions++;
		this.#TestAssertions++;
		if(strict?a!==b:a!=b){
			if(!this._IsTestsFailtest) console.groupEnd();
			console.warn(a,b,strict);
			if(!this._IsTestsFailtest) debugger;
			throw new AssertionError('Assertion failed at current test assertion '+this.#TestAssertions,this,this.#CurrentTest,this.#TestAssertions,a,b);
		}
		return this;
	}

	/**
	 * Not equal assertion
	 * 
	 * @param {any} a A
	 * @param {any} b B
	 * @param {boolean} strict (optional) Be strict (default: `false`)?
	 * @return {Tests} This
	 */
	AssertNotEqual(a,b,strict=false){
		this.Assertions++;
		this.#TestAssertions++;
		if(strict?a===b:a==b){
			if(!this._IsTestsFailtest) console.groupEnd();
			console.warn(a,b,strict);
			if(!this._IsTestsFailtest) debugger;
			throw new AssertionError('Assertion failed at current test assertion '+this.#TestAssertions,this,this.#CurrentTest,this.#TestAssertions,undefined,b);
		}
		return this;
	}

	/**
	 * Type assertion
	 * 
	 * @param {any} obj Object
	 * @param {Function<any>|string} type Type (name)
	 * @return {Tests} This
	 */
	AssertType(obj,type){
		this.Assertions++;
		this.#TestAssertions++;
		if(typeof type=='string'?typeof obj!=type&&obj?.constructor?.name!=type:!(obj instanceof type)){
			if(!this._IsTestsFailtest) console.groupEnd();
			console.warn(obj,type);
			if(!this._IsTestsFailtest) debugger;
			throw new AssertionError('Assertion failed at current test assertion '+this.#TestAssertions,this,this.#CurrentTest,this.#TestAssertions,obj,type);
		}
		return this;
	}

	/**
	 * Not type assertion
	 * 
	 * @param {any} obj Object
	 * @param {Function<any>|string} type Type (name)
	 * @return {Tests} This
	 */
	AssertNotType(obj,type){
		this.Assertions++;
		this.#TestAssertions++;
		if(typeof type=='string'?typeof obj==type||obj?.constructor?.name==type:obj instanceof type){
			if(!this._IsTestsFailtest) console.groupEnd();
			console.warn(obj,type);
			if(!this._IsTestsFailtest) debugger;
			throw new AssertionError('Assertion failed at current test assertion '+this.#TestAssertions,this,this.#CurrentTest,this.#TestAssertions,undefined,obj);
		}
		return this;
	}

	/**
	 * Assert an exception
	 * 
	 * @param {Function<void>} action Action
	 * @param {Function<Error>} type (optional) Exception type
	 * @return {Tests} This
	 */
	AssertException(action,type=null){
		this.Assertions++;
		try{
			action();
			debugger;
			throw new AssertionError('Assertion failed (exception not thrown) at current test assertion '+this.#TestAssertions,this,this.#CurrentTest,this.#TestAssertions,type,undefined);
		}catch(ex){
			if(type&&!(ex instanceof type)){
				if(!this._IsTestsFailtest) console.groupEnd();
				console.warn(ex);
				if(!this._IsTestsFailtest) debugger;
				throw new AssertionError('Assertion failed (exception type mismatch) at current test assertion '+this.#TestAssertions,this,this.#CurrentTest,this.#TestAssertions,type,ex);
			}
		}
		return this;
	}

	/**
	 * Assert an exception
	 * 
	 * @param {AsyncFunction<void>} action Action
	 * @param {Function<Error>} type (optional) Exception type
	 * @return {Tests} This
	 */
	async AssertExceptionAsync(action,type=null){
		this.Assertions++;
		try{
			await action();
			debugger;
			throw new AssertionError('Assertion failed (exception not thrown) at current test assertion '+this.#TestAssertions,this,this.#CurrentTest,this.#TestAssertions,type,undefined);
		}catch(ex){
			if(type&&!(ex instanceof type)){
				if(!this._IsTestsFailtest) console.groupEnd();
				console.warn(ex);
				if(!this._IsTestsFailtest) debugger;
				throw new AssertionError('Assertion failed (exception type mismatch) at current test assertion '+this.#TestAssertions,this,this.#CurrentTest,this.#TestAssertions,type,ex);
			}
		}
		return this;
	}

	/**
	 * Assert no exception
	 * 
	 * @param {Function<void>} action Action
	 * @return {any} Action result
	 */
	AssertNoException(action){
		this.Assertions++;
		try{
			return action();
		}catch(ex){
			if(!this._IsTestsFailtest) console.groupEnd();
			console.warn(ex);
			if(!this._IsTestsFailtest) debugger;
			throw new AssertionError('Assertion failed (unexpected exception) at current test assertion '+this.#TestAssertions,this,this.#CurrentTest,this.#TestAssertions,null,ex);
		}
	}

	/**
	 * Assert no exception
	 * 
	 * @param {AsyncFunction<void>} action Action
	 * @return {any} Action result
	 */
	async AssertNoExceptionAsync(action){
		this.Assertions++;
		try{
			return await action();
		}catch(ex){
			if(!this._IsTestsFailtest) console.groupEnd();
			console.warn(ex);
			if(!this._IsTestsFailtest) debugger;
			throw new AssertionError('Assertion failed (unexpected exception) at current test assertion '+this.#TestAssertions,this,this.#CurrentTest,this.#TestAssertions,null,ex);
		}
	}

	/**
	 * Run/end a benchmark
	 * 
	 * @param {Date} start (optional) Start time
	 * @param {string} info (optional) Information
	 * @return {Date} New start time
	 */
	Benchmark(start=null,info=null){
		const runtime=start?Date.now()-start:null;
		if(runtime!=null){
			console.log(info==null?'Benchmarked runtime: '+runtime+'ms':info+': '+runtime+'ms');
			if(this.#CurrentTest!=null)
				if(this.#Benchmarks.has(this.#CurrentTest)){
					this.#Benchmarks.get(this.#CurrentTest).push([info,runtime]);
				}else{
					this.#Benchmarks.set(this.#CurrentTest,[[info,runtime]]);
				}
		}
		return Date.now();
	}

	/**
	 * Reset this test results instance
	 * 
	 * @return {Tests} This
	 */
	Reset(){
		this.Assertions=0;
		this.Tests=0;
		this.Runtime=null;
		this.LastError=null;
		this.TestResults.clear();
		return this;
	}

	/**
	 * Run tests
	 * 
	 * @param {boolean} all (optional) Running all tests?
	 * @return {Tests} This
	 */
	async RunTests(all=false){
		this.Reset();
		let k=null,
			start=Date.now(),
			begin,
			err=false,
			runtime=null;
		try{
			for(k of this.TestMethods){
				if(!k.endsWith('_Test')||typeof this[k]!='function') continue;
				console.log('Running test "'+k+'"');
				this.Tests++;
				this.#TestAssertions=0;
				this.#CurrentTest=k;
				begin=Date.now();
				await this[k]();
				runtime=Date.now()-begin;
				this.TestResults.set(k,new TestResults(this.#TestAssertions,0,runtime));
				console.log('Test with '+this.#TestAssertions+' assertions in runtime: '+runtime+'ms');
			}
		}catch(ex){
			runtime=Date.now()-begin;
			this.LastError=ex;
			if(k!=null) this.TestResults.set(k,new TestResults(this.#TestAssertions,0,runtime,ex));
			err=true;
			if(all) console.groupEnd();
			if(!(ex instanceof AssertionError)){
				console.error('Unexpected exception after '+this.#TestAssertions+' assertions (after test runtime '+runtime+'ms)',ex);
			}else{
				console.error('Assertion '+this.#TestAssertions+' failed after test runtime '+runtime+'ms',ex);
				if(!this._IsTestsFailtest) debugger;
			}
		}finally{
			this.Runtime=Date.now()-start;
			const msg=this.Tests+' tests with '+this.Assertions+' assertions in total runtime: '+this.Runtime+'ms';
			if(err){
				console.warn(msg+' (interrupted by an error)');
			}else{
				console.log(msg+' (without any error)');
			}
		}
		return this;
	}

	/**
	 * Constructor
	 */
	constructor(){
		super();
		this.#IsTestsFailTest=this.constructor.name=='Tests_Tests_Fail';
	}

	/**
	 * Run all tests
	 * 
	 * @param {...string|...object|...any} types Type names or test instances (or mixed)
	 * @return {TestResults} Results
	 */
	static async RunAllTests(...types){
		let type,
			start=Date.now(),
			count=0,
			assert=0,
			tests=0,
			err=false,
			result=new Map(),
			runtime,
			lastError=null,
			temp;
		try{
			for(type of types){
				console.groupCollapsed('Test of '+(typeof type=='string'?type:type.constructor.name));
				console.log('Running tests of type "'+(typeof type=='string'?type:type.constructor.name)+'"');
				count++;
				if(!(type instanceof Tests)){
					temp=new window[type]();
					if(temp instanceof Tests){
						type=temp;
					}else{
						throw new TypeError('Failed to create instance of test type "'+(typeof type=='string'?type:type.constructor.name)+'"');
					}
				}
				result.set(type.constructor.name,type);
				await type.RunTests(true);
				tests+=type.Tests;
				assert+=type.Assertions;
				console.groupEnd();
				console.log('Last type test finished with '+type.Tests+' tests and '+type.Assertions+' assertions in runtime: '+type.Runtime+'ms');
				if(!type.LastError) continue;
				err=true;
				break;
			}
		}catch(ex){
			lastError=ex;
			err=true;
			if(type instanceof Tests){
				tests+=type.Tests;
				assert+=type.Assertions;
			}else{
				console.groupEnd();
			}
			console.error(ex);
			debugger;
		}finally{
			runtime=Date.now()-start;
			const msg=count+' test types, '+tests+' tests and '+assert+' assertions in total runtime: '+runtime+'ms';
			if(err){
				console.warn(msg+' (interrupted by an error)');
			}else{
				console.log(msg+' (without any error)');
			}
		}
		const ret=new TestResults(assert,tests,runtime,lastError);
		let k,
			v;
		for([k,v] of result.entries()) ret.Types.set(k,v);
		return ret;
	}
}

/**
 * Assertion error
 * 
 * @github https://github.com/nd1012/JS-TESTS
 * @license MIT
 * @copyright (c)2022 Andreas Zimmermann, wan24.de
 */
class AssertionError extends Error{
	/**
	 * Test type
	 * 
	 * @var {Tests}
	 */
	#Type=null;
	/**
	 * Test name
	 * 
	 * @var {string}
	 */
	#Test=null;
	/**
	 * Test assertion
	 * 
	 * @var {int}
	 */
	#Assertion=0;
	/**
	 * Expected value
	 * 
	 * @var {any}
	 */
	#Expected=null;
	/**
	 * Current value
	 * 
	 * @var {any}
	 */
	#Current=null;

	/**
	 * Get the test type
	 * 
	 * @return {Tests} Test type
	 */
	get Type(){return this.#Type;}

	/**
	 * Get the test name
	 * 
	 * @return {string} Name
	 */
	get Test(){return this.#Test;}

	/**
	 * Get the assertion
	 * 
	 * @return {int} Assertion
	 */
	get Assertion(){return this.#Assertion;}

	/**
	 * Get the expected value
	 * 
	 * @return {any} Expected value
	 */
	get Expected(){return this.#Expected;}

	/**
	 * Get the current value
	 * 
	 * @return {any} Current value
	 */
	get Current(){return this.#Current;}

	/**
	 * Constructor
	 * 
	 * @param {string} message Error message
	 * @param {Tests} type Test type
	 * @param {string} test Test name
	 * @param {int} assertion Assertion
	 * @param {any} expected Expected value
	 * @param {any} current Current value
	 */
	constructor(message,type,test,assertion,expected,current){
		super(message);
		this.#Type=type;
		this.#Test=test;
		this.#Assertion=assertion;
		this.#Expected=expected;
		this.#Current=current;
	}
}
