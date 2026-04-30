const detailScroll = document.getElementById("detail-scroll");
const archiveApp = document.querySelector(".archive-app");
const projectPanels = Array.from(document.querySelectorAll(".project-panel"));
const indexItems = Array.from(document.querySelectorAll(".index-item"));
const currentProject = document.getElementById("current-project");
const debugToggle = document.getElementById("debug-toggle");
const labelToggle = document.getElementById("label-toggle");
const homeTransitionStage = document.getElementById("home-transition-stage");
const homeIntro = document.getElementById("home-intro");
const homeIntroLetters = Array.from(document.querySelectorAll(".home-intro-letter"));
const homeCursorAsset = "./Assets/Icons/Arrow.svg";
const homeButton = document.getElementById("index-home-button");
const projectGroup = document.getElementById("index-project-group");
const projectToggle = document.getElementById("index-project-toggle");
const expandToggles = Array.from(document.querySelectorAll(".panel-expand-toggle"));
const panelFrames = Array.from(document.querySelectorAll(".panel-frame"));
const frameScrolls = Array.from(document.querySelectorAll(".panel-frame-scroll"));
const frameShells = Array.from(document.querySelectorAll(".panel-frame-shell"));
const projectEmbedFrames = Array.from(document.querySelectorAll(".panel-project-embed-frame"));
const projectEmbedWheelLayers = Array.from(document.querySelectorAll(".panel-project-embed-wheel-layer"));
const panelByProject = new Map(projectPanels.map((panel) => [panel.dataset.project, panel]));
const itemByProject = new Map(indexItems.map((item) => [item.dataset.project, item]));
const PANEL_RESET_ANIMATION_MS = 420;
const HOME_INTRO_GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&*+=?<>[]{}\\/|";
const HOME_FLOAT_ASSETS = [
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
const HOME_FLOAT_ANCHORS = [
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
const HOME_TYPE_START_DELAY = 160;
const HOME_TYPE_LETTER_DELAY = 90;
const HOME_TYPE_SCRAMBLE_DURATION = 230;
const HOME_EXIT_DELAY = 520;

let panelOffsets = [];
let visibleProjectId = "";
let selectedProjectId = "";
let expandedProjectId = "";
let ticking = false;
let isHomeIntroPrepared = false;
const collapseCopyTimers = new Map();
const homeIntroScrambleTimers = new Map();
let homeFloatLayer = null;
let homeCursor = null;
let homeCursorX = window.innerWidth / 2;
let homeCursorY = window.innerHeight / 2;
let isHomeCursorImageHover = false;
let homeCursorTurnTimer = null;

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

function randomHomeIntroGlyph() {
  return HOME_INTRO_GLYPHS[Math.floor(Math.random() * HOME_INTRO_GLYPHS.length)];
}

function startHomeIntroScramble(letter) {
  if (homeIntroScrambleTimers.has(letter)) {
    return;
  }

  letter.classList.add("is-scrambling");
  letter.textContent = randomHomeIntroGlyph();

  const timer = window.setInterval(() => {
    letter.textContent = randomHomeIntroGlyph();
  }, 46);

  homeIntroScrambleTimers.set(letter, timer);
}

function stopHomeIntroScramble(letter) {
  const timer = homeIntroScrambleTimers.get(letter);

  if (timer) {
    window.clearInterval(timer);
    homeIntroScrambleTimers.delete(letter);
  }

  letter.classList.remove("is-scrambling");
  letter.textContent = letter.dataset.letter || "";
  letter.classList.add("is-revealed");
}

function buildHomeFloatLayer() {
  if (!homeIntro || homeFloatLayer) {
    return;
  }

  homeFloatLayer = document.createElement("div");
  homeFloatLayer.className = "home-float-layer";
  homeFloatLayer.setAttribute("aria-hidden", "true");

  HOME_FLOAT_ASSETS.forEach((assetPath) => {
    const item = document.createElement("div");
    const image = document.createElement("img");

    item.className = "home-float-item";
    image.className = "home-float-image";
    image.src = assetPath;
    image.alt = "";
    image.loading = "eager";
    image.decoding = "async";

    item.addEventListener("mouseenter", () => {
      homeIntro.classList.add("is-cursor-image-hover");
    });
    item.addEventListener("mouseleave", () => {
      homeIntro.classList.remove("is-cursor-image-hover");
    });

    item.append(image);
    homeFloatLayer.append(item);
  });

  homeIntro.prepend(homeFloatLayer);
}

function buildHomeCursor() {
  if (!homeIntro || homeCursor) {
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
  cursorArrow.src = homeCursorAsset;
  cursorArrow.alt = "";
  cursorArrow.decoding = "async";

  cursorArrowShell.append(cursorArrow);
  cursorInner.append(cursorArrowShell);
  homeCursor.append(cursorInner);
  homeIntro.append(homeCursor);
}

function syncHomeCursorPosition() {
  if (!homeCursor) {
    return;
  }

  homeCursor.style.setProperty("--cursor-x", `${homeCursorX}px`);
  homeCursor.style.setProperty("--cursor-y", `${homeCursorY}px`);
}

function syncHomeCursorHoverTarget() {
  if (!homeIntro) {
    return;
  }

  const hoveredElement = document.elementFromPoint(homeCursorX, homeCursorY);
  const isLetterHover = Boolean(hoveredElement?.closest(".home-intro-letter"));
  const isTurnHover = Boolean(hoveredElement?.closest(".home-float-item"));

  homeIntro.classList.toggle("is-cursor-letter-hover", isLetterHover);

  if (isTurnHover === isHomeCursorImageHover) {
    return;
  }

  window.clearTimeout(homeCursorTurnTimer);
  homeIntro.classList.remove("is-cursor-image-hover", "is-cursor-image-unhover");

  if (isTurnHover) {
    homeIntro.classList.add("is-cursor-image-hover");
  } else {
    homeIntro.classList.add("is-cursor-image-unhover");
    homeCursorTurnTimer = window.setTimeout(() => {
      homeIntro.classList.remove("is-cursor-image-unhover");
    }, 360);
  }

  isHomeCursorImageHover = isTurnHover;
}

function revealHomeFloatItems() {
  if (!homeFloatLayer) {
    return;
  }

  Array.from(homeFloatLayer.children).forEach((item, index) => {
    item.classList.remove("is-loaded");

    window.setTimeout(
      () => {
        item.classList.add("is-loaded");
      },
      160 + index * 85 + randomBetween(0, 90),
    );
  });
}

function layoutHomeFloatItems() {
  if (!homeFloatLayer) {
    return;
  }

  const anchors = shuffledItems(HOME_FLOAT_ANCHORS);
  const items = Array.from(homeFloatLayer.children);

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

  revealHomeFloatItems();
}

function finishHomeIntro({ immediate = false } = {}) {
  if (!homeIntro) {
    return;
  }

  homeIntro.classList.add("is-exiting");
  homeTransitionStage?.classList.add("is-index-visible");

  window.setTimeout(
    () => {
      homeIntro.hidden = true;
      homeIntro.inert = true;
      archiveApp?.removeAttribute("aria-hidden");

      if (archiveApp) {
        archiveApp.inert = false;
      }
    },
    immediate ? 0 : 760,
  );
}

function prepareHomeIntro() {
  if (!homeIntro || homeIntroLetters.length === 0) {
    return false;
  }

  if (isHomeIntroPrepared) {
    return true;
  }

  buildHomeFloatLayer();
  buildHomeCursor();
  syncHomeCursorPosition();

  homeIntroLetters.forEach((letter) => {
    const { width } = letter.getBoundingClientRect();

    if (letter.dataset.letter === "I") {
      const diskLine = letter.closest(".home-intro-line");
      const widthReference = diskLine?.querySelector('.home-intro-letter[data-letter="S"]');
      const scrambleWidth = widthReference?.getBoundingClientRect().width || width;

      letter.style.removeProperty("--letter-width");
      letter.style.setProperty("--i-scramble-width", `${scrambleWidth}px`);
    } else {
      letter.style.setProperty("--letter-width", `${width}px`);
    }

    letter.textContent = "";
    letter.addEventListener("mouseenter", () => startHomeIntroScramble(letter));
    letter.addEventListener("mouseleave", () => stopHomeIntroScramble(letter));
    letter.addEventListener("focus", () => startHomeIntroScramble(letter));
    letter.addEventListener("blur", () => stopHomeIntroScramble(letter));
  });

  isHomeIntroPrepared = true;
  return true;
}

function playHomeIntro({ autoExit = true, immediate = false } = {}) {
  if (!prepareHomeIntro()) {
    return;
  }

  layoutHomeFloatItems();

  homeIntro.hidden = false;
  homeIntro.inert = false;
  window.clearTimeout(homeCursorTurnTimer);
  isHomeCursorImageHover = false;
  homeIntro.classList.remove(
    "is-complete",
    "is-exiting",
    "is-cursor-image-hover",
    "is-cursor-image-unhover",
    "is-cursor-letter-hover",
  );
  homeIntro.classList.add("is-intro-ready");
  homeTransitionStage?.classList.remove("is-index-visible");

  if (archiveApp) {
    archiveApp.inert = true;
    archiveApp.setAttribute("aria-hidden", "true");
  }

  homeIntroLetters.forEach((letter) => {
    const timer = homeIntroScrambleTimers.get(letter);

    if (timer) {
      window.clearInterval(timer);
      homeIntroScrambleTimers.delete(letter);
    }

    letter.classList.remove("is-revealed", "is-scrambling");
    letter.textContent = "";
  });

  if (immediate || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    homeIntroLetters.forEach((letter) => stopHomeIntroScramble(letter));
    homeIntro.classList.add("is-complete");
    if (autoExit) {
      finishHomeIntro({ immediate: true });
    }
    return;
  }

  homeIntroLetters.forEach((letter, index) => {
    window.setTimeout(() => {
      startHomeIntroScramble(letter);

      window.setTimeout(() => {
        stopHomeIntroScramble(letter);
      }, HOME_TYPE_SCRAMBLE_DURATION);
    }, HOME_TYPE_START_DELAY + index * HOME_TYPE_LETTER_DELAY);
  });

  const introDuration =
    HOME_TYPE_START_DELAY +
    (homeIntroLetters.length - 1) * HOME_TYPE_LETTER_DELAY +
    HOME_TYPE_SCRAMBLE_DURATION;

  window.setTimeout(() => {
    homeIntro.classList.add("is-complete");
  }, introDuration);

  if (autoExit) {
    window.setTimeout(() => {
      finishHomeIntro();
    }, introDuration + HOME_EXIT_DELAY);
  }
}

function initializeHomeIntro() {
  playHomeIntro();
}

homeIntro?.addEventListener("mousemove", (event) => {
  homeCursorX = event.clientX;
  homeCursorY = event.clientY;
  homeIntro.classList.add("is-cursor-visible");
  syncHomeCursorPosition();
  syncHomeCursorHoverTarget();
});

homeIntro?.addEventListener("mouseenter", () => {
  homeIntro.classList.add("is-cursor-visible");
});

homeIntro?.addEventListener("mouseleave", () => {
  window.clearTimeout(homeCursorTurnTimer);
  isHomeCursorImageHover = false;
  homeIntro.classList.remove(
    "is-cursor-visible",
    "is-cursor-image-hover",
    "is-cursor-image-unhover",
    "is-cursor-letter-hover",
  );
});

homeIntro?.addEventListener("click", () => {
  if (!homeIntro.classList.contains("is-complete")) {
    return;
  }

  finishHomeIntro();
});

function syncSelectedProject(selectedId) {
  if (selectedProjectId === selectedId) {
    return;
  }

  itemByProject.get(selectedProjectId)?.classList.remove("is-active");
  itemByProject.get(selectedId)?.classList.add("is-active");

  selectedProjectId = selectedId;
}

function syncVisibleProject(visibleId) {
  if (visibleProjectId === visibleId) {
    return;
  }

  panelByProject.get(visibleProjectId)?.classList.remove("is-active");
  panelByProject.get(visibleId)?.classList.add("is-active");

  if (currentProject) {
    currentProject.textContent = visibleId;
  }

  visibleProjectId = visibleId;
}

function deferPanelCopyUntilCollapseEnds(panel) {
  if (!panel) {
    return;
  }

  const existingTimer = collapseCopyTimers.get(panel);

  if (existingTimer) {
    window.clearTimeout(existingTimer);
  }

  panel.classList.add("is-copy-deferred");

  const timer = window.setTimeout(() => {
    panel.classList.remove("is-copy-deferred");
    collapseCopyTimers.delete(panel);
  }, 400);

  collapseCopyTimers.set(panel, timer);
}

function cancelDeferredPanelCopy(panel) {
  const existingTimer = collapseCopyTimers.get(panel);

  if (existingTimer) {
    window.clearTimeout(existingTimer);
    collapseCopyTimers.delete(panel);
  }

  panel?.classList.remove("is-copy-deferred");
}

function resetEmbeddedProjectScroll(panel) {
  const embedFrame = panel?.querySelector(".panel-project-embed-frame");

  if (!embedFrame?.contentWindow) {
    return false;
  }

  try {
    embedFrame.contentWindow.postMessage(
      {
        type: "project-scroll-to-top",
      },
      "*",
    );

    if (typeof embedFrame.contentWindow.projectViewport?.scrollToTop === "function") {
      embedFrame.contentWindow.projectViewport.scrollToTop();
    } else {
      embedFrame.contentWindow.scrollTo({ top: 0, behavior: "auto" });
    }

    return true;
  } catch (error) {
    return false;
  }
}

function resetPanelContentScroll(panel) {
  if (resetEmbeddedProjectScroll(panel)) {
    return;
  }

  panel?.querySelector(".panel-frame-scroll")?.scrollTo({ top: 0, behavior: "auto" });
}

function animateElementScrollToTop(element, duration = PANEL_RESET_ANIMATION_MS) {
  if (!element) {
    return Promise.resolve(false);
  }

  const start = element.scrollTop;

  if (start <= 1) {
    element.scrollTo({ top: 0, behavior: "auto" });
    return Promise.resolve(false);
  }

  return new Promise((resolve) => {
    const startTime = window.performance.now();

    const tick = (timestamp) => {
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - (1 - progress) ** 3;
      element.scrollTop = start * (1 - eased);

      if (progress < 1) {
        window.requestAnimationFrame(tick);
        return;
      }

      element.scrollTop = 0;
      resolve(true);
    };

    window.requestAnimationFrame(tick);
  });
}

function animateDetailScrollToPanel(panel, duration = PANEL_RESET_ANIMATION_MS) {
  if (!detailScroll || !panel) {
    return Promise.resolve(false);
  }

  const start = detailScroll.scrollTop;
  const target = Math.max(0, panel.offsetTop);
  const distance = target - start;

  if (Math.abs(distance) <= 1) {
    detailScroll.scrollTo({ top: target, behavior: "auto" });
    return Promise.resolve(false);
  }

  return new Promise((resolve) => {
    const startTime = window.performance.now();

    const tick = (timestamp) => {
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - (1 - progress) ** 3;
      detailScroll.scrollTop = start + distance * eased;

      if (progress < 1) {
        window.requestAnimationFrame(tick);
        return;
      }

      detailScroll.scrollTop = target;
      resolve(true);
    };

    window.requestAnimationFrame(tick);
  });
}

async function animateEmbeddedProjectScrollToTop(panel, duration = PANEL_RESET_ANIMATION_MS) {
  const embedFrame = panel?.querySelector(".panel-project-embed-frame");

  if (!embedFrame?.contentWindow) {
    return false;
  }

  try {
    if (typeof embedFrame.contentWindow.projectViewport?.animateToTop === "function") {
      await embedFrame.contentWindow.projectViewport.animateToTop(duration);
      return true;
    }

    embedFrame.contentWindow.postMessage(
      {
        type: "project-scroll-to-top",
        behavior: "smooth",
        duration,
      },
      "*",
    );

    await new Promise((resolve) => {
      window.setTimeout(resolve, duration);
    });

    return true;
  } catch (error) {
    return false;
  }
}

async function animatePanelContentReset(panel, duration = PANEL_RESET_ANIMATION_MS) {
  if (await animateEmbeddedProjectScrollToTop(panel, duration)) {
    return true;
  }

  return animateElementScrollToTop(panel?.querySelector(".panel-frame-scroll"), duration);
}

function schedulePanelContentReset(panel) {
  if (!panel) {
    return;
  }

  window.setTimeout(() => resetPanelContentScroll(panel), PANEL_RESET_ANIMATION_MS + 40);
}

function postScrollToEmbeddedProject(panel, deltaY) {
  const embedFrame = panel?.querySelector(".panel-project-embed-frame");

  if (!embedFrame?.contentWindow) {
    return false;
  }

  try {
    embedFrame.contentWindow.postMessage(
      {
        type: "project-scroll-by",
        deltaY,
      },
      "*",
    );
    return true;
  } catch (error) {
    return false;
  }
}

async function syncExpandedProject(projectId = "") {
  if (expandedProjectId === projectId) {
    return;
  }

  if (expandedProjectId) {
    const previousPanel = panelByProject.get(expandedProjectId);

    if (!projectId) {
      animatePanelContentReset(previousPanel);
    }

    previousPanel?.classList.remove("is-expanded");
    previousPanel?.querySelector(".panel-expand-toggle")?.setAttribute("aria-expanded", "false");
    previousPanel?.querySelector(".panel-side-copy")?.setAttribute("aria-hidden", "true");
    if (!projectId) {
      schedulePanelContentReset(previousPanel);
      deferPanelCopyUntilCollapseEnds(previousPanel);
    }
  }

  expandedProjectId = projectId;

  if (expandedProjectId) {
    const nextPanel = panelByProject.get(expandedProjectId);
    cancelDeferredPanelCopy(nextPanel);
    nextPanel?.classList.add("is-expanded");
    nextPanel?.querySelector(".panel-expand-toggle")?.setAttribute("aria-expanded", "true");
    nextPanel?.querySelector(".panel-side-copy")?.setAttribute("aria-hidden", "false");
    resetPanelContentScroll(nextPanel);
    nextPanel?.querySelector(".panel-frame-scroll")?.focus();
  }

  archiveApp?.classList.toggle("is-panel-expanded", Boolean(expandedProjectId));
  window.setTimeout(refreshMeasurements, 460);
}

function measureProjectOffsets() {
  panelOffsets = projectPanels.map((panel) => ({
    id: panel.dataset.project,
    top: panel.offsetTop,
  }));
}

function updateActiveProject() {
  if (!detailScroll || projectPanels.length === 0) {
    return;
  }

  if (expandedProjectId) {
    syncVisibleProject(expandedProjectId);
    return;
  }

  const scrollTop = detailScroll.scrollTop;
  let activeId = panelOffsets[0]?.id || projectPanels[0].dataset.project;

  for (let index = panelOffsets.length - 1; index >= 0; index -= 1) {
    if (panelOffsets[index].top <= scrollTop + 24) {
      activeId = panelOffsets[index].id;
      break;
    }
  }

  syncVisibleProject(activeId);
}

function requestActiveUpdate() {
  if (ticking) {
    return;
  }

  ticking = true;

  window.requestAnimationFrame(() => {
    updateActiveProject();
    ticking = false;
  });
}

function refreshMeasurements() {
  measureProjectOffsets();
  requestActiveUpdate();
}

function syncDebugToggle() {
  if (!debugToggle) {
    return;
  }

  debugToggle.setAttribute(
    "aria-pressed",
    String(document.body.classList.contains("debug-outlines")),
  );
}

function syncLabelToggle() {
  if (!labelToggle) {
    return;
  }

  labelToggle.setAttribute(
    "aria-pressed",
    String(document.body.classList.contains("debug-labels")),
  );
}

function buildDebugLabel(element) {
  const tagName = element.tagName.toLowerCase();
  const idPart = element.id ? `#${element.id}` : "";
  const classList = Array.from(element.classList).filter((className) => !className.startsWith("is-"));
  const classPart = classList.length ? `.${classList[0]}` : "";
  const projectPart = element.dataset.project ? `[${element.dataset.project}]` : "";

  return `${tagName}${idPart}${classPart}${projectPart}`;
}

function applyDebugLabels() {
  const labelTargets = document.querySelectorAll(
    "[data-debug-label], main, aside, section, header, nav, article, div, ol, li, figure, button",
  );

  labelTargets.forEach((element) => {
    if (!element.dataset.debugLabel) {
      if (!element.className && !element.id && !element.dataset.project) {
        return;
      }

      element.setAttribute("data-debug-label", buildDebugLabel(element));
    }

    const hasBadge = Array.from(element.children).some(
      (child) => child.classList.contains("debug-name-badge"),
    );

    if (hasBadge) {
      return;
    }

    const badge = document.createElement("span");
    badge.className = "debug-name-badge";
    badge.setAttribute("aria-hidden", "true");
    badge.textContent = element.dataset.debugLabel;
    element.insertAdjacentElement("afterbegin", badge);
  });
}

function syncExpandedFrameWheel(event) {
  const frameLayer = event.currentTarget;
  const parentPanel = frameLayer.closest(".project-panel");
  const frameScroll = parentPanel?.querySelector(".panel-frame-scroll");

  if (!parentPanel?.classList.contains("is-expanded") || !frameScroll) {
    return;
  }

  if (parentPanel.querySelector(".panel-project-embed-frame")) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  frameScroll.scrollTop += event.deltaY;
}

indexItems.forEach((item) => {
  item.tabIndex = 0;

  const targetPanel = projectPanels.find((panel) => panel.dataset.project === item.dataset.project);

  if (!targetPanel) {
    return;
  }

  const scrollToPanel = () => {
    syncSelectedProject(item.dataset.project);
    targetPanel.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  item.addEventListener("click", scrollToPanel);
  item.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      scrollToPanel();
    }
  });
});

detailScroll?.addEventListener("scroll", requestActiveUpdate, { passive: true });
window.addEventListener("resize", refreshMeasurements);
window.addEventListener("load", refreshMeasurements);

homeButton?.addEventListener("click", async () => {
  syncSelectedProject(projectPanels[0]?.dataset.project || "01");
  await syncExpandedProject("");
  detailScroll?.scrollTo({
    top: 0,
    behavior: "auto",
  });
  playHomeIntro({ autoExit: false });
});

projectToggle?.addEventListener("click", () => {
  const isCollapsed = projectGroup?.classList.toggle("is-collapsed");

  projectToggle.setAttribute("aria-expanded", String(!isCollapsed));
});

debugToggle?.addEventListener("click", () => {
  document.body.classList.toggle("debug-outlines");
  syncDebugToggle();
});

labelToggle?.addEventListener("click", () => {
  applyDebugLabels();
  document.body.classList.toggle("debug-labels");
  syncLabelToggle();
});

expandToggles.forEach((toggle) => {
  const parentPanel = toggle.closest(".project-panel");

  if (!parentPanel) {
    return;
  }

  toggle.addEventListener("click", async () => {
    const projectId = parentPanel.dataset.project;
    const nextExpandedId = expandedProjectId === projectId ? "" : projectId;
    const isCollapsingCurrentProject = !nextExpandedId;

    syncSelectedProject(projectId);
    syncVisibleProject(projectId);

    if (nextExpandedId) {
      await animateDetailScrollToPanel(parentPanel);
    }

    await syncExpandedProject(nextExpandedId);

    if (isCollapsingCurrentProject) {
      window.requestAnimationFrame(() => {
        parentPanel.scrollIntoView({
          behavior: "auto",
          block: "start",
        });
      });
    }
  });
});

frameScrolls.forEach((frameScroll) => {
  frameScroll.tabIndex = -1;
  frameScroll.addEventListener("wheel", syncExpandedFrameWheel, { passive: false });
});

panelFrames.forEach((panelFrame) => {
  panelFrame.addEventListener("wheel", syncExpandedFrameWheel, { passive: false });
});

frameShells.forEach((frameShell) => {
  frameShell.addEventListener("wheel", syncExpandedFrameWheel, { passive: false });
});

projectEmbedFrames.forEach((embedFrame) => {
  embedFrame.addEventListener("load", () => {
    const parentPanel = embedFrame.closest(".project-panel");

    resetEmbeddedProjectScroll(parentPanel);
  });

  resetEmbeddedProjectScroll(embedFrame.closest(".project-panel"));
});

projectEmbedWheelLayers.forEach((wheelLayer) => {
  wheelLayer.addEventListener(
    "wheel",
    (event) => {
      const parentPanel = wheelLayer.closest(".project-panel");

      if (!parentPanel?.classList.contains("is-expanded")) {
        return;
      }

      const didPost = postScrollToEmbeddedProject(parentPanel, event.deltaY);

      if (!didPost) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
    },
    { passive: false },
  );
});

syncSelectedProject(indexItems[0]?.dataset.project || "01");
initializeHomeIntro();
applyDebugLabels();
refreshMeasurements();
syncDebugToggle();
syncLabelToggle();
