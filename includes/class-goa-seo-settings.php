<?php
/**
 * Settings store and admin UI for GOA SEO Booster.
 *
 * Provides the canonical defaults used across all modules and renders a
 * tabbed settings screen under Settings > GOA SEO Booster.
 *
 * @package GoaSeoBooster
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Handles plugin settings and the admin page.
 */
class Goa_Seo_Settings {

	/**
	 * Admin page slug.
	 */
	const PAGE = 'goa-seo-booster';

	/**
	 * Settings group name.
	 */
	const GROUP = 'goa_seo_settings_group';

	/**
	 * Resolved settings.
	 *
	 * @var array
	 */
	protected $settings;

	/**
	 * Constructor.
	 *
	 * @param array $settings Resolved settings.
	 */
	public function __construct( $settings = array() ) {
		$this->settings = $settings;
		$this->register();
	}

	/**
	 * Register admin hooks.
	 */
	public function register() {
		add_action( 'admin_menu', array( $this, 'add_menu' ) );
		add_action( 'admin_init', array( $this, 'register_settings' ) );
		add_action( 'admin_enqueue_scripts', array( $this, 'enqueue_assets' ) );
	}

	/**
	 * Canonical default settings.
	 *
	 * @return array
	 */
	public static function get_defaults() {
		return array(
			// Module switches.
			'meta_enabled'      => 1,
			'og_enabled'        => 1,
			'schema_enabled'    => 1,
			'perf_enabled'      => 1,

			// Meta tags.
			'meta_title_template' => '%title% | %sitename%',
			'home_title'          => 'Casino Pride Goa - India\'s Premier Floating Casino',
			'home_description'    => 'Experience Casino Pride Goa, the largest offshore floating casino on the Mandovi River. Live gaming, entertainment, fine dining and unlimited fun. Book your package today.',
			'default_description' => '',

			// Open Graph.
			'og_default_image' => '',
			'twitter_site'     => '',
			'twitter_card'     => 'summary_large_image',

			// Schema / LocalBusiness.
			'business_name'    => 'Casino Pride Goa',
			'business_type'    => 'Casino',
			'business_phone'   => '',
			'business_street'  => 'Noahs Ark, Riviera De Goa Mandovi River',
			'business_city'    => 'Panaji',
			'business_region'  => 'Goa',
			'business_postal'  => '403001',
			'business_country' => 'IN',
			'business_lat'     => '',
			'business_lng'     => '',
			'business_logo'    => '',
			'price_range'      => '$$$',
			'sameas_profiles'  => '', // newline-separated social URLs.

			// FAQ schema (pipe-separated Q|A per line).
			'faq_items'        => '',

			// Performance.
			'perf_preconnect'   => "https://fonts.googleapis.com\nhttps://fonts.gstatic.com",
			'perf_dns_prefetch' => "https://www.google-analytics.com",
			'perf_defer_js'     => 1,
			'perf_lazy_images'  => 1,
			'perf_remove_emoji' => 1,
		);
	}

	/**
	 * Add the settings page under the Settings menu.
	 */
	public function add_menu() {
		add_options_page(
			__( 'GOA SEO Booster', 'goa-seo-booster' ),
			__( 'GOA SEO Booster', 'goa-seo-booster' ),
			'manage_options',
			self::PAGE,
			array( $this, 'render_page' )
		);
	}

	/**
	 * Register the single option with a sanitize callback.
	 */
	public function register_settings() {
		register_setting(
			self::GROUP,
			GOA_SEO_OPTION,
			array(
				'type'              => 'array',
				'sanitize_callback' => array( $this, 'sanitize' ),
				'default'           => self::get_defaults(),
			)
		);
	}

	/**
	 * Enqueue admin CSS only on our settings page.
	 *
	 * @param string $hook Current admin page hook.
	 */
	public function enqueue_assets( $hook ) {
		if ( 'settings_page_' . self::PAGE !== $hook ) {
			return;
		}
		wp_enqueue_style(
			'goa-seo-admin',
			GOA_SEO_URL . 'admin/css/admin.css',
			array(),
			GOA_SEO_VERSION
		);
	}

