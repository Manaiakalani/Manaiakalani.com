// Theme Toggle
(function() {
    const toggle = document.querySelector('.theme-toggle');
    const root = document.documentElement;
    const stored = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (stored === 'dark' || (!stored && prefersDark)) {
        root.setAttribute('data-theme', 'dark');
    }

    toggle.addEventListener('click', function() {
        const isDark = root.getAttribute('data-theme') === 'dark';
        const next = isDark ? 'light' : 'dark';
        root.setAttribute('data-theme', next);
        localStorage.setItem('theme', next);
    });
})();

// Typing Effect
const typingEffect = document.getElementById('typing-effect');
const typingText = "Turning problems into solutions, framing memories, and dad 24/7.";
let index = 0;

function type() {
    if (index < typingText.length) {
        typingEffect.textContent += typingText.charAt(index);
        index++;
        setTimeout(type, 100);
    }
}
type();