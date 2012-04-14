/**
 * @file books.js
 * \brief
 */
try {
	jQuery.noConflict();
} catch (e) {
}
google.load('visualization', '1', {packages:['corechart']});

var reponse = {
	title:"",
	calculatedFinishDate:"",
	finishDate:"",
	color:"",
	numDays:0,
	maxVal:0,
	totalPages:0,
	stats:{"var":0, std:0, avg:0, count:0, sum:0},
	constStats:{"var":0, std:0, avg:0, count:0, sum:0},
	data:{page:[], date:[], delta:[]},
	updatesDates:[],
	finishedOn:""
};

var allData ={
	matrix:{},
	titles:{},
	pages:{}
};

jQuery(document).ready(function () {
	jQuery.getJSON('includes/functions.php?all=true', function (data) {
		draw(data);
	});
	jQuery.each(myBooks, function (index, bookHash) {
		jQuery.getJSON('includes/functions.php?bookHashAll=' + bookHash, function (data) {
			if (data.totalPages == 0) {
				console.log(data.title + "[" + data.totalPages + "]");
			}
			google.setOnLoadCallback(drawData(bookHash, data));
			setBookDataTable(bookHash, data);
		});
	});
});

function draw(allData){
	var data = new google.visualization.DataTable();
	var divId = 'mysuperdiv';
	var countBooks = myBooks.length ;
	var i, maxValue = 100, day_read, hash, last_read = {}, points = [];

	data.addColumn('date', 'Day');
	for(i=0;i<countBooks;i++){
		hash = myBooks[i];
		data.addColumn('number', allData.titles[hash]);
		last_read[hash]=0;
	}

	for(var day in allData.matrix){
		if (allData.matrix.hasOwnProperty(day)) {
			if (day > 1320019200) {//October 2011 1317427200 November 2011? 1320019200
				//console.log(new Date(day*1000));
				day_read = [new Date(day * 1000)];
				for (i = 0; i < countBooks; i++) {
					hash = myBooks[i];
					if (last_read[hash] == 100) {
						day_read.push(undefined);
					} else {
						if (allData.matrix[day][hash] != 'undefined') {
							last_read[hash] = Math.round(10000 * (allData.matrix[day][hash]) / (allData.pages[hash])) / 100;
						}
						day_read.push(last_read[hash]);
					}
				}
				points.push(day_read);
			}
		}

	}
	data.addRows(points);

	var options = {
		width: 1200,
		height: 200,
		titleTextStyle: {color: 'black'},
		hAxis: {gridlines: {count: 10 }, minValue: 0, maxValue: maxValue },
		vAxis: {minValue: 0, maxValue: 100 },
		lineWidth: 1,
		legend: 'none'
	};

	var chart = new google.visualization.LineChart(document.getElementById(divId));
	chart.draw(data, options);
}
function drawData(bookHash, response) {

	var points = [];
	var avg = response.stats.avg;
	var avgC = response.constStats.avg;
	var totalDays=response.data.page.length;
	if(response.color == "red" && response.totalPages != 0){
		//Unifinished book!
		totalDays =  Math.ceil(response.totalPages/avg);
		//avg = avgC;
	}

	var data = new google.visualization.DataTable();
	data.addColumn('number', 'Day');
	data.addColumn('number', 'Page');
	data.addColumn('number', 'Expected');
	data.addColumn('number', 'Delta');
	data.addColumn('number', 'Average');

	points.push([ 0, 0 , 0, 0, avg]);
	for (var i = 0; i < totalDays ; i++) {
		points.push([ (i + 1), response.data.page[i], Math.round(avg*(i+1)),  response.data.delta[i] , Math.round(avg*10)/10]);
	}

	data.addRows(points);

	var options = {
		width: 500,
		height: 240,
		title: response.title + ' : '  + response.finishDate + ' ' + response.calculatedFinishDate,
		titleTextStyle: {color: response.color},
		hAxis: {title: 'Day', gridlines: {count: ( totalDays + 1) }, minValue: 0, maxValue: ( totalDays - 1 ) },
		vAxis: {title: response.title + " ( "+response.totalPages + " )", minValue: 0, maxValue: 100 },
		lineWidth: 1,
		legend: 'none'
	};

	var chart = new google.visualization.LineChart(document.getElementById("chart_" + bookHash));
	chart.draw(data, options);
}

function setBookDataTable(bookHash, response){
	var style = " style='border-bottom : hidden;'";
	var il = document.getElementById(bookHash);
	var html = "<table class='tableList '>" +
				"<tbody>" +
				"<tr>" +
				"<th colspan='3'>" +
				"<span class='headerBookTitle'> <a href='#"+bookHash+"_chart'>" + response.title + /**/ "[" + response.totalPages + "]"+/**/"</a></span>" +
				"<span class='toRight'>" + /**/response.finishedOn +/**/ "</span>" +
				"</th>" +
				"</tr>" +
				"</tbody>" +
				"<tbody>";

	var numUpdates = response.data.page.length;
	for (i = numUpdates-1; i >= 0; i--) {
		var date = response.updatesDates[numUpdates - i - 1];

		if(i == 0){ //remove last line
			html += ("<tr" + style +">");
		}else{
			html += ("<tr  >");
		}

		//html += ("<td class='dateCol'>" + date  + "</td>");
		html += ("<td class='dateCol'>" + new Date(date * 1000).toUTCString().substr(0,16) + "</td>");
		html += ("<td class='pageCol'>" + response.data.page[i] + "</td>");
		html += ("<td class='pageCol'>" + response.data.delta[i] + "</td>");
		html += "</tr>";
	}
	html += "</tbody>" +
			"</table>";
	il.innerHTML = html;
}
