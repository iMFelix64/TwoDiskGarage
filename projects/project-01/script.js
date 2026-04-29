const root = document.documentElement;
const isEmbedded =
  window.self !== window.top || new URLSearchParams(window.location.search).get("embed") === "1";

function syncViewportHeight() {
  root.style.setProperty("--project-vh", `${window.innerHeight}px`);
}

window.projectViewport = {
  scrollToTop() {
    window.scrollTo({ top: 0, behavior: "auto" });
  },
};

document.body.classList.toggle("is-embedded", isEmbedded);
window.addEventListener("resize", syncViewportHeight);
syncViewportHeight();