	/**
	 * Sanitize all submitted settings.
	 *
	 * @param array $input Raw input.
	 * @return array
	 */
	public function sanitize( $input ) {
		$input    = is_array( $input ) ? $input : array();
		$defaults = self::get_defaults();
		$clean    = array();

		// Checkboxes (1 or 0).
		$checkboxes = array(
			'meta_enabled',
			'og_enabled',
			'schema_enabled',
			'perf_enabled',
			'perf_defer_js',
			'perf_lazy_images',
			'perf_remove_emoji',
		);
		foreach ( $checkboxes as $key ) {
			$clean[ $key ] = empty( $input[ $key ] ) ? 0 : 1;
		}

		// Plain text fields.
		$text_fields = array(
			'meta_title_template',
			'home_title',
			'business_name',
			'business_type',
			'business_phone',
			'business_street',
			'business_city',
			'business_region',
			'business_postal',
			'business_country',
			'business_lat',
			'business_lng',
			'price_range',
			'twitter_site',
			'twitter_card',
		);
		foreach ( $text_fields as $key ) {
			$value         = isset( $input[ $key ] ) ? $input[ $key ] : $defaults[ $key ];
			$clean[ $key ] = sanitize_text_field( $value );
		}

		// Textareas (plain multi-line).
		$textareas = array( 'home_description', 'default_description' );
		foreach ( $textareas as $key ) {
			$value         = isset( $input[ $key ] ) ? $input[ $key ] : '';
			$clean[ $key ] = sanitize_textarea_field( $value );
		}

		// URL textareas (one URL per line).
		$url_areas = array( 'sameas_profiles', 'perf_preconnect', 'perf_dns_prefetch' );
		foreach ( $url_areas as $key ) {
			$lines = preg_split( '/\r\n|\r|\n/', (string) ( $input[ $key ] ?? '' ) );
			$lines = array_filter( array_map( 'trim', $lines ), 'strlen' );
			$lines = array_map( 'esc_url_raw', $lines );
			$clean[ $key ] = implode( "\n", $lines );
		}

		// Image URL fields.
		foreach ( array( 'og_default_image', 'business_logo' ) as $key ) {
			$clean[ $key ] = esc_url_raw( $input[ $key ] ?? '' );
		}

		// FAQ items: keep only valid "Question|Answer" lines.
		$faq_lines = preg_split( '/\r\n|\r|\n/', (string) ( $input['faq_items'] ?? '' ) );
		$faq_clean = array();
		foreach ( $faq_lines as $line ) {
			$line = trim( $line );
			if ( '' === $line || false === strpos( $line, '|' ) ) {
				continue;
			}
			list( $q, $a ) = array_map( 'trim', explode( '|', $line, 2 ) );
			if ( '' !== $q && '' !== $a ) {
				$faq_clean[] = sanitize_text_field( $q ) . ' | ' . sanitize_text_field( $a );
			}
		}
		$clean['faq_items'] = implode( "\n", $faq_clean );

		return $clean;
	}

	/**
	 * Render the settings page.
	 */
	public function render_page() {
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}
		$s = wp_parse_args( (array) get_option( GOA_SEO_OPTION, array() ), self::get_defaults() );
		?>
		<div class="wrap goa-seo-wrap">
			<h1><?php esc_html_e( 'GOA SEO Booster', 'goa-seo-booster' ); ?></h1>
			<p class="goa-seo-tagline">
				<?php esc_html_e( 'Lightweight technical SEO: meta tags, structured data, social cards and performance hints.', 'goa-seo-booster' ); ?>
			</p>

			<form method="post" action="options.php">
				<?php settings_fields( self::GROUP ); ?>
				<?php $o = GOA_SEO_OPTION; ?>

				<h2 class="goa-section"><?php esc_html_e( 'Modules', 'goa-seo-booster' ); ?></h2>
				<table class="form-table" role="presentation">
					<?php
					$this->checkbox_row( $o, 'meta_enabled', __( 'Meta tags', 'goa-seo-booster' ), $s, __( 'Title, meta description, canonical and robots tags.', 'goa-seo-booster' ) );
					$this->checkbox_row( $o, 'og_enabled', __( 'Open Graph / Twitter', 'goa-seo-booster' ), $s, __( 'Social sharing cards for Facebook, Twitter/X, WhatsApp.', 'goa-seo-booster' ) );
					$this->checkbox_row( $o, 'schema_enabled', __( 'Structured data', 'goa-seo-booster' ), $s, __( 'JSON-LD for LocalBusiness, WebSite, Breadcrumb and FAQ.', 'goa-seo-booster' ) );
					$this->checkbox_row( $o, 'perf_enabled', __( 'Performance hints', 'goa-seo-booster' ), $s, __( 'Resource hints, deferred JS and lazy images.', 'goa-seo-booster' ) );
					?>
				</table>

