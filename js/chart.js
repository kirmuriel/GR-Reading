try {
	jQuery.noConflict();
} catch (e) {
}
var oliver_hash = '1dbf04ad';

google.load('visualization', '1', {packages:['corechart']});

var divId = "#mysuperdiv";
var reponse = {
	title:"",
	calculatedFinishDate:"",
	finishDate:"",
	color:"",
	numDays:0,
	maxVal:0,
	total:0,
	stats:{"var":0, std:0, avg:0, count:0, sum:0},
	data:{page:[], date:[], delta:[]},
	updatesDates:[]
};

jQuery(document).ready(function () {
	jQuery(divId).addClass("loading");
	jQuery.each(myBooks, function (index, bookHash) {
		jQuery.getJSON('includes/functions.php?bookHashChart=' + bookHash, function (data) {
			google.setOnLoadCallback(drawData(bookHash, data));
		});
	});
});


function drawData(bookHash, response) {
	jQuery(divId).removeClass("loading");
	var points = [];

	var avg = response.stats.avg;
	var std = response.stats.std;
	var numUpdates = response.data.page.length;
	points.push([ 0, 0 ]);
	//points.push([ 0, 0, 0, 0 ]);
	for (var i = 0; i < numUpdates; i++) {
		var date = response.updatesDates[numUpdates - i - 1];
		var time = response.data.date[i];
		var page = response.data.page[i];
		var delta = response.data.delta[i];
		//points.push([new Date(date * 1000), time, page, delta, avg * (i + 1) + std, avg * (i + 1) - std, avg * (i + 1) ]);
		//points.push([ (i + 1), page, delta, avg * (i + 1) ]);
		points.push([ (i + 1), 100*delta/avg ]);
	}
	console.log(response.title);
	console.log(response.maxVal);
	console.log(response.numDays);
	console.log(numUpdates);

	var data = new google.visualization.DataTable();
	//data.addColumn('date', 'Date');
	data.addColumn('number', 'Time');
	data.addColumn('number', 'Percentage');
	//data.addColumn('number', 'Page');
	//data.addColumn('number', 'Delta');
	//data.addColumn('number', 'Above');
	//data.addColumn('number', 'Below');
	//data.addColumn('number', 'Average');

	data.addRows(points);
//vAxis: {title: 'Pages (' + response.total + ')', minValue: 0, maxValue: response.total },
	var options = {
		width: 500,
		height: 240,
		title: response.title + ' : ' + response.calculatedFinishDate + ' ' + response.finishDate,
		titleTextStyle: {color: response.color},
		hAxis: {title: 'Day', gridlines: {count: (numUpdates) }, minValue: 0, maxValue: (numUpdates-1) },
		vAxis: {title: '%', minValue: 0, maxValue: 100 },
		lineWidth: 1,
		legend: 'none'
	};

	var chart = new google.visualization.ScatterChart(document.getElementById("chart_" + bookHash));
	chart.draw(data, options);
}