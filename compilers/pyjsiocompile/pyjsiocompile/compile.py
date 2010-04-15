import logging
import os
import sys
import re
from urllib2 import urlopen
import warnings
fileopen = open

# we need os.path.relpath, which isn't in python<2.6
try:
    os.path.relpath
except:
    # this function is taken directly from posixpath.py in 2.6
    # os.path added to abspath, commonprefix, curdir, pardir, sep, join
    def _relpath(path, start=os.path.curdir):
        """Return a relative version of a path"""

        if not path:
            raise ValueError("no path specified")

        start_list = os.path.abspath(start).split(os.path.sep)
        path_list = os.path.abspath(path).split(os.path.sep)

        # Work out how much of the filepath is shared by start and path.
        i = len(os.path.commonprefix([start_list, path_list]))

        rel_list = [os.path.pardir] * (len(start_list)-i) + path_list[i:]
        if not rel_list:
            return os.path.curdir
        return os.path.join(*rel_list)

    os.path.relpath = _relpath

from BeautifulSoup import BeautifulSoup as Soup

try:
    import json
except:
    import simplejson as json

log = logging.getLogger(__name__)
log.setLevel(logging.WARN)
log.addHandler(logging.StreamHandler())

class NoValue(object):
    pass

def make_option_parser():
    from optparse import OptionParser
    parser = OptionParser("usage: %prog [options] inputfile")
    parser.add_option("-j", "--jsio-path", 
                      dest="jsio", type="string", 
                      default="http://js.io/svn/js.io/trunk/jsio",
                      help="jsio source path")
    parser.add_option("-o", "--output", 
                      dest="output", type="string", 
                      default="output.js",
                      help="output FILENAME", metavar="FILENAME")
    parser.add_option("-e", "--environments", 
                      dest="environments", type="string", 
                      action='append',
                      default=["browser"],
                      help="target environments (e.g. browser or node)")
    parser.add_option("-t", "--transports", 
                      dest="transports", type="string", 
                      action="append",
                      default=["csp"],
                      help="target transport (e.g. csp or tcp)")
    parser.add_option("--v", 
                      action="store_const", const=logging.INFO, dest="verbose")
    parser.add_option("--vv", 
                      action="store_const", const=logging.DEBUG, dest="verbose")
    parser.add_option("-d", "--dont-compress", 
                      action="store_false", dest="minify", default=True,
                      help="Don't minify the output")
    
    return parser  

def get_script_src_assignment(script_name):
    SCRIPT_NAME_ASSIGNMENT = u"jsio.script_src = '%s'"
    return SCRIPT_NAME_ASSIGNMENT % script_name
    
def main(argv=None):
    if argv == None:
        argv = sys.argv[1:]
    parser = make_option_parser()
    (options, args) = parser.parse_args(argv)
    log.debug(options)
    log.setLevel(options.verbose or logging.WARN)
    
    global minify
    if not options.minify:
        minify = lambda x: x
    
    if len(args) != 1:
        print "Invalid position arguments"
        parser.print_help()
        sys.exit(1)
    
    INPUT = args[0]
    OUTPUT = options.output
    options.initialImport = ""

    if INPUT.split('.')[-1] not in ('html', 'js', 'pkg'):
        print "Invalid input file; jsio_compile only operats on .js and .html files"
        sys.exit(1)
    
    compile_kwargs = {}
    if INPUT.endswith('pkg'):
        INPUT, options, compile_kwargs = \
            load_package_configuration(INPUT, options)
    output = \
        compile_source(INPUT, options, **compile_kwargs)
    
    # the root script needs to be able to recognize itself so that it can
    # figure out where it is. we modify the generated script to store the
    # expected script name. later on, we can compare that against script
    # tag src's.
#    output = \
#        output.replace(get_script_src_assignment('jsio.js'),
#                       get_script_src_assignment(os.path.basename(OUTPUT)))
                       
#    expose = re.compile('window\.jsio\s=\sjsio;');
#    expose = re.compile('this\.global\.jsio\s=\sjsio');
#    output = expose.sub(options.initialImport + (options.exposeJsio and ';this.global.jsio=jsio;' or ''), output, 1);
    output += options.initialImport;
    if options.minify:
        log.info("Minifying")
        output = minify(output)
    else:
        log.info("Skipping minify")
    print "Writing output %s" % OUTPUT
    f = fileopen(OUTPUT, 'w')
    f.write(output)
    f.close()