				<h2 class="goa-section"><?php esc_html_e( 'Home Page Meta', 'goa-seo-booster' ); ?></h2>
				<table class="form-table" role="presentation">
					<?php
					$this->text_row( $o, 'home_title', __( 'Home title', 'goa-seo-booster' ), $s );
					$this->textarea_row( $o, 'home_description', __( 'Home meta description', 'goa-seo-booster' ), $s, __( 'Aim for 150-160 characters.', 'goa-seo-booster' ) );
					$this->textarea_row( $o, 'default_description', __( 'Fallback description', 'goa-seo-booster' ), $s, __( 'Used when a page has no description or excerpt.', 'goa-seo-booster' ) );
					?>
				</table>

				<h2 class="goa-section"><?php esc_html_e( 'Business / LocalBusiness Schema', 'goa-seo-booster' ); ?></h2>
				<table class="form-table" role="presentation">
					<?php
					$this->text_row( $o, 'business_name', __( 'Business name', 'goa-seo-booster' ), $s );
					$this->text_row( $o, 'business_type', __( 'Schema type', 'goa-seo-booster' ), $s, __( 'e.g. Casino, LocalBusiness, Restaurant, Hotel.', 'goa-seo-booster' ) );
					$this->text_row( $o, 'business_phone', __( 'Telephone', 'goa-seo-booster' ), $s );
					$this->text_row( $o, 'business_street', __( 'Street address', 'goa-seo-booster' ), $s );
					$this->text_row( $o, 'business_city', __( 'City', 'goa-seo-booster' ), $s );
					$this->text_row( $o, 'business_region', __( 'Region / State', 'goa-seo-booster' ), $s );
					$this->text_row( $o, 'business_postal', __( 'Postal code', 'goa-seo-booster' ), $s );
					$this->text_row( $o, 'business_country', __( 'Country code', 'goa-seo-booster' ), $s, __( 'Two-letter ISO code, e.g. IN.', 'goa-seo-booster' ) );
					$this->text_row( $o, 'business_lat', __( 'Latitude', 'goa-seo-booster' ), $s );
					$this->text_row( $o, 'business_lng', __( 'Longitude', 'goa-seo-booster' ), $s );
					$this->text_row( $o, 'price_range', __( 'Price range', 'goa-seo-booster' ), $s, __( 'e.g. $$ or $$$.', 'goa-seo-booster' ) );
					$this->text_row( $o, 'business_logo', __( 'Logo URL', 'goa-seo-booster' ), $s );
					$this->textarea_row( $o, 'sameas_profiles', __( 'Social profiles (sameAs)', 'goa-seo-booster' ), $s, __( 'One full URL per line (Facebook, Instagram, etc.).', 'goa-seo-booster' ) );
					?>
				</table>

				<h2 class="goa-section"><?php esc_html_e( 'FAQ Schema (Home Page)', 'goa-seo-booster' ); ?></h2>
				<table class="form-table" role="presentation">
					<?php
					$this->textarea_row(
						$o,
						'faq_items',
						__( 'FAQ items', 'goa-seo-booster' ),
						$s,
						__( 'One per line in the format: Question | Answer', 'goa-seo-booster' ),
						6
					);
					?>
				</table>

				<h2 class="goa-section"><?php esc_html_e( 'Social Cards', 'goa-seo-booster' ); ?></h2>
				<table class="form-table" role="presentation">
					<?php
					$this->text_row( $o, 'og_default_image', __( 'Default share image URL', 'goa-seo-booster' ), $s );
					$this->text_row( $o, 'twitter_site', __( 'Twitter/X handle', 'goa-seo-booster' ), $s, __( 'Without the @.', 'goa-seo-booster' ) );
					$this->select_row(
						$o,
						'twitter_card',
						__( 'Twitter card type', 'goa-seo-booster' ),
						$s,
						array(
							'summary_large_image' => __( 'Large image', 'goa-seo-booster' ),
							'summary'             => __( 'Summary', 'goa-seo-booster' ),
						)
					);
					?>
				</table>

				<h2 class="goa-section"><?php esc_html_e( 'Performance', 'goa-seo-booster' ); ?></h2>
				<table class="form-table" role="presentation">
					<?php
					$this->textarea_row( $o, 'perf_preconnect', __( 'Preconnect origins', 'goa-seo-booster' ), $s, __( 'One origin per line.', 'goa-seo-booster' ) );
					$this->textarea_row( $o, 'perf_dns_prefetch', __( 'DNS prefetch origins', 'goa-seo-booster' ), $s, __( 'One origin per line.', 'goa-seo-booster' ) );
					$this->checkbox_row( $o, 'perf_defer_js', __( 'Defer JavaScript', 'goa-seo-booster' ), $s, __( 'Add defer to external scripts (jQuery is preserved).', 'goa-seo-booster' ) );
					$this->checkbox_row( $o, 'perf_lazy_images', __( 'Lazy-load images', 'goa-seo-booster' ), $s, __( 'Add loading="lazy" to content images and iframes.', 'goa-seo-booster' ) );
					$this->checkbox_row( $o, 'perf_remove_emoji', __( 'Remove emoji script', 'goa-seo-booster' ), $s, __( 'Disable the extra WordPress emoji JavaScript.', 'goa-seo-booster' ) );
					?>
				</table>

