import os

import mock

from pyjsiocompile import compile

class TestMain(object):
    
    def setup(self):
        self.jsio_path = \
            os.path.join(os.path.dirname(__file__), 'data', 'hookbox.pkg')
        self.old_compile_source = compile.compile_source
        compile.compile_source = mock.Mock()
        
    def teardown(self):
        compile.compile_source = self.old_compile_source
        
    def test_invalid_position_arguments(self):
        try:
            compile.main([])
            raise Exception("an exception should have been raised")
        except SystemExit, exc:
            assert "1" == str(exc), str(exc)
            
    def test_valid_position_arguments(self):
        compile.compile_source.return_value = "xxxx"
        compile.main([self.jsio_path])
        assert compile.compile_source.called
        
            
    def test_path_for_jsio_js(self):
        class Options(object):
            jsio = 'jsio'
        assert 'jsio/jsio.js' == compile.path_for_module('jsio',
                                                         prefix='jsio'), \
            compile.path_for_module('jsio', prefix='jsio')
    
    def test_path_for_jsio_csp_client_js(self):
        class Options(object):
            jsio = 'jsio'
        assert 'jsio/csp/client.js' == \
            compile.path_for_module('jsio.csp.client', prefix='jsio'), \
            compile.path_for_module('jsio', prefix='jsio')
    
    def test_join_module_path_jsio_csp_client_jsio(self):
        module_path = compile.joinModulePath('jsio.csp.client', 'jsio')
        assert 'jsio' == module_path, module_path
    
    def test_join_module_path_jsio_csp_client_full_path(self):
        module_path = compile.joinModulePath('jsio', 'jsio.csp.client')
        assert 'jsio.csp.client' == module_path, module_path
    
    def test_join_module_path_dots_and_external_pkg(self):
        module_path = compile.joinModulePath('jsio.csp.client', '..utf8')
        assert 'jsio.utf8' == module_path, module_path