def load_package_configuration(INPUT, options):
    """ load the configuration options in the specified pkg
        
        the pkg options should take precedence over the command-line
        options
    """
    # QUESTION: is this true? are we really going to ignore command-line
    #           options? let's at least print a message for now.
    pkg_data = json.loads(get_source(INPUT))
    pkg_data['root'] = str(pkg_data['root'])
    if 'environmenta' in pkg_data:
        print "using the 'environment' value from package %s" % INPUT
        options.environment = [str(env) for env in pkg_data['environments']]
    if 'transports' in pkg_data:
        print "using the 'transports' value from package %s" % INPUT
        options.transports = [str(xprt) for xprt in pkg_data['transports']]
    if 'environments' in pkg_data:
        print "using the 'environments' value from package %s" % INPUT
        options.environments = \
            [str(env) for env in pkg_data['environments']]
    options.initialImport = \
        '\njsio("import %s");\n' % (pkg_data['root'])
    options.exposeJsio = 'exposeJsio' in pkg_data and pkg_data['exposeJsio']
    BASEDIR = os.path.dirname(INPUT)
    new_input = join_paths(BASEDIR, pkg_data['root'] + '.js')
    return (new_input, options, dict(extras=[pkg_data['root']]))
    
def join_paths(*paths):
    if '://' in paths[0]:
        return '/'.join(paths)
    else:
        return os.path.join(*paths)

def minify(src):
    import StringIO
    jsm = JavascriptMinify()
    o = StringIO.StringIO()
    jsm.minify(StringIO.StringIO(src), o)
    return o.getvalue()


def get_source(target):
    log.debug('fetching source from %s', target)
    if '://' in target:
        return urlopen(target).read()
    else:
        return fileopen(target).read()

def build_transport_paths(environments, transports):
    return ['net.env.%s.%s' % (environment, transport)
            for transport in transports
            for environment in environments]
    
def get_transport_dependencies(jsio, env, xprts, path_template, extras=[]):
    dependencies = []
    for xprt in xprts:
        print join_paths(jsio, 'net', 'env', env, xprt) + '.js'
        raw_source = \
            get_source(join_paths(jsio, 'net', 'env', env, xprt) + '.js')
        source = remove_comments(raw_source)
        dependencies.extend(map(lambda x: (x, path_template % env), 
                                (extract_dependencies(source))))
    return dependencies
    
def get_dependencies(source, path='', extras=[]):
    print '** get dependencies for', source
    return map(lambda x: (x, path), 
               (extract_dependencies(source) + extras))
    
def compile_source(target, options, extras=[]):
    log.info('compiling %s', target)
    orig_source = get_source(target)
    if target.endswith('.html'):
        soup = Soup(orig_source)
        orig_source = ""
        for script in select(soup, 'script'):
            if 'src' in dict(script.attrs):
                continue
            target += script.contents[0]
                               
    target_source = remove_comments(orig_source)
    target_module = os.path.relpath(target).split('/')[-1].split('.')[0]
    target_module_path = target_module + '.js'

    dependencies = get_dependencies(target_source, extras)
    dependencies.append(('jsio','jsio.jsio'))
    print 'dependencies:', dependencies
    checked = [target_module, 'net.env', 'log', 'Class', 'bind']
    transport_paths = build_transport_paths(options.environments,
                                            options.transports)
    checked.extend(transport_paths)
    for environment in options.environments:
        dependencies.extend(\
            get_transport_dependencies(options.jsio,
                                       environment,
                                       options.transports,
                                       'net.env.%s.'))
    print 'dependencies:',dependencies
    log.debug('checked is %s', checked)
    while dependencies:
        pkg, path = dependencies.pop(0)
        full_path = joinModulePath(path, pkg)
        if full_path == 'jsio':
            full_path = 'jsio.jsio'
        log.debug('full_path: %s', full_path)
        if full_path in checked:
            continue
        log.debug('checking dependancy %s', full_path)
        target = path_for_module(full_path, prefix=options.jsio)
        src = remove_comments(get_source(target))
        depends = map(lambda x: (x, full_path), extract_dependencies(src))
        dependencies.extend(depends)
        if not pkg == 'jsio':
            checked.append(full_path)
        
    sources = {}
    sources[target_module] = dict(src=minify(target_source),
                                  filePath=target_module_path)
    log.debug('checked is %s', checked)
    for full_path in checked:
        if full_path in (target_module, 'jsio', # 'jsio.env',
                         'log', 'Class', 'bind'):
            continue
        log.info("Loading dependancy %s", full_path)
        filename = path_for_module(full_path, prefix=options.jsio)
        src = get_source(filename)
        virtual_filename = path_for_module(full_path, prefix='jsio')
        log.debug(virtual_filename)
            
        sources[full_path] = {'src': minify(src), 'filePath': virtual_filename, }
        
    out = ',\n'.join([ repr(str(key)) + ": " + json.dumps(val)
                       for (key, val) in sources.items() ])
    jsio_src = get_source(join_paths(options.jsio, 'jsio.js'))
    final_output = \
        jsio_src.replace("	// Insert pre-loaded modules here...", out)
    return final_output

