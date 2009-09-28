if (typeof(node) != 'undefined') {
   log = function() {
     node.stdio.writeError([].join.call(arguments, " ") + '\n')
   };
} else {
  function log() {
    d= document.createElement('div')
    d.innerHTML = [].join.call(arguments, " ");
    document.body.appendChild(d);
  }
}

function time(f, i) {
    var t = function() {
      var start = new Date()
      for (var j = 0; j < i; ++j) {
          f();
      }
      var end = new Date()
      var total = end - start;
      log(f.name, '(' + i + ' iterations),', total);
    }
    if (typeof(node) == 'undefined') {
      setTimeout(t, 0);
    } else { t(); }
}


var simpleWith = function simpleWith() {
   with({x: 3}) {
   var y = x;
   }
}
simpleWith.name = "simpleWith";

(function() {
var x = 3;
simple = function simple() {
    var y = x;
}
})()

simple.name = "simple";

(function() {
var x = 3;
simpleEnclosed = (function() {
    return function simpleEnclosed() {
        var y = x;
    }
})()
})()

simpleEnclosed.name = "simpleEnclosed";

function unusedWith() {
   with({x: 3}) {
      var y = 3;
   }
}
unusedWith.name = "unusedWith";

var simpleWithEnclosed;
with({x: 3}) {
  (function() {
    simpleWithEnclosed = function simpleWithEnclosed() {
        if (typeof(x) === 'undefined') { throw new Error("Error in test"); }
        var y = x;
    }
  })();
}
simpleWithEnclosed.name = "simpleWithEnclosed";

var simpleWithEnclosedOutside;
(function() {
with({x: 3}) {
    simpleWithEnclosedOutside = function simpleWithEnclosedOutside() {
        if (typeof(x) === 'undefined') { throw new Error("Error in test"); }
        var y = x;
    }
}
})();
simpleWithEnclosedOutside.name = "simpleWithEnclosedOutside";



var simpleWithFunction;
var x = 5;
with({x: 3}) {
    function simpleWithFunction_() {
        var y = x;
        return y;
    }
    simpleWithFunction = simpleWithFunction_;
}
simpleWithFunction.name = "simpleWithFunction";

function noopWith() {
   with({}) {
   }
}
noopWith.name = "noopWith";

function noop() {

}
noop.name = "noop";
var enclosedNoop = (function() {
    return function enclosedNoop() {

    }
})()
enclosedNoop.name = "enclosedNoop";

var withEnclosedNoop;
with({}) {
  (function() {
    withEnclosedNoop = function withEnclosedNoop() {
    }
  })();
}
withEnclosedNoop.name = "withEnclosedNoop";


function simpleWithInnerLooped() {
   with({x: 3}) {
     for (var i = 0; i < 10; ++i) {
        var y = x;
     }
   }
}
simpleWithInnerLooped.name = "simpleWithInnerLooped";

function simpleWithOuterLooped() {
   for (var i = 0; i < 10; ++i) {
     with({x: 3}) {
        var y = x;
     }
   }
}
simpleWithOuterLooped.name = "simpleWithOuterLooped";

var simpleWithEnclosedInnerLooped;
with({x: 3}) {
  (function() {
    simpleWithEnclosedInnerLooped = function simpleWithEnclosedInnerLooped() {
      for (var i = 0; i < 10; ++i) {
        var y = x;
      }
  }
  })();
};
simpleWithEnclosedInnerLooped.name = "simpleWithEnclosedInnerLooped";


function runTests(iterations) {
  if (!!iterations) { iterations = 100000 }
  if (simpleWithFunction() !== 3) {
    log('simpleWithFunction returns INCORRECT value');
  }
  else {
    log('simpleWithFunction returns correct value')
  }

  time(simple, iterations);
  time(simpleWith, iterations);
  time(simpleEnclosed, iterations);
  time(simpleWithEnclosed, iterations);
  time(simpleWithEnclosedOutside, iterations);

  time(simpleWithFunction, iterations);
  time(simpleWithEnclosedInnerLooped, iterations);
  time(simpleWithInnerLooped, iterations);
  time(simpleWithOuterLooped, iterations);
  time(unusedWith, iterations);
  time(noop, iterations);
  time(noopWith, iterations);
  time(enclosedNoop, iterations);
  time(withEnclosedNoop, iterations);
/*  time(simpleWithInnerLooped, 10);
  time(simpleWithInnerLooped, 100);
  time(simpleWithInnerLooped, 1000);
  time(simpleWithInnerLooped, 10000);
  time(simpleWithInnerLooped, 100000);
  time(simpleWithInnerLooped, 200000);
  time(simpleWithInnerLooped, 400000);
  time(simpleWithOuterLooped, 10);
  time(simpleWithOuterLooped, 100);
  time(simpleWithOuterLooped, 1000);
  time(simpleWithOuterLooped, 10000);
  time(simpleWithOuterLooped, 100000);
*/
}
onload = runTests;
if (typeof(node) != 'undefined') { runTests(1000000); }
