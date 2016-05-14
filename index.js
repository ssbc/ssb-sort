var isMsg = require('ssb-ref').isMsg

function links (obj, each) {
  if(isMsg(obj)) return each(obj)
  if(!obj || 'object' !== typeof obj) return
  for(var k in obj)
    links(obj[k], each)
}

function firstKey (obj) {
  for(var k in obj) return k
}

//used to initialize sort
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

function heads (thread) {

  var counts = messages(thread)
  thread.forEach(function (msg) {
    if(counts[msg.key] == 0) return
    links(msg.value, function (link) {
        change = true
      counts[link] = 0
    })
  })
  var ary = []
  for(var k in counts) if(counts[k] !== 0) ary.push(k)
  return ary
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


function order (thread) {
  var counts = messages(thread)
  //until(function () {
  var ordered = true
  while(ordered) {
    ordered = false
    thread.forEach(function (msg) {
      var max = counts[msg.key]
      links(msg.value, function (e) {
        if(counts[e] && counts[e] + 1 > max) max = counts[e] + 1
      })
      if(max > counts[msg.key]) {
        ordered = true
        counts[msg.key] = max
      }
    })
  }
  return counts
}

function sort (thread) {
  var counts = order(thread)
  return thread.sort(function (a, b) {
    return (
      counts[a.key] - counts[b.key]
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
exports.order = order
exports.roots = roots








