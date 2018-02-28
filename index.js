var isMsgRef = require('ssb-ref').isMsg

function links (obj, each) {
  if(isMsgRef(obj)) return each(obj)
  if(!obj || 'object' !== typeof obj) return
  for(var k in obj)
    links(obj[k], each)
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

  var ordered = true
  while(ordered) {
    ordered = false
    thread.forEach(function (msg) {
      var max = counts[msg.key] // bigger max == causally later

      // set our max to 1 larger than any linked message with a count >= to ours
      links(msg.value, function (link) {
        if(counts[link] && counts[link] + 1 > max) max = counts[link] + 1
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

