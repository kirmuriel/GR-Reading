
var  xml2js = require('xml2js');
var request = require('request');
var moment = require('moment');


var parser = new xml2js.Parser();

var Util = function () {};

Util.OFFSET = {1270368000:-5, 1288508400:-6, 1301817600:-5,
	1319958000:-6, 1333267200:-5, 1351407600:-6,
	1365321600:-5, 1382857200:-6, 1396771200:-5,
	1414306800:-6};

Util.HOUR_IN_SEC = 3600;


Util.getOffset = function (date) {
	var current_offset = 0;
	var i;
	// Search time offset hardcoded
	for (i = 0; i < Util.OFFSET.length; i++) {
		var begin_date = Util.OFFSET[i];
		if (begin_date > date) {
			break;
		}
		current_offset = Util.OFFSET[i];
	}
	// Change timezone
	//var current_date = ;
	// Remove hour
	return (date + (Util.HOUR_IN_SEC * current_offset));
};

Util.getDay = function (date) {
	date = Util.getOffset(date);
	// Remove hour
	return date - (date % 86400);
};

Util.mapToColumnArrays = function (map, columnLabels) {
	if (map == undefined || columnLabels == undefined || columnLabels.length !=2) {
		return {};
	}
	var array = [];
	array[columnLabels[0]] = [];
	array[columnLabels[1]] = [];

	for (var key in map) {
		if(map.hasOwnProperty(key)){
			array[columnLabels[0]].push(key);
			array[columnLabels[1]].push(map[key]);
		}

	}
	return array;
};

Util.sortByDate = function(array) {
	var sorter = function (a, b) {
		return ( b.date - a.date);
	};
	array.sort(sorter);
};

/**
 * Creates a new Book.
 * @constructor
 * @param {string} title the title
 * @param {string} hash
 */
var Book = function (title, hash) {
	this.title = title;
	this.hash = hash;
	this.rawReadUpdates = [];
	this.dailyUpdates = null;
	this.totalPages = this.lastUpdateDate = this.finishedOn = 0;
	this.shelf = Book.Shelves.Other;
	this.needsUpdate = true;
	this.bookId = -1;
};

Book.STATUS_FEED_BASE = "http://www.goodreads.com/user_status/list/";
Book.FEED_BASE = "http://www.goodreads.com/review/list.xml?v=2&key=0Ocs0PYjLa4tMbFPOC3chg&id=";
Book.READ_QUERY_FEED = "&shelf=read&search[query]=";
Book.CURRENTLY_READING_FEED = "&shelf=currently-reading&search[query]=";

