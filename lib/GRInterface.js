var Interface = exports
  , config = require('./config')
  , xml2js = require('xml2js')
  , fs = require('fs')
  , FeedParser = require('feedparser')
  , request = require('request')
  , moment = require('moment')
  , OAuth = require('oauth')
  , async = require('async');

var Book = {
  Shelves: {
    Read: 0,
    Currently: 1,
    Other: 2
  }
};


var ReviewResponse = { reviews: { '@': { total: 0 }, review: { book: { num_pages: 0, title: "" }, read_at: 0 } } };

Interface.STATUS_FEED_BASE = "http://www.goodreads.com/user_status/list/";
Interface.FEED_BASE = "http://www.goodreads.com/review/list.xml?v=2&key=" + config.key + "&id=";
//Interface.USER_BOOK = "https://www.goodreads.com/review/show_by_user_and_book.xml?key="+config.key+"&user_id="+user.user_id+"&book_id=";
Interface.CHALLENGE = "http://www.goodreads.com/user_challenges/widget/";
Interface.QUERY_FEED = "&search[query]=";


var oauth = new OAuth.OAuth(
  'http://www.goodreads.com/oauth/request_token',
  'http://www.goodreads.com/oauth/access_token',
  config.key,
  config.secret,
  '1.0A',
  null,
  'HMAC-SHA1'
);


/**
 *
 * @param {Book} book
 * @param userIdName
 * @param callback
 */
Interface.completeBookInfo = function(book, userIdName, callback) {
  if (book.getShelf() !== 2) return callback(null);
  var escaped_title = book.getTitle().replace(/&/g, "").replace(/\s/g, "+").replace(/\./g, "");
  var feedUrl = Interface.FEED_BASE + userIdName + Interface.QUERY_FEED + escaped_title;
  oauth.get(feedUrl, config.token, config.token_secret, function(err, body, response) {
    if (err || response.statusCode !== 200) return callback(null); // ignore error
    /** @var {ReviewResponse} result */
    var xmlParser = new xml2js.Parser();
    xmlParser.parseString(body, function(err, result) {
      if (err) return callback(err);
      var numReviews = result.reviews['@'].total;
      if (numReviews === 0) return callback(null);
      var reviews = (numReviews === 1) ? [result.reviews.review] : result.reviews.review;
      async.each(reviews, function(review, cb) {
        if (areTheSame(review.book, book.getTitle(), book.getTotalPages())) { // Is the same book!! The prince..
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


function areTheSame(review_book, bookTitle, bookPages) {
  bookTitle = bookTitle.replace(/(\.\.\.)/, '');
  var reviewTitle = review_book.title.trim();
  if ((reviewTitle.indexOf(bookTitle) === 0)) { // Begins with the title
    var reviewPages = parseInt(review_book.num_pages) | 0;
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
Interface.parseUpdatesPage = function(userIdName, page, callback) {
  var url = Interface.STATUS_FEED_BASE + userIdName + "?format=rss&page=" + page;
  var req = request(url);
  var feedparser = new FeedParser();
  var articles = [];

  req.on('error', function(error) {
    return callback(error);
  });

  req.on('response', function(res) {
    var stream = this; // `this` is `req`, which is a stream

    if (res.statusCode !== 200) {
      this.emit('error', new Error('Bad status code'));
    } else {
      stream.pipe(feedparser);
    }
  });

  feedparser.on('error', function(error) {
    return callback(error);
  });

  feedparser.on('readable', function() {
    var stream = this;
    var article;
    while (article = stream.read()) {
      articles.push(article);
    }
  });

  feedparser.on('end', function() {
    callback(null, articles);
  });

};

Interface.getReadGoal = function(userIdName, challengeId, callback) {
  var url = Interface.CHALLENGE + userIdName + "?challenge_id=" + challengeId;
  request(url, function(error, response, body) {
    if (error) return callback(error);
    var myRe = /(\d+) book(s?) toward\\n             her goal of\\n             (\d+)/g;
    var stats = myRe.exec(body);
    callback(null, parseInt(stats[1]), parseInt(stats[3]));
  });
};

