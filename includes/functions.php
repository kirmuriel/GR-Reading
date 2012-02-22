<?php
session_start();
require_once 'GRUser.php';

/**
 * @var GRUser $grUser
 */

$rssPagesTotal = 11;
$grUserIdName = "5206760-isabel";
if (isset ($_GET ['user'])) {
	$grUserIdName = $_GET ['user'];
}

if(isset($_GET['bookHashAll'])){
	$bookHash = $_GET ['bookHashAll'];
	$grUser = getUserFromSessionFile();
	$library = $grUser->getLibrary();
	$books = $library->books;
	/* @var $book Book */
	$book = $books[$bookHash];

	$book->completeInfo($grUser->userIdName());
	$book->getStatusUpdates();

	saveUserToFile($grUser);
	getAllData($book);

} else {
	echo "//else\n";
	if (!isset($_SESSION['user'])) {
		$_SESSION['user'] = new GRUser($grUserIdName, $rssPagesTotal);
		echo "//create\n";
		//var_dump($_SESSION['user']);
	}
}
/**
 * @param $bookHash
 * @return Book
 */
function getBookInfo($bookHash){
	$grUser = getUserFromSessionFile();
	$library = $grUser->getLibrary();
	$books = $library->books;
	/* @var $book Book */
	$book = $books[$bookHash];

	$book->completeInfo($grUser->userIdName());
	$book->getStatusUpdates();

	saveUserToFile($grUser);
	return $book;
}

function getFeedData($num_pages = 9) {
	/* @var $grUser GRUser */
	$grUser = $_SESSION['user'];
	$library = $grUser->getLibrary($num_pages);
	saveUserToFile($grUser);
	//var_dump($_SESSION);
	destroySession();

	$books = $library->books;
	$start = GRUser::getTime();
	$hashes = array_keys($books);
	$hash_array = "";
	$htmlListItems = "";
	$extra = "_chart";
	foreach ($hashes as $hash) {
		$htmlListItems .= "<li id='$hash' class='featureTeaserBox boxed roundedBorder'></li>\n";
		//$htmlListItems .= "<li><a name='$hash$extra'>Chart </a><div id='chart_$hash'></div></li>\n";
		$hash_array .= "'$hash', ";
	}
	$hash_array = substr($hash_array, 0, -2);
	$hash_array = "<script type='text/javascript' > var myBooks=new Array($hash_array); </script>";

	echo $htmlListItems;
	echo $hash_array;
	echo "<script src='js/books.js' type='text/javascript'></script>";

	$lap = GRUser::getTime();
	echo "<br>Time taken TFeed = " . number_format(($lap - $start), 2) . " secs ";
	return;
}


function getAllData($book){
	/* @var $book Book */
	$response = array();
	$dateFinishedHeader = ($book->getFinishedOn() === 0) ? "" : date('D d M \'y H:i', $book->getFinishedOn());
	$updates = $book->getStatusUpdates();
	$data = normalizePoints($updates);
	$updatesDates = array_keys($updates);
	$stats = statistics($data['delta']);
	$finish = $book->getFinishedOn();
	$totalPages = $book->getTotalPages();
	try {
		//@todo get line
		if(count($data['page'])>1 && $totalPages != 0){
			$line = getLine($updates);
			$finish = $line["m"] * $totalPages + $line["b"] ;
			GRUser::debug($finish);
		}
	}catch(Exception $e){
		echo $e->getMessage();
	}

	$maxVal = ($data['date'][0] - ($data['date'][0] % 120) + 115)/24;

	$response['calculatedFinishDate'] = date("r", $finish);
	$response['finishDate'] = (($book->getFinishedOn() != 0) ? "{" . date("r", $book->getFinishedOn()) . "}" : "");
	$response['color'] = (($book->getFinishedOn() != 0) ? "black" : "red");
	$response['numDays'] = ceil($maxVal / 1) + 1;//24;
	$response['maxVal'] = $maxVal;
	$response['stats'] = $stats;
	$response['data'] = $data;
	$response['updatesDates'] = $updatesDates;
	$response['title'] = $book->getTitle();
	$response['totalPages'] = $totalPages;
	$response['finishedOn'] = $dateFinishedHeader;

	echo json_encode($response);

}
function getCharts() {
	/*	readSession() */
	$extra = "_chart";
	$books = getBooksCreateUser();
	$hashes = array_keys($books);
	foreach ($hashes as $hash) {
		echo "
		<li>
			<a name='$hash$extra'/>
				<div id='chart_$hash'></div>

		</li>";
	}/**/


}

function normalizePoints($updates) {
	//@todo remove date
	$data = array('page' => array(), 'date' => array(),  'delta' => array());
	$counter = 0;
	$prev_page = 0;
	$page =0;
	foreach ($updates as $date => $page) {
		$data ['date'] [] = ( int )($counter * 24);
		$data ['page'] [] = $page;
		if($prev_page!==0){
			$data ['delta'] [] = $prev_page-$page;
		}
		$prev_page = $page;
		$counter++;
	}
	$data ['delta'] [] = $page;
	$data['page'] = array_reverse($data['page']);
	$data['delta'] = array_reverse($data['delta']);
	return $data;
}

