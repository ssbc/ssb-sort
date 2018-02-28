# ssb-sort

sort a collection of messages by their causal order.

A hash can be interpreted as a link,
(except it is _what_ link, not a _where_ link.
Like cinderella's glass slipper, a hash lets you confirm
when you have found a thing, but doesn't clue you in to
where that thing is)

An interesting thing about hashes as links, is that they
always point backwards in time. That is because you can't
know the hash of something you've seen it, or seen evidence of it.
You could make up a random hash - but then the chance that
something with that hash will actually turn up is basically impossible.

This means that hashes represent _causation_, in some sense,

## api

``` js
var sort = require('ssb-sort')
```

all functions will throw if there is a duplicate message in the input.

### `sort (set) => Array`

sort a set (array of unique messages) by causal order,
sorts first by causal order, but if two messages are concurrent,
breaks the tie by their received, then self-stated timestamps, then order by keys.

### `sort.heads (set) => Array`

returns the most recent keys in the set (furtherest down the
causation chain)

### `sort.roots (set) => Array`

returns the earliest keys in the set, since this operates
on an arbitary set of messages, there may be more than one root.
but usually you'll select a set by getting messages that point
to a particular root node, in which case this will return one key.

### `sort.missingContext (set) => Object`

returns an object where each key is the key of a message missing context, and the value stored in it is the array of messages constituting that missing context.

### sort.order (set)

returns an object where the keys are the message keys,
and values are the 'depth' of that message in the causal tree.


e.g. 1 implies a root, 4 implies 3 levels of messages above that message.

```
1:       A
        /|\
       / | \
      /  |  \
2:   B1  B2  B3
      \ /   /
3:     C   /
        \ /
4:       D
```

this method is used internally by other methods and made available for convenience

## License

MIT

