/**
 * MBR HTML Generator — application script
 *
 * Live HTML mirror of TinyMCE content. Pretty-prints, highlights, copies.
 * Theme preference persists via localStorage.
 *
 * Used in both contexts:
 *   - Admin Tools page (loaded by enqueue_admin_assets)
 *   - Frontend [mbr_html_generator] shortcode (loaded by enqueue_frontend_assets)
 *
 * The script is context-agnostic — it operates on element IDs that are
 * identical in both contexts. Safe to load on pages where the markup is
 * absent: it returns early if #mbr-html-gen-app is not found.
 */
( function () {
	'use strict';

	// Guard against accidental double-loading (e.g. an optimisation plugin
	// duplicating script tags). A second invocation finds the global flag set
	// and bails before re-binding events or re-initialising TinyMCE.
	if ( window.__mbrHtmlGenBooted ) {
		return;
	}

	// Inline skeleton-hide helper, available even in early-return paths so a
	// failed boot doesn't leave the user staring at a permanent spinner.
	function killSkeleton( errorLabel ) {
		var skel = document.getElementById( 'mbr-html-gen-skeleton' );
		if ( ! skel ) {
			return;
		}
		if ( errorLabel ) {
			var label = skel.querySelector( '.mbr-html-gen-skeleton-spinner-label' );
			if ( label ) {
				label.textContent = errorLabel;
			}
			var ring = skel.querySelector( '.mbr-html-gen-skeleton-spinner-ring' );
			if ( ring ) {
				ring.style.display = 'none';
			}
			return; // Leave skeleton visible with error message — don't fade.
		}
		skel.classList.add( 'mbr-is-hidden' );
		setTimeout( function () {
			if ( skel.parentNode ) {
				skel.parentNode.removeChild( skel );
			}
		}, 250 );
	}

	if ( typeof window.tinymce === 'undefined' ) {
		killSkeleton( 'Editor failed to load' );
		return;
	}

	var config = window.mbrHtmlGen || {};
	var i18n   = config.i18n || {};

	if ( config.tinymceBaseUrl ) {
		window.tinymce.baseURL = config.tinymceBaseUrl;
		window.tinymce.suffix  = '.min';
	}

	var STORAGE_THEME   = 'mbrHtmlGen.theme';
	var STORAGE_WRAP    = 'mbrHtmlGen.wrap';
	var STORAGE_FMT     = 'mbrHtmlGen.format';
	var STORAGE_TIDY    = 'mbrHtmlGen.tidy';
	var STORAGE_CLASSIFY = 'mbrHtmlGen.classify';
	var STORAGE_CUSTOM_CSS = 'mbrHtmlGen.customCss';
	var STORAGE_CSS_DRAWER = 'mbrHtmlGen.cssDrawerOpen';
	var STORAGE_CONTENT = 'mbrHtmlGen.content';
	var SAVE_DEBOUNCE_MS = 500;

	var appEl       = document.getElementById( 'mbr-html-gen-app' );
	var outputEl    = document.getElementById( 'mbr-html-gen-output' );
	var copyBtn     = document.getElementById( 'mbr-html-gen-copy' );
	var downloadBtn = document.getElementById( 'mbr-html-gen-download' );
	var formatBtn   = document.getElementById( 'mbr-html-gen-format' );
	var wrapBtn     = document.getElementById( 'mbr-html-gen-wrap' );
	var clearBtn    = document.getElementById( 'mbr-html-gen-clear' );
	var themeBtn    = document.getElementById( 'mbr-html-gen-theme-toggle' );
	var toastEl     = document.getElementById( 'mbr-html-gen-toast' );
	var charCount   = document.getElementById( 'mbr-html-gen-char-count' );
	var wordCount   = document.getElementById( 'mbr-html-gen-word-count' );
	var lineCount   = document.getElementById( 'mbr-html-gen-line-count' );
	var tidyBtn     = document.getElementById( 'mbr-html-gen-tidy' );
	var classifyBtn = document.getElementById( 'mbr-html-gen-classify' );
	var cssToggleBtn  = document.getElementById( 'mbr-html-gen-css-toggle' );
	var cssDrawerEl   = document.getElementById( 'mbr-html-gen-css-drawer' );
	var cssTextarea   = document.getElementById( 'mbr-html-gen-css-textarea' );
	var cssLineCount  = document.getElementById( 'mbr-html-gen-css-line-count' );
	var cssClearBtn   = document.getElementById( 'mbr-html-gen-css-clear' );
	var cssCloseBtn   = document.getElementById( 'mbr-html-gen-css-close' );

	if ( ! appEl ) {
		return;
	}

	// Mark as booted only after we know the markup is present and we're going
	// to proceed with full initialisation.
	window.__mbrHtmlGenBooted = true;

	// ---- Skeleton --------------------------------------------------------
	// Wrapper around killSkeleton for use after successful boot.
	function hideSkeleton() {
		killSkeleton();
	}

	// Belt-and-braces: if TinyMCE's `init` event hasn't fired within 25
	// seconds, surface the failure rather than leaving the spinner forever.
	var skeletonTimeout = setTimeout( function () {
		killSkeleton( 'Editor took too long to load — please refresh' );
	}, 25000 );

	var lastRawHtml = '';
	var prettify    = readBool( STORAGE_FMT, true );
	var wrapped     = readBool( STORAGE_WRAP, true );
	var tidy        = readBool( STORAGE_TIDY, true );
	var classify    = readBool( STORAGE_CLASSIFY, false );
	var customCss   = readString( STORAGE_CUSTOM_CSS, '' );
	var cssDrawerOpen = readBool( STORAGE_CSS_DRAWER, false );
	var theme       = readString( STORAGE_THEME, 'light' );

	// ---- Storage helpers --------------------------------------------------
	function readBool( key, fallback ) {
		try {
			var v = window.localStorage.getItem( key );
			if ( v === null ) return fallback;
			return v === '1';
		} catch ( e ) { return fallback; }
	}
	function writeBool( key, val ) {
		try { window.localStorage.setItem( key, val ? '1' : '0' ); } catch ( e ) {}
	}
	function readString( key, fallback ) {
		try {
			var v = window.localStorage.getItem( key );
			return v === null ? fallback : v;
		} catch ( e ) { return fallback; }
	}
	function writeString( key, val ) {
		try { window.localStorage.setItem( key, val ); } catch ( e ) {}
	}
	function deleteKey( key ) {
		try { window.localStorage.removeItem( key ); } catch ( e ) {}
	}

	// ---- Debounced content persistence ------------------------------------
	var saveTimer = null;
	function scheduleSave() {
		if ( saveTimer ) {
			clearTimeout( saveTimer );
		}
		saveTimer = setTimeout( function () {
			saveTimer = null;
			if ( lastRawHtml ) {
				writeString( STORAGE_CONTENT, lastRawHtml );
			} else {
				deleteKey( STORAGE_CONTENT );
			}
		}, SAVE_DEBOUNCE_MS );
	}

	// ---- Pretty printer (js-beautify) -------------------------------------
	var BEAUTIFY_OPTS = {
		indent_size:           2,
		indent_char:           ' ',
		wrap_line_length:      0,    // 0 = no auto-wrap; user has Wrap toggle
		preserve_newlines:     true,
		max_preserve_newlines: 1,
		end_with_newline:      false,
		indent_inner_html:     false,
		extra_liners:          [],   // keep output compact
		unformatted:           [ 'code', 'pre' ],
		content_unformatted:   [ 'pre', 'textarea' ]
	};

	function formatHtml( html ) {
		if ( ! html || ! html.replace( /^\s+|\s+$/g, '' ) ) {
			return '';
		}
		// Graceful fallback if js-beautify failed to load for any reason.
		if ( typeof window.html_beautify !== 'function' ) {
			return html;
		}
		try {
			return window.html_beautify( html, BEAUTIFY_OPTS );
		} catch ( e ) {
			return html;
		}
	}

	// ---- Minifier ---------------------------------------------------------
	// Collapses whitespace BETWEEN tags into nothing — only touches the
	// space/newlines that sit directly between `>` and `<`, which is always
	// insignificant in HTML rendering. Whitespace inside text content is
	// preserved exactly as TinyMCE outputs it.
	//
	// Used as the "off" state for the Format toggle so users get a visible
	// difference between pretty-printed and minified output, even when their
	// editor content is already cleanly structured.
	function minifyHtml( html ) {
		if ( ! html || ! html.replace( /^\s+|\s+$/g, '' ) ) {
			return '';
		}
		return html.replace( />\s+</g, '><' ).trim();
	}

	// ---- Tidy -------------------------------------------------------------
	// Post-processes TinyMCE's HTML output for cleaner, more semantic markup.
	// Runs entirely in the browser via DOMParser — no regex-wrangling of HTML.
	//
	// Cleanups applied (in order):
	//   1. Unwrap standalone media (<img>, <iframe>, <video>, <audio>) from
	//      <p> when the paragraph contains only the embed and has no
	//      attributes of its own. Skips <p style="…"><img></p> because the
	//      user is presumably using the paragraph for layout.
	//   2. Unwrap <span> when it wraps the entire content of a heading
	//      (h1-h6) or paragraph (<p>). Style and class from the span are
	//      moved up to the block. Style merging is property-aware — non-
	//      overlapping properties (e.g. block has text-align, span has
	//      font-family) merge onto the block; genuine conflicts (both sides
	//      defining the same CSS property) cause the span to be left in
	//      place rather than picking a winner.
	//   3. Remove paragraphs whose only content is whitespace, &nbsp;, or
	//      bare <br> tags.
	//   4. Collapse nested attribute-less spans (<span><span>x</span></span>
	//      → <span>x</span>). Runs in passes to handle deep nesting.
	//   5. Strip empty `style=""` attributes left behind by TinyMCE.
	//
	// Falls back to the original HTML on any parsing error.
	function tidyHtml( html ) {
		if ( ! html || ! html.replace( /^\s+|\s+$/g, '' ) ) {
			return '';
		}

		try {
			var parser = new DOMParser();
			var doc    = parser.parseFromString(
				'<!DOCTYPE html><html><body><div id="mbr-tidy-root">' + html + '</div></body></html>',
				'text/html'
			);
			var root = doc.getElementById( 'mbr-tidy-root' );
			if ( ! root ) {
				return html;
			}

			tidyUnwrapMediaFromParagraphs( root );
			tidyUnwrapSpansInBlocks( root );
			tidyRemoveEmptyParagraphs( root );
			tidyCollapseNestedSpans( root );
			tidyRemoveEmptyStyleAttributes( root );

			return root.innerHTML;
		} catch ( e ) {
			return html;
		}
	}

	function tidyUnwrapMediaFromParagraphs( root ) {
		// Standalone media embeds — img, iframe, video, audio — don't belong
		// inside a <p> wrapper. TinyMCE always wraps them because Enter
		// creates a paragraph and the embed gets dropped inside it; the
		// resulting `<p><iframe></iframe></p>` is structurally awkward.
		var MEDIA_TAGS = { IMG: 1, IFRAME: 1, VIDEO: 1, AUDIO: 1 };

		var paragraphs = root.querySelectorAll( 'p' );
		// Iterate backwards so removing a paragraph doesn't shift indices.
		for ( var i = paragraphs.length - 1; i >= 0; i-- ) {
			var p = paragraphs[ i ];

			// Skip paragraphs with their own attributes — user likely intends
			// the wrapper for layout (text-align, classes, etc.).
			if ( p.attributes.length > 0 ) {
				continue;
			}

			var media          = null;
			var hasOtherContent = false;

			for ( var j = 0; j < p.childNodes.length; j++ ) {
				var node = p.childNodes[ j ];
				if ( node.nodeType === 3 ) {
					// Text node — only OK if pure whitespace/nbsp.
					if ( node.textContent.replace( /\s|\u00A0/g, '' ) !== '' ) {
						hasOtherContent = true;
						break;
					}
				} else if ( node.nodeType === 1 ) {
					if ( MEDIA_TAGS[ node.tagName ] ) {
						if ( media !== null ) {
							// Multiple media embeds — leave alone.
							hasOtherContent = true;
							break;
						}
						media = node;
					} else if ( node.tagName !== 'BR' ) {
						hasOtherContent = true;
						break;
					}
				}
			}

			if ( media && ! hasOtherContent ) {
				p.parentNode.insertBefore( media, p );
				p.parentNode.removeChild( p );
			}
		}
	}

	function tidyUnwrapSpansInBlocks( root ) {
		// Apply to headings and paragraphs. A span wrapping all the content
		// of one of these block elements just adds an extra layer — its
		// styles can move up to the block itself.
		var blocks = root.querySelectorAll( 'h1, h2, h3, h4, h5, h6, p' );
		for ( var i = 0; i < blocks.length; i++ ) {
			var block = blocks[ i ];

			// Find the single span child wrapping all meaningful content.
			var span            = null;
			var hasOtherContent = false;

			for ( var j = 0; j < block.childNodes.length; j++ ) {
				var node = block.childNodes[ j ];
				if ( node.nodeType === 3 ) {
					if ( node.textContent.replace( /\s/g, '' ) !== '' ) {
						hasOtherContent = true;
						break;
					}
				} else if ( node.nodeType === 1 ) {
					if ( node.tagName === 'SPAN' && span === null ) {
						span = node;
					} else {
						hasOtherContent = true;
						break;
					}
				}
			}

			if ( ! span || hasOtherContent ) {
				continue;
			}

			// Only handle spans whose attributes are limited to style and/or
			// class — anything else (id, data-*, role, etc.) we don't know
			// how to merge safely, so leave the span in place.
			var unfamiliarAttr = false;
			for ( var k = 0; k < span.attributes.length; k++ ) {
				var attrName = span.attributes[ k ].name;
				if ( attrName !== 'style' && attrName !== 'class' ) {
					unfamiliarAttr = true;
					break;
				}
			}
			if ( unfamiliarAttr ) {
				continue;
			}

			// Class conflict: both sides define class. No clean semantic
			// merge — skip rather than concatenate (which could change
			// styling of either or both).
			var spanClass  = span.getAttribute( 'class' );
			var blockClass = block.getAttribute( 'class' );
			if ( spanClass && blockClass ) {
				continue;
			}

			// Style conflict: check at the CSS-property level. If both
			// sides define the same property (e.g. both `color`) we'd have
			// to choose a winner — skip rather than guess. If properties
			// don't overlap (e.g. block has `text-align`, span has
			// `font-family`+`color`), merge them onto the block.
			if ( span.style.length > 0 && block.style.length > 0 && tidyStylesConflict( span, block ) ) {
				continue;
			}

			// Safe to unwrap. Merge styles, move class.
			if ( span.style.length > 0 ) {
				tidyMergeStyles( block, span );
			}
			if ( spanClass ) {
				block.setAttribute( 'class', spanClass );
			}

			while ( span.firstChild ) {
				block.insertBefore( span.firstChild, span );
			}
			block.removeChild( span );
		}
	}

	// Returns true if any CSS property is defined on both a.style and b.style.
	// Operates on the CSSStyleDeclaration so longhand vs shorthand are
	// already normalised by the browser.
	function tidyStylesConflict( a, b ) {
		var propsA = {};
		for ( var i = 0; i < a.style.length; i++ ) {
			propsA[ a.style[ i ] ] = true;
		}
		for ( var j = 0; j < b.style.length; j++ ) {
			if ( propsA[ b.style[ j ] ] ) {
				return true;
			}
		}
		return false;
	}

	// Copies the style attribute from source onto target, preserving the
	// original CSS syntax (hex colours stay hex, units stay as-written).
	// Going via CSSStyleDeclaration.setProperty would normalise values
	// (e.g. #e03e2c → rgb(224, 62, 44)), which is functionally identical
	// but cosmetically different from TinyMCE's output.
	//
	// Caller is responsible for ensuring no property conflicts — call
	// tidyStylesConflict first.
	function tidyMergeStyles( target, source ) {
		var sourceStyle = source.getAttribute( 'style' );
		if ( ! sourceStyle ) {
			return;
		}
		var targetStyle = target.getAttribute( 'style' );
		if ( ! targetStyle ) {
			target.setAttribute( 'style', sourceStyle );
			return;
		}
		// Ensure target ends with a semicolon before appending, so we don't
		// produce "a: 1 b: 2" without separation.
		var trimmed = targetStyle.replace( /\s+$/, '' );
		if ( trimmed.charAt( trimmed.length - 1 ) !== ';' ) {
			trimmed += ';';
		}
		target.setAttribute( 'style', trimmed + ' ' + sourceStyle );
	}

	function tidyRemoveEmptyParagraphs( root ) {
		var paragraphs = root.querySelectorAll( 'p' );
		for ( var i = paragraphs.length - 1; i >= 0; i-- ) {
			var p = paragraphs[ i ];

			// Empty if no non-whitespace text and no meaningful elements.
			var text = p.textContent.replace( /\u00A0|\s/g, '' );
			if ( text !== '' ) {
				continue;
			}

			var hasMeaningfulElement = false;
			var children = p.children;
			for ( var j = 0; j < children.length; j++ ) {
				if ( children[ j ].tagName !== 'BR' ) {
					hasMeaningfulElement = true;
					break;
				}
			}

			if ( ! hasMeaningfulElement ) {
				p.parentNode.removeChild( p );
			}
		}
	}

	function tidyCollapseNestedSpans( root ) {
		// Run multiple passes so deeply nested chains all collapse.
		var maxPasses = 5;
		var changed   = true;
		while ( changed && maxPasses-- > 0 ) {
			changed = false;
			var spans = root.querySelectorAll( 'span' );
			for ( var i = 0; i < spans.length; i++ ) {
				var span = spans[ i ];
				if ( span.attributes.length !== 0 ) {
					continue;
				}
				if ( span.childNodes.length !== 1 ) {
					continue;
				}
				if ( span.firstChild.nodeType !== 1 ) {
					continue;
				}
				if ( span.firstChild.tagName !== 'SPAN' ) {
					continue;
				}
				span.parentNode.replaceChild( span.firstChild, span );
				changed = true;
			}
		}
	}

	function tidyRemoveEmptyStyleAttributes( root ) {
		var withStyle = root.querySelectorAll( '[style]' );
		for ( var i = 0; i < withStyle.length; i++ ) {
			var el    = withStyle[ i ];
			var style = el.getAttribute( 'style' ) || '';
			if ( style.replace( /[\s;]/g, '' ) === '' ) {
				el.removeAttribute( 'style' );
			}
		}
	}

	// ---- Classify ---------------------------------------------------------
	// Extracts inline style attributes into reusable, atomic CSS classes.
	// Each unique CSS property:value declaration becomes one class; repeated
	// declarations across elements share the same class. The generated
	// rules are emitted as a single <style> block prepended to the output.
	//
	//   <h1 style="color:#e03e2c; font-size:36px">Heading</h1>
	//   <p style="color:#e03e2c">Same red.</p>
	//
	//                            becomes
	//
	//   <style>
	//   .c-e03e2c { color: #e03e2c; }
	//   .fs-36 { font-size: 36px; }
	//   </style>
	//   <h1 class="c-e03e2c fs-36">Heading</h1>
	//   <p class="c-e03e2c">Same red.</p>
	//
	// Designed to run AFTER Tidy in the pipeline: Tidy consolidates styles
	// onto block elements (unwrapping spans on headings and paragraphs), so
	// by the time Classify sees the markup the styles are already on the
	// elements they belong to. Classify works on its own but produces
	// materially cleaner class lists when Tidy runs first.
	//
	// Class naming: {prop-abbr}-{value-token}, kebab-cased.
	//   color: red           -> c-red
	//   font-size: 36px      -> fs-36
	//   background: #4ECDC4  -> bg-4ecdc4
	//   text-align: center   -> ta-center
	//   margin-top: 1.5em    -> mt-1p5em
	//   width: 100%          -> w-100pc
	//   margin: -10px        -> m-n10
	//
	// Known properties have short abbreviations (see PROP_ABBR). Unknown
	// properties fall back to the full kebab name. Values are normalised
	// for class-name safety: # stripped from hex, px stripped, decimals
	// become 'p' (1.5 -> 1p5), % becomes 'pc', negatives become 'n', and
	// spaces become hyphens. Values containing characters that can't safely
	// live in a class name (commas, parens, quotes, slashes — typical of
	// url(), calc(), rgb(), quoted font-families) fall back to a per-
	// property sequential counter: bg-1, bg-2, ff-1, etc.
	//
	// Existing class attributes are preserved; generated classes append.
	// No attempt is made to merge or rewrite the user's own classes.
	// Empty style attributes are stripped. If no inline styles are found,
	// the input is returned unchanged (no <style> block prepended).

	var PROP_ABBR = {
		'color':                'c',
		'background':           'bg',
		'background-color':     'bg',
		'background-image':     'bgi',
		'background-position':  'bgp',
		'background-repeat':    'bgr',
		'background-size':      'bgs',
		'font-size':            'fs',
		'font-weight':          'fw',
		'font-family':          'ff',
		'font-style':           'fst',
		'text-align':           'ta',
		'text-decoration':      'td',
		'text-transform':       'tt',
		'text-indent':          'ti',
		'line-height':          'lh',
		'letter-spacing':       'lsp',
		'word-spacing':         'wsp',
		'white-space':          'ws',
		'margin':               'm',
		'margin-top':           'mt',
		'margin-right':         'mr',
		'margin-bottom':        'mb',
		'margin-left':          'ml',
		'padding':              'p',
		'padding-top':          'pt',
		'padding-right':        'pr',
		'padding-bottom':       'pb',
		'padding-left':         'pl',
		'border':               'b',
		'border-top':           'bt',
		'border-right':         'brt',
		'border-bottom':        'bb',
		'border-left':          'bl',
		'border-radius':        'rad',
		'border-color':         'bdc',
		'border-style':         'bds',
		'border-width':         'bdw',
		'width':                'w',
		'height':               'h',
		'max-width':            'mw',
		'min-width':            'mnw',
		'max-height':           'mh',
		'min-height':           'mnh',
		'display':              'd',
		'position':             'pos',
		'opacity':              'op',
		'z-index':              'z',
		'overflow':             'ov',
		'cursor':               'cur',
		'float':                'fl',
		'clear':                'clr',
		'vertical-align':       'va',
		'box-shadow':           'bsh',
		'text-shadow':          'tsh',
		'transform':            'tf',
		'transition':           'trs'
	};

	function classifyHtml( html ) {
		if ( ! html || ! html.replace( /^\s+|\s+$/g, '' ) ) {
			return html;
		}

		try {
			var parser = new DOMParser();
			var doc    = parser.parseFromString(
				'<!DOCTYPE html><html><body><div id="mbr-classify-root">' + html + '</div></body></html>',
				'text/html'
			);
			var root = doc.getElementById( 'mbr-classify-root' );
			if ( ! root ) {
				return html;
			}

			var declMap     = {};   // "prop:value" -> { className, prop, value }
			var rules       = [];   // ordered list of unique declarations
			var propCounter = {};   // per-property fallback counters
			var changed     = false;

			var styled = root.querySelectorAll( '[style]' );
			for ( var i = 0; i < styled.length; i++ ) {
				var el       = styled[ i ];
				var styleStr = el.getAttribute( 'style' );
				// Empty or whitespace/semicolons-only style — strip the
				// attribute (matches Tidy's behaviour, kept here so Classify
				// is internally consistent when run on its own) and move on.
				if ( ! styleStr || styleStr.replace( /[\s;]/g, '' ) === '' ) {
					el.removeAttribute( 'style' );
					changed = true;
					continue;
				}

				var decls      = classifyParseStyle( styleStr );
				var newClasses = [];

				for ( var j = 0; j < decls.length; j++ ) {
					var prop  = decls[ j ].prop;
					var value = decls[ j ].value;
					var key   = prop + ':' + value;

					var className;
					if ( declMap[ key ] ) {
						className = declMap[ key ].className;
					} else {
						className = classifyClassName( prop, value, propCounter );
						declMap[ key ] = { className: className, prop: prop, value: value };
						rules.push( declMap[ key ] );
					}
					newClasses.push( className );
				}

				// Merge generated classes with any existing class attribute,
				// preserving order and skipping duplicates.
				var existing = el.getAttribute( 'class' );
				var classList = existing ? existing.replace( /^\s+|\s+$/g, '' ).split( /\s+/ ) : [];
				for ( var k = 0; k < newClasses.length; k++ ) {
					if ( classList.indexOf( newClasses[ k ] ) === -1 ) {
						classList.push( newClasses[ k ] );
					}
				}
				if ( classList.length > 0 ) {
					el.setAttribute( 'class', classList.join( ' ' ) );
				}
				el.removeAttribute( 'style' );
				changed = true;
			}

			// Nothing classified — if we still mutated the DOM (e.g. stripped
			// empty style attributes), return the cleaned HTML; otherwise
			// return the input verbatim so identity is preserved.
			if ( rules.length === 0 ) {
				return changed ? root.innerHTML : html;
			}

			// One rule per line so js-beautify leaves the <style> block
			// readable in pretty-print mode. Minify mode collapses
			// whitespace between tags only, so the body of <style> is
			// preserved as written.
			var styleBlock = '<style>\n';
			for ( var r = 0; r < rules.length; r++ ) {
				styleBlock += '.' + rules[ r ].className + ' { ' + rules[ r ].prop + ': ' + rules[ r ].value + '; }\n';
			}
			styleBlock += '</style>\n';

			return styleBlock + root.innerHTML;
		} catch ( e ) {
			return html;
		}
	}

	// Parses an inline style string into an array of { prop, value } pairs.
	// Plain string-splitting on ';' and ':' — we accept that this won't
	// handle edge-case CSS like semicolons inside url() values, which
	// TinyMCE doesn't emit in style attributes anyway.
	function classifyParseStyle( styleStr ) {
		var decls = [];
		var parts = styleStr.split( ';' );
		for ( var i = 0; i < parts.length; i++ ) {
			var part = parts[ i ].replace( /^\s+|\s+$/g, '' );
			if ( ! part ) {
				continue;
			}
			var colonIdx = part.indexOf( ':' );
			if ( colonIdx < 1 ) {
				continue;
			}
			var prop  = part.substring( 0, colonIdx ).replace( /^\s+|\s+$/g, '' ).toLowerCase();
			var value = part.substring( colonIdx + 1 ).replace( /^\s+|\s+$/g, '' );
			if ( ! prop || ! value ) {
				continue;
			}
			// Strip trailing !important from the value — preserved in the
			// emitted CSS but not part of the class identity.
			value = value.replace( /\s*!important\s*$/i, '' );
			if ( ! value ) {
				continue;
			}
			decls.push( { prop: prop, value: value } );
		}
		return decls;
	}

	function classifyClassName( prop, value, propCounter ) {
		var abbr  = classifyPropAbbr( prop );
		var token = classifyValueToken( value );

		if ( token !== null ) {
			return abbr + '-' + token;
		}
		// Value couldn't be made class-name safe — use a per-property
		// sequential counter so bg-1, bg-2, ff-1 etc. stay readable.
		propCounter[ abbr ] = ( propCounter[ abbr ] || 0 ) + 1;
		return abbr + '-' + propCounter[ abbr ];
	}

	function classifyPropAbbr( prop ) {
		if ( PROP_ABBR.hasOwnProperty( prop ) ) {
			return PROP_ABBR[ prop ];
		}
		// Unknown property: use the kebab name itself if it's class-safe.
		if ( /^[a-z][a-z0-9-]*$/.test( prop ) ) {
			return prop;
		}
		// Truly weird property name — should not occur in practice.
		return 'x';
	}

	// Returns a class-name-safe token for a CSS value, or null if the
	// value contains characters that can't be safely represented (caller
	// then uses the per-property counter fallback).
	function classifyValueToken( value ) {
		var v = value;
		// Hex colours: strip the #.
		v = v.replace( /#/g, '' );
		// px is the implicit default unit — strip it for terser names.
		v = v.replace( /([0-9])px\b/g, '$1' );
		// Negatives: -10 -> n10. Match a leading - or one preceded by a
		// non-alphanumeric so we don't mangle hyphens inside identifiers.
		v = v.replace( /(^|[^a-z0-9])-(\d)/gi, '$1n$2' );
		// Decimals: 1.5 -> 1p5.
		v = v.replace( /(\d)\.(\d)/g, '$1p$2' );
		// Percent: 100% -> 100pc.
		v = v.replace( /%/g, 'pc' );
		// Spaces inside multi-value declarations (margin: 10 20) -> hyphen.
		v = v.replace( /\s+/g, '-' );
		v = v.toLowerCase();
		// A digit-leading token is fine because the abbreviation prefix
		// always precedes it (fs-36, w-100pc).
		if ( /^[a-z0-9_-]+$/.test( v ) ) {
			return v;
		}
		return null;
	}

	// ---- Custom CSS injection ---------------------------------------------
	// Independent of Tidy and Classify. Whenever the CSS drawer has
	// non-empty content, it's emitted in the output as a <style> block
	// at the very top. When Classify also produced a <style> block (its
	// generated atomic rules), the custom CSS is merged into that same
	// block as the FIRST rules — so the user's CSS acts as the base
	// layer and Classify's atomic utility classes can override by
	// cascade order. Empty custom CSS is a no-op (input returned
	// unchanged), so the function is safe to call unconditionally.
	function injectCustomCss( html ) {
		var trimmed = customCss ? customCss.replace( /^\s+|\s+$/g, '' ) : '';
		if ( ! trimmed ) {
			return html;
		}

		// classifyHtml() always begins its output with this exact prefix
		// when it has emitted rules. If we see it, splice our custom CSS
		// in as the first lines of that block (user CSS first, then the
		// generated atomic rules).
		var CLASSIFY_PREFIX = '<style>\n';
		if ( html.indexOf( CLASSIFY_PREFIX ) === 0 ) {
			return CLASSIFY_PREFIX + trimmed + '\n' + html.substring( CLASSIFY_PREFIX.length );
		}

		// Otherwise emit our own <style> block at the top.
		return '<style>\n' + trimmed + '\n</style>\n' + html;
	}

	// Pushes the current customCss string into a <style> element inside
	// TinyMCE's content iframe so the live editor preview reflects what
	// the user is writing. Called from the editor's `init` callback (when
	// the iframe document first becomes available) and after every change
	// to customCss. Resilient to the editor not being ready yet.
	function applyCustomCssToEditor() {
		if ( ! window.tinymce || ! window.tinymce.activeEditor ) {
			return;
		}
		var editor = window.tinymce.activeEditor;
		var doc;
		try {
			doc = editor.getDoc();
		} catch ( e ) {
			return;
		}
		if ( ! doc || ! doc.head ) {
			return;
		}

		var styleEl = doc.getElementById( 'mbr-custom-css' );
		if ( ! styleEl ) {
			styleEl = doc.createElement( 'style' );
			styleEl.id = 'mbr-custom-css';
			doc.head.appendChild( styleEl );
		}
		styleEl.textContent = customCss || '';
	}

	function updateCssLineCount() {
		if ( ! cssLineCount ) {
			return;
		}
		var count = 0;
		if ( customCss && customCss.length > 0 ) {
			// One line per "\n", plus one for the trailing partial line.
			// An empty string is 0 lines (handled above); a string with
			// no newlines is 1 line; "a\n" is 2 lines by this count,
			// matching how editors typically display it.
			count = customCss.split( '\n' ).length;
		}
		cssLineCount.textContent = count;
	}

	// ---- Highlighter ------------------------------------------------------
	function escapeHtml( s ) {
		return s
			.replace( /&/g, '&amp;' )
			.replace( /</g, '&lt;' )
			.replace( />/g, '&gt;' );
	}

	function highlight( code ) {
		if ( ! code ) {
			return '<span class="mbr-html-gen-empty">' + escapeHtml( i18n.placeholder || '' ) + '</span>';
		}
		var escaped = escapeHtml( code );

		// Tags with attributes
		escaped = escaped.replace(
			/(&lt;\/?)([a-zA-Z][\w-]*)([^&]*?)(\/?&gt;)/g,
			function ( full, open, tag, attrs, close ) {
				var attrHtml = attrs.replace(
					/([\w:-]+)(=)(&quot;[^&]*?&quot;|&#39;[^&]*?&#39;)/g,
					'<span class="mbr-attr">$1</span><span class="mbr-punct">$2</span><span class="mbr-val">$3</span>'
				);
				return '<span class="mbr-punct">' + open + '</span>' +
					'<span class="mbr-tag">' + tag + '</span>' +
					attrHtml +
					'<span class="mbr-punct">' + close + '</span>';
			}
		);

		// Comments
		escaped = escaped.replace( /(&lt;!--[\s\S]*?--&gt;)/g, '<span class="mbr-comment">$1</span>' );

		return escaped;
	}

	// ---- Colour swatches --------------------------------------------------
	// Display-only decoration: when the rendered output contains a CSS
	// colour value, prepend a small coloured square so the colour is
	// readable at a glance. Pure viewing aid — runs AFTER highlight()
	// on the already-escaped, already-syntax-highlighted HTML, and the
	// decorations live only inside the output panel's <pre>. The text
	// that copy/download produces is untouched.
	//
	// Patterns recognised:
	//   #rgb, #rgba, #rrggbb, #rrggbbaa   (3, 4, 6 or 8 hex chars)
	//   rgb(...), rgba(...)
	//   hsl(...), hsla(...)
	//
	// Named colours (red, blue, ...) are deliberately skipped — detecting
	// them safely without false positives (matching "red" inside attribute
	// names or English words in text content) is fiddly and the value is
	// low given TinyMCE's colour picker emits hex.
	//
	// The regex alternation lists longest hex variants first so that, for
	// example, #ffffff99 matches as 8 chars rather than truncating to 6.
	// The (?![0-9a-fA-F]) lookahead on each hex branch prevents false
	// matches on invalid lengths like #fffff (5 chars), which would
	// otherwise greedily eat 4 chars and leave a stray hex digit behind.
	var COLOR_PATTERN = /#[0-9a-fA-F]{8}(?![0-9a-fA-F])|#[0-9a-fA-F]{6}(?![0-9a-fA-F])|#[0-9a-fA-F]{4}(?![0-9a-fA-F])|#[0-9a-fA-F]{3}(?![0-9a-fA-F])|rgba?\([^)]+\)|hsla?\([^)]+\)/g;

	function addColorSwatches( highlightedHtml ) {
		if ( ! highlightedHtml ) {
			return highlightedHtml;
		}
		return highlightedHtml.replace( COLOR_PATTERN, function ( match ) {
			// The match is safe to use both as the visible text and as a
			// CSS custom-property value — hex and rgb/hsl notation contain
			// no characters that need escaping in a style attribute, and
			// the regex's structure guarantees no quotes or angle brackets
			// can sneak in.
			return '<span class="mbr-swatch" style="--mbr-swatch:' + match + '">' + match + '</span>';
		} );
	}

	// ---- Pipeline ---------------------------------------------------------
	// Single source of truth for the tidy -> classify -> inject-custom-css
	// chain. Each stage is independently toggleable / independently
	// active. Tidy is the safe, semantic-cleanup stage; Classify is the
	// more opinionated stylesheet-refactor stage; Custom CSS injection
	// is purely additive and runs whenever the CSS drawer has content,
	// regardless of the other two. When both Classify and custom CSS
	// are active, the user's CSS is merged into Classify's <style>
	// block as the first rules (base layer first, atomic utilities
	// after, matching utility-class cascade semantics).
	function processHtml( html ) {
		var out = html;
		if ( tidy ) {
			out = tidyHtml( out );
		}
		if ( classify ) {
			out = classifyHtml( out );
		}
		out = injectCustomCss( out );
		return out;
	}

	// ---- Render -----------------------------------------------------------
	function render() {
		// Empty state — show the placeholder span without line numbers.
		if ( ! lastRawHtml ) {
			outputEl.innerHTML = '<code>' + highlight( '' ) + '</code>';
			updateStats( '' );
			return;
		}

		// Pipeline: tidy -> classify -> format/minify -> highlight -> swatches -> wrap each line.
		var sourceHtml  = processHtml( lastRawHtml );
		var display     = prettify ? formatHtml( sourceHtml ) : minifyHtml( sourceHtml );
		var highlighted = addColorSwatches( highlight( display ) );

		// Wrap each source line in <span class="mbr-line"> so the CSS counter
		// can render line numbers in a left gutter. Empty lines get a
		// zero-width space so they keep vertical height and a numbered
		// gutter row.
		var lines = highlighted.split( '\n' );
		var html  = '';
		for ( var i = 0; i < lines.length; i++ ) {
			html += '<span class="mbr-line">' + ( lines[ i ].length ? lines[ i ] : '\u200B' ) + '</span>';
		}

		outputEl.innerHTML = '<code>' + html + '</code>';
		updateStats( display );
	}

	function updateStats( text ) {
		charCount.textContent = text.length;
		wordCount.textContent = text.replace( /^\s+|\s+$/g, '' ) ? text.replace( /^\s+|\s+$/g, '' ).split( /\s+/ ).length : 0;
		lineCount.textContent = text ? text.split( '\n' ).length : 0;
	}

	// ---- Toast ------------------------------------------------------------
	var toastTimer;
	function showToast( message ) {
		toastEl.textContent = message;
		toastEl.classList.add( 'mbr-show' );
		clearTimeout( toastTimer );
		toastTimer = setTimeout( function () {
			toastEl.classList.remove( 'mbr-show' );
		}, 1600 );
	}

	// ---- Buttons ----------------------------------------------------------
	copyBtn.addEventListener( 'click', function () {
		var sourceHtml = processHtml( lastRawHtml );
		var text       = prettify ? formatHtml( sourceHtml ) : minifyHtml( sourceHtml );
		copyToClipboard( text ).then( function ( ok ) {
			showToast( ok ? ( i18n.copied || 'Copied' ) : ( i18n.copyFailed || 'Copy failed' ) );
		} );
	} );

	function copyToClipboard( text ) {
		if ( navigator.clipboard && navigator.clipboard.writeText ) {
			return navigator.clipboard.writeText( text ).then(
				function () { return true; },
				function () { return fallbackCopy( text ); }
			);
		}
		return Promise.resolve( fallbackCopy( text ) );
	}

	function fallbackCopy( text ) {
		try {
			var ta = document.createElement( 'textarea' );
			ta.value = text;
			ta.setAttribute( 'readonly', '' );
			ta.style.position = 'absolute';
			ta.style.left = '-9999px';
			document.body.appendChild( ta );
			ta.select();
			var ok = document.execCommand( 'copy' );
			document.body.removeChild( ta );
			return ok;
		} catch ( e ) {
			return false;
		}
	}

	// ---- Download ---------------------------------------------------------
	function pad2( n ) { return ( n < 10 ? '0' : '' ) + n; }

	function buildFilename() {
		var d = new Date();
		return 'mbr-html-output-' +
			d.getFullYear() + '-' +
			pad2( d.getMonth() + 1 ) + '-' +
			pad2( d.getDate() ) + '.html';
	}

	if ( downloadBtn ) {
		downloadBtn.addEventListener( 'click', function () {
			var sourceHtml = processHtml( lastRawHtml );
			var text       = prettify ? formatHtml( sourceHtml ) : minifyHtml( sourceHtml );
			if ( ! text ) {
				return;
			}
			try {
				var blob = new Blob( [ text ], { type: 'text/html;charset=utf-8' } );
				var url  = URL.createObjectURL( blob );
				var a    = document.createElement( 'a' );
				a.href     = url;
				a.download = buildFilename();
				document.body.appendChild( a );
				a.click();
				document.body.removeChild( a );
				setTimeout( function () { URL.revokeObjectURL( url ); }, 1000 );
				showToast( i18n.downloaded || 'File downloaded' );
			} catch ( e ) {
				showToast( i18n.copyFailed || 'Download failed' );
			}
		} );
	}

	formatBtn.addEventListener( 'click', function () {
		prettify = ! prettify;
		formatBtn.setAttribute( 'aria-pressed', prettify ? 'true' : 'false' );
		writeBool( STORAGE_FMT, prettify );
		render();
	} );

	wrapBtn.addEventListener( 'click', function () {
		wrapped = ! wrapped;
		outputEl.classList.toggle( 'mbr-html-gen-wrap-on', wrapped );
		wrapBtn.setAttribute( 'aria-pressed', wrapped ? 'true' : 'false' );
		writeBool( STORAGE_WRAP, wrapped );
	} );

	if ( tidyBtn ) {
		tidyBtn.addEventListener( 'click', function () {
			tidy = ! tidy;
			tidyBtn.setAttribute( 'aria-pressed', tidy ? 'true' : 'false' );
			writeBool( STORAGE_TIDY, tidy );
			render();
		} );
	}

	if ( classifyBtn ) {
		classifyBtn.addEventListener( 'click', function () {
			classify = ! classify;
			classifyBtn.setAttribute( 'aria-pressed', classify ? 'true' : 'false' );
			writeBool( STORAGE_CLASSIFY, classify );
			render();
		} );
	}

	// ---- CSS drawer -------------------------------------------------------
	// The drawer's open/closed state is persisted alongside its content;
	// reopening the tool with content present pops the drawer back open
	// on its own would be presumptuous, so we keep an explicit flag.
	function setCssDrawerOpen( open ) {
		cssDrawerOpen = !! open;
		writeBool( STORAGE_CSS_DRAWER, cssDrawerOpen );

		if ( cssDrawerEl ) {
			if ( cssDrawerOpen ) {
				cssDrawerEl.removeAttribute( 'hidden' );
			} else {
				cssDrawerEl.setAttribute( 'hidden', '' );
			}
		}
		if ( cssToggleBtn ) {
			cssToggleBtn.setAttribute( 'aria-pressed', cssDrawerOpen ? 'true' : 'false' );
		}
		// Nudge TinyMCE to re-fit its iframe to the new editor-host
		// height. Both window resize event and TinyMCE's own ResizeEditor
		// fire have been observed to do the job; we dispatch the window
		// event since it's host-agnostic and harmless if unhandled.
		try {
			window.dispatchEvent( new Event( 'resize' ) );
		} catch ( e ) {}

		if ( cssDrawerOpen && cssTextarea ) {
			// Focus the textarea so the user can start typing immediately.
			// requestAnimationFrame so focus happens after the layout
			// settles, otherwise the textarea can scroll into view weirdly.
			window.requestAnimationFrame( function () {
				cssTextarea.focus();
			} );
		}
	}

	if ( cssToggleBtn ) {
		cssToggleBtn.addEventListener( 'click', function () {
			setCssDrawerOpen( ! cssDrawerOpen );
		} );
	}

	if ( cssCloseBtn ) {
		cssCloseBtn.addEventListener( 'click', function () {
			setCssDrawerOpen( false );
		} );
	}

	if ( cssClearBtn ) {
		cssClearBtn.addEventListener( 'click', function () {
			if ( cssTextarea ) {
				cssTextarea.value = '';
			}
			customCss = '';
			writeString( STORAGE_CUSTOM_CSS, '' );
			updateCssLineCount();
			applyCustomCssToEditor();
			render();
			if ( cssTextarea ) {
				cssTextarea.focus();
			}
		} );
	}

	// Textarea: stream changes into customCss, with a small debounce on
	// the heavier downstream work (save, editor live preview, output
	// re-render). Line count updates synchronously because it's cheap
	// and the lag would be visible.
	if ( cssTextarea ) {
		var cssDebounceTimer = null;

		cssTextarea.addEventListener( 'input', function () {
			customCss = cssTextarea.value;
			updateCssLineCount();

			if ( cssDebounceTimer ) {
				clearTimeout( cssDebounceTimer );
			}
			cssDebounceTimer = setTimeout( function () {
				writeString( STORAGE_CUSTOM_CSS, customCss );
				applyCustomCssToEditor();
				render();
			}, 150 );
		} );

		// Cross-tab sync — if the user has the tool open in two tabs and
		// edits the CSS in one, the other picks up the change. Mirrors
		// the existing storage-event handling on STORAGE_CONTENT.
		window.addEventListener( 'storage', function ( e ) {
			if ( e.key !== STORAGE_CUSTOM_CSS ) {
				return;
			}
			var incoming = e.newValue || '';
			if ( incoming === customCss ) {
				return;
			}
			customCss = incoming;
			cssTextarea.value = customCss;
			updateCssLineCount();
			applyCustomCssToEditor();
			render();
		} );
	}

	clearBtn.addEventListener( 'click', function () {
		// Wipe persisted content immediately, plus any pending debounced save.
		if ( saveTimer ) {
			clearTimeout( saveTimer );
			saveTimer = null;
		}
		deleteKey( STORAGE_CONTENT );
		lastRawHtml = '';
		if ( window.tinymce && window.tinymce.activeEditor ) {
			window.tinymce.activeEditor.setContent( '' );
			window.tinymce.activeEditor.focus();
		}
	} );

	themeBtn.addEventListener( 'click', function () {
		theme = theme === 'dark' ? 'light' : 'dark';
		applyTheme();
		writeString( STORAGE_THEME, theme );
		initEditor();
	} );

	function applyTheme() {
		appEl.setAttribute( 'data-theme', theme );
	}

	// ---- TinyMCE ----------------------------------------------------------
	function initEditor() {
		if ( window.tinymce.activeEditor ) {
			lastRawHtml = window.tinymce.activeEditor.getContent();
			window.tinymce.remove( '#mbr-html-gen-editor' );
		}

		window.tinymce.init( {
			selector:                   '#mbr-html-gen-editor',
			license_key:                'gpl',
			height:                     '100%',
			menubar:                    'edit insert view format table',
			branding:                   false,
			promotion:                  false,
			skin:                       theme === 'dark' ? 'oxide-dark' : 'oxide',
			content_css:                theme === 'dark' ? 'dark' : 'default',
			plugins:                    'advlist anchor autolink charmap code codesample directionality emoticons fullscreen image insertdatetime link lists media nonbreaking pagebreak preview quickbars searchreplace table visualblocks visualchars wordcount',
			toolbar:                    'undo redo | blocks | bold italic underline strikethrough | forecolor backcolor | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | link image media table | preview code',
			quickbars_selection_toolbar: 'bold italic | quicklink h2 h3 blockquote',
			// Image insertion is URL-only. Local file uploads would have to
			// fall back to base64-encoding the binary into the src attribute
			// (no server endpoint is configured), which produces ~400KB+ of
			// text per photo and unusable HTML output. These four options
			// shut every base64 path:
			//   quickbars_insert_toolbar  — drops the "image" button from the
			//                               empty-line floating toolbar
			//   image_uploadtab           — removes the "Upload" tab from
			//                               the standard Image dialog (URL
			//                               tab and toolbar button still work)
			//   automatic_uploads         — stops drag-dropped images
			//                               auto-converting to data: URIs
			//   paste_data_images         — strips data-URI images from any
			//                               pasted HTML
			quickbars_insert_toolbar:    'quicktable',
			image_uploadtab:             false,
			automatic_uploads:           false,
			paste_data_images:           false,
			placeholder:                 i18n.editorPlaceholder || 'Start typing your content. To add an image, use the Image button in the toolbar and paste its URL.',
			content_style:              "body { font-family: 'Geist', -apple-system, sans-serif; font-size: 14px; line-height: 1.6; padding: 18px; }",
			setup: function ( editor ) {
				var update = function () {
					lastRawHtml = editor.getContent();
					render();
					scheduleSave();
				};
				editor.on( 'input keyup change SetContent ExecCommand NodeChange', update );

				// Replace TinyMCE's generic "feature not supported" warning
				// on drag-drop file attempts with something more useful —
				// point the user at the Image toolbar button (the working
				// path) instead of just declining.
				editor.on( 'drop', function ( evt ) {
					if ( evt.dataTransfer && evt.dataTransfer.files && evt.dataTransfer.files.length > 0 ) {
						evt.preventDefault();
						editor.notificationManager.open( {
							text:    i18n.dropFileMessage || 'Drag-and-drop upload isn\u2019t supported. Use the Image button in the toolbar and paste the image\u2019s URL instead.',
							type:    'info',
							timeout: 6000
						} );
					}
				} );

				editor.on( 'init', function () {
					// Editor is ready — clear the safety timeout and fade
					// the skeleton out.
					if ( skeletonTimeout ) {
						clearTimeout( skeletonTimeout );
						skeletonTimeout = null;
					}
					hideSkeleton();

					// Push any persisted custom CSS into the editor iframe
					// so the live preview reflects it immediately. Safe to
					// call when customCss is empty — it just creates an
					// empty <style> element.
					applyCustomCssToEditor();

					// Restore previous session if present and the in-memory copy is empty.
					if ( ! lastRawHtml ) {
						var saved = readString( STORAGE_CONTENT, '' );
						if ( saved ) {
							lastRawHtml = saved;
						}
					}
					if ( lastRawHtml ) {
						editor.setContent( lastRawHtml );
					}
					update();
				} );
			}
		} );
	}

	// ---- Multi-tab sync ---------------------------------------------------
	// If another tab edits the content, mirror it here. Last-write-wins.
	window.addEventListener( 'storage', function ( e ) {
		if ( e.key !== STORAGE_CONTENT || ! window.tinymce || ! window.tinymce.activeEditor ) {
			return;
		}
		var incoming = e.newValue || '';
		if ( incoming === lastRawHtml ) {
			return;
		}
		// Cancel any pending local save so we don't clobber the incoming value.
		if ( saveTimer ) {
			clearTimeout( saveTimer );
			saveTimer = null;
		}
		lastRawHtml = incoming;
		// setContent triggers the SetContent event, which calls update() and
		// schedules a (no-op) save of the same value — harmless.
		window.tinymce.activeEditor.setContent( incoming );
	} );

	// Flush any pending debounced save before the page is hidden/closed.
	window.addEventListener( 'beforeunload', function () {
		if ( saveTimer ) {
			clearTimeout( saveTimer );
			saveTimer = null;
			if ( lastRawHtml ) {
				writeString( STORAGE_CONTENT, lastRawHtml );
			} else {
				deleteKey( STORAGE_CONTENT );
			}
		}
	} );

	// ---- Boot -------------------------------------------------------------
	formatBtn.setAttribute( 'aria-pressed', prettify ? 'true' : 'false' );
	wrapBtn.setAttribute( 'aria-pressed', wrapped ? 'true' : 'false' );
	if ( tidyBtn ) {
		tidyBtn.setAttribute( 'aria-pressed', tidy ? 'true' : 'false' );
	}
	if ( classifyBtn ) {
		classifyBtn.setAttribute( 'aria-pressed', classify ? 'true' : 'false' );
	}

	// CSS drawer boot — restore textarea content, line count, and the
	// drawer's persisted open/closed state. The placeholder is set from
	// the i18n bundle so it can contain newlines (a multi-line literal
	// example, more useful than a single-line prompt).
	if ( cssTextarea ) {
		cssTextarea.value = customCss;
		if ( i18n.cssPlaceholder ) {
			cssTextarea.setAttribute( 'placeholder', i18n.cssPlaceholder );
		}
	}
	updateCssLineCount();
	// Apply the persisted drawer state without going through the full
	// setCssDrawerOpen() pathway, because that would dispatch a resize
	// and try to focus the textarea before TinyMCE has even initialised.
	if ( cssDrawerEl ) {
		if ( cssDrawerOpen ) {
			cssDrawerEl.removeAttribute( 'hidden' );
		} else {
			cssDrawerEl.setAttribute( 'hidden', '' );
		}
	}
	if ( cssToggleBtn ) {
		cssToggleBtn.setAttribute( 'aria-pressed', cssDrawerOpen ? 'true' : 'false' );
	}
	outputEl.classList.toggle( 'mbr-html-gen-wrap-on', wrapped );
	applyTheme();
	render();
	initEditor();

} )();
