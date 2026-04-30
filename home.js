const letters = Array.from(document.querySelectorAll(".logo-letter"));
const homeStage = document.querySelector(".home-stage");
const glyphs = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&*+=?<>[]{}\\/|";
const cursorAsset = "./Assets/Icons/Arrow.svg";
const floatAssets = [
  "./Assets/Home/截屏2026-04-30 11.27.38 1.png",
  "./Assets/Home/截屏2026-04-30 11.27.51 1.png",
  "./Assets/Home/截屏2026-04-30 11.28.06 1.png",
  "./Assets/Home/截屏2026-04-30 11.28.15 1.png",
  "./Assets/Home/截屏2026-04-30 11.28.34 1.png",
  "./Assets/Home/截屏2026-04-30 11.29.14 1.png",
  "./Assets/Home/截屏2026-04-30 11.29.33 1.png",
  "./Assets/Home/截屏2026-04-30 11.31.59 1.png",
  "./Assets/Home/截屏2026-04-30 11.32.21 1.png",
];
const floatAnchors = [
  [7, 10],
  [76, 8],
  [12, 30],
  [78, 30],
  [5, 55],
  [84, 54],
  [14, 78],
  [60, 80],
  [88, 76],
];
const scrambleTimers = new Map();
const TYPE_START_DELAY = 160;
const TYPE_LETTER_DELAY = 90;
const TYPE_SCRAMBLE_DURATION = 230;
const HOME_EXIT_DELAY = 520;

let floatLayer = null;
let homeCursor = null;
let homeCursorX = window.innerWidth / 2;
let homeCursorY = window.innerHeight / 2;
let isCursorImageHover = false;
let cursorTurnTimer = null;

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function shuffledItems(items) {
  const nextItems = [...items];

  for (let index = nextItems.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [nextItems[index], nextItems[swapIndex]] = [nextItems[swapIndex], nextItems[index]];
  }

  return nextItems;
}

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
  letter.classList.add("is-revealed");
}

function buildFloatLayer() {
  if (!homeStage || floatLayer) {
    return;
  }

  floatLayer = document.createElement("div");
  floatLayer.className = "home-float-layer";
  floatLayer.setAttribute("aria-hidden", "true");

  floatAssets.forEach((assetPath) => {
    const item = document.createElement("div");
    const image = document.createElement("img");

    item.className = "home-float-item";
    image.className = "home-float-image";
    image.src = assetPath;
    image.alt = "";
    image.loading = "eager";
    image.decoding = "async";

    item.addEventListener("mouseenter", () => {
      homeStage.classList.add("is-cursor-image-hover");
    });
    item.addEventListener("mouseleave", () => {
      homeStage.classList.remove("is-cursor-image-hover");
    });

    item.append(image);
    floatLayer.append(item);
  });

  homeStage.prepend(floatLayer);
}

function buildCursor() {
  if (!homeStage || homeCursor) {
    return;
  }

  homeCursor = document.createElement("div");
  const cursorInner = document.createElement("div");
  const cursorArrowShell = document.createElement("div");
  const cursorArrow = document.createElement("img");

  homeCursor.className = "home-custom-cursor";
  homeCursor.setAttribute("aria-hidden", "true");
  cursorInner.className = "home-custom-cursor-inner";
  cursorArrowShell.className = "home-custom-cursor-arrow-shell";
  cursorArrow.className = "home-custom-cursor-arrow";
  cursorArrow.src = cursorAsset;
  cursorArrow.alt = "";
  cursorArrow.decoding = "async";

  cursorArrowShell.append(cursorArrow);
  cursorInner.append(cursorArrowShell);
  homeCursor.append(cursorInner);
  homeStage.append(homeCursor);
}

function syncCursorPosition() {
  if (!homeCursor) {
    return;
  }

  homeCursor.style.setProperty("--cursor-x", `${homeCursorX}px`);
  homeCursor.style.setProperty("--cursor-y", `${homeCursorY}px`);
}

function syncCursorHoverTarget() {
  if (!homeStage) {
    return;
  }

  const hoveredElement = document.elementFromPoint(homeCursorX, homeCursorY);
  const isLetterHover = Boolean(hoveredElement?.closest(".logo-letter"));
  const isTurnHover = Boolean(hoveredElement?.closest(".home-float-item"));

  homeStage.classList.toggle("is-cursor-letter-hover", isLetterHover);

  if (isTurnHover === isCursorImageHover) {
    return;
  }

  window.clearTimeout(cursorTurnTimer);
  homeStage.classList.remove("is-cursor-image-hover", "is-cursor-image-unhover");

  if (isTurnHover) {
    homeStage.classList.add("is-cursor-image-hover");
  } else {
    homeStage.classList.add("is-cursor-image-unhover");
    cursorTurnTimer = window.setTimeout(() => {
      homeStage.classList.remove("is-cursor-image-unhover");
    }, 360);
  }

  isCursorImageHover = isTurnHover;
}

