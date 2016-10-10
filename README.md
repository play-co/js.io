# js.io

js.io is a multi-platform package management and module system for JavaScript. js.io
modules can be evaluated in a JavaScript runtime (e.g. node.js) or
precompiled into a single package for use on the client side.

js.io provides the following:

A module system.
Dependency graph that works in the client and the browser.
Support and networking libraries that can be used on either platform.

class structure and inheritance example for jsio
<pre>
var Vehicle = Class(function () {
    this.init = function (wheels) {
        this.wheels = wheels;
    };
});

var Truck = Class(Vehicle, function (supr) {
    
    this.init = function (hp, wheels) {
        supr(this, "init", [wheels]);
        this.horsepower = hp;
    };
    
    this.printInfo = function () {
        console.log('I am a truck and I have ' + this.wheels +
                ' wheels and ' + this.horsepower + ' hp.');
    };
});

var t = new Truck(350, 4);
t.printInfo();
</pre>

run the js.io repl:

    $ jsio

or run a js.io-flavored script:

    $ jsio file.js	

or the js.io compiler:

    $ jsio-compile
