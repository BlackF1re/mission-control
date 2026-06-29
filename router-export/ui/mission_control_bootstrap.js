window.MISSION_CONTROL_BOOTSTRAP = window.MISSION_CONTROL_BOOTSTRAP || window.NIKKI_PANEL_BOOTSTRAP || {};
window.NIKKI_PANEL_BOOTSTRAP = window.NIKKI_PANEL_BOOTSTRAP || window.MISSION_CONTROL_BOOTSTRAP;

if (window.location?.protocol?.startsWith("http") && window.location?.hostname && window.location.port === "9090") {
  const bridgeBaseUrl = `${window.location.protocol}//${window.location.hostname}/cgi-bin/mission-control-bridge`;
  const controllerConfig = {
    ...(window.MISSION_CONTROL_BOOTSTRAP.controller || window.NIKKI_PANEL_BOOTSTRAP.controller || {}),
    mode: "real",
    baseUrl: bridgeBaseUrl,
    controllerBaseUrl: "",
    secret: "",
    bridgeManaged: true,
    useWebSocket: false,
  };
  window.MISSION_CONTROL_BOOTSTRAP.controller = controllerConfig;
  window.NIKKI_PANEL_BOOTSTRAP.controller = controllerConfig;
}

if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .getRegistrations()
    .then((registrations) => Promise.all(registrations.map((registration) => registration.unregister().catch(() => false))))
    .catch(() => {});
}

if ("caches" in window) {
  caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key).catch(() => false)))).catch(() => {});
}
