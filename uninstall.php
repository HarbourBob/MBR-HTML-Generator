<?php
/**
 * Uninstall handler for MBR HTML Generator.
 *
 * The plugin stores no options, no post meta, no custom tables, and no user
 * meta. Editor preferences (theme, format, wrap) live in the browser's
 * localStorage and are out of scope for server-side cleanup.
 *
 * This file exists so WordPress will run it on uninstall, leaving a clear
 * record that there is nothing to remove.
 *
 * @package MBR_HTML_Generator
 */

if ( ! defined( 'WP_UNINSTALL_PLUGIN' ) ) {
	exit;
}

// Nothing to clean up.
