base.require('foo.woot')
base.require('foo.bar')

console.log('(should be 1) foo.woot.j=', foo.woot.j);
console.log('(should be 3) foo.woot.z=', foo.bar.z);

