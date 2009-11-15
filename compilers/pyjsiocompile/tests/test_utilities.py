import logging
import os

import mock

from pyjsiocompile import compile

class TestGetSource(object):
    
    def setup(self):
        self.old_urlopen = compile.urlopen
        compile.urlopen = mock.Mock()
        self.old_fileopen = compile.fileopen
        compile.fileopen = mock.Mock()
    
    def teardown(self):
        compile.urlopen = self.old_urlopen
        compile.fileopen = self.old_fileopen
    
    def test_get_http_source(self):
        jsio_root_url = 'http://js.io/svn/js.io/trunk/jsio/jsio.js'
        compile.get_source(jsio_root_url)
        assert compile.urlopen.called
        assert ((jsio_root_url,), {}) == compile.urlopen.call_args, \
               compile.urlopen.call_args
        assert not compile.fileopen.called
    
    def test_get_https_source(self):
        jsio_root_url = 'https://js.io/svn/js.io/trunk/jsio/jsio.js'
        compile.get_source(jsio_root_url)
        assert compile.urlopen.called
        assert ((jsio_root_url,), {}) == compile.urlopen.call_args, \
               compile.urlopen.call_args
        assert not compile.fileopen.called
    
    def test_get_ftp_source(self):
        jsio_root_url = 'https://js.io/svn/js.io/trunk/jsio/jsio.js'
        compile.get_source(jsio_root_url)
        assert compile.urlopen.called
        assert ((jsio_root_url,), {}) == compile.urlopen.call_args, \
               compile.urlopen.call_args
        assert not compile.fileopen.called
    
    def test_get_file_source(self):
        jsio_root_url = 'jsio/jsio.js'
        compile.get_source(jsio_root_url)
        assert compile.fileopen.called
        assert ((jsio_root_url,), {}) == compile.fileopen.call_args, \
               compile.fileopen.call_args
        assert not compile.urlopen.called
        
class TestJSMin(object):
    
    def setup(self):
        self.jsio_source = \
            open(os.path.join(os.path.dirname(__file__),
                              'data', 'jsio', 'jsio.js')).read()
    
    def test_minify(self):
        #this is a smoke test for coverage
        assert len(compile.minify(self.jsio_source)) < len(self.jsio_source), \
            (compile.minify(self.jsio_source), self.jsio_source)
    
class TestOptionParser(object):
    
    def setup(self):
        self.default_jsio_path = 'http://js.io/svn/js.io/trunk/jsio'
        
    def test_make_option_parser_defaults(self):
        parser = compile.make_option_parser()
        (options, args) = parser.parse_args([])
        
        assert self.default_jsio_path == options.jsio
        assert 'output.js' == options.output
        assert ['browser'] == options.environments, options.environments
        assert ['csp'] == options.transports, options.transports
        assert not options.verbose
        assert options.minify

    def test_verbosity_1(self):
        parser = compile.make_option_parser()
        (options, args) = parser.parse_args(['--v'])
        
        assert logging.INFO == options.verbose
    
    def test_verbosity_2(self):
        parser = compile.make_option_parser()
        (options, args) = parser.parse_args(['--vv'])
        
        assert logging.DEBUG == options.verbose
