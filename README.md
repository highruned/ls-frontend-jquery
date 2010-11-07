# ls-frontend
jQuery alternative to the front-end for the LemonStand platform.

Warning! Warning! Danger, Will Robinson! This is an alpha version. That means it is subject to highly volatile changes. 

MooTools (language prototyping, class centric), is a much different library than jQuery (chaining, functional plugin centric). Compromises have been made for backwards combatibility.

## Installation

1. Remove <?= include_resources() ?> from your templates.
1. Include jQuery first, then ls_frontend.js into your template.
1. Include ls_frontend.css if you want default styles.
1. Remove any references to jQuery.noConflict(). The $ (money) variable is required.

## Example (upload files and change the appropriate paths)

	<link href="<?= root_url('/') ?>resources/css/ls_frontend.css" rel="stylesheet" media="screen" />
	<script src="<?= root_url('/') ?>resources/js/jquery-1.4.2.min.js"></script>
	<script src="<?= root_url('/') ?>resources/js/ls_frontend.js"></script>

## License
`ls-frontend` is released under the MIT license. A copy of the MIT license can be found in the LICENSE file.
