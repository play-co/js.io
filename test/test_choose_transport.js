var mjsunit_path = process.ENV['MJSUNIT_PATH'];
var mjs = require(mjsunit_path);

require.paths.push('jsio');
require('jsio');

jsio("from jsio.csp.transports import chooseTransport");
jsio("from jsio.csp.transports import allTransports");

exports.setup = function () {
    window.location = "http://frogandtoadarefriends.com/frog.html";
    window.XMLHttpRequest.__withCredentials = true;
    window.XDomainRequest = false;
};

exports.test_preferXHR_nonlocal_xdomain_samedomain = function () {
    var csp_url = 'http://frogandtoadarefriends.com/toad.html';
    var chosenTransport = chooseTransport({'preferredTransport': 'xhr'});
    mjs.assertEquals(allTransports.xhr, chosenTransport);
};
