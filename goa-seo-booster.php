<?php
/**
 * Plugin Name:       GOA SEO Booster
 * Plugin URI:        https://github.com/consecrating/goawpplugin
 * Description:        Lightweight technical SEO plugin: meta tags, JSON-LD structured data (LocalBusiness, WebSite, FAQ, Breadcrumb), Open Graph/Twitter cards, and front-end performance hints. Built to improve search rankings for Casino Pride Goa (cpofficial.in).
 * Version:           1.0.0
 * Requires at least: 5.6
 * Requires PHP:      7.2
 * Author:            Consecrating
 * Author URI:        https://github.com/consecrating
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       goa-seo-booster
 * Domain Path:       /languages
 *
 * @package GoaSeoBooster
 */

// Prevent direct access.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Plugin version.
 */
define( 'GOA_SEO_VERSION', '1.0.0' );

/**
 * Absolute path to the plugin directory (with trailing slash).
 */
define( 'GOA_SEO_PATH', plugin_dir_path( __FILE__ ) );

/**
 * URL to the plugin directory (with trailing slash).
 */
define( 'GOA_SEO_URL', plugin_dir_url( __FILE__ ) );

/**
 * Plugin basename, e.g. goa-seo-booster/goa-seo-booster.php.
 */
define( 'GOA_SEO_BASENAME', plugin_basename( __FILE__ ) );

/**
 * Option key under which all settings are stored.
 */
define( 'GOA_SEO_OPTION', 'goa_seo_settings' );

/**
 * Load the core loader class and boot the plugin.
 */
require_once GOA_SEO_PATH . 'includes/class-goa-seo-booster.php';

/**
 * Begin execution of the plugin.
 *
 * @return Goa_Seo_Booster
 */
function goa_seo_booster() {
	return Goa_Seo_Booster::instance();
}
goa_seo_booster();

/**
 * Activation hook: seed default options.
 */
register_activation_hook(
	__FILE__,
	function () {
		require_once GOA_SEO_PATH . 'includes/class-goa-seo-settings.php';
		$defaults = Goa_Seo_Settings::get_defaults();

		if ( false === get_option( GOA_SEO_OPTION ) ) {
			add_option( GOA_SEO_OPTION, $defaults );
		} else {
			// Merge in any new defaults without clobbering user values.
			$existing = (array) get_option( GOA_SEO_OPTION );
			update_option( GOA_SEO_OPTION, array_merge( $defaults, $existing ) );
		}

		// Flush rewrite rules in case future versions register endpoints.
		flush_rewrite_rules();
	}
);

/**
 * Deactivation hook.
 */
register_deactivation_hook(
	__FILE__,
	function () {
		flush_rewrite_rules();
	}
);
