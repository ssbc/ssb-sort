

var tape = require('tape')

var Merge = require('deep-merge')

var merge = Merge(function (a, b) {
  if(Array.isArray(a)) return a.concat([b])
  if(a === b) return a
  return [a, b]
})

var merge2 = Merge(function (a, b) {
  return b || a
})


tape('merge into arrays', function (t) {
  t.deepEqual(merge(1, 2), [1,2])

  t.deepEqual([1,2,3].reduce(merge), [1,2,3])
  t.deepEqual([1,1,1].reduce(merge), 1)

  t.deepEqual([{a: 1}, {a: 2}].reduce(merge), {a: [1,2]})
  t.deepEqual([true, {a: 2}].reduce(merge), [true, {a: 2}])
  t.end()

})




