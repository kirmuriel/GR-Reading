var moment = require('moment');
var crypto = require('crypto');
var Book = require('./Book');

var DECIMAL_RADIX = 10;


/**
 * Examples:
 * Isabel is on page 100 of 256 of Deceived (Star Wars
 * Isabel is finished with The Pearl
 * Isabel is reading El Lobo Estepario
 */

function parseStatusUpdate(entry) {
  var chars;
  var updateText = entry.title;
  var update = {};

  update.date = moment(entry.pubDate).valueOf();
  update.type = Library.StatusUpdateTypes.Other;
  if (updateText.indexOf(' is finished with ') > 0) {
    chars = updateText.match(/ is finished with (.*)/);
    update.bookTitle = chars[1];
    update.finishedOn = update.date;
    update.type = Library.StatusUpdateTypes.Finish;
  } else if (updateText.indexOf(' is reading ') > 0) {
    chars = updateText.match(/ is reading (.*)/);
    update.bookTitle = chars[1];
    update.page = 0;
    update.type = Library.StatusUpdateTypes.Start;
  } else if (updateText.indexOf(' is on page ') > 0) {
    // name page total title
    chars = updateText.match(/ is on page (\d+) of (\d+) of (.*)/);
    if (chars) {
      update.bookTitle = chars[3];
      update.totalPages = parseInt(chars[2], DECIMAL_RADIX);
    } else { // No total pages : name page title
      chars = updateText.match(/ is on page (\d+) of (.*)/);
      update.bookTitle = chars[2];
      update.totalPages = 0;
    }
    update.page = parseInt(chars[1], DECIMAL_RADIX);
    update.type = Library.StatusUpdateTypes.OnPage;
  }
  return update;
}

var Library = function () {
  /**
   * key = Update book title, value = hash of update book title
   * @var {Array} titlehash
   */
  this.titleHash = {};
  /**
   * key = hash, value = Book
   * @var Book[string]
   */
  this.books = {};
  this.hashes = [];
};

Library.StatusUpdateTypes = {
  Other: 0,
  OnPage: 1,
  Start: 2,
  Finish: 3,
};
/**
 * private
 * @param {String} updateBookTitle
 * @return Book
 */
Library.prototype.getUpdateBook = function (updateBookTitle) {
  if (!(this.titleHash[updateBookTitle])) {
    var hash = crypto.createHash('md5').update(updateBookTitle).digest('hex').substr(0, 9);
    this.titleHash[updateBookTitle] = hash;
    this.books[hash] = Book.createBook(updateBookTitle, hash);
    this.hashes.push(hash);
  }
  return this.books[this.titleHash[updateBookTitle]];
};

Library.prototype.addUpdate = function (entry) {
  var update = parseStatusUpdate(entry);
  if (update.type !== 0) {
    var book = this.getUpdateBook(update.bookTitle);
    switch (update.type) {
      case Library.StatusUpdateTypes.OnPage:
        book.setTotalPages(update.totalPages);
        book.addStatusUpdate(update.page, update.date);
        break;
      case Library.StatusUpdateTypes.Finish:
        book.setFinishedOn(update.finishedOn);
        break;
      case Library.StatusUpdateTypes.Start:
        book.addStatusUpdate(update.page, update.date);
        break;
      default:
    }
  }
};

/**
 * @return Book[]
 */
Library.prototype.getBooks = function () {
  var books = [];
  Object.values(this.books).forEach(function (book) {
    books.push(book);
  });
  return books;
};

module.exports = Library;
