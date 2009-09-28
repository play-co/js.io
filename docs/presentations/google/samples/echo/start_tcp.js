jsio = require('js/jsio/jsio.js')

jsio.require('simpleecho', ['EchoProtocol'])
jsio.listen(jsio.quickServer(EchoProtocol), 'tcp', { port: 4321 })
