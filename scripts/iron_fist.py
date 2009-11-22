"""
If you suspect that you may have broken with the js.io style guidelines,
run this script before you commit. Currently, it replaces "    " with
"\t" in all JavaScript. Can anyone think of any other useful style rule?
Me neither.

-mario
"""

import os

REPLACE_RULES = {
    "    ": "\t",
}
CHANGE_COUNT = 0

def log(msg, level=0):
    print "%s%s"%("    "*level, msg)

def process_files(nothing, dirname, fnames):
    global CHANGE_COUNT
    log("%s%s"%(os.linesep, dirname,))
    mycount = 0
    for fname in [f for f in fnames if f.endswith(".js")]:
        log(fname, 1)
        fpath = os.path.join(dirname, fname)

        f = open(fpath, "r")
        data = f.read()
        f.close()

        for old, new in REPLACE_RULES.items():
            num = data.count(old)
            if num > 0:
                mycount += 1
                log('replacing "%s" with "%s" %s times'%(old, new, num), 2)
                data = data.replace(old, new)

        f = open(fpath, "w")
        f.write(data)
        f.close()
    CHANGE_COUNT += mycount
    log("changed files in %s: %s."%(dirname, mycount))
    log("changed files total: %s."%(CHANGE_COUNT,))

if __name__ == "__main__":
    root = os.path.join("..", "jsio")
    log("iron fist clenched")
    log("crushing the spirit of %s"%(root,))
    os.path.walk(root, process_files, None)
