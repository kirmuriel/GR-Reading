
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

	/**
	 * @param hash
	 */
	Book.prototype.setHash = function(hash) {
		this.hash = hash;
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
			var self = this;
			this.rawReadUpdates.forEach ( function(rawUpdate, index, array) {
				if (self.dailyUpdates[Util.getDay(rawUpdate['date'])]== undefined) {
					self.dailyUpdates[Util.getDay(rawUpdate['date'])] = rawUpdate['page'];
				}
				if(index == array.length-1){
					self.needsUpdate = false;
					callback(self);
				}
			});
		}else{
			callback(this);
		}
	};


	Book.prototype.completeInfo = function(userIdName, callback) {
		var escaped_title =  this.getTitle().replace(/\s/g ,"+").replace(/\./g,"");
		class_log(this.hash,this.getTitle()+"=>"+escaped_title);
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
		class_log(self.hash,feedUrl);
		request(feedUrl, function (error, response, body) {
			class_log(self.hash, error);
			class_log(self.hash, response);
			class_log(self.hash, body);
			if (!error && response.statusCode == 200) {
				parser.parseString(body, function (err, result) {
					if(err)console.log(err);
					//console.log(result);
					//console.log(result.reviews['@'].total);
					var numReviews = result.reviews['@'].total;
					//console.log("Book %s has %s reviews",self.title,numReviews);
					if(numReviews==0){
						console.log("Book %s has 0 reviews",self.title);
					}else{
						var reviews = [];
						if (numReviews == 1) {
							reviews.push(result.reviews.review);
						} else {
							reviews.push(result.reviews.review[0]);//@kjc huck finn???
						}

						for (var i = 0; i < reviews.length; i++) {
							var review = reviews[i];
							var pages = parseInt(review.book.num_pages) | 0;
							var pagesCondition = (pages == 0 || pages == {} || self.getTotalPages() == 0 || (self.getTotalPages() == pages));
							class_log(self.hash, review);
							class_log(self.hash, self.getTitle() + " review pages: ", review.book.num_pages);
							var read = 0;

							if (needsReadDate) {
								read = new moment(review.read_at).valueOf();
								class_log(self.hash, "review.read_at", review.read_at, read);
							}
							var trimmedTitle = self.getTitle().replace(/(\.\.\.)/, '');
							var bookTitle = review.book.title.trim();
							class_log(self.hash, "title,booktitle,pages,read,needsup", trimmedTitle, bookTitle, pages, read, needsReadDate);

							class_log(self.hash, bookTitle.indexOf(trimmedTitle), pagesCondition);
							if ((bookTitle.indexOf(trimmedTitle) == 0) && pagesCondition ) {
								if (!read && self.getShelf() == Book.Shelves.Other){
									//console.log("not read currently?" + self.title);
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
					class_log(self.hash,'Done');
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
/**
 * @function
 */
var class_log = require('./functions').class_log;


//exports.Shelves = Shelves;
module.exports = Book;

