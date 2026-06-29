const actionDurations = {
  refreshSubscriptions: 4200,
  retestServers: 2600,
  updateLists: 3200,
  restartTunnel: 2100,
  reprocessSubscriptions: 3000,
  checkMissionControlUpdates: 2200,
  applyMissionControlUpdate: 3600,
};

const MISSION_CONTROL_VERSION = "__MISSION_CONTROL_VERSION__";
const SETTINGS_STORAGE_KEY = "mission-control.mock.settings.v1";
const LEGACY_SETTINGS_STORAGE_KEY = "nikki-panel.mock.settings.v1";

const settingsValidators = {
  theme: (value) => ["graphite", "pearl", "cobalt", "ember", "sage", "noir"].includes(value),
  density: (value) => ["comfortable", "compact"].includes(value),
  scale: (value) => Number.isFinite(value) && value >= 80 && value <= 130,
  animations: (value) => typeof value === "boolean",
  autoRefresh: (value) => typeof value === "boolean",
  graphRange: (value) => Number.isFinite(value) && value >= 1 && value <= 60,
  chartLineWidth: (value) => Number.isFinite(value) && value >= 1 && value <= 8,
  speedUnitMode: (value) => ["bits", "bytes"].includes(value),
  storageUnitSystem: (value) => ["binary", "decimal"].includes(value),
  language: (value) => ["ru", "en"].includes(value),
  mihomoMemoryLimitMiB: (value) => Number.isFinite(value) && value >= 0 && value <= 512,
  mihomoMemoryLimitMaxMiB: (value) => Number.isFinite(value) && value >= 128,
};

function readSavedSettings(defaultSettings) {
  try {
    const raw = window.localStorage?.getItem(SETTINGS_STORAGE_KEY) || window.localStorage?.getItem(LEGACY_SETTINGS_STORAGE_KEY);
    if (!raw) {
      return { ...defaultSettings };
    }
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return { ...defaultSettings };
    }
    return Object.fromEntries(
      Object.entries(defaultSettings).map(([key, defaultValue]) => {
        const candidate = key in parsed ? parsed[key] : defaultValue;
        return [key, settingsValidators[key]?.(candidate) ? candidate : defaultValue];
      }),
    );
  } catch {
    return { ...defaultSettings };
  }
}

function persistSettings(settings) {
  try {
    window.localStorage?.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Ignore private-mode/storage-quota errors. The panel should continue to work without persistence.
  }
}

const newSubscriptionPresets = [
  [
    { label: "US West / VLESS", region: "Los Angeles", egressCountry: "US", egressIp: "154.12.233.18", egressProvider: "Quadranet", latency: 910, rxMbps: 0.84, txMbps: 0.11, score: 77 },
    { label: "Germany / VLESS", region: "Frankfurt", egressCountry: "DE", egressIp: "87.120.36.41", egressProvider: "M247 Europe", latency: 644, rxMbps: 1.42, txMbps: 0.16, score: 86 },
    { label: "Russia Mirror / VLESS", region: "Moscow", egressCountry: "RU", egressIp: "45.142.122.41", egressProvider: "Selectel", latency: 438, rxMbps: 0.95, txMbps: 0.09, score: 52 },
  ],
  [
    { label: "Netherlands / Reality", region: "Amsterdam", egressCountry: "NL", egressIp: "45.154.98.71", egressProvider: "Worldstream", latency: 612, rxMbps: 1.11, txMbps: 0.13, score: 84 },
    { label: "Finland Alt / VLESS", region: "Espoo", egressCountry: "FI", egressIp: "65.108.145.201", egressProvider: "Hetzner", latency: 548, rxMbps: 1.65, txMbps: 0.22, score: 89 },
    { label: "Unknown Exit / VLESS", region: "Hidden", egressCountry: "??", egressIp: "203.0.113.41", egressProvider: "Unknown", latency: 502, rxMbps: 0.71, txMbps: 0.08, score: 58 },
  ],
];

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

function minutesAgo(value) {
  return new Date(Date.now() - value * 60 * 1000).toISOString();
}

function buildSeries(length, seed, variation, floor, ceiling) {
  let current = seed;
  return Array.from({ length }, () => {
    current = clamp(current + randomBetween(-variation, variation), floor, ceiling);
    return Math.round(current * 10) / 10;
  });
}

function buildTimedSeries(length, seed, variation, floor, ceiling, spacingMs) {
  const values = buildSeries(length, seed, variation, floor, ceiling);
  const stepMs = Math.max(1000, Number(spacingMs) || 2000);
  const endAt = Date.now();
  const startAt = endAt - Math.max(0, (values.length - 1) * stepMs);
  return values.map((value, index) => ({
    value,
    at: startAt + index * stepMs,
  }));
}

function appendTimedSeriesValue(series, value, limit, roundDigits = 1) {
  const items = Array.isArray(series) ? series.slice() : [];
  const precision = 10 ** Math.max(0, roundDigits);
  items.push({
    value: Math.round(Number(value || 0) * precision) / precision,
    at: Date.now(),
  });
  return items.slice(-Math.max(1, Number(limit) || 1));
}

function buildNodes() {
  return [
    {
      id: "dvpn-us",
      subscriptionId: "dvpn",
      label: "US East / Reality",
      region: "New York",
      provider: "DVPN",
      protocol: "VLESS + Reality",
      egressCountry: "US",
      egressIp: "66.116.210.89",
      egressProvider: "BuyVM",
      baseStatus: "alive",
      latency: 1180,
      jitter: 43,
      rxMbps: 1.8,
      txMbps: 0.18,
      score: 67,
      trend: buildTimedSeries(18, 1140, 120, 320, 1800, 60 * 1000),
    },
    {
      id: "dvpn-tr",
      subscriptionId: "dvpn",
      label: "Turkey West / VLESS",
      region: "Istanbul",
      provider: "DVPN",
      protocol: "VLESS",
      egressCountry: "NL",
      egressIp: "185.177.124.18",
      egressProvider: "M247 Europe",
      baseStatus: "alive",
      latency: 690,
      jitter: 26,
      rxMbps: 0.42,
      txMbps: 0.05,
      score: 82,
      trend: buildTimedSeries(18, 690, 80, 220, 1200, 60 * 1000),
    },
    {
      id: "dvpn-fi",
      subscriptionId: "dvpn",
      label: "Finland Core / VLESS",
      region: "Helsinki",
      provider: "DVPN",
      protocol: "VLESS",
      egressCountry: "FI",
      egressIp: "65.109.152.108",
      egressProvider: "Hetzner",
      baseStatus: "alive",
      latency: 522,
      jitter: 19,
      rxMbps: 3.2,
      txMbps: 0.31,
      score: 94,
      trend: buildTimedSeries(18, 520, 65, 180, 860, 60 * 1000),
    },
    {
      id: "dvpn-kz",
      subscriptionId: "dvpn",
      label: "Kazakhstan / VLESS",
      region: "Almaty",
      provider: "DVPN",
      protocol: "VLESS",
      egressCountry: "RU",
      egressIp: "194.76.18.22",
      egressProvider: "PQ Hosting",
      baseStatus: "alive",
      latency: 481,
      jitter: 28,
      rxMbps: 0.82,
      txMbps: 0.1,
      score: 56,
      trend: buildTimedSeries(18, 486, 54, 280, 960, 60 * 1000),
    },
    {
      id: "dvpn-ru",
      subscriptionId: "dvpn",
      label: "Russia / VLESS",
      region: "Moscow",
      provider: "DVPN",
      protocol: "VLESS",
      egressCountry: "RU",
      egressIp: "45.67.230.44",
      egressProvider: "Selectel",
      baseStatus: "alive",
      latency: 418,
      jitter: 24,
      rxMbps: 0.88,
      txMbps: 0.08,
      score: 50,
      trend: buildTimedSeries(18, 420, 45, 260, 780, 60 * 1000),
    },
    {
      id: "alexey-bing",
      subscriptionId: "cudy_alexey",
      label: "US Bing / Reality",
      region: "Chicago",
      provider: "SharX",
      protocol: "VLESS + Reality",
      egressCountry: "US",
      egressIp: "198.7.118.21",
      egressProvider: "Vultr",
      baseStatus: "alive",
      latency: 1228,
      jitter: 37,
      rxMbps: 0.12,
      txMbps: 0.03,
      score: 64,
      trend: buildTimedSeries(18, 1240, 135, 420, 1900, 60 * 1000),
    },
    {
      id: "alexey-ebay",
      subscriptionId: "cudy_alexey",
      label: "US Ebay / Reality",
      region: "Dallas",
      provider: "SharX",
      protocol: "VLESS + Reality",
      egressCountry: "US",
      egressIp: "149.28.98.44",
      egressProvider: "Vultr",
      baseStatus: "alive",
      latency: 1034,
      jitter: 33,
      rxMbps: 0.36,
      txMbps: 0.09,
      score: 73,
      trend: buildTimedSeries(18, 1010, 95, 320, 1650, 60 * 1000),
    },
    {
      id: "alexey-ms",
      subscriptionId: "cudy_alexey",
      label: "US Microsoft / Reality",
      region: "Seattle",
      provider: "SharX",
      protocol: "VLESS + Reality",
      egressCountry: "US",
      egressIp: "140.82.61.9",
      egressProvider: "Akamai",
      baseStatus: "alive",
      latency: 1087,
      jitter: 34,
      rxMbps: 0.29,
      txMbps: 0.05,
      score: 71,
      trend: buildTimedSeries(18, 1085, 120, 340, 1700, 60 * 1000),
    },
    {
      id: "alexey-yahoo",
      subscriptionId: "cudy_alexey",
      label: "US Yahoo / Reality",
      region: "Miami",
      provider: "SharX",
      protocol: "VLESS + Reality",
      egressCountry: "US",
      egressIp: "149.28.201.17",
      egressProvider: "Vultr",
      baseStatus: "unstable",
      latency: 0,
      jitter: 0,
      rxMbps: 0,
      txMbps: 0,
      score: 29,
      trend: buildTimedSeries(18, 1280, 260, 0, 2100, 60 * 1000),
    },
  ];
}

