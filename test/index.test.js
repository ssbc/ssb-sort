var tape = require('tape')
var sort = require('../')
var kv = require('./fakeMsg')
var shuffle = require('./shuffle')

tape('sequential', function (t) {
  var a = kv({okay: true})
  var b = kv({okay: 2, root: a.key})
  var c = kv({okay: 3, root: a.key, branch: b.key})
  var msgs = [a, b, c]
  var rand = shuffle(msgs)

  t.deepEqual(sort(rand), msgs, 'correct sort')
  t.deepEqual(sort.roots(rand), [a.key], 'correct roots')
  t.deepEqual(sort.heads(rand), [c.key], 'correct heads')
  t.deepEqual(sort.missingContext(rand), {}, 'correct missingContext')
  t.end()
})

tape('concurrent', function (t) {
  var a = kv({okay: true})
  var b = kv({okay: 2, root: a.key})
  var c = kv({okay: 3, root: a.key})
  var msgs = [a, b, c]
  var rand = shuffle(msgs)

  t.deepEqual(sort(rand), msgs, 'correct sort')
  t.deepEqual(sort.roots(rand), [a.key], 'correct roots')
  t.deepEqual(sort.heads(rand).sort(), [b.key, c.key].sort(), 'correct heads')
  t.deepEqual(
    sort.missingContext(rand),
    { [b.key]: [c], [c.key]: [b] },
    'correct missingContext'
  )
  t.end()
})

tape('merge', function (t) {
  var a = kv({okay: true})
  var b = kv({okay: 2, root: a.key})
  var c = kv({okay: 3, root: a.key})
  var d = kv({okay: 4, root: a.key, branch: [b.key, c.key]})
  var msgs = [a, b, c, d]
  var rand = shuffle(msgs)

  t.deepEqual(sort(rand), msgs, 'correct sort')
  t.deepEqual(sort.roots(rand), [a.key], 'correct roots')
  t.deepEqual(sort.heads(rand), [d.key], 'correct heads')
  t.deepEqual(
    sort.missingContext(rand),
    { [b.key]: [c], [c.key]: [b] },
    'correct missingContext'
  )
  t.end()
})

tape('merge - missing ultimate root', function (t) {
  var a = kv({okay: true}) // this is left out of the set.

  var b = kv({okay: 2, root: a.key})
  var c = kv({okay: 3, root: a.key})
  var d = kv({okay: 4, root: a.key, branch: [b.key, c.key]})
  var msgs = [b, c, d]
  var rand = shuffle(msgs)

  t.deepEqual(sort(rand), msgs, 'correct sort')
  t.deepEqual(sort.roots(rand), [b.key, c.key], 'correct roots')
  t.deepEqual(sort.heads(rand), [d.key], 'correct heads')
  t.deepEqual(
    sort.missingContext(rand),
    { [b.key]: [c], [c.key]: [b] },
    'correct missingContext'
  )
  t.end()
})
