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