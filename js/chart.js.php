<?php
/**
 * Created by JetBrains PhpStorm.
 * User: kumi
 * Date: 1/4/12
 * Time: 5:46 PM
 */
session_start();
require_once "../includes/functions.php";
$grUser = getUserFromSessionFile();
$library = $grUser->getLibrary();
$books = $library->books;
$hashes = array_keys($books);
$hashes_count = count($hashes);
$null_array=array();
for($i=0;$i<$hashes_count;$i++){
	$null_array[]=0;
}

echo "
google.load('visualization', '1', {packages:['corechart']});
google.setOnLoadCallback(drawCharts);
function drawCharts() {
	var data = new google.visualization.DataTable();
	var options = {};
	var chart;
	";
$counter = 0;
$update_dates = array();
$updates_matrix=array();
foreach ($books as $bookHash => $book) {
	/* @var $book Book */

	$book->completeInfo($grUser->userIdName());
	$updates = $book->getStatusUpdates();
	//$grUser::debug(json_encode(array_keys($updates)),true);
	$data = normalizePoints($updates);
	$update_dates = array_unique(array_merge((array_keys($updates)),$update_dates));
	$book_date = array_keys($updates);
	sort($update_dates);
	//$grUser::debug(json_encode($update_dates),true);
	$stats = statistics($data['delta']);
	$std = $stats['std'];
	$avg = $stats['avg'];
	GRUser::debug(json_encode($stats),true);
	$finish = $book->getFinishedOn();
	$total = ($book->getTotalPages() != 0) ? $book->getTotalPages() : 123;
	try {
		//@todo get line
		if(count($data['page'])>1){
			$line = getLine($updates);
			$finish = $line["m"] * $total + $line["b"] ;
			GRUser::debug($finish);
		}
	}catch(Exception $e){
		echo $e->getMessage();
	}
	GRUser::debug(json_encode($data),true);
	$rows = "";
	$num_updates = count($data['page']);
	for ($i = 0; $i < $num_updates; $i++) {
		$date = $book_date[$num_updates-$i-1];
		$page = $data['page'][$i];
		$delta= $data['delta'][$i];
		$time = (int)$data['date'][$i];

		if(isset($updates_matrix[$date])){
			$updates_matrix[$date][$counter] = $page;//array($page,$delta);
		}else{
			$updates_matrix[$date]= $null_array;
			$updates_matrix[$date][$counter] = $page;//array($page,$delta);
		}/**/
		$rows.="[ new Date($date*1000), $time, $page, $delta, ".($avg*($i+1)+$std).", ".($avg*($i+1)-$std).", ".($avg*($i+1))." ],\n\t\t";
	}

	$maxVal = $data['date'][0] - ($data['date'][0] % 120) + 115;
	$numDays = ceil($maxVal / 24) + 1;
	$date_finished =  (($book->getFinishedOn() != 0) ? "{" . date("r", $book->getFinishedOn()) . "}" : "");
	$data_date_finished = date("r", $finish);
	$book_title = addslashes(html_entity_decode(htmlentities($book->getTitle(), ENT_QUOTES, "UTF-8")));

	$color = (($book->getFinishedOn() != 0) ? "green" : "red");
	echo "
	/*   $bookHash :   $book_title   */
	data = new google.visualization.DataTable();
	data.addColumn('date', 'Date');
	data.addColumn('number', 'Time');
	data.addColumn('number', 'Page');
	data.addColumn('number', 'Delta');
	data.addColumn('number', 'Above');
	data.addColumn('number', 'Below');
	data.addColumn('number', 'Average');
	data.addRows([
		$rows
	]);
	options = {
		width: 500, height: 240,
		title: '$book_title : $data_date_finished $date_finished ',
		titleTextStyle : {color: '$color'},
		hAxis: {title: 'Time', gridlines : {count: $numDays}, minValue: 0, maxValue:  $maxVal },
		vAxis: {title: 'Pages ($total)', minValue: 0, maxValue:  $total },
		lineWidth: 2,
		legend: 'none'
	};

	chart = new google.visualization.ScatterChart(document.getElementById('chart_$bookHash'));
	chart.draw(data, options);";
	$counter++;/**/
}
echo   "
	}";

//GRUser::debug(json_encode($updates_matrix),true);
?>