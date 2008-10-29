
function MessageWindow(jid, username) {
    this.remoteUsername = username;
    this.remoteJid = jid;
}

MessageWindow.prototype.onMessage = function (user, text) {
    this.chatPanel.addChatMessage({username:user, text:text});
};

// QUIRKS FLAG, FOR BOX MODEL 
var IE_QUIRKS = (YAHOO.env.ua.ie && document.compatMode == "BackCompat"); 

// UNDERLAY/IFRAME SYNC REQUIRED 
var IE_SYNC = (YAHOO.env.ua.ie == 6 || (YAHOO.env.ua.ie == 7 && IE_QUIRKS)); 

// PADDING USED FOR BODY ELEMENT (Hardcoded for example) 
var PANEL_BODY_PADDING = (10*2) // 10px top/bottom padding applied to Panel body element. The top/bottom border width is 0 


/** Display the window. */
MessageWindow.prototype.render = function () {
    this.panel = new YAHOO.widget.Panel("dialog_" + this.remoteUsername, {
        xy: [Math.random() * 250 + 250,Math.random() * 250 + 50],
        width: "380px",
        effect: {effect:YAHOO.widget.ContainerEffect.FADE, duration:0.5},
        constraintoviewport: true,
        close: true
    });
    
    this.panel.setHeader("Chat with " + this.remoteUsername);
    this.panel.setBody('');
    this.panel.renderEvent.subscribe(function () {
        this.layout.render();

        
    }, this, true);

    this.layout = new YAHOO.widget.Layout(this.panel.body, {
        height: 300,
        units: [
            { // Chat Window
                position: 'center',
                gutter: '0'
            }
      ]
    });
      
    /** chat panel */
    this.chatPanel = new gp.ChatPanel();
    this.chatPanel.sendEvent.subscribe(function (type, args) {
        /** Call the global function for now */
        onSendMessage(this.remoteJid, this.remoteUsername, args[0]);
    }, this, true);

    // rendering
    this.layout.on('render', function () {

        var centerUnit = this.layout.getUnitByPosition('center').get('wrap');
        this.chatPanel.render(centerUnit, this.layout);

    }, this, true);
    
    this.panel.render(document.body);
    
    var resize = new YAHOO.util.Resize("dialog_" + this.remoteUsername, { 
        handles: ['br'],
        autoRatio: true, 
        minWidth: 100, 
        minHeight: 200 
    }); 
      
    resize.on('resize', function(args) {
       var panelHeight = args.height;
       var headerHeight = this.panel.header.offsetHeight; // Content + Padding + Border
       var bodyHeight = (panelHeight - headerHeight);
        
        if(!IE_QUIRKS) { bodyHeight -= 20; }
        YAHOO.util.Dom.setStyle(this.panel.header, 'width', 
                                args.width-20+ 'px');
        YAHOO.util.Dom.setStyle(this.panel.body, 'height', bodyHeight + 'px');
        if (IE_SYNC) {
            this.panel.sizeUnderlay(); 
            this.panel.syncIframe(); 
        } 
       
       this.layout.set('height', bodyHeight);
       this.layout.set('width', args.width-20);
       this.layout.resize();
    }, this, true);
    
    if (IE_SYNC) {
        YAHOO.util.Dom.setStyle(this.panel.header, 'width', 
                                this.panel.body.clientWidth-20+ 'px');
        this.panel.sizeUnderlay(); 
        this.panel.syncIframe(); 
    } 
};

// MAIN GLOBAL VARIABLES
var windowManager = new YAHOO.widget.OverlayManager();
var userList = new UserListWindow();


YAHOO.util.Event.onDOMReady(function () {
    // Show the User List
    userList.render();
    windowManager.register(userList.panel);
});

/********************************************
 *          MAIN CONTROL FUNCTIONS
 */
 
function openMessageWindow(jid, username) {
    if(!messageWindows.hasOwnProperty(jid)) {
        messageWindows[jid] = new MessageWindow(jid, username);
        messageWindows[jid].render();
        windowManager.register(messageWindows[jid].panel);
    }
    messageWindows[jid].panel.show();
}

////
// create xmpp client
// register callbacks
// connect to xmpp server
xmpp = new XMPPClient();
xmpp.onPresence = function(ntype, from, to) {
    if (! ntype) {
        userList.onUserAvailable(from, from);
    }
    else if (ntype == "unavailable") {
        userList.onUserUnavailable(from);
    }
    else if (ntype == "subscribe") {
        xmpp.sendSubscribed(from, to);
    }
    else if (ntype == "subscribed") {
        alert(from + " added to your buddy list!");
    }
    else if (ntype == "unsubscribed") {
        userList.onUserUnavailable(from);
    }
}
xmpp.onMessage = onMessage;
xmpp.onSocketConnect = function() {
    domain = prompt("Domain","marionet");
    if (domain) {
        xmpp.connectServer(domain, connectSuccess, connectFailure);
    }
}
////
// 'localhost' is the machine running the ejabberd server
xmpp.connect('localhost', 5222);
////
// success / failure callbacks
function registerSuccess() {
    alert("Welcome!");
}
function registerFailure() {
    if (confirm("That user name is taken. Try again?")) {
        prompt_register();
    }
}
function loginSuccess() {
    alert("Welcome!");
}
function loginFailure() {
    if (confirm("Login failed. Register a new user account?")) {
        prompt_register();
    }
    else {
        prompt_login();
    }
}
function connectSuccess() {
    prompt_login();
}
function connectFailure() {
    alert("Unknown domain");
}
////
// helpers
function prompt_login() {
    var u = prompt("User name","frank");
    if (u) {
        var p = prompt("Password","pass");
        if (p) {
            xmpp.login(u, p, loginSuccess, loginFailure);
        }
    }
}
function prompt_register() {
    var u = prompt("New user name","ariel");
    if (u) {
        var p = prompt("New password","pass");
        if (p) {
            xmpp.register(u, p, registerSuccess, registerFailure);
        }
    }
}
////

