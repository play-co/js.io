var CHANNEL = "#orbited"
var IRC_SERVER = 'irc.freenode.net'
var IRC_PORT = 6667

var orig_domain = document.domain;
var nickname = null;
var users = {};

var irc = new IRCClient();

var connect = function () {
  $('#signin_popup, #absorb_clicks').hide();
  $('#chatbox_input').focus();

  nickname = $("#nickname").val();
  irc.onmessage = function (sender, message) {
    messagediv = $('<div class="message"></div>');
    if (sender == nickname)
      messagediv.addClass("self");
    if (isSubstring(nickname, message))
      messagediv.addClass("mentioned");
    messagediv.html('<span class="user">' + sender + ':</span> ' +
                    sanitize(message))
      .appendTo("#chathistory");
    scrollDown();
  };
  irc.onaction = function(sender, message) {
    if (channel != CHANNEL) {
      return false;
    };
    messagediv = $('<div class="message action"></div>');
    if (sender == nickname)
      messagediv.addClass("self");
    if (isSubstring(nickname, message))
      messagediv.addClass("mentioned");
    messagediv.html('<span class="user">• ' + sender + '</span> ' +
                    sanitize(message))
      .appendTo("#chathistory");
    scrollDown();
  };
  irc.onnames = function (namelist) {
    for (var i = namelist.length - 1; i >= 0; i--){
      var name = namelist[i];
      if ($.trim(name) != "" & $(".user_list #user_" + name).length == 0)
        addName(name);
    };
    fillUserList();
    
    $("<div class='informative welcome'></div>").
      html("Welcome to the " + CHANNEL + " channel.  Make yourself at home.").
      appendTo("#chathistory");
    scrollDown();
  };
  irc.onident = function() {
    irc.nick(nickname);
    irc.ident(nickname, '8 *', nickname);
    irc.join(CHANNEL);
    
    // Once we have joined, don't leave without warning the user
    window.onbeforeunload = function() {
      return 'Are you sure you want to quit and lose the chat connection?';
    };
    $(window).unload(function() {
      quit();
    })
  }
  irc.onjoin = function(joiner) {
    addName(joiner);
    fillUserList();
  
    $("<div class='informative join'></div>")
      .html("<span class='user'>" + joiner + '</span> has joined ' + CHANNEL)
      .appendTo("#chathistory");         
    scrollDown();                        
  }                                      
  irc.onpart = function(leaver, message) {        
    $("<div class='informative part'></div>")
      .html("<span class='user'>" + leaver + '</span> left ' + CHANNEL +
            (message ? ' (“' + message + '”)' : ''))
      .appendTo("#chathistory");         
    scrollDown();                        
                                         
    removeName(leaver);                  
  }                                      
  irc.onquit = function(quitter, message) {       
    $("<div class='informative quit'></div>")
      .html("<span class='user'>" + quitter + '</span> quit' +
            (message ? ' (“' + message + '”)' : ''))
      .appendTo("#chathistory");         
    scrollDown();
  
    removeName(quitter);
  }
  
  irc.connect(IRC_SERVER, IRC_PORT);
};

var chat = function () {
  msg = $('#chatbox_input').val();
  irc.privmsg(CHANNEL, msg);
  $('#chatbox_input').val('');
}

var quit = function () {
  irc.quit();
}

// function nickChanged(newnick) {
//     userRenamed(nickname, newnick);
//     nickname = newnick;
// }
// 
// function userRenamed(oldname, newname) {
//   $("<div class='informative rename'></div>")
//     .html("<span class='user'>" + oldname + "</span> is now known as " +
//           "<span class='user'>" + newname + "</span>")
//     .appendTo("#chathistory");
//   scrollDown();
// 
//   $(".user_list .user#user" + oldname)
//     .attr("id", "user" + newname)
//     .html(newname);
// }

var user_priviledges = function (name) {
  var privs_symbols = {"@":"admin", "%":"subadmin", "+":"voice"};
  if (name[0] in privs_symbols) {
    return privs_symbols[name[0]];
  } else {
    return "";
  };
};

var addName = function (name) {
  var priviledges = user_priviledges[name];
  users[name] = {"privs":priviledges};
  $('<div class="user_entry" id="user_' + name + '">' + name + '</div>')
    .addClass(priviledges)
    .appendTo("#user_list");
};

var removeName = function (name) {
  delete users[name];
  $(".user_list #user_" + name).remove()
};

var fillUserList = function () {
  $('.user_list').empty();
  //alert("test");
  var list = [];
  for (var user in users) {
    list.push(user);
  };
  list.sort()
  for (var i=0; i < list.length; i++) {
    var user = list[i];
    privs = users[user]['privs'];
    $('<div class="user_entry" id="user_' + user + '">' + user + '</div>')
      .addClass(privs)
      .appendTo("#user_list");
  };
};

var scrollDown = function () {
  var box = document.getElementById('chathistory');
  box.scrollTop = box.scrollHeight;
}

var isSubstring = function (sub, str) {
  // case insensitive substring test
  return str.toLowerCase().indexOf(sub.toLowerCase()) >= 0;
};

var sanitize = function (str) {
  return str.replace(/</, '&lt;').replace(/&/, '&amp;')
};

// function infoMessage(message) {
//   $("<div class='informative'></div>")
//     .html(message)
//     .appendTo("#chathistory");
//   scrollDown();
// };
