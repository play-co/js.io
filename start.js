include('jsio/jsio.js')


jsio.require('jsio.echo')
jsio.listenTCP(jsio.quickServer(jsio.echo.EchoProtocol), 5555);
