<?php
/**
 * Meta tags module: document title, meta description, canonical, robots.
 *
 * @package GoaSeoBooster
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Outputs SEO meta tags in the document <head>.
 */
class Goa_Seo_Meta_Tags {

	/**
	 * Plugin settings.
	 *
	 * @var array
	 */
	private $settings;

	/**
	 * Constructor.
	 *
	 * @param array $settings Resolved settings.
	 */
	public function __construct( $settings ) {
		$this->settings = $settings;

		// Title handling.
		add_theme_support( 'title-tag' );
		add_filter( 'document_title_parts', array( $this, 'filter_title_parts' ), 20 );
		add_filter( 'document_title_separator', array( $this, 'title_separator' ) );

		// Head output.
		add_action( 'wp_head', array( $this, 'output_meta' ), 1 );
	}

	/**
	 * Customize the document title parts using the configured home title.
	 *
	 * @param array $parts Title parts (title, page, tagline, site).
	 * @return array
	 */
	public function filter_title_parts( $parts ) {
		if ( is_front_page() || is_home() ) {
			$home_title = $this->get( 'home_title' );
			if ( ! empty( $home_title ) ) {
				$parts['title']   = $home_title;
				$parts['tagline'] = '';
			}
		}
		return $parts;
	}

	/**
	 * Title separator.
	 *
	 * @param string $sep Default separator.
	 * @return string
	 */
	public function title_separator( $sep ) {
		return '|';
	}

	/**
	 * Output meta description, canonical, and robots tags.
	 */
	public function output_meta() {
		echo "\n<!-- GOA SEO Booster: meta -->\n";

		$description = $this->get_description();
		if ( ! empty( $description ) ) {
			printf(
				'<meta name="description" content="%s" />' . "\n",
				esc_attr( $description )
			);
		}

		$canonical = $this->get_canonical();
		if ( ! empty( $canonical ) ) {
			printf(
				'<link rel="canonical" href="%s" />' . "\n",
				esc_url( $canonical )
			);
		}

		$robots = $this->get_robots();
		if ( ! empty( $robots ) ) {
			printf(
				'<meta name="robots" content="%s" />' . "\n",
				esc_attr( $robots )
			);
		}

		echo "<!-- /GOA SEO Booster: meta -->\n";
	}

	/**
	 * Resolve the meta description for the current context.
	 *
	 * @return string
	 */
	public function get_description() {
		$description = '';

		if ( is_front_page() || is_home() ) {
			$description = $this->get( 'home_description' );
		} elseif ( is_singular() ) {
			$post = get_queried_object();
			if ( $post instanceof WP_Post ) {
				if ( has_excerpt( $post ) ) {
					$description = get_the_excerpt( $post );
				} else {
					$description = wp_trim_words( wp_strip_all_tags( $post->post_content ), 30, '' );
				}
			}
		} elseif ( is_category() || is_tag() || is_tax() ) {
			$term_desc = term_description();
			if ( ! empty( $term_desc ) ) {
				$description = wp_strip_all_tags( $term_desc );
			}
		}

		if ( empty( $description ) ) {
			$description = $this->get( 'default_description' );
		}
		if ( empty( $description ) ) {
			$description = get_bloginfo( 'description' );
		}

		$description = trim( preg_replace( '/\s+/', ' ', (string) $description ) );

		/**
		 * Filter the resolved meta description.
		 *
		 * @param string $description The meta description.
		 */
		return apply_filters( 'goa_seo_meta_description', $description );
	}

	/**
	 * Resolve the canonical URL for the current context.
	 *
	 * @return string
	 */
	public function get_canonical() {
		$canonical = '';

		if ( is_front_page() ) {
			$canonical = home_url( '/' );
		} elseif ( is_singular() ) {
			$canonical = get_permalink( get_queried_object_id() );
		} elseif ( is_category() || is_tag() || is_tax() ) {
			$term = get_queried_object();
			if ( $term && ! is_wp_error( $term ) ) {
				$link = get_term_link( $term );
				if ( ! is_wp_error( $link ) ) {
					$canonical = $link;
				}
			}
		} elseif ( is_post_type_archive() ) {
			$canonical = get_post_type_archive_link( get_post_type() );
		}

		/**
		 * Filter the canonical URL.
		 *
		 * @param string $canonical Canonical URL.
		 */
		return apply_filters( 'goa_seo_canonical', $canonical );
	}

	/**
	 * Resolve the robots directive for the current context.
	 *
	 * @return string
	 */
	public function get_robots() {
		$directives = array( 'index', 'follow' );

		// Avoid indexing search, paginated, and author archives that add little value.
		if ( is_search() || is_404() ) {
			$directives = array( 'noindex', 'follow' );
		}

		$robots = implode( ', ', $directives );

		/**
		 * Filter the robots meta value.
		 *
		 * @param string $robots Robots directive.
		 */
		return apply_filters( 'goa_seo_robots', $robots );
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
