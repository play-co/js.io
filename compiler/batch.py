import os, optparse
from compiler import start
from cdata import BATCH_STR

if __name__ == "__main__":
    parser = optparse.OptionParser(BATCH_STR)
    args = parser.parse_args()[1]
    if len(args) != 1:
        print "usage:", BATCH_STR
    else:
        protocols = os.path.join('..','js.io','protocols')
        for client in [c for c in os.walk(protocols).next()[2] if c.endswith('.js')]:
            target = os.path.join(protocols, client)
            name = os.path.join('..', 'clients', client)
            title = "standalone %s client"%(client[:-3])
            version = args[0]
            start(target, name, title, version)
