/**********************************
* author: Mario Balibrera
*    web: mariobalibrera.com
*  email: mario.balibrera@gmail.com
**********************************/

js.io.provide('js.io.tools.parseurl');

ParseUrl = function(u) {
    // parse url into scheme, host, port, path, query, fragment
    var self = this;
    self.success = false;
    self.url = u;

    [self.scheme, self.address] = u.split("://");
    self.scheme = self.scheme.toLowerCase();

    [self.hostport, self.path] = self.address.split("/");
    [self.host, self.port] = self.hostport.split(":");

    [self.path, self.fragment] = self.path.split("#");
    [self.path, self.query] = self.path.split("?");

    if (self.scheme && self.hostport) {
        self.success = true;
    }
}

js.io.declare('js.io.tools.parseurl.Parse',ParseUrl,{});
