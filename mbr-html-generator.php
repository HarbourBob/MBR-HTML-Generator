<?php
/**
 * Plugin Name:       MBR HTML Generator
 * Plugin URI:        https://madebyrobert.co.uk/plugins/mbr-html-generator/
 * Description:       A two-panel HTML generator with live source output. Compose visually in TinyMCE on the left, watch the formatted HTML appear in real time on the right. Bundled with TinyMCE 8.5.0 (GPL community edition) — no external CDN, no API keys, no upsells.
 * Version:           1.3.0
 * Requires at least: 5.8
 * Requires PHP:      7.4
 * Author:            Robert Palmer
 * Author URI:        https://madebyrobert.co.uk
 * License:           GPLv2 or later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       mbr-html-generator
 * Domain Path:       /languages
 *
 * @package MBR_HTML_Generator
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'MBR_HTML_GEN_VERSION', '1.3.0' );
define( 'MBR_HTML_GEN_FILE', __FILE__ );
define( 'MBR_HTML_GEN_DIR', plugin_dir_path( __FILE__ ) );
define( 'MBR_HTML_GEN_URL', plugin_dir_url( __FILE__ ) );
define( 'MBR_HTML_GEN_SLUG', 'mbr-html-generator' );

/**
 * Main plugin class.
 */
final class MBR_HTML_Generator {

	/**
	 * Singleton instance.
	 *
	 * @var MBR_HTML_Generator|null
	 */
	private static $instance = null;

	/**
	 * Hook for the admin page (used to scope asset loading).
	 *
	 * @var string
	 */
	private $page_hook = '';

	/**
	 * Get the singleton instance.
	 *
	 * @return MBR_HTML_Generator
	 */
	public static function instance() {
		if ( null === self::$instance ) {
			self::$instance = new self();
			self::$instance->init();
		}
		return self::$instance;
	}

	/**
	 * Wire up hooks.
	 */
	private function init() {
		add_action( 'admin_menu', array( $this, 'register_admin_menu' ) );
		add_action( 'admin_enqueue_scripts', array( $this, 'enqueue_assets' ) );
		add_filter( 'plugin_action_links_' . plugin_basename( MBR_HTML_GEN_FILE ), array( $this, 'plugin_action_links' ) );
		add_action( 'plugins_loaded', array( $this, 'load_textdomain' ) );

		// Placeholder: drop in the MBR self-hosted update checker init here when bundling for release.
		// Example:
		// require_once MBR_HTML_GEN_DIR . 'includes/plugin-update-checker/plugin-update-checker.php';
		// $update_checker = Puc_v4_Factory::buildUpdateChecker( 'https://updates.madebyrobert.co.uk/?action=get_metadata&slug=mbr-html-generator', __FILE__, 'mbr-html-generator' );
	}

	/**
	 * Load translations.
	 */
	public function load_textdomain() {
		load_plugin_textdomain( 'mbr-html-generator', false, dirname( plugin_basename( MBR_HTML_GEN_FILE ) ) . '/languages' );
	}

	/**
	 * Register the admin page under Tools.
	 */
	public function register_admin_menu() {
		$this->page_hook = add_management_page(
			__( 'MBR HTML Generator', 'mbr-html-generator' ),
			__( 'HTML Generator', 'mbr-html-generator' ),
			$this->required_capability(),
			MBR_HTML_GEN_SLUG,
			array( $this, 'render_admin_page' )
		);
	}

	/**
	 * Capability required to access the tool. Filterable so site owners can
	 * relax it (e.g. to 'edit_posts') for editorial users.
	 *
	 * @return string
	 */
	private function required_capability() {
		return apply_filters( 'mbr_html_generator_capability', 'manage_options' );
	}

