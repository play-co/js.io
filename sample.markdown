
<!doctype html>

<head>
<link rel="stylesheet" type="text/css" href="main.css">
</head>

<body>

<span>
<div id="wrapper" markdown="1">

js.io
=================

<h2>Table of Contents</h2>

[TOC]

<span>
<div id="content" markdown="1">

Introducing js.io
-----------------

The core of js.io is a simple module system that works in both web browsers and server-side JavaScript.  It is inspired by Python and CommonJS (as implemented in [node.js](http://nodejs.org)).  

Getting Started
---------------

<span class="comment">
If you're familiar with git, you could instead try the latest code from [github](https://www.github.com/mcarter/js.io/).
</span>

Download a js.io release and extract it into your project and copy/symlink the packages folder into your project).  

To import a module, use the function `jsio`.  This function takes 1 argument: the module identifier.  To load a module in file `util/myModule.js`, you would write `jsio('.util.myModule);`.  The '.' before `util` indicates that the file path is relative to where the current module is.  

<span class="comment">
Tip: try not to use global variables in a module.  Advanced JavaScripters will note that in js.io, `exports` is not necessarily an object.  Module authors could, for example, assign exports to a single function or class.
</span>

Inside `util/myModule.js`, define local variables and functions.  The external interface to the module is defined using the `exports` object.  The object `exports` is available immediately in the module, so you can export a function by simply writing:

    #!javascript
    exports.logHello = function() { console.log('hello'); };

After we import the module with `jsio('.util.myModule');`, we can call `foo` immediately with `util.myModule.logHello()`.

Simple Networking I/O
--------------

<span class="comment">
js.io's comet implementation conforms to the Comet Session Protocol (CSP) specification.  That specification arose from years of production use of Orbited through version 0.7.  Orbited 0.8 switched its internal network transports in favor of js.io's implementation of CSP.
</span>

Js.io ships with a robust network protocol for real-time communication between web browsers and servers.  Though other implementations of 'comet' exist, js.io is specifically designed for handling stubborn proxies, old web browsers, and cross-domain communication, ensuring the stability and connectivity in *all* environments.  (In fact, you may even want to use js.io just for the network IO, in which case you can use a pre-compiled CSP client/server package.)

Chat Client and Server
-----------

Let's build a chat client and server.  We'll use the Real Time JSON Protocol (RTJP) to abstract the network streams into events.  Rather than read and write directly to a socket, we'll send and receive frames with names and JSON payloads.  On the server side, we inherit from `RTJP` to create a class for client connections.  The `frameReceived` function is called when the client calls `client.sendFrame(frameName, args)`.

    #!javascript
    jsio('import net.interfaces');
    jsio('import net.protocols.rtjp as rtjp');
    
    // one ClientConn is created for each client that connects
    var ClientConn = Class(rtjp.RTJPProtocol, function(supr) {    
    	this.init = function(server){
    		this.server = server;
    		supr(this,'init',[]);
    	}
        this.connectionMade = function() {
            this.server.addConn(this);
        }
        this.connectionLost = function() {
            this.server.removeConn(this);
        }
        this.frameReceived = function(id, frameName, args) {
    		logger.log('recieved frame', id, frameName, args);
            switch(frameName) {
                case 'JOIN':
                    this.server.broadcast('JOIN', {name: args.name, time: +new Date()});
                    break;
                case 'MESSAGE':
                    this.server.broadcast('MESSAGE', args);
                    break;
            }
        }
    });
    
    // only one of these is created
    var Server = Class(net.interfaces.Server, function() {
        this.init = function() {
            this._conns = [];
        }
        this.buildProtocol = function() { return new ClientConn(this); }
    
        this.addConn = function(conn) { this._conns.push(conn); }
        this.removeConn = function(conn) { this._conns.filter(function(c) { return c != conn; }); }
    
        this.broadcast = function(frameName, args) {
            for (var i = 0, conn; conn = this._conns[i]; i++) {
                    conn.sendFrame(frameName, args);
            }
        }
    });

    var server = new Server().listen('csp',{host:'localhost', port: 8000});

A corresponding browser client would look very similar:

    #!javascript
    jsio('import net');
    jsio('import net.protocols.rtjp as rtjp');
    var Connection = Class(rtjp.RTJPProtocol, function() {
        this.frameReceived = function(id, frameName, args) {
            switch(frameName) {
                case 'JOIN':
                    logger.log('A chatter joined!', args.name, 'at time', args.time)
                    break
                case 'MESSAGE':
                    logger.log('Chatter says', args.name, ':', args.message)
                    break
             }
        };
        this.sendMessage = function(msg) {
            this.sendFrame('MESSAGE',{name: 'bob', message: msg});
        };
    });
    var client = new Connection();
    net.connect(client, 'csp', {url: 'http://localhost:8000'});
    
    
Modules in Depth
----------------

Each JavaScript file is a module.  To identify a module, we use the file path to the JavaScript file.  Dots (`.`) in the module identifier separate folder names and filenames.  There are two types of identifiers: absolute identifiers and relative identifiers.

Absolute identifiers are resolved to files using the js.io path.  Given a js.io path of ['jsio/', 'lib/'], the following module identifiers might resolve to the following paths.

| absolute module identifier | path |
| ----------------- | -------------- |
| `net.env` | `jsio/net/env.js` |
| `timestep.View` | `lib/timestep/View.js` |

In the example above, the identifier `net.env` was found in the `jsio/` folder.  However, `timestep.View` was not found in `jsio/`, so the module system checked `lib/` and found the import there.  (This behavior is similar to the PATH environment variable on most operating systems).  

The default path contains the location of `jsio.js`.  We can modify the path by using the `jsio.path` object:

    #!javascript
    jsio.path.get(); // -> ['jsio/']
    jsio.path.add('lib/');
    jsio.path.get(); // -> ['jsio/', 'lib/']

<span class="comment">Quiz: What path would the module identifier `.foo..bar` resolve to? <button onclick="document.getElementById('quizAnswer1').style.display='block'">answer</button><span id="quizAnswer1" style="display: none">
    `./bar.js`
</span></span>

A leading dot indicates a relative path.  Consecutive dots indicate the parent directory. 

| module identifier | path           |
| ----------------- | -------------- |
| `.ui.View`        | `./ui/View.js` |
| `.index`          | `./index.js`   |
| `..foo`           | `../foo.js`    |
| `...foo`          | `../../foo.js` |

Utility
-------

The default packages in js.io are designed for writing production-quality, enterprise-class web applications.  To aid with structuring logic in JavaScript, js.io provides several built-in functions for each module.  

### Class

JavaScript supports object-oriented inheritance and code-reuse through prototypes.  Programmers are typically familiar with the structural benefits associated with a concept of 'classes', so we bridge the gap between native JavaScript inheritance and a more common view of inheritance with classes by using a helper function, `Class`.  `Class` supports thex following syntax:

    #!javascript
    // returns class constructor with no parent
    var View = Class(viewClassDefinition);
    
    // returns class constructor that inherits from View
    var Label = Class(View, labelClassDefinition);

    // instantiate a Label
    var myLabel = new Label();

    assert(myLabel instanceof Label && myLabel instanceof View);

What are `viewClassDefinition` and `labelClassDefinition`?  These are *functions* that represent the class definitions.  For instance:

    #!javascript
    var viewClassDefinition = function() {
        this.init = function() {}
        this.show = function() {}
    }

In the example above, we've defined a class with two functions: `init` and `show`.  `init` is special -- it's called to initialize an instance object when `new View()` is called.  If you know how prototypes work in JavaScript, the `this` object in the viewClassDefinition refers to the prototype for the `View` class.

We normally don't define the class definitions in variables.  Let's look at how we might actually implement a `View` and `Label` class:

    #!javascript
    
    // first define the parent class.  it's going to
    // create a DOM node and assign it to 'this._el'.
    
    var View = Class(function() {
        
        // here we define our class methods
        
        this.init = function() { // constructor
            
            // inside a method, 'this' refers to an instance
            
            this._el = document.createElement('div');
        }
        
        this.show = function() {
            document.body.appendChild(this._el);
        }
    });
    
    // now we define a child class.  notice the
    // class definition function takes one argument
    // called supr, which provides access to the 
    // parent class when overriding methods
    
    var Label = Class(View, function(supr) { 
        this.init = function(text) {
            
            // first, call the super class init so that an element is created
            
            supr(this, 'init');
            
            // then, set the text of the element
            
            this.setText(text);
        }
        
        this.setText = function(text) {
            this._el.innerText = text;
        }
    });
    
    new Label('Hello World!').show();

</div>
</div>
</span>
