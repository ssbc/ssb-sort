var crypto = require('crypto')
var Merge = require('deep-merge')
var sort = require('../')
var tape = require('tape')

//just fake messages for testing.
function hash (msg) {
  return '%'+crypto.createHash('sha256')
    .update(JSON.stringify(msg, null, 2))
    .digest('base64')+'.sha256'
}

function kv (value) {
  return {key: hash(value), value: value, timestamp: Date.now()}
}

function isString (s) { return 'string' === typeof s }
var isArray = Array.isArray

tape('reduce', function (t) {
  var a,b,c,d
  var FIX = 2, FEATURE = 1, BREAK = 0
  var thread = [
    a = kv({type: 'module', blob: Math.random()}),
    b = kv({type: 'module', blob: Math.random(), change: FIX, branch: a.key, root: a.key, }),
    c = kv({type: 'module', blob: Math.random(), change: FIX, branch: b.key, root: a.key}),
    d = kv({type: 'module', blob: Math.random(), change: FEATURE, branch: c.key, root: a.key})
  ]

  function reducer (state, item) {
    var def = [0,0,0]
    if(!item.branch) return def //root object.
    console.log(state, item)
    return state[item.branch].map(function (v, i) {
      return i === item.change ? v + 1 : v
    })
  }

  var expected = {}
  expected[a.key] = [0, 0, 0]
  expected[b.key] = [0, 0, 1]
  expected[c.key] = [0, 0, 2]
  expected[d.key] = [0, 1, 2]

  t.test('reduce everything', function (t) {
    var state = sort.reduce(thread, reducer)
    var x = {}; x[d.key] = expected[d.key]
    t.deepEqual(state, x)
    t.end()
  })

  t.test('reduce to state', function (t) {
    var x = {}
    x[c.key] = expected[c.key]
    t.deepEqual(sort.reduce(thread, reducer, false, c.key), x)
    t.end()
  })

  t.test('filtered reduce', function (t) {

    function isFix (e) {
      return e.change === FIX
    }
    function isFeature (e) {
      return (e.change === FEATURE) || isFix(e)
    }

    var ex = {}, feat = {}
    ex[c.key] = expected[c.key]
    feat[d.key] = expected[d.key]

    t.deepEqual(sort.reduce(thread, reducer, isFix, a.key), ex)
    t.deepEqual(sort.reduce(thread, reducer, isFeature, a.key), feat)
    t.end()
  })

})


var mergeTogether = Merge(function (a, b) {
  if(Array.isArray(a)) return a.concat([b])
  if(a === b) return a
  return [a, b]
})

var mergeOver = Merge(function (a, b) {
  return b || a
})

function copy (a) {
  return mergeOver({}, a)
}

//TODO: use diffing to merge keys, but maintain order where possible.

//okay, so there are two merge algs, one to merge branches.
//1) doesn't overwrite anything, keeps all values in arrays, if possible.
//2) if there is a difference, replaces with second value.

function merge (state, value) {
  var o = {}
  //if there is only one branch, merge is easy.
  var special = ['branch', 'root', 'author']
  function clean (o) {
    o = copy(o)
    special.forEach(function (k) { delete o[k] })
    return o
  }

  if(value.branch)
    var s = [].concat(value.branch).map(function (e) {
      return clean(state[e])
    }).reduce(mergeTogether)

  return mergeOver(s, clean(value))
}

function filter (value, state) {
  var author = value.author
  if(!value.branch) return true //root message
  return [].concat(value.branch).find(function (key) {
    return state[key].editors[author]
  })
}

tape('merge', function (t) {
  var a = kv({type: 'module', name: 'foo', author: 'alice', editors: {alice: true, bob: true}})
  var b = kv({type: 'module', name: 'bar', branch: a.key, author: 'bob'})

  var obj = sort.reduce([a, b], merge, filter)

  t.deepEqual(obj[b.key], {type: 'module', name: 'bar', editors: {alice: true, bob: true}})
  t.end()
})

tape('merge, branch', function (t) {
  var a = kv({
    type: 'module', name: 'foo', author: 'alice',
    editors: {alice: true, bob: true},
  })
  var b = kv({
    type: 'module', name: 'bar', author: 'bob',
    branch: a.key
  })
  var c = kv({
    type: 'module', name: 'Foo', author: 'alice',
    branch: a.key
  })

  var obj = sort.reduce([a,b,c], merge, filter, a.key)

  console.log(obj)
  t.equal(Object.keys(obj).length, 2)

  obj = merge(obj, {author: 'charles', branch: Object.keys(obj)})

  t.deepEqual(obj, {
    type: 'module', name: ['bar', 'Foo'],
    editors: {alice: true, bob: true}
  }, a.key)

  t.end()
})

tape('disallowed editor', function (t) {

  var a = kv({
    type: 'module', name: 'foo', author: 'alice',
    editors: {alice: true, bob: false} //sorry bob!
  })
  var b = kv({
    type: 'module', name: 'bar', author: 'bob',
    branch: a.key
  })

  //if we follow on from a.key (alice's perspective)
  //then bob is not allowed to edit.
  var obj = sort.reduce([a, b], merge, filter, a.key)
  t.deepEqual(obj[a.key], {
    type: 'module', name: 'foo', editors: {
      alice: true, bob: false
    }})

  //but bob can propose an edit,
  //and view that perspective.
  var obj = sort.reduce([a, b], merge, filter, b.key)

  t.deepEqual(obj[b.key], {
    type: 'module', name: 'bar', editors: {
      alice: true, bob: false
    }})

  //Note, that is not the same as adding himself as an editor!
  //although, doing so is just another edit!

  var c = kv({
    type: 'module', name: 'bar', author: 'bob',
    editors: {bob: true},
    branch: b.key
  })

  //need to manually traverse to c, because b isn't added yet.
  var obj = sort.reduce([a, b, c], merge, filter, c.key)

  t.deepEqual(obj[c.key], {
    type: 'module', name: 'bar', editors: {
      alice: true, bob: true
    }})

  t.end()
})

