const detailScroll = document.getElementById("detail-scroll");
const archiveApp = document.querySelector(".archive-app");
const projectPanels = Array.from(document.querySelectorAll(".project-panel"));
const indexItems = Array.from(document.querySelectorAll(".index-item"));
const currentProject = document.getElementById("current-project");
const debugToggle = document.getElementById("debug-toggle");
const labelToggle = document.getElementById("label-toggle");
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

let panelOffsets = [];
let visibleProjectId = "";
let selectedProjectId = "";
let expandedProjectId = "";
let ticking = false;
const collapseCopyTimers = new Map();

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
applyDebugLabels();
refreshMeasurements();
syncDebugToggle();
syncLabelToggle();
