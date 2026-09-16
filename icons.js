/**
 * Site icons — Noun Project–style 24² glyphs (currentColor). Hydrates [data-icon].
 */
(function (root) {
    'use strict';

    var GLYPHS = {
        hammer:
            '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
            '<path fill="currentColor" d="M13.2 2.1 21 9.9l-1.8 1.8-2.4-2.4-6.7 6.7c-.5.5-1.3.5-1.8 0l-2.3-2.3c-.5-.5-.5-1.3 0-1.8l6.7-6.7-2.4-2.4 1.9-1.7zm-9 16.3 2.2 2.2H3.2v-2.2h1z"/>' +
            '</svg>',

        cone:
            '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
            '<path fill="currentColor" d="M12 3 3.2 21h17.6L12 3zm0 4.4 5.4 11.1H6.6L12 7.4zM2 21.8h20v1.6H2z"/>' +
            '<path fill="currentColor" d="M7.4 14.2h9.2l.8 1.7H6.6z"/>' +
            '</svg>',

        dice:
            '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
            '<path fill="currentColor" d="M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zm3.2 4.2a1.3 1.3 0 1 0 0 2.6 1.3 1.3 0 0 0 0-2.6zm7.6 0a1.3 1.3 0 1 0 0 2.6 1.3 1.3 0 0 0 0-2.6zM12 10.7a1.3 1.3 0 1 0 0 2.6 1.3 1.3 0 0 0 0-2.6zM8.2 16.2a1.3 1.3 0 1 0 0 2.6 1.3 1.3 0 0 0 0-2.6zm7.6 0a1.3 1.3 0 1 0 0 2.6 1.3 1.3 0 0 0 0-2.6z"/>' +
            '</svg>',

        link:
            '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
            '<path fill="currentColor" d="M10.4 13.6a4 4 0 0 1 0-5.6l3.2-3.2a4 4 0 0 1 5.6 5.6l-1.5 1.5-1.4-1.4 1.5-1.5a2 2 0 1 0-2.8-2.8l-3.2 3.2a2 2 0 0 0 0 2.8l1.4 1.4-1.4 1.4-1.4-1.4zm3.2-3.2a4 4 0 0 1 0 5.6l-3.2 3.2a4 4 0 1 1-5.6-5.6l1.5-1.5 1.4 1.4-1.5 1.5a2 2 0 1 0 2.8 2.8l3.2-3.2a2 2 0 0 0 0-2.8l-1.4-1.4 1.4-1.4 1.4 1.4z"/>' +
            '</svg>',

        heart:
            '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
            '<path fill="currentColor" d="M12 21S3 14.4 3 8.8A5.1 5.1 0 0 1 8.4 3.6 5.4 5.4 0 0 1 12 5.4a5.4 5.4 0 0 1 3.6-1.8A5.1 5.1 0 0 1 21 8.8C21 14.4 12 21 12 21z"/>' +
            '</svg>',

        search:
            '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
            '<path fill="currentColor" d="M10.5 3a7.5 7.5 0 0 1 5.9 12.1l4.2 4.3-1.4 1.4-4.3-4.2A7.5 7.5 0 1 1 10.5 3zm0 2a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11z"/>' +
            '</svg>',

        home:
            '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
            '<path fill="currentColor" d="M12 3.2 3 11h2.2v9h5.1v-6h3.4v6h5.1v-9H21L12 3.2z"/>' +
            '</svg>',

        grid:
            '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
            '<path fill="currentColor" d="M3 3h8v8H3V3zm10 0h8v8h-8V3zM3 13h8v8H3v-8zm10 0h8v8h-8v-8z"/>' +
            '</svg>',

        thought:
            '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
            '<path fill="currentColor" d="M7 4h10a5 5 0 0 1 0 10h-1.2L12 18.2 8.2 14H7a5 5 0 0 1 0-10zm1.6 16.2a1.4 1.4 0 1 1 0 2.8 1.4 1.4 0 0 1 0-2.8zm3.3-2.1a1.1 1.1 0 1 1 0 2.2 1.1 1.1 0 0 1 0-2.2z"/>' +
            '</svg>',

        wrench:
            '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
            '<path fill="currentColor" d="M21 7.2a5.4 5.4 0 0 1-7.2 5.1L6.4 19.7a2.1 2.1 0 0 1-3-3l7.4-7.4A5.4 5.4 0 0 1 16.8 3l-2.3 2.3 3.2 3.2 2.3-2.3c.4.6.7 1.3.9 2z"/>' +
            '</svg>',

        moon:
            '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
            '<path fill="currentColor" d="M15.2 2.1A10 10 0 1 0 21.8 14 8.2 8.2 0 0 1 15.2 2.1z"/>' +
            '</svg>',

        share:
            '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
            '<path fill="currentColor" d="M14 5.2 20.8 12 14 18.8V15c-5.4 0-8.2 1.7-10.4 5.2C4 14 7.1 9.3 14 8.4V5.2z"/>' +
            '</svg>',

        rss:
            '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
            '<path fill="currentColor" d="M5 4a15 15 0 0 1 15 15h-3.2A11.8 11.8 0 0 0 5 7.2V4zm0 6.5A8.5 8.5 0 0 1 13.5 19H10A5 5 0 0 0 5 14v-3.5zM6.8 17.8a1.8 1.8 0 1 1 0 3.6 1.8 1.8 0 0 1 0-3.6z"/>' +
            '</svg>',

        github:
            '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
            '<path fill="currentColor" d="M12 2a10 10 0 0 0-3.2 19.5c.5.1.7-.2.7-.5v-1.7c-2.8.6-3.4-1.2-3.4-1.2-.4-1.1-1.1-1.4-1.1-1.4-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.5 2.4 1.1 3 .8.1-.6.4-1.1.6-1.3-2.2-.3-4.6-1.1-4.6-5 0-1.1.4-2 1-2.7-.1-.3-.4-1.3.1-2.7 0 0 .8-.3 2.8 1a9.6 9.6 0 0 1 5 0c2-.1.8-1 2.8-1 .5 1.4.2 2.4.1 2.7.6.7 1 1.6 1 2.7 0 3.9-2.4 4.7-4.6 5 .4.3.7 1 .7 2v2.3c0 .3.2.6.7.5A10 10 0 0 0 12 2z"/>' +
            '</svg>',

        person:
            '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
            '<path fill="currentColor" d="M12 12a4.2 4.2 0 1 0-4.2-4.2A4.2 4.2 0 0 0 12 12zm0 2.2c-3.5 0-8 1.7-8 5.2V22h16v-2.6c0-3.5-4.5-5.2-8-5.2z"/>' +
            '</svg>',

        page:
            '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
            '<path fill="currentColor" d="M6 2h8l6 6v14H6V2zm8 1.8V9h5.2z"/>' +
            '</svg>'
    };

    function svg(name) {
        return GLYPHS[name] || '';
    }

    function hydrate(rootEl) {
        var scope = rootEl || document;
        var nodes = scope.querySelectorAll ? scope.querySelectorAll('[data-icon]') : [];
        for (var i = 0; i < nodes.length; i++) {
            var el = nodes[i];
            var markup = svg(el.getAttribute('data-icon'));
            if (markup) el.innerHTML = markup;
        }
    }

    root.mnkIcon = svg;
    root.mnkIconsHydrate = hydrate;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { hydrate(document); }, { once: true });
    } else {
        hydrate(document);
    }
})(window);