function revealFloatItems() {
  if (!floatLayer) {
    return;
  }

  Array.from(floatLayer.children).forEach((item, index) => {
    item.classList.remove("is-loaded");

    window.setTimeout(
      () => {
        item.classList.add("is-loaded");
      },
      160 + index * 85 + randomBetween(0, 90),
    );
  });
}

function layoutFloatItems() {
  if (!floatLayer) {
    return;
  }

  const anchors = shuffledItems(floatAnchors);
  const items = Array.from(floatLayer.children);

  items.forEach((item, index) => {
    const [anchorX, anchorY] = anchors[index % anchors.length];
    const left = Math.max(0, Math.min(88, anchorX + randomBetween(-3, 3)));
    const top = Math.max(3, Math.min(82, anchorY + randomBetween(-4, 4)));

    item.style.setProperty("--float-left", `${left}%`);
    item.style.setProperty("--float-top", `${top}%`);
    item.style.setProperty(
      "--float-width",
      `clamp(${randomBetween(81, 114).toFixed(1)}px, ${randomBetween(10.8, 16.2).toFixed(2)}vw, ${randomBetween(240, 330).toFixed(1)}px)`,
    );
    item.style.setProperty("--float-x", `${randomBetween(-18, 18)}px`);
    item.style.setProperty("--float-y", `${randomBetween(-16, 16)}px`);
    item.style.setProperty("--float-rotate-start", `${randomBetween(-3, 3)}deg`);
    item.style.setProperty("--float-rotate-end", `${randomBetween(-4, 4)}deg`);
    item.style.setProperty("--float-duration", `${randomBetween(9, 16)}s`);
    item.style.setProperty("--float-delay", `${randomBetween(-10, 0)}s`);
  });

  revealFloatItems();
}

buildFloatLayer();
buildCursor();
layoutFloatItems();
syncCursorPosition();

letters.forEach((letter) => {
  const { width } = letter.getBoundingClientRect();

  if (letter.dataset.letter === "I") {
    const diskLine = letter.closest(".logo-line");
    const widthReference = diskLine?.querySelector('.logo-letter[data-letter="S"]');
    const scrambleWidth = widthReference?.getBoundingClientRect().width || width;

    letter.style.removeProperty("--letter-width");
    letter.style.setProperty("--i-scramble-width", `${scrambleWidth}px`);
  } else {
    letter.style.setProperty("--letter-width", `${width}px`);
  }

  letter.textContent = "";
  letter.addEventListener("mouseenter", () => startScramble(letter));
  letter.addEventListener("mouseleave", () => stopScramble(letter));
  letter.addEventListener("focus", () => startScramble(letter));
  letter.addEventListener("blur", () => stopScramble(letter));
});

homeStage?.classList.add("is-intro-ready");

homeStage?.addEventListener("mousemove", (event) => {
  homeCursorX = event.clientX;
  homeCursorY = event.clientY;
  homeStage.classList.add("is-cursor-visible");
  syncCursorPosition();
  syncCursorHoverTarget();
});

homeStage?.addEventListener("mouseenter", () => {
  homeStage.classList.add("is-cursor-visible");
});

homeStage?.addEventListener("mouseleave", () => {
  window.clearTimeout(cursorTurnTimer);
  isCursorImageHover = false;
  homeStage.classList.remove(
    "is-cursor-visible",
    "is-cursor-image-hover",
    "is-cursor-image-unhover",
    "is-cursor-letter-hover",
  );
});

if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  letters.forEach((letter) => stopScramble(letter));
  homeStage?.classList.add("is-exiting");
} else {
  letters.forEach((letter, index) => {
    window.setTimeout(() => {
      startScramble(letter);

      window.setTimeout(() => {
        stopScramble(letter);
      }, TYPE_SCRAMBLE_DURATION);
    }, TYPE_START_DELAY + index * TYPE_LETTER_DELAY);
  });

  const introDuration =
    TYPE_START_DELAY + (letters.length - 1) * TYPE_LETTER_DELAY + TYPE_SCRAMBLE_DURATION;

  window.setTimeout(() => {
    homeStage?.classList.add("is-complete");
  }, introDuration);

  window.setTimeout(() => {
    homeStage?.classList.add("is-exiting");
  }, introDuration + HOME_EXIT_DELAY);
}
