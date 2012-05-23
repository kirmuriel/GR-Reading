
var  xml2js = require('xml2js');
var request = require('request');
var moment = require('moment');


var parser = new xml2js.Parser();

var Util = function () {};

var ReviewResponse = {reviews:{'@':{total:0}, review:{book:{num_pages:0,title:""}, read_at:0}}};

Util.OFFSET = {
	1270368000000:-5, 1288508400000:-6, 1301817600000:-5,
	1319958000000:-6, 1333267200000:-5, 1351407600000:-6,
	1365321600000:-5, 1382857200000:-6, 1396771200000:-5,
	1414306800000:-6};

Util.HOUR_IN_MILLISEC = 3600000;
Util.DAY_IN_MILLISEC = 24 * Util.HOUR_IN_MILLISEC;

/**
 * Returns the UTC time of a given date based on the hardcoded timezone offset
 * @see Util.OFFSET
 * @param {Number} date Local date to convert to UTC
 * @return {Number} UTC date
 */
Util.getMyUTCDate = function (date) {
	if(date===0) return 0;
	var offsetHours = 0, beginDate;
	// Search time offset. hardcoded
	for (beginDate in Util.OFFSET){
		if(Util.OFFSET.hasOwnProperty(beginDate) && (beginDate > date)){
			offsetHours = Util.OFFSET[beginDate];
			break;
		}
	}
	// Change timezone, remove offset hours
	return (date + (Util.HOUR_IN_MILLISEC * offsetHours));
};
/**
 * Converts a local date to UTC and removes the time section
 * @param {Number} date Local date to get the UTC day
 * @return {Number} UTC day
 */
Util.getMyUTCDay = function (date) {
	date = Util.getMyUTCDate(date);
	// Remove time section
	return date - (date % Util.DAY_IN_MILLISEC);
};
/**
 * Converts a map to two arrays
 * @param {Object} map
 * @param {String} keyLabel
 * @param {String} valueLabel
 * @return {Object} A map containing two column arrays
 */
Util.mapToArrays = function (map, keyLabel, valueLabel) {
	var arrays = {}, values = [], keys = Object.keys(map);
	if (map == undefined || keyLabel == undefined || valueLabel == undefined) {
		return {};
	}
	for (var i = 0; i < arrays[keyLabel].length; i++) {
		values.push(map[keys[i]]);
	}
	arrays[valueLabel] = values;
	arrays[keyLabel] = keys;
	return arrays;
};
/**
 * Sorts an array of objects by their date attribute
 * @param {Array} array Array to be sorted
 */
Util.sortByDate = function(array) {
	var sorter = function (a, b) {
		return ( b.date - a.date);
	};
	array.sort(sorter);
};


var Book = {
	toString:function () {
		return "(" + this.shelf + ")" + this.bookId + "= " + this.title + "[" + this.totalPages + "]";
	},
	getShelf : function() {
		return this.shelf;
	},
	getTotalPages : function() {
		return this.totalPages;
	},
	getTitle : function() {
		return this.title;
	},
	getFinishedOn : function() {
		return Util.getMyUTCDate(this.finishedOn);
	},
	getHash : function() {
		return this.hash;
	},
	setShelf : function(shelf) {
		this.shelf = shelf;
	},
	setTitle : function(title) {
		this.title = title;
	},
	setFinishedOn : function(finishedOn) {
		this.finishedOn = finishedOn;
		if (finishedOn != 0) {
			this.setShelf(Book.Shelves.Read);
		}
	},
	setBookId : function(bookId) {
		this.bookId = bookId;
	},
	/**
	 * @param {Number} page
	 * @param {Number} date
	 */
	addStatusUpdate : function(page, date) {
		this.rawReadUpdates.push({page : page, date : date});
		this.needsUpdate = true;
	}
};
Book.createBook = function (title, hash) {
	return Object.create(Book,{
		title:{value:title, enumerable:true, writable: true},
		hash:{value:hash, enumerable:true},
		rawReadUpdates:{value:[], enumerable:true, writable: true},
		dailyUpdates:{value:null, enumerable:true, writable: true},
		totalPages:{value:0, enumerable:true, writable: true},
		finishedOn:{value:0, enumerable:true, writable: true},
		shelf:{value:Book.Shelves.Other, enumerable:true, writable: true},
		needsUpdate:{value:true, enumerable:true, writable: true},
		bookId:{value:-1, enumerable:true, writable: true},
		setTotalPages:{value: function(totalPages) {
				this.totalPages = totalPages;
			},enumerable:true },
		getStatusUpdates : {value:getStatusUpdates,enumerable:true}
	});
};

Book.STATUS_FEED_BASE = "http://www.goodreads.com/user_status/list/";
Book.FEED_BASE = "http://www.goodreads.com/review/list.xml?v=2&key=0Ocs0PYjLa4tMbFPOC3chg&id=";
Book.READ_QUERY_FEED = "&shelf=read&search[query]=";
Book.CURRENTLY_READING_FEED = "&shelf=currently-reading&search[query]=";

	/**
	 * @param {Function} callback function(err)
	 */
	var getStatusUpdates = function(callback) {
		if (this.dailyUpdates == null || this.needsUpdate) {
			this.dailyUpdates = {};

			if (this.finishedOn != 0 && this.totalPages != 0) {
				this.dailyUpdates[Util.getMyUTCDay(this.finishedOn)] = this.totalPages;
			}
			Util.sortByDate(this.rawReadUpdates);
			var self = this;
			var count = self.rawReadUpdates.length;
			if(count===0){
				self.needsUpdate = false;
				callback(null);
				callback = function(){};
				return;
			}
			this.rawReadUpdates.forEach(function (rawUpdate) {
				if (Math.random()*100 > 70){
					//console.log(rawUpdate['date']);
					//console.log(Util.getMyUTCDay(rawUpdate['date']));
					//console.log(self.title, self.bookId);
				}
				if (self.dailyUpdates[Util.getMyUTCDay(rawUpdate['date'])] == undefined) {
					self.dailyUpdates[Util.getMyUTCDay(rawUpdate['date'])] = rawUpdate['page'];
				}
				if (--count <= 0) {
					self.needsUpdate = false;
					callback(null);
				}
			});
		}else{
			callback(null);
		}
	};


	Book.completeInfo = function(userIdName, callback) {
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
		request(feedUrl, function (err, response, body) {
			if (!err && response.statusCode == 200) {
				/** @var {ReviewResponse} result */
				parser.parseString(body, function (err, result) {
					if(err) return callback(err);
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
							var pagesCondition = (pages == 0 || pages == {} || self.getTotalPages() == 0 || (self.getTotalPages() == pages)); // kjc divide condition
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
					callback(null);

				});
			}else{
				callback(err);
			}
		});
	};

Book.Shelves = {
	Read:0,
	Currently:1,
	Other:2
};
Book.Util = Util;
module.exports = Book;

