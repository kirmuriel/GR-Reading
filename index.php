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

		<div id="challenge_widget" >
			<!--div id="gr_challenge_207"
				 style="border: 2px solid #EBE8D5; -moz-border-radius:10px; padding: 0 7px 0 7px; max-width:150px; min-height: 100px">
				<div id="gr_challenge_progress_body_207"
					 style="font-size: 12px; font-family: georgia,serif;line-height: 18px">
					<h3 style="margin: 4px 0 10px; font-weight: normal; text-align: center">
						<a href="http://www.goodreads.com/challenges/207-2012-reading-challenge"
						   style="text-decoration: none; font-family:georgia,serif;font-style:italic; font-size: 1.1em">title</a>
					</h3>
					<div style="width: 100px; margin: 4px 5px 5px 0; float: left; border: 1px solid #382110; height: 8px; overflow: hidden; background-color: #FFF">
						<div style="width: 10%; background-color: #D7D2C4; float: left"><span style="visibility:hidden">hide</span>
						</div>
					</div>
					<div style="font-family: arial, verdana, helvetica, sans-serif;font-size:90%">
						<a href="http://www.goodreads.com/user_challenges/241309">6 of 60 (10%)</a>
					</div>
					<div style="text-align: right;">
						<a href="http://www.goodreads.com/user_challenges/241309"
						   style="text-decoration: none; font-size: 10px;">view books</a>
					</div>
				</div>
				<script src="http://www.goodreads.com/user_challenges/widget/5206760-isabel?challenge_id=207&amp;v=2"
						type="text/javascript"></script>
			</div-->
		</div>

		<div id="wa_days_widget" style="float:right;">

			<!--script type="text/javascript" id="WolframAlphaScriptfc98d547fa3836c294ea4ad9621eac4c" src="http://www.wolframalpha.com/widget/widget.jsp?id=fc98d547fa3836c294ea4ad9621eac4c&height=100"></script-->
			<!--script type="text/javascript" id="WolframAlphaScriptbae3f76933cad31b6348c986a64d18eb" src="http://www.wolframalpha.com/widget/widget.jsp?id=bae3f76933cad31b6348c986a64d18eb"></script-->
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