function buildSubscriptions() {
  return [
    {
      id: "dvpn",
      name: "DVPN",
      url: "https://hub.dpanel.icu:20196/UBT6qbIPzMa63BX/v9632i8iwk9lefbl",
      format: "3x-ui",
      lastSyncAt: minutesAgo(24),
      enabled: true,
    },
    {
      id: "cudy_alexey",
      name: "cudy_alexey",
      url: "http://vpn.blackfire.icu:2054/sub/n80Q2fCa4acE1jCz",
      format: "sharx",
      lastSyncAt: minutesAgo(26),
      enabled: true,
    },
  ];
}

function buildEvents() {
  return [
    { at: minutesAgo(24), level: "ok", kind: "pool-rebuilt", data: { subscriptions: 2, kept: 7 } },
    { at: minutesAgo(23), level: "ok", kind: "lists-domains-updated", data: {} },
    { at: minutesAgo(23), level: "ok", kind: "lists-ip-updated", data: {} },
    { at: minutesAgo(22), level: "info", kind: "auto-best-selected", data: { nodeId: "dvpn-fi" } },
    { at: minutesAgo(6), level: "info", kind: "direct-overrides-applied", data: { count: 5 } },
  ];
}

function buildBases() {
  return [
    {
      id: "ru-blocked-domains",
      name: "RU blocked domains",
      scope: "proxy",
      kind: "domains",
      sourceType: "remote",
      format: "geosite-dat",
      sourceUrl: "https://github.com/runetfreedom/russia-blocked-geosite/releases/latest/download/geosite-ru-only.dat",
      runtimeMode: "converted-text-ruleset",
      autoUpdate: true,
      updateEveryHours: 12,
      enabled: true,
      lastSyncAt: minutesAgo(23),
      itemCount: 18432,
      preview: ["gemini.google.com", "play.google.com", "login.tailscale.com"],
      mockEntries: ["chatgpt.com", "openai.com", "android.chat.openai.com", "gemini.google.com", "play.google.com", "login.tailscale.com", "claude.ai", "openrouter.ai"],
      note: "runetfreedom RU-only domain source",
    },
    {
      id: "ru-blocked-ip",
      name: "RU blocked IP ranges",
      scope: "proxy",
      kind: "ips",
      sourceType: "remote",
      format: "geoip-dat",
      sourceUrl: "https://github.com/runetfreedom/russia-blocked-geoip/releases/latest/download/geoip-ru-only.dat",
      runtimeMode: "converted-text-ruleset",
      autoUpdate: true,
      updateEveryHours: 12,
      enabled: true,
      lastSyncAt: minutesAgo(23),
      itemCount: 6421,
      preview: ["1.1.1.1/32", "188.114.96.0/20", "104.18.0.0/16"],
      mockEntries: ["1.1.1.1/32", "188.114.96.0/20", "104.18.0.0/16", "172.64.0.0/13"],
      note: "runetfreedom RU-only IP source",
    },
    {
      id: "proxy-domains",
      name: "Manual proxy domains",
      scope: "proxy",
      kind: "domains",
      sourceType: "local",
      format: "plain-list",
      sourceUrl: "",
      runtimeMode: "local-lines",
      autoUpdate: false,
      updateEveryHours: 0,
      enabled: true,
      lastSyncAt: minutesAgo(18),
      entries: ["chatgpt.com", "claude.ai", "openrouter.ai"],
      note: "Manual proxy exceptions that must always use the tunnel",
    },
    {
      id: "proxy-ips",
      name: "Manual proxy IPs",
      scope: "proxy",
      kind: "ips",
      sourceType: "local",
      format: "plain-list",
      sourceUrl: "",
      runtimeMode: "local-lines",
      autoUpdate: false,
      updateEveryHours: 0,
      enabled: true,
      lastSyncAt: minutesAgo(18),
      entries: ["104.18.0.0/16"],
      note: "Manual IP ranges that must always use the tunnel",
    },
    {
      id: "direct-domains",
      name: "Direct override domains",
      scope: "direct",
      kind: "domains",
      sourceType: "local",
      format: "plain-list",
      sourceUrl: "",
      runtimeMode: "local-lines",
      autoUpdate: false,
      updateEveryHours: 0,
      enabled: true,
      lastSyncAt: minutesAgo(6),
      entries: ["youtube.com", "googlevideo.com", "discord.com", "discord.gg", "speedtest.net"],
      note: "Highest priority direct exclusions",
    },
    {
      id: "direct-ips",
      name: "Direct override IPs",
      scope: "direct",
      kind: "ips",
      sourceType: "local",
      format: "plain-list",
      sourceUrl: "",
      runtimeMode: "local-lines",
      autoUpdate: false,
      updateEveryHours: 0,
      enabled: true,
      lastSyncAt: minutesAgo(6),
      entries: ["8.8.8.8/32"],
      note: "Manual direct IP exclusions",
    },
  ];
}

function buildRules() {
  return [
    {
      id: "direct-overrides",
      name: "DIRECT overrides",
      priority: 10,
      action: "DIRECT",
      target: "DIRECT",
      enabled: true,
      locked: false,
      matchMode: "any",
      baseIds: ["direct-domains", "direct-ips"],
      note: "Highest priority. These entries stay direct even if another base would tunnel them.",
    },
    {
      id: "proxy-domains-rule",
      name: "Proxy domains",
      priority: 20,
      action: "PROXY",
      target: "BLOCKED SITES",
      enabled: true,
      locked: false,
      matchMode: "any",
      baseIds: ["ru-blocked-domains", "proxy-domains"],
      note: "Blocked and manual domains use the tunnel.",
    },
    {
      id: "proxy-ip-rule",
      name: "Proxy IP ranges",
      priority: 30,
      action: "PROXY",
      target: "BLOCKED SITES",
      enabled: true,
      locked: false,
      matchMode: "any",
      baseIds: ["ru-blocked-ip", "proxy-ips"],
      note: "Blocked and manual IP ranges use the tunnel.",
    },
    {
      id: "default-direct",
      name: "Default direct fallback",
      priority: 999,
      action: "DIRECT",
      target: "DIRECT",
      enabled: true,
      locked: true,
      matchMode: "final",
      baseIds: [],
      note: "Everything else remains direct by default.",
    },
  ];
}

