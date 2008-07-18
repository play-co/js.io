var CHANNEL = "#orbited"
var IRC_SERVER = 'irc.freenode.net'
var IRC_PORT = 6667

var orig_domain = document.domain;
var nickname = null;
var users = {};

var irc = new IRCClient();

var connect = function () {
  nickname = $("#nickname").val();
  irc.onmessage = function (sender, message) {
    messagediv = $('<div class="message"></div>');
    if (sender == nickname)
      messagediv.addClass("self");
    messagediv.html('<span class="user">' + sender + ':</span> ' + sanitize(message))
      .appendTo("#chathistory");
    scrollDown();
  };
  irc.onnames = function (namelist) {
    $('#signin_popup, #absorb_clicks').hide();
    $('#chatbox_input').focus();
    
    for (var i=0; i < namelist.length; i++) {
      var name = namelist[i];
      if ($.trim(name) != "")
        users[name] = null;
    };
    fillUserList();
  };
  irc.onident = function() {
    irc.nick(nickname);
    irc.ident(nickname, '8 *', nickname);
    irc.join(CHANNEL);
  }
  irc.onjoin = function(joiner) {
    users[joiner] = null;
    fillUserList();
    infoMessage(joiner, 'has joined')
  }
  irc.onpart = irc.onquit = function(leaver, message) {        
    infoMessage(leaver, 'left')
    delete users[name];
    $(".user_list #user_" + name).remove()
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

var fillUserList = function () {
  $('.user_list').empty();
  var list = [];
  for (var user in users) {
    list.push(user);
  };
  list.sort()
  for (var i=0; i < list.length; i++) {
    var user = list[i];
    $('<div class="user_entry" id="user_' + user + '">' + user + '</div>')
      .appendTo("#user_list");
  };
};

var scrollDown = function () {
  var box = $('#chathistory')[0];
  box.scrollTop = box.scrollHeight;
}

var sanitize = function (str) {
  return str.replace(/</, '&lt;').replace(/&/, '&amp;');
};

function infoMessage(user, message) {
  $("<div class='informative'></div>")
    .html("<span class='user'>" + user + '</span> ' + message)
    .appendTo("#chathistory");
  scrollDown();
};
