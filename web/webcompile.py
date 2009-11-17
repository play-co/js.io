#!/usr/bin/python
try:
    # random tmp dirs to avoid overwrites. what a hack...
    import os, cgi, commands, random
    ROOTDIR = os.path.join("tmp", str(random.random())[2:6])
    INDIR = os.path.join(ROOTDIR, "in")
    OUTDIR = os.path.join(ROOTDIR, "out")
    os.mkdir(ROOTDIR)
    os.mkdir(INDIR)
    os.mkdir(OUTDIR)

    # get relevant files from POST
    form = cgi.FieldStorage()
    def make_file(upload):
        fpath = os.path.join(INDIR, upload.filename)
        f = open(fpath, "w")
        f.write(upload.file.read())
        f.close()
        return fpath
    js = make_file(form['js'])
    pkg = make_file(form['pkg'])
    out = os.path.join(OUTDIR, form.getfirst("out"))

    # compile, log, return result, clean up
    f = open("wc.log", "a")
    f.write(commands.getoutput("jsio_compile %s -j jsio -o %s"%(pkg, out)))
    f.close()
    f = open(out, "r")
    data = f.read()
    f.close()
    print "Content-Type: text/javascript"
    print ""
    print "data", data
    commands.getoutput("rm -rf %s"%(ROOTDIR,))
except Exception, e:
    print "Content-Type: text/html"
    print ""
    print "error:", e