function buildConnections() {
  return [
    {
      id: "conn-1",
      state: "active",
      sourceKey: "Inner",
      sourceLabel: "Inner",
      host: "1.1.1.1:443",
      inbound: "Inner",
      network: "tcp",
      rule: "RuleSet: RU-BLOCKED-IP",
      chains: ["BLOCKED SITES", "AUTO BEST", "🇫🇮 VLESS - Финляндия"],
      dlSpeedBps: 232,
      ulSpeedBps: 36,
      dlBytes: 234 * 1024,
      ulBytes: 121 * 1024,
      connectedAt: minutesAgo(62),
    },
    {
      id: "conn-2",
      state: "active",
      sourceKey: "192.168.10.123",
      sourceLabel: "192.168.10.123",
      host: "android.chat.openai.com:443",
      inbound: "Redir",
      network: "tcp",
      rule: "RuleSet: PROXY-DOMAINS",
      chains: ["BLOCKED SITES", "AUTO BEST", "🇫🇮 VLESS - Финляндия"],
      dlSpeedBps: 0,
      ulSpeedBps: 0,
      dlBytes: Math.round(1.62 * 1024 * 1024),
      ulBytes: Math.round(11.6 * 1024),
      connectedAt: minutesAgo(6),
    },
    {
      id: "conn-3",
      state: "active",
      sourceKey: "192.168.10.123",
      sourceLabel: "192.168.10.123",
      host: "gemini.google.com:443",
      inbound: "Redir",
      network: "tcp",
      rule: "RuleSet: RU-BLOCKED-DOMAINS",
      chains: ["BLOCKED SITES", "AUTO BEST", "🇫🇮 VLESS - Финляндия"],
      dlSpeedBps: 0,
      ulSpeedBps: 0,
      dlBytes: Math.round(5.47 * 1024),
      ulBytes: Math.round(6.5 * 1024),
      connectedAt: minutesAgo(3),
    },
    {
      id: "conn-4",
      state: "active",
      sourceKey: "192.168.10.140",
      sourceLabel: "192.168.10.140",
      host: "login.tailscale.com:443",
      inbound: "Redir",
      network: "tcp",
      rule: "RuleSet: RU-BLOCKED-DOMAINS",
      chains: ["BLOCKED SITES", "AUTO BEST", "🇫🇮 VLESS - Финляндия"],
      dlSpeedBps: 0,
      ulSpeedBps: 0,
      dlBytes: Math.round(8.91 * 1024),
      ulBytes: Math.round(3.46 * 1024),
      connectedAt: minutesAgo(4),
    },
    {
      id: "conn-5",
      state: "active",
      sourceKey: "192.168.10.123",
      sourceLabel: "192.168.10.123",
      host: "play.google.com:443",
      inbound: "Redir",
      network: "tcp",
      rule: "RuleSet: RU-BLOCKED-DOMAINS",
      chains: ["BLOCKED SITES", "AUTO BEST", "🇫🇮 VLESS - Финляндия"],
      dlSpeedBps: 0,
      ulSpeedBps: 0,
      dlBytes: Math.round(3.04 * 1024),
      ulBytes: Math.round(6.42 * 1024),
      connectedAt: minutesAgo(2),
    },
    {
      id: "conn-6",
      state: "active",
      sourceKey: "192.168.10.140",
      sourceLabel: "192.168.10.140",
      host: "102.67.167.245:3478",
      inbound: "Tun",
      network: "udp",
      rule: "Match",
      chains: ["DIRECT"],
      dlSpeedBps: 0,
      ulSpeedBps: 40,
      dlBytes: 64,
      ulBytes: 120,
      connectedAt: minutesAgo(2),
    },
    {
      id: "conn-7",
      state: "active",
      sourceKey: "192.168.10.123",
      sourceLabel: "192.168.10.123",
      host: "24112.ms.vk.com:443",
      inbound: "Redir",
      network: "tcp",
      rule: "Match",
      chains: ["DIRECT"],
      dlSpeedBps: 0,
      ulSpeedBps: 0,
      dlBytes: Math.round(10.7 * 1024),
      ulBytes: Math.round(37.2 * 1024),
      connectedAt: minutesAgo(5),
    },
    {
      id: "conn-8",
      state: "active",
      sourceKey: "192.168.1.103",
      sourceLabel: "192.168.1.103",
      host: "accounts.google.com:443",
      inbound: "Redir",
      network: "tcp",
      rule: "Match",
      chains: ["DIRECT"],
      dlSpeedBps: 0,
      ulSpeedBps: 0,
      dlBytes: Math.round(4.69 * 1024),
      ulBytes: Math.round(6.93 * 1024),
      connectedAt: minutesAgo(1),
    },
    {
      id: "conn-9",
      state: "active",
      sourceKey: "Inner",
      sourceLabel: "Inner",
      host: "8.8.8.8:443",
      inbound: "Inner",
      network: "tcp",
      rule: "Match",
      chains: ["DIRECT"],
      dlSpeedBps: 347,
      ulSpeedBps: 127,
      dlBytes: Math.round(84.5 * 1024),
      ulBytes: Math.round(30.6 * 1024),
      connectedAt: minutesAgo(24),
    },
    {
      id: "conn-10",
      state: "active",
      sourceKey: "192.168.1.103",
      sourceLabel: "192.168.1.103",
      host: "docs.google.com:443",
      inbound: "Redir",
      network: "tcp",
      rule: "Match",
      chains: ["DIRECT"],
      dlSpeedBps: 0,
      ulSpeedBps: 0,
      dlBytes: Math.round(14.3 * 1024),
      ulBytes: Math.round(177 * 1024),
      connectedAt: minutesAgo(2),
    },
    {
      id: "conn-11",
      state: "active",
      sourceKey: "192.168.10.140",
      sourceLabel: "192.168.10.140",
      host: "clients4.google.com:443",
      inbound: "Redir",
      network: "tcp",
      rule: "Match",
      chains: ["DIRECT"],
      dlSpeedBps: 0,
      ulSpeedBps: 0,
      dlBytes: Math.round(4.2 * 1024),
      ulBytes: Math.round(6.18 * 1024),
      connectedAt: minutesAgo(3),
    },
    {
      id: "conn-12",
      state: "active",
      sourceKey: "192.168.10.123",
      sourceLabel: "192.168.10.123",
      host: "oauthaccountmanager.googleapis.com:443",
      inbound: "Redir",
      network: "tcp",
      rule: "Match",
      chains: ["DIRECT"],
      dlSpeedBps: 0,
      ulSpeedBps: 0,
      dlBytes: Math.round(4.5 * 1024),
      ulBytes: Math.round(4.92 * 1024),
      connectedAt: minutesAgo(1),
    },
    {
      id: "conn-13",
      state: "closed",
      sourceKey: "192.168.10.123",
      sourceLabel: "192.168.10.123",
      host: "imap.gmail.com:993",
      inbound: "Redir",
      network: "tcp",
      rule: "Match",
      chains: ["DIRECT"],
      dlSpeedBps: 0,
      ulSpeedBps: 0,
      dlBytes: Math.round(7.33 * 1024),
      ulBytes: Math.round(2.12 * 1024),
      connectedAt: minutesAgo(28),
    },
    {
      id: "conn-14",
      state: "closed",
      sourceKey: "192.168.10.140",
      sourceLabel: "192.168.10.140",
      host: "metrika.yandex.ru:443",
      inbound: "Redir",
      network: "tcp",
      rule: "Match",
      chains: ["DIRECT"],
      dlSpeedBps: 0,
      ulSpeedBps: 0,
      dlBytes: Math.round(6.83 * 1024),
      ulBytes: Math.round(2.77 * 1024),
      connectedAt: minutesAgo(60),
    },
    {
      id: "conn-15",
      state: "closed",
      sourceKey: "Inner",
      sourceLabel: "Inner",
      host: "188.114.96.1:443",
      inbound: "Redir",
      network: "tcp",
      rule: "RuleSet: RU-BLOCKED-IP",
      chains: ["BLOCKED SITES", "AUTO BEST", "🇫🇮 VLESS - Финляндия"],
      dlSpeedBps: 0,
      ulSpeedBps: 0,
      dlBytes: Math.round(3.46 * 1024),
      ulBytes: Math.round(10.3 * 1024),
      connectedAt: minutesAgo(28),
    },
    {
      id: "conn-16",
      state: "closed",
      sourceKey: "192.168.1.103",
      sourceLabel: "192.168.1.103",
      host: "api.vk.com:443",
      inbound: "Redir",
      network: "tcp",
      rule: "Match",
      chains: ["DIRECT"],
      dlSpeedBps: 0,
      ulSpeedBps: 0,
      dlBytes: Math.round(136 * 1024),
      ulBytes: Math.round(92.7 * 1024),
      connectedAt: minutesAgo(65),
    },
    {
      id: "conn-17",
      state: "closed",
      sourceKey: "192.168.10.140",
      sourceLabel: "192.168.10.140",
      host: "alive.github.com:443",
      inbound: "Redir",
      network: "tcp",
      rule: "Match",
      chains: ["DIRECT"],
      dlSpeedBps: 0,
      ulSpeedBps: 0,
      dlBytes: Math.round(4.14 * 1024),
      ulBytes: Math.round(3.6 * 1024),
      connectedAt: minutesAgo(11),
    },
    {
      id: "conn-18",
      state: "closed",
      sourceKey: "192.168.10.123",
      sourceLabel: "192.168.10.123",
      host: "mtalk.google.com:5228",
      inbound: "Redir",
      network: "tcp",
      rule: "Match",
      chains: ["DIRECT"],
      dlSpeedBps: 0,
      ulSpeedBps: 0,
      dlBytes: Math.round(14.2 * 1024),
      ulBytes: Math.round(1.64 * 1024),
      connectedAt: minutesAgo(61),
    },
  ];
}

function buildTools() {
  return {
    directExit: {
      ip: "95.84.153.44",
      countryCode: "RU",
      provider: "T2 Russia",
      label: "ISP direct exit",
    },
    routeProbe: {
      status: "idle",
      error: "",
      lastQuery: "",
      lastCheckedAt: null,
      result: null,
    },
    ruleProbe: {
      status: "idle",
      error: "",
      lastQuery: "",
      lastCheckedAt: null,
      result: null,
    },
    dnsProbe: {
      status: "idle",
      error: "",
      lastQuery: "",
      lastCheckedAt: null,
      result: null,
    },
    latencyProbe: {
      status: "idle",
      error: "",
      lastQuery: "",
      lastCheckedAt: null,
      results: [],
    },
  };
}

const mockDnsCatalog = {
  "chatgpt.com": {
    a: ["104.18.33.45", "104.18.34.45"],
    aaaa: ["2606:4700::6812:212d", "2606:4700::6812:222d"],
  },
  "openai.com": {
    a: ["104.18.33.45", "172.64.154.211"],
    aaaa: ["2606:4700:4400::ac40:9ad3"],
  },
  "android.chat.openai.com": {
    a: ["104.18.33.45"],
    aaaa: ["2606:4700::6812:212d"],
  },
  "claude.ai": {
    a: ["104.18.0.44", "104.18.1.44"],
    aaaa: ["2606:4700::6812:2c"],
  },
  "gemini.google.com": {
    a: ["142.251.1.102", "142.251.1.113"],
    aaaa: ["2a00:1450:4010:c07::66"],
  },
  "youtube.com": {
    a: ["142.250.150.136", "142.250.150.190"],
    aaaa: ["2a00:1450:4010:c07::88"],
  },
  "speedtest.net": {
    a: ["151.101.194.219", "151.101.2.219"],
    aaaa: ["2a04:4e42:2f::731"],
  },
  "discord.com": {
    a: ["162.159.135.234", "162.159.136.234"],
    aaaa: ["2606:4700::6810:87ea"],
  },
  "login.tailscale.com": {
    a: ["76.76.21.21"],
    aaaa: ["2a00:1450:4010:c07::8c"],
  },
};

function getBaseEntryCount(base) {
  return base.sourceType === "local" ? (base.entries?.length || 0) : base.itemCount || 0;
}

function isBaseEffective(base) {
  return base.enabled && getBaseEntryCount(base) > 0;
}

