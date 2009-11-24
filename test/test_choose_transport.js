require('jsio/jsio');
jsio("from jsio.csp.transports import chooseTransport");
jsio("from jsio.csp.transports import allTransports");

exports.setup = function () {
    window.location = "http://frogandtoadarefriends.com/frog.html";
    window.XDomainRequest = false;
};

exports.teardown = function () {
    delete window.XMLHttpRequest['withCredentials'];
};

exports.test_preferXHR_nonlocal_xdomain_samedomain = function () {
    window.XMLHttpRequest.withCredentials = true;
    var csp_url = 'http://frogandtoadarefriends.com/toad.html';
    var chosenTransport = chooseTransport(csp_url,
					  {'preferredTransport': 'xhr'});
    assertEquals(allTransports.xhr, chosenTransport);
};
exports.test_preferXHR_local = function () {
    window.XMLHttpRequest.withCredentials = true;
    var csp_url = 'file://frogandtoadarefriends/toad.html';
    var chosenTransport = chooseTransport(csp_url,
					  {'preferredTransport': 'xhr'});
    assertEquals(allTransports.jsonp, chosenTransport);
};
exports.test_preferXHR_nonlocal_nonxdomain_nonsamedomain = function () {
    var csp_url = 'http://frogandtoadarestillfriends.com/toad.html';
    var chosenTransport = chooseTransport(csp_url,
					  {'preferredTransport': 'xhr'});
    assertEquals(allTransports.jsonp, chosenTransport);
};
exports.test_preferXHR_nonlocal_xdomain_nonsamedomain = function () {
    window.XMLHttpRequest.withCredentials = true;
    var csp_url = 'http://frogandtoadarestillfriends.com/toad.html';
    var chosenTransport = chooseTransport(csp_url,
					  {'preferredTransport': 'xhr'});
    assertEquals(allTransports.xhr, chosenTransport);
};
exports.test_preferXHR_nonlocal_nonxdomain_samedomain = function () {
    var csp_url = 'http://frogandtoadarefriends.com/toad.html';
    var chosenTransport = chooseTransport(csp_url,
					  {'preferredTransport': 'xhr'});
    assertEquals(allTransports.xhr, chosenTransport);
};
exports.test_preferXHR_nonlocal_xdomain_samedomain = function () {
    window.XMLHttpRequest.withCredentials = true;
    var csp_url = 'http://frogandtoadarefriends.com/toad.html';
    var chosenTransport = chooseTransport(csp_url,
					  {'preferredTransport': 'xhr'});
    assertEquals(allTransports.xhr, chosenTransport);
};

exports.test_preferJSONP_nonlocal_xdomain_samedomain = function () {
    window.XMLHttpRequest.withCredentials = true;
    var csp_url = 'http://frogandtoadarefriends.com/toad.html';
    var chosenTransport = chooseTransport(csp_url,
					  {'preferredTransport': 'jsonp'});
    assertEquals(allTransports.jsonp, chosenTransport);
};
exports.test_preferJSONP_local = function () {
    window.XMLHttpRequest.withCredentials = true;
    var csp_url = 'file://frogandtoadarefriends/toad.html';
    var chosenTransport = chooseTransport(csp_url,
					  {'preferredTransport': 'jsonp'});
    assertEquals(allTransports.jsonp, chosenTransport);
};
exports.test_preferJSONP_nonlocal_nonxdomain_nonsamedomain = function () {
    var csp_url = 'http://frogandtoadarestillfriends.com/toad.html';
    var chosenTransport = chooseTransport(csp_url,
					  {'preferredTransport': 'jsonp'});
    assertEquals(allTransports.jsonp, chosenTransport);
};
exports.test_preferJSONP_nonlocal_xdomain_nonsamedomain = function () {
    window.XMLHttpRequest.withCredentials = true;
    var csp_url = 'http://frogandtoadarestillfriends.com/toad.html';
    var chosenTransport = chooseTransport(csp_url,
					  {'preferredTransport': 'jsonp'});
    assertEquals(allTransports.jsonp, chosenTransport);
};
exports.test_preferJSONP_nonlocal_nonxdomain_samedomain = function () {
    var csp_url = 'http://frogandtoadarefriends.com/toad.html';
    var chosenTransport = chooseTransport(csp_url,
					  {'preferredTransport': 'jsonp'});
    assertEquals(allTransports.jsonp, chosenTransport);
};
