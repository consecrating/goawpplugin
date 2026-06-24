<?php
/**
 * JSON-LD structured data module.
 *
 * Outputs a single @graph containing WebSite, Organization/LocalBusiness,
 * WebPage, BreadcrumbList and (optionally) FAQPage nodes.
 *
 * @package GoaSeoBooster
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Builds and prints schema.org JSON-LD structured data.
 */
class Goa_Seo_Schema {

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
		add_action( 'wp_head', array( $this, 'output_schema' ), 5 );
	}

	/**
	 * Output the JSON-LD @graph.
	 */
	public function output_schema() {
		$graph = array();

		$graph[] = $this->website_node();
		$graph[] = $this->business_node();

		$webpage = $this->webpage_node();
		if ( $webpage ) {
			$graph[] = $webpage;
		}

		$breadcrumb = $this->breadcrumb_node();
		if ( $breadcrumb ) {
			$graph[] = $breadcrumb;
		}

		$faq = $this->faq_node();
		if ( $faq ) {
			$graph[] = $faq;
		}

		/**
		 * Filter the full JSON-LD graph before output.
		 *
		 * @param array $graph    Array of schema nodes.
		 * @param array $settings Plugin settings.
		 */
		$graph = apply_filters( 'goa_seo_schema_graph', $graph, $this->settings );

		if ( empty( $graph ) ) {
			return;
		}

		$document = array(
			'@context' => 'https://schema.org',
			'@graph'   => array_values( array_filter( $graph ) ),
		);

		$json = wp_json_encode( $document, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE );

		echo "\n<!-- GOA SEO Booster: JSON-LD -->\n";
		echo '<script type="application/ld+json">' . $json . '</script>' . "\n";
		echo "<!-- /GOA SEO Booster: JSON-LD -->\n";
	}

	/**
	 * WebSite node with SearchAction (sitelinks search box).
	 *
	 * @return array
	 */
	private function website_node() {
		$home = home_url( '/' );

		return array(
			'@type'           => 'WebSite',
			'@id'             => $home . '#website',
			'url'             => $home,
			'name'            => get_bloginfo( 'name' ),
			'description'     => get_bloginfo( 'description' ),
			'inLanguage'      => get_bloginfo( 'language' ),
			'publisher'       => array( '@id' => $home . '#business' ),
			'potentialAction' => array(
				array(
					'@type'       => 'SearchAction',
					'target'      => array(
						'@type'       => 'EntryPoint',
						'urlTemplate' => $home . '?s={search_term_string}',
					),
					'query-input' => 'required name=search_term_string',
				),
			),
		);
	}

	/**
	 * Organization / LocalBusiness node.
	 *
	 * @return array
	 */
	private function business_node() {
		$home = home_url( '/' );
		$type = $this->get( 'business_type', 'LocalBusiness' );

		$node = array(
			'@type' => $type,
			'@id'   => $home . '#business',
			'name'  => $this->get( 'business_name', get_bloginfo( 'name' ) ),
			'url'   => $home,
		);

		$phone = $this->get( 'business_phone' );
		if ( ! empty( $phone ) ) {
			$node['telephone'] = $phone;
		}

		$price = $this->get( 'price_range' );
		if ( ! empty( $price ) ) {
			$node['priceRange'] = $price;
		}

		// Logo / image.
		$logo = $this->get( 'business_logo' );
		if ( empty( $logo ) && has_custom_logo() ) {
			$logo_id = get_theme_mod( 'custom_logo' );
			$logo    = wp_get_attachment_image_url( $logo_id, 'full' );
		}
		if ( ! empty( $logo ) ) {
			$node['logo']  = $logo;
			$node['image'] = $logo;
		}

		// Postal address.
		$address = array_filter(
			array(
				'@type'           => 'PostalAddress',
				'streetAddress'   => $this->get( 'business_street' ),
				'addressLocality' => $this->get( 'business_city' ),
				'addressRegion'   => $this->get( 'business_region' ),
				'postalCode'      => $this->get( 'business_postal' ),
				'addressCountry'  => $this->get( 'business_country' ),
			)
		);
		if ( count( $address ) > 1 ) {
			$node['address'] = $address;
		}

		// Geo coordinates.
		$lat = $this->get( 'business_lat' );
		$lng = $this->get( 'business_lng' );
		if ( '' !== $lat && '' !== $lng ) {
			$node['geo'] = array(
				'@type'     => 'GeoCoordinates',
				'latitude'  => (float) $lat,
				'longitude' => (float) $lng,
			);
		}

		// sameAs social profiles.
		$same_as = $this->lines_to_array( $this->get( 'sameas_profiles' ) );
		$same_as = array_values( array_filter( array_map( 'esc_url_raw', $same_as ) ) );
		if ( ! empty( $same_as ) ) {
			$node['sameAs'] = $same_as;
		}

		return $node;
	}

	/**
	 * WebPage node for the current request.
	 *
	 * @return array|null
	 */
	private function webpage_node() {
		$home = home_url( '/' );
		$url  = '';
		$name = '';

		if ( is_front_page() ) {
			$url  = $home;
			$name = $this->get( 'home_title', get_bloginfo( 'name' ) );
		} elseif ( is_singular() ) {
			$id   = get_queried_object_id();
			$url  = get_permalink( $id );
			$name = get_the_title( $id );
		} else {
			return null;
		}

		if ( empty( $url ) ) {
			return null;
		}

		return array(
			'@type'      => 'WebPage',
			'@id'        => $url . '#webpage',
			'url'        => $url,
			'name'       => $name,
			'isPartOf'   => array( '@id' => $home . '#website' ),
			'about'      => array( '@id' => $home . '#business' ),
			'inLanguage' => get_bloginfo( 'language' ),
		);
	}

	/**
	 * BreadcrumbList node for singular content.
	 *
	 * @return array|null
	 */
	private function breadcrumb_node() {
		if ( is_front_page() ) {
			return null;
		}

		$items     = array();
		$position  = 1;
		$items[]   = $this->crumb( $position++, get_bloginfo( 'name' ), home_url( '/' ) );

		if ( is_singular() ) {
			$id = get_queried_object_id();

			// Include the primary category for posts.
			if ( is_singular( 'post' ) ) {
				$cats = get_the_category( $id );
				if ( ! empty( $cats ) ) {
					$cat   = $cats[0];
					$link  = get_category_link( $cat->term_id );
					$items[] = $this->crumb( $position++, $cat->name, $link );
				}
			}

			$items[] = $this->crumb( $position, get_the_title( $id ), get_permalink( $id ) );
		} elseif ( is_category() || is_tag() || is_tax() ) {
			$term = get_queried_object();
			if ( $term && ! is_wp_error( $term ) ) {
				$link    = get_term_link( $term );
				$items[] = $this->crumb( $position, $term->name, is_wp_error( $link ) ? '' : $link );
			}
		} else {
			return null;
		}

		if ( count( $items ) < 2 ) {
			return null;
		}

		return array(
			'@type'           => 'BreadcrumbList',
			'@id'             => home_url( '/' ) . '#breadcrumb',
			'itemListElement' => $items,
		);
	}

	/**
	 * Build a single breadcrumb list item.
	 *
	 * @param int    $position Position in list.
	 * @param string $name     Item name.
	 * @param string $url      Item URL.
	 * @return array
	 */
	private function crumb( $position, $name, $url ) {
		$item = array(
			'@type'    => 'ListItem',
			'position' => $position,
			'name'     => $name,
		);
		if ( ! empty( $url ) ) {
			$item['item'] = $url;
		}
		return $item;
	}

	/**
	 * FAQPage node, built from the configured Q|A lines. Front page only.
	 *
	 * @return array|null
	 */
	private function faq_node() {
		if ( ! is_front_page() ) {
			return null;
		}

		$raw = $this->get( 'faq_items' );
		if ( empty( $raw ) ) {
			return null;
		}

		$entities = array();
		foreach ( $this->lines_to_array( $raw ) as $line ) {
			if ( false === strpos( $line, '|' ) ) {
				continue;
			}
			list( $question, $answer ) = array_map( 'trim', explode( '|', $line, 2 ) );
			if ( '' === $question || '' === $answer ) {
				continue;
			}
			$entities[] = array(
				'@type'          => 'Question',
				'name'           => $question,
				'acceptedAnswer' => array(
					'@type' => 'Answer',
					'text'  => $answer,
				),
			);
		}

		if ( empty( $entities ) ) {
			return null;
		}

		return array(
			'@type'      => 'FAQPage',
			'@id'        => home_url( '/' ) . '#faq',
			'mainEntity' => $entities,
		);
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
