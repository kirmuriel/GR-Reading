<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN"
		"http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<?php session_start(); ?>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
	<title></title>
	<link rel="stylesheet" href="css/default.css"/>
	<script src="js/jquery-1.2.6.pack.js" type="text/javascript"></script>
	<script type="text/javascript" src="https://www.google.com/jsapi"></script>

</head>
<body class='home'>
<?php require_once "includes/functions.php"; ?>
<div id="wrap" class='content'>
	<div class="uitext recsLaunchHeader" id="siteheader">
		<div class="mainContent">
			<div class="nav" id="usernav">
				<ul class="content">
					<li class="userNameNav">
						<a href="widgets.php">Widgets</a>
					</li>
					<li class="userNameHeader">
					<a href="http://www.goodreads.com/user/show/<?php /* @var $grUser GRUser */ $grUser = $_SESSION['user']; echo $grUser->userIdName();?>" class="navlink">
							<?php /* @var $grUser GRUser */ $grUser = $_SESSION['user']; echo $grUser->properName();?>
						</a>
					</li>
				</ul>
			</div>
			<div class="content">
				<div id="logo">
					<div class="titleText">Reads Stats</div>
				</div>
			</div>
		</div>
	</div>


	<div id="mysuperdiv" style="left:0px"></div>
	<div id="mainContent" class="noBullet mainContent">
		<ul id="main_books">
			<?php  global $rssPagesTotal; getFeedData($rssPagesTotal); ?>
		</ul>
		<br/>
	</div>
	<div  class="noBullet mainContent ">
		<div class="pageHeader">
			<h1>Charts</h1>
			</div>
		<ul id="main_charts" style="padding-left: 0;">
			<?php  getCharts(); ?>
		</ul>
		<br/>
	</div>



</div>
<!--end wrap-->


</body>
</html>
