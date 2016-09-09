var crypto = require('crypto')
//just fake messages for testing.
function hash (msg) {
  return '%'+crypto.createHash('sha256')
    .update(JSON.stringify(msg, null, 2))
    .digest('base64')+'.sha256'
}

var sort = require('../')
var tape = require('tape')

function kv (value) {
  return {key: hash(value), value: value, timestamp: Date.now()}
}

function isString (s) { return 'string' === typeof s }
var isArray = Array.isArray

var Merge = require('deep-merge')

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

function merge(a, b, path) {
  if(b === undefined) return a
  if(isArray(a)) return a.concat(b)

  if(isArray(b))
    if(a !== undefined) return a
}

function merge (state, value, special) {
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
  console.log('FILTER', value)
  if(!value.branch) return true //root message
  return (isArray(value.branch) ? value.branch : [value.branch]).find(function (key) {
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

