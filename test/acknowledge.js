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

function copy (o) {
  return mergeOver({}, o)
}

function kv (value) {
  return {key: hash(value), value: value, timestamp: Date.now()}
}

var mergeOver = Merge(function (a, b) {
  return b || a
})

var keys = Object.keys


//make changes that must be accepted by n/2 authors.

var a = kv({value: 'foo', author: 'alice', editors: {alice: true, bob: true, charles: true}})
var b = kv({value: 'bar', branch: a.key, author: 'bob'})
var c = kv({branch: b.key, author: 'charles'}) //empty edit means ack.

function isEmpty (o) {
  for(var k in o) return false
  return true
}

function clean (value) {
  var v = copy(value)
  delete v.author
  delete v.branch
  delete v.ack
  delete v.editors
  return v
}

function ack (state, item) {
  var v = clean(item)
  console.log(item.author, v)
  if(isEmpty(v) && [].concat(item.branch).length === 1) { //consider this an ack
    v = clean(state[item.branch])
    v.editors = item.editors || state[item.branch].editors
    v.ack = copy(state[item.branch].ack || {})
    v.ack[item.author] = true
  } else {
//    v = mergeOver({}, item)
    v.editors = item.editors || state[item.branch].editors
    v.ack = {}
    v.ack[item.author] = true
  }
  console.log('ack?', v)
  return v
}

function ff (item, state) {
  return true
}

function bf (item, state) {
  return keys(item.ack).length > (keys(item.editors).length/2)
}

tape('edit without ack', function (t) {
  var ed = {alice: true, bob: true, charles: true}

  //state1 has been edited, but not sufficiently acknowledged.
  var state1 = sort.reduce([a,b], ack, ff, a.key)
  t.deepEqual(state1[b.key], {value: 'bar', editors: ed, ack: {bob: true}})
  //thus, the backfilter doesn't allow it.
  t.equal(bf(state1[b.key]), false)

  //state2 has been acknowledged by charles.
  var state2 = sort.reduce([a,b,c], ack, ff, a.key)
  t.deepEqual(state2[c.key], {value: 'bar', editors: ed, ack: {bob: true, charles: true}})
  //theirfore, backfilter allows that state.
  t.equal(bf(state2[c.key]), true)


  t.end()
})

