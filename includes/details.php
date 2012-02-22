<?php
//session_start();
/**
 * Created by IntelliJ IDEA.
 * User: kumi
 * Date: Feb 8, 2012
 * Time: 11:57:12 PM
 * To change this template use File | Settings | File Templates.
 */

if(isset($_GET['bookHash'])){
	$bookHash = $_GET ['bookHash'];
	$grUser =  $_SESSION['user'];
	echo "bbbb $bookHash __".$grUser->userId."???";
	//var_dump($_SESSION['user']);
	//$books = $grUser->library->books;
	//echo "c".count($books)."";
}

?>