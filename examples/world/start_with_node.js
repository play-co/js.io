jsio = require('jsio/jsio.js')
jsio("import jsio.logging");

jsio.logging.getLogger('RTJPProtocol').setLevel(0);
jsio.logging.getLogger('world.server').setLevel(1);
//jsio.logging.getLogger('DelimitedProtocol').setLevel(0);

jsio("from world.server import WorldServer");
w = new WorldServer();
jsio.listen(w, 'csp', {port: 5555})

//jsio.listen(w, 'tcp', {port: 5556})
