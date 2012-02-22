<?php

class Book {

	/**
	 *
	 * @var Shelves
	 */
	var $shelf = Shelves::Other;
	var $totalPages = 0;
	var $title = "";
	var $finishedOn = 0;
	var $rawReadUpdates = array();
	var $dailyUpdates = null;
	var $lastUpdateDate = 0;
	var $needsUpdate = true;
	var $bookId = -1;
	var $hash = "";

	const status_feed_base = "http://www.goodreads.com/user_status/list/";
	const feed_base = "http://www.goodreads.com/review/list.xml?v=2&key=0Ocs0PYjLa4tMbFPOC3chg&id=";
	const read_query_feed = "&shelf=read&search[query]=";
	const currently_reading_feed = "&shelf=currently-reading&search[query]=";


	function __construct($title = "", $hash = "") {
		$this->title = $title;
		$this->finishedOn = 0;
		$this->hash = $hash;
	}

	public function __toString() {
		return "($this->shelf) $this->bookId = $this->title[$this->totalPages]";
	}

	/**
	 * @return Shelves $shelf
	 */
	public function getShelf() {
		return $this->shelf;
	}

	/**
	 * @return int $totalPages
	 */
	public function getTotalPages() {
		return $this->totalPages;
	}

	/**
	 * @return string $title
	 */
	public function getTitle() {
		return $this->title;
	}

	/**
	 * @return int $finishedOn
	 */
	public function getFinishedOn() {
		return Util::getOffset($this->finishedOn);
	}

	/**
	 * @return int $bookId
	 */
	public function getBookId() {
		return $this->bookId;
	}

	/**
	 * @return string $hash
	 */
	public function getHash() {
		return $this->hash;
	}

	/**
	 * @param Shelves $shelf
	 */
	public function setShelf($shelf) {
		$this->shelf = $shelf;
	}

	/**
	 * @param number $totalPages
	 */
	public function setTotalPages($totalPages) {
		$this->totalPages = $totalPages;
	}

	/**
	 * @param string $title
	 */
	public function setTitle($title) {
		$this->title = $title;
	}

	/**
	 * @param int $finishedOn
	 */
	public function setFinishedOn($finishedOn) {
		$this->finishedOn = $finishedOn;
		if ($finishedOn != 0) {
			$this->setShelf(Shelves::Read);
		}
	}

	/**
	 * @param int $bookId
	 */
	public function setBookId($bookId) {
		$this->bookId = $bookId;
	}

	/**
	 * @param string $hash
	 */
	public function setHash($hash) {
		$this->hash = $hash;
	}

	public function addStatusUpdate($page, $date) {
		$this->rawReadUpdates[] = array('page' => $page, 'date' => $date);
		$this->needsUpdate = true;
	}

	/**
	 * @return array
	 */
	public function getStatusUpdates() {
		if ($this->dailyUpdates == null || $this->needsUpdate) {
			$this->dailyUpdates = array();

			if ($this->finishedOn != 0 && $this->totalPages != 0) {
				$this->dailyUpdates[Util::getDay($this->finishedOn)] = $this->totalPages;
			}
			foreach ($this->rawReadUpdates as $rawUpdate) {
				if (!isset($this->dailyUpdates[Util::getDay($rawUpdate['date'])])) {
					$this->dailyUpdates[Util::getDay($rawUpdate['date'])] = $rawUpdate['page'];

				}
			}
			$this->needsUpdate = false;
		}
		return $this->dailyUpdates;
	}

	public function completeInfo($userIdName) {
		$escaped_title = str_replace(array(" ", "."), array("+", ""), $this->getTitle());

		$feed_url = self::feed_base . $userIdName . self::currently_reading_feed . $escaped_title;
		$get_read_date = true;
		if ($this->getShelf() == Shelves::Other) {
			$get_read_date = true;
			$feed_url = self::feed_base . $userIdName . self::currently_reading_feed . $escaped_title;
		} else if ($this->getShelf() == Shelves::Read) {
			$feed_url = self::feed_base . $userIdName . self::read_query_feed . $escaped_title;
			$get_read_date = false;
		}
		$content = file_get_contents($feed_url);
		$x = new SimpleXmlElement ($content, LIBXML_NOCDATA);
		foreach ($x->reviews->review as $review) {
			$trimmed_title = preg_replace('/(\.\.\.)$/', '', $this->getTitle());
			$book_id = (int)$review->book->id;
			$book_title = trim($review->book->title);
			$pages = (int)$review->book->num_pages;

			$pages_condition = ($pages == 0 || $this->getTotalPages() == 0 || ($this->getTotalPages() == $pages));
			$read = 0;
			if ($get_read_date) {
				$shelves_names = "";
				$shelves = $review->shelves;
				foreach ($shelves->shelf as $shelf) {
					$attributes = $shelf->attributes();
					$shelves_names .= ($attributes["name"]." ");
				}
				GRUser::debug($shelves_names);
				$read = strtotime($review->read_at);
			}
			if ((strpos($book_title, $trimmed_title) === 0) && $pages_condition) {
				$this->setTitle($book_title);

				$this->setBookId($book_id);
				if ($read && $this->getShelf() == Shelves::Other) {
					$this->setFinishedOn($read);
					$offset = $this->getFinishedOn();
					GRUser::debug( $read." ". gmdate("r",$read));
					GRUser::debug( $offset." ". gmdate("r",$offset));
				} else if (!$read && $this->getShelf() == Shelves::Other) {
					GRUser::debug("not read currently?");
					//$book->setShelf(Shelves::Currently);
				}
				break;
			}
		}


	}
	public function getStatusUpdatesWithDelta() {
		return Util::mapToColumnArrays($this->getStatusUpdates(), array('date', 'page'));
	}


}

class Util {
	//@todo change to more human readable format strtotime()
	static $offset = array(1270368000 => -5, 1288508400 => -6, 1301817600 => -5,
		1319958000 => -6, 1333267200 => -5, 1351407600 => -6,
		1365321600 => -5, 1382857200 => -6, 1396771200 => -5,
		1414306800 => -6);

	const hourInSec = 3600;

	static function getOffset($date) {
		$current_offset = 0;
		// Search time offset hardcoded
		foreach (self::$offset as $begin_date => $offset) {
			if ($begin_date > $date) {
				break;
			}
			$current_offset = $offset;
		}
		// Change timezone
		$date += (self::hourInSec * $current_offset);
		// Remove hour
		return $date;
	}

	static function getDay($date) {
		$date = self::getOffset($date);
		// Remove hour
		return $date - ($date % 86400);
	}

	static function mapToColumnArrays($map, $columnLabels) {
		if (!is_array($map)) {
			return array();
		}
		$array = array();
		foreach ($columnLabels as $label) {
			$array[$label] = array();
		}

		foreach ($map as $key => $value) {
			$array[$columnLabels[0]][] = $key;
			$array[$columnLabels[1]][] = $value;

		}
		return $array;
	}
}

class Shelves {
	const Read = 0;
	const Currently = 1;
	const Other = 2;
}

?>