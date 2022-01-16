# JS-LINQ (**ALPHA** release!)

A lightweight LINQ-like implementation for JavaScript.

**NOTE**: _Since this is an early alpha release (just a proof of concept), it may not work as expected, contain bugs, and the API may change in future releases!_

This implementation is the `LinqArray` class, which inherits from `Array`. So in fact you'll be working with an extended JavaScript `Array`, having all the standard array functions available, too.

**NOTE**: JS-LINQ doesn't touch the JavaScript `Array` prototype - it's an ES6 class that inherits the `Array` type!

I tried to implement all basic LINQ functionality, and added some additional functionality, too:

- `Union*` can modify in place
- `OrderBy*` can modify in place
- `GetWhenNot` works similar to `SkipWhile`, but yields items directly instead of a new lazy `LinqArray`
- `GetWhile` works similar to `TakeWhile`, but yields items directly instead of a new lazy `LinqArray`
- `AppendAll` works as `Append`, but allows to give an array of items to append (it'll work like `Concat`)
- `Apped*This` modifies in place
- `PrependAll` works as `Prepend`, but allows to give an array of items to prepend
- `Prepend*This` modifies in place
- `ConcatAll` allows to give an array of arrays to concat
- `Concat*This` modifies in place
- `Reverse` can modify in place
- `SequenceEqual` optional compares the type (be strict)
- `Execute` executes an action for each item, processes lazy and yields the return values (for use with `for` f.e.)
- `ExecuteAsync` executes an asynchronous action for each item, processes lazy and yields the return values (for use with `for await` f.e.)
- `ForEach` executes an action for each item (optional lazy in a new instance) (the return value may break the loop)
- `ToLinqArray` generates a lazy copy of the LINQ array contents (or optional a subset)
- `ToArray` can optional create a subset
- `Generate` allows you to use your own lazy item generator function
- `EnsureGenerated` ensures all items are generated
- `Finalize` works similar as `EnsureGenerated`, but will work with disabled storing, too
- `Clear` clears the instance to the initial state (without any data)
- `DisableStore` disable storing generated items in the array buffer (if it needs to iterate only once)
- static `ExtendArray` extends the `Array` prototype by a `ToLinqArray` method
- static `From` generates a new instance from an array or a LINQ array

Some methods will have slightly different parameters (and parameter order) or they won't work exactly as the implementation of .NET. This is because JavaScript != .NET, and my goal was to create a lightweight LINQ-like implementation only, but not a 1:1 copy of the original. Anyway, all properties and each method, their parameters and return values are documented using common DocComment-blocks above them, so your IDE's context help should be able to support you while typing.

I hope you enjoy it as I do!

## Usage

### Simple usage

JS-LINQ comes with these files:

1. `linq.js` and `linq.min.js`: The core library
1. `linqext.js` and `linqext.min.js`: The optional extension library

You simply need to load the `linq.js` or `linq.min.js` (and the extension library, if you want to use it) using a script tag, or `importScripts`, or `import` etc., then you can do things like this:

```js
let data=[1,3,2];

console.log(From(data).OrderBy().ToArray());// [1,2,3]
console.log(From(data).Where(i=>i>1).ToArray());// [2,3]
console.log(From(data).Select(i=>i*2).ToArray());// [2,4,6]

data=[
	{
		name:'Tim Miller',
		age:26
	},
	{
		name:'Jim Bold',
		age:32
	},
	{
		name:'Lilly Jones',
		age:30
	}
];

console.log(From(data).OrderBy('age').Select('name').ToArray());// ['Tim Miller','Lilly Jones','Jim Bold']
console.log(From(data).Where(i=>i.age>30).Select('name').ToArray());// ['Jim Bold']
console.log(From(data).Select(i=>i.name).ToArray());// ['Tim Miller','Jim Bold','Lilly Jones']
```

The global `From` function is a shorthand for `LinqArray.From(data)` (unless a global `From` was defined before) or `new LinqArray(...data)` or `data.ToLinqArray()` (in case you called `LinqArray.ExtendArray()` before).

Methods like `OrderBy` and `Select` accept an item property name or a callable (function/lambda) as parameter. Every method is documented with DocComment-blocks, so you'll be comfortable with an IDE that has support for that kind of context help, if you want to know which parameters accept which value types for which use cases.

When any method returns a list of results, the list is a new `LinqArray` instance (unless you use the `inPlace` parameter, or the method processes in place per default), too. Even some inherited array methods will return a `LinqArray` instance. You can use the `ToArray` method to convert it to a vanilla `Array` object.

**NOTE**: Please note that the `LinqArray` constructor doesn't support giving the size of the array as single parameter. You can only give an optional initial array.

You may extend the `LinqArray` class as you require, hope it's prepared well for that.

### Understanding how it works

All inherited array object methods, properties and indexed array access are available, but they may not work as you expect: `LinqArray` uses generator functions to create results on demand (lazy).

Unless all resulting items have been generated, the `length` property for example may not return the correct final number of items, but the number of currently generated items. If you need the correct final number of items, use the `Count` method instead (which may also return the estimated count without enumerating). Or you can try getting the estimated final number of items by using the `TryGetNonEnumeratedCount` method, which will return `null` in case it's not possible to estimate the value.

Acessing items using the array index accessor `obj[n]` may not work as expected, if the generator didn't finish processing yet. Use the `EnsureGenerated` method to finalize the item generator first, before you use the array index accessor (or use the `ElementAt*` methods instead). Example:

```js
const linqArray=From([1,2,3]);
console.log(linqArray.length);// 0, because no item was generated yet
console.log(linqArray.First());// 1, one item was generated
console.log(linqArray.length);// 1, because one item was generated so far
console.log(linqArray[0]);// 1, the only one generated item
console.log(linqArray[1]);// undefined, because no second item was generated yet
linqArray.EnsureGenerated();// Will generate all pending items
console.log(linqArray.length);// 3, because all items are generated now
console.log(linqArray[1]);// 2
console.log(linqArray[2]);// 3
```

Explaination: The array that you give to the constructor will be fed item by item trough a generator function to the LINQ array object, as the items are required. After constructing the instance, no item was processed yet. The `First` method will process exactly one item, which will be available at index `0` of the LINQ array object. But index `1` still returns `undefined`, because the second item wasn't processed by the generator yet. `EnsureGenerated` will force the generator to process all pending items.

Once you've used a method that forced to iterate trough all items, you can be sure that all items have been generated. The inherited array object methods like `sort`, `map`, `filter` etc. will iterate trough all items, for example. Please refer to the [JavaScript `Array` reference](https://developer.mozilla.org/de/docs/Web/JavaScript/Reference/Global_Objects/Array) for details about that.

**WARNING**: Unless you know exactly how each inherited array method/property works, I suggest you to use only the LINQ array specific methods and properties to avoid unexpected behavior: Some of inherited array methods will enumerate all items, some won't (and work only with the items that were generated so far).

You may wonder why the LINQ array works like this - let me give you another example for a better understanding: Imagine you have a large array with maybe 1000 object references, and you want to apply a filter on those objects and return only the first 10 results:

```js
const largeArray=[...];// 1000 objects
console.log(From(largeArray).Where(i=>i.amount>150).ToArray(10));// [...] 10 objects that match the condition
```

1. You construct a LINQ array from your large source array using `From` (this instance won't reference any source item yet)
1. You initialize a filter using the `Where` method, which returns a new LINQ array instance (this instance won't reference any source item yet)
1. You create a vanilla JavaScript array with 10 items using the `ToArray` method, which finally requires the query to be executed: The first instance from the `From` method may need to process 150 items (f.e.) to the instance from the `Where` method, unless a temporary instance from within the `ToArray` method collected exactly the 10 requested items, which will be referenced into the final JavaScript array.

The whole processing results in several (LINQ) arrays with a different amount of referenced items from the source array:

1. The LINQ array from the `From` method contains 150 items
1. The LINQ array from the `Where` method contains 150 items
1. (The temporary LINQ array from the `ToArray` method contains 10 items)
1. The JavaScript array from the `ToArray` method contains 10 items

In this example the created LINQ arrays are ready to be garbage collected as soon as the `ToArray` method returned, because no references to those instances exist anymore.

### How to work with generators

#### Benefit from lazy execution

When you create a LINQ array with initial data, this data will usually be consumed trough a generator function (for lazy execution):

```js
const linqArray=From(data);
```

Later you could replace the stored data using the `SetData` or `SetAllData` methods, which will again consume the data trough a generator function:

```js
linqArray.SetAllData(newDataArray);
```

You could also use a custom generator to initialize the LINQ array instance:

```js
linqArray.Generate(function*(){
	// Yield items here
}(),optionalEstimatedLength);
```

If you extend the LINQ array class with a custom method, you may want to return a generated LINQ array instance:

```js
return this._CreateGenerated(function*(){
	// Yield items here
}(),optionalEstimatedLength);
```

`_CreateGenerated` will create an instance of your custom type, if you didn't extend the `LinqArray` prototype (same for the interited static methods that will return an instance).

#### Disable array buffering

Disabling the array buffer won't create array copies, but it will also disable many LINQ methods that require an array buffer. If you know, that you only use LINQ methods which don't require an array buffer, you can work with on-the-fly-generators only. For example:

```js
const result=From(persons).Where(person=>person.age>18).ToArray();
```

The `Where` and `ToArray` methods don't require array buffering, so it'd be safe to disable it:

```js
const result=From(persons).DisableStore(true).Where(person=>person.age>18).ToArray();
```

The `DisableStore` method will disable the array buffer for a running LINQ array instance, and the parameter `true` has the effect, that (in theory) every instance, that is going to be created from that instance, won't use array buffering, too.

The constructor and static methods support defining the buffering behavior, too:

```js
const result=From(persons,false,true).Where(person=>person.age>18).ToArray();
```

`false` tells the constructor to disable buffering, `true` enables passing that behavior to new instances that were created from that instance.

Buffering can't be disabled when:

- It is disabled already (check with the `Store` property)
- The buffer isn't empty (check with the `length` property)

To identify LINQ methods that require array buffering, have a look into the source code, and pay attention to these method calls:

- `EnsureGenerated`
- `Finalize`
- `LinqArray.Helper.GetArrayLength`
- `LinqArray.Helper.EnsureFinalArray`

These method calls are indicators that array buffering is required for executing a method. If you disabled the array buffer, but any method requires it to be enabled, you'll see an error telling "_Storing was disabled_" in the console.

**NOTE**: Iterating a LINQ array with a disabled array buffer works only once! A generator/iterator won't be restarted.

## Useful LINQ extensions

Feel free to load `linqext.js` or `linqext.min.js` for some more hopefully helpful LINQ methods in the `LinqArrayExt` type:

- `InnerJoin`
- `LeftJoin`
- `RightJoin`
- `FullJoin`
- `CrossJoin`
- `Partition` helps creating partition tables
- `Pivot` helps creating pivot tables
- `MovingAverage` calculates the moving average
- `MovingAverages` yields moving average values
- `TakeEvery` yields a stepped subset
- `TakeRandom` returns one random item
- `FallbackIfEmpty` returns a fallback array, if the instance is empty
- `Shuffle` shuffles the whole array (optional in place)
- `Doubles` finds items that are included more than once (and returns them grouped)
- `Replace` replaces an item with another item
- static `FromCsv` parses a CSV data source

The global `From` method will return a `LinqArrayExt` instead of a `LinqArray`.

## More information

These are the main resources for more details about LINQ and my JavaScript implementation:

1. [Microsoft .NET API reference](https://docs.microsoft.com/de-de/dotnet/api/system.linq.enumerable.aggregate) for general information about the basic LINQ features
1. The DocComment-blocks in the [source code](src/linq.js) (and [the extensions source code](src/linqext.js)) that you can find on top of each variable, property and method
1. [The JS-LINQ source code](src/linq.js) (and [the extensions source code](src/linqext.js)) in detail

To try JS-LINQ online, please visit the [online demonstration](https://nd1012.github.io/JS-LINQ/index.html).

## Known issues

### Direct modification breaks lazy child-LINQ arrays

Any direct modification to the source or the LINQ array may break running lazy generators. To avoid that, you should call `EnsureGenerated` on the LINQ array to ensure that modifications are possible. However, any direct modification to a LINQ array instance after a method returned a new lazy LINQ array instance may break the results of those created instances (and their child-instances recursively)! In .NET you can't modify an enumerable for that reason, and every modifying method (`Append`, `Concat`, `OrderBy` etc.) will produce a new enumerable. The LINQ array allows direct (in place) modifications, but you should be sure to understand what you're doing (and what you should better avoid to do...).

### Random errors from insane values

The LINQ array won't sanitize any value before processing it - you're responsible for sane values, otherwise you'll suffer from random errors during (lazy) execution. For example, if you filter an array of objects using a key that doesn't exist in some items, you'll see the errors in the console. But since the LINQ array doesn't validate anything, it may become hard to debug that without knowing the index of the item that lead to an error. My goal was to keep the code lightweight, that's why any debug output is missing - however, if you need to debug something like that, try to work with `console.log` and `debugger` (or set breakpoints).
