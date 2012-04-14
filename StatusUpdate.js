/**
 * Examples:
 * Isabel is on page 100 of 256 of Deceived (Star Wars
 * Isabel is finished with The Pearl
 * Isabel is reading El Lobo Estepario
 */

var moment = require('moment');

var StatusUpdateTypes = {
	Other:0,
	OnPage:1,
	Start:2,
	Finish:3
};

var StatusUpdate = function (entry) {
	var chars;
	var update = entry.title;
	this.date = moment(entry.pubDate).valueOf()/1000;
	this.type = StatusUpdateTypes.Other;
	if (update.indexOf(" is finished with ") > 0) {
		chars = update.match(/ is finished with (.*)/);
		this.bookTitle = chars [1];
		this.finishedOn = this.date;
		this.type = StatusUpdateTypes.Finish;
	} else if (update.indexOf(" is reading ") > 0) {
		chars = update.match(/ is reading (.*)/);
		this.bookTitle = chars [1];
		this.page = 0;
		this.type = StatusUpdateTypes.Start;
	} else if (update.indexOf(" is on page ") > 0) {
		// name page total title
		chars = update.match(/ is on page (\d+) of (\d+) of (.*)/);
		if (chars) {//.length
			this.bookTitle = chars [3];
			this.totalPages = parseInt(chars [2]);
		} else { //No total pages : name page title
			chars = update.match(/ is on page (\d+) of (.*)/);
			this.bookTitle = chars [2];
			this.totalPages = 0;
		}
		this.page = parseInt(chars [1]);
		this.type = StatusUpdateTypes.OnPage;
	}
};

StatusUpdate.prototype = {
	finishedOn:0,
	bookTitle:"",
	page:0,
	totalPages:0,
	date:0,
	type:StatusUpdateTypes.Other
};

exports.StatusUpdate = StatusUpdate;
exports.StatusUpdateTypes = StatusUpdateTypes;