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

  var scriptUrl = new URL(script.src);
  var defaultBaseUrl = scriptUrl.origin;

  var baseUrl = script.getAttribute("data-base-url") || defaultBaseUrl;
  var buttonText = script.getAttribute("data-button-text") || "Need help?";
  var accentColor = script.getAttribute("data-accent-color") || "#dc2626";
  var position = script.getAttribute("data-position") || "bottom-right";

  var widgetUrl =
    baseUrl.replace(/\/$/, "") +
    "/widget/" +
    encodeURIComponent(company) +
    "?embed=true";

  var existingWidget = document.getElementById("dispatch-ai-widget-root");

  if (existingWidget) {
    console.warn("Dispatch AI: widget already initialized.");
    return;
  }

  var root = document.createElement("div");
  root.id = "dispatch-ai-widget-root";

  var button = document.createElement("button");
  button.type = "button";
  button.innerText = buttonText;
  button.setAttribute("aria-label", buttonText);

  Object.assign(button.style, {
    position: "fixed",
    zIndex: "2147483647",
    border: "none",
    borderRadius: "999px",
    padding: "14px 18px",
    background: accentColor,
    color: "#ffffff",
    fontFamily:
      "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
    fontSize: "15px",
    fontWeight: "700",
    cursor: "pointer",
    boxShadow: "0 12px 30px rgba(0,0,0,0.22)",
  });

  if (position === "bottom-left") {
    button.style.left = "20px";
    button.style.bottom = "20px";
  } else {
    button.style.right = "20px";
    button.style.bottom = "20px";
  }

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
    width: "min(760px, calc(100vw - 40px))",
    height: "min(760px, calc(100vh - 120px))",
    background: "#ffffff",
    borderRadius: "24px",
    overflow: "hidden",
    boxShadow: "0 24px 80px rgba(0,0,0,0.35)",
  });

  if (position === "bottom-left") {
    modal.style.left = "20px";
    modal.style.bottom = "90px";
  } else {
    modal.style.right = "20px";
    modal.style.bottom = "90px";
  }

  var iframe = document.createElement("iframe");
  iframe.src = widgetUrl;
  iframe.title = "Dispatch AI widget";
  iframe.loading = "lazy";
  iframe.allow = "geolocation";

  Object.assign(iframe.style, {
    width: "100%",
    height: "100%",
    border: "0",
    display: "block",
    background: "#ffffff",
  });

  modal.appendChild(iframe);
  overlay.appendChild(modal);
  root.appendChild(button);
  root.appendChild(overlay);
  document.body.appendChild(root);

  function openWidget() {
    overlay.style.display = "block";
    button.style.display = "none";
    document.documentElement.style.overflow = "hidden";
  }

  function closeWidget() {
    overlay.style.display = "none";
    button.style.display = "block";
    document.documentElement.style.overflow = "";
  }

  button.addEventListener("click", openWidget);

  overlay.addEventListener("click", function (event) {
    if (event.target === overlay) {
      closeWidget();
    }
  });

  window.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
      closeWidget();
    }
  });

  window.addEventListener("message", function (event) {
    if (event.data && event.data.type === "dispatch-ai-close-widget") {
      closeWidget();
    }
  });
})();