var crypto = require('crypto')
//just fake messages for testing.
function hash (msg) {
  return '%'+crypto.createHash('sha256')
    .update(JSON.stringify(msg, null, 2))
    .digest('base64')+'.sha256'
}
var sort = require('./')
var tape = require('tape')

function kv (value) {
  return {key: hash(value), value: value, timestamp: Date.now()}
}

function k (kv) {
  return kv.key
}

function shuffle (ary) {
  return ary.slice().sort(function () {
    return Math.random() - 0.5
  })
}

tape('sequental', function (t) {

  var a = kv({okay: true})
  var b = kv({okay: 2, root: a.key})
  var c = kv({okay: 2, root: a.key, branch: b.key})
  var msgs = [a,b,c]
  var rand = shuffle(msgs)

  t.deepEqual(
    sort(rand),
    msgs
  )

  t.deepEqual(sort.roots(rand), [a.key])
  t.deepEqual(sort.heads(rand), [c.key])
  t.end()
})

tape('concurrent', function (t) {
  var a = kv({okay: true})
  var b = kv({okay: 2, root: a.key})
  var c = kv({okay: 3, root: a.key})
  var msgs = [a,b,c]
  var rand = shuffle(msgs)
  t.deepEqual(sort(rand), msgs)

  t.deepEqual(sort.roots(rand), [a.key])
  t.deepEqual(sort.heads(rand).sort(), [b.key, c.key].sort())
  t.end()

})

tape('merge', function (t) {
  var a = kv({okay: true})
  var b = kv({okay: 2, root: a.key})
  var c = kv({okay: 3, root: a.key})
  var d = kv({okay: 4, root: a.key, branch: [b.key, c.key]})
  var msgs = [a,b,c,d]
  var rand = shuffle(msgs)
  t.deepEqual(sort(rand), msgs)
  t.deepEqual(sort.roots(rand), [a.key])
  t.deepEqual(sort.heads(rand), [d.key])
  t.end()

})


tape('merge', function (t) {
  var a = kv({okay: true}) //this is left out of the set.

  var b = kv({okay: 2, root: a.key})
  var c = kv({okay: 3, root: a.key})
  var d = kv({okay: 4, root: a.key, branch: [b.key, c.key]})
  var msgs = [b,c,d]
  var rand = shuffle(msgs)
  t.deepEqual(sort(rand), msgs)
  t.deepEqual(sort.roots(rand), [b.key, c.key])
  t.deepEqual(sort.heads(rand), [d.key])
  t.end()
})

