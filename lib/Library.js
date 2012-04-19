var Book = require('./Book');
var crypto = require('crypto');


var Library = function () {
	this.titleHash = {};
	this.books = {};
	this.hashes = [];
};


Library.prototype = {
	/**
	 * key = Update book title, value = hash of update book title
	 * @var array
	 */
	titleHash:{},
	/**
	 * key = hash, value = Book
	 * @var Book[string]
	 */
	books:{},
	hashes:[]

};


/**
 * private
 * @param updateBookTitle
 * @return Book
 */
Library.prototype.getUpdateBook = function (updateBookTitle) {
	if (!(this.titleHash[updateBookTitle])) {
		var hash = crypto.createHash('md5').update(updateBookTitle).digest('hex').substr(0,9);
		this.titleHash[updateBookTitle] = hash;
		this.books[hash] = new Book(updateBookTitle,hash);
		this.hashes.push(hash);
	}
	return this.books[this.titleHash[updateBookTitle]];
};

Library.prototype.addUpdate = function (entry) {
	var update = new StatusUpdate(entry);
	var bt = update.bookTitle;// Book title
	switch (update.type) {
		case StatusUpdateTypes.OnPage:
			this.getUpdateBook(bt).setTotalPages(update.totalPages);
			this.getUpdateBook(bt).addStatusUpdate(update.page, update.date);
			break;
		case StatusUpdateTypes.Finish:
			this.getUpdateBook(bt).setFinishedOn(update.finishedOn);
			class_log(this.getUpdateBook(bt).hash,"up fOn, b fOn",update.finishedOn,this.getUpdateBook(update.bookTitle).finishedOn);
			break;
		case StatusUpdateTypes.Start:
			this.getUpdateBook(bt).addStatusUpdate(update.page, update.date);
			break;
		default:
	}
};

/**
 * @return Book[]
 */
Library.prototype.getBooks = function () {
	var books = [];
	for (var bookHash in this.books) {
		if (this.books.hasOwnProperty(bookHash)) {
			books.push(this.books[bookHash]);
		}
	}
	return books;
};

/**
 * private
 * @param  hash
 * @return Book
 */
Library.prototype.getByHash = function (hash) {
	if (undefined == (this.books[hash])) {
		return null;
	}
	return this.books[hash];
};

/**
 * @function
 */
var class_log = require('./functions').class_log;

module.exports = Library;