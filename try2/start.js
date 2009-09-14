// Overwrites require
jsio = require('jsio/jsio.js')

jsio.require("jsio.protocols.echo", {"Server": "EchoServer"});
jsio.listen(new EchoServer(), "tcp", {port: 5555});
