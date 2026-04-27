const detailScroll = document.getElementById("detail-scroll");
const projectPanels = Array.from(document.querySelectorAll(".project-panel"));
const indexItems = Array.from(document.querySelectorAll(".index-item"));
const currentProject = document.getElementById("current-project");
const debugToggle = document.getElementById("debug-toggle");
const homeButton = document.getElementById("index-home-button");
const projectGroup = document.getElementById("index-project-group");
const projectToggle = document.getElementById("index-project-toggle");
const panelByProject = new Map(projectPanels.map((panel) => [panel.dataset.project, panel]));
const itemByProject = new Map(indexItems.map((item) => [item.dataset.project, item]));

let panelOffsets = [];
let visibleProjectId = "";
let selectedProjectId = "";
let ticking = false;

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

syncSelectedProject(indexItems[0]?.dataset.project || "01");
refreshMeasurements();
syncDebugToggle();
