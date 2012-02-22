<?php if (is_array($this->status)): ?>

	<table class='tableList '>
		<tbody>
			<tr>
				<th colspan='3'>
					<span class='headerBookTitle'> <?php echo  htmlentities(htmlspecialchars_decode($this->title), ENT_QUOTES, "UTF-8"). "[".$this->totalPages."]"; ?></span>
					<span class='toRight'><?php echo $this->finishedOn; ?></span>
				</th>
			</tr>
		</tbody>
		<tbody>
			<?php foreach ($this->status as  $status): ?>
			<tr <?php echo $this->eprint($status['style']); ?> >
				<td class='dateCol'><?php echo $this->eprint($status['date']); ?></td>
				<td class='pageCol'><?php echo $this->eprint($status['page']); ?></td>
				<td class='pageCol'><?php echo $this->eprint($status['pageDelta']); ?></td>
			</tr>

			<?php endforeach; ?>
		</tbody>
	</table>

<?php endif; ?>