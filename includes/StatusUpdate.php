<?php
/**
 * Examples:
 * Isabel is on page 100 of 256 of Deceived (Star Wars
 * Isabel is finished with The Pearl
 * Isabel is reading El Lobo Estepario
 */
class StatusUpdate {

	var $finishedOn;
	var $bookTitle;
	var $page;
	var $totalPages;
	var $date;
	var $type;
	
	function __construct($entry){
		$update = $entry->title;
		$this->date = strtotime ($entry->pubDate);
		$this->type = StatusUpdateTypes::Other;
		if (strpos ( $update, " is finished with " ) > 0) {
			$chars = preg_split ( '/ is finished with /', $update, - 1, PREG_SPLIT_DELIM_CAPTURE );
			$this->bookTitle = $chars [1];
			$this->finishedOn = $this->date;
			$this->type = StatusUpdateTypes::Finish;
		} else if (strpos ( $update, " is reading " ) > 0) {
			$chars = preg_split ( '/ is reading /', $update, - 1, PREG_SPLIT_DELIM_CAPTURE );
			$this->bookTitle = $chars [1];
			$this->page = 0;
			$this->type = StatusUpdateTypes::Start;
		} else if (strpos ( $update, " is on page " ) > 0) {
			// name page total title
			$chars = preg_split ( '/ is on page (?P<page>\d+) of (?P<total>\d+) of /', $update, - 1, PREG_SPLIT_DELIM_CAPTURE );
			if (count($chars)==4) {
				$this->bookTitle = $chars [3];
				$this->totalPages = intval ( $chars [2] );
			}else{ //No total pages : name page title
				$chars = preg_split ( '/ is on page (?P<page>\d+) of /', $update, - 1, PREG_SPLIT_DELIM_CAPTURE );
				$this->bookTitle = $chars [2];
				$this->totalPages = 0;
			}
			$this->page = intval ( $chars [1] );
			$this->type = StatusUpdateTypes::OnPage;
		} 
	}

}
class StatusUpdateTypes
{
	const Other  = 0;
	const OnPage = 1;
	const Start  = 2;
	const Finish = 3;
}
?>