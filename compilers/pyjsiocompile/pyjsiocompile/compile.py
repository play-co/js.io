import sys
import os
from BeautifulSoup import BeautifulSoup as Soup

try:
    import json
except:
    import simplejson as json

def make_option_parser():
    from optparse import OptionParser
    parser = OptionParser("usage: %prog [options] inputfile")
    parser.add_option("-j", "--jsio-path", dest="jsio", type="string", default="./jsio",
                      help="jsio source path")
    parser.add_option("-o", "--output", dest="output", type="string", default="output.js",
                      help="output FILENAME", metavar="FILENAME")
    parser.add_option("-i", "--input", dest="input", type="string",
                      help="input FILENAME; must end in .js or .html", metavar="FILENAME")
    parser.add_option("-e", "--environment", dest="environment", type="string", default="browser",
                      help="target environment (e.g. browser or node)")
    parser.add_option("-t", "--transport", dest="transport", type="string", default="csp",
                      help="target transport (e.g. csp or tcp)")
    parser.add_option("-v", action="store_true", dest="verbose")

    parser.add_option("-d", "--dont-compress", action="store_false", dest="minify", default=True,
                      help="Don't minify the output")
                      
    return parser  
    
def main(argv=None):
    if argv == None:
        argv = sys.argv[1:]
    parser = make_option_parser()
    (options, args) = parser.parse_args(argv)
    if len(args) != 1:
        print "Invalid position arguments"
        parser.print_help()
        sys.exit(1)
    INPUT = args[0]
    BASEDIR = os.path.dirname(INPUT)
    OUTPUT = options.output


    if INPUT.split('.')[-1] not in ('html', 'js', 'pkg'):
        print "Invalid input file; jsio_compile only operats on .js and .html files"
        sys.exit(1)

    if INPUT.endswith('.pkg'):
        pkg_data = json.loads(open(INPUT).read())
        pkg_data['root'] = str(pkg_data['root'])
        target = os.path.join(BASEDIR, pkg_data['root'] + '.js')
        output = compile_source(target, options, BASEDIR, extras=[pkg_data['root']])
        output += '\njsio("import %s");\ndelete jsio;\n' % (pkg_data['root'])
    else:
        output = compile_source(INPUT, options, BASEDIR)

    if options.minify:
        print "Minifying"
        output = minify(output)
    else:
        print "Skipping minify"
    print "Writing output", OUTPUT
    f = open(OUTPUT, 'w')
    f.write(output)
    f.close()
    
def minify(src):
    import StringIO
    jsm = JavascriptMinify()
    o = StringIO.StringIO()
    jsm.minify(StringIO.StringIO(src), o)
    return o.getvalue()
    
    

def compile_source(target, options, BASEDIR='.', extras=[]):
    orig_source = open(os.path.join(BASEDIR, target)).read()
    if target.endswith('.html'):
        soup = Soup(orig_source)
        orig_source = ""
        for script in select(soup, 'script'):
            if 'src' in dict(script.attrs):
                continue
            target += script.contents[0]
    
    target_source = remove_comments(target)
    env_path = 'jsio.env.' + options.environment + '.' + options.transport
    checked = ['jsio', 'jsio.env', env_path, 'log', 'Class', 'bind']
    dependancies = map(lambda x: (x, ''), (extract_dependancies(target_source) + extras))
    env = remove_comments(open(os.path.join(BASEDIR, 'jsio/env/' + options.environment + '/' + options.transport + '.js')).read())
    dependancies.extend(map(lambda x: (x, 'jsio.env.browser.'), extract_dependancies(env)))
    while dependancies:
        pkg, path = dependancies.pop(0)
        full_path = joinModulePath(path, pkg)
        if full_path in checked:
            continue
        target = path_for_module(full_path)
        src = remove_comments(open(os.path.join(BASEDIR, target)).read())
        depends = map(lambda x: (x, full_path), extract_dependancies(src))
        dependancies.extend(depends)
        checked.append(full_path)
        
    sources = {}
    print 'checked is', checked
    for full_path in checked:
        if full_path in ('jsio', 'log', 'Class', 'bind'):
            continue
        print "Loading dependancy", full_path
        filename = path_for_module(full_path)
        src= open(os.path.join(BASEDIR, filename)).read()
            
        sources[full_path] = {'src': minify(src), 'url': filename, }
        
    out = ',\n'.join([ repr(key) + ": " + json.dumps(val) for (key, val) in sources.items() ])
    jsio_src = open(os.path.join(BASEDIR, 'jsio/jsio.js')).read()
    final_output = jsio_src.replace("        // Insert pre-loaded modules here...", out)
    return final_output


def path_for_module(full_path):
    if full_path == 'jsio':
        return 'jsio/jsio.js'
    return os.path.join(*full_path.split('.')) + '.js'

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

def extract_dependancies(src):
    dependancies = []
    re1 = re.compile("jsio\(\s*['\"]\s*(from|external)\s+([\w.$]+)\s+import\s+(.*?)\s*['\"]\s*\)")  
    for item in re1.finditer(src):
        dependancies.append(item.groups()[1])
    re2 = re.compile("jsio\(\s*['\"]\s*import\s+(.*?)\s*['\"]\s*\)")
    re3 = re.compile("\s*([\w.$]+)(?:\s+as\s+([\w.$]+))?,?")
    for item in re2.finditer(src):
        print item.groups()
        for listItem in re3.finditer(item.groups()[0]):
            dependancies.append(listItem.groups()[0])

    print dependancies
    return dependancies
    
def remove_comments(src):
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

def jsmin(js):
    ins = StringIO(js)
    outs = StringIO()
    JavascriptMinify().minify(ins, outs)
    str = outs.getvalue()
    if len(str) > 0 and str[0] == '\n':
        str = str[1:]
    return str

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
