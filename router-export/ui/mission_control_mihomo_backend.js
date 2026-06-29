import { createState, deriveSnapshot } from "./mission_control_mock_backend.js?v=__MISSION_CONTROL_VERSION__";

const BUILTIN_PROXIES = new Set(["DIRECT", "REJECT", "REJECT-DROP", "PASS", "PASS-RULE", "COMPATIBLE"]);
const GROUP_TYPES = new Set(["Selector", "URLTest", "Fallback", "LoadBalance", "LoadBalanceStrategy", "Relay"]);
const ROUTER_GROUPS = Object.freeze({
  global: "GLOBAL",
  blocked: "BLOCKED SITES",
  auto: "AUTO BEST",
  manual: "MANUAL SERVER",
});
const MISSION_CONTROL_API = Object.freeze({
  state: "/mission-control/state",
  connections: "/mission-control/connections",
  memory: "/mission-control/memory",
  traffic: "/mission-control/traffic",
  actions: "/mission-control/actions",
});
const SERVICE_PROVIDER_IDS = new Set([
  ROUTER_GROUPS.global,
  ROUTER_GROUPS.blocked,
  ROUTER_GROUPS.auto,
  ROUTER_GROUPS.manual,
]);
const LIVE_EGRESS_POLICY = Object.freeze({
  blockedCountries: ["RU"],
  allowUnknown: false,
});
const PANEL_ACTION_TIMEOUT_MS = Object.freeze({
  addSubscription: 30000,
  updateSubscription: 30000,
  removeSubscription: 30000,
  updateMihomoMemoryLimit: 70000,
  refreshSubscriptions: 30000,
  reprocessSubscriptions: 30000,
  checkMissionControlUpdates: 70000,
  applyMissionControlUpdate: 180000,
});
const CONNECTIONS_REFRESH_INTERVAL_MS = 2000;
const PANEL_STATE_BOOTSTRAP_WAIT_MS = 1500;
const LIVE_SNAPSHOT_STORAGE_KEY = "mission-control.live.snapshot.v1";
const LEGACY_LIVE_SNAPSHOT_STORAGE_KEY = "nikki-panel.live.snapshot.v1";
const LIVE_SNAPSHOT_WINDOW_NAME_PREFIX = "__mission_control_snapshot__:";
const LEGACY_LIVE_SNAPSHOT_WINDOW_NAME_PREFIX = "__nikki_panel_snapshot__:";
const SKIPPED_REQUEST_RESULT = Object.freeze({ status: "skipped" });

