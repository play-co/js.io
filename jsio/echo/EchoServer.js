jsio.require('jsio.echo.EchoProtocol')


jsio.declare('jsio.echo.EchoServer', jsio.Server, function(supr) {
    this.init = function() {
	supr(this, 'init', [jsio.echo.EchoProtocol]);
    }
})

