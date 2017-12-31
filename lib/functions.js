var moment = require('moment');
var Book = require('./Book');

var Util = Book.Util;
var DECIMAL_RADIX = 10;

function arrayReverse(array) {
  return array.slice().reverse();
}

function unique(array) {
  var uniq = [];
  for (var i = 0; i < array.length; i++) {
    if (uniq.indexOf(array[i]) === -1) {
      uniq.push(array[i]);
    }
  }
  return uniq;
}

function sort(numericArray) {
  var sorter = function (a, b) {
    return (a - b);
  };
  numericArray.sort(sorter);
}

/**
 * Display the html based on the status update feed
 * @param {GRUser} grUser GR user to get the feed from
 * @param {Number} numPages Number of pages of the feed
 * @param {Function} callback
 */
function getFeedData(grUser, numPages, callback) {
  grUser.getLibrary(numPages, function (err) {
    if (err) return callback(err);
    var library = grUser.library;
    var hashes = [];
    var books = [];
    var i;
    var sortedHashes = [];
    var updates;
    Object.keys(library.books).forEach(function (hash) {
      updates = library.books[hash].rawReadUpdates;
      if (updates && updates[0]) {
        sortedHashes.push({ hash: hash, date: updates[0].date });
      }
    });
    Util.sortByDate(sortedHashes);
    for (i = 0; i < sortedHashes.length; i++) {
      var hash = sortedHashes[i].hash;
      hashes.push({ hash: hash });
      books.push({ book: JSON.stringify(library.books[hash]) });
    }
    callback(null, hashes, books);
  });
}

function getMatrix(books, allUpdateDates, callback) {
  // kjc loosing one date the last ??
  var response = {};
  var bookTitles = {};
  var lastRead = {};
  var points = [];
  var i;
  var j;
  var book;
  var hash;
  var date;
  var dayRead;
  for (i = 0; i < books.length; i++) {
    book = books[i];
    hash = book.hash;
    lastRead[hash] = 0;
    bookTitles[hash] = book.getTitle().substr(0, 15);
  }
  for (i = 0; i < allUpdateDates.length; i++) {
    date = allUpdateDates[i];
    dayRead = [date];
    for (j = 0; j < books.length; j++) {
      book = books[j];
      hash = book.hash;
      var updates = book.dailyUpdates;
      if (lastRead[hash] === 100) {
        dayRead.push(undefined);
      } else {
        if (undefined !== (updates[date])) {
          lastRead[hash] = Math.round((updates[date] / book.getTotalPages()) * 10000) / 100;
        }
        dayRead.push(lastRead[hash]);
      }
    }
    points.push(dayRead);
  }
  response.titles = bookTitles;
  response.points = points;
  callback(null, response);
}

function graphAll(books, callback) {
  var allUpdateDates = [];
  var booksProcessed = 0;
  books.forEach(function (book) {
    book.getStatusUpdates(function (err) {
      if (err) return callback(err);
      allUpdateDates = allUpdateDates.concat(Object.keys(book.dailyUpdates));
      booksProcessed += 1;
      if (booksProcessed === books.length) {
        allUpdateDates = unique(allUpdateDates);
        sort(allUpdateDates);
        getMatrix(books, allUpdateDates, callback);
      }
    });
  });
}

function getPoints(updates) {
  var data = { page: [], date: [] };

  Object.entries(updates).forEach(function (datePage) {
    data.date.push(parseInt(datePage[0], 10));
    data.page.push(datePage[1]);
  });
  data.page = arrayReverse(data.page);

  var last = (data.date).length - 1;
  var dayInMiliSeconds = 1000 * 60 * 60 * 24;
  var lastDay = data.date[0];

  for (var i = last; i >= 0; i--) {
    data.date[i] = parseInt(lastDay, DECIMAL_RADIX);
    lastDay -= (dayInMiliSeconds);
  }
  return data;
}

/**
 * linear regression function
 *
 * @param {Array} x x-coords
 * @param {Array} y y-coords
 * @return {Object} m:slope, b:intercept
 */
function linearRegression(x, y) {
  var i;
  // calculate number points
  var n = x.length;
  // ensure both arrays of points are the same size
  if (n !== y.length) {
    throw new Error('linear_regression(): Number of elements in coordinate arrays do not match.');
  }
  // calculate sums
  var xSum = 0;
  var ySum = 0;
  var xxSum = 0;
  var xySum = 0;
  for (i = 0; i < n; i++) {
    xSum += x[i];
    ySum += y[i];
    xySum += (x[i] * y[i]);
    xxSum += (x[i] * x[i]);
  }
  // calculate slope
  var m = ((n * xySum) - (xSum * ySum)) / ((n * xxSum) - (xSum * xSum));
  // calculate intercept
  var b = (ySum - (m * xSum)) / n;
  // return result
  return { m: m, b: b };
}

