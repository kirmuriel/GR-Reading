var Interface = require('./GRInterface');
var Util = function () {};

/*
* How to get offset?
* At DATE the time will change to TIME and TIME_ZONE
* TIME-TIME_ZONE*hour_in_sec = TIME_UTC
* UNIX(DATE+TIME_UTC) : TIME_ZONE
*
*
* */
Util.OFFSET = {
1270368000000: -5,
1288508400000: -6,
1301817600000: -5,
1319958000000: -6,
1333267200000: -5,
1349917200000: 2,
1351386000000: 1,
1364691600000: 2,
1375225200000:-5,
1380139200000: 2,
1382835600000: 1
};

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
	for (beginDate in Util.OFFSET){ //kjc async?
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
		return  this.bookId +":"+ "(" + this.shelf + ") "+ this.title + "[" + this.totalPages + "]";
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
		if (count === 0) {
			self.needsUpdate = false;
			callback(null);
			callback = function(){};
			return;
		}
		//@kjc user async each series
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
	var self = this;
	Interface.completeBookInfo(self, userIdName, callback);
};

Book.Shelves = {
	Read:0,
	Currently:1,
	Other:2
};
Book.Util = Util;
module.exports = Book;

