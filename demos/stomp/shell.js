// shell.js

Shell = function(output){
    var self = this
    self.output = output
    
    self.print = function(s) {
        var s = self.format(s)
        self.output.innerHTML += "&rarr; " + s + "<br>"
        self.output.scrollTop = self.output.scrollHeight     
    }
    
    
    self.format = function(expr)
    {
        var s = prettyprint(expr)
        s = htmlescape(s)
        return s
    }

    var htmlescape = function(s) {
        var s = s.replace("&", "&amp;", "g")
        s = s.replace("<", "&lt;", "g")
        s = s.replace(">", "&gt;", "g")
        s = s.replace(" ", "&nbsp;", "g")
        s = s.replace("\n", "<br>", "g")
        return s
    }

    var prettyprint = function(s) {
        var q = "("
        if(typeof(s) == "string")
            return s
        for (var i=0; i<s.length; i++) {
            if (typeof(s[i]) != "object")
                q += s[i]
            else
                q += prettyprint(s[i])
            if (i < s.length -1)
                q += " "
        }
        q += ")"
        return q
    }
}
