jsio = require('jsio/jsio.js')

jsio.require('simpleecho', ['EchoProtocol'])
jsio.listen(jsio.quickServer(EchoProtocol), 'csp', { port: 4321 })
