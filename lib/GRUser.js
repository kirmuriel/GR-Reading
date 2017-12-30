var Library = require('./Library')
  , Interface = require('./GRInterface')
  , config = require('./config')
  , async = require('async');

var GRUser = function() {
  var userIdName = config.userIdName;
  var matches = userIdName.match(/(\d+)-(\w.+)/);
  this.userName = matches [2];
  this.userId = matches [1];
  this.library = null;
  this.challengeId = config.challengeId;
};

GRUser.prototype = {
  userIdName: function() {
    return this.userId + "-" + this.userName;
  }
};

GRUser.prototype.getLibrary = function(max_page, callback) {
  class_debug("In getLibrary");
  if (this.library) return callback(null);
  class_debug("from rss");
  //Books with status updates
  this.library = new Library();
  var self = this;
  var page = 0;
  async.whilst(
    function() {
      return page < max_page;
    },
    function(cb) {
      page++;
      Interface.parseUpdatesPage(self.userIdName(), page, function(err, updates) {
        if (err) return cb(err);
        updates.forEach(function(update) {
          self.library.addUpdate(update)
        });
        cb(null)
      });
    },
    function(err) {
      if (err) return callback(err);
      // kjc filter? if (book.getShelf() != 2) return callback(null);
      async.each(self.library.getBooks(),
        function(book, cb) {
          Interface.completeBookInfo(book, self.userIdName(), cb);
        }, callback);
    }
  );
};


GRUser.prototype.getReadAndGoal = function(callback) {
  Interface.getReadGoal(this.userIdName(), this.challengeId, callback);
};

function class_debug() {
  for (var i = 0; i < arguments.length; i++) {
    //console.log(arguments[i]);
  }
}

module.exports = GRUser;