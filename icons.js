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
            '<path fill="currentColor" fill-rule="evenodd" d="M12 2.3 19.15 18.5H4.85L12 2.3Zm2.55 5.95L15.7 10.4H8.3l1.15-2.15h5.1ZM16.85 13.15 18.05 15.4H5.95l1.2-2.25h9.7Z"/>' +
            '<path fill="currentColor" d="M2.8 18.5h18.4v2.3c0 .45-.35.8-.8.8H3.6c-.45 0-.8-.35-.8-.8z"/>' +
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
            '<path fill="currentColor" fill-rule="evenodd" d="M10.4 2.4a8 8 0 1 1 5.2 14.1l.2.2 4.7 4.7a1.35 1.35 0 0 1-1.9 1.9l-4.7-4.7-.2-.2A8 8 0 0 1 10.4 2.4Zm0 2.7a5.3 5.3 0 1 0 0 10.6 5.3 5.3 0 0 0 0-10.6Z"/>' +
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

        gear:
            '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
            '<path fill="currentColor" fill-rule="evenodd" d="M10.15 2.2h3.7l.45 2.55a7.6 7.6 0 0 1 2.05.85l2.3-1.25 2.6 2.6-1.25 2.3c.36.64.64 1.33.85 2.05L23 10.15v3.7l-2.55.45a7.6 7.6 0 0 1-.85 2.05l1.25 2.3-2.6 2.6-2.3-1.25a7.6 7.6 0 0 1-2.05.85L13.85 21.8h-3.7l-.45-2.55a7.6 7.6 0 0 1-2.05-.85l-2.3 1.25-2.6-2.6 1.25-2.3a7.6 7.6 0 0 1-.85-2.05L1 13.85v-3.7l2.55-.45c.21-.72.49-1.41.85-2.05l-1.25-2.3 2.6-2.6 2.3 1.25c.64-.36 1.33-.64 2.05-.85L10.15 2.2ZM12 8.4a3.6 3.6 0 1 0 0 7.2 3.6 3.6 0 0 0 0-7.2Z"/>' +
            '</svg>',

        moon:
            '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
            '<path fill="currentColor" d="M14.6 2.4A9.8 9.8 0 1 0 21.6 15.2 7.9 7.9 0 0 1 14.6 2.4Z"/>' +
            '</svg>',

        sun:
            '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
            '<path fill="currentColor" d="M11 1.2h2v3.6h-2zM11 19.2h2v3.6h-2zM1.2 11h3.6v2H1.2zm17.99 0H22.8v2h-3.61zM4.22 3.16 5.64 1.75l2.55 2.55-1.42 1.41zM15.81 16.29l2.55 2.55-1.41 1.42-2.55-2.55zM3.16 19.78l1.41 1.41 2.55-2.55-1.41-1.41zM16.29 8.19l2.55-2.55 1.42 1.41-2.55 2.55z"/>' +
            '<circle fill="currentColor" cx="12" cy="12" r="4.7"/>' +
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
            '</svg>',

        editor:
            '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
            '<path fill="currentColor" fill-rule="evenodd" d="M3 3.5A1.5 1.5 0 0 1 4.5 2h15A1.5 1.5 0 0 1 21 3.5v17a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 20.5v-17ZM5 7h14v12.5H5V7Zm1.2-3h2.3v1.4H6.2V4Z"/>' +
            '<path fill="currentColor" d="M7 10h10v1.5H7zm0 3h7v1.5H7zm0 3h8.5V17.5H7z"/>' +
            '</svg>',

        terminal:
            '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
            '<path fill="currentColor" fill-rule="evenodd" d="M3 4.5A1.5 1.5 0 0 1 4.5 3h15A1.5 1.5 0 0 1 21 4.5v15a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 19.5v-15ZM7.2 8.2 11 12l-3.8 3.8-1.5-1.5L8 12 5.7 9.7l1.5-1.5ZM12 14.4h6.2V16H12z"/>' +
            '</svg>',

        spark:
            '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
            '<path fill="currentColor" d="M12 1.4 13.7 9 21.6 12 13.7 15 12 22.6 10.3 15 2.4 12 10.3 9 12 1.4z"/>' +
            '</svg>',

        laptop:
            '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
            '<path fill="currentColor" d="M4 5.2A1.2 1.2 0 0 1 5.2 4h13.6A1.2 1.2 0 0 1 20 5.2V15H4V5.2ZM2.4 16.4h19.2V19a1 1 0 0 1-1 1H3.4a1 1 0 0 1-1-1v-2.6Z"/>' +
            '</svg>',

        tower:
            '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
            '<path fill="currentColor" fill-rule="evenodd" d="M7.2 2h9.6v20H7.2V2Zm2.3 2.2h5v1.7h-5V4.2Zm0 3.2h5v1.2h-5V7.4Zm0 2.2h5v1.2h-5V9.6ZM12 18.4a1.3 1.3 0 1 1 0 2.6 1.3 1.3 0 0 1 0-2.6Z"/>' +
            '</svg>',

        screens:
            '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
            '<path fill="currentColor" d="M1.8 4.2h9.2v8.2H1.8zm11.2 0h9.2v8.2h-9.2zM5.6 13.2h1.4V15H3.8v1.5h6.2V15H7.6v-1.8zm11.2 0h1.4V15h-3.2v1.5h6.2V15h-1.8v-1.8z"/>' +
            '</svg>',

        chat:
            '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
            '<path fill="currentColor" d="M3.2 3.4h17.6v12.2H9.1L3.2 21V3.4z"/>' +
            '</svg>',

        notebook:
            '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
            '<path fill="currentColor" fill-rule="evenodd" d="M5 2h14v20H5V2Zm2.2 0H8.6v20H7.2V2ZM10 6.2h7v1.7h-7V6.2Zm0 3.3h7v1.7h-7V9.5Z"/>' +
            '</svg>',

        check:
            '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
            '<path fill="currentColor" fill-rule="evenodd" d="M4 3h16a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Zm12.2 6.1-1.5-1.4-5.1 5.4-2.3-2.3-1.5 1.5 3.8 3.8 6.6-7z"/>' +
            '</svg>',

        branch:
            '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
            '<path fill="currentColor" d="M7.2 3.2a2.8 2.8 0 0 1 1.3 5.3v2.3c1.7.4 3.2 1.3 4.4 2.5a6.8 6.8 0 0 1 2.3-1.5V9.6a2.8 2.8 0 1 1 2.2 0v2.6A8.8 8.8 0 0 0 12.8 16a6.6 6.6 0 0 1-4.3 3.2 2.8 2.8 0 1 1-2.2-.1 4.4 4.4 0 0 0 3.2-2.3c.4-.7.6-1.4.7-2.2H8.5A2.8 2.8 0 0 1 7.2 3.2Z"/>' +
            '</svg>',

        crate:
            '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
            '<path fill="currentColor" d="M12 2.2 21.5 7v10L12 21.8 2.5 17V7L12 2.2Zm0 2.4L5.2 8 12 11.4 18.8 8 12 4.6ZM4.7 9.7v6.2L11 19.3v-6.2L4.7 9.7Zm14.6 0L13 13.1v6.2l6.3-3.4V9.7Z"/>' +
            '</svg>',

        cloud:
            '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
            '<path fill="currentColor" d="M8.4 6.2a5.4 5.4 0 0 1 5.1 3.6h.4a4.8 4.8 0 0 1 .3 9.6H7.6A5.1 5.1 0 0 1 7.4 9.3a5.4 5.4 0 0 1 1-3.1Z"/>' +
            '</svg>',

        camera:
            '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
            '<path fill="currentColor" fill-rule="evenodd" d="M8.2 4.2 9.6 2.6h4.8l1.4 1.6H20a1.2 1.2 0 0 1 1.2 1.2v13a1.2 1.2 0 0 1-1.2 1.2H4a1.2 1.2 0 0 1-1.2-1.2v-13A1.2 1.2 0 0 1 4 4.2h4.2ZM12 8.4a4.4 4.4 0 1 0 0 8.8 4.4 4.4 0 0 0 0-8.8Zm0 2.2a2.2 2.2 0 1 1 0 4.4 2.2 2.2 0 0 1 0-4.4Z"/>' +
            '</svg>',

        palette:
            '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
            '<path fill="currentColor" fill-rule="evenodd" d="M12 2.2A9.8 9.8 0 0 1 20.6 16c-.6 1.6-2.4 2-3.8 1.2-1-.6-1.5-1.7-1.4-2.8v-.4c0-1.2.9-2.2 2.1-2.3h.7A3.3 3.3 0 0 0 18.4 5.6 7.6 7.6 0 1 0 12 19.6h.6v2.2H12A9.8 9.8 0 0 1 12 2.2ZM8.2 7.4a1.4 1.4 0 1 1 0 2.8 1.4 1.4 0 0 1 0-2.8Zm4.4.4a1.4 1.4 0 1 1 0 2.8 1.4 1.4 0 0 1 0-2.8ZM7.2 12.2a1.4 1.4 0 1 1 0 2.8 1.4 1.4 0 0 1 0-2.8Z"/>' +
            '</svg>',

        wave:
            '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
            '<path fill="currentColor" d="M4 9.5h2.2v9H4zm3.5-4h2.2v13H7.5zm3.5 2.4h2.2v10.6H11zm3.5-5.2h2.2v15.8H14.5zM18 8h2.2v10.5H18z"/>' +
            '</svg>',

        server:
            '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
            '<path fill="currentColor" d="M3.4 3h17.2v5.2H3.4zm0 6.4h17.2v5.2H3.4zm0 6.4h17.2V21H3.4zM6 5.1h2.2v1.2H6zm0 6.4h2.2v1.2H6zm0 6.4h2.2v1.2H6z"/>' +
            '</svg>',

        chart:
            '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
            '<path fill="currentColor" d="M4.2 12.2h3.4V20H4.2zm6.1-6h3.4V20h-3.4zm6.1 3.3h3.4V20h-3.4zM3 20.8h18v1.6H3z"/>' +
            '</svg>',

        funnel:
            '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
            '<path fill="currentColor" d="M3.2 3.4h17.6l-5.8 7.4v5.3L12.2 21l-3.2-4.9v-5.3L3.2 3.4z"/>' +
            '</svg>',

        mic:
            '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
            '<path fill="currentColor" d="M9.1 2.2h5.8A3.2 3.2 0 0 1 18.1 5.4v6.4a6.1 6.1 0 0 1-12.2 0V5.4A3.2 3.2 0 0 1 9.1 2.2ZM6.2 11.4H4.4a7.6 7.6 0 0 0 6.7 7.3V21H8.2v1.8h7.6V21h-2.9v-2.3a7.6 7.6 0 0 0 6.7-7.3h-1.8a5.8 5.8 0 0 1-11.6 0Z"/>' +
            '</svg>',

        arm:
            '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
            '<path fill="currentColor" d="M3.4 18.2h7.4v2.4H3.4zm3 0V11.6L14.2 5l1.6 1.7-6.4 5.5.8 1.7 7.3-3.3 1.3 1.8-8.4 3.8c-1.4.6-2.4 1.8-2.8 3.2H6.4ZM18.4 4.4a2.1 2.1 0 1 1 0 4.2 2.1 2.1 0 0 1 0-4.2Z"/>' +
            '</svg>',

        interface:
            '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
            '<path fill="currentColor" fill-rule="evenodd" d="M2.4 6.4h19.2v11.2H2.4V6.4ZM7.2 9.2a2.4 2.4 0 1 0 0 4.8 2.4 2.4 0 0 0 0-4.8Zm7.6 0a2.4 2.4 0 1 0 0 4.8 2.4 2.4 0 0 0 0-4.8ZM6.2 16.2h2v1.2h-2zm3.4 0h2v1.2h-2z"/>' +
            '</svg>',

        speaker:
            '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
            '<path fill="currentColor" fill-rule="evenodd" d="M5.2 3.2h13.6v17.6H5.2V3.2ZM12 8.1a4.6 4.6 0 1 0 .1 9.2 4.6 4.6 0 0 0-.1-9.2Zm0 2.2a2.4 2.4 0 1 1 0 4.8 2.4 2.4 0 0 1 0-4.8ZM9.2 5h5.6v1.4H9.2V5Z"/>' +
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
