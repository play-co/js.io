require('../../packages/jsio');
jsio.path.__default__.unshift('packages');
jsio.path.world = '.';

jsio('import net');
jsio('import logging');

//logging.getLogger('RTJPProtocol').setLevel(0);
//logging.getLogger('node.csp.server').setLevel(0);
//logging.getLogger('DelimitedProtocol').setLevel(0);
logging.getLogger('world.server').setLevel(1);

jsio("from world.server import WorldServer");
w = new WorldServer();
net.listen(w, 'csp', {port: 5555})

//jsio.listen(w, 'tcp', {port: 5556})
	
