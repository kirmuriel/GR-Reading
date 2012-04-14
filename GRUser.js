var Library = require('./Library');
var moment = require('moment');
var request = require('request');

var FeedParser = require('feedparser')
	, parser = new FeedParser();

var GRUser = function (userIdName) {
	var matches = userIdName.match(/(\d+)-(\w.+)/);
	this.userName = matches [2];
	this.userId = matches [1];
};

GRUser.STATUS_FEED_BASE = "http://www.goodreads.com/user_status/list/";
GRUser.FEED_BASE = "http://www.goodreads.com/review/list.xml?v=2&key=0Ocs0PYjLa4tMbFPOC3chg&id=";
GRUser.READ_QUERY_FEED = "&shelf=read&search[query]=";
GRUser.CURRENTLY_READING_FEED = "&shelf=currently-reading&search[query]=";

GRUser.prototype = {
	  userName:""
	, userId:""
	, library:null
	, properName:function () {
		return this.userName.replace(/\w\S*/g, function (txt) {
			return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
		});
	}
	, userIdName:function () {
		return this.userId + "-" + this.userName;
	}
};

GRUser.prototype.getLibrary = function (max_page, callback) {
	class_debug("In getLibrary");
	if (!this.library) {
		class_debug("from rss");
		//Books with status updates
		this.library = new Library();
		var self = this;
		var pagesRead = 0;
		var lastPage = false;
		for (var page = 1; page <= max_page; page++) {
			var reqObj = {'uri':GRUser.STATUS_FEED_BASE + self.userIdName() + "?format=rss&page=" + page};
			class_debug(reqObj);
			request(reqObj, function (error, response, body) {
				if (error) {
					console.error(error);
					callback(null);
				} else {
					parser.parseString(body, function (error, meta, articles) {
						if (error) {
							console.error(error);
							callback(null);
						} else {
							lastPage = (++pagesRead == max_page);
							var lastEntry = false;
							var entriesRead = 0;
							articles.forEach(function (entry, index, array) {
								//console.log(max_page, index, array.length, articles.length);
								self.library.addUpdate(entry);
								lastEntry = (++entriesRead == articles.length);
								if (lastEntry && lastPage) {
									callback(self.library);
								}
								//console.log(update.date.format("dddd, MMMM Do YYYY, h:mm:ss a") + " " + update.bookTitle + ":" + update.page);
							});
						}
					});
				}
			});
		}
		console.log("get library end end !!!~~!!!~~");
	}
};

function class_debug () {
	for (var i=0; i<arguments.length; i++){
		 console.log(arguments[i]);
		}
}
GRUser.getTime = function () {
	return moment.utc().valueOf();
};
module.exports = GRUser;
//exports.GRUser = GRUser;