def path_for_module(full_path, prefix):
    print 'path_for_module', full_path
    is_relative = full_path[0] == '.'
    path_components = full_path.split('.')
    if full_path == 'jsio':
        path_components = [prefix, full_path]
    elif (path_components[0] == 'jsio'):
        path_components[0] = prefix
    elif not is_relative:
        path_components.insert(0, prefix)
    #log.info('TEST', path_components)
    return join_paths(*path_components) + '.js'

def joinModulePath(a, b):
    if b[0] != '.':
        return b
    segments = a.split('.')
    while b[0] == '.':
        b = b[1:]
        segments.pop()
    output = '.'.join(segments) + '.' + b
    if output[0] == '.':
        output = output[1:]
    return output

def extract_dependencies(src):
    dependencies = []
    re1 = re.compile("jsio\(\s*['\"]\s*(from|external)\s+([\w.$]+)\s+import\s+(.*?)\s*['\"]\s*\)")  
    for item in re1.finditer(src):
        dependencies.append(item.groups()[1])
    re2 = re.compile("jsio\(\s*['\"]\s*import\s+(.*?)\s*['\"]\s*\)")
    re3 = re.compile("\s*([\w.$]+)(?:\s+as\s+([\w.$]+))?,?")
    for item in re2.finditer(src):
        for listItem in re3.finditer(item.groups()[0]):
            dependencies.append(listItem.groups()[0])
    if dependencies:
        print 'returning', dependencies
    return dependencies
    
def remove_comments(src):
    # new regular expression way here... -mario
    RE_COMMENT = re.compile(r'([^\\]/\*([^*]|[\r\n]|(\*+([^*/]|[\r\n])))*\*+/)|([^:\\]//.*)')
    comment = RE_COMMENT.search(src)
    while comment:
        src = src[:comment.start()] + src[comment.end():]
        comment = RE_COMMENT.search(src)

    # hack for now: RE_COMMENT only matches comments not found at the start of the file, so explicitly look for those here
    RE_COMMENT = re.compile(r'^/\*([^*]|[\r\n]|(\*+([^*/]|[\r\n])))*\*+/')
    comment = RE_COMMENT.search(src)
    if comment:
        src = src[:comment.start()] + src[comment.end():]
    
    return src
    
    # old way below here (brutally deletes http://'s)... -mario
    """
    output = ""
    i = 0
    while True:
        j = src.find('/*', i)
        if j == -1:
            output += src[i:]
            break
        output += src[i:j]
        k = src.find('*/', i)
        if k == -1:
            print 'unterminated comment detected'
            sys.exit(0)
        i = k+2
    output2 = ""
    for line in output.split('\n'):
        # XXX: Won't quite work with strings...
        line = line.split('//')[0]
        if line:
            output2 += line + '\n'            
    return output2
    """
            
"""
soupselect.py

CSS selector support for BeautifulSoup.

soup = BeautifulSoup('<html>...')
select(soup, 'div')
- returns a list of div elements

select(soup, 'div#main ul a')
- returns a list of links inside a ul inside div#main

"""

import re

tag_re = re.compile('^[a-z0-9]+$')

attribselect_re = re.compile(
    r'^(?P<tag>\w+)?\[(?P<attribute>\w+)(?P<operator>[=~\|\^\$\*]?)' + 
    r'=?"?(?P<value>[^\]"]*)"?\]$'
)

# /^(\w+)\[(\w+)([=~\|\^\$\*]?)=?"?([^\]"]*)"?\]$/
#   \---/  \---/\-------------/    \-------/
#     |      |         |               |
#     |      |         |           The value
#     |      |    ~,|,^,$,* or =
#     |   Attribute 
#    Tag

