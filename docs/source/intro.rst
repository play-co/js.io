============
Introduction
============

Overview
========

js.io
=====

Realtime i/o, in javascript, anywhere
-------------------------------------

A simple chat server has multiple connections, each of which uses frameReceived and sendFrame to communicate with a browser

.. sourcecode:: javascript

	// Connection.js
	this.frameReceived = function(id, frameName, args) {
	    var server = this.server
	    switch(frameName) {
	        case 'join':
	            server.broadcast('join', { name: args.name, time: +new Date()) })
	            break
	        case 'message':
	            server.broadcast('message', args)
	            break
	    }
	}

	// Server.js
	this.broadcast = function(frameName, args) {
	    for (var i=0, conn; conn = this.connections[i]; i++) {
	        conn.sendFrame(frameName, args)
	    }
	}

A simple browser chat client has a single connection which communicates with the server

.. sourcecode:: javascript

	this.frameReceived = function(id, frameName, args) {
	    switch(frameName) {
	        case 'join':
	            logger.log('A chatter joined!', args.name, 'at time', args.time)
	            break
	        case 'message':
	            logger.log('Chatter says', args.name, ':', args.message)
	            break
	}

	this.sendMessage = function() {
	    var message = document.getElementById('input').value
	    this.sendFrame({ name: this.username, message: message })
	}

Any application with network access requires two things: a network transport and a network protocol. The network transport is the means by which an application communicates with the network. The network protocol defines how the application communications with the network. 

Common examples of transports are sockets, XMLHttpRequest's and postcards. Common examples of protocols are tcp, http, and Algebraic chess notation (for postcard chess).

Jsio abstracts out the transport and protocol for applications with bidirectional network communication, such that you can write your server/client architecture independent of the network transport and network protocol. Once you have written your server and client logic (both in javascript), you can deploy that server and client code in any number of environments. Most commonly, you will run your server code on your server, and your client code in a browser. But you can also run your client code on the server. You can even run your server code in the browser, and debug it with firebug!




Common Use Cases
================

TODO

 
Installation
============

TODO

Github
======

The development version of js.io is located on github:

* http://github.com/mcarter/js.io

You can get a copy of the latest source by cloning the repository:

.. sourcecode:: none

    # git clone git://github.com/mcarter/js.io.git
