all:	csp_pkg

csp_pkg: csp.js csp.pkg
	jsio_compile csp.pkg -o csp.build.js --v


release: 
	jsio_compile csp.pkg -o ../build/csp.js --v
	