def attribute_checker(operator, attribute, value=''):
    """
    Takes an operator, attribute and optional value; returns a function that
    will return True for elements that match that combination.
    """
    return {
        '=': lambda el: el.get(attribute) == value,
        # attribute includes value as one of a set of space separated tokens
        '~': lambda el: value in el.get(attribute, '').split(),
        # attribute starts with value
        '^': lambda el: el.get(attribute, '').startswith(value),
        # attribute ends with value
        '$': lambda el: el.get(attribute, '').endswith(value),
        # attribute contains value
        '*': lambda el: value in el.get(attribute, ''),
        # attribute is either exactly value or starts with value-
        '|': lambda el: el.get(attribute, '') == value \
            or el.get(attribute, '').startswith('%s-' % value),
    }.get(operator, lambda el: el.has_key(attribute))


def select(soup, selector):
    """
    soup should be a BeautifulSoup instance; selector is a CSS selector 
    specifying the elements you want to retrieve.
    """
    tokens = selector.split()
    current_context = [soup]
    for token in tokens:
        m = attribselect_re.match(token)
        if m:
            # Attribute selector
            tag, attribute, operator, value = m.groups()
            if not tag:
                tag = True
            checker = attribute_checker(operator, attribute, value)
            found = []
            for context in current_context:
                found.extend([el for el in context.findAll(tag) if checker(el)])
            current_context = found
            continue
        if '#' in token:
            # ID selector
            tag, id = token.split('#', 1)
            if not tag:
                tag = True
            el = current_context[0].find(tag, {'id': id})
            if not el:
                return [] # No match
            current_context = [el]
            continue
        if '.' in token:
            # Class selector
            tag, klass = token.split('.', 1)
            if not tag:
                tag = True
            found = []
            for context in current_context:
                found.extend(
                    context.findAll(tag,
                        {'class': lambda attr: attr and klass in attr.split()}
                    )
                )
            current_context = found
            continue
        if token == '*':
            # Star selector
            found = []
            for context in current_context:
                found.extend(context.findAll(True))
            current_context = found
            continue
        # Here we should just have a regular tag
        if not tag_re.match(token):
            return []
        found = []
        for context in current_context:
            found.extend(context.findAll(token))
        current_context = found
    return current_context

def monkeypatch(BeautifulSoupClass=None):
    """
    If you don't explicitly state the class to patch, defaults to the most 
    common import location for BeautifulSoup.
    """
    if not BeautifulSoupClass:
        from BeautifulSoup import BeautifulSoup as BeautifulSoupClass
    BeautifulSoupClass.findSelect = select

def unmonkeypatch(BeautifulSoupClass=None):
    if not BeautifulSoupClass:
        from BeautifulSoup import BeautifulSoup as BeautifulSoupClass
    delattr(BeautifulSoupClass, 'findSelect')






#!/usr/bin/python

# This code is original from jsmin by Douglas Crockford, it was translated to
# Python by Baruch Even. The original code had the following copyright and
# license.
#
# /* jsmin.c
#    2007-05-22
#
# Copyright (c) 2002 Douglas Crockford  (www.crockford.com)
#
# Permission is hereby granted, free of charge, to any person obtaining a copy of
# this software and associated documentation files (the "Software"), to deal in
# the Software without restriction, including without limitation the rights to
# use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
# of the Software, and to permit persons to whom the Software is furnished to do
# so, subject to the following conditions:
#
# The above copyright notice and this permission notice shall be included in all
# copies or substantial portions of the Software.
#
# The Software shall be used for Good, not Evil.
#
# THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
# IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
# FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
# AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
# LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
# OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
# SOFTWARE.
# */

from StringIO import StringIO

# def jsmin(js):
#     ins = StringIO(js)
#     outs = StringIO()
#     JavascriptMinify().minify(ins, outs)
#     str = outs.getvalue()
#     if len(str) > 0 and str[0] == '\n':
#         str = str[1:]
#     return str

def isAlphanum(c):
    """return true if the character is a letter, digit, underscore,
           dollar sign, or non-ASCII character.
    """
    return ((c >= 'a' and c <= 'z') or (c >= '0' and c <= '9') or
            (c >= 'A' and c <= 'Z') or c == '_' or c == '$' or c == '\\' or (c is not None and ord(c) > 126));

