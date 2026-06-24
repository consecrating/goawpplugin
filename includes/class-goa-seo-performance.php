<?php
/**
 * Performance hints module.
 *
 * Adds resource hints (preconnect / dns-prefetch), defers non-critical
 * JavaScript, enables native image lazy-loading, and trims WordPress
 * front-end bloat (emoji script). These directly target the slow LCP and
 * heavy page weight measured on the site.
 *
 * @package GoaSeoBooster
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Front-end performance optimizations.
 */
class Goa_Seo_Performance {

	/**
	 * Plugin settings.
	 *
	 * @var array
	 */
	private $settings;

	/**
	 * Handles that must never be deferred (jQuery core and friends).
	 *
	 * @var array
	 */
	private $defer_skip = array( 'jquery', 'jquery-core', 'jquery-migrate' );

	/**
	 * Constructor.
	 *
	 * @param array $settings Resolved settings.
	 */
	public function __construct( $settings ) {
		$this->settings = $settings;

		// Resource hints.
		add_filter( 'wp_resource_hints', array( $this, 'resource_hints' ), 10, 2 );

		// Defer scripts.
		if ( $this->enabled( 'perf_defer_js' ) ) {
			add_filter( 'script_loader_tag', array( $this, 'defer_scripts' ), 10, 3 );
		}

		// Lazy-load images / iframes.
		if ( $this->enabled( 'perf_lazy_images' ) ) {
			add_filter( 'wp_lazy_loading_enabled', '__return_true' );
			add_filter( 'the_content', array( $this, 'add_lazy_loading' ), 20 );
		}

		// Remove emoji bloat.
		if ( $this->enabled( 'perf_remove_emoji' ) ) {
			add_action( 'init', array( $this, 'disable_emojis' ) );
		}
	}

	/**
	 * Add preconnect and dns-prefetch resource hints.
	 *
	 * @param array  $hints         Current hints for the relation type.
	 * @param string $relation_type Relation type (preconnect, dns-prefetch, etc.).
	 * @return array
	 */
	public function resource_hints( $hints, $relation_type ) {
		if ( 'preconnect' === $relation_type ) {
			foreach ( $this->lines_to_array( $this->get( 'perf_preconnect' ) ) as $url ) {
				$hints[] = array(
					'href'        => $url,
					'crossorigin' => 'anonymous',
				);
			}
		}

		if ( 'dns-prefetch' === $relation_type ) {
			foreach ( $this->lines_to_array( $this->get( 'perf_dns_prefetch' ) ) as $url ) {
				$hints[] = $url;
			}
		}

		return $hints;
	}

	/**
	 * Add the defer attribute to enqueued front-end scripts.
	 *
	 * @param string $tag    The script HTML tag.
	 * @param string $handle The script handle.
	 * @param string $src    The script source URL.
	 * @return string
	 */
	public function defer_scripts( $tag, $handle, $src ) {
		if ( is_admin() ) {
			return $tag;
		}

		// Never defer critical handles.
		if ( in_array( $handle, $this->get_defer_skip(), true ) ) {
			return $tag;
		}

		// Already has defer/async.
		if ( false !== strpos( $tag, ' defer' ) || false !== strpos( $tag, ' async' ) ) {
			return $tag;
		}

		// Only external (src-based) scripts.
		if ( empty( $src ) ) {
			return $tag;
		}

		return str_replace( '<script ', '<script defer ', $tag );
	}

	/**
	 * Ensure images and iframes in content carry loading="lazy".
	 *
	 * @param string $content Post content.
	 * @return string
	 */
	public function add_lazy_loading( $content ) {
		if ( is_admin() || empty( $content ) ) {
			return $content;
		}

		// Skip the first image (likely LCP / above the fold) by leaving
		// images that already specify a loading attribute untouched and only
		// adding lazy to those without one.
		$content = preg_replace_callback(
			'/<(img|iframe)\b(?![^>]*\bloading=)[^>]*>/i',
			function ( $matches ) {
				$tag = $matches[0];
				return str_replace( '<' . $matches[1], '<' . $matches[1] . ' loading="lazy"', $tag );
			},
			$content
		);

		return $content;
	}

	/**
	 * Disable the WordPress emoji detection script and related styles.
	 */
	public function disable_emojis() {
		remove_action( 'wp_head', 'print_emoji_detection_script', 7 );
		remove_action( 'admin_print_scripts', 'print_emoji_detection_script' );
		remove_action( 'wp_print_styles', 'print_emoji_styles' );
		remove_action( 'admin_print_styles', 'print_emoji_styles' );
		remove_filter( 'the_content_feed', 'wp_staticize_emoji' );
		remove_filter( 'comment_text_rss', 'wp_staticize_emoji' );
		remove_filter( 'wp_mail', 'wp_staticize_emoji_for_email' );

		add_filter(
			'tiny_mce_plugins',
			function ( $plugins ) {
				if ( is_array( $plugins ) ) {
					return array_diff( $plugins, array( 'wpemoji' ) );
				}
				return array();
			}
		);

		// Remove the emoji DNS prefetch hint.
		add_filter(
			'wp_resource_hints',
			function ( $urls, $relation_type ) {
				if ( 'dns-prefetch' === $relation_type ) {
					$emoji_svg = apply_filters( 'emoji_svg_url', 'https://s.w.org/images/core/emoji/' );
					$urls      = array_filter(
						$urls,
						function ( $url ) use ( $emoji_svg ) {
							$href = is_array( $url ) && isset( $url['href'] ) ? $url['href'] : $url;
							return is_string( $href ) ? false === strpos( $href, $emoji_svg ) : true;
						}
					);
				}
				return $urls;
			},
			10,
			2
		);
	}

	/**
	 * Handles that should not be deferred (filterable).
	 *
	 * @return array
	 */
	private function get_defer_skip() {
		/**
		 * Filter the list of script handles that must not be deferred.
		 *
		 * @param array $handles Script handles.
		 */
		return apply_filters( 'goa_seo_defer_skip', $this->defer_skip );
	}

	/**
	 * Split a multi-line string into a trimmed, non-empty array.
	 *
	 * @param string $value Raw multi-line string.
	 * @return array
	 */
	private function lines_to_array( $value ) {
		$lines = preg_split( '/\r\n|\r|\n/', (string) $value );
		$lines = array_map( 'trim', $lines );
		return array_values( array_filter( $lines, 'strlen' ) );
	}

	/**
	 * Whether a boolean setting is enabled.
	 *
	 * @param string $key Setting key.
	 * @return bool
	 */
	private function enabled( $key ) {
		return ! empty( $this->settings[ $key ] );
	}

	/**
	 * Get a setting value with a fallback.
	 *
	 * @param string $key     Setting key.
	 * @param mixed  $default Default value.
	 * @return mixed
	 */
	private function get( $key, $default = '' ) {
		return isset( $this->settings[ $key ] ) ? $this->settings[ $key ] : $default;
	}
}
