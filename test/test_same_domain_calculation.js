require('jsio/jsio');
jsio("import jsio.std.uri as uri");

exports.test_same_url_is_same_domain = function () {
    assertTrue(!!uri.isSameDomain('http://google.com/', 'http://google.com/'));
};

exports.test_indefined_is_not_same_domain = function () {
    assertFalse(uri.isSameDomain('http://google.com/', uri.frog));
};