	/**
	 * Enqueue scripts and styles, scoped to the plugin's admin page only.
	 *
	 * @param string $hook Current admin page hook.
	 */
	public function enqueue_assets( $hook ) {
		if ( $hook !== $this->page_hook ) {
			return;
		}

		$tinymce_url = MBR_HTML_GEN_URL . 'vendor/tinymce/tinymce.min.js';

		wp_enqueue_script(
			'mbr-html-gen-tinymce',
			$tinymce_url,
			array(),
			'8.5.0',
			false
		);

		wp_enqueue_script(
			'mbr-html-gen-beautify',
			MBR_HTML_GEN_URL . 'vendor/js-beautify/beautify-html.js',
			array(),
			'1.15.4',
			false
		);

		wp_enqueue_style(
			'mbr-html-gen-fonts',
			'https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;1,9..144,500&family=Geist:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap',
			array(),
			MBR_HTML_GEN_VERSION
		);

		wp_enqueue_style(
			'mbr-html-gen-admin',
			MBR_HTML_GEN_URL . 'assets/css/admin.css',
			array( 'mbr-html-gen-fonts' ),
			MBR_HTML_GEN_VERSION
		);

		wp_enqueue_script(
			'mbr-html-gen-admin',
			MBR_HTML_GEN_URL . 'assets/js/admin.js',
			array( 'mbr-html-gen-tinymce', 'mbr-html-gen-beautify' ),
			MBR_HTML_GEN_VERSION,
			true
		);

		wp_localize_script(
			'mbr-html-gen-admin',
			'mbrHtmlGen',
			array(
				'tinymceBaseUrl' => MBR_HTML_GEN_URL . 'vendor/tinymce',
				'i18n'           => array(
					'placeholder'  => __( 'Start typing in the editor — the generated HTML will appear here.', 'mbr-html-generator' ),
					'copied'       => __( 'Copied to clipboard', 'mbr-html-generator' ),
					'copyFailed'   => __( 'Copy failed', 'mbr-html-generator' ),
					'downloaded'   => __( 'File downloaded', 'mbr-html-generator' ),
					'editor'       => __( 'Editor', 'mbr-html-generator' ),
					'output'       => __( 'HTML output', 'mbr-html-generator' ),
					'format'       => __( 'Format', 'mbr-html-generator' ),
					'wrap'         => __( 'Wrap', 'mbr-html-generator' ),
					'copy'         => __( 'Copy', 'mbr-html-generator' ),
					'download'     => __( 'Download', 'mbr-html-generator' ),
					'clear'        => __( 'Clear', 'mbr-html-generator' ),
					'darkMode'     => __( 'Dark mode', 'mbr-html-generator' ),
					'lightMode'    => __( 'Light mode', 'mbr-html-generator' ),
					'characters'   => __( 'Characters', 'mbr-html-generator' ),
					'words'        => __( 'Words', 'mbr-html-generator' ),
					'lines'        => __( 'Lines', 'mbr-html-generator' ),
					'tinymceLabel' => __( 'TinyMCE 8.5.0 · GPL community edition', 'mbr-html-generator' ),
				),
			)
		);
	}

