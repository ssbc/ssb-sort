var isMsg = require('ssb-ref').isMsg

function links (obj, each) {
  if(isMsg(obj)) return each(obj)
  if(!obj || 'object' !== typeof obj) return
  for(var k in obj)
    if(links(obj[k], each)) return true
}

function firstKey (obj) {
  for(var k in obj) return k
}

//get object representing messages in thread.
function messages (thread) {
  var counts = {}

  for(var i = 0; i < thread.length; i++) {
    var key = thread[i].key
    if(counts[key])
      throw new Error('thread has duplicate message:'+key)
    counts[key] = 1
  }

  return counts
}

function keys (thread) {
  var o = {}
  thread.forEach(function (e) {
    o[e.key] = e.value
  })
  return o
}

function isString(s) { return 'string' === typeof s }

function ancestors(thread, start, each) {
  if(Array.isArray(thread))
    thread = keys(thread)
  start = isString(start) ? start : start.key
  var seen = {}
  function traverse (key) {
    if(seen[key]) return
    var ret
    seen[key] = true
    if(each(thread[key], key)) return true
    return links(thread[key], function (link) {
      if(thread[link]) return traverse(link)
    })
  }

  return traverse(start)
}

//messages in thread that are not referenced by another message in the thread.
function heads (thread) {

  var counts = messages(thread)
  thread.forEach(function (msg) {
    links(msg.value, function (link) {
        change = true
      counts[link] = 0
    })
  })
  var ary = []
  for(var k in counts) if(counts[k] !== 0) ary.push(k)
  return ary.sort()
}

function roots (thread) {

  var counts = messages(thread)

  thread.forEach(function (msg) {
    links(msg.value, function (link) {
      if(counts[link]) counts[msg.key] = 2
    })
  })

  var ary = []
  for(var k in counts) if(counts[k] === 1) ary.push(k)
  return ary
}

function sort (thread) {
  var obj = keys(thread)

  function ancestorOf(a, b) {
    return ancestors(obj, a.key, function (_b, k) {
      return b.key === k
    })
  }

  function compare(a, b) {
    return ancestorOf(a, b) ? 1 : ancestorOf(b, a) ? -1 : 0
  }

  return thread.sort(function (a, b) {
    return (
      compare(a, b)
      //received timestamp, may not be present
      || a.timestamp - b.timestamp
      //declared timestamp, may by incorrect or a lie
      || a.value.timestamp - b.value.timestamp
      //finially, sort hashes lexiegraphically.
      || (a.key > b.key ? -1 : a.key < b.key ? 1 : 0)
    )
  })
}

exports = module.exports = sort
exports.heads = heads
exports.roots = roots
exports.ancestors = ancestors

