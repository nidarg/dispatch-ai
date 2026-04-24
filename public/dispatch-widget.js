(function () {
  var script = document.currentScript;

  if (!script) {
    console.error("Dispatch AI: script tag not found.");
    return;
  }

  var company = script.getAttribute("data-company");

  if (!company) {
    console.error("Dispatch AI: missing data-company attribute.");
    return;
  }

  var baseUrl = script.getAttribute("data-base-url") || window.location.origin;
  var buttonText = script.getAttribute("data-button-text") || "Need help?";
  var accentColor = script.getAttribute("data-accent-color") || "#dc2626";

  var widgetUrl =
    baseUrl.replace(/\/$/, "") +
    "/widget/" +
    encodeURIComponent(company) +
    "?embed=true";

  var button = document.createElement("button");
  button.type = "button";
  button.innerText = buttonText;
  button.setAttribute("aria-label", buttonText);

  Object.assign(button.style, {
    position: "fixed",
    right: "20px",
    bottom: "20px",
    zIndex: "2147483647",
    border: "none",
    borderRadius: "999px",
    padding: "14px 18px",
    background: accentColor,
    color: "#ffffff",
    fontFamily: "Arial, sans-serif",
    fontSize: "15px",
    fontWeight: "700",
    cursor: "pointer",
    boxShadow: "0 12px 30px rgba(0,0,0,0.22)",
  });

  var overlay = document.createElement("div");

  Object.assign(overlay.style, {
    position: "fixed",
    inset: "0",
    zIndex: "2147483646",
    display: "none",
    background: "rgba(15, 23, 42, 0.55)",
  });

  var modal = document.createElement("div");

  Object.assign(modal.style, {
    position: "fixed",
    right: "20px",
    bottom: "90px",
    width: "min(760px, calc(100vw - 40px))",
    height: "min(760px, calc(100vh - 120px))",
    background: "#ffffff",
    borderRadius: "24px",
    overflow: "hidden",
    boxShadow: "0 24px 80px rgba(0,0,0,0.35)",
  });

  var iframe = document.createElement("iframe");
  iframe.src = widgetUrl;
  iframe.title = "Dispatch AI widget";
  iframe.loading = "lazy";

  Object.assign(iframe.style, {
    width: "100%",
    height: "100%",
    border: "0",
    display: "block",
    background: "#ffffff",
  });

  modal.appendChild(iframe);
  overlay.appendChild(modal);

  document.body.appendChild(button);
  document.body.appendChild(overlay);

  function openWidget() {
    overlay.style.display = "block";
    button.style.display = "none";
  }

  function closeWidget() {
    overlay.style.display = "none";
    button.style.display = "block";
  }

  button.addEventListener("click", openWidget);

  overlay.addEventListener("click", function (event) {
    if (event.target === overlay) {
      closeWidget();
    }
  });

  window.addEventListener("message", function (event) {
    if (event.data && event.data.type === "dispatch-ai-close-widget") {
      closeWidget();
    }
  });
})();