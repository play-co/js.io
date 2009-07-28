To run compiler directly on your project file:
    compiler.py TARGET NAME TITLE VERSION [-s]
    TARGET: initial javascript file
        such as [some_path]/[some_protocol].js
    NAME: name for final, compiled code
        such as [some_path]/[new_filename].js
    TITLE: title for new code
        such as "My Compiled Project"
    VERSION: version of js.io
        such as x.y.z
    -s: soft compilation -- compile but don't minify

To compile a fresh batch of js.io clients:
    batch.py VERSION [-s]
    VERSION: version of js.io
        such as x.y.z
    -s: soft compilation -- compile but don't minify
