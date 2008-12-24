import os, re, optparse, time
from cdata import HELP_STR, BASE_STR

START_TIME = 0
REGEX = { 'provide': re.compile(r'js\.io\.provide\(.*\);'),
          'declare': re.compile(r'js\.io\.declare\(.*\);'),
          'require': re.compile(r'js\.io\.require\(.*\);') }
# from http://ostermiller.org/findcomment.html
RE_COMMENT = re.compile(r'(/\*([^*]|[\r\n]|(\*+([^*/]|[\r\n])))*\*+/)|(//.*)')
SPACES = {';\n':';','\n;':';',':\n':':','\n:':':','{\n':'{','\n{':'{','\n}':'}'}

class File(object):
    def __init__(self, name, path):
        self.name = name
        self.path = path
        self.requires = set()
        self.body = ""

    def process(self):
        f = open(self.path)
        self.body = f.read()
        f.close()
        for name, expression in REGEX.items():
            result = expression.search(self.body)
            while result:
                if name == "declare":
                    dec_data = [item.strip() for item in self.body[result.start()+15:result.end()-2].replace('}','').replace('{','').replace("'",'').replace('"','').split(",")]
                    new_name, old_name = dec_data[0], dec_data[1]
                    self.body = (self.body[:result.start()] + self.body[result.end():]).replace(old_name, new_name)
                elif name == "require":
                    self.requires.add(self.body[result.start()+15:result.end()-3])
                if name != "declare":
                    self.body = self.body[:result.start()] + self.body[result.end():]
                result = expression.search(self.body)

class Minifyer(object):
    def __init__(self, data):
        self.data = data

    def trim(self):
        # remove comments
        comment = RE_COMMENT.search(self.data)
        while comment:
            self.data = self.data[:comment.start()] + self.data[comment.end():]
            comment = RE_COMMENT.search(self.data)
        # remove whitespace
        self.data = '\n'.join([line.strip() for line in self.data.splitlines() if line.strip()])
        for before, after in SPACES.items():
            while before in self.data:
                self.data = self.data.replace(before, after)

class Builder(object):
    def __init__(self, target, name, title, version):
        report("Initializing builder")
        if not os.path.isfile(target):
            error("TARGET is not a file")
        if os.path.isfile(name) and not raw_input("%s exists. overwrite? (yes/no)\n"%name).lower().startswith("y"):
            return report("Goodbye")

        self.files = {}
        self.requires = []
        tname = target[3:-3].replace(os.path.sep,'.')
        js = { 'io': {} }
        body = ''

        report("Scanning library")
        os.path.walk('../js.io', self.walker, None)
        if tname not in self.files:
            self.files[tname] = File(tname, target)
        report("Compiling dependencies")
        self.add_file(tname)

        report("Building")
        self.requires.reverse()
        for f in self.requires:
            mod_path = f.split('.')[2:]
            cur_pos = js['io']
            for item in mod_path:
                if item not in cur_pos:
                    cur_pos[item] = {}
                cur_pos = cur_pos[item]
            body += self.files[f].body
        data = "js = %s%s%s"%(js, BASE_STR, body)

        report("Minifying")
        mini = Minifyer(data)
        mini.trim()
        data = "/*\n * %s\n * js.io %s\n * http://js.io\n */\n\n"%(title, version)+mini.data
        report("Writing")
        f = open(name, 'w')
        f.write(data)
        f.close()
        report("Exiting")

    def add_file(self, name):
        self.requires.append(name)
        target = self.files[name]
        target.process()
        for f in target.requires:
            if f not in self.requires:
                if f not in self.files:
                    print self.files
                    error("invalid require statement in %s: %s"%(name, f))
                self.add_file(f)

    def walker(self, nothing, path, contents):
        contents.remove('.svn')
        for item in [f for f in contents if f.endswith('.js')]:
            fpath = os.path.join(path, item)
            fname = fpath[3:-3].replace(os.path.sep,'.')
            self.files[fname] = File(fname, fpath)

def report(msg):
    print "%s: %s"%(str(time.time() - START_TIME)[:5], msg)

def error(msg):
    report("Error thrown")
    print 'type "compiler.py -h" for usage help'
    print "error:",msg
    import sys
    sys.exit()

def start(target, name, title, version):
    global START_TIME
    START_TIME = time.time()
    Builder(target, name, title, version)

if __name__ == "__main__":
    parser = optparse.OptionParser(HELP_STR)
    args = parser.parse_args()[1]
    if len(args) != 4:
        error("4 arguments required")
    start(*args)
