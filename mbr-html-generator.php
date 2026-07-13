<?php
/**
 * Plugin Name:       MBR HTML Generator
 * Plugin URI:        https://littlewebshack.com/online-html-generator/
 * Description:       A two-panel HTML generator with live source output. Compose visually in TinyMCE on the left, watch the formatted HTML appear in real time on the right. Available as a Tools page in the admin and as a [mbr_html_generator] shortcode on the frontend. Bundled with TinyMCE 8.5.0 — no external CDN, no API keys, no upsells.
 * Version:           1.8.0
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

// Buy Me a Coffee
add_filter( 'plugin_row_meta', function ( $links, $file, $data ) {
    if ( ! function_exists( 'plugin_basename' ) || $file !== plugin_basename( __FILE__ ) ) {
        return $links;
    }

    $url = 'https://buymeacoffee.com/robertpalmer/';
    $links[] = sprintf(
	// translators: %s: The name of the plugin author.
        '<a href="%s" target="_blank" rel="noopener nofollow" aria-label="%s">☕ %s</a>',
        esc_url( $url ),
		// translators: %s: The name of the plugin author.
        esc_attr( sprintf( __( 'Buy %s a coffee', 'mbr-html-generator' ), isset( $data['AuthorName'] ) ? $data['AuthorName'] : __( 'the author', 'mbr-html-generator' ) ) ),
        esc_html__( 'Buy me a coffee', 'mbr-html-generator' )
    );

    return $links;
}, 10, 3 );


define( 'MBR_HTML_GEN_VERSION', '1.8.0' );
define( 'MBR_HTML_GEN_FILE', __FILE__ );
define( 'MBR_HTML_GEN_DIR', plugin_dir_path( __FILE__ ) );
define( 'MBR_HTML_GEN_URL', plugin_dir_url( __FILE__ ) );
define( 'MBR_HTML_GEN_SLUG', 'mbr-html-generator' );
define( 'MBR_HTML_GEN_SHORTCODE', 'mbr_html_generator' );

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
	 * Whether frontend assets need to be enqueued for the current request.
	 *
	 * Set to true in `maybe_flag_frontend_assets()` when a shortcode is detected
	 * in the post content, then read in `enqueue_frontend_assets()`.
	 *
	 * @var bool
	 */
	private $frontend_needed = false;

	/**
	 * Number of times the shortcode has been rendered on the current request.
	 * Used to enforce the single-instance-per-page rule.
	 *
	 * @var int
	 */
	private $shortcode_render_count = 0;

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
		// Admin.
		add_action( 'admin_menu', array( $this, 'register_admin_menu' ) );
		add_action( 'admin_enqueue_scripts', array( $this, 'enqueue_admin_assets' ) );
		add_filter( 'plugin_action_links_' . plugin_basename( MBR_HTML_GEN_FILE ), array( $this, 'plugin_action_links' ) );

		// Frontend shortcode.
		add_action( 'init', array( $this, 'register_shortcode' ) );
		add_action( 'wp', array( $this, 'maybe_flag_frontend_assets' ) );
		add_action( 'wp_enqueue_scripts', array( $this, 'enqueue_frontend_assets' ) );

		// Translations.
		add_action( 'plugins_loaded', array( $this, 'load_textdomain' ) );

		// Self-hosted update checking via Plugin Update Checker 5.7.
		// Manifest lives in the public HarbourBob/mbr-updates GitHub repo (raw URL
		// so PUC gets the JSON directly, and GitHub sidesteps SiteGround's
		// aggressive manifest caching).
		$this->init_update_checker();
	}

	/**
	 * Initialise the self-hosted update checker (PUC 5.7).
	 */
	private function init_update_checker() {
		$puc = MBR_HTML_GEN_DIR . 'includes/plugin-update-checker/plugin-update-checker.php';

		if ( ! is_readable( $puc ) ) {
			return;
		}

		require_once $puc;

		\YahnisElsts\PluginUpdateChecker\v5\PucFactory::buildUpdateChecker(
			'https://raw.githubusercontent.com/HarbourBob/mbr-updates/main/mbr-html-generator.json',
			MBR_HTML_GEN_FILE,
			MBR_HTML_GEN_SLUG
		);
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
	 * Register the frontend shortcode.
	 */
	public function register_shortcode() {
		add_shortcode( MBR_HTML_GEN_SHORTCODE, array( $this, 'render_shortcode' ) );
	}

	/**
	 * Capability required to access the admin tool. Filterable so site owners
	 * can relax it (e.g. to 'edit_posts') for editorial users.
	 *
	 * The frontend shortcode is intentionally NOT capability-gated — its
	 * audience is anonymous visitors (developers, designers, students using
	 * the tool as a quick utility).
	 *
	 * @return string
	 */
	private function required_capability() {
		return apply_filters( 'mbr_html_generator_capability', 'manage_options' );
	}

	// =====================================================================
	// Asset enqueueing
	// =====================================================================

	/**
	 * Enqueue scripts and styles for the admin page only.
	 *
	 * @param string $hook Current admin page hook.
	 */
	public function enqueue_admin_assets( $hook ) {
		if ( $hook !== $this->page_hook ) {
			return;
		}

		$this->enqueue_shared_assets( 'admin' );
	}

	/**
	 * Inspect the current main query for a shortcode and flag the frontend
	 * assets for loading. Runs on the `wp` action so we have $post available.
	 *
	 * Hooking this early (on `wp` rather than from inside the shortcode
	 * callback) means assets are registered before some optimisation plugins
	 * (WP Rocket Used CSS, SG Optimizer) snapshot the page's asset graph.
	 */
	public function maybe_flag_frontend_assets() {
		if ( is_admin() ) {
			return;
		}

		$post = get_post();
		if ( ! $post ) {
			return;
		}

		if ( has_shortcode( $post->post_content, MBR_HTML_GEN_SHORTCODE ) ) {
			$this->frontend_needed = true;
		}
	}

	/**
	 * Enqueue scripts and styles on the frontend only when needed.
	 */
	public function enqueue_frontend_assets() {
		/**
		 * Filter whether the frontend assets should be enqueued.
		 *
		 * Useful for forcing assets to load on pages where the shortcode
		 * appears via a non-standard mechanism (e.g. inserted by a page
		 * builder widget that bypasses post_content scanning).
		 *
		 * @since 1.4.0
		 *
		 * @param bool $needed Whether assets are needed.
		 */
		$needed = apply_filters( 'mbr_html_generator_frontend_assets', $this->frontend_needed );

		if ( ! $needed ) {
			return;
		}

		$this->enqueue_shared_assets( 'frontend' );
	}

	/**
	 * Enqueue the asset graph shared between admin and frontend contexts.
	 *
	 * On the frontend, TinyMCE is loaded in the footer (in_footer = true) to
	 * avoid blocking first paint while the ~5MB script downloads. The skeleton
	 * loading state remains visible until TinyMCE initialises.
	 *
	 * @param string $context Either 'admin' or 'frontend'.
	 */
	private function enqueue_shared_assets( $context ) {
		$is_frontend = ( 'frontend' === $context );

		// TinyMCE — head on admin (instant editing), footer on frontend (faster paint).
		wp_enqueue_script(
			'mbr-html-gen-tinymce',
			MBR_HTML_GEN_URL . 'vendor/tinymce/tinymce.min.js',
			array(),
			'8.5.0',
			$is_frontend
		);

		// js-beautify — same loading position as TinyMCE.
		wp_enqueue_script(
			'mbr-html-gen-beautify',
			MBR_HTML_GEN_URL . 'vendor/js-beautify/beautify-html.js',
			array(),
			'1.15.4',
			$is_frontend
		);

		// Stylesheet shared between contexts (component styles, all scoped to
		// .mbr-html-gen-app).
		wp_enqueue_style(
			'mbr-html-gen-app',
			MBR_HTML_GEN_URL . 'assets/css/admin.css',
			array(),
			MBR_HTML_GEN_VERSION
		);

		// Frontend gets an extra stylesheet with bundled @font-face
		// declarations and theme-defence resets layered on top.
		if ( $is_frontend ) {
			wp_enqueue_style(
				'mbr-html-gen-frontend',
				MBR_HTML_GEN_URL . 'assets/css/frontend.css',
				array( 'mbr-html-gen-app' ),
				MBR_HTML_GEN_VERSION
			);
		} else {
			// Admin context loads Google Fonts (kept here to preserve the
			// existing admin look without requiring the bundled font files).
			wp_enqueue_style(
				'mbr-html-gen-fonts',
				'https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;1,9..144,500&family=Geist:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap',
				array(),
				MBR_HTML_GEN_VERSION
			);
		}

		// Application JavaScript. Used in both contexts.
		wp_enqueue_script(
			'mbr-html-gen-app',
			MBR_HTML_GEN_URL . 'assets/js/admin.js',
			array( 'mbr-html-gen-tinymce', 'mbr-html-gen-beautify' ),
			MBR_HTML_GEN_VERSION,
			true
		);

		wp_localize_script(
			'mbr-html-gen-app',
			'mbrHtmlGen',
			array(
				'tinymceBaseUrl' => MBR_HTML_GEN_URL . 'vendor/tinymce',
				'context'        => $context,
				'i18n'           => array(
					'placeholder'  => __( 'Start typing in the editor — the generated HTML will appear here.', 'mbr-html-generator' ),
					'copied'       => __( 'Copied to clipboard', 'mbr-html-generator' ),
					'copyFailed'   => __( 'Copy failed', 'mbr-html-generator' ),
					'downloaded'   => __( 'File downloaded', 'mbr-html-generator' ),
					'editor'       => __( 'Editor', 'mbr-html-generator' ),
					'output'       => __( 'HTML output', 'mbr-html-generator' ),
					'format'       => __( 'Format', 'mbr-html-generator' ),
					'wrap'         => __( 'Wrap', 'mbr-html-generator' ),
					'tidy'         => __( 'Tidy', 'mbr-html-generator' ),
					'classify'     => __( 'Classify', 'mbr-html-generator' ),
					'css'              => __( 'CSS', 'mbr-html-generator' ),
					'cssDrawerTitle'   => __( 'Custom CSS', 'mbr-html-generator' ),
					'cssDrawerLines'   => __( 'Lines', 'mbr-html-generator' ),
					'cssDrawerClear'   => __( 'Clear', 'mbr-html-generator' ),
					'cssDrawerHide'    => __( 'Hide', 'mbr-html-generator' ),
					'cssPlaceholder'   => __( "Write CSS here. It’s included in the output and applied live in the editor.\n\n.card { padding: 16px; border-radius: 8px; }", 'mbr-html-generator' ),
					'copy'         => __( 'Copy', 'mbr-html-generator' ),
					'download'     => __( 'Download', 'mbr-html-generator' ),
					'clear'        => __( 'Clear', 'mbr-html-generator' ),
					'darkMode'     => __( 'Dark mode', 'mbr-html-generator' ),
					'lightMode'    => __( 'Light mode', 'mbr-html-generator' ),
					'characters'   => __( 'Characters', 'mbr-html-generator' ),
					'words'        => __( 'Words', 'mbr-html-generator' ),
					'lines'        => __( 'Lines', 'mbr-html-generator' ),
					'tinymceLabel'      => __( 'TinyMCE 8.5.0 · GPL community edition', 'mbr-html-generator' ),
					'loading'           => __( 'Loading editor…', 'mbr-html-generator' ),
					'editorPlaceholder' => __( 'Start typing your content. To add an image, use the Image button in the toolbar and paste its URL.', 'mbr-html-generator' ),
					'dropFileMessage'   => __( 'Drag-and-drop upload isn’t supported. Use the Image button in the toolbar and paste the image’s URL instead.', 'mbr-html-generator' ),
				),
			)
		);
	}

	// =====================================================================
	// Rendering
	// =====================================================================

	/**
	 * Render the admin page.
	 */
	public function render_admin_page() {
		if ( ! current_user_can( $this->required_capability() ) ) {
			wp_die( esc_html__( 'You do not have permission to access this page.', 'mbr-html-generator' ) );
		}
		?>
		<div class="wrap mbr-html-gen-wrap">
			<?php echo $this->render_app( 'admin' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped — markup is hand-built and self-escaped. ?>
		</div>
		<?php
	}

	/**
	 * Shortcode callback.
	 *
	 * Enforces a single instance per page: subsequent shortcode calls return a
	 * non-blocking notice instead of duplicate markup (which would collide on
	 * the hardcoded element IDs and produce a broken second instance).
	 *
	 * @return string Shortcode output.
	 */
	public function render_shortcode() {
		$this->shortcode_render_count++;

		if ( $this->shortcode_render_count > 1 ) {
			return $this->render_duplicate_notice();
		}

		// Defensive: ensure assets are flagged even if `wp` ran before the
		// shortcode was added (e.g. when rendered via do_shortcode in a
		// non-standard template). enqueue_frontend_assets has its own guards.
		if ( ! $this->frontend_needed ) {
			$this->frontend_needed = true;
			$this->enqueue_frontend_assets();
		}

		return '<div class="mbr-html-gen-frontend">'
			. $this->render_app( 'frontend' )
			. '</div>';
	}

	/**
	 * Render the duplicate-instance notice. Visible to logged-in editors only —
	 * front-end visitors see nothing, which is friendlier than a broken-looking
	 * message and keeps the page clean.
	 *
	 * @return string
	 */
	private function render_duplicate_notice() {
		if ( ! current_user_can( 'edit_posts' ) ) {
			return '';
		}

		return sprintf(
			'<div class="mbr-html-gen-duplicate-notice" style="border:1px solid #d63638;background:#fcf0f1;color:#1a1d1c;padding:12px 16px;border-radius:6px;font-family:-apple-system,BlinkMacSystemFont,sans-serif;font-size:14px;margin:1em 0;">%s</div>',
			esc_html__( 'Only one instance of [mbr_html_generator] is supported per page. This notice is visible to logged-in editors only.', 'mbr-html-generator' )
		);
	}

	/**
	 * Render the application markup. Shared between admin page and shortcode
	 * so both contexts stay in lockstep.
	 *
	 * @param string $context Either 'admin' or 'frontend'. Mainly used as a
	 *                       data attribute so JS/CSS can adapt if needed.
	 * @return string
	 */
	private function render_app( $context ) {
		$nonce = wp_create_nonce( 'mbr_html_gen' );

		ob_start();
		?>
		<div id="mbr-html-gen-app" class="mbr-html-gen-app" data-mbr-context="<?php echo esc_attr( $context ); ?>" data-nonce="<?php echo esc_attr( $nonce ); ?>">
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
							<button type="button" class="mbr-btn" id="mbr-html-gen-css-toggle" aria-pressed="false" aria-controls="mbr-html-gen-css-drawer" title="<?php esc_attr_e( 'Write custom CSS that\'s applied live in the editor and included in the output', 'mbr-html-generator' ); ?>">
								<?php echo $this->icon( 'palette' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
								<span><?php esc_html_e( 'CSS', 'mbr-html-generator' ); ?></span>
							</button>
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
						<div class="mbr-html-gen-skeleton" id="mbr-html-gen-skeleton" aria-hidden="true">
							<div class="mbr-html-gen-skeleton-toolbar">
								<span class="mbr-html-gen-skeleton-pill"></span>
								<span class="mbr-html-gen-skeleton-pill mbr-html-gen-skeleton-pill-sm"></span>
								<span class="mbr-html-gen-skeleton-pill mbr-html-gen-skeleton-pill-sm"></span>
								<span class="mbr-html-gen-skeleton-pill mbr-html-gen-skeleton-pill-sm"></span>
								<span class="mbr-html-gen-skeleton-pill mbr-html-gen-skeleton-pill-md"></span>
							</div>
							<div class="mbr-html-gen-skeleton-body">
								<div class="mbr-html-gen-skeleton-spinner" role="status">
									<span class="mbr-html-gen-skeleton-spinner-ring"></span>
									<span class="mbr-html-gen-skeleton-spinner-label"><?php esc_html_e( 'Loading editor…', 'mbr-html-generator' ); ?></span>
								</div>
							</div>
						</div>
						<div class="mbr-html-gen-css-drawer" id="mbr-html-gen-css-drawer" hidden>
							<div class="mbr-html-gen-css-drawer-header">
								<span class="mbr-html-gen-css-drawer-label">
									<?php echo $this->icon( 'palette' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
									<span><?php esc_html_e( 'Custom CSS', 'mbr-html-generator' ); ?></span>
									<span class="mbr-html-gen-css-drawer-stats">
										<?php esc_html_e( 'Lines', 'mbr-html-generator' ); ?>
										<span id="mbr-html-gen-css-line-count">0</span>
									</span>
								</span>
								<span class="mbr-html-gen-css-drawer-actions">
									<button type="button" class="mbr-btn mbr-btn-quiet" id="mbr-html-gen-css-clear" title="<?php esc_attr_e( 'Clear custom CSS', 'mbr-html-generator' ); ?>">
										<?php echo $this->icon( 'trash' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
										<span><?php esc_html_e( 'Clear', 'mbr-html-generator' ); ?></span>
									</button>
									<button type="button" class="mbr-btn mbr-btn-quiet" id="mbr-html-gen-css-close" title="<?php esc_attr_e( 'Hide the CSS drawer', 'mbr-html-generator' ); ?>">
										<?php echo $this->icon( 'chevron-down' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
										<span><?php esc_html_e( 'Hide', 'mbr-html-generator' ); ?></span>
									</button>
								</span>
							</div>
							<textarea id="mbr-html-gen-css-textarea" class="mbr-html-gen-css-textarea" spellcheck="false" autocomplete="off" autocapitalize="off" autocorrect="off"></textarea>
						</div>
					</div>
				</section>

				<section class="mbr-html-gen-panel mbr-html-gen-output-panel">
					<div class="mbr-html-gen-panel-header">
						<span class="mbr-html-gen-panel-label"><?php esc_html_e( 'HTML output', 'mbr-html-generator' ); ?></span>
						<div class="mbr-html-gen-panel-actions">
							<button type="button" class="mbr-btn" id="mbr-html-gen-tidy" aria-pressed="true" title="<?php esc_attr_e( 'Apply HTML cleanup (unwrap media from p tags, remove redundant spans on headings and paragraphs, drop empty paragraphs)', 'mbr-html-generator' ); ?>">
								<?php echo $this->icon( 'wand' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
								<span><?php esc_html_e( 'Tidy', 'mbr-html-generator' ); ?></span>
							</button>
							<button type="button" class="mbr-btn" id="mbr-html-gen-classify" aria-pressed="false" title="<?php esc_attr_e( 'Extract inline styles into reusable CSS classes (works best with Tidy on)', 'mbr-html-generator' ); ?>">
								<?php echo $this->icon( 'braces' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
								<span><?php esc_html_e( 'Classify', 'mbr-html-generator' ); ?></span>
							</button>
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
				<div class="mbr-html-gen-credit">
					<?php
					$mbr_credit_heart = '<span class="mbr-html-gen-heart" aria-hidden="true">&#10084;&#65039;</span>';
					$mbr_credit_link  = sprintf(
						'<a href="%1$s" target="_blank" rel="noopener">%2$s</a>',
						esc_url( 'https://madebyrobert.co.uk' ),
						esc_html( 'Robert Palmer' )
					);
					echo wp_kses(
						sprintf(
							/* translators: 1: heart emoji, 2: linked author name */
							__( 'Created with %1$s by %2$s', 'mbr-html-generator' ),
							$mbr_credit_heart,
							$mbr_credit_link
						),
						array(
							'span' => array( 'class' => array(), 'aria-hidden' => array() ),
							'a'    => array( 'href' => array(), 'target' => array(), 'rel' => array() ),
						)
					);
					?>
				</div>
				<div class="mbr-html-gen-stats">
					<?php esc_html_e( 'Characters', 'mbr-html-generator' ); ?> <span id="mbr-html-gen-char-count">0</span> ·
					<?php esc_html_e( 'Words', 'mbr-html-generator' ); ?> <span id="mbr-html-gen-word-count">0</span> ·
					<?php esc_html_e( 'Lines', 'mbr-html-generator' ); ?> <span id="mbr-html-gen-line-count">0</span>
				</div>
			</footer>
		</div>
		<?php
		return ob_get_clean();
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
			'wand'     => '<path d="m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.21 1.21 0 0 0 1.72 0L21.64 5.36a1.21 1.21 0 0 0 0-1.72Z"/><path d="m14 7 3 3"/><path d="M5 6v4"/><path d="M19 14v4"/><path d="M10 2v2"/><path d="M7 8H3"/><path d="M21 16h-4"/><path d="M11 3H9"/>',
			'braces'   => '<path d="M8 3H7a2 2 0 0 0-2 2v5a2 2 0 0 1-2 2 2 2 0 0 1 2 2v5c0 1.1.9 2 2 2h1"/><path d="M16 21h1a2 2 0 0 0 2-2v-5c0-1.1.9-2 2-2a2 2 0 0 1-2-2V5a2 2 0 0 0-2-2h-1"/>',
			'palette'  => '<circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 22a10 10 0 1 1 0-20 10 10 0 0 1 10 10c0 3.05-2.46 5.55-5.5 5.55h-1.99a1.66 1.66 0 0 0-1.18 2.81 1.65 1.65 0 0 1 .51 1.14A1.5 1.5 0 0 1 12 22Z"/>',
			'chevron-down' => '<polyline points="6 9 12 15 18 9"/>',
		);
		if ( ! isset( $paths[ $name ] ) ) {
			return '';
		}
		return '<svg class="mbr-icon mbr-icon-' . esc_attr( $name ) . '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' . $paths[ $name ] . '</svg>';
	}
}

MBR_HTML_Generator::instance();
