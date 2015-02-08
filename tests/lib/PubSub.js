var PubSub = jsio('import lib.PubSub as PubSub');

describe('lib', function () {
  describe('PubSub', function () {
    beforeEach(function () {
      this.obj = new PubSub();
      this.other = new PubSub();
    });

    after(function () {
      delete this.obj;
      delete this.other;
    });

    describe('#listenTo', function () {
      it('should run callbacks when events fire', function () {
        var thing = new PubSub();
        var cbRan = false;
        this.obj.listenTo(this.other, 'ping', function () {
          cbRan = true;
        });
        this.other.publish('ping');
        assert(cbRan);
      });
    });

    describe('#stopListening', function () {
      describe('with no arguments', function () {
        it('should stop listening to all objects', function () {
          var cbRan = false;
          this.obj.listenTo(this.other, 'ping', function () {
            cbRan = true;
          });

          this.obj.stopListening();
          this.other.publish('ping');

          assert(!cbRan);
        });
      });

      describe('with `obj` argument', function () {
        it('should only stop listening to obj', function () {
          var otherRan = false;
          var extraRan = false;

          var extra = new PubSub();

          // Listen to this.other and extra
          this.obj.listenTo(this.other, 'ping', function () {
            otherRan = true;
          });
          this.obj.listenTo(extra, 'ping', function () {
            extraRan = true;
          });

          // stop listening to extra
          this.obj.stopListening(extra);

          // Publish events on both
          this.other.publish('ping');
          extra.publish('ping');

          // Check that other ran but extra did not.
          assert(otherRan);
          assert(!extraRan);
        });
      });

      describe('with `obj` and `event` args', function () {
        it('should only stop listening to event', function () {
          var gotPing = false;
          var gotPong = false;
          this.obj.listenTo(this.other, 'ping', function () {
            gotPing = true;
          });
          this.obj.listenTo(this.other, 'pong', function () {
            gotPong = true;
          });

          this.obj.stopListening(this.other, 'pong');

          this.other.publish('ping');
          this.other.publish('pong');
          assert(gotPing);
          assert(!gotPong);
        });
      });

      describe('with `obj`, `event`, and `callback` args', function () {
        it('should stop firing only the given callback', function () {
          var gotPing = false;
          var gotPing2 = false;
          var onPing = function () {
            gotPing = true;
          };

          this.obj.listenTo(this.other, 'ping', onPing);
          this.obj.listenTo(this.other, 'ping', function () {
            gotPing2 = true;
          });

          this.obj.stopListening(this.other, 'ping', onPing);
          this.other.publish('ping');
          assert(!gotPing);
          assert(gotPing2);
        });
      });
    });

  });
});
