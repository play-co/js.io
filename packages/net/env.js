jsio('from base import *');
jsio('import logging'); 
var logger = logging.getLogger('net.env');

function getObj(objectName, transportName, envName) {
	
	logger.info('from .env.' + (envName || jsio.__env.name) + '.' + transportName + ' import ' + objectName + ' as result');
	jsio('from .env.' + (envName || jsio.__env.name) + '.' + transportName + ' import ' + objectName + ' as result');
	return result;
}

exports.getListener = bind(this, getObj, 'Listener');
exports.getConnector = bind(this, getObj, 'Connector');
