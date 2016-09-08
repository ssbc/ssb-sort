var crypto = require('crypto')
var fs = require('fs')
var path = require('path')
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
  var c = kv({okay: 3, root: a.key, branch: b.key})
  var msgs = [a,b,c]
  var rand = shuffle(msgs)

  t.deepEqual(
    sort(rand),
    msgs
  )

  t.deepEqual(sort.roots(rand), [a.key])
  t.deepEqual(sort.heads(rand), [c.key])

  t.deepEqual(sort.children(msgs, a.key).sort(), [b.key, c.key].sort(), 'children1')
  t.deepEqual(sort.children(msgs, b.key), [c.key], 'children2')
  t.deepEqual(sort.parents(msgs, b.key), [a.key], 'parents1')
  t.deepEqual(sort.parents(msgs, c.key).sort(), [b.key, a.key].sort(),  'parents2')

  t.deepEqual(sort.satisfyable(msgs, a.key, []), [b.key])
  t.deepEqual(sort.satisfyable(msgs, b.key, [a.key]), [c.key])

  t.equal(sort.isBranched(msgs), false)
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

  t.deepEqual(sort.children(msgs, a.key).sort(), [b.key, c.key].sort(), 'children1')
  t.deepEqual(sort.children(msgs, b.key), [], 'children2')
  t.deepEqual(sort.children(msgs, c.key), [], 'children2')
  t.deepEqual(sort.parents(msgs, b.key), [a.key], 'parents1')
  t.deepEqual(sort.parents(msgs, c.key), [a.key], 'parents1')

  t.equal(sort.isBranched(msgs), true)
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

  t.deepEqual(sort.children(msgs, a.key).sort(), [b.key, c.key, d.key].sort(), 'children1')
  t.deepEqual(sort.children(msgs, b.key), [d.key], 'children2')
  t.deepEqual(sort.children(msgs, c.key), [d.key], 'children2')
  t.deepEqual(sort.parents(msgs, b.key), [a.key], 'parents1')
  t.deepEqual(sort.parents(msgs, c.key), [a.key], 'parents1')
  t.deepEqual(sort.parents(msgs, d.key).sort(), [a.key, b.key, c.key].sort(), 'parents1')

  t.equal(sort.isBranched(msgs), true)
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

tape('real', function (t) {
  var thread = fs.readFileSync(path.join(__dirname, 'thread.json'), 'utf8').split('\n\n').filter(Boolean).map(JSON.parse)

  var thread2 = sort(thread.slice())
  var thread3 = thread.slice().sort(function () { return Math.random() - 0.5 })
  var h1 = sort.heads(thread)
  var r1 = sort.roots(thread)
  var h2 = sort.heads(thread2)
  var r2 = sort.roots(thread2)
  var h3 = sort.heads(thread3)
  var r3 = sort.roots(thread3)

  console.log(h3)

  t.deepEqual(h1, h2)
  t.deepEqual(h2, h3)
  t.deepEqual(h1, h3)

  t.deepEqual(r1, r2)
  t.deepEqual(r2, r3)
  t.deepEqual(r1, r3)

  var sorted = sort(thread)
  t.equal(sorted[0].key, r1[0])
  var a = []
  sort.ancestors(thread, h1[0], function (e, k) {
    a.push(k)
  })
  var b = []
  sort.ancestors(thread, h1[1], function (e, k) {
    b.push(k)
  })
  console.log(a, b)
  t.end()
})