function getPoints($updates) {
	//@todo get points
	$data = array('page' => array(), 'date' => array());

	//$accumulated = 0;
	//$prev_date = 0;
	foreach ($updates as $date => $page) {
		/*$mod =0;

		if ($prev_date !== 0) {
			$mod = 86400;
			$prev_date = date('Y-m-d', $date);
		} else {
			 echo "//0";
			$prev_date = date('Y-m-d',$date);
		}
		 echo "\n";

		$accumulated = $accumulated + $mod;    */
		$data ['date'] [] = $date; // 24*
		$data ['page'] [] = $page;
	}
	$data['page'] = array_reverse($data['page']);
	/*return $data;

	$last = count($data ['date']) - 1;
	$dayInSeconds = 60 * 60 * 24;
	$accumulated = 0;
	$lastDay = $data ['unix'] [0];

	for ($i = $last; $i >= 0; $i --) {
		$mod = ($data ['unix'] [$i]) % ($dayInSeconds);
		$accumulated = $accumulated + $mod;
		$data ['date'] [$i] = ( int ) ($accumulated);
	}
	$lastDay = $lastDay - $data ['date'] [0];

	for ($i = $last; $i >= 0; $i --) {
		$data ['unix'] [$i] += $lastDay;
	}*/
	return $data;
}

function getLine($updates) {
	$data = getPoints($updates);
	return linear_regression($data ['page'], $data ['date']);
}


//                   ppw --source src --tests tests --name bookstats --bootstrap src/autoload.php .

/**
 * linear regression function
 *
 * @param $x array x-coords
 * @param $y array y-coords
 * @return array   m=>slope, b=>intercept
 */
function linear_regression($x, $y) {

	// calculate number points
	$n = count($x);

	// ensure both arrays of points are the same size
	if ($n != count($y)) {

		trigger_error("linear_regression(): Number of elements in coordinate arrays do not match.", E_USER_ERROR);

	}

	// calculate sums
	$x_sum = array_sum($x);
	$y_sum = array_sum($y);

	$xx_sum = 0;
	$xy_sum = 0;

	for ($i = 0; $i < $n; $i++) {

		$xy_sum += ($x [$i] * $y [$i]);
		$xx_sum += ($x [$i] * $x [$i]);

	}

	// calculate slope
	$m = (($n * $xy_sum) - ($x_sum * $y_sum)) / (($n * $xx_sum) - ($x_sum * $x_sum));

	// calculate intercept
	$b = ($y_sum - ($m * $x_sum)) / $n;

	// return result
	return array("m" => $m, "b" => $b);

}
function statistics($array){
	$count = count($array);
	$sum = 0;
	for($i=0;$i<$count;$i++){
		$sum+=$array[$i];
	}
	$avg = $sum/$count;
	$var = 0;
	for($i=0;$i<$count;$i++){
		$var+=(($array[$i]-$avg)*($array[$i]-$avg));
	}
	$var = $var/$count;
	return array('var'=>$var, 'std'=>sqrt($var), 'avg'=>$avg, 'count'=>$count, 'sum'=>$sum);
}
function stDev($array){
	$stats = statistics($array);
	return $stats['std'];
}

function getConstantArray($deltaArray, $totalPages) {
	//echo json_encode($deltaArray) . "\n";
	if (count($deltaArray) <= 2) {
		return $deltaArray;
	}
	$stDev = stDev($deltaArray);
	if (($stDev * 100 / $totalPages) < 4) {
		return $deltaArray;
	}
	$trimMin = $deltaArray;
	array_shift($trimMin);
	$stDevXMin = stDev($trimMin);

	$trimMax = $deltaArray;
	array_pop($trimMax);
	$stDevXMax = stDev($trimMax);

	$diff = abs($stDevXMax - $stDevXMin);

	if ($diff < 1) {
		array_pop($trimMin);
		return getConstantArray($trimMin, $totalPages);
	} else if ($stDevXMax < $stDevXMin) {
		return getConstantArray($trimMax, $totalPages);
	} else { //  ($std_xmax > $std_xmin)
		return getConstantArray($trimMin, $totalPages);
	}
}

function readSession() {
	GRUser::debug("In readSession");
	$filename = $_SERVER['DOCUMENT_ROOT'] . "/bookprediction/sessionfile.txt";
	GRUser::debug($filename);
	$sessionFile = fopen($filename, "r");
	session_decode(fread($sessionFile, filesize($filename)));
	GRUser::debug(json_encode($_SESSION), true);
	fclose($sessionFile);
}

function destroySession() {
	unset($_SESSION['user']);
	session_destroy();
	GRUser::debug("Session destroyed");
}

/**
 * @return GRUser
 */
function getUserFromSessionFile() {
	GRUser::debug("In getUserFromSessionFile");
	$filename = $_SERVER['DOCUMENT_ROOT'] . "/bookprediction/sessionfile.txt";
	GRUser::debug($filename);
	$sessionFile = fopen($filename, "r");
	GRUser::debug(filesize($filename));
	session_decode(fread($sessionFile, filesize($filename)));
	fclose($sessionFile);
	$grUser = $_SESSION['user'];
	GRUser::debug(json_encode($grUser), true);
	destroySession();
	return $grUser;
}

/**
 * @return array
 */
function getBooksCreateUser() {
	/* @var $grUser GRUser */
	global $rssPagesTotal;
	global $grUserIdName;

	$grUser = new GRUser($grUserIdName, $rssPagesTotal);

	$library = $grUser->getLibrary($rssPagesTotal);
	$books = $library->books;
	return $books;

}

/**
 * @param  $grUser  GRUser
 * @return void
 */
function saveUserToFile($grUser) {
	GRUser::debug("In saveUserToFile");
	$_SESSION['user'] = $grUser;
	$sessionFile = fopen("sessionfile.txt", "w");
	fputs($sessionFile, session_encode());
	fclose($sessionFile);
	GRUser::debug("Out saveUserToFile");
}

?>