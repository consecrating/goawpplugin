<?php
/**
 * Uninstall handler for GOA SEO Booster.
 *
 * Runs when the plugin is deleted from the WordPress admin. Removes the
 * single option created by the plugin so no orphaned data is left behind.
 *
 * @package GoaSeoBooster
 */

// Exit if not invoked by WordPress during uninstall.
if ( ! defined( 'WP_UNINSTALL_PLUGIN' ) ) {
	exit;
}

$option_key = 'goa_seo_settings';

// Single site.
delete_option( $option_key );

// Multisite: remove the option from every site.
if ( is_multisite() ) {
	$site_ids = get_sites( array( 'fields' => 'ids' ) );
	foreach ( $site_ids as $site_id ) {
		switch_to_blog( $site_id );
		delete_option( $option_key );
		restore_current_blog();
	}
}
