import { createMockBackend } from "./mission_control_mock_backend.js?v=__MISSION_CONTROL_VERSION__";
import { createMihomoBackend } from "./mission_control_mihomo_backend.js?v=__MISSION_CONTROL_VERSION__";

const CONTROLLER_STORAGE_KEY = "mission-control.controller.v1";
const LEGACY_CONTROLLER_STORAGE_KEY = "nikki-panel.controller.v1";
const BEARER_PREFIX_RE = /^(?:authorization\s*:\s*)?bearer\s+/i;

function isRouterHostedPanel() {
  try {
    const bootstrapController = window.MISSION_CONTROL_BOOTSTRAP?.controller || window.NIKKI_PANEL_BOOTSTRAP?.controller;
    if (bootstrapController?.bridgeManaged === true) {
      return true;
    }
    return Boolean(
      window.location?.protocol?.startsWith("http") &&
      window.location?.hostname &&
      window.location.port === "9090",
    );
  } catch {
    return false;
  }
}

function normalizeControllerSecret(value) {
  return String(value || "").trim().replace(BEARER_PREFIX_RE, "").trim();
}

const defaultControllerConfig = Object.freeze({
  mode: "mock",
  baseUrl: "",
  controllerBaseUrl: "",
  secret: "",
  selectorGroup: "GLOBAL",
  delayUrl: "https://www.gstatic.com/generate_204",
  delayTimeout: 5000,
  pollIntervalMs: 2000,
  useWebSocket: false,
  bridgeManaged: false,
});

function detectDefaultBridgeBaseUrl() {
  try {
    if (window.location?.protocol?.startsWith("http") && window.location?.hostname) {
      const portPart = window.location.port && window.location.port !== "80" && window.location.port !== "443" ? `:${window.location.port}` : "";
      if (isRouterHostedPanel()) {
        return `${window.location.protocol}//${window.location.hostname}/cgi-bin/mission-control-bridge`;
      }
      return `${window.location.protocol}//${window.location.hostname}${portPart}/cgi-bin/mission-control-bridge`;
    }
  } catch {
    // fall back to local desktop defaults
  }
  return "http://127.0.0.1/cgi-bin/mission-control-bridge";
}

function detectDefaultControllerMode() {
  if (isRouterHostedPanel()) {
    return "real";
  }
  return "mock";
}

function detectDefaultControllerBaseUrl() {
  if (isRouterHostedPanel()) {
    return window.location.origin;
  }
  return "http://127.0.0.1:9090";
}

function readControllerBootstrap() {
  const controller = window.MISSION_CONTROL_BOOTSTRAP?.controller || window.NIKKI_PANEL_BOOTSTRAP?.controller;
  return controller && typeof controller === "object" ? controller : {};
}

function runtimeControllerDefaults() {
  return {
    ...defaultControllerConfig,
    mode: detectDefaultControllerMode(),
    ...readControllerBootstrap(),
  };
}

