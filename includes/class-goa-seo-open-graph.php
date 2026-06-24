<?php
/**
 * Open Graph and Twitter Card module.
 *
 * @package GoaSeoBooster
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Outputs Open Graph and Twitter Card meta tags for richer social sharing.
 */
class Goa_Seo_Open_Graph {

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

		// Allow OG tags on the <html> element namespace.
		add_filter( 'language_attributes', array( $this, 'add_og_namespace' ) );
		add_action( 'wp_head', array( $this, 'output_tags' ), 2 );
	}

	/**
	 * Add the Open Graph prefix to the <html> element.
	 *
	 * @param string $output Existing language attributes.
	 * @return string
	 */
	public function add_og_namespace( $output ) {
		if ( false === strpos( $output, 'prefix=' ) ) {
			$output .= ' prefix="og: https://ogp.me/ns#"';
		}
		return $output;
	}

	/**
	 * Output the OG and Twitter tags.
	 */
	public function output_tags() {
		$data = $this->get_data();

		echo "\n<!-- GOA SEO Booster: Open Graph -->\n";

		$this->tag_property( 'og:locale', get_locale() );
		$this->tag_property( 'og:type', $data['type'] );
		$this->tag_property( 'og:site_name', $data['site_name'] );
		$this->tag_property( 'og:title', $data['title'] );
		$this->tag_property( 'og:description', $data['description'] );
		$this->tag_property( 'og:url', $data['url'] );

		if ( ! empty( $data['image'] ) ) {
			$this->tag_property( 'og:image', $data['image'], true );
			$this->tag_property( 'og:image:secure_url', $data['image'], true );
			if ( ! empty( $data['image_width'] ) ) {
				$this->tag_property( 'og:image:width', $data['image_width'] );
			}
			if ( ! empty( $data['image_height'] ) ) {
				$this->tag_property( 'og:image:height', $data['image_height'] );
			}
			if ( ! empty( $data['image_alt'] ) ) {
				$this->tag_property( 'og:image:alt', $data['image_alt'] );
			}
		}

		// Article specifics.
		if ( 'article' === $data['type'] && ! empty( $data['published'] ) ) {
			$this->tag_property( 'article:published_time', $data['published'] );
			if ( ! empty( $data['modified'] ) ) {
				$this->tag_property( 'article:modified_time', $data['modified'] );
			}
		}

		// Twitter Card.
		$card = $this->get( 'twitter_card', 'summary_large_image' );
		$this->tag_name( 'twitter:card', $card );
		$this->tag_name( 'twitter:title', $data['title'] );
		$this->tag_name( 'twitter:description', $data['description'] );
		if ( ! empty( $data['image'] ) ) {
			$this->tag_name( 'twitter:image', $data['image'], true );
		}
		$twitter_site = $this->get( 'twitter_site' );
		if ( ! empty( $twitter_site ) ) {
			$handle = '@' . ltrim( $twitter_site, '@' );
			$this->tag_name( 'twitter:site', $handle );
		}

		echo "<!-- /GOA SEO Booster: Open Graph -->\n";
	}

	/**
	 * Assemble the contextual data used to build the tags.
	 *
	 * @return array
	 */
	private function get_data() {
		$site_name   = get_bloginfo( 'name' );
		$type        = 'website';
		$url         = home_url( add_query_arg( array(), $GLOBALS['wp']->request ?? '' ) );
		$title       = $site_name;
		$description = '';
		$image       = $this->get( 'og_default_image' );
		$image_w     = '';
		$image_h     = '';
		$image_alt   = '';
		$published   = '';
		$modified    = '';

		// Reuse the meta module's description resolution when available.
		if ( class_exists( 'Goa_Seo_Meta_Tags' ) ) {
			$meta        = new Goa_Seo_Meta_Tags( $this->settings );
			$description = $meta->get_description();
			$canonical   = $meta->get_canonical();
			if ( ! empty( $canonical ) ) {
				$url = $canonical;
			}
		}

		if ( is_front_page() || is_home() ) {
			$home_title = $this->get( 'home_title' );
			$title      = ! empty( $home_title ) ? $home_title : $site_name;
			$url        = home_url( '/' );
		} elseif ( is_singular() ) {
			$post  = get_queried_object();
			$type  = is_singular( 'post' ) ? 'article' : 'website';
			$title = get_the_title( $post );

			if ( has_post_thumbnail( $post ) ) {
				$thumb_id  = get_post_thumbnail_id( $post );
				$thumb     = wp_get_attachment_image_src( $thumb_id, 'full' );
				if ( $thumb ) {
					$image     = $thumb[0];
					$image_w   = $thumb[1];
					$image_h   = $thumb[2];
					$image_alt = trim( (string) get_post_meta( $thumb_id, '_wp_attachment_image_alt', true ) );
				}
			}

			if ( 'article' === $type ) {
				$published = get_the_date( DATE_W3C, $post );
				$modified  = get_the_modified_date( DATE_W3C, $post );
			}
		}

		$data = array(
			'site_name'    => $site_name,
			'type'         => $type,
			'url'          => $url,
			'title'        => $title,
			'description'  => $description,
			'image'        => $image,
			'image_width'  => $image_w,
			'image_height' => $image_h,
			'image_alt'    => $image_alt,
			'published'    => $published,
			'modified'     => $modified,
		);

		/**
		 * Filter the Open Graph data array.
		 *
		 * @param array $data Open Graph data.
		 */
		return apply_filters( 'goa_seo_open_graph_data', $data );
	}

	/**
	 * Print an Open Graph property meta tag.
	 *
	 * @param string $property Property name.
	 * @param string $content  Content value.
	 * @param bool   $is_url   Whether the content is a URL.
	 */
	private function tag_property( $property, $content, $is_url = false ) {
		if ( '' === trim( (string) $content ) ) {
			return;
		}
		$value = $is_url ? esc_url( $content ) : esc_attr( $content );
		printf( '<meta property="%s" content="%s" />' . "\n", esc_attr( $property ), $value );
	}

	/**
	 * Print a name-based meta tag (Twitter).
	 *
	 * @param string $name    Name attribute.
	 * @param string $content Content value.
	 * @param bool   $is_url  Whether the content is a URL.
	 */
	private function tag_name( $name, $content, $is_url = false ) {
		if ( '' === trim( (string) $content ) ) {
			return;
		}
		$value = $is_url ? esc_url( $content ) : esc_attr( $content );
		printf( '<meta name="%s" content="%s" />' . "\n", esc_attr( $name ), $value );
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
