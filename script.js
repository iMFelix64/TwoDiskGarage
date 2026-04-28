const detailScroll = document.getElementById("detail-scroll");
const archiveApp = document.querySelector(".archive-app");
const projectPanels = Array.from(document.querySelectorAll(".project-panel"));
const indexItems = Array.from(document.querySelectorAll(".index-item"));
const currentProject = document.getElementById("current-project");
const debugToggle = document.getElementById("debug-toggle");
const homeButton = document.getElementById("index-home-button");
const projectGroup = document.getElementById("index-project-group");
const projectToggle = document.getElementById("index-project-toggle");
const expandToggles = Array.from(document.querySelectorAll(".panel-expand-toggle"));
const panelFrames = Array.from(document.querySelectorAll(".panel-frame"));
const frameScrolls = Array.from(document.querySelectorAll(".panel-frame-scroll"));
const panelByProject = new Map(projectPanels.map((panel) => [panel.dataset.project, panel]));
const itemByProject = new Map(indexItems.map((item) => [item.dataset.project, item]));

let panelOffsets = [];
let visibleProjectId = "";
let selectedProjectId = "";
let expandedProjectId = "";
let ticking = false;
const collapseCopyTimers = new Map();
const frameImageSizeCache = new Map();
const frameTransitionMs = 300;

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

