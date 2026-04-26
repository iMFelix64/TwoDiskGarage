const detailScroll = document.getElementById("detail-scroll");
const projectPanels = Array.from(document.querySelectorAll(".project-panel"));
const indexItems = Array.from(document.querySelectorAll(".index-item"));
const currentProject = document.getElementById("current-project");
const panelByProject = new Map(projectPanels.map((panel) => [panel.dataset.project, panel]));
const itemByProject = new Map(indexItems.map((item) => [item.dataset.project, item]));

let panelOffsets = [];
let activeProjectId = "";
let ticking = false;

function syncActiveProject(activeId) {
  if (activeProjectId === activeId) {
    return;
  }

  panelByProject.get(activeProjectId)?.classList.remove("is-active");
  itemByProject.get(activeProjectId)?.classList.remove("is-active");
  panelByProject.get(activeId)?.classList.add("is-active");
  itemByProject.get(activeId)?.classList.add("is-active");

  if (currentProject) {
    currentProject.textContent = activeId;
  }

  activeProjectId = activeId;
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

  syncActiveProject(activeId);
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

indexItems.forEach((item) => {
  item.tabIndex = 0;

  const targetPanel = projectPanels.find((panel) => panel.dataset.project === item.dataset.project);

  if (!targetPanel) {
    return;
  }

  const scrollToPanel = () => {
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

refreshMeasurements();
