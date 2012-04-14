<?php
require_once 'Library.php';

class GRUser {

	var $userName = "";
	var $userId = "";
	/**
	 * @var $library Library Singleton
	 */
	private $library;

	const status_feed_base = "http://www.goodreads.com/user_status/list/";
	const feed_base = "http://www.goodreads.com/review/list.xml?v=2&key=0Ocs0PYjLa4tMbFPOC3chg&id=";
	const read_query_feed = "&shelf=read&search[query]=";
	const currently_reading_feed = "&shelf=currently-reading&search[query]=";

	function __construct($userIdName, $max_pages = 3) {
		preg_match('/(?P<uid>\d+)-(?P<name>\w.+)/', $userIdName, $matches);
		$this->userName = $matches ['name'];
		$this->userId = $matches ['uid'];
	}

	public function __clone() {
		self::debug('Clone is not allowed.');
		trigger_error('Clone is not allowed.', E_USER_ERROR);
	}

	function properName() {
		return ucfirst($this->userName);
	}

	function userIdName() {
		return "$this->userId-$this->userName";
	}

	public function getLibrary($max_page=9) {
		self::debug("In getLibrary");
		if (!is_object($this->library)) {
			self::debug("from rss");
			//Books with status updates
			$this->library = new Library();

			$start = self::getTime();
			for ($page = 1; $page <= $max_page; $page++) {
				$content = file_get_contents(self::status_feed_base . $this->userIdName() . "?format=rss&page=" . $page);
				$x = new SimpleXmlElement ($content);
				foreach ($x->channel->item as $entry) {
					$this->library->addUpdate($entry);
				}
			}
			$lap = self::getTime();
			echo "Time taken Feed = " . number_format(($lap - $start), 2) . " secs ";
		}
		return $this->library;
	}

	static function getTime() {
		$a = explode(' ', microtime());
		return (double) $a[0] + $a[1];
	}

	static function debug($message, $multiLine = false) {
		if ($multiLine) {
			//echo "/*$message*/\n";
		} else {
			//echo "//$message\n";
		}
	}
}
?>