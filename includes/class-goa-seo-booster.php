<?php
/**
 * Core loader for GOA SEO Booster.
 *
 * @package GoaSeoBooster
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Main plugin class. Loads modules and exposes shared settings.
 */
final class Goa_Seo_Booster {

	/**
	 * Singleton instance.
	 *
	 * @var Goa_Seo_Booster|null
	 */
	private static $instance = null;

	/**
	 * Resolved plugin settings (merged with defaults).
	 *
	 * @var array
	 */
	private $settings = array();

	/**
	 * Loaded module instances.
	 *
	 * @var array
	 */
	private $modules = array();

	/**
	 * Retrieve the singleton instance.
	 *
	 * @return Goa_Seo_Booster
	 */
	public static function instance() {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	/**
	 * Constructor: load dependencies and register hooks.
	 */
	private function __construct() {
		$this->load_dependencies();
		add_action( 'plugins_loaded', array( $this, 'boot' ) );
		add_filter(
			'plugin_action_links_' . GOA_SEO_BASENAME,
			array( $this, 'action_links' )
		);
	}

	/**
	 * Require all module files.
	 */
	private function load_dependencies() {
		require_once GOA_SEO_PATH . 'includes/class-goa-seo-settings.php';
		require_once GOA_SEO_PATH . 'includes/class-goa-seo-meta-tags.php';
		require_once GOA_SEO_PATH . 'includes/class-goa-seo-open-graph.php';
		require_once GOA_SEO_PATH . 'includes/class-goa-seo-schema.php';
		require_once GOA_SEO_PATH . 'includes/class-goa-seo-performance.php';
	}

	/**
	 * Boot all modules after WordPress is fully loaded.
	 */
	public function boot() {
		// Load translations.
		load_plugin_textdomain( 'goa-seo-booster', false, dirname( GOA_SEO_BASENAME ) . '/languages' );

		$this->settings = $this->get_settings();

		// Admin settings UI.
		if ( is_admin() ) {
			$this->modules['settings'] = new Goa_Seo_Settings( $this->settings );
		}

		// Front-end modules (only output on the public site).
		if ( ! is_admin() ) {
			if ( $this->enabled( 'meta_enabled' ) ) {
				$this->modules['meta'] = new Goa_Seo_Meta_Tags( $this->settings );
			}
			if ( $this->enabled( 'og_enabled' ) ) {
				$this->modules['og'] = new Goa_Seo_Open_Graph( $this->settings );
			}
			if ( $this->enabled( 'schema_enabled' ) ) {
				$this->modules['schema'] = new Goa_Seo_Schema( $this->settings );
			}
			if ( $this->enabled( 'perf_enabled' ) ) {
				$this->modules['performance'] = new Goa_Seo_Performance( $this->settings );
			}
		}
	}

	/**
	 * Get merged settings (stored values + defaults).
	 *
	 * @return array
	 */
	public function get_settings() {
		$stored = (array) get_option( GOA_SEO_OPTION, array() );
		return wp_parse_args( $stored, Goa_Seo_Settings::get_defaults() );
	}

	/**
	 * Check whether a boolean setting is enabled.
	 *
	 * @param string $key Setting key.
	 * @return bool
	 */
	private function enabled( $key ) {
		return ! empty( $this->settings[ $key ] );
	}

	/**
	 * Add a "Settings" link on the Plugins screen.
	 *
	 * @param array $links Existing action links.
	 * @return array
	 */
	public function action_links( $links ) {
		$url      = admin_url( 'options-general.php?page=goa-seo-booster' );
		$settings = '<a href="' . esc_url( $url ) . '">' . esc_html__( 'Settings', 'goa-seo-booster' ) . '</a>';
		array_unshift( $links, $settings );
		return $links;
	}
}
