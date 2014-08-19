//                   ppw --source src --tests tests --name bookstats --bootstrap src/autoload.php .
var GRUser = require('./GRUser')
	, Book = require('./Book')
	, mu = require('mu2')
	, util = require('util')
	, moment = require('moment')
	, Util = Book.Util
	;
mu.root = __dirname + '/../templates';

function array_reverse(array) {
	var tmp_arr = [];
	for (var key in array) { //kjc async
		if (array.hasOwnProperty(key)) {
			tmp_arr.unshift(array[key]);
		}
	}
	return tmp_arr;
}


/**
 * Display the html based on the status update feed
 * @param {GRUser} grUser GR user to get the feed from
 * @param {Number} numPages Number of pages of the feed
 * @param {Function} callback
 */
function getFeedData(grUser, numPages, callback) {
	/* @var grUser GRUser */
	grUser.getLibrary(numPages, function (err) {
		if (err) return callback(err);
		var library = grUser.library;
		var hashes = [], books = [];
		var hash, i, sortedHashes = [], updates;
		for ( hash in library.books) { // kjc async
			if (library.books.hasOwnProperty(hash)) {
				updates = library.books[hash].rawReadUpdates;
				if (updates && updates[0]) {
					sortedHashes.push({hash:hash, date:updates[0].date});
				}
			}
		}
		Util.sortByDate(sortedHashes);
		for (i = 0; i < sortedHashes.length; i++) {
			hash = sortedHashes[i].hash;
			hashes.push({hash:hash});
			books.push({book:JSON.stringify(library.books[hash])});
		}
		callback(null,hashes,books);
	});
}

function sort(numericArray) {
	var sorter = function (a, b) {
		return (a - b);
	};
	numericArray.sort(sorter);
}
/**
 * Gets all data for a given book and formats it for display
 * @param {Book} book The book to get the data from.
 * @param {function} callback function(error, Array). Receives an array with the formated book data for display
 */
function getAllData(book, callback) {
	/* @var book Book*/
	var response = {};
	var finish = book.getFinishedOn();
	var totalPages = book.getTotalPages();
	var updates = book.dailyUpdates;

	var data = normalizePoints(updates);
	var stats = statistics(data['delta']);
	var totalDays = data['page'].length -1;
	var daysToFinish = (book.getTotalPages()-data['page'][totalDays])/stats['avg'];
	//	var constStats = stats;
	var line = {m:0,b:0};
	var updatesDates = Object.keys(updates);
	var dateFinishedHeader = (book.getFinishedOn() === 0) ?  (stats['avg']).toFixed(2) +" x "+Math.round(daysToFinish)+"d = "+moment(parseInt(updatesDates[0])+daysToFinish*24*60*60*1000).format('ddd D MMM \'YY HH:mm'): moment(book.getFinishedOn()).format('ddd D MMM \'YY HH:mm');
	try {
		if (data['page'].length > 1 && totalPages != 0) {
			var realLine = getLine(updates);
			finish = realLine["m"] * totalPages + realLine["b"];

			var delta = data['delta'].slice(0);
			delta.sort(function (a, b) {
				return (a - b);
			});
			var range = [];
			for (var i = 0; i < data['page'].length; i++) {
				range.push(i);
			}
			line = linearRegression(range,data ['page']);
		}
	} catch (e) {
		console.log(e.message);
		console.log(e);
	}

	response['hash'] = book.getHash();
	response['calculatedFinishDate'] = moment(finish).format("ddd, D MMM YYYY HH:mm:ss Z");
	response['finishDate'] = ((book.getFinishedOn() != 0) ? "{" + moment(book.getFinishedOn()).format("ddd, D MMM YYYY HH:mm:ss Z") + "}" : "");
	response['color'] = ((book.getFinishedOn() != 0) ? "black" : "red");
	response['stats'] = stats;
	response['data'] = data;
	response['updatesDates'] = (updatesDates);
	response['title'] = book.getTitle();
	response['totalPages'] = totalPages;
	response['finishedOn'] = dateFinishedHeader;
	response['line'] =line;
	callback(null, response);
}