/** Used to track the open message windows, keyed by JID */
var messageWindows = {};

/** Called when a message is received */
function onMessage(jid, username, text) {
    openMessageWindow(jid, username);
    messageWindows[jid].onMessage(username, text);
}

/** Called when the user clicks on a name in the user list */
function onUsernameClicked(user) {
    openMessageWindow(user.user_id, user.username);
}

/** Called when the user types a message to be sent */
function onSendMessage(toJid, toUsername, text) {
    // echo it in the window
    // TODO: I don't know how you'd track your own JID, so I put "Me"
    messageWindows[toJid].onMessage("Me", text);
    xmpp.msg(toJid, text);
}

/** Called when the user wants to add that contact */
function onAddContact(jid) {
    xmpp.subscribe(jid);
    alert("Buddy request sent.");
}

/** Called when the user clicks the user list's remove contact button */
function onRemoveContact(jid, username) {
    xmpp.unsubscribe(jid);
    userList.onUserUnavailable(jid);
}

/// SAMPLE DATA

//setTimeout(function() {
//    onMessage("foo@foo", "ASDFSADF", "Hello There");
//}, 3000);

//setTimeout(function(){
//    userList.onUserAvailable("marcus@jid.com", "Marcus Cavanaugh");
//    userList.onUserAvailable("asdf@asdf.com", "Michael Carter");
//}, 2000);
//setTimeout(function(){
//    userList.onUserUnavailable("marcus@jid.com");
//    userList.onUserAvailable("ggggg@ggggg.com", "Mario Balibrera");
//}, 4000);
//setTimeout(function(){
//    userList.onUserAvailable("marcus@jid.com", "Marcus Cavanaugh");
//    userList.onUserAvailable("steve@apple.com", "Steve Jobs");
//}, 5000);
//setTimeout(function(){
//    userList.onUserUnavailable("asdf@asdf.com");
//}, 7000);

// END SAMPLE DATA


/////////////////////////////////////////////////////////

/** @constructor */
function UserListWindow() {
}

UserListWindow.prototype.onUserAvailable = function (jid, username) {
    this.userList.addUser(new gp.User(jid, username));
    this.userList.update();
}
UserListWindow.prototype.onUserUnavailable = function (jid) {
    this.userList.removeUserID(jid);
    this.userList.update();
}

UserListWindow.prototype.render = function () {
    this.panel = new YAHOO.widget.Panel("userlist", {
        xy: [10,10],
        width: "200px",
        effect: {effect:YAHOO.widget.ContainerEffect.FADE, duration:0.5},
        constraintoviewport: true,
        close: true
    });
    
    this.panel.setHeader("User List");
    this.panel.setBody('');
    this.panel.renderEvent.subscribe(function () {
        this.layout.render();        
    }, this, true);

    this.layout = new YAHOO.widget.Layout(this.panel.body, {
        height: 300,
        units: [
            {
                position: 'top',
                height: 35
            },
            { // User List
                position: 'center',
                gutter: '0'
            }
      ]
    });

    // rendering
    this.layout.on('render', function () {
        
        var topUnit = this.layout.getUnitByPosition('top').get('wrap');
        
        var addButton = new YAHOO.widget.Button({
                                id: "add",
                                type: "push",
                                label: "Add",
                                container: topUnit
                            });
        var removeButton = new YAHOO.widget.Button({
                                id: "remove",
                                type: "push",
                                label: "Remove",
                                container: topUnit
                            });
        
        addButton.get("element").firstChild.firstChild.hideFocus = true; 
        removeButton.get("element").firstChild.firstChild.hideFocus = true; 
        
        addButton.on("click", function (e) {
            addButton.blur();
            var jid = window.prompt("Enter the JID of the contact to add:", "");
            if(jid) {
                onAddContact(jid);
            }
        }, this, true);
        
        removeButton.on("click", function (e) {
            removeButton.blur();
            for(var i in this.userList.users) {
                var user = this.userList.users[i];
                if (user.selected) {
                    onRemoveContact(user.user_id, user.username);
                }
            }
        }, this, true);

        var centerUnit = this.layout.getUnitByPosition('center').get('wrap');
        this.userList = new gp.UserList(centerUnit);
        this.userList.render();

    }, this, true);
    
    this.panel.render(document.body);
    
    var resize = new YAHOO.util.Resize("userlist", { 
        handles: ['br'],
        autoRatio: true, 
        minWidth: 100, 
        minHeight: 200 
    }); 
      
    resize.on('resize', function(args) {
       var panelHeight = args.height;
       var headerHeight = this.panel.header.offsetHeight; // Content + Padding + Border
       var bodyHeight = (panelHeight - headerHeight);
        
        if(!IE_QUIRKS) { bodyHeight -= 20; }
        YAHOO.util.Dom.setStyle(this.panel.header, 'width', args.width-20+ 'px');
        YAHOO.util.Dom.setStyle(this.panel.body, 'height', bodyHeight + 'px');
        if (IE_SYNC) {
            this.panel.sizeUnderlay(); 
            this.panel.syncIframe(); 
        } 
       
       this.layout.set('height', bodyHeight);
       this.layout.set('width', args.width-20);
       this.layout.resize();
    }, this, true);
    
    if (IE_SYNC) {
        YAHOO.util.Dom.setStyle(this.panel.header, 'width', 
                                this.panel.body.clientWidth-20+ 'px');
        this.panel.sizeUnderlay(); 
        this.panel.syncIframe(); 
    } 
}
