var async = require('async');
var Library = require('./Library');
var Interface = require('./GRInterface');
var config = require('./config');

function classDebug() {
  for (var i = 0; i < arguments.length; i++) {
    // console.log(arguments[i]);
  }
}

var GRUser = function () {
  var userIdName = config.userIdName;
  var matches = userIdName.match(/(\d+)-(\w.+)/);
  this.userName = matches[2];
  this.userId = matches[1];
  this.library = null;
  this.challengeId = config.challengeId;
};

GRUser.prototype = {
  userIdName: function () {
    return this.userId + '-' + this.userName;
  },
};

GRUser.prototype.getLibrary = function (maxPage, callback) {
  classDebug('In getLibrary');
  if (this.library) return callback(null);
  classDebug('from rss');
  // Books with status updates
  this.library = new Library();
  var self = this;
  var page = 0;
  async.whilst(
    function () {
      return page < maxPage;
    },
    function (cb) {
      page += 1;
      Interface.parseUpdatesPage(self.userIdName(), page, function (err, updates) {
        if (err) return cb(err);
        updates.forEach(function (update) {
          self.library.addUpdate(update);
        });
        cb(null);
      });
    },
    function (err) {
      if (err) return callback(err);
      // kjc filter? if (book.getShelf() != 2) return callback(null);
      async.each(
        self.library.getBooks(),
        function (book, cb) {
          Interface.completeBookInfo(book, self.userIdName(), cb);
        }, callback,
      );
    },
  );
};


GRUser.prototype.getReadAndGoal = function (callback) {
  Interface.getReadGoal(this.userIdName(), this.challengeId, callback);
};

module.exports = GRUser;