				<?php submit_button(); ?>
			</form>
		</div>
		<?php
	}

	/**
	 * Render a checkbox row.
	 *
	 * @param string $option Option name.
	 * @param string $key    Field key.
	 * @param string $label  Field label.
	 * @param array  $s      Settings.
	 * @param string $desc   Description.
	 */
	private function checkbox_row( $option, $key, $label, $s, $desc = '' ) {
		$id = $option . '_' . $key;
		?>
		<tr>
			<th scope="row"><label for="<?php echo esc_attr( $id ); ?>"><?php echo esc_html( $label ); ?></label></th>
			<td>
				<label class="goa-toggle">
					<input type="checkbox" id="<?php echo esc_attr( $id ); ?>"
						name="<?php echo esc_attr( $option . '[' . $key . ']' ); ?>" value="1"
						<?php checked( ! empty( $s[ $key ] ) ); ?> />
					<?php esc_html_e( 'Enabled', 'goa-seo-booster' ); ?>
				</label>
				<?php if ( $desc ) : ?>
					<p class="description"><?php echo esc_html( $desc ); ?></p>
				<?php endif; ?>
			</td>
		</tr>
		<?php
	}

	/**
	 * Render a text input row.
	 *
	 * @param string $option Option name.
	 * @param string $key    Field key.
	 * @param string $label  Field label.
	 * @param array  $s      Settings.
	 * @param string $desc   Description.
	 */
	private function text_row( $option, $key, $label, $s, $desc = '' ) {
		$id = $option . '_' . $key;
		?>
		<tr>
			<th scope="row"><label for="<?php echo esc_attr( $id ); ?>"><?php echo esc_html( $label ); ?></label></th>
			<td>
				<input type="text" class="regular-text" id="<?php echo esc_attr( $id ); ?>"
					name="<?php echo esc_attr( $option . '[' . $key . ']' ); ?>"
					value="<?php echo esc_attr( $s[ $key ] ?? '' ); ?>" />
				<?php if ( $desc ) : ?>
					<p class="description"><?php echo esc_html( $desc ); ?></p>
				<?php endif; ?>
			</td>
		</tr>
		<?php
	}

	/**
	 * Render a textarea row.
	 *
	 * @param string $option Option name.
	 * @param string $key    Field key.
	 * @param string $label  Field label.
	 * @param array  $s      Settings.
	 * @param string $desc   Description.
	 * @param int    $rows   Number of rows.
	 */
	private function textarea_row( $option, $key, $label, $s, $desc = '', $rows = 3 ) {
		$id = $option . '_' . $key;
		?>
		<tr>
			<th scope="row"><label for="<?php echo esc_attr( $id ); ?>"><?php echo esc_html( $label ); ?></label></th>
			<td>
				<textarea class="large-text" rows="<?php echo absint( $rows ); ?>"
					id="<?php echo esc_attr( $id ); ?>"
					name="<?php echo esc_attr( $option . '[' . $key . ']' ); ?>"><?php echo esc_textarea( $s[ $key ] ?? '' ); ?></textarea>
				<?php if ( $desc ) : ?>
					<p class="description"><?php echo esc_html( $desc ); ?></p>
				<?php endif; ?>
			</td>
		</tr>
		<?php
	}

	/**
	 * Render a select row.
	 *
	 * @param string $option  Option name.
	 * @param string $key     Field key.
	 * @param string $label   Field label.
	 * @param array  $s       Settings.
	 * @param array  $choices Value => label choices.
	 */
	private function select_row( $option, $key, $label, $s, $choices ) {
		$id      = $option . '_' . $key;
		$current = $s[ $key ] ?? '';
		?>
		<tr>
			<th scope="row"><label for="<?php echo esc_attr( $id ); ?>"><?php echo esc_html( $label ); ?></label></th>
			<td>
				<select id="<?php echo esc_attr( $id ); ?>" name="<?php echo esc_attr( $option . '[' . $key . ']' ); ?>">
					<?php foreach ( $choices as $value => $text ) : ?>
						<option value="<?php echo esc_attr( $value ); ?>" <?php selected( $current, $value ); ?>>
							<?php echo esc_html( $text ); ?>
						</option>
					<?php endforeach; ?>
				</select>
			</td>
		</tr>
		<?php
	}
}
