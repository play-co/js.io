// Chat Control

/** @namespace */
var gp = YAHOO.namespace("gp");

var Dom = YAHOO.util.Dom;
var Event = YAHOO.util.Event;

/**
    Instantiates a new panel, which must later be rendered with the {@link #render} method.
    @class
*/
gp.ChatPanel = function () {
    
    /** Fired when the user wants to send a chat messsage. */
    this.sendEvent = new YAHOO.util.CustomEvent('send', this);
    
    // Prepare the Chat History skeleton
    this.historyDiv = document.createElement('div');
    Dom.addClass(this.historyDiv, 'chat-history');
    this.historyDiv.innerHTML = '<table width="100%" height="100%" class="alignbottom"><tbody><tr valign="bottom"><td>' +
                                    '<table class="history" cellpadding="0" cellspacing="0"><tbody></tbody></table>' +
                                '</tr></td></tbody></table>';
    
    this.inputBox = document.createElement('textarea');
    Dom.setStyle(this.inputBox, 'width', '100%');
    Dom.setStyle(this.inputBox, 'margin', '0');
    Dom.setStyle(this.inputBox, 'padding', '0');
    // Disable Safari/Webkit dynamic textarea resizing
    Dom.setStyle(this.inputBox, 'resize', 'none');
    
    this.inputKeyListener = new YAHOO.util.KeyListener(this.inputBox,
                { keys: 13 }, { fn: this._onEnter, scope: this, correctScope: true });
    this.inputKeyListener.enable();
};

gp.ChatPanel.prototype = {
    
    /**
        Called when the keyboard receives the ENTER key.
        @private
    */
    _onEnter: function(e, args) {
        // args[0] == keyCode
        // args[1] == KeyboardEvent instance
        var html = this.inputBox.value;
        this.inputBox.value = "";
        Event.stopEvent(args[1]);
        
        this.sendEvent.fire(html);
    },
    
    /**
        Scroll the chat history window to the bottom after appending a new message,
        UNLESS the window is sufficiently scrolled above the bottom already.
    */
    scrollToBottom: function () {
        var AUTOSCROLL_DELTA = 50; // Number of pixels allowed to *still* apply autoscroll
        if(this.historyDiv.scrollTop < this.historyDiv.scrollHeight - AUTOSCROLL_DELTA - this.historyDiv.clientHeight) {
            return;
        }
        this.historyDiv.scrollTop = this.historyDiv.scrollHeight;
    },
    
    /**
        Add a chat message to the chat history. (Use {@link addChatMessage} and variants instead.)
        @param username
        @param {String} message text in HTML format (will not be escaped)
        @param rowClass         a CSS class to provide to the row for styling purposes
    */
    addMessage: function (username, message, rowClass) {
        var table = YAHOO.util.Selector.query("table.history", this.historyDiv, true);
        
        // IE6 doesn't like using innerHTML to modify a table, so we'll do it the hard way
        var usernameSpan = document.createElement('td');
        Dom.addClass(usernameSpan, 'username');
        usernameSpan.innerHTML = username;
    
        var messageSpan = document.createElement('td');
        Dom.addClass(messageSpan, 'message');
        messageSpan.innerHTML = message;
        
        var tr = table.insertRow(-1);
        tr.appendChild(usernameSpan);
        tr.appendChild(messageSpan);
        if(rowClass) {
            Dom.addClass(tr, rowClass);
        }
        
        //table.tBodies[0].appendChild(tr);
        
        // Scroll to the bottom
        this.scrollToBottom();
    },
    
    /**
        Add a chat message, passing the chat object returned from downstream.
    */
    addChatMessage: function (o) {
        this.addMessage(o.username + "&gt;", o.text, "chatMessage");
    },

    /**
        Must be called to render this onto a layout.
        @param container    The element to render onto
        @param parentLayout The YUI Layout this inherits from.
    */
    render: function (container, parentLayout) {
        parentLayout = parentLayout || null; 
        this.layout = new YAHOO.widget.Layout(container, {
            parent: parentLayout,
            units: [
                {
                    position: 'center',
                    body: this.historyDiv
                },
                {
                    position: 'bottom',
                    body: this.inputBox,
                    height: 35,
                    minHeight: 25,
                    maxHeight: 100,
                    gutter: '5 0 0 0',
                    resize: true
                }
            ]
        });
        
        // Automatically resize the input box when the layout changes;
        // non-IE6 could have used 100% height in the textarea's CSS, but for now
        // all browsers will resize the inputbox textarea using this code:
        function recalcInputHeight() {
            var e = this.layout.getUnitByPosition('bottom');
            Dom.setStyle(this.inputBox, 'height', e.body.clientHeight + 'px');
        }
        this.layout.on('render', recalcInputHeight, this, true);
        this.layout.on('resize', recalcInputHeight, this, true);
        this.layout.render();
        this.inputBox.focus();
    }
    
};