/**
 *
 * @param {Array} updates
 * @return {Object} m:slope, b:intercept
 * @see linearRegression
 */
function getLine(updates) {
  var data = getPoints(updates);
  return linearRegression(data.page, data.date);
}

/**
 * Gets the arrays of update dates, pages, and deltas from an associative array of updates
 * @param {Array} updates Associative array. date : page
 * @return {Object} data Format {page:[], date:[], delta:[]}
 */
function normalizePoints(updates) {
  // @kjc remove date
  var data = { page: [], date: [], delta: [] };
  var counter = 0;
  var prevPage = 0;
  Object.values(updates).forEach(function (page) {
    data.date.push(counter * 24);
    data.page.push(page);
    if (prevPage !== 0) {
      data.delta.push(prevPage - page);
    }
    prevPage = page;
    counter += 1;
  });
  data.page = arrayReverse(data.page);
  data.delta = arrayReverse(data.delta);
  data.delta.unshift(data.page[0]);
  return data;
}

function statistics(array) {
  var count = array.length;
  var sum = 0;
  var i;
  for (i = 0; i < count; i++) {
    sum += array[i];
  }
  var avg = sum / count;
  var vrn = 0;
  for (i = 0; i < count; i++) {
    vrn += ((array[i] - avg) * (array[i] - avg));
  }
  vrn /= count;
  return {
    var: vrn, std: Math.sqrt(vrn), avg: avg, count: count, sum: sum,
  };
}

/**
 * Gets all data for a given book and formats it for display
 * @param {Book} book The book to get the data from.
 * @param {Function} callback function(error, Array) Receives an array with the formatted book data
 */
function getAllData(book, callback) {
  /* @var book Book */
  var response = {};
  var finish = book.getFinishedOn();
  var totalPages = book.getTotalPages();
  var updates = book.dailyUpdates;

  var data = normalizePoints(updates);
  var stats = statistics(data.delta);
  var totalDays = data.page.length - 1;
  var daysToFinish = (book.getTotalPages() - data.page[totalDays]) / stats.avg;
  var line = { m: 0, b: 0 };
  var updatesDates = Object.keys(updates);
  var dateFinishedHeader = (book.getFinishedOn() === 0)
    ? (stats.avg).toFixed(2) + ' x ' + Math.round(daysToFinish) + 'd = ' + moment(parseInt(updatesDates[0], DECIMAL_RADIX)
    + (daysToFinish * 24 * 60 * 60 * 1000)).format('ddd D MMM \'YY HH:mm')
    : moment(book.getFinishedOn()).format('ddd D MMM \'YY HH:mm');
  try {
    if (data.page.length > 1 && totalPages !== 0) {
      var realLine = getLine(updates);
      finish = (realLine.m * totalPages) + realLine.b;

      var delta = data.delta.slice(0);
      delta.sort(function (a, b) {
        return (a - b);
      });
      var range = [];
      for (var i = 0; i < data.page.length; i++) {
        range.push(i);
      }
      line = linearRegression(range, data.page);
    }
  } catch (e) {
    console.log(e.message);
    console.log(e);
  }

  response.hash = book.getHash();
  response.calculatedFinishDate = moment(finish).format('ddd, D MMM YYYY HH:mm:ss Z');
  response.finishDate = ((book.getFinishedOn() !== 0) ? '{' + moment(book.getFinishedOn())
    .format('ddd, D MMM YYYY HH:mm:ss Z') + '}' : '');
  response.color = ((book.getFinishedOn() !== 0) ? 'black' : 'red');
  response.stats = stats;
  response.data = data;
  response.updatesDates = (updatesDates);
  response.title = book.getTitle();
  response.totalPages = totalPages;
  response.finishedOn = dateFinishedHeader;
  response.line = line;
  callback(null, response);
}

function stDev(array) {
  var stats = statistics(array);
  return stats.std;
}

function getConstantArray(sortedDeltaArray, totalPages) {
  if (sortedDeltaArray.length <= 2) {
    return sortedDeltaArray;
  }
  var stdDev = stDev(sortedDeltaArray);
  if (((stdDev * 100) / totalPages) < 4) {
    return sortedDeltaArray;
  }

  var trimMin = sortedDeltaArray.slice(0);
  trimMin.shift();
  var stDevXMin = stDev(trimMin);

  var trimMax = sortedDeltaArray.slice(0);
  trimMax.pop();
  var stDevXMax = stDev(trimMax.pop());

  var diff = Math.abs(stDevXMax - stDevXMin);

  if (diff < 1) {
    trimMin.pop();
    return getConstantArray(trimMin, totalPages);
  } else if (stDevXMax < stDevXMin) {
    return getConstantArray(trimMax, totalPages);
  } //  (std_xmax > std_xmin)
  return getConstantArray(trimMin, totalPages);
}

exports.getFeedData = getFeedData;
exports.graphAll = graphAll;
exports.getAllData = getAllData;
exports.getConstantArray = getConstantArray;
