include('jsio/jsio.js')

jsio.require('jsio.echo')
jsio.listen(jsio.quickServer(jsio.echo.EchoProtocol), 'tcp', {port: 5555});

