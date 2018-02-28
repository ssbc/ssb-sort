var isMsgRef = require('ssb-ref').isMsg

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
  // sort(thread)
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
  var obj = arrayToDict(thread)

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

function ancestors (thread, start, each) {
  if(Array.isArray(thread))
    thread = arrayToDict(thread)
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

function missingContext (thread) {
  var counts = order(thread)
  sort(thread)

  var missingContext = {}

  var depth = 1
  var subset = []
  var done = false
  while (!done) {
    subset = thread.filter(function (msg) {
      return counts[msg.key] <= depth
    })
    var subsetHeads = heads(subset)

    // if there is more than one head at this level, then there's missingContext
    if (subsetHeads.length > 1) {
      subsetHeads.forEach(function (head) {
        var thisMissingContext = subsetHeads
          .filter(function (h) { return h !== head })
          .map(function (h) {
            return thread.find(function (msg) { return msg.key === h })
          })

        missingContext[head] = (missingContext[head] || []).concat(thisMissingContext)
      })
    }

    if (subset.length === thread.length) done = true
    depth++
  }

  return missingContext
}

exports = module.exports = sort
exports.heads = heads
exports.order = order
exports.roots = roots
exports.ancestors = ancestors
exports.missingContext = missingContext


// Utils ///////////////////////////////////

function links (obj, each) {
  if(isMsgRef(obj)) return each(obj)
  if(!obj || 'object' !== typeof obj) return
  for(var k in obj)
    if(links(obj[k], each)) return true
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

function arrayToDict (thread) {
  var o = {}
  thread.forEach(function (e) {
    o[e.key] = e.value
  })
  return o
}

function isString(s) { return 'string' === typeof s }

