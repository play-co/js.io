// TODO refactor this code into a UI and non-UI part.

var CHANNEL = "#orbited"
var IRC_SERVER = 'irc.freenode.net'
var IRC_PORT = 6667

var nickname = null;
var users = {};

var irc = new IRCClient();
var log = getIrcLogger("Chat");

var connect = function () {
  $('#signin_popup, #absorb_clicks').hide();
  $('#chatbox_input').focus();
  $('#chatbox_input').val('')

  nickname = $("#nickname").val();

  function parseName(identity) {
    // TODO remove privileges from name head.
    return identity.split("!", 1)[0];
  }
  irc.onACTION = function(command) {
      var messagediv = $('<div class="message"></div>');
      var sender = parseName(command.prefix);
      messagediv.addClass("action");
      var target = command.args[0];
      var message = command.args.slice(1).join(" ")

      if (sender == nickname)
        messagediv.addClass("self");

      if (isSubstring(nickname, message))
        messagediv.addClass("mentioned");

      messagediv.html('<span class="user">' + sender + '</span> ' +
                      sanitize(message))
                .appendTo("#chathistory");
    scrollDown();
  }
  irc.onCTCP = function(command) {
    var messagediv = $('<div class="message"></div>');
    messagediv.addClass("ctcp");
    var message = command.args.slice(1).join(" ")
    var sender = parseName(command.prefix);
    messagediv.
       html('<span class="user">' + sender + '(CTCP):</span> ' + sanitize(message)).
       appendTo("#chathistory");    
    scrollDown();
  }
  irc.onPRIVMSG = function(command) {
    var sender = parseName(command.prefix);
    var target = command.args[0];
    var message = command.args[1];

    var messagediv = $('<div class="message"></div>');

    if (message.charCodeAt(0) == 1) {
      // This is an CTCP request.

      // NB: the embedded CTCP requests is:
      //        \x01<request>[ <arg>]+\x01
      //     eg:
      //      when we type "/me waves", we receive the following message:
      //        \x01ACTION waves\x01
      //     eg:
      //      after we connect, the freenode networks sends:
      //        \x01VERSION\x01
      // See http://www.invlogic.com/irc/ctcp.html
      // NB: CTCP draft talks about quoting but it does not actually
      //      define it.
      var args = message.slice(1, message.length - 1).split(' ');
      var request = args.shift();
      if (request == "ACTION") {
        message = args.join(" ");
        messagediv.addClass("action");
      } else {
        message = request + " " + args.join(" ");
        messagediv.addClass("ctcp");
      }
    }

    if (sender == nickname)
      messagediv.addClass("self");

    if (target == nickname)
      messagediv.addClass("private");

    if (isSubstring(nickname, message))
      messagediv.addClass("mentioned");

    messagediv.html('<span class="user">' + sender + ':</span> ' +
                    sanitize(message))
      .appendTo("#chathistory");
    scrollDown();
  };
  irc.onTOPIC = function(command) {
    // See http://tools.ietf.org/html/rfc2812#section-3.2.4
    // Args: <channel> [ <topic> ]

    var channel = command.args[0];
    if (channel != CHANNEL)
      return;

    var topic = command.args[1];

    var user = parseName(command.prefix);
    $("<div class='informative topic'></div>").
        html('<span class="user">' + user + '</span> changed the topic to: ' + sanitize(topic)).
        appendTo("#chathistory");
  };
irc.onerror = function(command) {
    var responseCode = parseInt(command.type);
    if (responseCode == 431 || responseCode == 432 || responseCode == 433) {
    // 431     ERR_NONICKNAMEGIVEN
    // 432     ERR_ERRONEUSNICKNAME
    // 433     ERR_NICKNAMEINUSE
        nickname += '_'
        irc.nick(nickname)
        irc.join(CHANNEL)
    }
}


  irc.onresponse = function(command) {
    var responseCode = parseInt(command.type);
    
    if (responseCode == 332) {
      // """
      // 331 RPL_NOTOPIC
      //     <target> <channel> :No topic is set
      // 332 RPL_TOPIC
      //     <target> <channel> :<topic>
      //
      // When sending a TOPIC message to determine the
      // channel topic, one of two replies is sent.  If
      // the topic is set, RPL_TOPIC is sent back else
      // RPL_NOTOPIC.
      // """ -- rfc2812

      var channel = command.args[1];
      if (channel != CHANNEL)
        return;

      var topic = command.args[2];

      $("<div class='informative topic'></div>").
        html("Channel topic is: " + sanitize(topic)).
        appendTo("#chathistory");
    } else if (responseCode == 353) {
      // 353 is the code for RPL_NAMEREPLY.

      // The args are:
      //
      // """
      //   <target> ( "=" / "*" / "@" ) <channel>
      //    :[ "@" / "+" ] <nick> *( " " [ "@" / "+" ] <nick> )
      //
      //   - "@" is used for secret channels, "*" for private
      //     channels, and "=" for others (public channels).
      // """ -- rfc2812

      var channel = command.args[2];
      if (channel != CHANNEL)
        return;

      var partialUserList = command.args[3].split(' ');
      for (var i = 0, l = partialUserList.length; i < l; ++i) {
        var name = $.trim(partialUserList[i]);
        if (name == "" || users[name])
          continue;
        addName(name);
      }
    } else if (responseCode == 366) {
      // 366 is the code for RPL_ENDOFNAMES.

      fillUserList();

      $("<div class='informative welcome'></div>").
        html("Joined " + CHANNEL + " channel.").
        appendTo("#chathistory");
      scrollDown();
    }
  };


  irc.onopen = function() {
    irc.nick(nickname);
    irc.ident(nickname, '8 *', nickname);
    irc.join(CHANNEL);
    
    // Once we have joined, don't leave without warning the user
    window.onbeforeunload = function() {
      return 'Are you sure you want to quit and lose the chat connection?';
    };
    $(window).unload(function() {
        hardquit();
//      quit();
    })
  }
  irc.onclose = function() {
    log.debug("closed...");  
  };
  irc.onNICK = function(command) {
    // See http://tools.ietf.org/html/rfc2812#section-3.1.2
    var previousNick = parseName(command.prefix);
    var newNick = command.args[0];
    userRenamed(previousNick, newNick);
  };
  // TODO implement onNOTICE...
  irc.onJOIN = function(command) {
    var joiner = parseName(command.prefix);

    addName(joiner);
    fillUserList();
  
    $("<div class='informative join'></div>")
      .html("<span class='user'>" + joiner + '</span> has joined ' + CHANNEL)
      .appendTo("#chathistory");         
    scrollDown();                        
  }                                      
  irc.onPART = function(command) {
    var leaver = parseName(command.prefix);
    var message = command.args.join(" ");

    $("<div class='informative part'></div>")
      .html("<span class='user'>" + leaver + '</span> left ' + CHANNEL +
            (message ? ' (“' + sanitize(message) + '”)' : ''))
      .appendTo("#chathistory");         
    scrollDown();                        
                                         
    removeName(leaver);                  
  }

  irc.onQUIT = function(command) {       
    var quitter = parseName(command.prefix);
    var message = command.args.join(" ");

    $("<div class='informative quit'></div>")
      .html("<span class='user'>" + quitter + '</span> quit' +
            (message ? ' (“' + sanitize(message) + '”)' : ''))
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
  // the IRC server will not echo our message back, so simulate a send.
  irc.onPRIVMSG({prefix:nickname,type:'PRIVMSG',args:[CHANNEL, msg]});
}
var hardquit = function() {
    irc.reset();
}
var quit = function () {
  // XXX sometimes the quit reason is not seen when we quit...
  //     probably because the browser is immediately closed
  //     without waiting for socket flush?
  irc.quit();
}

// TODO enable the nick change code.
// function nickChanged(newnick) {
//     userRenamed(nickname, newnick);
//     nickname = newnick;
// }

function userRenamed(oldname, newname) {
  $("<div class='informative rename'></div>")
    .html("<span class='user'>" + oldname + "</span> is now known as " +
          "<span class='user'>" + newname + "</span>")
    .appendTo("#chathistory");
  scrollDown();

  $(".user_list .user#user_" + oldname)
    .attr("id", "user_" + newname)
    .html(newname);
}

var user_priviledges = function (name) {
  var privs_symbols = {"@":"admin", "%":"subadmin", "+":"voice"};
  if (name[0] in privs_symbols) {
    return privs_symbols[name[0]];
  } else {
    return "";
  };
};

var addName = function (name) {
  // XXX this MUST remove the nick privileges from name (eg: because
  //     these prefixes are not sent when the user changed his nick,
  //     etc).
  var priviledges = user_priviledges(name);
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

var sanitize = (function(str) {
  // See http://bigdingus.com/2007/12/29/html-escaping-in-javascript/
  var MAP = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  };
  var repl = function(c) { return MAP[c]; };
  return function(s) {
    return s.replace(/[&<>'"]/g, repl);
  };
})();

// function infoMessage(message) {
//   $("<div class='informative'></div>")
//     .html(message)
//     .appendTo("#chathistory");
//   scrollDown();
// };