function normalizeControllerConfig(input = {}) {
  const defaults = runtimeControllerDefaults();
  const source = input && typeof input === "object" ? input : {};
  const mode = source.mode === "real" ? "real" : defaults.mode === "real" ? "real" : "mock";
  const bridgeBaseUrl = detectDefaultBridgeBaseUrl();
  const rawBaseUrl = String(source.baseUrl || defaults.baseUrl || detectDefaultControllerBaseUrl()).trim().replace(/\/+$/, "");
  const prefersBridgeOnlyController =
    mode === "real" && (isRouterHostedPanel() || source.bridgeManaged || defaults.bridgeManaged);
  const hasExplicitControllerBaseUrl = Object.prototype.hasOwnProperty.call(source, "controllerBaseUrl");
  const hasDefaultControllerBaseUrl = Object.prototype.hasOwnProperty.call(defaults, "controllerBaseUrl");
  const controllerBaseCandidate = hasExplicitControllerBaseUrl
    ? source.controllerBaseUrl
    : hasDefaultControllerBaseUrl
      ? defaults.controllerBaseUrl
      : undefined;
  const rawControllerBaseUrl =
    controllerBaseCandidate === ""
      ? prefersBridgeOnlyController
        ? ""
        : String(detectDefaultControllerBaseUrl()).trim().replace(/\/+$/, "")
      : String(controllerBaseCandidate || (prefersBridgeOnlyController ? "" : detectDefaultControllerBaseUrl())).trim().replace(/\/+$/, "");
  const sameOriginBaseUrl = (() => {
    try {
      return rawBaseUrl === window.location?.origin?.replace?.(/\/+$/, "");
    } catch {
      return false;
    }
  })();
  const shouldUpgradeToBridge =
    mode === "real" &&
    (isRouterHostedPanel() || source.bridgeManaged || defaults.bridgeManaged || sameOriginBaseUrl);
  const baseUrl = (shouldUpgradeToBridge ? bridgeBaseUrl : rawBaseUrl) || detectDefaultControllerBaseUrl();
  const controllerBaseUrl =
    rawControllerBaseUrl === ""
      ? ""
      : rawControllerBaseUrl || rawBaseUrl || detectDefaultControllerBaseUrl();
  const selectorGroup = String(source.selectorGroup || defaults.selectorGroup || defaultControllerConfig.selectorGroup).trim() || defaultControllerConfig.selectorGroup;
  const delayUrl = String(source.delayUrl || defaults.delayUrl || defaultControllerConfig.delayUrl).trim() || defaultControllerConfig.delayUrl;
  const delayTimeout = Math.max(1000, Math.min(30000, Number(source.delayTimeout) || Number(defaults.delayTimeout) || defaultControllerConfig.delayTimeout));
  const pollIntervalMs = Math.max(1000, Math.min(60000, Number(source.pollIntervalMs) || Number(defaults.pollIntervalMs) || defaultControllerConfig.pollIntervalMs));
  const bridgeManaged = Boolean(source.bridgeManaged || defaults.bridgeManaged || shouldUpgradeToBridge);
  const normalizedSecret = normalizeControllerSecret(source.secret || defaults.secret);
  const directControllerAvailable = controllerBaseUrl !== "";
  return {
    ...defaults,
    ...source,
    mode,
    baseUrl,
    controllerBaseUrl,
    selectorGroup,
    delayUrl,
    delayTimeout,
    pollIntervalMs,
    secret: bridgeManaged && !directControllerAvailable ? "" : normalizedSecret,
    useWebSocket: bridgeManaged && !directControllerAvailable ? false : Boolean(source.useWebSocket ?? defaults.useWebSocket),
    bridgeManaged,
  };
}

function readControllerConfig() {
  if (isRouterHostedPanel()) {
    return normalizeControllerConfig(runtimeControllerDefaults());
  }
  try {
    const raw =
      window.localStorage?.getItem(CONTROLLER_STORAGE_KEY) ??
      window.localStorage?.getItem(LEGACY_CONTROLLER_STORAGE_KEY);
    return normalizeControllerConfig(raw ? JSON.parse(raw) : runtimeControllerDefaults());
  } catch {
    return normalizeControllerConfig(runtimeControllerDefaults());
  }
}

function persistControllerConfig(config) {
  if (isRouterHostedPanel() && config.mode === "real" && config.bridgeManaged) {
    try {
      window.localStorage?.removeItem(CONTROLLER_STORAGE_KEY);
      window.localStorage?.removeItem(LEGACY_CONTROLLER_STORAGE_KEY);
    } catch {
      // ignore storage failures
    }
    return;
  }
  try {
    window.localStorage?.setItem(CONTROLLER_STORAGE_KEY, JSON.stringify(config));
  } catch {
    // The panel must stay usable even if storage is blocked.
  }
}

function publicControllerConfig(config) {
  return {
    mode: config.mode,
    baseUrl: config.baseUrl,
    controllerBaseUrl: config.controllerBaseUrl,
    secret: config.secret,
    hasSecret: Boolean(config.secret),
    selectorGroup: config.selectorGroup,
    delayUrl: config.delayUrl,
    delayTimeout: config.delayTimeout,
    pollIntervalMs: config.pollIntervalMs,
    useWebSocket: config.useWebSocket,
    bridgeManaged: config.bridgeManaged,
  };
}

