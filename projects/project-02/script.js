const root = document.documentElement;
const projectPage = document.querySelector(".project-page");
const isEmbedded =
  window.self !== window.top || new URLSearchParams(window.location.search).get("embed") === "1";
const PROJECT_RESET_ANIMATION_MS = 420;

function syncViewportHeight() {
  root.style.setProperty("--project-vh", `${window.innerHeight}px`);
}

function scrollProjectToTop() {
  projectPage?.scrollTo({ top: 0, behavior: "auto" });
}

function animateProjectToTop(duration = PROJECT_RESET_ANIMATION_MS) {
  if (!projectPage) {
    return Promise.resolve(false);
  }

  const start = projectPage.scrollTop;

  if (start <= 1) {
    scrollProjectToTop();
    return Promise.resolve(false);
  }

  return new Promise((resolve) => {
    const startTime = window.performance.now();

    const tick = (timestamp) => {
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - (1 - progress) ** 3;
      projectPage.scrollTop = start * (1 - eased);

      if (progress < 1) {
        window.requestAnimationFrame(tick);
        return;
      }

      projectPage.scrollTop = 0;
      resolve(true);
    };

    window.requestAnimationFrame(tick);
  });
}

function getProjectScrollState() {
  if (!projectPage) {
    return {
      isAtBottom: true,
      isReady: false,
    };
  }

  const maxScrollTop = Math.max(0, projectPage.scrollHeight - projectPage.clientHeight);

  return {
    isAtBottom: projectPage.scrollTop >= maxScrollTop - 2,
    isReady: true,
    maxScrollTop,
    scrollTop: projectPage.scrollTop,
  };
}

window.projectViewport = {
  getScrollState() {
    return getProjectScrollState();
  },
  scrollToTop(options = {}) {
    if (options?.behavior === "smooth") {
      return animateProjectToTop(options.duration);
    }

    scrollProjectToTop();
    return Promise.resolve(false);
  },
  animateToTop(duration = PROJECT_RESET_ANIMATION_MS) {
    return animateProjectToTop(duration);
  },
};

window.addEventListener("message", (event) => {
  if (event.data?.type === "project-scroll-to-top") {
    if (event.data.behavior === "smooth") {
      animateProjectToTop(Number(event.data.duration) || PROJECT_RESET_ANIMATION_MS);
      return;
    }

    scrollProjectToTop();
    return;
  }

  if (event.data?.type !== "project-scroll-by") {
    return;
  }

  projectPage?.scrollBy({
    top: Number(event.data.deltaY) || 0,
    behavior: "auto",
  });
});

document.body.classList.toggle("is-embedded", isEmbedded);
window.addEventListener("resize", syncViewportHeight);
syncViewportHeight();