function normalizeAddressInput(value) {
  const raw = String(value || "").trim();
  if (!raw) {
    return null;
  }

  try {
    const withProtocol = /^[a-z]+:\/\//i.test(raw) ? raw : `https://${raw}`;
    const url = new URL(withProtocol);
    const host = (url.hostname || "").trim().toLowerCase();
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

function isIpv4Address(value) {
  if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(value)) {
    return false;
  }
  return value.split(".").every((part) => Number(part) >= 0 && Number(part) <= 255);
}

function ipv4ToInt(value) {
  return value
    .split(".")
    .map((part) => Number(part))
    .reduce((sum, part) => (sum << 8) + part, 0) >>> 0;
}

function ipv4MatchesEntry(ip, entry) {
  if (!isIpv4Address(ip)) {
    return false;
  }

  const normalizedEntry = String(entry || "").trim();
  if (!normalizedEntry) {
    return false;
  }

  if (!normalizedEntry.includes("/")) {
    return ip === normalizedEntry;
  }

  const [baseIp, prefixRaw] = normalizedEntry.split("/");
  const prefix = Number(prefixRaw);
  if (!isIpv4Address(baseIp) || !Number.isInteger(prefix) || prefix < 0 || prefix > 32) {
    return false;
  }

  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  return (ipv4ToInt(ip) & mask) === (ipv4ToInt(baseIp) & mask);
}

function domainMatchesEntry(host, entry) {
  const normalizedHost = String(host || "").trim().toLowerCase();
  const normalizedEntry = String(entry || "").trim().toLowerCase();
  if (!normalizedHost || !normalizedEntry) {
    return false;
  }
  return normalizedHost === normalizedEntry || normalizedHost.endsWith(`.${normalizedEntry}`);
}

function getBaseMatchers(base) {
  if (!base) {
    return [];
  }
  if (base.sourceType === "local") {
    return base.entries || [];
  }
  return base.mockEntries || base.preview || [];
}

function baseMatchesAddress(base, normalizedAddress) {
  if (!base || !base.enabled || !normalizedAddress) {
    return false;
  }
  const entries = getBaseMatchers(base);
  if (base.kind === "domains" && normalizedAddress.kind === "domain") {
    return entries.some((entry) => domainMatchesEntry(normalizedAddress.host, entry));
  }
  if (base.kind === "ips" && normalizedAddress.kind === "ip") {
    return entries.some((entry) => ipv4MatchesEntry(normalizedAddress.host, entry));
  }
  return false;
}

function hashString(value) {
  return [...String(value || "")].reduce((sum, char) => (sum * 33 + char.charCodeAt(0)) >>> 0, 5381);
}

function clampLatency(value) {
  return Math.max(6, Math.min(2500, Math.round(value)));
}

function getMatchingBases(state, normalizedAddress) {
  if (!normalizedAddress) {
    return [];
  }
  return state.ruleEngine.bases.filter((base) => base.enabled && baseMatchesAddress(base, normalizedAddress));
}

function summarizeBaseHits(bases) {
  const filteredBases = bases.filter(Boolean);
  const directBases = filteredBases.filter((base) => base.scope === "direct");
  const proxyBases = filteredBases.filter((base) => base.scope === "proxy");
  return {
    classification: directBases.length ? "direct" : proxyBases.length ? "proxy" : "none",
    baseNames: filteredBases.map((base) => base.name),
    directBaseNames: directBases.map((base) => base.name),
    proxyBaseNames: proxyBases.map((base) => base.name),
  };
}

function resolveRuleMatch(state, normalizedAddress) {
  const orderedRules = [...state.ruleEngine.rules]
    .filter((rule) => rule.enabled)
    .sort((left, right) => left.priority - right.priority);
  const fallbackRule = orderedRules.find((rule) => !rule.baseIds.length) || null;

  for (const rule of orderedRules) {
    if (!rule.baseIds.length) {
      continue;
    }
    const matchedBases = rule.baseIds
      .map((baseId) => state.ruleEngine.bases.find((base) => base.id === baseId))
      .filter(Boolean)
      .filter((base) => baseMatchesAddress(base, normalizedAddress));

    if (matchedBases.length) {
      return {
        rule,
        matchedBases,
        matchedBaseSummary: summarizeBaseHits(matchedBases),
        basis: "rule-match",
      };
    }
  }

  return {
    rule: fallbackRule,
    matchedBases: [],
    matchedBaseSummary: summarizeBaseHits([]),
    basis: "fallback",
  };
}

function buildMockDnsAnswers(host) {
  const directMatch = mockDnsCatalog[host];
  if (directMatch) {
    return directMatch;
  }

  const seed = hashString(host);
  const firstA = `${23 + (seed % 170)}.${(seed >> 4) % 255}.${(seed >> 9) % 255}.${20 + ((seed >> 13) % 220)}`;
  const secondA = `${31 + ((seed >> 2) % 150)}.${(seed >> 7) % 255}.${(seed >> 11) % 255}.${40 + ((seed >> 17) % 180)}`;
  const firstAaaa = `2a0${seed % 9}:1450:${((seed >> 3) % 4095).toString(16)}::${((seed >> 8) % 65535).toString(16)}`;
  return {
    a: [firstA, secondA],
    aaaa: [firstAaaa],
  };
}

function resolveRouteDecision(state, normalizedAddress) {
  const snapshot = deriveSnapshot(state);
  const ruleMatch = resolveRuleMatch(state, normalizedAddress);
  const fallbackRule = ruleMatch.rule;

  if (state.routing.mode === "direct") {
    return {
      snapshot,
      routeKind: "direct",
      basis: "mode-direct",
      rule: fallbackRule,
      matchedBases: [],
      exit: state.tools.directExit,
      matchedNode: null,
    };
  }

  if (state.routing.mode === "global" && snapshot.derived.activeProxy) {
    return {
      snapshot,
      routeKind: "proxy",
      basis: "mode-global",
      rule: null,
      matchedBases: [],
      exit: {
        ip: snapshot.derived.activeProxy.egressIp,
        countryCode: snapshot.derived.activeProxy.egressCountry,
        provider: snapshot.derived.activeProxy.egressProvider,
      },
      matchedNode: snapshot.derived.activeProxy,
    };
  }

  if (ruleMatch.matchedBases.length) {
    if (ruleMatch.rule.action === "PROXY" && state.routing.blockedTrafficTarget !== "direct" && snapshot.derived.activeProxy) {
      return {
        snapshot,
        routeKind: "proxy",
        basis: "rule-match",
        rule: ruleMatch.rule,
        matchedBases: ruleMatch.matchedBases,
        exit: {
          ip: snapshot.derived.activeProxy.egressIp,
          countryCode: snapshot.derived.activeProxy.egressCountry,
          provider: snapshot.derived.activeProxy.egressProvider,
        },
        matchedNode: snapshot.derived.activeProxy,
      };
    }

    return {
      snapshot,
      routeKind: "direct",
      basis: ruleMatch.rule.action === "PROXY" ? "proxy-bypassed" : "rule-match",
      rule: ruleMatch.rule,
      matchedBases: ruleMatch.matchedBases,
      exit: state.tools.directExit,
      matchedNode: null,
    };
  }

  return {
    snapshot,
    routeKind: "direct",
    basis: "default-direct",
    rule: fallbackRule,
    matchedBases: [],
    exit: state.tools.directExit,
    matchedNode: null,
  };
}

function resolveVisitProfile(state, value) {
  const normalizedAddress = normalizeAddressInput(value);
  if (!normalizedAddress) {
    return null;
  }

  const decision = resolveRouteDecision(state, normalizedAddress);
  const matchedNode =
    decision.matchedNode ||
    decision.snapshot.derived.eligibleNodes.find((node) => node.egressIp === decision.exit.ip) ||
    null;
  const subscription = matchedNode
    ? decision.snapshot.derived.subscriptionSummaries.find((item) => item.id === matchedNode.subscriptionId) || null
    : null;

  return {
    input: value,
    address: normalizedAddress.host,
    addressKind: normalizedAddress.kind,
    routeKind: decision.routeKind,
    basis: decision.basis,
    exitIp: decision.exit.ip,
    exitCountry: decision.exit.countryCode,
    exitProvider: decision.exit.provider,
    matchedRuleName: decision.rule?.name || null,
    matchedBaseNames: decision.matchedBases.map((base) => base.name),
    nodeMatched: Boolean(matchedNode),
    nodeLabel: matchedNode?.label || null,
    nodeId: matchedNode?.id || null,
    subscriptionName: subscription?.name || null,
    warning:
      decision.routeKind === "proxy" && !matchedNode
        ? "proxy-exit-not-found"
        : decision.routeKind === "direct"
          ? "not-from-subscription"
          : null,
  };
}

function buildLatencyResult(state, value) {
  const normalizedAddress = normalizeAddressInput(value);
  if (!normalizedAddress) {
    return {
      input: value,
      address: String(value || "").trim(),
      addressKind: "invalid",
      routeKind: "unknown",
      matchedRuleName: null,
      exitCountry: null,
      exitProvider: null,
      icmpMs: null,
      tcpMs: null,
      tlsMs: null,
      jitterMs: null,
      packetLoss: 100,
      status: "invalid",
    };
  }

  const visitProfile = resolveVisitProfile(state, value);
  const seed = hashString(normalizedAddress.host);
  const routeLatencyBase =
    visitProfile.routeKind === "proxy"
      ? resolveRouteDecision(state, normalizedAddress).snapshot.derived.activeProxy?.latency || 820
      : 22 + (seed % 35);
  const icmpBlocked = normalizedAddress.kind === "domain" && seed % 4 === 0;
  const jitterMs = visitProfile.routeKind === "proxy" ? 12 + (seed % 34) : 2 + (seed % 11);
  const packetLoss = visitProfile.routeKind === "proxy" ? seed % 6 : seed % 3 ? 0 : 1;

  return {
    input: value,
    address: normalizedAddress.host,
    addressKind: normalizedAddress.kind,
    routeKind: visitProfile.routeKind,
    matchedRuleName: visitProfile.matchedRuleName,
    exitCountry: visitProfile.exitCountry,
    exitProvider: visitProfile.exitProvider,
    icmpMs: icmpBlocked ? null : clampLatency(routeLatencyBase + (seed % 17) - 8),
    tcpMs: clampLatency(routeLatencyBase + 14 + (seed % 26)),
    tlsMs: clampLatency(routeLatencyBase + 28 + (seed % 34)),
    jitterMs,
    packetLoss,
    status: "ok",
  };
}

function resolveRuleProbe(state, value) {
  const normalizedAddress = normalizeAddressInput(value);
  if (!normalizedAddress) {
    return null;
  }

  const ruleMatch = resolveRuleMatch(state, normalizedAddress);
  const routeProfile = resolveVisitProfile(state, value);
  return {
    input: value,
    address: normalizedAddress.host,
    addressKind: normalizedAddress.kind,
    matchedRuleName: ruleMatch.rule?.name || null,
    matchedRulePriority: ruleMatch.rule?.priority || null,
    matchedAction: ruleMatch.rule?.action || null,
    matchedTarget: ruleMatch.rule?.target || null,
    matchedBaseNames: ruleMatch.matchedBases.map((base) => base.name),
    basis: ruleMatch.basis,
    finalRouteKind: routeProfile?.routeKind || "direct",
    finalExitIp: routeProfile?.exitIp || state.tools.directExit.ip,
    finalExitCountry: routeProfile?.exitCountry || state.tools.directExit.countryCode,
  };
}

function buildDnsRecordResult(state, family, value) {
  const ipKind = family === "A" ? "ip" : "ipv6";
  const normalizedAddress = {
    raw: value,
    host: value,
    kind: ipKind,
  };
  const baseHits = family === "A" ? getMatchingBases(state, { ...normalizedAddress, kind: "ip" }) : [];
  const ruleMatch = family === "A" ? resolveRuleMatch(state, { ...normalizedAddress, kind: "ip" }) : null;
  const summary = summarizeBaseHits(baseHits);

  return {
    family,
    value,
    classification: summary.classification,
    matchedBaseNames: summary.baseNames,
    matchedRuleName: ruleMatch?.matchedBases?.length ? ruleMatch.rule?.name || null : null,
  };
}

function resolveDnsProbe(state, value) {
  const normalizedAddress = normalizeAddressInput(value);
  if (!normalizedAddress) {
    return null;
  }

  if (normalizedAddress.kind !== "domain") {
    return {
      input: value,
      address: normalizedAddress.host,
      status: "ip-literal",
      routeKind: resolveVisitProfile(state, value)?.routeKind || "direct",
      resolverName: null,
      resolverEndpoint: null,
      upstreamName: null,
      matchedRuleName: null,
      matchedDomainBaseNames: [],
      records: [],
    };
  }

  const routeProfile = resolveVisitProfile(state, value);
  const ruleMatch = resolveRuleMatch(state, normalizedAddress);
  const domainBaseHits = getMatchingBases(state, normalizedAddress);
  const dnsAnswers = buildMockDnsAnswers(normalizedAddress.host);
  const records = [
    ...dnsAnswers.a.map((record) => buildDnsRecordResult(state, "A", record)),
    ...dnsAnswers.aaaa.map((record) => buildDnsRecordResult(state, "AAAA", record)),
  ];

  return {
    input: value,
    address: normalizedAddress.host,
    status: "ok",
    routeKind: routeProfile?.routeKind || "direct",
    resolverName: "AdGuard Home",
    resolverEndpoint: "192.168.10.1",
    upstreamName:
      routeProfile?.routeKind === "proxy" ? "Cloudflare DoH via tunnel" : "System upstream via WAN",
    matchedRuleName: ruleMatch.rule?.name || null,
    matchedDomainBaseNames: domainBaseHits.map((base) => base.name),
    records,
  };
}

export function createState() {
  return {
    meta: {
      mockMode: true,
      panelVersion: "0.2",
      updatedAt: new Date().toISOString(),
      bootAt: minutesAgo(310),
    },
    settings: readSavedSettings({
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
      mihomoMemoryLimitMiB: 256,
      mihomoMemoryLimitMaxMiB: 512,
    }),
    routing: {
      mode: "smart",
      blockedTrafficTarget: "auto",
      manualServerId: "dvpn-fi",
      listMode: "ru-only",
      directOverrides: ["youtube.com", "googlevideo.com", "discord.com", "discord.gg", "speedtest.net"],
      proxyLists: ["RU blocked domains", "RU blocked IP ranges"],
      autoSelection: {
        metric: "latency",
        intervalMinutes: 10,
        stickyBest: true,
        minScore: 55,
        switchTolerance: 120,
        currentNodeId: null,
      },
    },
    automation: {
      enabled: true,
      subscriptionRefreshMinutes: 360,
      logCleanupMinutes: 5,
      release: {
        checkMinutes: 30,
        uiAutoUpdate: true,
        bridgeAutoUpdate: true,
        manifestUrl: "https://github.com/BlackF1re/mission-control/releases/latest/download/mission-control-manifest.json",
        currentUiVersion: MISSION_CONTROL_VERSION,
        currentBridgeVersion: MISSION_CONTROL_VERSION,
        latestVersion: MISSION_CONTROL_VERSION,
        latestUiVersion: MISSION_CONTROL_VERSION,
        latestBridgeVersion: MISSION_CONTROL_VERSION,
        latestTag: `v${MISSION_CONTROL_VERSION}`,
        latestPublishedAt: minutesAgo(180),
        latestReleaseUrl: "https://github.com/BlackF1re/mission-control/releases/latest",
        latestReleaseName: `Mission Control ${MISSION_CONTROL_VERSION}`,
        latestChangelog: "- Initial semver release\n- Manual update checks with changelog preview\n- Version is shown in the panel header",
        updateAvailable: false,
        lastCheckedAt: minutesAgo(35),
        lastAppliedAt: minutesAgo(180),
        lastStatus: "ok",
        lastError: "",
      },
      scheduler: {
        updatedAt: minutesAgo(12),
        jobs: {},
      },
    },
    subscriptions: {
      items: buildSubscriptions(),
      egressPolicy: {
        blockedCountries: ["RU"],
        allowUnknown: false,
      },
      lastReprocessAt: minutesAgo(24),
    },
    health: {
      tunnelState: "healthy",
      apiState: "connected",
      activeConnections: 52,
      memoryMiB: 63.4,
      memoryBudgetMiB: 256,
      downloadMbps: 2.7,
      uploadMbps: 0.03,
      trafficScope: "tunnel",
      blockedHitsPerMin: 18,
      directHitsPerMin: 146,
      unresolvedCount: 1,
    },
    graphs: {
      throughputDown: buildTimedSeries(24, 2.6, 0.55, 0.2, 8.5, 2000),
      throughputUp: buildTimedSeries(24, 0.12, 0.06, 0.01, 0.8, 2000),
      latencyAverage: buildTimedSeries(24, 780, 130, 420, 1300, 2000),
      blockedHits: buildTimedSeries(24, 17, 4.2, 5, 34, 2000),
    },
    ruleEngine: {
      bases: buildBases(),
      rules: buildRules(),
    },
    connections: {
      items: buildConnections(),
      paused: false,
    },
    tools: buildTools(),
    nodes: buildNodes(),
    events: buildEvents(),
    actions: {
      refreshSubscriptions: false,
      retestServers: false,
      updateLists: false,
      restartTunnel: false,
      reprocessSubscriptions: false,
    },
    counters: {
      addedSubscriptions: 0,
      addedBases: 0,
      addedRules: 0,
    },
  };
}

function candidateSort(nodes, metric) {
  const items = [...nodes];
  if (metric === "speed") {
    items.sort((left, right) => right.rxMbps - left.rxMbps || left.latency - right.latency);
    return items;
  }
  if (metric === "hybrid") {
    items.sort((left, right) => right.score - left.score || left.latency - right.latency);
    return items;
  }
  items.sort((left, right) => left.latency - right.latency || right.score - left.score);
  return items;
}

function isUnknownEgress(code) {
  const normalized = String(code || "").trim().toUpperCase();
  return !/^[A-Z]{2}$/.test(normalized);
}

function getNodePolicyReason(node, blockedCountries, allowUnknown) {
  const countryCode = String(node?.egressCountry || "").trim().toUpperCase();
  if (blockedCountries.has(countryCode)) {
    return "egress-country";
  }
  if (node?.inPool === false) {
    return "unknown-egress";
  }
  if (!allowUnknown && isUnknownEgress(countryCode)) {
    return "unknown-egress";
  }
  return null;
}

function scoreToleranceFromSwitchTolerance(tolerance) {
  if (tolerance <= 60) {
    return 4;
  }
  if (tolerance <= 120) {
    return 7;
  }
  return 10;
}

function percentToleranceFromSwitchTolerance(tolerance) {
  if (tolerance <= 60) {
    return 0.1;
  }
  if (tolerance <= 120) {
    return 0.18;
  }
  return 0.25;
}

function isCandidateBetter(best, current, metric, tolerance) {
  if (!best) {
    return false;
  }
  if (!current) {
    return true;
  }
  if (best.id === current.id) {
    return false;
  }

  const percentTolerance = percentToleranceFromSwitchTolerance(tolerance);
  const scoreTolerance = scoreToleranceFromSwitchTolerance(tolerance);

  if (metric === "speed") {
    const currentRx = Math.max(current.rxMbps || 0.01, 0.01);
    const speedGain = (best.rxMbps - current.rxMbps) / currentRx;
    return best.score - current.score >= scoreTolerance || speedGain >= percentTolerance;
  }

  if (metric === "hybrid") {
    const currentLatency = Math.max(current.latency || 1, 1);
    const latencyGain = currentLatency - best.latency;
    const latencyPercentGain = latencyGain / currentLatency;
    return (
      best.score - current.score >= scoreTolerance ||
      latencyGain >= tolerance ||
      latencyPercentGain >= percentTolerance
    );
  }

  const currentLatency = Math.max(current.latency || 1, 1);
  const latencyGain = currentLatency - best.latency;
  const latencyPercentGain = latencyGain / currentLatency;
  return latencyGain >= tolerance || latencyPercentGain >= percentTolerance;
}

function resolveBestAutoNode(state, usableNodes) {
  const autoCandidates = candidateSort(
    usableNodes.filter((node) => node.score >= state.routing.autoSelection.minScore),
    state.routing.autoSelection.metric,
  );
  const bestCandidate = autoCandidates[0] || null;

  if (!bestCandidate) {
    state.routing.autoSelection.currentNodeId = null;
    return null;
  }

  const current = autoCandidates.find((node) => node.id === state.routing.autoSelection.currentNodeId) || null;
  if (!current) {
    state.routing.autoSelection.currentNodeId = bestCandidate.id;
    return bestCandidate;
  }

  if (!state.routing.autoSelection.stickyBest) {
    state.routing.autoSelection.currentNodeId = bestCandidate.id;
    return bestCandidate;
  }

  if (isCandidateBetter(bestCandidate, current, state.routing.autoSelection.metric, state.routing.autoSelection.switchTolerance)) {
    state.routing.autoSelection.currentNodeId = bestCandidate.id;
    return bestCandidate;
  }

  return current;
}

function buildNodeSummary(node) {
  return {
    id: node.id,
    label: node.label,
    region: node.region,
    provider: node.provider,
    egressCountry: node.egressCountry || "??",
    latency: node.latency,
    status: node.baseStatus,
  };
}

function generatePolicyReport(state) {
  const blockedCountries = new Set(state.subscriptions.egressPolicy.blockedCountries);
  const allowUnknown = state.subscriptions.egressPolicy.allowUnknown;
  const bySubscription = state.subscriptions.items.map((subscription) => {
    const nodes = state.nodes.filter((node) => node.subscriptionId === subscription.id);
    const used = nodes.filter((node) => !getNodePolicyReason(node, blockedCountries, allowUnknown));
    const rejected = nodes
      .filter((node) => getNodePolicyReason(node, blockedCountries, allowUnknown))
      .map((node) => ({
        ...node,
        policyReason: getNodePolicyReason(node, blockedCountries, allowUnknown),
      }));
    return {
      subscriptionId: subscription.id,
      subscriptionName: subscription.name,
      used: used.map(buildNodeSummary),
      rejected: rejected.map((node) => ({
        ...buildNodeSummary(node),
        reason: node.policyReason,
      })),
    };
  });

  return {
    at: state.subscriptions.lastReprocessAt,
    blockedCountries: [...blockedCountries],
    totals: {
      discovered: state.nodes.length,
      used: bySubscription.reduce((sum, subscription) => sum + subscription.used.length, 0),
      rejected: bySubscription.reduce((sum, subscription) => sum + subscription.rejected.length, 0),
    },
    bySubscription,
  };
}

function deriveRuleEngine(state) {
  const bases = state.ruleEngine.bases.map((base) => ({
    ...base,
    entryCount: getBaseEntryCount(base),
    isRemote: base.sourceType === "remote",
    isLocal: base.sourceType === "local",
    hasEntries: getBaseEntryCount(base) > 0,
  }));
  const baseMap = new Map(bases.map((base) => [base.id, base]));

  const rules = [...state.ruleEngine.rules]
    .sort((left, right) => left.priority - right.priority)
    .map((rule) => {
      const linkedBases = rule.baseIds.map((id) => baseMap.get(id)).filter(Boolean);
      const activeBases = linkedBases.filter(isBaseEffective);
      return {
        ...rule,
        linkedBases,
        activeBases,
        activeBaseCount: activeBases.length,
        itemCount: activeBases.reduce((sum, base) => sum + getBaseEntryCount(base), 0),
      };
    });

  const proxyBaseNames = [
    ...new Set(
      rules
        .filter((rule) => rule.enabled && rule.action === "PROXY")
        .flatMap((rule) => rule.activeBases.map((base) => base.name)),
    ),
  ];

  const directEntries = rules
    .filter((rule) => rule.enabled && rule.action === "DIRECT")
    .flatMap((rule) => rule.activeBases)
    .filter((base) => base.kind === "domains")
    .flatMap((base) => base.entries || []);

  const directIpEntries = rules
    .filter((rule) => rule.enabled && rule.action === "DIRECT")
    .flatMap((rule) => rule.activeBases)
    .filter((base) => base.kind === "ips")
    .flatMap((base) => base.entries || []);

  return {
    bases,
    rules,
    proxyBaseNames,
    directEntries,
    directIpEntries,
  };
}

function deriveConnections(state) {
  const items = state.connections.items.map((connection) => ({
    ...connection,
    chainLabel: connection.chains.join(" / "),
  }));
  const activeItems = items.filter((connection) => connection.state === "active");
  const closedItems = items.filter((connection) => connection.state === "closed");

  return {
    items,
    paused: state.connections.paused,
    activeCount: activeItems.length,
    closedCount: closedItems.length,
    scopeOptions: ["All", ...new Set(items.map((connection) => connection.sourceKey))],
    totals: {
      dlSpeedBps: activeItems.reduce((sum, connection) => sum + connection.dlSpeedBps, 0),
      ulSpeedBps: activeItems.reduce((sum, connection) => sum + connection.ulSpeedBps, 0),
      dlBytes: items.reduce((sum, connection) => sum + connection.dlBytes, 0),
      ulBytes: items.reduce((sum, connection) => sum + connection.ulBytes, 0),
      memoryMiB: state.health.memoryMiB,
    },
  };
}

export function deriveSnapshot(state) {
  const blockedCountries = new Set(state.subscriptions.egressPolicy.blockedCountries);
  const allowUnknown = state.subscriptions.egressPolicy.allowUnknown;
  const discoveredNodes = state.nodes.map((node) => ({
    ...node,
    rejectionReason: getNodePolicyReason(node, blockedCountries, allowUnknown),
    egressBlocked: Boolean(getNodePolicyReason(node, blockedCountries, allowUnknown)),
  }));

  const eligibleNodes = discoveredNodes.filter((node) => !node.egressBlocked);
  const usableNodes = eligibleNodes.filter((node) => node.baseStatus !== "unstable" && node.latency > 0);
  const bestAutoNode = resolveBestAutoNode(state, usableNodes);

  const activeProxy =
    state.routing.mode === "direct"
      ? null
      : state.routing.blockedTrafficTarget === "manual"
        ? usableNodes.find((node) => node.id === state.routing.manualServerId) || bestAutoNode
        : state.routing.blockedTrafficTarget === "direct" && state.routing.mode === "smart"
          ? null
          : bestAutoNode;

  const renderedNodes = discoveredNodes.map((node) => {
    let availability = node.baseStatus;
    let rejectionReason = node.rejectionReason;

    if (node.egressBlocked) {
      availability = "blocked";
    } else if (bestAutoNode && node.id === bestAutoNode.id && node.baseStatus !== "unstable") {
      availability = "best";
    }

    return {
      ...node,
      availability,
      rejectionReason,
      isUsable: !node.egressBlocked && node.baseStatus !== "unstable" && node.latency > 0,
      isEligible: !node.egressBlocked,
    };
  });

  const subscriptionSummaries = state.subscriptions.items.map((subscription) => {
    const nodes = renderedNodes.filter((node) => node.subscriptionId === subscription.id);
    const used = nodes.filter((node) => node.isEligible);
    const healthy = used.filter((node) => node.baseStatus !== "unstable");
    const rejected = nodes.filter((node) => node.egressBlocked);
    return {
      ...subscription,
      discoveredCount: nodes.length,
      usedCount: used.length,
      healthyCount: healthy.length,
      rejectedCount: rejected.length,
      egressCountries: [...new Set(nodes.map((node) => node.egressCountry))].sort(),
    };
  });

  const policyReport = generatePolicyReport(state);
  const ruleEngine = deriveRuleEngine(state);
  const connections = deriveConnections(state);
  const averageLatency =
    Math.round(
      usableNodes.reduce((sum, node) => sum + node.latency, 0) / Math.max(1, usableNodes.length),
    ) || 0;

  return {
    ...state,
    health: {
      ...state.health,
      activeConnections: connections.activeCount,
    },
    routing: {
      ...state.routing,
      proxyLists: ruleEngine.proxyBaseNames,
      directOverrides: [...ruleEngine.directEntries, ...ruleEngine.directIpEntries],
    },
    ruleEngine,
    connections,
    derived: {
      activeProxy,
      eligibleNodes: renderedNodes.filter((node) => node.isEligible),
      rejectedNodes: renderedNodes.filter((node) => node.egressBlocked),
      usableNodes,
      bestAutoNode,
      averageLatency,
      subscriptionSummaries,
      policyReport,
    },
  };
}

function createGeneratedNodes(subscriptionId, index) {
  const preset = newSubscriptionPresets[index % newSubscriptionPresets.length];
  return preset.map((item, itemIndex) => ({
    id: `${subscriptionId}-node-${itemIndex + 1}`,
    subscriptionId,
    label: item.label,
    region: item.region,
    provider: "Imported",
    protocol: "VLESS",
    egressCountry: item.egressCountry,
    egressIp: item.egressIp,
    egressProvider: item.egressProvider,
    baseStatus: item.egressCountry === "BY" ? "unstable" : "alive",
    latency: item.egressCountry === "BY" ? 0 : item.latency,
    jitter: item.egressCountry === "BY" ? 0 : Math.round(randomBetween(18, 40)),
    rxMbps: item.egressCountry === "BY" ? 0 : item.rxMbps,
    txMbps: item.egressCountry === "BY" ? 0 : item.txMbps,
    score: item.score,
    trend: buildTimedSeries(18, item.egressCountry === "BY" ? 1120 : item.latency, 120, 0, 1900, 60 * 1000),
  }));
}

export function createMockBackend() {
  const listeners = new Set();
  const state = createState();

  function emit() {
    state.meta.updatedAt = new Date().toISOString();
    const snapshot = deriveSnapshot(state);
    listeners.forEach((listener) => listener(snapshot));
  }

  function commitSettings() {
    persistSettings(state.settings);
    emit();
  }

  function addEvent(level, kind, data = {}) {
    state.events.unshift({
      at: new Date().toISOString(),
      level,
      kind,
      data,
    });
    state.events = state.events.slice(0, 24);
  }

  function pulseTraffic() {
    state.health.downloadMbps = Math.round(clamp(state.health.downloadMbps + randomBetween(-0.45, 0.55), 0.1, 8.2) * 10) / 10;
    state.health.uploadMbps = Math.round(clamp(state.health.uploadMbps + randomBetween(-0.05, 0.06), 0.01, 0.9) * 100) / 100;
    state.health.blockedHitsPerMin = Math.round(clamp(state.health.blockedHitsPerMin + randomBetween(-2.5, 3.2), 4, 34));
    state.health.directHitsPerMin = Math.round(clamp(state.health.directHitsPerMin + randomBetween(-10, 12), 52, 220));
    state.health.memoryMiB = Math.round(clamp(state.health.memoryMiB + randomBetween(-0.35, 0.55), 58, 78) * 10) / 10;

    state.graphs.throughputDown = appendTimedSeriesValue(state.graphs.throughputDown, state.health.downloadMbps, 24, 1);
    state.graphs.throughputUp = appendTimedSeriesValue(state.graphs.throughputUp, state.health.uploadMbps, 24, 2);
    state.graphs.blockedHits = appendTimedSeriesValue(state.graphs.blockedHits, state.health.blockedHitsPerMin, 24, 0);

    state.nodes.forEach((node) => {
      if (node.baseStatus === "unstable") {
        node.trend = appendTimedSeriesValue(node.trend, 0, 18, 0);
        return;
      }

      const latencySpread = state.routing.autoSelection.metric === "latency" ? 90 : 130;
      node.latency = Math.round(clamp(node.latency + randomBetween(-latencySpread, latencySpread), 180, 2200));
      node.jitter = Math.round(clamp(node.jitter + randomBetween(-4, 5), 8, 60));
      node.rxMbps = Math.round(clamp(node.rxMbps + randomBetween(-0.3, 0.45), 0.02, 4.6) * 100) / 100;
      node.txMbps = Math.round(clamp(node.txMbps + randomBetween(-0.03, 0.05), 0.01, 0.8) * 100) / 100;
      node.score = Math.round(clamp(node.score + randomBetween(-2.2, 2.4), 22, 99));
      node.trend = appendTimedSeriesValue(node.trend, node.latency, 18, 0);
    });

    if (!state.connections.paused) {
      state.connections.items.forEach((connection) => {
        if (connection.state !== "active") {
          return;
        }
        connection.dlSpeedBps = Math.max(0, Math.round(clamp(connection.dlSpeedBps + randomBetween(-180, 220), 0, 6400)));
        connection.ulSpeedBps = Math.max(0, Math.round(clamp(connection.ulSpeedBps + randomBetween(-80, 120), 0, 3200)));
        connection.dlBytes += Math.max(0, connection.dlSpeedBps);
        connection.ulBytes += Math.max(0, connection.ulSpeedBps);
      });
    }

    const currentCandidates = deriveSnapshot(state).derived.usableNodes;
    const averageLatency = Math.round(
      currentCandidates.reduce((sum, node) => sum + node.latency, 0) / Math.max(1, currentCandidates.length),
    );
    state.graphs.latencyAverage = appendTimedSeriesValue(state.graphs.latencyAverage, averageLatency, 24, 0);
  }

  function finishAction(action) {
    state.actions[action] = false;
    emit();
  }

  function runAction(action) {
    if (state.actions[action]) {
      return;
    }

    state.actions[action] = true;
    addEvent("info", "action-started", { action });
    emit();

    window.setTimeout(() => {
      if (action === "refreshSubscriptions") {
        const now = new Date().toISOString();
        state.subscriptions.items.forEach((subscription) => {
          subscription.lastSyncAt = now;
        });
        addEvent("ok", "pool-rebuilt", {
          subscriptions: state.subscriptions.items.length,
          kept: deriveSnapshot(state).derived.eligibleNodes.length,
        });
      }

      if (action === "retestServers") {
        state.nodes.forEach((node) => {
          if (node.baseStatus === "unstable") {
            const revived = Math.random() > 0.45;
            node.baseStatus = revived ? "alive" : "unstable";
            if (revived) {
              node.latency = Math.round(randomBetween(560, 1180));
              node.jitter = Math.round(randomBetween(18, 38));
              node.rxMbps = Math.round(randomBetween(0.18, 1.65) * 100) / 100;
              node.txMbps = Math.round(randomBetween(0.03, 0.16) * 100) / 100;
            } else {
              node.latency = 0;
              node.jitter = 0;
              node.rxMbps = 0;
              node.txMbps = 0;
            }
          } else {
            node.latency = Math.round(clamp(node.latency + randomBetween(-110, 110), 200, 1900));
            node.score = Math.round(clamp(node.score + randomBetween(-4, 5), 25, 99));
          }
        });
        addEvent("ok", "auto-best-retested", {
          metric: state.routing.autoSelection.metric,
        });
      }

      if (action === "updateLists") {
        const now = new Date().toISOString();
        state.ruleEngine.bases.forEach((base) => {
          if (base.sourceType !== "remote") {
            return;
          }
          base.lastSyncAt = now;
          base.itemCount = Math.max(1, Math.round(base.itemCount + randomBetween(-120, 180)));
        });
        addEvent("ok", "lists-domains-updated");
        addEvent("ok", "lists-ip-updated");
      }

      if (action === "restartTunnel") {
        addEvent("ok", "tunnel-restarted");
      }

      if (action === "reprocessSubscriptions") {
        state.subscriptions.lastReprocessAt = new Date().toISOString();
        addEvent("ok", "policy-reprocessed", {
          blockedCountries: [...state.subscriptions.egressPolicy.blockedCountries],
        });
      }

      if (action === "checkMissionControlUpdates") {
        state.automation.release = {
          ...(state.automation.release || {}),
          latestVersion: "1.0.1",
          latestUiVersion: "1.0.1",
          latestBridgeVersion: "1.0.1",
          latestTag: "v1.0.1",
          latestPublishedAt: new Date().toISOString(),
          latestReleaseUrl: "https://github.com/BlackF1re/mission-control/releases/latest",
          latestReleaseName: "Mission Control 1.0.1",
          latestChangelog:
            "- Added manual update checks in Settings\n- Switched releases to semver\n- Added version badge near by Blackfire",
          updateAvailable: true,
          lastCheckedAt: new Date().toISOString(),
          lastStatus: "ok",
          lastError: "",
        };
        addEvent("ok", "mission-control-update-checked");
      }

      if (action === "applyMissionControlUpdate") {
        state.automation.release = {
          ...(state.automation.release || {}),
          currentUiVersion: "1.0.1",
          currentBridgeVersion: "1.0.1",
          latestVersion: "1.0.1",
          latestUiVersion: "1.0.1",
          latestBridgeVersion: "1.0.1",
          latestTag: "v1.0.1",
          latestPublishedAt: new Date().toISOString(),
          latestReleaseUrl: "https://github.com/BlackF1re/mission-control/releases/latest",
          latestReleaseName: "Mission Control 1.0.1",
          latestChangelog:
            "- Added manual update checks in Settings\n- Switched releases to semver\n- Added version badge near by Blackfire",
          updateAvailable: false,
          lastCheckedAt: new Date().toISOString(),
          lastAppliedAt: new Date().toISOString(),
          lastStatus: "ok",
          lastError: "",
        };
        addEvent("ok", "mission-control-updated");
      }

      finishAction(action);
    }, actionDurations[action]);
  }

  const tickId = window.setInterval(() => {
    if (!state.settings.autoRefresh) {
      return;
    }
    pulseTraffic();
    emit();
  }, 1600);

  return {
    subscribe(listener) {
      listeners.add(listener);
      listener(deriveSnapshot(state));
      return () => listeners.delete(listener);
    },
    destroy() {
      window.clearInterval(tickId);
      listeners.clear();
    },
    setTheme(value) {
      if (!settingsValidators.theme(value)) {
        return;
      }
      state.settings.theme = value;
      commitSettings();
    },
    setLanguage(value) {
      if (!settingsValidators.language(value)) {
        return;
      }
      state.settings.language = value;
      commitSettings();
    },
    setDensity(value) {
      if (!settingsValidators.density(value)) {
        return;
      }
      state.settings.density = value;
      commitSettings();
    },
    setScale(value) {
      state.settings.scale = Math.max(80, Math.min(130, Number(value) || 100));
      commitSettings();
    },
    setAnimations(enabled) {
      state.settings.animations = Boolean(enabled);
      commitSettings();
    },
    setAutoRefresh(enabled) {
      state.settings.autoRefresh = Boolean(enabled);
      commitSettings();
    },
    setGraphRange(value) {
      state.settings.graphRange = Math.max(1, Math.min(60, Number(value) || 1));
      commitSettings();
    },
    setChartLineWidth(value) {
      state.settings.chartLineWidth = Math.max(1, Math.min(8, Number(value) || 1));
      commitSettings();
    },
    setSpeedUnitMode(value) {
      state.settings.speedUnitMode = value === "bytes" ? "bytes" : "bits";
      commitSettings();
    },
    setStorageUnitSystem(value) {
      state.settings.storageUnitSystem = value === "decimal" ? "decimal" : "binary";
      commitSettings();
    },
    setMihomoMemoryLimit(value) {
      const maxMemoryLimit = Math.max(128, Number(state.settings.mihomoMemoryLimitMaxMiB) || 512);
      const nextValue = Math.max(0, Math.min(maxMemoryLimit, Math.round(Number(value) || 0)));
      state.settings.mihomoMemoryLimitMiB = nextValue;
      state.health.memoryBudgetMiB = nextValue;
      commitSettings();
    },
    setRoutingMode(mode) {
      state.routing.mode = mode;
      addEvent("info", "routing-mode-changed", { mode });
      emit();
    },
    setTunnelPreference(value) {
      state.routing.blockedTrafficTarget = value;
      addEvent("info", "blocked-target-changed", { value });
      emit();
    },
    setManualServer(id) {
      state.routing.manualServerId = id;
      addEvent("info", "manual-server-changed", { id });
      emit();
    },
    updateAutoSelection(patch) {
      state.routing.autoSelection = {
        ...state.routing.autoSelection,
        ...patch,
      };
      addEvent("info", "auto-selection-updated", patch);
      emit();
    },
    updateAutomation(patch) {
      const releasePatch = {};
      if (Object.prototype.hasOwnProperty.call(patch, "releaseCheckMinutes")) {
        releasePatch.checkMinutes = patch.releaseCheckMinutes;
      }
      if (Object.prototype.hasOwnProperty.call(patch, "uiAutoUpdate")) {
        releasePatch.uiAutoUpdate = Boolean(patch.uiAutoUpdate);
      }
      if (Object.prototype.hasOwnProperty.call(patch, "bridgeAutoUpdate")) {
        releasePatch.bridgeAutoUpdate = Boolean(patch.bridgeAutoUpdate);
      }
      state.automation = {
        ...state.automation,
        enabled: Object.prototype.hasOwnProperty.call(patch, "enabled") ? Boolean(patch.enabled) : state.automation.enabled,
        subscriptionRefreshMinutes: Object.prototype.hasOwnProperty.call(patch, "subscriptionRefreshMinutes")
          ? Number(patch.subscriptionRefreshMinutes) || 0
          : state.automation.subscriptionRefreshMinutes,
        logCleanupMinutes: Object.prototype.hasOwnProperty.call(patch, "logCleanupMinutes")
          ? Number(patch.logCleanupMinutes) || 0
          : state.automation.logCleanupMinutes,
        release: {
          ...(state.automation.release || {}),
          ...releasePatch,
        },
      };
      addEvent("info", "automation-updated", patch);
      emit();
    },
    checkMissionControlUpdates() {
      runAction("checkMissionControlUpdates");
      return Promise.resolve(true);
    },
    applyMissionControlUpdate() {
      runAction("applyMissionControlUpdate");
      return Promise.resolve(true);
    },
    toggleBlockedCountry(code) {
      const current = new Set(state.subscriptions.egressPolicy.blockedCountries);
      if (current.has(code)) {
        current.delete(code);
      } else {
        current.add(code);
      }
      state.subscriptions.egressPolicy.blockedCountries = [...current].sort();
      addEvent("info", "egress-policy-updated", {
        blockedCountries: [...state.subscriptions.egressPolicy.blockedCountries],
        allowUnknown: state.subscriptions.egressPolicy.allowUnknown,
      });
      emit();
    },
    setAllowUnknownEgress(enabled) {
      state.subscriptions.egressPolicy.allowUnknown = enabled;
      addEvent("info", "egress-policy-updated", {
        blockedCountries: [...state.subscriptions.egressPolicy.blockedCountries],
        allowUnknown: enabled,
      });
      emit();
    },
    updateBase(id, patch) {
      const base = state.ruleEngine.bases.find((item) => item.id === id);
      if (!base) {
        return;
      }
      Object.assign(base, patch);
      addEvent("info", "base-updated", { id, name: base.name });
      emit();
    },
    syncBase(id) {
      const base = state.ruleEngine.bases.find((item) => item.id === id);
      if (!base || base.sourceType !== "remote") {
        return;
      }
      base.lastSyncAt = new Date().toISOString();
      base.itemCount = Math.max(1, Math.round(base.itemCount + randomBetween(-90, 140)));
      addEvent("ok", "base-synced", { id, name: base.name });
      emit();
    },
    addBase(payload) {
      const nextIndex = state.counters.addedBases + 1;
      state.counters.addedBases = nextIndex;
      const id = `base-custom-${nextIndex}`;
      const base = {
        id,
        name: payload.name || `Custom base ${nextIndex}`,
        scope: payload.scope || "proxy",
        kind: payload.kind || "domains",
        sourceType: payload.sourceType || "local",
        format: payload.sourceType === "remote" ? "geosite-dat" : "plain-list",
        sourceUrl: payload.sourceUrl || "",
        runtimeMode: payload.sourceType === "remote" ? "converted-text-ruleset" : "local-lines",
        autoUpdate: payload.sourceType === "remote",
        updateEveryHours: payload.sourceType === "remote" ? 12 : 0,
        enabled: true,
        lastSyncAt: new Date().toISOString(),
        itemCount: payload.sourceType === "remote" ? Math.round(randomBetween(120, 2200)) : undefined,
        entries: payload.sourceType === "remote" ? undefined : [],
        preview: payload.sourceType === "remote" ? ["example.com", "203.0.113.0/24"] : undefined,
        note: payload.note || "",
      };
      state.ruleEngine.bases.unshift(base);
      addEvent("ok", "base-added", { name: base.name });
      emit();
    },
    removeBase(id) {
      const target = state.ruleEngine.bases.find((base) => base.id === id);
      if (!target) {
        return;
      }
      state.ruleEngine.bases = state.ruleEngine.bases.filter((base) => base.id !== id);
      state.ruleEngine.rules = state.ruleEngine.rules.map((rule) => ({
        ...rule,
        baseIds: rule.baseIds.filter((baseId) => baseId !== id),
      }));
      addEvent("info", "base-removed", { name: target.name });
      emit();
    },
    addBaseEntry(baseId, value) {
      const base = state.ruleEngine.bases.find((item) => item.id === baseId);
      if (!base || base.sourceType !== "local") {
        return;
      }
      const nextValue = value.trim();
      if (!nextValue) {
        return;
      }
      base.entries = [...(base.entries || []), nextValue];
      base.lastSyncAt = new Date().toISOString();
      addEvent("info", "base-entry-added", { name: base.name, value: nextValue });
      emit();
    },
    removeBaseEntry(baseId, index) {
      const base = state.ruleEngine.bases.find((item) => item.id === baseId);
      if (!base || base.sourceType !== "local") {
        return;
      }
      const removed = base.entries?.[index];
      base.entries = (base.entries || []).filter((_, entryIndex) => entryIndex !== index);
      base.lastSyncAt = new Date().toISOString();
      addEvent("info", "base-entry-removed", { name: base.name, value: removed || "" });
      emit();
    },
    updateRule(id, patch) {
      const rule = state.ruleEngine.rules.find((item) => item.id === id);
      if (!rule) {
        return;
      }
      Object.assign(rule, patch);
      addEvent("info", "rule-updated", { id, name: rule.name });
      emit();
    },
    addRule(payload) {
      const nextIndex = state.counters.addedRules + 1;
      state.counters.addedRules = nextIndex;
      const rule = {
        id: `rule-custom-${nextIndex}`,
        name: payload.name || `Custom rule ${nextIndex}`,
        priority: payload.priority || 50 + nextIndex,
        action: payload.action || "PROXY",
        target: payload.target || "BLOCKED SITES",
        enabled: true,
        locked: false,
        matchMode: "any",
        baseIds: [],
        note: payload.note || "",
      };
      state.ruleEngine.rules.push(rule);
      addEvent("ok", "rule-added", { name: rule.name });
      emit();
    },
    removeRule(id) {
      const target = state.ruleEngine.rules.find((rule) => rule.id === id);
      if (!target || target.locked) {
        return;
      }
      state.ruleEngine.rules = state.ruleEngine.rules.filter((rule) => rule.id !== id);
      addEvent("info", "rule-removed", { name: target.name });
      emit();
    },
    toggleRuleBase(ruleId, baseId) {
      const rule = state.ruleEngine.rules.find((item) => item.id === ruleId);
      if (!rule || rule.locked) {
        return;
      }
      const current = new Set(rule.baseIds);
      if (current.has(baseId)) {
        current.delete(baseId);
      } else {
        current.add(baseId);
      }
      rule.baseIds = [...current];
      addEvent("info", "rule-updated", { id: rule.id, name: rule.name });
      emit();
    },
    closeConnection(id) {
      const connection = state.connections.items.find((item) => item.id === id);
      if (!connection || connection.state === "closed") {
        return;
      }
      connection.state = "closed";
      connection.dlSpeedBps = 0;
      connection.ulSpeedBps = 0;
      addEvent("info", "connection-closed", { host: connection.host });
      emit();
    },
    closeConnections(ids) {
      const idSet = new Set(ids);
      state.connections.items.forEach((connection) => {
        if (!idSet.has(connection.id) || connection.state === "closed") {
          return;
        }
        connection.state = "closed";
        connection.dlSpeedBps = 0;
        connection.ulSpeedBps = 0;
      });
      addEvent("info", "connections-closed", { count: ids.length });
      emit();
    },
    clearClosedConnections() {
      const removedCount = state.connections.items.filter((connection) => connection.state === "closed").length;
      state.connections.items = state.connections.items.filter((connection) => connection.state !== "closed");
      addEvent("info", "closed-connections-cleared", { count: removedCount });
      emit();
    },
    setConnectionsPaused(enabled) {
      state.connections.paused = enabled;
      addEvent("info", "connections-pause-toggled", { enabled });
      emit();
    },
    addSubscription(payload) {
      const nextIndex = state.counters.addedSubscriptions;
      const id = `imported_${nextIndex + 1}`;
      state.counters.addedSubscriptions += 1;

      const subscription = {
        id,
        name: payload.name || `Imported ${nextIndex + 1}`,
        url: payload.url,
        format: payload.format,
        lastSyncAt: new Date().toISOString(),
        enabled: true,
      };

      state.subscriptions.items.unshift(subscription);
      state.nodes.push(...createGeneratedNodes(id, nextIndex));
      addEvent("ok", "subscription-added", { name: subscription.name });
      emit();
      return Promise.resolve(true);
    },
    updateSubscription(id, payload) {
      const target = state.subscriptions.items.find((subscription) => subscription.id === id);
      if (!target) {
        return Promise.reject(new Error("Subscription not found."));
      }
      target.name = payload.name || target.name;
      target.url = payload.url || target.url;
      target.format = payload.format || target.format;
      target.lastSyncAt = new Date().toISOString();
      addEvent("ok", "subscription-updated", { name: target.name });
      emit();
      return Promise.resolve(true);
    },
    removeSubscription(id) {
      const target = state.subscriptions.items.find((subscription) => subscription.id === id);
      state.subscriptions.items = state.subscriptions.items.filter((subscription) => subscription.id !== id);
      state.nodes = state.nodes.filter((node) => node.subscriptionId !== id);
      addEvent("info", "subscription-removed", { name: target?.name || id });
      emit();
      return Promise.resolve(true);
    },
    runRouteProbe(value) {
      const result = resolveVisitProfile(state, value);
      state.tools.routeProbe = {
        status: "success",
        error: "",
        lastQuery: String(value || "").trim(),
        lastCheckedAt: new Date().toISOString(),
        result,
      };
      addEvent("info", "tool-route-probed", { address: result?.address || String(value || "").trim() });
      emit();
    },
    runRuleProbe(value) {
      const result = resolveRuleProbe(state, value);
      state.tools.ruleProbe = {
        status: "success",
        error: "",
        lastQuery: String(value || "").trim(),
        lastCheckedAt: new Date().toISOString(),
        result,
      };
      addEvent("info", "tool-rule-probed", { address: result?.address || String(value || "").trim() });
      emit();
    },
    runDnsProbe(value) {
      const result = resolveDnsProbe(state, value);
      state.tools.dnsProbe = {
        status: "success",
        error: "",
        lastQuery: String(value || "").trim(),
        lastCheckedAt: new Date().toISOString(),
        result,
      };
      addEvent("info", "tool-dns-probed", { address: result?.address || String(value || "").trim() });
      emit();
    },
    runLatencyProbe(value) {
      const results = String(value || "")
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean)
        .map((entry) => buildLatencyResult(state, entry));
      state.tools.latencyProbe = {
        status: "success",
        error: "",
        lastQuery: String(value || "").trim(),
        lastCheckedAt: new Date().toISOString(),
        results,
      };
      addEvent("info", "tool-latency-probed", { count: results.length });
      emit();
    },
    runDiagnostics(value, mode = "quick") {
      const addresses = String(value || "")
        .split(/[\n,]+/)
        .map((entry) => entry.trim())
        .filter(Boolean);
      const firstAddress = addresses[0];
      if (!firstAddress) {
        return Promise.resolve(false);
      }
      this.runRouteProbe(firstAddress);
      this.runRuleProbe(firstAddress);
      this.runDnsProbe(firstAddress);
      if (mode === "full") {
        this.runLatencyProbe(addresses.join(", "));
      }
      return Promise.resolve(true);
    },
    triggerAction(action) {
      runAction(action);
      return Promise.resolve(true);
    },
  };
}
