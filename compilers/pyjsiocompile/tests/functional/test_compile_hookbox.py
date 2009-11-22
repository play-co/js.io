import os
from subprocess import PIPE
from subprocess import Popen

from pyjsiocompile import compile

class TestGetSource(object):
    
    def setup(self):
        self.compile_args = ['tests/data/hookbox.pkg', '--vv',
                             '-e', 'node',
                             '-o', 'tests/data/hookbox.compiled.js', '-d']
        self.smoke_test_script_path = 'tests/data/exercise_hookbox.js'
    
    def teardown(self):
        if os.path.exists(self.smoke_test_script_path):
            os.remove(self.smoke_test_script_path)
    
    def test_hookbox_no_smoke_for_remote_jsio(self):
        compile.main(self.compile_args)
        hookbox_exercising_js = """
var sys = require('sys');
require.paths.push('tests/data');
require('hookbox.compiled');
"""
        smoke_test_script_file = file(self.smoke_test_script_path, 'w')
        smoke_test_script_file.write(hookbox_exercising_js)
        smoke_test_script_file.close()
        
        run_command = ['node', self.smoke_test_script_path]

        expected_result = ""
        output, error = \
            Popen(run_command, stdout=PIPE, stderr=PIPE).communicate()
        assert not error, error
        assert expected_result == output, repr(output)
    
    def test_hookbox_no_smoke_for_local_jsio(self):
        compile.main(self.compile_args + ['-j', 'tests/data/jsio'])
        hookbox_exercising_js = """
var sys = require('sys');
require.paths.push('tests/data');
require('hookbox.compiled');
"""
        smoke_test_script_file = file(self.smoke_test_script_path, 'w')
        smoke_test_script_file.write(hookbox_exercising_js)
        smoke_test_script_file.close()
        
        run_command = ['node', self.smoke_test_script_path]

        expected_result = ""
        output, error = \
            Popen(run_command, stdout=PIPE, stderr=PIPE).communicate()
        print output
        assert not error, error
        assert expected_result == output, repr(output)
    
    def test_hookbox_bad_import_raises_error(self):
        compile.main(self.compile_args)
        hookbox_exercising_js = """
require('nonexistent.js')
"""
        smoke_test_script_file = file(self.smoke_test_script_path, 'w')
        smoke_test_script_file.write(hookbox_exercising_js)
        smoke_test_script_file.close()
        
        run_command = ['node', self.smoke_test_script_path]
        
        expected_result = ""
        output, error = \
            Popen(run_command, stdout=PIPE, stderr=PIPE).communicate()
        assert error
