require('../../packages/PKG');
PKG.path.__default__.unshift('packages');
PKG.path.world = '.';

PKG('import jsio');
PKG('import logging');

//logging.getLogger('RTJPProtocol').setLevel(0);
//logging.getLogger('node.csp.server').setLevel(0);
//logging.getLogger('DelimitedProtocol').setLevel(0);
logging.getLogger('world.server').setLevel(1);

PKG("from world.server import WorldServer");
w = new WorldServer();
jsio.listen(w, 'csp', {port: 5555})

//jsio.listen(w, 'tcp', {port: 5556})
	
