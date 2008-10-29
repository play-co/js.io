var htmlescape = function(s) {
    var s = s.replace("&", "&amp;", "g")
    s = s.replace("<", "&lt;", "g")
    s = s.replace(">", "&gt;", "g")
    s = s.replace(" ", "&nbsp;", "g")
    return s
}

var print = function(s) {
    var shell = document.getElementById('shell')
    var color = "black"
    if (typeof(arguments[1]) != undefined)
        color = arguments[1]
    shell.innerHTML += "&rarr;<span style='color:"+color+ "'> " + htmlescape(s) + "</span><br>"
    shell.scrollTop = shell.scrollHeight
}

var client = new TelnetClient()
var connect = function(host, port) {
    client.onmessage = print
    client.onclose = function(code) {
        print("Connection Closed (" + code + ")", "red");
    }
    client.onopen = function() {
        print("Connection Open", "green");
    }
    client.connect(host, port)
}

var send = function(s) {
    print(s, "red")
    client.send(s)
}
    
