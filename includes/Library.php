<?php
require_once 'Book.php';
require_once 'StatusUpdate.php';
class Library {

	private static $algorithm = "adler32";
	/**
	 * key = Update book title, value = hash of update book title
	 * @var array
	 */
	private $title_hash = array();
	/**
	 * key = hash, value = Book
	 * @var Book[string]
	 */
	var $books = array();

	function __construct() {
		$this->title_hash = array();
		$this->books = array();
	}
	/**
	 * @param string $updateBookTitle
	 * @return Book
	 */
	private function &getUpdateBook($updateBookTitle) {
		if (!isset($this->title_hash[$updateBookTitle])) {
			$hash = hash(self::$algorithm, $updateBookTitle, false);
			$this->title_hash[$updateBookTitle] = $hash;
			$this->books[$hash] = new Book($updateBookTitle, $hash);
		}
		return $this->books[$this->title_hash[$updateBookTitle]];
	}

	function addUpdate($entry) {
		$update = new StatusUpdate($entry);
		switch ($update->type) {
			case StatusUpdateTypes::OnPage:
				$this->getUpdateBook($update->bookTitle)->setTotalPages($update->totalPages);
				$this->getUpdateBook($update->bookTitle)->addStatusUpdate($update->page, $update->date);
				break;
			case StatusUpdateTypes::Finish:
				$this->getUpdateBook($update->bookTitle)->setFinishedOn($update->finishedOn);
				break;
			case StatusUpdateTypes::Start:
				$this->getUpdateBook($update->bookTitle)->addStatusUpdate($update->page, $update->date);
				break;
			default:
		}
	}

	/**
	 * @return Book[]
	 */
	function getBooks() {
		$res = array();
		foreach ($this->books as $book) {
			/* @var $book Book */
			$res[] = (string) $book;
		}
		return $res;
	}

	/**
	 * @param string $hash
	 * @return Book
	 */
	private function &getByHash($hash) {
		if (!isset($this->books[$hash])) {
			return null;
		}
		return $this->books[$hash];
	}
}
?>