Book.prototype = {
	toString:function () {
		return "(" + this.shelf + ")" + this.bookId + "= " + this.title + "[" + this.totalPages + "]";
	}
};

	/**
	 * @return int shelf
	 */
	Book.prototype.getShelf = function() {
		return this.shelf;
	};

	/**
	 * @return int totalPages
	 */
	Book.prototype.getTotalPages = function() {
		return this.totalPages;
	};

	/**
	 * @return {string} title
	 */
	Book.prototype.getTitle = function() {
		return this.title;
	};

	/**
	 * @return int finishedOn
	 */
	Book.prototype.getFinishedOn = function() {
		return Util.getOffset(this.finishedOn);
	};

	/**
	 * @return int bookId
	 */
	Book.prototype.getBookId = function() {
		return this.bookId;
	};

	/**
	 * @return string hash
	 */
	Book.prototype.getHash = function() {
		return this.hash;
	};

	/**
	 * @param shelf
	 */
	Book.prototype.setShelf = function(shelf) {
		this.shelf = shelf;
	};

	/**
	 * @param totalPages
	 */
	Book.prototype.setTotalPages = function(totalPages) {
		this.totalPages = totalPages;
	};

	/**
	 * @param title
	 */
	Book.prototype.setTitle = function(title) {
		this.title = title;
	};

	/**
	 * @param finishedOn
	 */
	Book.prototype.setFinishedOn = function(finishedOn) {
		this.finishedOn = finishedOn;
		if (finishedOn != 0) {
			this.setShelf(Book.Shelves.Read);
		}
	};

	/**
	 * @param bookId
	 */
	Book.prototype.setBookId = function(bookId) {
		this.bookId = bookId;
	};

	Book.prototype.addStatusUpdate = function(page, date) {
		this.rawReadUpdates.push({page : page, date : date});
		this.needsUpdate = true;
	};

	/**
	 * @param {function} callback callback(self)
	 */
	Book.prototype.getStatusUpdates = function(callback) {
		if (this.dailyUpdates == null || this.needsUpdate) {
			this.dailyUpdates = {};

			if (this.finishedOn != 0 && this.totalPages != 0) {
				this.dailyUpdates[Util.getDay(this.finishedOn)] = this.totalPages;
			}
			Util.sortByDate(this.rawReadUpdates);
			var self = this;
			this.rawReadUpdates.forEach(function (rawUpdate, index, array) {
				if (self.dailyUpdates[Util.getDay(rawUpdate['date'])] == undefined) {
					self.dailyUpdates[Util.getDay(rawUpdate['date'])] = rawUpdate['page'];
				}
				if (index == array.length - 1) {//kjc change to boolean
					self.needsUpdate = false;
					callback(self);//this
				}
			});
		}else{
			callback(this);
		}
	};


	Book.prototype.completeInfo = function(userIdName, callback) {
		var escaped_title =  this.getTitle().replace(/\s/g ,"+").replace(/\./g,"");
		var feedUrl = Book.FEED_BASE + userIdName + Book.CURRENTLY_READING_FEED + escaped_title;
		var needsReadDate = true;
		if (this.getShelf() == Book.Shelves.Other) {
			needsReadDate = true;
			feedUrl = Book.FEED_BASE + userIdName + Book.CURRENTLY_READING_FEED + escaped_title;
		} else if (this.getShelf() == Book.Shelves.Read) {
			feedUrl = Book.FEED_BASE + userIdName + Book.READ_QUERY_FEED + escaped_title;
			needsReadDate = false;
		}
		var self = this;
		request(feedUrl, function (error, response, body) {
			if (!error && response.statusCode == 200) {
				parser.parseString(body, function (err, result) {
					if(err)console.log(err);
					var numReviews = result.reviews['@'].total;
					if(numReviews==0){
						console.log("Book %s has 0 reviews",self.title);
					}else{
						var reviews = [];
						if (numReviews == 1) {
							reviews.push(result.reviews.review);
						} else {
							reviews = result.reviews.review;//@kjc huck finn???
						}
						for (var i = 0; i < reviews.length; i++) {
							var review = reviews[i];
							var pages = parseInt(review.book.num_pages) | 0;
							var pagesCondition = (pages == 0 || pages == {} || self.getTotalPages() == 0 || (self.getTotalPages() == pages));
							var read = 0;
							if (needsReadDate) {
								read = new moment(review.read_at).valueOf();
							}
							var trimmedTitle = self.getTitle().replace(/(\.\.\.)/, '');
							var bookTitle = review.book.title.trim();
							if ((bookTitle.indexOf(trimmedTitle) == 0) && pagesCondition ) {
								if (!read && self.getShelf() == Book.Shelves.Other){
									console.log("Book %s not read currently?", self.title);
								}else{
									var bookID = parseInt(review.id);
									self.setTitle(bookTitle);
									self.setBookId(bookID);
									if (read && self.getShelf() == Book.Shelves.Other) {
										self.setFinishedOn(read);
									}
								}
							}
						}
					}
					callback(self);
				});
			}
		});
	};

	Book.prototype.getStatusUpdatesWithDelta = function(callback) {
		this.getStatusUpdates(function(book){
			callback(Util.mapToColumnArrays(book.dailyUpdates, ['date', 'page']));
		});
	};

Book.Shelves = {
	Read:0,
	Currently:1,
	Other:2
};
Book.Util = Util;
module.exports = Book;

