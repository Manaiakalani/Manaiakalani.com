// Theme Toggle
(function() {
    const toggle = document.querySelector('.theme-toggle');
    const root = document.documentElement;
    const stored = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (stored === 'dark' || (!stored && prefersDark)) {
        root.setAttribute('data-theme', 'dark');
    }

    if (toggle) {
        toggle.addEventListener('click', function() {
            const isDark = root.getAttribute('data-theme') === 'dark';
            const next = isDark ? 'light' : 'dark';
            root.setAttribute('data-theme', next);
            localStorage.setItem('theme', next);
        });
    }
})();

// Active Nav Link
(function() {
    var path = window.location.pathname;
    var links = document.querySelectorAll('.site-nav a');
    links.forEach(function(link) {
        var href = link.getAttribute('href');
        if (path.endsWith(href) || (href === 'index.html' && (path === '/' || path.endsWith('/')))) {
            link.classList.add('active');
        }
    });
})();

// Typing Effect
var typingEl = document.getElementById('typing-effect');
if (typingEl) {
    var typingText = "Turning problems into solutions, framing memories, and dad 24/7.";
    var index = 0;
    function type() {
        if (index < typingText.length) {
            typingEl.textContent += typingText.charAt(index);
            index++;
            setTimeout(type, 100);
        }
    }
    type();
}