function isHostedLivePanel() {
  try {
    const controller = window.MISSION_CONTROL_BOOTSTRAP?.controller || window.NIKKI_PANEL_BOOTSTRAP?.controller;
    if (controller?.bridgeManaged === true) {
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
const LIVE_PANEL_SETTINGS_DEFAULTS = Object.freeze({
  theme: "graphite",
  density: "comfortable",
  scale: 100,
  animations: true,
  autoRefresh: true,
  graphRange: 30,
  chartLineWidth: 3,
  speedUnitMode: "bits",
  storageUnitSystem: "binary",
  language: "ru",
  mihomoMemoryLimitMiB: 0,
  mihomoMemoryLimitMaxMiB: 512,
});
const FRIENDLY_BASE_NAMES = Object.freeze({
  "DIRECT-DOMAINS": "Direct domains",
  "DIRECT-IP": "Direct IPs",
  "PROXY-DOMAINS": "Manual proxy domains",
  "PROXY-IP": "Manual proxy IPs",
  "RU-BLOCKED-DOMAINS": "RU blocked domains",
  "RU-BLOCKED-IP": "RU blocked IPs",
});
const COUNTRY_HINTS = Object.freeze([
  ["????????", "US"],
  ["USA", "US"],
  ["UNITED STATES", "US"],
  ["??????", "US"],
  ["????????", "TR"],
  ["TURKEY", "TR"],
  ["????????", "TR"],
  ["????????", "FI"],
  ["FINLAND", "FI"],
  ["????????", "FI"],
  ["????????", "DE"],
  ["GERMANY", "DE"],
  ["????????", "DE"],
  ["????????", "NL"],
  ["NETHERLANDS", "NL"],
  ["????????????", "NL"],
  ["????????", "RU"],
  ["RUSSIA", "RU"],
  ["????????", "RU"],
]);

function nowIso() {
  return new Date().toISOString();
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function normalizeCountryCode(value, fallback = "??") {
  const code = safeString(value, "").toUpperCase();
  return /^[A-Z]{2}$/.test(code) ? code : fallback;
}

function normalizeInventoryReason(value) {
  const reason = safeString(value, "");
  return reason === "egress-country" || reason === "unknown-egress" ? reason : null;
}

function encodePathPart(value) {
  return encodeURIComponent(String(value));
}

function sleep(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function panelActionTimeout(action, fallback = 30000) {
  return PANEL_ACTION_TIMEOUT_MS[action] || fallback;
}

function normalizeRequestError(error, timeoutMs) {
  const message = error?.message || String(error || "");
  if (error?.name === "AbortError" || /aborted/i.test(message)) {
    return new Error(`Request timed out after ${Math.max(1, Math.round(timeoutMs / 1000))} seconds.`);
  }
  return error instanceof Error ? error : new Error(message);
}

function schedulerJob(snapshot, jobId) {
  return snapshot?.automation?.scheduler?.jobs?.[jobId] || null;
}

function isIpv4Address(value) {
  if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(String(value || ""))) {
    return false;
  }
  return String(value)
    .split(".")
    .every((part) => Number(part) >= 0 && Number(part) <= 255);
}

function normalizeProbeAddress(value) {
  const raw = String(value || "").trim();
  if (!raw) {
    return null;
  }

  try {
    const url = new URL(/^[a-z]+:\/\//i.test(raw) ? raw : `https://${raw}`);
    const host = safeString(url.hostname, "").toLowerCase();
    if (!host) {
      return null;
    }
    return {
      raw,
      host,
      kind: isIpv4Address(host) ? "ip" : "domain",
    };
  } catch {
    const host = raw
      .replace(/^\[|\]$/g, "")
      .replace(/\/.*$/, "")
      .replace(/:\d+$/, "")
      .trim()
      .toLowerCase();
    if (!host) {
      return null;
    }
    return {
      raw,
      host,
      kind: isIpv4Address(host) ? "ip" : "domain",
    };
  }
}

function lastDelay(history) {
  const items = Array.isArray(history) ? history : [];
  for (let index = items.length - 1; index >= 0; index -= 1) {
    const delay = Number(items[index]?.delay ?? items[index]?.Delay ?? items[index]);
    if (Number.isFinite(delay) && delay > 0) {
      return Math.round(delay);
    }
  }
  return 0;
}

function delayTrend(history, fallbackDelay) {
  const delays = (Array.isArray(history) ? history : [])
    .map((item) => Number(item?.delay ?? item?.Delay ?? item))
    .filter((value) => Number.isFinite(value) && value > 0)
    .slice(-18)
    .map((value) => Math.round(value));
  if (delays.length) {
    return delays;
  }
  return Array.from({ length: 18 }, () => fallbackDelay || 0);
}

function proxyType(proxy) {
  return safeString(proxy?.type || proxy?.Type || proxy?.proto || proxy?.protocol, "Unknown");
}

function isGroupProxy(proxy) {
  return Array.isArray(proxy?.all) || GROUP_TYPES.has(proxyType(proxy));
}

function normalizeMode(mode) {
  if (mode === "direct") {
    return "direct";
  }
  if (mode === "global") {
    return "global";
  }
  return "smart";
}

function mihomoMode(mode) {
  if (mode === "direct") {
    return "direct";
  }
  if (mode === "global") {
    return "global";
  }
  return "rule";
}

function scoreFromDelay(delay, alive) {
  if (!alive) {
    return 1;
  }
  if (!delay) {
    return 55;
  }
  return Math.round(clamp(100 - delay / 18, 20, 99));
}

function humanHost(metadata = {}) {
  const host = metadata.host || metadata.destinationIP || metadata.dstIP || metadata.destination || metadata.remoteDestination;
  const port = metadata.destinationPort || metadata.dstPort || metadata.port;
  return port ? `${host}:${port}` : safeString(host, "unknown");
}

function sourceLabel(metadata = {}) {
  const source = metadata.sourceIP || metadata.srcIP || metadata.source || metadata.clientIP || "unknown";
  const port = metadata.sourcePort || metadata.srcPort;
  return port ? `${source}:${port}` : source;
}

function memoryToMiB(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) {
    return 0;
  }
  return number >= 1024 * 1024 ? number / 1024 / 1024 : number / 1024;
}

function memorySampleToMiB(sample, keys) {
  if (!sample || typeof sample !== "object") {
    return null;
  }
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(sample, key) && sample[key] !== null) {
      return memoryToMiB(sample[key]);
    }
  }
  return null;
}

function isDirectConnectionChain(chains) {
  const leaf = Array.isArray(chains) && chains.length ? safeString(chains[0], "").toUpperCase() : "";
  return !leaf || leaf === "DIRECT" || leaf === "COMPATIBLE" || leaf === "PASS";
}

function normalizeBoolean(value, fallback) {
  return typeof value === "boolean" ? value : fallback;
}

function normalizePanelSettings(settings, fallback = LIVE_PANEL_SETTINGS_DEFAULTS) {
  const source = settings && typeof settings === "object" ? settings : {};
  const maxMemoryLimit = Math.max(128, Number(source.mihomoMemoryLimitMaxMiB) || fallback.mihomoMemoryLimitMaxMiB || 512);
  return {
    theme: ["graphite", "pearl", "cobalt", "ember", "sage", "noir"].includes(source.theme) ? source.theme : fallback.theme,
    density: source.density === "compact" ? "compact" : fallback.density,
    scale: Math.max(80, Math.min(130, Number(source.scale) || fallback.scale)),
    animations: normalizeBoolean(source.animations, fallback.animations),
    autoRefresh: normalizeBoolean(source.autoRefresh, fallback.autoRefresh),
    graphRange: Math.max(1, Math.min(60, Number(source.graphRange) || fallback.graphRange)),
    chartLineWidth: Math.max(1, Math.min(8, Number(source.chartLineWidth) || fallback.chartLineWidth)),
    speedUnitMode: source.speedUnitMode === "bytes" ? "bytes" : fallback.speedUnitMode,
    storageUnitSystem: source.storageUnitSystem === "decimal" ? "decimal" : fallback.storageUnitSystem,
    language: source.language === "en" ? "en" : fallback.language,
    mihomoMemoryLimitMiB: Math.max(0, Math.min(maxMemoryLimit, Number(source.mihomoMemoryLimitMiB) || 0)),
    mihomoMemoryLimitMaxMiB: maxMemoryLimit,
  };
}

function extractControllerPreferencePatch(patch = {}) {
  const source = patch && typeof patch === "object" ? patch : {};
  const next = {};
  if (Object.prototype.hasOwnProperty.call(source, "selectorGroup")) {
    next.selectorGroup = safeString(source.selectorGroup, "GLOBAL");
  }
  if (Object.prototype.hasOwnProperty.call(source, "delayUrl")) {
    next.delayUrl = safeString(source.delayUrl, "https://www.gstatic.com/generate_204");
  }
  if (Object.prototype.hasOwnProperty.call(source, "delayTimeout")) {
    next.delayTimeout = Math.max(1000, Math.min(30000, Number(source.delayTimeout) || 5000));
  }
  if (Object.prototype.hasOwnProperty.call(source, "pollIntervalMs")) {
    next.pollIntervalMs = Math.max(1000, Math.min(60000, Number(source.pollIntervalMs) || 2000));
  }
  if (Object.prototype.hasOwnProperty.call(source, "useWebSocket")) {
    next.useWebSocket = Boolean(source.useWebSocket);
  }
  return next;
}

function readCachedSnapshot() {
  if (isHostedLivePanel()) {
    return null;
  }
  try {
    const raw =
      window.localStorage?.getItem?.(LIVE_SNAPSHOT_STORAGE_KEY) ||
      window.localStorage?.getItem?.(LEGACY_LIVE_SNAPSHOT_STORAGE_KEY) ||
      (typeof window.name === "string" && window.name.startsWith(LIVE_SNAPSHOT_WINDOW_NAME_PREFIX)
        ? window.name.slice(LIVE_SNAPSHOT_WINDOW_NAME_PREFIX.length)
        : typeof window.name === "string" && window.name.startsWith(LEGACY_LIVE_SNAPSHOT_WINDOW_NAME_PREFIX)
          ? window.name.slice(LEGACY_LIVE_SNAPSHOT_WINDOW_NAME_PREFIX.length)
        : "");
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function persistCachedSnapshot(snapshot) {
  if (isHostedLivePanel()) {
    return;
  }
  try {
    const encoded = JSON.stringify(snapshot);
    window.localStorage?.setItem?.(LIVE_SNAPSHOT_STORAGE_KEY, encoded);
    window.name = `${LIVE_SNAPSHOT_WINDOW_NAME_PREFIX}${encoded}`;
  } catch {
    // ignore storage failures
  }
}

function snapshotQuality(snapshot) {
  const nodes = Array.isArray(snapshot?.nodes) ? snapshot.nodes : [];
  let score = 0;
  if (nodes.length) {
    score += 1;
  }
  if (Number(snapshot?.health?.memoryMiB) > 0) {
    score += 1;
  }
  if (nodes.some((node) => Number(node?.latency) > 0 && Number(node?.latency) < 999)) {
    score += 2;
  }
  if (nodes.some((node) => safeString(node?.subscriptionName || node?.provider, "").toLowerCase() !== "merged pool")) {
    score += 2;
  }
  if (Array.isArray(snapshot?.subscriptions?.items) && snapshot.subscriptions.items.length) {
    score += 1;
  }
  if (Array.isArray(snapshot?.ruleEngine?.bases) && snapshot.ruleEngine.bases.length) {
    score += 1;
  }
  return score;
}

function inferCountryCode(value) {
  const haystack = String(value || "").toUpperCase();
  for (const [hint, code] of COUNTRY_HINTS) {
    if (haystack.includes(hint)) {
      return code;
    }
  }
  return "??";
}

function baseScopeFromId(id) {
  return String(id || "").toUpperCase().startsWith("DIRECT") ? "direct" : "proxy";
}

function baseKindFromId(id) {
  return String(id || "").toUpperCase().includes("IP") ? "ips" : "domains";
}

function friendlyBaseName(id) {
  return FRIENDLY_BASE_NAMES[id] || id;
}

function isLocalRuleProvider(provider) {
  return String(provider?.path || "").startsWith("/");
}

function extractDnsAnswers(payload) {
  const answers = Array.isArray(payload?.Answer)
    ? payload.Answer
    : Array.isArray(payload?.answer)
      ? payload.answer
      : Array.isArray(payload?.answers)
        ? payload.answers
        : Array.isArray(payload?.data)
          ? payload.data
          : Array.isArray(payload?.addresses)
            ? payload.addresses
            : [];
  return answers
    .map((answer) => {
      if (typeof answer === "string") {
        return answer;
      }
      return answer?.data || answer?.Data || answer?.value || answer?.Value || "";
    })
    .map((answer) => safeString(answer, ""))
    .filter(Boolean);
}

class MihomoClient {
  constructor(config) {
    this.configure(config);
  }

  configure(config) {
    this.config = {
      ...config,
      baseUrl: String(config.baseUrl || "http://127.0.0.1:9090").replace(/\/+$/, ""),
      controllerBaseUrl: String(config.controllerBaseUrl || "").replace(/\/+$/, ""),
    };
  }

  isMissionControlPath(path) {
    return String(path || "").startsWith("/mission-control/");
  }

  usesBridge(path, method = "GET") {
    const normalizedMethod = String(method || "GET").toUpperCase();
    const mutatesRuntime = ["PATCH", "PUT", "POST", "DELETE"].includes(normalizedMethod);
    return this.isMissionControlPath(path) || (this.config.bridgeManaged && (!this.config.controllerBaseUrl || mutatesRuntime));
  }

  resolveBaseUrl(path, method = "GET") {
    if (this.usesBridge(path, method)) {
      return this.config.baseUrl;
    }
    return this.config.controllerBaseUrl || this.config.baseUrl;
  }

  url(path, params, method = "GET") {
    const base = `${this.resolveBaseUrl(path, method)}${path}`;
    if (!params) {
      return base;
    }
    const search = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        search.set(key, String(value));
      }
    });
    const suffix = search.toString();
    return suffix ? `${base}?${suffix}` : base;
  }

  wsUrl(path, params) {
    const url = new URL(this.url(path, params));
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    if (this.config.secret) {
      url.searchParams.set("token", this.config.secret);
    }
    return url.toString();
  }

  async request(path, options = {}) {
    const controller = new AbortController();
    const timeoutMs = Number(options.timeout) > 0 ? Number(options.timeout) : 9000;
    const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
    const headers = new Headers(options.headers || {});
    if (this.config.secret) {
      headers.set("Authorization", `Bearer ${this.config.secret}`);
    }
    if (options.body !== undefined && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    try {
      const method = options.method || "GET";
      const response = await fetch(this.url(path, options.params, method), {
        method,
        headers,
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
        signal: controller.signal,
        cache: "no-store",
      });
      const text = await response.text();
      let payload = null;
      if (text) {
        try {
          payload = JSON.parse(text);
        } catch {
          payload = text;
        }
      }
      if (!response.ok) {
        const message = payload?.message || payload?.error || text || `${response.status} ${response.statusText}`;
        throw new Error(message);
      }
      return payload;
    } catch (error) {
      throw normalizeRequestError(error, timeoutMs);
    } finally {
      window.clearTimeout(timeout);
    }
  }

  get(path, params, options = {}) {
    return this.request(path, { ...options, params });
  }

  post(path, body, params, options = {}) {
    return this.request(path, { ...options, method: "POST", body: body ?? {}, params });
  }

  put(path, body, params, options = {}) {
    return this.request(path, { ...options, method: "PUT", body: body ?? {}, params });
  }

  patch(path, body, params, options = {}) {
    return this.request(path, { ...options, method: "PATCH", body: body ?? {}, params });
  }

  delete(path, params, options = {}) {
    return this.request(path, { ...options, method: "DELETE", params });
  }
}

function makeActionFlags() {
  return {
    refreshSubscriptions: false,
    retestServers: false,
    updateLists: false,
    restartTunnel: false,
    reprocessSubscriptions: false,
  };
}

export function createMihomoBackend(initialConfig) {
  const listeners = new Set();
  const client = new MihomoClient(initialConfig);
  let config = { ...initialConfig };
  let destroyed = false;
  let pollId = null;
  let refreshInFlight = false;
  let connectionsRefreshInFlight = false;
  let lastConnectionsRefreshAt = 0;
  let trafficSocket = null;
  let connectionsSocket = null;
  let memorySocket = null;
  let logsSocket = null;
  let previousConnections = new Map();
  let previousConnectionTotals = null;
  let consecutiveRefreshFailures = 0;
  const cachedSnapshot = readCachedSnapshot();
  let lastSnapshot = cachedSnapshot;
  let lastPersistedSnapshot = cachedSnapshot;
  let lastPanelState = cachedSnapshot;
  let state = createState();
  state.settings = { ...LIVE_PANEL_SETTINGS_DEFAULTS };
  let liveContext = {
    rawMode: "rule",
    mode: "smart",
    blockedSelection: ROUTER_GROUPS.auto,
    blockedTarget: "auto",
    autoSelection: "",
    manualSelection: "DIRECT",
    manualServerId: "",
    globalSelection: "DIRECT",
    proxyListNames: [],
    directListNames: [],
    runtimeNodeCount: 0,
    hasGlobalGroup: false,
    hasBlockedGroup: false,
    hasManualGroup: false,
    hasAutoGroup: false,
  };

  state.meta = {
    ...state.meta,
    mockMode: false,
    panelVersion: "0.5-mihomo-live",
    backend: "mihomo",
    updatedAt: nowIso(),
  };
  state.actions = makeActionFlags();
  state.events = [];
  state.nodes = [];
  state.subscriptions.items = [];
  state.subscriptions.egressPolicy = { ...LIVE_EGRESS_POLICY };
  state.ruleEngine.bases = [];
  state.ruleEngine.rules = [];
  state.connections.items = [];
  state.health = {
    ...state.health,
    tunnelState: "issue",
    apiState: "connecting",
    activeConnections: 0,
    memoryMiB: 0,
    memoryBudgetMiB: 0,
    downloadMbps: 0,
    uploadMbps: 0,
    trafficScope: client.usesBridge(MISSION_CONTROL_API.traffic) ? "tunnel" : "total",
    blockedHitsPerMin: 0,
    directHitsPerMin: 0,
    unresolvedCount: 0,
  };
  state.graphs.throughputDown = [];
  state.graphs.throughputUp = [];
  state.graphs.latencyAverage = [];
  state.graphs.blockedHits = [];

  function liveRequestTimeout(path) {
    const usesBridge = client.usesBridge(path);
    if (path === MISSION_CONTROL_API.state) {
      return usesBridge ? 20000 : 12000;
    }
    if (path === "/connections") {
      return usesBridge ? 25000 : 5000;
    }
    if (path === "/memory") {
      return usesBridge ? 12000 : 4000;
    }
    if (path === MISSION_CONTROL_API.traffic) {
      return usesBridge ? 12000 : 4000;
    }
    return usesBridge ? 20000 : 5000;
  }

  function connectionRequestPath() {
    return "/connections";
  }

  function trafficRequestPath() {
    return client.usesBridge(MISSION_CONTROL_API.traffic) ? MISSION_CONTROL_API.traffic : "/traffic";
  }

  function settleRequest(label, promise, timeoutMs) {
    const limitMs = Math.max(1000, Number(timeoutMs) || 1000);
    return new Promise((resolve) => {
      let settled = false;
      const timer = window.setTimeout(() => {
        if (settled) {
          return;
        }
        settled = true;
        resolve({
          status: "rejected",
          reason: new Error(`${label} timed out after ${limitMs} ms`),
        });
      }, limitMs);

      Promise.resolve(promise)
        .then((value) => {
          if (settled) {
            return;
          }
          settled = true;
          window.clearTimeout(timer);
          resolve({ status: "fulfilled", value });
        })
        .catch((reason) => {
          if (settled) {
            return;
          }
          settled = true;
          window.clearTimeout(timer);
          resolve({ status: "rejected", reason });
        });
    });
  }

  function addEvent(level, kind, data = {}) {
    state.events.unshift({ at: nowIso(), level, kind, data });
    state.events = state.events.slice(0, 48);
  }

  function findNodeByName(nodes, name) {
    const target = safeString(name, "");
    if (!target) {
      return null;
    }
    return nodes.find((node) => node.id === target || node.label === target) || null;
  }

  function representativeRule(action) {
    const preferredTarget = action === "PROXY" ? ROUTER_GROUPS.blocked : "DIRECT";
    return (
      state.ruleEngine.rules.find((rule) => rule.enabled && rule.action === action && rule.target === preferredTarget) ||
      state.ruleEngine.rules.find((rule) => rule.enabled && rule.action === action && rule.baseIds?.length) ||
      state.ruleEngine.rules.find((rule) => rule.enabled && rule.action === action) ||
      null
    );
  }

  function scopeBaseNames(scope, kind) {
    return state.ruleEngine.bases
      .filter((base) => base.enabled && base.scope === scope && (!kind || base.kind === kind))
      .map((base) => base.name);
  }

  function resolveLiveNodes(snapshot) {
    const eligibleNodes = snapshot?.derived?.eligibleNodes || snapshot?.nodes || [];
    const autoNode = findNodeByName(eligibleNodes, liveContext.autoSelection) || findNodeByName(snapshot.nodes || [], liveContext.autoSelection) || snapshot?.derived?.bestAutoNode || null;
    const manualNode =
      findNodeByName(eligibleNodes, liveContext.manualSelection) ||
      findNodeByName(snapshot.nodes || [], liveContext.manualSelection) ||
      findNodeByName(eligibleNodes, liveContext.manualServerId) ||
      findNodeByName(snapshot.nodes || [], liveContext.manualServerId) ||
      null;

    let blockedNode = null;
    if (liveContext.blockedTarget === "manual") {
      blockedNode = manualNode || autoNode;
    } else if (liveContext.blockedTarget === "auto") {
      blockedNode = autoNode || manualNode;
    }

    let globalNode = null;
    if (liveContext.globalSelection === ROUTER_GROUPS.blocked) {
      globalNode = blockedNode;
    } else if (liveContext.globalSelection === ROUTER_GROUPS.auto) {
      globalNode = autoNode || blockedNode;
    } else if (liveContext.globalSelection === ROUTER_GROUPS.manual) {
      globalNode = manualNode || blockedNode || autoNode;
    } else if (liveContext.globalSelection && liveContext.globalSelection !== "DIRECT") {
      globalNode = findNodeByName(eligibleNodes, liveContext.globalSelection) || findNodeByName(snapshot.nodes || [], liveContext.globalSelection) || blockedNode || autoNode;
    }

    const activeProxy = liveContext.mode === "direct" ? null : liveContext.mode === "global" ? globalNode : blockedNode;
    return {
      autoNode,
      manualNode,
      blockedNode,
      globalNode,
      activeProxy,
    };
  }

  function snapshotWithLiveContext() {
    const snapshot = deriveSnapshot(state);
    const liveNodes = resolveLiveNodes(snapshot);
    return {
      ...snapshot,
      meta: {
        ...snapshot.meta,
        liveContext: {
          ...liveContext,
        },
      },
      health: {
        ...snapshot.health,
        tunnelState: snapshot.health.apiState === "connected" && (liveContext.runtimeNodeCount > 0 || liveContext.mode === "direct") ? "healthy" : "issue",
      },
      routing: {
        ...snapshot.routing,
        mode: liveContext.mode,
        blockedTrafficTarget: liveContext.blockedTarget,
        manualServerId: liveContext.manualServerId || snapshot.routing.manualServerId,
        proxyLists: liveContext.proxyListNames.length ? [...liveContext.proxyListNames] : snapshot.routing.proxyLists,
        directOverrides: liveContext.directListNames.length ? [...liveContext.directListNames] : snapshot.routing.directOverrides,
        autoSelection: {
          ...snapshot.routing.autoSelection,
          metric: state.routing.autoSelection.metric,
          currentNodeId: liveNodes.autoNode?.id || "",
        },
      },
      subscriptions: {
        ...snapshot.subscriptions,
        egressPolicy: {
          ...snapshot.subscriptions.egressPolicy,
          blockedCountries: [...state.subscriptions.egressPolicy.blockedCountries],
          allowUnknown: state.subscriptions.egressPolicy.allowUnknown,
        },
      },
      derived: {
        ...snapshot.derived,
        activeProxy: liveNodes.activeProxy,
        bestAutoNode: liveNodes.autoNode || snapshot.derived.bestAutoNode,
      },
    };
  }

  function emit() {
    if (destroyed) {
      return;
    }
    state.meta.updatedAt = nowIso();
    const snapshot = snapshotWithLiveContext();
    lastSnapshot = snapshot;
    if (snapshotQuality(snapshot) >= snapshotQuality(lastPersistedSnapshot)) {
      persistCachedSnapshot(snapshot);
      lastPersistedSnapshot = snapshot;
    }
    listeners.forEach((listener) => listener(snapshot));
  }

  function markApiError(error, kind = "api-error") {
    consecutiveRefreshFailures += 1;
    const hasUsableLiveState =
      Boolean(lastSnapshot?.nodes?.length) ||
      Boolean(state.nodes.length) ||
      liveContext.runtimeNodeCount > 0 ||
      state.routing.mode === "direct";
    if (!hasUsableLiveState || consecutiveRefreshFailures >= 3) {
      state.health.apiState = "failed";
      state.health.tunnelState = "issue";
    }
    console.error("[mission-control]", kind, error);
    addEvent("error", kind, { message: error?.message || String(error) });
    emit();
  }

  function setAction(action, value) {
    state.actions[action] = value;
    emit();
  }

  function markUnsupported(feature, message) {
    addEvent("error", "unsupported", { feature, message });
    emit();
  }

  function applyResolvedState(results, panelState, reason, options = {}) {
    const effectivePanelState = panelState || lastPanelState;
    const { version, configs, proxies, providers, rules, ruleProviders } = results;
    const proxyMap = proxies.status === "fulfilled" ? getProxyMap(proxies.value) : {};
    const providerMap = providers.status === "fulfilled" ? getProviderMap(providers.value) : {};
    const nodes = buildNodes(proxyMap, providerMap, effectivePanelState);
    const runtimeNodeCount = Object.entries(proxyMap).filter(([name, proxy]) => !BUILTIN_PROXIES.has(name) && !isGroupProxy(proxy)).length;
    const bases =
      effectivePanelState?.ruleEngine?.bases
        ? buildBases(null, effectivePanelState)
        : !effectivePanelState && state.ruleEngine.bases.length
          ? state.ruleEngine.bases
        : ruleProviders.status === "fulfilled"
          ? buildBases(ruleProviders.value, null)
          : state.ruleEngine.bases;
    const mode = configs.status === "fulfilled" ? safeString(configs.value?.mode, state.routing.mode) : state.routing.mode;
    const ruleList =
      effectivePanelState?.ruleEngine?.rules
        ? buildRules(null, bases, effectivePanelState)
        : !effectivePanelState && state.ruleEngine.rules.length
          ? state.ruleEngine.rules
        : rules.status === "fulfilled"
          ? buildRules(rules.value, bases, null)
          : state.ruleEngine.rules;
    const panelPolicy = normalizePanelPolicy(effectivePanelState?.subscriptions?.egressPolicy);
    const panelAutoSelection = effectivePanelState?.routing?.autoSelection && typeof effectivePanelState.routing.autoSelection === "object"
      ? effectivePanelState.routing.autoSelection
      : {};
    const panelSettings = normalizePanelSettings(effectivePanelState?.settings, state.settings);

    syncLiveContext(proxyMap, mode, nodes, bases, effectivePanelState);
    consecutiveRefreshFailures = 0;

    state.meta = {
      ...state.meta,
      version: version.status === "fulfilled" ? version.value?.version || version.value?.premium || JSON.stringify(version.value) : state.meta.version,
      backend: "mihomo",
    };
    state.health.apiState = options.panelSeed ? "connecting" : "connected";
    state.health.tunnelState =
      options.panelSeed
        ? (nodes.length || state.routing.mode === "direct" ? "healthy" : "issue")
        : (runtimeNodeCount || liveContext.mode === "direct" ? "healthy" : "issue");
    state.health.unresolvedCount = nodes.filter((node) => node.egressCountry === "??").length;
    state.settings = panelSettings;
    state.routing.mode = liveContext.mode;
    state.routing.manualServerId = liveContext.manualServerId;
    state.routing.blockedTrafficTarget = liveContext.blockedTarget;
    state.routing.proxyLists = liveContext.proxyListNames;
    state.routing.directOverrides = liveContext.directListNames;
    state.routing.listMode = safeString(effectivePanelState?.routing?.listMode, state.routing.listMode || "ru-only");
    state.routing.autoSelection = {
      ...state.routing.autoSelection,
      metric: safeString(panelAutoSelection.metric, state.routing.autoSelection.metric || "latency"),
      intervalMinutes: Math.max(1, Math.min(60, Number(panelAutoSelection.intervalMinutes) || state.routing.autoSelection.intervalMinutes || 10)),
      stickyBest: panelAutoSelection.stickyBest ?? state.routing.autoSelection.stickyBest,
      minScore: Math.max(1, Math.min(99, Number(panelAutoSelection.minScore) || state.routing.autoSelection.minScore || 55)),
      switchTolerance: Math.max(20, Math.min(300, Number(panelAutoSelection.switchTolerance) || state.routing.autoSelection.switchTolerance || 120)),
      currentNodeId: liveContext.autoSelection || state.routing.autoSelection.currentNodeId,
    };
    state.subscriptions.items = mergeSubscriptionsFromPanel(nodes, effectivePanelState);
    state.subscriptions.egressPolicy = panelPolicy;
    state.subscriptions.lastReprocessAt =
      effectivePanelState?.subscriptions?.lastReprocessAt || state.subscriptions.lastReprocessAt || nowIso();
    state.automation = {
      ...(state.automation && typeof state.automation === "object" ? state.automation : {}),
      ...(effectivePanelState?.automation && typeof effectivePanelState.automation === "object" ? effectivePanelState.automation : {}),
    };
    state.nodes = nodes;
    state.ruleEngine.bases = bases;
    state.ruleEngine.rules = ruleList;
    if (options.addRefreshEvent && reason !== "poll") {
      addEvent("ok", "api-refreshed", { reason });
    }
  }

  function getProxyMap(proxiesPayload) {
    return proxiesPayload?.proxies && typeof proxiesPayload.proxies === "object" ? proxiesPayload.proxies : {};
  }

  function getProviderMap(providersPayload) {
    return providersPayload?.providers && typeof providersPayload.providers === "object" ? providersPayload.providers : {};
  }

  function findProviderByProxy(providers, proxyName) {
    const preferredEntries = Object.entries(providers).filter(([id]) => !SERVICE_PROVIDER_IDS.has(id));
    return preferredEntries.find(([, provider]) => {
      const proxies = Array.isArray(provider?.proxies) ? provider.proxies : [];
      return proxies.some((proxy) => proxy?.name === proxyName || proxy === proxyName);
    }) || Object.entries(providers).find(([, provider]) => {
      const proxies = Array.isArray(provider?.proxies) ? provider.proxies : [];
      return proxies.some((proxy) => proxy?.name === proxyName || proxy === proxyName);
    });
  }

  function buildNodes(proxyMap, providers, panelState) {
    const inventoryIndex = buildInventoryIndex(panelState);
    const runtimeNodes = Object.entries(proxyMap)
      .filter(([name, proxy]) => !BUILTIN_PROXIES.has(name) && !isGroupProxy(proxy))
      .map(([name, proxy]) => {
        const providerEntry = findProviderByProxy(providers, name);
        const rawProviderName = providerEntry?.[0] && providerEntry[0] !== "default" ? providerEntry[0] : "merged-pool";
        const providerName = rawProviderName === "merged-pool" ? "Merged pool" : rawProviderName;
        const providerProxy = providerEntry?.[1]?.proxies?.find?.((item) => item?.name === name) || null;
        const inventoryNode = findInventoryNode(inventoryIndex, name);
        const previousNode = state.nodes.find((node) => node.id === name || node.label === name) || null;
        const delay = lastDelay(proxy.history) || lastDelay(providerProxy?.history);
        const alive = proxy.alive !== false && providerProxy?.alive !== false;
        const hostHint = safeString(proxy.server || providerProxy?.server, "");
        const inferredCountry = normalizeCountryCode(inferCountryCode(name || hostHint));
        const countryCode = normalizeCountryCode(inventoryNode?.egressCountry || previousNode?.egressCountry, inferredCountry);
        const subscriptionId = safeString(inventoryNode?.subscriptionId || previousNode?.subscriptionId, rawProviderName);
        const subscriptionName = safeString(inventoryNode?.subscriptionName || inventoryNode?.provider || previousNode?.subscriptionName || previousNode?.provider, providerName);
        const latency = Math.max(0, Number(delay || inventoryNode?.latency || previousNode?.latency || (alive ? 999 : 0)));
        const score = Math.max(1, Number(inventoryNode?.score || previousNode?.score || scoreFromDelay(delay, alive)));
        const trend =
          Array.isArray(inventoryNode?.trend) && inventoryNode.trend.length
            ? inventoryNode.trend.map((item) => Math.max(0, Number(item) || 0))
            : Array.isArray(previousNode?.trend) && previousNode.trend.length
              ? previousNode.trend.map((item) => Math.max(0, Number(item) || 0))
            : delayTrend(proxy.history || providerProxy?.history, latency);
        return {
          id: name,
          subscriptionId,
          subscriptionName,
          label: safeString(inventoryNode?.label || inventoryNode?.name || previousNode?.label, name),
          region: safeString(inventoryNode?.region || previousNode?.region, countryCode !== "??" ? countryCode : safeString(hostHint, "runtime")),
          provider: subscriptionName,
          protocol: proxyType(proxy),
          egressCountry: countryCode,
          egressIp: safeString(inventoryNode?.egressIp || previousNode?.egressIp, hostHint),
          egressProvider: safeString(inventoryNode?.egressProvider || previousNode?.egressProvider, subscriptionName),
          baseStatus: alive ? "alive" : "unstable",
          latency,
          jitter: Math.max(0, Number(inventoryNode?.jitter) || Number(previousNode?.jitter) || 0),
          rxMbps: Math.max(0, Number(inventoryNode?.rxMbps) || Number(previousNode?.rxMbps) || 0),
          txMbps: Math.max(0, Number(inventoryNode?.txMbps) || Number(previousNode?.txMbps) || 0),
          score,
          trend,
          inPool: inventoryNode ? inventoryNode.inPool !== false : previousNode ? previousNode.inPool !== false : true,
          reason: normalizeInventoryReason(inventoryNode?.reason || previousNode?.reason),
        };
      });

    const runtimeIds = new Set(runtimeNodes.flatMap((node) => [node.id, node.label]).filter(Boolean));
    const inventoryOnlyNodes = inventoryIndex.nodes
      .filter((node) => {
        const id = safeString(node?.id, "");
        const label = safeString(node?.label || node?.name, "");
        return !runtimeIds.has(id) && !runtimeIds.has(label);
      })
      .map((node) => {
        const label = safeString(node?.label || node?.name || node?.id, "Hidden node");
        const egressCountry = normalizeCountryCode(node?.egressCountry, normalizeCountryCode(inferCountryCode(label)));
        const latency = Math.max(0, Number(node?.latency) || 0);
        const trend =
          Array.isArray(node?.trend) && node.trend.length
            ? node.trend.map((item) => Math.max(0, Number(item) || 0))
            : delayTrend([], latency);
        return {
          id: safeString(node?.id, label),
          subscriptionId: safeString(node?.subscriptionId, "inventory"),
          subscriptionName: safeString(node?.subscriptionName || node?.provider, "Inventory"),
          label,
          region: safeString(node?.region, egressCountry !== "??" ? egressCountry : "inventory"),
          provider: safeString(node?.provider || node?.subscriptionName, "Inventory"),
          protocol: safeString(node?.protocol, "Unknown"),
          egressCountry,
          egressIp: safeString(node?.egressIp, ""),
          egressProvider: safeString(node?.egressProvider || node?.provider, "Inventory"),
          baseStatus: "unstable",
          latency,
          jitter: Math.max(0, Number(node?.jitter) || 0),
          rxMbps: Math.max(0, Number(node?.rxMbps) || 0),
          txMbps: Math.max(0, Number(node?.txMbps) || 0),
          score: Math.max(1, Number(node?.score) || 1),
          trend,
          inPool: node?.inPool !== false,
          reason: normalizeInventoryReason(node?.reason),
        };
      });

    return [...runtimeNodes, ...inventoryOnlyNodes].sort((left, right) => {
      const leftPenalty = left.baseStatus === "unstable" || left.latency <= 0 ? 1 : 0;
      const rightPenalty = right.baseStatus === "unstable" || right.latency <= 0 ? 1 : 0;
      return leftPenalty - rightPenalty || left.latency - right.latency || left.label.localeCompare(right.label);
    });
  }

  function buildSubscriptions(nodes) {
    const byId = new Map();
    nodes.forEach((node) => {
      if (!byId.has(node.subscriptionId)) {
        byId.set(node.subscriptionId, {
          id: node.subscriptionId,
          name: node.provider,
          url: "Router-managed Nikki pool",
          format: "mihomo",
          lastSyncAt: nowIso(),
          enabled: true,
        });
      }
    });
    return [...byId.values()];
  }

  function normalizeSubscriptionItem(item) {
    return {
      id: safeString(item?.id, ""),
      name: safeString(item?.name, safeString(item?.id, "Subscription")),
      url: safeString(item?.url, ""),
      format: safeString(item?.format, "clash"),
      lastSyncAt: item?.lastSyncAt || nowIso(),
      enabled: item?.enabled !== false,
    };
  }

  function buildInventoryIndex(panelState) {
    const nodes = Array.isArray(panelState?.inventory?.nodes) ? panelState.inventory.nodes : [];
    const byId = new Map();
    const byLabel = new Map();
    nodes.forEach((node) => {
      const id = safeString(node?.id, "");
      const label = safeString(node?.label || node?.name, "");
      if (id) {
        byId.set(id, node);
      }
      if (label) {
        byLabel.set(label, node);
      }
    });
    return { nodes, byId, byLabel };
  }

  function findInventoryNode(index, proxyName) {
    if (!proxyName) {
      return null;
    }
    return index.byId.get(proxyName) || index.byLabel.get(proxyName) || null;
  }

  function normalizePanelPolicy(policy) {
    const blockedCountries = Array.isArray(policy?.blockedCountries)
      ? [...new Set(policy.blockedCountries.map((item) => safeString(item, "").toUpperCase()).filter(Boolean))].sort()
      : [...LIVE_EGRESS_POLICY.blockedCountries];
    return {
      blockedCountries,
      allowUnknown: Boolean(policy?.allowUnknown),
    };
  }

  function normalizePanelBase(base) {
    return {
      ...base,
      id: safeString(base?.id, ""),
      name: safeString(base?.name, safeString(base?.id, "Base")),
      scope: safeString(base?.scope, "proxy"),
      kind: safeString(base?.kind, "domains"),
      sourceType: safeString(base?.sourceType, "local"),
      format: safeString(base?.format, "plain-list"),
      sourceUrl: safeString(base?.sourceUrl, ""),
      runtimeMode: safeString(base?.runtimeMode, ""),
      autoUpdate: Boolean(base?.autoUpdate),
      updateEveryHours: Math.max(0, Number(base?.updateEveryHours) || 0),
      enabled: base?.enabled !== false,
      lastSyncAt: base?.lastSyncAt || "",
      itemCount: Math.max(0, Number(base?.itemCount) || 0),
      preview: Array.isArray(base?.preview) ? base.preview.filter(Boolean) : [],
      entries: Array.isArray(base?.entries) ? base.entries.filter(Boolean) : [],
      note: safeString(base?.note, ""),
    };
  }

  function normalizePanelRule(rule) {
    return {
      ...rule,
      id: safeString(rule?.id, ""),
      name: safeString(rule?.name, safeString(rule?.id, "Rule")),
      priority: Math.max(1, Number(rule?.priority) || 1),
      action: safeString(rule?.action, "PROXY"),
      target: safeString(rule?.target, "BLOCKED SITES"),
      enabled: rule?.enabled !== false,
      locked: Boolean(rule?.locked),
      matchMode: safeString(rule?.matchMode, "any"),
      baseIds: Array.isArray(rule?.baseIds) ? [...new Set(rule.baseIds.map((item) => safeString(item, "")).filter(Boolean))] : [],
      note: safeString(rule?.note, ""),
    };
  }

  function mergeSubscriptionsFromPanel(nodes, panelState) {
    const panelItems = Array.isArray(panelState?.subscriptions?.items)
      ? panelState.subscriptions.items.map(normalizeSubscriptionItem).filter((item) => item.id)
      : [];
    const derivedItems = buildSubscriptions(nodes);
    if (!panelItems.length) {
      return derivedItems;
    }
    const byId = new Map(panelItems.map((item) => [item.id, item]));
    derivedItems.forEach((item) => {
      if (!byId.has(item.id)) {
        byId.set(item.id, item);
      }
    });
    return [...byId.values()];
  }

  function buildBases(ruleProvidersPayload, panelState) {
    if (Array.isArray(panelState?.ruleEngine?.bases) && panelState.ruleEngine.bases.length) {
      return panelState.ruleEngine.bases.map(normalizePanelBase).filter((base) => base.id);
    }
    const providers = getProviderMap(ruleProvidersPayload);
    return Object.entries(providers).map(([id, provider]) => {
      const kind = baseKindFromId(id);
      const sourceType = isLocalRuleProvider(provider) ? "local" : "remote";
      return {
        id,
        name: friendlyBaseName(id),
        scope: baseScopeFromId(id),
        kind,
        sourceType,
        format: provider?.format || provider?.vehicleType || "rule-provider",
        sourceUrl: provider?.url || provider?.path || "",
        runtimeMode: provider?.behavior || (sourceType === "local" ? "file-rule-provider" : "mihomo-rule-provider"),
        autoUpdate: sourceType === "remote" ? Boolean(provider?.interval) : id.startsWith("RU-BLOCKED"),
        updateEveryHours: provider?.interval ? Math.round(Number(provider.interval) / 3600) || 0 : id.startsWith("RU-BLOCKED") ? 6 : 0,
        enabled: true,
        lastSyncAt: nowIso(),
        itemCount: Number(provider?.ruleCount || provider?.size || provider?.count || 0),
        preview: [],
        note: provider?.description || safeString(provider?.path, ""),
      };
    });
  }

  function buildRules(rulesPayload, bases, panelState) {
    if (Array.isArray(panelState?.ruleEngine?.rules) && panelState.ruleEngine.rules.length) {
      return panelState.ruleEngine.rules.map(normalizePanelRule).filter((rule) => rule.id);
    }
    const knownBaseIds = new Set(bases.map((base) => base.id));
    const rules = Array.isArray(rulesPayload?.rules) ? rulesPayload.rules : [];
    return rules.slice(0, 400).map((rule, index) => {
      const payload = safeString(rule.payload || rule.Payload || rule.value || "", "");
      const type = safeString(rule.type || rule.Type || "RULE", "RULE");
      const target = safeString(rule.proxy || rule.Proxy || rule.adapter || "", "");
      return {
        id: `mihomo-rule-${index}`,
        name: payload ? `${type} ${payload}` : type,
        priority: index + 1,
        action: target === "DIRECT" ? "DIRECT" : target === "REJECT" ? "REJECT" : "PROXY",
        target: target || "MATCH",
        enabled: !rule.disabled,
        locked: true,
        matchMode: "mihomo",
        baseIds: knownBaseIds.has(payload) ? [payload] : [],
        note: rule.size ? `${rule.size} items` : "",
      };
    });
  }

  function buildConnections(connectionsPayload) {
    const connections = Array.isArray(connectionsPayload?.connections) ? connectionsPayload.connections : [];
    const sampleAt = Date.now();
    let totalDownSpeed = 0;
    let totalUpSpeed = 0;
    let tunneledDownSpeed = 0;
    let tunneledUpSpeed = 0;
    const downloadTotal = Number(connectionsPayload?.downloadTotal || connectionsPayload?.DownloadTotal || 0);
    const uploadTotal = Number(connectionsPayload?.uploadTotal || connectionsPayload?.UploadTotal || 0);

    if (previousConnectionTotals) {
      const totalSeconds = Math.max(0.2, (sampleAt - previousConnectionTotals.sampleAt) / 1000);
      totalDownSpeed = Math.max(0, Math.round((downloadTotal - previousConnectionTotals.downloadTotal) / totalSeconds));
      totalUpSpeed = Math.max(0, Math.round((uploadTotal - previousConnectionTotals.uploadTotal) / totalSeconds));
    }

    const items = connections.map((connection) => {
      const prev = previousConnections.get(connection.id);
      const seconds = prev ? Math.max(0.2, (sampleAt - prev.sampleAt) / 1000) : 1;
      const download = Number(connection.download || connection.downloaded || 0);
      const upload = Number(connection.upload || connection.uploaded || 0);
      const dlSpeedBps = prev ? Math.max(0, Math.round((download - prev.download) / seconds)) : 0;
      const ulSpeedBps = prev ? Math.max(0, Math.round((upload - prev.upload) / seconds)) : 0;
      const metadata = connection.metadata || {};
      const chains = Array.isArray(connection.chains) && connection.chains.length ? connection.chains : [connection.rule || "DIRECT"];
      if (!isDirectConnectionChain(chains)) {
        tunneledDownSpeed += dlSpeedBps;
        tunneledUpSpeed += ulSpeedBps;
      }
      return {
        id: String(connection.id),
        state: "active",
        sourceKey: metadata.sourceIP || metadata.srcIP || "unknown",
        sourceLabel: sourceLabel(metadata),
        host: humanHost(metadata),
        inbound: metadata.type || metadata.inbound || connection.inbound || "inbound",
        network: metadata.network || connection.network || "tcp",
        rule: connection.rule || connection.rulePayload || "MATCH",
        chains,
        dlSpeedBps,
        ulSpeedBps,
        dlBytes: download,
        ulBytes: upload,
        connectedAt: connection.start || connection.startAt || nowIso(),
      };
    });

    previousConnections = new Map(
      connections.map((connection) => [
        connection.id,
        {
          sampleAt,
          download: Number(connection.download || connection.downloaded || 0),
          upload: Number(connection.upload || connection.uploaded || 0),
        },
      ]),
    );

    previousConnectionTotals = {
      sampleAt,
      downloadTotal,
      uploadTotal,
    };

    if (!totalDownSpeed && !totalUpSpeed) {
      totalDownSpeed = items.reduce((sum, item) => sum + item.dlSpeedBps, 0);
      totalUpSpeed = items.reduce((sum, item) => sum + item.ulSpeedBps, 0);
    }

    return { items, totalDownSpeed, totalUpSpeed, tunneledDownSpeed, tunneledUpSpeed };
  }

  function updateGraphs(downMbps, upMbps, avgLatency, blockedHits) {
    state.graphs.throughputDown.push(Math.round(downMbps * 100) / 100);
    state.graphs.throughputUp.push(Math.round(upMbps * 100) / 100);
    state.graphs.latencyAverage.push(avgLatency || 0);
    state.graphs.blockedHits.push(blockedHits || 0);
    state.graphs.throughputDown = state.graphs.throughputDown.slice(-24);
    state.graphs.throughputUp = state.graphs.throughputUp.slice(-24);
    state.graphs.latencyAverage = state.graphs.latencyAverage.slice(-24);
    state.graphs.blockedHits = state.graphs.blockedHits.slice(-24);
  }

  function applyTrafficSample(sample) {
    const up = Number(sample?.up || sample?.upload || 0);
    const down = Number(sample?.down || sample?.download || 0);
    if (!Number.isFinite(up) || !Number.isFinite(down)) {
      return;
    }
    state.health.downloadMbps = Math.round(((down * 8 / 1_000_000) * 100)) / 100;
    state.health.uploadMbps = Math.round(((up * 8 / 1_000_000) * 100)) / 100;
    state.health.trafficScope = safeString(sample?.scope, state.health.trafficScope || "total");
    const snapshot = snapshotWithLiveContext();
    updateGraphs(state.health.downloadMbps, state.health.uploadMbps, snapshot.derived?.averageLatency || 0, state.health.blockedHitsPerMin || 0);
    emit();
  }

  function applyConnectionsSample(sample) {
    const connectionStats = buildConnections(sample);
    state.connections.items = connectionStats.items;
    state.health.activeConnections = connectionStats.items.length;
    const hasDedicatedTrafficSource = Boolean(trafficSocket) || client.usesBridge(MISSION_CONTROL_API.traffic);
    if (!hasDedicatedTrafficSource) {
      state.health.downloadMbps = Math.round((connectionStats.totalDownSpeed * 8 / 1_000_000) * 100) / 100;
      state.health.uploadMbps = Math.round((connectionStats.totalUpSpeed * 8 / 1_000_000) * 100) / 100;
      state.health.trafficScope = "total";
      const snapshot = snapshotWithLiveContext();
      updateGraphs(state.health.downloadMbps, state.health.uploadMbps, snapshot.derived?.averageLatency || 0, state.health.blockedHitsPerMin || 0);
    } else if (client.usesBridge(MISSION_CONTROL_API.traffic) && !trafficSocket && state.health.trafficScope !== "tunnel") {
      state.health.downloadMbps = Math.round((connectionStats.tunneledDownSpeed * 8 / 1_000_000) * 100) / 100;
      state.health.uploadMbps = Math.round((connectionStats.tunneledUpSpeed * 8 / 1_000_000) * 100) / 100;
      state.health.trafficScope = "tunnel";
      const snapshot = snapshotWithLiveContext();
      updateGraphs(state.health.downloadMbps, state.health.uploadMbps, snapshot.derived?.averageLatency || 0, state.health.blockedHitsPerMin || 0);
    }
    emit();
  }

  function applyMemorySample(sample) {
    const usedMiB = memorySampleToMiB(sample, ["inuse", "Inuse", "alloc"]);
    const budgetMiB = memorySampleToMiB(sample, ["oslimit", "OSLimit"]);
    if (usedMiB !== null) {
      state.health.memoryMiB = usedMiB;
    }
    if (budgetMiB !== null) {
      state.health.memoryBudgetMiB = budgetMiB;
    }
    emit();
  }

  function applyLogSample(sample) {
    const message = safeString(sample?.message || sample?.msg || sample?.payload || sample, "");
    if (!message) {
      return;
    }
    const level = safeString(sample?.level || sample?.type, "info").toLowerCase();
    addEvent(level === "error" ? "error" : "info", "mihomo-log", { level, message });
    emit();
  }

  function openJsonSocket(current, assign, path, params, onMessage) {
    if (!config.useWebSocket || current || destroyed) {
      return current;
    }
    let socket = null;
    try {
      socket = new WebSocket(client.wsUrl(path, params));
      assign(socket);
      socket.addEventListener("message", (event) => {
        try {
          onMessage(JSON.parse(event.data));
        } catch {
          // ignore malformed samples
        }
      });
      socket.addEventListener("close", () => {
        assign(null);
      });
      socket.addEventListener("error", () => {
        socket?.close?.();
      });
    } catch {
      socket = null;
      assign(null);
    }
    return socket;
  }

  function openLiveSockets() {
    if (!client.usesBridge(MISSION_CONTROL_API.traffic)) {
      openJsonSocket(trafficSocket, (socket) => {
        trafficSocket = socket;
      }, "/traffic", null, applyTrafficSample);
    }
    openJsonSocket(connectionsSocket, (socket) => {
      connectionsSocket = socket;
    }, "/connections", { interval: config.pollIntervalMs || 1000 }, applyConnectionsSample);
    openJsonSocket(memorySocket, (socket) => {
      memorySocket = socket;
    }, "/memory", null, applyMemorySample);
    openJsonSocket(logsSocket, (socket) => {
      logsSocket = socket;
    }, "/logs", { level: "warning", format: "structured" }, applyLogSample);
  }

  function closeLiveSockets() {
    trafficSocket?.close?.();
    connectionsSocket?.close?.();
    memorySocket?.close?.();
    logsSocket?.close?.();
    trafficSocket = null;
    connectionsSocket = null;
    memorySocket = null;
    logsSocket = null;
  }

  async function refreshConnections(reason = "poll", options = {}) {
    if (destroyed || state.connections.paused || connectionsRefreshInFlight || (config.useWebSocket && connectionsSocket)) {
      return;
    }

    const force = Boolean(options.force);
    const now = Date.now();
    if (!force && now - lastConnectionsRefreshAt < CONNECTIONS_REFRESH_INTERVAL_MS) {
      return;
    }

    connectionsRefreshInFlight = true;
    try {
      const path = connectionRequestPath();
      const result = await settleRequest(
        "connections",
        client.get(path, null, { timeout: liveRequestTimeout(path) }),
        liveRequestTimeout(path) + 1000,
      );
      if (result.status !== "fulfilled") {
        if (reason !== "poll") {
          addEvent("error", "connections-refresh-failed", {
            reason,
            message: result.reason?.message || String(result.reason),
          });
          emit();
        }
        return;
      }

      const connectionStats = buildConnections(result.value);
      state.connections.items = connectionStats.items;
      state.health.activeConnections = connectionStats.items.length;
      const hasDedicatedTrafficSource = Boolean(trafficSocket) || client.usesBridge(MISSION_CONTROL_API.traffic);
      if (!hasDedicatedTrafficSource) {
        state.health.downloadMbps = Math.round((connectionStats.totalDownSpeed * 8 / 1_000_000) * 100) / 100;
        state.health.uploadMbps = Math.round((connectionStats.totalUpSpeed * 8 / 1_000_000) * 100) / 100;
        state.health.trafficScope = "total";
        const snapshot = snapshotWithLiveContext();
        updateGraphs(state.health.downloadMbps, state.health.uploadMbps, snapshot.derived?.averageLatency || 0, state.health.blockedHitsPerMin || 0);
      } else if (client.usesBridge(MISSION_CONTROL_API.traffic) && !trafficSocket && state.health.trafficScope !== "tunnel") {
        state.health.downloadMbps = Math.round((connectionStats.tunneledDownSpeed * 8 / 1_000_000) * 100) / 100;
        state.health.uploadMbps = Math.round((connectionStats.tunneledUpSpeed * 8 / 1_000_000) * 100) / 100;
        state.health.trafficScope = "tunnel";
        const snapshot = snapshotWithLiveContext();
        updateGraphs(state.health.downloadMbps, state.health.uploadMbps, snapshot.derived?.averageLatency || 0, state.health.blockedHitsPerMin || 0);
      }
      emit();
    } finally {
      lastConnectionsRefreshAt = Date.now();
      connectionsRefreshInFlight = false;
    }
  }

  async function readStreamingJson(path, timeoutMs = 3500) {
    const controller = new AbortController();
    const headers = new Headers();
    if (config.secret) {
      headers.set("Authorization", `Bearer ${config.secret}`);
    }

    function tryParseObject(text) {
      const value = String(text || "").trim();
      if (!value.startsWith("{") || !value.endsWith("}")) {
        return null;
      }
      try {
        return JSON.parse(value);
      } catch {
        return null;
      }
    }

    let lastPayload = null;
    let buffer = "";
    const decoder = new TextDecoder();
    const deadline = Date.now() + timeoutMs;

    try {
      const response = await fetch(client.url(path), {
        method: "GET",
        headers,
        signal: controller.signal,
        cache: "no-store",
      });
      if (!response.ok) {
        const message = await response.text().catch(() => `${response.status} ${response.statusText}`);
        throw new Error(message || `${response.status} ${response.statusText}`);
      }

      if (!response.body?.getReader) {
        const text = await response.text();
        return tryParseObject(text);
      }

      const reader = response.body.getReader();
      while (Date.now() < deadline) {
        const waitMs = Math.max(1, deadline - Date.now());
        const chunk = await Promise.race([
          reader.read(),
          new Promise((resolve) => window.setTimeout(() => resolve({ timeout: true }), waitMs)),
        ]);
        if (chunk?.timeout) {
          break;
        }
        if (chunk.done) {
          break;
        }

        buffer += decoder.decode(chunk.value, { stream: true });
        const lines = buffer.split(/\r?\n/);
        buffer = lines.pop() || "";
        lines.forEach((line) => {
          const parsed = tryParseObject(line);
          if (parsed) {
            lastPayload = parsed;
          }
        });

        const inlineParsed = tryParseObject(buffer);
        if (inlineParsed) {
          lastPayload = inlineParsed;
          buffer = "";
        }
      }

      const tailParsed = tryParseObject(buffer);
      if (tailParsed) {
        lastPayload = tailParsed;
      }
      return lastPayload;
    } finally {
      controller.abort();
    }
  }

  function syncLiveContext(proxyMap, mode, nodes, bases, panelState) {
    const blockedSelection = safeString(proxyMap[ROUTER_GROUPS.blocked]?.now, ROUTER_GROUPS.auto);
    const manualSelection = safeString(proxyMap[ROUTER_GROUPS.manual]?.now, "DIRECT");
    const autoSelection = safeString(proxyMap[ROUTER_GROUPS.auto]?.now, "");
    const globalSelection = safeString(proxyMap[ROUTER_GROUPS.global]?.now, blockedSelection || "DIRECT");
    const panelRouting = panelState?.routing || {};
    const proxyListNames = Array.isArray(panelRouting.proxyLists) && panelRouting.proxyLists.length
      ? panelRouting.proxyLists.map((item) => safeString(item, "")).filter(Boolean)
      : bases.filter((base) => base.scope === "proxy" && base.enabled !== false).map((base) => base.name);
    const directListNames = Array.isArray(panelRouting.directOverrides)
      ? panelRouting.directOverrides.map((item) => safeString(item, "")).filter(Boolean)
      : [];

    let blockedTarget = "auto";
    if (blockedSelection === "DIRECT") {
      blockedTarget = "direct";
    } else if (blockedSelection === ROUTER_GROUPS.manual) {
      blockedTarget = manualSelection === "DIRECT" ? "direct" : "manual";
    } else if (blockedSelection && blockedSelection !== ROUTER_GROUPS.auto) {
      blockedTarget = "manual";
    }

    const reportedMode = normalizeMode(mode === "global" && globalSelection === "DIRECT" ? "direct" : mode);
    liveContext = {
      rawMode: safeString(mode, "rule"),
      mode: reportedMode,
      blockedSelection,
      blockedTarget,
      autoSelection,
      manualSelection,
      manualServerId: manualSelection !== "DIRECT" ? manualSelection : state.routing.manualServerId || autoSelection || nodes[0]?.id || "",
      globalSelection,
      proxyListNames,
      directListNames,
      runtimeNodeCount: Object.entries(proxyMap).filter(([name, proxy]) => !BUILTIN_PROXIES.has(name) && !isGroupProxy(proxy)).length,
      hasGlobalGroup: Boolean(proxyMap[ROUTER_GROUPS.global]),
      hasBlockedGroup: Boolean(proxyMap[ROUTER_GROUPS.blocked]),
      hasManualGroup: Boolean(proxyMap[ROUTER_GROUPS.manual]),
      hasAutoGroup: Boolean(proxyMap[ROUTER_GROUPS.auto]),
    };
  }

  async function refreshState(reason = "poll") {
    if (refreshInFlight || destroyed) {
      return;
    }
    refreshInFlight = true;
    try {
      const trafficPath = trafficRequestPath();
      const trafficSnapshotPromise = (
        client.usesBridge(MISSION_CONTROL_API.traffic)
          ? client.get(trafficPath, null, { timeout: liveRequestTimeout(trafficPath) }).catch(() => null)
          : readStreamingJson(trafficPath, liveRequestTimeout(trafficPath)).catch(() => null)
      ).catch(() => null);
      const memorySnapshotPromise = (
        client.usesBridge("/memory")
          ? client.get(MISSION_CONTROL_API.memory, null, { timeout: 22000 }).catch(() => null)
          : readStreamingJson("/memory", liveRequestTimeout("/memory"))
      ).catch(() => null);
      const panelStatePromise = settleRequest(
        "panel-state",
        client.get(MISSION_CONTROL_API.state, null, { timeout: liveRequestTimeout(MISSION_CONTROL_API.state) }),
        liveRequestTimeout(MISSION_CONTROL_API.state) + 1000,
      );
      let panelStateResultCache = null;
      const panelStateReadyPromise = panelStatePromise.then((result) => {
        panelStateResultCache = result;
        if (
          result.status === "fulfilled" &&
          isHostedLivePanel() &&
          reason !== "poll" &&
          !lastPanelState &&
          !state.nodes.length &&
          !lastSnapshot?.nodes?.length
        ) {
          lastPanelState = result.value;
          applyResolvedState(
            {
              version: SKIPPED_REQUEST_RESULT,
              configs: SKIPPED_REQUEST_RESULT,
              proxies: SKIPPED_REQUEST_RESULT,
              providers: SKIPPED_REQUEST_RESULT,
              rules: SKIPPED_REQUEST_RESULT,
              ruleProviders: SKIPPED_REQUEST_RESULT,
            },
            lastPanelState,
            `${reason}:panel-seed`,
            { panelSeed: true },
          );
          emit();
        }
        return result;
      });
      const supportsDirectRules = !client.usesBridge("/rules");
      const [version, configs, proxies, providers, rules, ruleProviders] = await Promise.all([
        settleRequest("version", client.get("/version", null, { timeout: liveRequestTimeout("/version") }), liveRequestTimeout("/version") + 500),
        settleRequest("configs", client.get("/configs", null, { timeout: liveRequestTimeout("/configs") }), liveRequestTimeout("/configs") + 500),
        settleRequest("proxies", client.get("/proxies", null, { timeout: liveRequestTimeout("/proxies") }), liveRequestTimeout("/proxies") + 500),
        settleRequest("providers-proxies", client.get("/providers/proxies", null, { timeout: liveRequestTimeout("/providers/proxies") }), liveRequestTimeout("/providers/proxies") + 500),
        supportsDirectRules
          ? settleRequest("rules", client.get("/rules", null, { timeout: liveRequestTimeout("/rules") }), liveRequestTimeout("/rules") + 500)
          : Promise.resolve({ status: "skipped" }),
        supportsDirectRules
          ? settleRequest("providers-rules", client.get("/providers/rules", null, { timeout: liveRequestTimeout("/providers/rules") }), liveRequestTimeout("/providers/rules") + 500)
          : Promise.resolve({ status: "skipped" }),
      ]);

      if (version.status === "rejected" && configs.status === "rejected" && proxies.status === "rejected") {
        throw version.reason || configs.reason || proxies.reason;
      }

      const resolved = { version, configs, proxies, providers, rules, ruleProviders };
      if (
        isHostedLivePanel() &&
        reason !== "poll" &&
        !lastPanelState &&
        !state.nodes.length &&
        !lastSnapshot?.nodes?.length &&
        !panelStateResultCache
      ) {
        panelStateResultCache = await Promise.race([
          panelStateReadyPromise,
          sleep(PANEL_STATE_BOOTSTRAP_WAIT_MS).then(() => null),
        ]);
      }
      const initialPanelState = panelStateResultCache?.status === "fulfilled" ? panelStateResultCache.value : null;
      if (initialPanelState) {
        lastPanelState = initialPanelState;
      }
      applyResolvedState(resolved, initialPanelState, reason);
      emit();
      refreshConnections(reason, { force: reason !== "poll" || !state.connections.items.length }).catch((error) => {
        console.error("[mission-control] connections-refresh-failed", error);
      });
      openLiveSockets();

      const panelStateResult = panelStateResultCache || (await panelStateReadyPromise);
      if (panelStateResult.status === "fulfilled") {
        lastPanelState = panelStateResult.value;
        applyResolvedState(resolved, lastPanelState, reason, { addRefreshEvent: true });
        emit();
      } else if (reason !== "poll") {
        addEvent("info", "panel-state-delayed", { message: panelStateResult.reason?.message || String(panelStateResult.reason) });
        emit();
      }

      memorySnapshotPromise.then((memorySample) => {
        if (!memorySample || destroyed) {
          return;
        }
        const usedMiB = memorySampleToMiB(memorySample, ["inuse", "Inuse", "alloc"]);
        const budgetMiB = memorySampleToMiB(memorySample, ["oslimit", "OSLimit"]);
        if (usedMiB !== null) {
          state.health.memoryMiB = usedMiB;
        }
        if (budgetMiB !== null) {
          state.health.memoryBudgetMiB = budgetMiB;
        }
        emit();
      });
      trafficSnapshotPromise.then((trafficSample) => {
        if (!trafficSample || destroyed) {
          return;
        }
        applyTrafficSample(trafficSample);
      });
    } catch (error) {
      markApiError(error, "api-refresh-failed");
    } finally {
      refreshInFlight = false;
    }
  }

  async function callPanelAction(action, payload = {}, options = {}) {
    const timeout =
      Number(options.timeout) > 0 ? Number(options.timeout) : panelActionTimeout(action);
    return client.post(MISSION_CONTROL_API.actions, { action, payload }, undefined, { ...options, timeout });
  }

  function currentSchedulerJob(jobId) {
    return schedulerJob(lastSnapshot || snapshotWithLiveContext(), jobId);
  }

  async function waitForSchedulerJob(jobId, beforeJob, reason, options = {}) {
    const timeoutMs = Number(options.timeoutMs) > 0 ? Number(options.timeoutMs) : 150000;
    const pollIntervalMs = Number(options.pollIntervalMs) > 0 ? Number(options.pollIntervalMs) : 2000;
    const baseline = {
      startedEpoch: Number(beforeJob?.lastStartedEpoch) || 0,
      finishedEpoch: Math.max(Number(beforeJob?.lastFinishedEpoch) || 0, Number(beforeJob?.lastSuccessEpoch) || 0),
      status: safeString(beforeJob?.lastStatus, ""),
    };
    const deadline = Date.now() + timeoutMs;
    let seenNewRun = false;

    while (Date.now() <= deadline) {
      await refreshState(reason);
      const job = currentSchedulerJob(jobId);
      const startedEpoch = Number(job?.lastStartedEpoch) || 0;
      const finishedEpoch = Math.max(Number(job?.lastFinishedEpoch) || 0, Number(job?.lastSuccessEpoch) || 0);
      const status = safeString(job?.lastStatus, "");

      if (!seenNewRun) {
        if (
          startedEpoch > baseline.startedEpoch ||
          finishedEpoch > baseline.finishedEpoch ||
          (status === "running" && baseline.status !== "running")
        ) {
          seenNewRun = true;
        }
      }

      if (seenNewRun) {
        if (status === "error") {
          throw new Error(safeString(job?.lastError, `${jobId} failed.`));
        }
        if (status === "ok" && finishedEpoch >= baseline.finishedEpoch) {
          return job;
        }
      }

      await sleep(pollIntervalMs);
    }

    throw new Error(`Timed out waiting for ${jobId}.`);
  }

  async function waitForPoolRefresh(beforeJob, reason) {
    await waitForSchedulerJob("pool-refresh", beforeJob, reason);
  }

  async function refreshAfterPanelChange(reason) {
    await refreshState(reason);
  }

  async function persistPanelSettings(patch = {}, reason = "panel-settings") {
    const nextSettings = normalizePanelSettings({ ...state.settings, ...patch }, state.settings);
    state.settings = nextSettings;
    emit();
    try {
      await mutatePanel("updatePanelSettings", nextSettings, reason);
    } catch (error) {
      addEvent("error", "panel-settings-failed", { message: error?.message || String(error) });
      emit();
    }
  }

  async function persistControllerSettings(patch = {}, reason = "controller-settings") {
    const nextPatch = extractControllerPreferencePatch(patch);
    if (!Object.keys(nextPatch).length || !client.usesBridge(MISSION_CONTROL_API.actions)) {
      return;
    }
    try {
      await mutatePanel("updateControllerSettings", nextPatch, reason);
    } catch (error) {
      addEvent("error", "controller-settings-failed", { message: error?.message || String(error) });
      emit();
    }
  }

  async function mutatePanel(action, payload, reason = action) {
    await callPanelAction(action, payload);
    addEvent("ok", "panel-updated", { action });
    await refreshAfterPanelChange(reason);
  }

  async function runProbeAction(action, payload, toolKey) {
    const previous = state.tools[toolKey] && typeof state.tools[toolKey] === "object" ? state.tools[toolKey] : {};
    const timeout = action === "runLatencyProbe" ? 45000 : 30000;
    state.tools[toolKey] = {
      ...previous,
      lastQuery: typeof payload?.value === "string" ? payload.value : previous.lastQuery || "",
      status: "running",
      error: "",
    };
    emit();

    try {
      const result = await callPanelAction(action, payload, { timeout });
      state.tools[toolKey] = {
        ...previous,
        ...result,
        status: "success",
        error: "",
      };
      addEvent("ok", "tool-finished", { action, toolKey });
      emit();
    } catch (error) {
      state.tools[toolKey] = {
        ...previous,
        lastQuery: typeof payload?.value === "string" ? payload.value : previous.lastQuery || "",
        status: "error",
        error: error?.message || String(error),
      };
      addEvent("error", "tool-failed", { action, message: error?.message || String(error) });
      emit();
    }
  }

  function restartPolling() {
    if (pollId) {
      window.clearInterval(pollId);
    }
    pollId = window.setInterval(() => {
      if (state.settings.autoRefresh) {
        refreshState("poll");
      }
    }, config.pollIntervalMs || 2000);
  }

  async function runAction(action, task) {
    if (state.actions[action]) {
      return false;
    }
    setAction(action, true);
    addEvent("info", "action-started", { action });
    try {
      await task();
      addEvent("ok", "action-finished", { action });
      await refreshState(action);
      return true;
    } catch (error) {
      addEvent("error", "action-failed", { action, message: error?.message || String(error) });
      emit();
      throw error;
    } finally {
      setAction(action, false);
    }
  }

  async function selectGroupOption(groupName, name) {
    await client.put(`/proxies/${encodePathPart(groupName)}`, { name });
  }

  async function restartController() {
    closeLiveSockets();
    await client.post("/restart", {});
    const startedAt = Date.now();
    while (Date.now() - startedAt < 45000) {
      await sleep(1500);
      try {
        await client.get("/version");
        return;
      } catch {
        // wait for controller to come back
      }
    }
    throw new Error("Mihomo controller did not come back after restart.");
  }

  async function chooseGlobalTarget(target) {
    if (!liveContext.hasGlobalGroup) {
      throw new Error("GLOBAL selector is not available.");
    }
    await selectGroupOption(ROUTER_GROUPS.global, target);
  }

  function preferredGlobalTarget() {
    if (liveContext.blockedTarget === "manual" && liveContext.manualServerId) {
      return liveContext.manualServerId;
    }
    if (liveContext.blockedTarget === "auto") {
      return ROUTER_GROUPS.auto;
    }
    return liveContext.autoSelection || ROUTER_GROUPS.auto;
  }

  refreshState("initial");
  restartPolling();

  return {
    subscribe(listener) {
      listeners.add(listener);
      listener(lastSnapshot || snapshotWithLiveContext());
      return () => listeners.delete(listener);
    },
    destroy() {
      destroyed = true;
      if (pollId) {
        window.clearInterval(pollId);
      }
      closeLiveSockets();
      listeners.clear();
    },
    configure(nextConfig) {
      config = { ...nextConfig };
      client.configure(config);
      closeLiveSockets();
      restartPolling();
      refreshState("reconfigure");
    },
    async testController() {
      await refreshState("manual-test");
    },
    async refreshNow() {
      await refreshState("manual-refresh");
    },
    async setTheme(value) {
      await persistPanelSettings({ theme: value }, "settings-theme");
    },
    async setLanguage(value) {
      await persistPanelSettings({ language: value === "en" ? "en" : "ru" }, "settings-language");
    },
    async setDensity(value) {
      await persistPanelSettings({ density: value === "compact" ? "compact" : "comfortable" }, "settings-density");
    },
    async setScale(value) {
      await persistPanelSettings({ scale: Math.max(80, Math.min(130, Number(value) || 100)) }, "settings-scale");
    },
    async setAnimations(enabled) {
      await persistPanelSettings({ animations: Boolean(enabled) }, "settings-animations");
    },
    async setAutoRefresh(enabled) {
      await persistPanelSettings({ autoRefresh: Boolean(enabled) }, "settings-autorefresh");
    },
    async setGraphRange(value) {
      await persistPanelSettings({ graphRange: Math.max(1, Math.min(60, Number(value) || 1)) }, "settings-graph-range");
    },
    async setChartLineWidth(value) {
      await persistPanelSettings({ chartLineWidth: Math.max(1, Math.min(8, Number(value) || 1)) }, "settings-chart-line-width");
    },
    async setSpeedUnitMode(value) {
      await persistPanelSettings({ speedUnitMode: value === "bytes" ? "bytes" : "bits" }, "settings-speed-unit");
    },
    async setStorageUnitSystem(value) {
      await persistPanelSettings({ storageUnitSystem: value === "decimal" ? "decimal" : "binary" }, "settings-storage-unit");
    },
    async setMihomoMemoryLimit(value) {
      const maxMemoryLimit = Math.max(128, Number(state.settings.mihomoMemoryLimitMaxMiB) || 512);
      const nextValue = Math.max(0, Math.min(maxMemoryLimit, Math.round(Number(value) || 0)));
      state.settings = normalizePanelSettings({ ...state.settings, mihomoMemoryLimitMiB: nextValue }, state.settings);
      emit();
      try {
        await mutatePanel("updateMihomoMemoryLimit", { value: nextValue }, "settings-mihomo-memory");
      } catch (error) {
        addEvent("error", "mihomo-memory-limit-failed", { message: error?.message || String(error) });
        await refreshState("settings-mihomo-memory-failed");
        throw error;
      }
    },
    async updateControllerConfig(patch = {}) {
      await persistControllerSettings(patch, "controller-settings");
    },
    async setRoutingMode(mode) {
      const nextMode = normalizeMode(mode);
      state.routing.mode = nextMode;
      emit();
      try {
        if (nextMode === "global") {
          await chooseGlobalTarget(preferredGlobalTarget());
        } else if (nextMode === "direct" && liveContext.hasGlobalGroup) {
          await chooseGlobalTarget("DIRECT");
        }
        await client.patch("/configs", { mode: mihomoMode(nextMode) });
        addEvent("ok", "routing-mode-changed", { mode: nextMode });
        await refreshState("routing-mode");
      } catch (error) {
        markApiError(error, "routing-mode-failed");
      }
    },
    async setTunnelPreference(value) {
      state.routing.blockedTrafficTarget = value;
      emit();
      try {
        if (liveContext.mode === "global") {
          if (value === "direct") {
            if (liveContext.hasGlobalGroup) {
              await chooseGlobalTarget("DIRECT");
            }
            await client.patch("/configs", { mode: "direct" });
          } else if (value === "auto") {
            await chooseGlobalTarget(ROUTER_GROUPS.auto);
          } else if (value === "manual") {
            const manualServerId = liveContext.manualServerId || snapshotWithLiveContext().derived.bestAutoNode?.id;
            if (!manualServerId) {
              throw new Error("No manual server is available.");
            }
            await selectGroupOption(ROUTER_GROUPS.manual, manualServerId);
            await chooseGlobalTarget(manualServerId);
          }
        } else {
          if (value === "direct") {
            await selectGroupOption(ROUTER_GROUPS.blocked, "DIRECT");
          } else if (value === "auto") {
            await selectGroupOption(ROUTER_GROUPS.blocked, ROUTER_GROUPS.auto);
          } else if (value === "manual") {
            const manualServerId = liveContext.manualServerId || snapshotWithLiveContext().derived.bestAutoNode?.id;
            if (!manualServerId) {
              throw new Error("No manual server is available.");
            }
            await selectGroupOption(ROUTER_GROUPS.manual, manualServerId);
            await selectGroupOption(ROUTER_GROUPS.blocked, ROUTER_GROUPS.manual);
          }
        }
        addEvent("ok", "blocked-target-changed", { value });
        await refreshState("target-change");
      } catch (error) {
        addEvent("error", "target-change-failed", { message: error?.message || String(error) });
        emit();
      }
    },
    async setManualServer(id) {
      state.routing.manualServerId = id;
      emit();
      try {
        await selectGroupOption(ROUTER_GROUPS.manual, id);
        if (liveContext.mode === "global") {
          await chooseGlobalTarget(id);
        } else {
          await selectGroupOption(ROUTER_GROUPS.blocked, ROUTER_GROUPS.manual);
        }
        addEvent("ok", "manual-server-changed", { id });
        await refreshState("manual-select");
      } catch (error) {
        addEvent("error", "manual-server-failed", { id, message: error?.message || String(error) });
        emit();
      }
    },
    async updateAutoSelection(patch = {}) {
      try {
        await mutatePanel("updateAutoSelection", patch, "auto-selection");
      } catch (error) {
        addEvent("error", "auto-selection-failed", { message: error?.message || String(error) });
        emit();
      }
    },
    async updateAutomation(patch = {}) {
      try {
        await mutatePanel("updateAutomation", patch, "automation-settings");
      } catch (error) {
        addEvent("error", "automation-settings-failed", { message: error?.message || String(error) });
        emit();
      }
    },
    checkMissionControlUpdates() {
      return runAction("checkMissionControlUpdates", async () => {
        await callPanelAction("triggerAction", { action: "checkMissionControlUpdates" }, { timeout: panelActionTimeout("checkMissionControlUpdates") });
      });
    },
    applyMissionControlUpdate() {
      return runAction("applyMissionControlUpdate", async () => {
        await callPanelAction("triggerAction", { action: "applyMissionControlUpdate" }, { timeout: panelActionTimeout("applyMissionControlUpdate") });
      });
    },
    async toggleBlockedCountry(country) {
      if (!safeString(country, "")) {
        return;
      }
      await runAction("reprocessSubscriptions", async () => {
        const beforeJob = currentSchedulerJob("pool-refresh");
        await callPanelAction("toggleBlockedCountry", { country });
        await callPanelAction("triggerAction", { action: "reprocessSubscriptions" }, { timeout: panelActionTimeout("reprocessSubscriptions") });
        await waitForPoolRefresh(beforeJob, "reprocessSubscriptions");
      });
    },
    async setAllowUnknownEgress(enabled) {
      await runAction("reprocessSubscriptions", async () => {
        const beforeJob = currentSchedulerJob("pool-refresh");
        await callPanelAction("setAllowUnknownEgress", { enabled });
        await callPanelAction("triggerAction", { action: "reprocessSubscriptions" }, { timeout: panelActionTimeout("reprocessSubscriptions") });
        await waitForPoolRefresh(beforeJob, "reprocessSubscriptions");
      });
    },
    async updateBase(id, patch = {}, options = {}) {
      if (!safeString(id, "")) {
        return;
      }
      try {
        await mutatePanel("updateBase", { id, patch }, "base-update");
      } catch (error) {
        addEvent("error", "base-update-failed", { id, message: error?.message || String(error) });
        emit();
        if (options?.propagateError) {
          throw error;
        }
      }
    },
    syncBase(id) {
      if (!safeString(id, "")) {
        return;
      }
      runAction("updateLists", async () => {
        await callPanelAction("syncBase", { id });
      });
    },
    async addBase(payload = {}) {
      try {
        await mutatePanel("addBase", payload, "base-add");
      } catch (error) {
        addEvent("error", "base-add-failed", { message: error?.message || String(error) });
        emit();
      }
    },
    async removeBase(id) {
      if (!safeString(id, "")) {
        return;
      }
      try {
        await mutatePanel("removeBase", { id }, "base-remove");
      } catch (error) {
        addEvent("error", "base-remove-failed", { id, message: error?.message || String(error) });
        emit();
      }
    },
    async addBaseEntry(id, entry) {
      if (!safeString(id, "") || !safeString(entry, "")) {
        return;
      }
      try {
        await mutatePanel("addBaseEntry", { id, entry }, "base-entry-add");
      } catch (error) {
        addEvent("error", "base-entry-add-failed", { id, message: error?.message || String(error) });
        emit();
      }
    },
    async removeBaseEntry(id, index) {
      if (!safeString(id, "") || !Number.isFinite(Number(index))) {
        return;
      }
      try {
        await mutatePanel("removeBaseEntry", { id, index: Number(index) }, "base-entry-remove");
      } catch (error) {
        addEvent("error", "base-entry-remove-failed", { id, message: error?.message || String(error) });
        emit();
      }
    },
    async updateRule(id, patch = {}) {
      if (!safeString(id, "")) {
        return;
      }
      try {
        await mutatePanel("updateRule", { id, patch }, "rule-update");
      } catch (error) {
        addEvent("error", "rule-update-failed", { id, message: error?.message || String(error) });
        emit();
      }
    },
    async addRule(payload = {}) {
      try {
        await mutatePanel("addRule", payload, "rule-add");
      } catch (error) {
        addEvent("error", "rule-add-failed", { message: error?.message || String(error) });
        emit();
      }
    },
    async removeRule(id) {
      if (!safeString(id, "")) {
        return;
      }
      try {
        await mutatePanel("removeRule", { id }, "rule-remove");
      } catch (error) {
        addEvent("error", "rule-remove-failed", { id, message: error?.message || String(error) });
        emit();
      }
    },
    async toggleRuleBase(ruleId, baseId) {
      if (!safeString(ruleId, "") || !safeString(baseId, "")) {
        return;
      }
      try {
        await mutatePanel("toggleRuleBase", { ruleId, baseId }, "rule-base-toggle");
      } catch (error) {
        addEvent("error", "rule-base-toggle-failed", { ruleId, baseId, message: error?.message || String(error) });
        emit();
      }
    },
    async closeConnection(id) {
      try {
        await client.delete(`/connections/${encodePathPart(id)}`);
        addEvent("ok", "connection-closed", { id });
        await refreshState("close-connection");
      } catch (error) {
        addEvent("error", "connection-close-failed", { id, message: error?.message || String(error) });
        emit();
      }
    },
    async closeConnections(ids) {
      try {
        for (const id of ids) {
          await client.delete(`/connections/${encodePathPart(id)}`).catch(() => null);
        }
        addEvent("ok", "connections-closed", { count: ids.length });
        await refreshState("close-connections");
      } catch (error) {
        addEvent("error", "connections-close-failed", { message: error?.message || String(error) });
        emit();
      }
    },
    clearClosedConnections() {
      state.connections.items = state.connections.items.filter((connection) => connection.state !== "closed");
      emit();
    },
    setConnectionsPaused(enabled) {
      state.connections.paused = Boolean(enabled);
      emit();
    },
    addSubscription(payload = {}) {
      return runAction("refreshSubscriptions", async () => {
        const beforeJob = currentSchedulerJob("pool-refresh");
        await callPanelAction("addSubscription", payload);
        await waitForSchedulerJob("pool-refresh", beforeJob, "refreshSubscriptions");
      });
    },
    updateSubscription(id, payload = {}) {
      if (!safeString(id, "")) {
        return Promise.resolve(false);
      }
      return runAction("refreshSubscriptions", async () => {
        const beforeJob = currentSchedulerJob("pool-refresh");
        await callPanelAction("updateSubscription", { id, ...payload });
        await waitForSchedulerJob("pool-refresh", beforeJob, "refreshSubscriptions");
      });
    },
    removeSubscription(id) {
      if (!safeString(id, "")) {
        return Promise.resolve(false);
      }
      return runAction("refreshSubscriptions", async () => {
        const beforeJob = currentSchedulerJob("pool-refresh");
        await callPanelAction("removeSubscription", { id });
        await waitForSchedulerJob("pool-refresh", beforeJob, "refreshSubscriptions");
      });
    },
    async runRouteProbe(value) {
      const normalized = normalizeProbeAddress(value);
      if (!normalized) {
        return;
      }
      await runProbeAction("runRouteProbe", { value: normalized.raw }, "routeProbe");
    },
    async runRuleProbe(value) {
      const normalized = normalizeProbeAddress(value);
      if (!normalized) {
        return;
      }
      await runProbeAction("runRuleProbe", { value: normalized.raw }, "ruleProbe");
    },
    async runDnsProbe(value) {
      const normalized = normalizeProbeAddress(value);
      if (!normalized) {
        return;
      }
      await runProbeAction("runDnsProbe", { value: normalized.raw }, "dnsProbe");
    },
    async runLatencyProbe(value) {
      await runProbeAction("runLatencyProbe", { value: String(value || "").trim() }, "latencyProbe");
    },
    async runDiagnostics(value, mode = "quick") {
      const addresses = String(value || "")
        .split(/[\n,]+/)
        .map((entry) => entry.trim())
        .filter(Boolean);
      const primary = normalizeProbeAddress(addresses[0]);
      if (!primary) {
        return;
      }
      await Promise.all([
        runProbeAction("runRouteProbe", { value: primary.raw }, "routeProbe"),
        runProbeAction("runRuleProbe", { value: primary.raw }, "ruleProbe"),
        runProbeAction("runDnsProbe", { value: primary.raw }, "dnsProbe"),
      ]);
      if (mode === "full") {
        await runProbeAction("runLatencyProbe", { value: addresses.join(", ") }, "latencyProbe");
      }
    },
    triggerAction(action) {
      if (!safeString(action, "")) {
        return Promise.resolve(false);
      }
      return runAction(action, async () => {
        const beforePoolRefresh =
          action === "refreshSubscriptions" || action === "reprocessSubscriptions"
            ? currentSchedulerJob("pool-refresh")
            : null;
        await callPanelAction("triggerAction", { action }, { timeout: panelActionTimeout(action) });
        if (beforePoolRefresh) {
          await waitForSchedulerJob("pool-refresh", beforePoolRefresh, action);
          return;
        }
        if (action === "restartTunnel") {
          closeLiveSockets();
          const startedAt = Date.now();
          while (Date.now() - startedAt < 45000) {
            await sleep(1500);
            try {
              await client.get("/version");
              return;
            } catch {
              // wait until the controller becomes reachable again
            }
          }
          throw new Error("Nikki controller did not come back after restart.");
        }
      });
    },
  };
}
