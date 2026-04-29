const root = document.documentElement;
const projectPage = document.querySelector(".project-page");
const isEmbedded =
  window.self !== window.top || new URLSearchParams(window.location.search).get("embed") === "1";

function syncViewportHeight() {
  root.style.setProperty("--project-vh", `${window.innerHeight}px`);
}

window.projectViewport = {
  scrollToTop() {
    projectPage?.scrollTo({ top: 0, behavior: "auto" });
  },
};

window.addEventListener("message", (event) => {
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
