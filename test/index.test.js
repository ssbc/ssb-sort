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

  t.deepEqual(sort.roots(rand), [a.key], 'correct roots')
  t.deepEqual(sort.heads(rand), [c.key], 'correct heads')
  t.deepEqual(sort.missingContext(rand), {}, 'correct missingContext')
  t.deepEqual(sort(rand), msgs, 'correct sort')
  t.end()
})

tape('concurrent', function (t) {
  var a = kv({okay: true})
  var b = kv({okay: 2, root: a.key})
  var c = kv({okay: 3, root: a.key})
  var msgs = [a, b, c]
  var rand = shuffle(msgs)

  t.deepEqual(sort.roots(rand), [a.key], 'correct roots')
  t.deepEqual(sort.heads(rand).sort(), [b.key, c.key].sort(), 'correct heads')
  t.deepEqual(
    sort.missingContext(rand),
    { [b.key]: [c], [c.key]: [b] },
    'correct missingContext'
  )
  // NOTE - sort must go last as it's a mutating function
  t.deepEqual(sort(rand), msgs, 'correct sort')
  t.end()
})

tape('merge', function (t) {
  var a = kv({okay: true})
  var b = kv({okay: 2, root: a.key})
  var c = kv({okay: 3, root: a.key})
  var d = kv({okay: 4, root: a.key, branch: [b.key, c.key]})
  var msgs = [a, b, c, d]
  var rand = shuffle(msgs)

  t.deepEqual(sort.roots(rand), [a.key], 'correct roots')
  t.deepEqual(sort.heads(rand), [d.key], 'correct heads')
  t.deepEqual(
    sort.missingContext(rand),
    { [b.key]: [c], [c.key]: [b] },
    'correct missingContext'
  )
  t.deepEqual(sort(rand), msgs, 'correct sort')
  t.end()
})

tape('merge - missing ultimate root', function (t) {
  var a = kv({okay: true}) // this is left out of the set.

  var b = kv({okay: 2, root: a.key})
  var c = kv({okay: 3, root: a.key})
  var d = kv({okay: 4, root: a.key, branch: [b.key, c.key]})
  var msgs = [b, c, d]
  var rand = shuffle(msgs)

  t.deepEqual(sort.roots(rand), [b.key, c.key], 'correct roots')
  t.deepEqual(sort.heads(rand), [d.key], 'correct heads')
  t.deepEqual(
    sort.missingContext(rand),
    { [b.key]: [c], [c.key]: [b] },
    'correct missingContext'
  )
  t.deepEqual(sort(rand), msgs, 'correct sort')
  t.end()
})

tape('multiple merge', function (t) {
  // This case from the README :
  //
  // 1:       A
  //         /|\
  //        / | \
  //       /  |  \
  // 2:   B1  B2  B3
  //       \ /   /
  // 3:     C   /
  //         \ /
  // 4:       D
  var a = kv({okay: true, name: 'a'})
  var b1 = kv({okay: 2, name: 'b1', root: a.key})
  var b2 = kv({okay: 2, name: 'b2', root: a.key})
  var b3 = kv({okay: 2, name: 'b3', root: a.key})
  var c = kv({okay: 3, name: 'c', branch: [b1.key, b2.key], root: a.key})
  var d = kv({okay: 4, name: 'd', branch: [c.key, b3.key], root: a.key})

  var msgs = [a, b1, b2, b3, c, d]
  var rand = shuffle(msgs)

  t.deepEqual(sort.roots(rand), [a.key], 'correct roots')
  t.deepEqual(sort.heads(rand), [d.key], 'correct heads')
  t.deepEqual(
    sortVals(sort.missingContext(rand)),
    {
      [b1.key]: [b2, b3],
      [b2.key]: [b1, b3],
      [b3.key]: [b1, b2, c],
      [c.key]: [b3]
    },
    'correct missingContext'
  )
  t.deepEqual(sort(rand), msgs, 'correct sort')

  function sortVals (obj) {
    Object.keys(obj).forEach(k => {
      obj[k] = obj[k].sort((a, b) => a.value.timestamp - b.value.timestamp)
    })
    return obj
  }

  // function vals(obj) {
  //   Object.keys(obj).forEach(k => obj[k] = obj[k].map(m=> m.value.content.name))
  //   return obj
  // }

  t.end()
})
