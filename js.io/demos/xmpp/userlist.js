// User List Control

/** @namespace */
var gp = YAHOO.namespace("gp");

/**
    Create a new GP User object.
    Represents a user in the lobby and tables.
    @param obj      an object with [at least] a user_id attribute
*/
gp.User = function (jid, username) {
    this.username = username;
    this.user_id = jid;
    this.selected = false;
};

/** Used for sorting the username. */
gp.User.prototype.toString = function () {
        return this.username.toLowerCase();
};

/**
    Panel to represent a list of users.
    @class
*/
gp.UserList = function (container) {
    YAHOO.util.Dom.addClass(container, 'userlist');
    this.container = container;
    this.users = [];
    this.toolTip = null;
};

gp.UserList.prototype = {
    
    /**
        Add a new gp.User to the user list.
        @param {gp.User} user
    */
    addUser: function (user) {
        this.users.push(user);
    },
    
    /**
        Clear the user list, removing all users. (You must call {@link #update}
        in order for these changes to become visible.)
    */
    clear: function (username) {
        this.users = [];
    },
    
    /**
        Return the gp.User object for the user with the specified userID, or null.
        @param {Integer} user_id
        @type gp.User
    */
    findUserID: function (user_id) {
        for(var i in this.users) {
            if(this.users[i].user_id == user_id) {
                return this.users[i];
            }
        }
        return null;
    },
    
    /**
        Return the gp.User object for the user with the specified username
        (case insensitive), or null.
        @param {Integer} user_id
        @type gp.User
    */
    findUsername: function (username) {
        for(var i in this.users) {
            if(this.users[i].username.toLowerCase() == username.toLowerCase()) {
                return this.users[i];
            }
        }
        return null;
    },
    
    /**
        Remove the user with specified user_id. (Call {@link #update} to show changes.)
    */
    removeUserID: function (user_id) {
        for(var i in this.users) {
            if(this.users[i].user_id == user_id) {
                this.users.splice(i, 1); // Remove this user
                return;
            }
        }
    },
    
    /**
        Remove the user with specified username. (Call {@link #update} to show changes.)
    */
    removeUsername: function (username) {
        for(var i in this.users) {
            if(this.users[i].username.toLowerCase() == username.toLowerCase()) {
                this.users.splice(i, 1); // Remove this user
                return;
            }
        }
    },
    
    /**
        Called (with the User object as a parameter) when the user clicks that username.
    */
    onUsernameClicked: function (user) {
        //alert("Username Clicked: " + user.username + " (" + user.user_id + ")");
        // Unselect the others
        for(var i in this.users) {
            if (this.users[i].selected) {
                this.users[i].selected = false;
                YAHOO.util.Dom.removeClass('userlist_'+this.users[i].user_id, 'selectedUsername');
            }
        }
        user.selected = true;
        if (user.selected) {
            YAHOO.util.Dom.addClass('userlist_'+user.user_id, 'selectedUsername');
        } else {
            YAHOO.util.Dom.removeClass('userlist_'+user.user_id, 'selectedUsername');
        }
    },
    
    onUsernameDoubleClicked: function (user) {
        //alert("Username Clicked: " + user.username + " (" + user.user_id + ")");
        // Call the global function for now, cause it's easiest
        onUsernameClicked(user);
    },
    
    /**
        Render the user list to sync with any changes made with other functions of this class.
        You MUST call this function to see anything happen.
    */
    update: function () {
        this.users.sort();
        
        // Empty all of the old user list names
        while(this.container.firstChild !== null) {
            this.container.removeChild(this.container.firstChild);
        }
        var elems = [];
        for(var i in this.users) {
            var div = document.createElement("div");
            var user = this.users[i];
            YAHOO.util.Dom.addClass(div, 'username');
            div.id = "userlist_" + user.user_id;
            div.alt = user.user_id;
            div.innerHTML = user.username;
            if (user.selected) {
                YAHOO.util.Dom.addClass(div, 'selectedUsername');
            }
            YAHOO.util.Event.on(div, "click", function (e, userObj) {
                this.onUsernameClicked(userObj);
            }, user, this);
            YAHOO.util.Event.on(div, "dblclick", function (e, userObj) {
                this.onUsernameDoubleClicked(userObj);
            }, user, this);
            elems.push(div);
            this.container.appendChild(div);
        }
    }
};