class UnterminatedComment(Exception):
    pass

class UnterminatedStringLiteral(Exception):
    pass

class UnterminatedRegularExpression(Exception):
    pass

class JavascriptMinify(object):

    def _outA(self):
        self.outstream.write(self.theA)
    def _outB(self):
        self.outstream.write(self.theB)

    def _get(self):
        """return the next character from stdin. Watch out for lookahead. If
           the character is a control character, translate it to a space or
           linefeed.
        """
        c = self.theLookahead
        self.theLookahead = None
        if c == None:
            c = self.instream.read(1)
        if c >= ' ' or c == '\n':
            return c
        if c == '': # EOF
            return '\000'
        if c == '\r':
            return '\n'
        return ' '

    def _peek(self):
        self.theLookahead = self._get()
        return self.theLookahead

    def _next(self):
        """get the next character, excluding comments. peek() is used to see
           if an unescaped '/' is followed by a '/' or '*'.
        """
        c = self._get()
        if c == '/' and self.theA != '\\':
            p = self._peek()
            if p == '/':
                c = self._get()
                while c > '\n':
                    c = self._get()
                return c
            if p == '*':
                c = self._get()
                while 1:
                    c = self._get()
                    if c == '*':
                        if self._peek() == '/':
                            self._get()
                            return ' '
                    if c == '\000':
                        raise UnterminatedComment()

        return c

    def _action(self, action):
        """do something! What you do is determined by the argument:
           1   Output A. Copy B to A. Get the next B.
           2   Copy B to A. Get the next B. (Delete A).
           3   Get the next B. (Delete B).
           action treats a string as a single character. Wow!
           action recognizes a regular expression if it is preceded by ( or , or =.
        """
        if action <= 1:
            self._outA()

        if action <= 2:
            self.theA = self.theB
            if self.theA == "'" or self.theA == '"':
                while 1:
                    self._outA()
                    self.theA = self._get()
                    if self.theA == self.theB:
                        break
                    if self.theA <= '\n':
                        raise UnterminatedStringLiteral()
                    if self.theA == '\\':
                        self._outA()
                        self.theA = self._get()


        if action <= 3:
            self.theB = self._next()
            if self.theB == '/' and (self.theA == '(' or self.theA == ',' or
                                     self.theA == '=' or self.theA == ':' or
                                     self.theA == '[' or self.theA == '?' or
                                     self.theA == '!' or self.theA == '&' or
                                     self.theA == '|' or self.theA == ';' or
                                     self.theA == '{' or self.theA == '}' or
                                     self.theA == '\n'):
                self._outA()
                self._outB()
                while 1:
                    self.theA = self._get()
                    if self.theA == '/':
                        break
                    elif self.theA == '\\':
                        self._outA()
                        self.theA = self._get()
                    elif self.theA <= '\n':
                        raise UnterminatedRegularExpression()
                    self._outA()
                self.theB = self._next()


    def _jsmin(self):
        """Copy the input to the output, deleting the characters which are
           insignificant to JavaScript. Comments will be removed. Tabs will be
           replaced with spaces. Carriage returns will be replaced with linefeeds.
           Most spaces and linefeeds will be removed.
        """
        self.theA = '\n'
        self._action(3)

        while self.theA != '\000':
            if self.theA == ' ':
                if isAlphanum(self.theB):
                    self._action(1)
                else:
                    self._action(2)
            elif self.theA == '\n':
                if self.theB in ['{', '[', '(', '+', '-']:
                    self._action(1)
                elif self.theB == ' ':
                    self._action(3)
                else:
                    if isAlphanum(self.theB):
                        self._action(1)
                    else:
                        self._action(2)
            else:
                if self.theB == ' ':
                    if isAlphanum(self.theA):
                        self._action(1)
                    else:
                        self._action(3)
                elif self.theB == '\n':
                    if self.theA in ['}', ']', ')', '+', '-', '"', '\'']:
                        self._action(1)
                    else:
                        if isAlphanum(self.theA):
                            self._action(1)
                        else:
                            self._action(3)
                else:
                    self._action(1)

    def minify(self, instream, outstream):
        self.instream = instream
        self.outstream = outstream
        self.theA = '\n'
        self.theB = None
        self.theLookahead = None

        self._jsmin()
        self.instream.close()


if __name__ == "__main__":
    main()
