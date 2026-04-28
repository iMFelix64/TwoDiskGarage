const letters = Array.from(document.querySelectorAll(".logo-letter"));
const glyphs = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&*+=?<>[]{}\\/|";
const scrambleTimers = new Map();

function randomGlyph() {
  return glyphs[Math.floor(Math.random() * glyphs.length)];
}

function startScramble(letter) {
  if (scrambleTimers.has(letter)) {
    return;
  }

  letter.classList.add("is-scrambling");
  letter.textContent = randomGlyph();

  const timer = window.setInterval(() => {
    letter.textContent = randomGlyph();
  }, 46);

  scrambleTimers.set(letter, timer);
}

function stopScramble(letter) {
  const timer = scrambleTimers.get(letter);

  if (timer) {
    window.clearInterval(timer);
    scrambleTimers.delete(letter);
  }

  letter.classList.remove("is-scrambling");
  letter.textContent = letter.dataset.letter || "";
}

letters.forEach((letter) => {
  const { width } = letter.getBoundingClientRect();

  letter.style.setProperty("--letter-width", `${width}px`);
  letter.addEventListener("mouseenter", () => startScramble(letter));
  letter.addEventListener("mouseleave", () => stopScramble(letter));
  letter.addEventListener("focus", () => startScramble(letter));
  letter.addEventListener("blur", () => stopScramble(letter));
});
