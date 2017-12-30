var xml2js = require('xml2js');
var FeedParser = require('feedparser');
var request = require('request');
var moment = require('moment');
var OAuth = require('oauth');
var async = require('async');
var config = require('./config');

var Interface = exports;
var Book = {
  Shelves: {
    Read: 0,
    Currently: 1,
    Other: 2,
  },
};
var DECIMAL_RADIX = 10;

Interface.STATUS_FEED_BASE = 'http://www.goodreads.com/user_status/list/';
Interface.FEED_BASE = 'http://www.goodreads.com/review/list.xml?v=2&key=' + config.key + '&id=';
Interface.CHALLENGE = 'http://www.goodreads.com/user_challenges/widget/';
Interface.QUERY_FEED = '&search[query]=';

var oauth = new OAuth.OAuth(
  'http://www.goodreads.com/oauth/request_token',
  'http://www.goodreads.com/oauth/access_token',
  config.key,
  config.secret,
  '1.0A',
  null,
  'HMAC-SHA1',
);


/**
 *
 * @param {Book} book
 * @param userIdName
 * @param callback
 */
Interface.completeBookInfo = function (book, userIdName, callback) {
  if (book.getShelf() !== 2) return callback(null);
  var escapedTitle = book.getTitle().replace(/&/g, '').replace(/\s/g, '+').replace(/\./g, '');
  var feedUrl = Interface.FEED_BASE + userIdName + Interface.QUERY_FEED + escapedTitle;
  oauth.get(feedUrl, config.token, config.token_secret, function (err, body, response) {
    if (err || response.statusCode !== 200) return callback(null); // ignore error
    var xmlParser = new xml2js.Parser();
    xmlParser.parseString(body, function (xmlErr, result) {
      if (xmlErr) return callback(xmlErr);
      var numReviews = parseInt(result.reviews['@'].total, DECIMAL_RADIX);
      if (numReviews === 0) return callback(null);
      var reviews = (numReviews === 1) ? [result.reviews.review] : result.reviews.review;
      async.each(reviews, function (review, cb) {
        // Is the same book!! The prince..
        if (areTheSame(review.book, book.getTitle(), book.getTotalPages())) {
          if (review.read_at.length > 0) { // Read!!!
            var read = moment(review.read_at).valueOf();
            book.setFinishedOn(read);
            book.addStatusUpdate(book.getTotalPages(), read);
          } else {
            book.setShelf(Book.Shelves.Currently);
          }
        }
        cb(null);
      }, callback);
    });
  });
};


function areTheSame(reviewBook, bookTitle, bookPages) {
  var escapedTitle = bookTitle.replace(/(\.\.\.)/, '');
  var reviewTitle = reviewBook.title.trim();
  if ((reviewTitle.indexOf(escapedTitle) === 0)) { // Begins with the title
    var reviewPages = parseInt(reviewBook.num_pages, DECIMAL_RADIX) || 0;
    if (bookPages === 0 || reviewPages === 0 || bookPages === reviewPages) {
      return true;
    }
  }
  return false;
}

/**
 *
 * @param userIdName
 * @param page
 * @param callback
 */
Interface.parseUpdatesPage = function (userIdName, page, callback) {
  var url = Interface.STATUS_FEED_BASE + userIdName + '?format=rss&page=' + page;
  var req = request(url);
  var feedparser = new FeedParser();
  var articles = [];

  req.on('error', function (error) {
    return callback(error);
  });

  req.on('response', function (res) {
    var stream = this; // `this` is `req`, which is a stream

    if (res.statusCode !== 200) {
      this.emit('error', new Error('Bad status code'));
    } else {
      stream.pipe(feedparser);
    }
  });

  feedparser.on('error', function (error) {
    return callback(error);
  });

  feedparser.on('readable', function () {
    var stream = this;
    var article;
    while ((article = stream.read())) {
      articles.push(article);
    }
  });

  feedparser.on('end', function () {
    callback(null, articles);
  });
};

Interface.getReadGoal = function (userIdName, challengeId, callback) {
  var url = Interface.CHALLENGE + userIdName + '?challenge_id=' + challengeId;
  request(url, function (error, response, body) {
    if (error) return callback(error);
    var myRe = /(\d+) book(s?) toward\\n {13}her goal of\\n {13}(\d+)/g;
    var stats = myRe.exec(body);
    callback(null, parseInt(stats[1], 10), parseInt(stats[3], 10));
  });
};