	/**
	 * Render the admin page.
	 */
	public function render_admin_page() {
		if ( ! current_user_can( $this->required_capability() ) ) {
			wp_die( esc_html__( 'You do not have permission to access this page.', 'mbr-html-generator' ) );
		}
		?>
		<div class="wrap mbr-html-gen-wrap">
			<div id="mbr-html-gen-app" class="mbr-html-gen-app" data-nonce="<?php echo esc_attr( wp_create_nonce( 'mbr_html_gen' ) ); ?>">
				<header class="mbr-html-gen-header">
					<div class="mbr-html-gen-brand">
						<h1><?php esc_html_e( 'HTML Generator', 'mbr-html-generator' ); ?></h1>
						<span class="mbr-html-gen-sub"><?php esc_html_e( 'MBR Dev Tools', 'mbr-html-generator' ); ?></span>
					</div>
					<div class="mbr-html-gen-header-tools">
						<button type="button" class="mbr-btn" id="mbr-html-gen-theme-toggle" title="<?php esc_attr_e( 'Toggle theme', 'mbr-html-generator' ); ?>">
							<?php
							echo $this->icon( 'moon' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
							echo $this->icon( 'sun' );  // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
							?>
							<span class="mbr-label-dark"><?php esc_html_e( 'Dark mode', 'mbr-html-generator' ); ?></span>
							<span class="mbr-label-light"><?php esc_html_e( 'Light mode', 'mbr-html-generator' ); ?></span>
						</button>
					</div>
				</header>

				<main class="mbr-html-gen-main">
					<section class="mbr-html-gen-panel mbr-html-gen-editor-panel">
						<div class="mbr-html-gen-panel-header">
							<span class="mbr-html-gen-panel-label"><?php esc_html_e( 'Editor', 'mbr-html-generator' ); ?></span>
							<div class="mbr-html-gen-panel-actions">
								<button type="button" class="mbr-btn" id="mbr-html-gen-clear">
									<?php echo $this->icon( 'trash' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
									<span><?php esc_html_e( 'Clear', 'mbr-html-generator' ); ?></span>
								</button>
							</div>
						</div>
						<div class="mbr-html-gen-panel-body">
							<div class="mbr-html-gen-editor-host">
								<textarea id="mbr-html-gen-editor"></textarea>
							</div>
						</div>
					</section>

					<section class="mbr-html-gen-panel mbr-html-gen-output-panel">
						<div class="mbr-html-gen-panel-header">
							<span class="mbr-html-gen-panel-label"><?php esc_html_e( 'HTML output', 'mbr-html-generator' ); ?></span>
							<div class="mbr-html-gen-panel-actions">
								<button type="button" class="mbr-btn" id="mbr-html-gen-format" aria-pressed="true" title="<?php esc_attr_e( 'Toggle pretty-printed output', 'mbr-html-generator' ); ?>">
									<?php echo $this->icon( 'code' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
									<span><?php esc_html_e( 'Format', 'mbr-html-generator' ); ?></span>
								</button>
								<button type="button" class="mbr-btn" id="mbr-html-gen-wrap" aria-pressed="false" title="<?php esc_attr_e( 'Toggle line wrap', 'mbr-html-generator' ); ?>">
									<?php echo $this->icon( 'wrap' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
									<span><?php esc_html_e( 'Wrap', 'mbr-html-generator' ); ?></span>
								</button>
								<button type="button" class="mbr-btn" id="mbr-html-gen-download" title="<?php esc_attr_e( 'Download as .html file', 'mbr-html-generator' ); ?>">
									<?php echo $this->icon( 'download' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
									<span><?php esc_html_e( 'Download', 'mbr-html-generator' ); ?></span>
								</button>
								<button type="button" class="mbr-btn mbr-btn-primary" id="mbr-html-gen-copy">
									<?php echo $this->icon( 'copy' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
									<span><?php esc_html_e( 'Copy', 'mbr-html-generator' ); ?></span>
								</button>
							</div>
						</div>
						<div class="mbr-html-gen-panel-body">
							<pre class="mbr-html-gen-output mbr-html-gen-wrap-on" id="mbr-html-gen-output"><code class="mbr-html-gen-empty"><?php esc_html_e( 'Start typing in the editor — the generated HTML will appear here.', 'mbr-html-generator' ); ?></code></pre>
							<div class="mbr-html-gen-toast" id="mbr-html-gen-toast" role="status" aria-live="polite"></div>
						</div>
					</section>
				</main>

				<footer class="mbr-html-gen-footer">
					<div><?php esc_html_e( 'TinyMCE 8.5.0 · GPL community edition', 'mbr-html-generator' ); ?></div>
					<div class="mbr-html-gen-stats">
						<?php esc_html_e( 'Characters', 'mbr-html-generator' ); ?> <span id="mbr-html-gen-char-count">0</span> ·
						<?php esc_html_e( 'Words', 'mbr-html-generator' ); ?> <span id="mbr-html-gen-word-count">0</span> ·
						<?php esc_html_e( 'Lines', 'mbr-html-generator' ); ?> <span id="mbr-html-gen-line-count">0</span>
					</div>
				</footer>
			</div>
		</div>
		<?php
	}

	/**
	 * Add a "Launch" link on the Plugins screen.
	 *
	 * @param array $links Existing action links.
	 * @return array
	 */
	public function plugin_action_links( $links ) {
		$launch = sprintf(
			'<a href="%s">%s</a>',
			esc_url( admin_url( 'tools.php?page=' . MBR_HTML_GEN_SLUG ) ),
			esc_html__( 'Launch', 'mbr-html-generator' )
		);
		array_unshift( $links, $launch );
		return $links;
	}

	/**
	 * Inline SVG icon helper. Returns an SVG element with a single colour
	 * stroke that follows `currentColor`, sized by CSS. All icons use a 24x24
	 * viewBox so they share visual weight.
	 *
	 * Icon paths are based on the Lucide icon set (ISC licence — GPL-compatible).
	 *
	 * @param string $name Icon name.
	 * @return string Safe SVG markup (no user input interpolated).
	 */
	private function icon( $name ) {
		$paths = array(
			'moon'     => '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>',
			'sun'      => '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>',
			'code'     => '<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>',
			'wrap'     => '<line x1="3" y1="6" x2="21" y2="6"/><path d="M3 12h15a3 3 0 1 1 0 6h-4"/><polyline points="16 16 14 18 16 20"/><line x1="3" y1="18" x2="10" y2="18"/>',
			'copy'     => '<rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
			'trash'    => '<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/>',
			'download' => '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>',
		);
		if ( ! isset( $paths[ $name ] ) ) {
			return '';
		}
		return '<svg class="mbr-icon mbr-icon-' . esc_attr( $name ) . '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' . $paths[ $name ] . '</svg>';
	}
}

MBR_HTML_Generator::instance();