function extractBackgroundImageUrl(backgroundImage) {
  const match = backgroundImage.match(/url\(["']?(.+?)["']?\)/);

  return match?.[1] || "";
}

function loadFrameImageSize(url) {
  if (!url) {
    return Promise.resolve(null);
  }

  if (frameImageSizeCache.has(url)) {
    return frameImageSizeCache.get(url);
  }

  const imageSizePromise = new Promise((resolve) => {
    const image = new Image();

    image.onload = () => {
      resolve({
        width: image.naturalWidth,
        height: image.naturalHeight,
      });
    };
    image.onerror = () => resolve(null);
    image.src = url;
  });

  frameImageSizeCache.set(url, imageSizePromise);
  return imageSizePromise;
}

function parsePositionValue(value, axis) {
  if (!value || value === "center") {
    return 0.5;
  }

  if (axis === "x") {
    if (value === "left") {
      return 0;
    }

    if (value === "right") {
      return 1;
    }
  }

  if (axis === "y") {
    if (value === "top") {
      return 0;
    }

    if (value === "bottom") {
      return 1;
    }
  }

  if (value.endsWith("%")) {
    return Number.parseFloat(value) / 100;
  }

  return 0.5;
}

function parseFrameImagePosition(position) {
  const parts = position.trim().split(/\s+/);
  const [x = "center", y = "center"] = parts;

  return {
    x: parsePositionValue(x, "x"),
    y: parsePositionValue(y, "y"),
  };
}

function parseFrameImageSize(size, viewportWidth, viewportHeight, naturalSize) {
  const [rawWidth = "auto", rawHeight = "auto"] = size.trim().split(/\s+/);
  const aspectRatio = naturalSize.width / naturalSize.height;

  if (rawWidth === "auto" && rawHeight.endsWith("%")) {
    const height = viewportHeight * (Number.parseFloat(rawHeight) / 100);
    return {
      width: height * aspectRatio,
      height,
    };
  }

  if (rawHeight === "auto" && rawWidth.endsWith("%")) {
    const width = viewportWidth * (Number.parseFloat(rawWidth) / 100);
    return {
      width,
      height: width / aspectRatio,
    };
  }

  if (rawWidth.endsWith("px") && rawHeight.endsWith("px")) {
    return {
      width: Number.parseFloat(rawWidth),
      height: Number.parseFloat(rawHeight),
    };
  }

  if (rawWidth === "cover" || size === "cover") {
    const scale = Math.max(viewportWidth / naturalSize.width, viewportHeight / naturalSize.height);

    return {
      width: naturalSize.width * scale,
      height: naturalSize.height * scale,
    };
  }

  const height = viewportHeight;

  return {
    width: height * aspectRatio,
    height,
  };
}

async function freezeFrameImageToCurrentViewport(panel) {
  const stage = panel?.querySelector(".panel-frame-stage--curtain");

  if (!stage) {
    return;
  }

  const computedStyle = window.getComputedStyle(stage);
  const imageUrl = extractBackgroundImageUrl(computedStyle.backgroundImage);
  const naturalSize = await loadFrameImageSize(imageUrl);

  if (!naturalSize) {
    return;
  }

  const stageRect = stage.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const imageSize = parseFrameImageSize(
    computedStyle.backgroundSize,
    viewportWidth,
    viewportHeight,
    naturalSize,
  );
  const position = parseFrameImagePosition(computedStyle.backgroundPosition);
  const viewportOffsetX = (viewportWidth - imageSize.width) * position.x;
  const viewportOffsetY = (viewportHeight - imageSize.height) * position.y;

  panel.style.setProperty("--project-frame-image-size-frozen", `${imageSize.width}px ${imageSize.height}px`);
  panel.style.setProperty(
    "--project-frame-image-position-frozen",
    `${viewportOffsetX - stageRect.left}px ${viewportOffsetY - stageRect.top}px`,
  );
  panel.classList.add("is-frame-image-frozen");
}

function releaseFrameImageFreeze(panel) {
  panel?.classList.remove("is-frame-image-frozen");
  panel?.style.removeProperty("--project-frame-image-size-frozen");
  panel?.style.removeProperty("--project-frame-image-position-frozen");
}

async function syncExpandedProject(projectId = "") {
  if (expandedProjectId === projectId) {
    return;
  }

  if (projectId) {
    await freezeFrameImageToCurrentViewport(panelByProject.get(projectId));
  }

  if (expandedProjectId) {
    const previousPanel = panelByProject.get(expandedProjectId);
    previousPanel?.classList.remove("is-expanded");
    previousPanel?.querySelector(".panel-expand-toggle")?.setAttribute("aria-expanded", "false");
    previousPanel?.querySelector(".panel-side-copy")?.setAttribute("aria-hidden", "true");

    if (!projectId) {
      deferPanelCopyUntilCollapseEnds(previousPanel);
      window.setTimeout(() => releaseFrameImageFreeze(previousPanel), frameTransitionMs);
    }
  }

  expandedProjectId = projectId;

  if (expandedProjectId) {
    const nextPanel = panelByProject.get(expandedProjectId);
    cancelDeferredPanelCopy(nextPanel);
    nextPanel?.classList.add("is-expanded");
    nextPanel?.querySelector(".panel-expand-toggle")?.setAttribute("aria-expanded", "true");
    nextPanel?.querySelector(".panel-side-copy")?.setAttribute("aria-hidden", "false");
    nextPanel?.querySelector(".panel-frame")?.scrollTo({ top: 0, behavior: "auto" });
    nextPanel?.querySelector(".panel-frame")?.focus();
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

function syncExpandedFrameWheel(event) {
  const frameElement = event.currentTarget;
  const parentPanel = frameElement.closest(".project-panel");

  if (!parentPanel?.classList.contains("is-expanded")) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  frameElement.scrollTop += event.deltaY;
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

homeButton?.addEventListener("click", () => {
  syncSelectedProject(projectPanels[0]?.dataset.project || "01");
  syncExpandedProject("");
  detailScroll?.scrollTo({
    top: 0,
    behavior: "smooth",
  });
});

projectToggle?.addEventListener("click", () => {
  const isCollapsed = projectGroup?.classList.toggle("is-collapsed");

  projectToggle.setAttribute("aria-expanded", String(!isCollapsed));
});

debugToggle?.addEventListener("click", () => {
  document.body.classList.toggle("debug-outlines");
  syncDebugToggle();
});

expandToggles.forEach((toggle) => {
  const parentPanel = toggle.closest(".project-panel");

  if (!parentPanel) {
    return;
  }

  toggle.addEventListener("click", async () => {
    const projectId = parentPanel.dataset.project;
    const nextExpandedId = expandedProjectId === projectId ? "" : projectId;

    syncSelectedProject(projectId);
    syncVisibleProject(projectId);
    await syncExpandedProject(nextExpandedId);
    parentPanel.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  });
});

panelFrames.forEach((panelFrame) => {
  panelFrame.tabIndex = -1;
  panelFrame.addEventListener("wheel", syncExpandedFrameWheel, { passive: false });
});

syncSelectedProject(indexItems[0]?.dataset.project || "01");
refreshMeasurements();
syncDebugToggle();