function unique(array) {
	var unique = [];
	for (var i = 0; i < array.length; i++) {
		if (unique.indexOf(array[i]) === -1) {
			unique.push(array[i]);
		}
	}
	return unique;
}
/**/
function graphAll(books, callback) {
	var allUpdateDates = [];
	var booksProcessed = 0;
	books.forEach(function (book) {
		/*if (book.shelf == 2 && book.hash != "8cfc04290") {
			//console.log(" %s : %s ", book.shelf, book.title);
			//console.log(book);
			book.completeInfo("isabel-62760", function (err) {
				if (err)return callback(err);
				/* @var book Book
			//	console.log("this book", book.rawReadUpdates);
				book.getStatusUpdates(function (err) {
			//		console.log(" %s : %s ", book.shelf, book.title);
				});
			});
		}*/
		book.getStatusUpdates(function (err) {
			if(err) return callback(err);
			allUpdateDates = allUpdateDates.concat(Object.keys(book.dailyUpdates));
			if (++booksProcessed == books.length) {
				allUpdateDates = unique(allUpdateDates);
				sort(allUpdateDates);
				getMatrix(books, allUpdateDates, callback);
			}
		});
	});
}
function getMatrix(books, allUpdateDates, callback) {
	//kjc loosing one date the last ??
	var response = {}
		, bookTitles = {}
		, lastRead = {}
		, points = []
		, i, j
		, book, hash, date
		, day_read;
	for (i = 0; i < books.length; i++) {
		book = books[i];
		hash = book.hash;
		lastRead[hash] = 0;
		bookTitles[hash] = book.getTitle().substr(0, 15);
	}
	for (i = 0; i < allUpdateDates.length; i++) {
		date = allUpdateDates[i];
		day_read = [date];
		for (j = 0; j < books.length; j++) {
			book = books[j];
			hash = book.hash;
			var updates = book.dailyUpdates;
			if (lastRead[hash] == 100) {
				day_read.push(undefined);
			} else {
				if (undefined != (updates[date])) {
					lastRead[hash] = Math.round(updates[date] / book.getTotalPages()*10000)/100;
				}
				day_read.push(lastRead[hash]);
			}
		}
		points.push(day_read);
	}
	response['titles'] = bookTitles;
	response['points'] = points;
	callback(null,response);
}
/**/
/**
 * Gets the arrays of update dates, pages, and deltas from an associative array of updates
 * @param {Array} updates Associative array. date : page
 * @return {Array} data Format {page:[], date:[], delta:[]}
 */
function normalizePoints(updates) {
	//@kjc remove date
	var data = {page:[], date:[], delta:[]};
	var counter = 0;
	var prevPage = 0;
	var page = 0;
	for (var date in updates) {//} as date : page) { //kjc async
		if (updates.hasOwnProperty(date)) {
			page = updates[date];
			data['date'].push(counter * 24);
			data['page'].push(page);
			if (prevPage !== 0) {
				data['delta'].push(prevPage - page);
			}
			prevPage = page;
			counter++;
		}
	}
	data['page'] = array_reverse(data['page']);
	data['delta'] = array_reverse(data['delta']);
	data['delta'].unshift(data['page'][0]);
	return data;
}

function getPoints(updates) {
	var data = {page:[], date:[]};

	for (var date in updates) {
		if (updates.hasOwnProperty(date)) { //kjc async
			var page = updates[date];
			data ['date'].push(date); // 24* convert to seconds
			data ['page'].push(page);
		}
	}
	data['page'] = array_reverse(data['page']);

	var last = (data ['date']).length - 1;
	var dayInMiliSeconds = 1000 * 60 * 60 * 24;
	var lastDay = data ['date'] [0];

	for (var i = last; i >= 0; i--) {
		data ['date'] [i] = parseInt(lastDay);//parseInt
		lastDay -= (dayInMiliSeconds);
	}
	return data;
}
/**
 *
 * @param {Array} updates
 * @return {Array} m:slope, b:intercept
 * @see linearRegression
 */
function getLine(updates) {
	var data = getPoints(updates);
	return linearRegression(data ['page'], data ['date']);
}
/**
 * linear regression function
 *
 * @param {Array} x x-coords
 * @param {Array} y y-coords
 * @return {Array} m:slope, b:intercept
 */
function linearRegression(x, y) {
	var i;
	// calculate number points
	var n = x.length;
	// ensure both arrays of points are the same size
	if (n != y.length) {
		throw("linear_regression(): Number of elements in coordinate arrays do not match.");
	}
	// calculate sums
	var x_sum = 0
		, y_sum = 0
		, xx_sum = 0
		, xy_sum = 0;
	for (i = 0; i < n; i++) {
		x_sum += x[i];
		y_sum += y[i];
		xy_sum += (x [i] * y [i]);
		xx_sum += (x [i] * x [i]);
	}
	// calculate slope
	var m = ((n * xy_sum) - (x_sum * y_sum)) / ((n * xx_sum) - (x_sum * x_sum));
	// calculate intercept
	var b = (y_sum - (m * x_sum)) / n;
	// return result
	return {"m":m, "b":b};
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
	vrn = vrn / count;
	return {"var":vrn, "std":Math.sqrt(vrn), "avg":avg, "count":count, "sum":sum};
}

function stDev(array) {
	var stats = statistics(array);
	return stats['std'];
}

function getConstantArray(sortedDeltaArray, totalPages) {

	if (sortedDeltaArray.length <= 2) {
		return sortedDeltaArray;
	}
	var stdDev = stDev(sortedDeltaArray);
	if ((stdDev * 100 / totalPages) < 4) {
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
	} else { //  (std_xmax > std_xmin)
		return getConstantArray(trimMin, totalPages);
	}
}


exports.getFeedData = getFeedData;
exports.normalizePoints = normalizePoints;
exports.getPoints = getPoints;
exports.getLine = getLine;
exports.linearRegression = linearRegression;
exports.statistics = statistics;
exports.stDev = stDev;
exports.getConstantArray = getConstantArray;
exports.getAllData = getAllData;
exports.graphAll = graphAll;