function decorateSnapshot(snapshot, config) {
  return {
    ...snapshot,
    controller: publicControllerConfig(config),
  };
}

export function createBackend() {
  const outerListeners = new Set();
  let controllerConfig = readControllerConfig();
  persistControllerConfig(controllerConfig);
  let inner = null;
  let innerUnsubscribe = null;
  let lastSnapshot = null;

  function emit(snapshot) {
    lastSnapshot = decorateSnapshot(snapshot, controllerConfig);
    outerListeners.forEach((listener) => listener(lastSnapshot));
  }

  function createInner() {
    return controllerConfig.mode === "real"
      ? createMihomoBackend(controllerConfig)
      : createMockBackend();
  }

  function attachInner() {
    if (innerUnsubscribe) {
      innerUnsubscribe();
      innerUnsubscribe = null;
    }
    inner?.destroy?.();
    inner = createInner();
    innerUnsubscribe = inner.subscribe((snapshot) => {
      if (snapshot?.controller && typeof snapshot.controller === "object") {
        controllerConfig = normalizeControllerConfig({ ...controllerConfig, ...snapshot.controller });
        persistControllerConfig(controllerConfig);
      }
      emit(snapshot);
    });
  }

  function setControllerConfig(patch, options = {}) {
    const next = normalizeControllerConfig({ ...controllerConfig, ...patch });
    const modeChanged = next.mode !== controllerConfig.mode;
    const needsRealReconfigure = next.mode === "real" && JSON.stringify(next) !== JSON.stringify(controllerConfig);
    controllerConfig = next;
    persistControllerConfig(controllerConfig);

    if (modeChanged) {
      attachInner();
      return;
    }

    if (needsRealReconfigure && inner?.configure) {
      inner.configure(controllerConfig);
    }

    if (options.persistRemote !== false && controllerConfig.mode === "real" && typeof inner?.updateControllerConfig === "function") {
      Promise.resolve(inner.updateControllerConfig(patch)).catch(() => {});
    }

    if (lastSnapshot) {
      emit(lastSnapshot);
    }
  }

  attachInner();

  const facade = {
    subscribe(listener) {
      outerListeners.add(listener);
      if (lastSnapshot) {
        listener(lastSnapshot);
      }
      return () => outerListeners.delete(listener);
    },
    destroy() {
      if (innerUnsubscribe) {
        innerUnsubscribe();
      }
      inner?.destroy?.();
      outerListeners.clear();
    },
    setControllerMode(mode) {
      setControllerConfig({ mode });
    },
    updateControllerConfig(patch) {
      setControllerConfig(patch);
    },
    testController() {
      return inner?.testController?.();
    },
    refreshNow() {
      return inner?.refreshNow?.();
    },
  };

  const proxiedMethods = [
    "setTheme",
    "setLanguage",
    "setDensity",
    "setScale",
    "setAnimations",
    "setAutoRefresh",
    "setGraphRange",
    "setChartLineWidth",
    "setSpeedUnitMode",
    "setStorageUnitSystem",
    "setMihomoMemoryLimit",
    "setRoutingMode",
    "setTunnelPreference",
    "setManualServer",
    "checkMissionControlUpdates",
    "applyMissionControlUpdate",
    "updateAutomation",
    "updateAutoSelection",
    "toggleBlockedCountry",
    "setAllowUnknownEgress",
    "updateBase",
    "syncBase",
    "addBase",
    "removeBase",
    "addBaseEntry",
    "removeBaseEntry",
    "updateRule",
    "addRule",
    "removeRule",
    "toggleRuleBase",
    "closeConnection",
    "closeConnections",
    "clearClosedConnections",
    "setConnectionsPaused",
    "addSubscription",
    "updateSubscription",
    "removeSubscription",
    "runRouteProbe",
    "runRuleProbe",
    "runDnsProbe",
    "runLatencyProbe",
    "runDiagnostics",
    "triggerAction",
  ];

  proxiedMethods.forEach((method) => {
    facade[method] = (...args) => inner?.[method]?.(...args);
  });

  return facade;
}
