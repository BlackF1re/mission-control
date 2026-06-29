import { createBackend } from "./mission_control_backend.js?v=__MISSION_CONTROL_VERSION__";

const MISSION_CONTROL_VERSION = "__MISSION_CONTROL_VERSION__";
const backend = createBackend();
const root = document.getElementById("app");
const themeKeys = ["graphite", "pearl", "cobalt", "ember", "sage", "noir"];
const CONNECTION_SCOPE_ALL = "__all";

const navItems = [
  { id: "overview", icon: "overview" },
  { id: "routing", icon: "routing" },
  { id: "subscriptions", icon: "subscriptions" },
  { id: "nodes", icon: "nodes" },
  { id: "rules", icon: "rules" },
  { id: "connections", icon: "connections" },
  { id: "tools", icon: "tools" },
  { id: "settings", icon: "settings" },
  { id: "debug", icon: "settings" },
];

const countryOptions = [
  "RU",
  "BY",
  "KZ",
  "AM",
  "KG",
  "UZ",
  "TJ",
  "TM",
  "AZ",
  "GE",
  "MD",
  "UA",
  "TR",
  "DE",
  "NL",
  "FI",
  "SE",
  "NO",
  "PL",
  "CZ",
  "CH",
  "AT",
  "FR",
  "GB",
  "ES",
  "IT",
  "RO",
  "BG",
  "GR",
  "US",
  "CA",
  "JP",
  "SG",
  "HK",
  "KR",
  "AE",
  "IL",
];

const translations = {
  ru: {
    locale: "ru-RU",
    brandKicker: "by Blackfire",
    title: "Mission Control",
    tunnelHealthy: "Туннель в норме",
    tunnelIssue: "Проблема с туннелем",
    tunnelSync: "Синхронизация",
    mockMode: "Локальный режим",
    realMode: "Подключено к роутеру",
    headerSubtitle: "Панель маршрутизации для Nikki и Mihomo с управлением узлами, подписками и сервисными действиями.",
    nav: {
      overview: "Обзор",
      routing: "Маршрутизация",
      subscriptions: "Подписки",
      nodes: "Узлы",
      rules: "Базы и правила",
      connections: "Соединения",
      tools: "Инструменты",
      settings: "Настройки",
      debug: "Отладка",
    },
    sections: {
      workspace: "Разделы",
      currentProfile: "Текущий профиль",
      lastMaintenance: "Последнее обслуживание",
      subscriptions: "Подписки",
      nodeRetest: "Ретест узлов",
      listUpdate: "Обновление списков",
      statsDownload: "Загрузка",
      statsUpload: "Отдача",
      statsMemory: "Память",
      statsConnections: "Соединения",
      liveTraffic: "Трафик через туннель",
      totalTraffic: "Общий трафик",
      memoryBudget: "Лимит",
      activeConnections: "активных",
      traffic: "Трафик",
      throughputTitle: "Скорость за последние 30 минут",
      incoming: "Входящий",
      outgoing: "Исходящий",
      currentRoute: "Текущий режим",
      currentRouteTitle: "Что сейчас происходит с трафиком",
      latency: "Задержка",
      latencyTitle: "Задержка активной ноды",
      latencyNote: "Панель показывает задержку выбранного узла до проверочного адреса, близкого к реальному пользовательскому трафику.",
      maintenance: "Обслуживание",
      maintenanceTitle: "Нормальные кнопки, а не фейковые proxy-group",
      recentEvents: "Последние события",
      recentEventsTitle: "Что делала система",
      internetMode: "Режим интернета",
      internetModeTitle: "Как сейчас маршрутизируется трафик",
      tunnelChoice: "Выбор туннеля",
      tunnelChoiceTitle: "Как туннелируется блокируемый трафик",
      autoSelection: "Автовыбор",
      autoSelectionTitle: "Как система сама выбирает выходной узел",
      listSection: "Списки",
      listSectionTitle: "Что именно туннелируется",
      tunnelLists: "Списки для туннеля",
      directOverrides: "Исключения в direct",
      subscriptionsMenu: "Управление подписками",
      subscriptionsMenuTitle: "Источники узлов и их параметры",
      egressPolicy: "Политика стран выхода",
      egressPolicyTitle: "Какие страны выхода нужно исключать из пула",
      inventory: "Инвентарь подписок",
      inventoryTitle: "Какие источники и сколько узлов они дают",
      reprocessReport: "Отчет обработки",
      reprocessReportTitle: "Что было использовано после пересборки по политике стран выхода",
      healthyPool: "Рабочий пул",
      healthyPoolTitle: "Доступные туннельные узлы",
      healthyPoolNote: "",
      hiddenNodes: "Скрытые узлы",
      hiddenNodesTitle: "Что убрано из клиентского списка",
      appearance: "Внешний вид",
      appearanceTitle: "Тема, язык и масштаб интерфейса",
      panelBehavior: "Поведение панели",
      panelBehaviorTitle: "Живые обновления панели",
      automation: "Автоматизация",
      automationTitle: "Все автоматические обновления",
      mihomoRuntime: "Mihomo",
      mihomoRuntimeTitle: "Ограничение памяти ядра",
      measurements: "Графики и единицы",
      measurementsTitle: "Диапазон, толщина линий и единицы измерения",
      controller: "Отладка",
      controllerTitle: "Подключение к контроллеру и сервисные проверки",
    },
    modes: {
      smart: "Обычный режим",
      direct: "Все напрямую",
      global: "Весь трафик в туннель",
    },
    modeDescriptions: {
      smart: "По умолчанию direct. В туннель уходит только трафик из RU-списков.",
      direct: "Полностью отключить туннелирование трафика, не ломая сам стек.",
      global: "Принудительно отправлять весь трафик через выбранный узел.",
    },
    modeWarnings: {
      global: "\u0412\u043d\u0438\u043c\u0430\u043d\u0438\u0435: \u043f\u0440\u0438 \u043f\u043e\u043b\u043d\u043e\u043c \u0442\u0443\u043d\u043d\u0435\u043b\u0435 \u0432\u043e\u0437\u043c\u043e\u0436\u043d\u0430 \u0443\u0442\u0435\u0447\u043a\u0430 \u0442\u0443\u043d\u043d\u0435\u043b\u044f, \u0435\u0441\u043b\u0438 \u0432\u044b\u0431\u0440\u0430\u043d\u043d\u0430\u044f \u043d\u043e\u0434\u0430 \u0438\u043b\u0438 \u043c\u0430\u0440\u0448\u0440\u0443\u0442 \u0440\u0430\u0431\u043e\u0442\u0430\u044e\u0442 \u043d\u0435\u043a\u043e\u0440\u0440\u0435\u043a\u0442\u043d\u043e.",
    },
    targets: {
      auto: "Автовыбор",
      manual: "Вручную",
      direct: "Никак",
    },
    routeBadges: {
      listModeRu: "Базы: только RU",
      listModeFull: "Базы: полные",
      node: "Узел",
    },
    routeDetails: {
      activeNode: "Активный узел",
      bestNode: "Лучший узел",
      rejected: "Исключено политикой",
      lastRetest: "Последний ретест",
    },
    routeSummary: {
      direct: "Через туннель сейчас ничего не идет: весь трафик направляется напрямую.",
      global: "Через этот узел идет весь трафик.",
      blockedVia: (listsLabel) => `Через этот узел идет только трафик из списков: ${listsLabel}.`,
      blockedDirect: "Через туннель сейчас ничего не идет: даже трафик из списков направляется напрямую.",
      emptyLists: "Через туннель сейчас ничего не идет: списки для туннеля пусты.",
      waiting: "Подходящий выходной узел не найден, поэтому через туннель сейчас ничего не идет.",
    },
    maintenanceActions: {
      refreshSubscriptions: {
        title: "Обновить подписки",
        subtitle: "Подтянуть все источники, убрать узлы с запрещенной страной выхода и пересобрать пул",
      },
      retestServers: {
        title: "Перепроверить узлы",
        subtitle: "Снова измерить задержки и выбрать лучший узел",
      },
      updateLists: {
        title: "Обновить RU-списки",
        subtitle: "Подтянуть runetfreedom domain/IP базы",
      },
      restartTunnel: {
        title: "Перезапустить туннель",
        subtitle: "Перезапустить Mihomo core и дождаться возврата controller API",
      },
      reprocessSubscriptions: {
        title: "Обработать все подписки заново",
        subtitle: "Применить текущую политику стран выхода и показать краткий отчет",
      },
      idle: "Готово",
      busy: "Выполняется...",
    },
    autoSelection: {
      metric: "Метрика выбора",
      interval: "Переоценивать узлы",
      tolerance: "Переключать, только если новый узел лучше минимум на",
      sticky: "Не менять текущий узел, пока он остается здоровым",
      minScore: "Минимальная оценка качества для автовыбора",
      metricOptions: {
        latency: "По задержке",
        speed: "По скорости",
        hybrid: "Гибридно",
      },
      intervalOptions: {
        5: "Каждые 5 минут",
        10: "Каждые 10 минут",
        30: "Каждые 30 минут",
        60: "Каждый час",
      },
      toleranceOptions: {
        60: "60 мс / 10%",
        120: "120 мс / 18%",
        200: "200 мс / 25%",
      },
      summaryTitle: "Сейчас считается лучшим",
      summaryLine: (metric, interval) => `Метрика: ${metric}. Пересчет: ${interval}.`,
    },
    lists: {
      currentResult: "Что получится сейчас",
    },
    subscriptionForm: {
      name: "Название",
      namePlaceholder: "Например, Family US pool",
      url: "Ссылка на подписку",
      urlPlaceholder: "https://example.com/sub/....",
      format: "Формат",
      add: "Добавить подписку",
      remove: "Удалить",
      lastSync: "Последняя синхронизация",
      discovered: "Обнаружено",
      used: "Использовано",
      rejected: "Отброшено",
      egresses: "Страны выхода",
      refreshHint: "Добавьте источник узлов: панель получит подписку, пересоберет пул и покажет результат обработки.",
      managementHint: "Добавляйте, редактируйте и удаляйте источники подписок. После изменений панель пересоберет пул и обновит отчет обработки.",
      formatOptions: {
        "3x-ui": "3x-ui",
        sharx: "SharX",
        clash: "Clash",
      },
    },
    egressPolicy: {
      blockedCountries: "Запрещенные страны выхода",
      helper: "Если узел выходит через одну из этих стран, он не попадает в рабочий пул.",
      reprocess: "Обработать все подписки заново",
      allowUnknown: "Допускать узлы без определенной страны выхода",
      reportAt: "Последняя обработка",
      discovered: "Обнаружено узлов",
      kept: "Использовано узлов",
      rejected: "Отброшено узлов",
      bySubscription: "По подпискам",
      usedNodes: "Использованы",
      rejectedNodes: "Отброшены",
      reasonCountry: "Страна выхода запрещена политикой",
      reasonUnknown: "Страна выхода не определена",
    },
    nodeStatus: {
      best: "Лучший",
      alive: "Готов",
      unstable: "Нестабильный",
      blocked: "Скрыт политикой",
    },
    nodeFields: {
      provider: "Провайдер",
      protocol: "Протокол",
      egress: "Страна выхода",
      jitter: "Разброс задержки",
      down: "Загрузка",
      up: "Отдача",
      score: "Оценка",
      subscription: "Подписка",
      useManual: "Выбрать вручную",
      timeout: "таймаут",
    },
    settings: {
      theme: "Тема",
      language: "Язык",
      scale: "Масштаб интерфейса",
      density: "Плотность",
      graphRange: "Диапазон графиков",
      chartLineWidth: "Толщина линий графиков",
      chartLinePreview: "Пример линии",
      speedUnitMode: "Единицы скорости",
      storageUnitSystem: "Единицы объема и памяти",
      autoRefresh: "Живое автообновление",
      animations: "Анимации",
      automationEnabled: "Включить автоматические обновления",
      subscriptionRefreshMinutes: "Обновление пула и подписок, мин",
      logCleanupMinutes: "Очистка логов, мин",
      manualIntervalHint: "0 = только вручную",
      automationHint:
        "Здесь задаются все интервалы: живые показатели, автовыбор узла, обновление подписок, очистка логов и обновление удаленных баз.",
      automationDisabledHint: "При отключении автоматизации обновления подписок, логов и удаленных баз перестают выполняться.",
      mihomoMemoryLimit: "Лимит памяти Mihomo",
      mihomoMemoryLimitHint:
        "Ограничивает память процесса Mihomo через GOMEMLIMIT. Значение 0 отключает лимит. Изменение применяет настройку на роутере и перезапускает туннель.",
      memoryLimitDisabled: "Без лимита",
      remoteBaseTimers: "Таймеры удаленных баз",
      remoteBaseTimersHint: "Для каждой удаленной доменной или IP-базы расписание настраивается здесь, а не в карточке самой базы.",
      noRemoteTimers: "Удаленных баз с автообновлением нет.",
      timerOverviewTitle: "Что автообновляется и где это настраивается",
      timerOverviewLive: "Графики и живые показатели: интервал опроса в этой карточке.",
      timerOverviewAutoBest: "Автовыбор узла: ползунок переоценки узлов в этой карточке.",
      timerOverviewSubscriptions: "Пересборка пула и подписок: ползунок обновления подписок в этой карточке.",
      timerOverviewLogCleanup: "Очистка логов: ползунок очистки логов в этой карточке.",
      timerOverviewBases: "Удаленные доменные/IP-базы: индивидуальные таймеры в этой карточке.",
      controllerMode: "Источник данных",
      controllerUrl: "Mihomo API URL",
      controllerSecret: "Bearer secret",
      selectorGroup: "Группа выбора узла",
      delayUrl: "URL для проверки задержки",
      delayTimeout: "Таймаут проверки, мс",
      pollInterval: "Обновлять живые показатели каждые",
      useWebSocket: "Использовать WebSocket для traffic",
      testApi: "Проверить API",
      refreshApi: "Обновить сейчас",
      secretSaved: "Секрет сохранен в localStorage и будет отправляться как Authorization: Bearer <secret>.",
      clearSecret: "Очистить secret",
      apiConfigHint: "Mission Control на роутере работает через встроенный bridge: Mihomo secret и API URL скрыты на стороне роутера. Для PC-отладки можно переключиться на прямой Mihomo API.",
      managedByBridge: "Managed by router bridge",
      releaseCheckMinutes: "Проверка обновлений Mission Control, мин",
      uiAutoUpdate: "Автообновлять интерфейс",
      bridgeAutoUpdate: "Автообновлять bridge",
      releaseStatusTitle: "Статус обновлений Mission Control",
      releaseStatusHint: "UI и bridge проверяют GitHub Releases по этому интервалу. Все проверки и обновления выполняются на роутере.",
      releaseCurrentUi: "Текущая версия UI",
      releaseCurrentBridge: "Текущая версия bridge",
      releaseLatestUi: "Последняя версия UI",
      releaseLatestBridge: "Последняя версия bridge",
      releaseLastCheckedAt: "Последняя проверка",
      releaseLastAppliedAt: "Последнее применение",
      releaseManifestUrl: "Manifest URL",
      releaseStateIdle: "Ожидание",
      releaseStateOk: "Успешно",
      releaseStateFailed: "Ошибка",
      releaseLastError: "Последняя ошибка",
      releaseStateRunning: "Проверка...",
      releaseLatestTag: "Последний релиз",
      releasePublishedAt: "Опубликован",
      releaseReleaseUrl: "Ссылка на релиз",
      releaseChangelog: "Changelog последнего релиза",
      releaseNoChangelog: "Для этого релиза changelog пока не опубликован.",
      releaseCheckNow: "Проверить обновления",
      releaseUpdateNow: "Обновить",
      releaseManualHint:
        "Кнопка вручную проверяет GitHub Releases, показывает changelog последнего релиза и, если новая версия доступна, позволяет установить ее сразу.",
      releaseUpdateAvailable: "Доступно обновление",
      secretPlaceholder: "Bearer token",
      backendModeOptions: {
        mock: "Локальный mock",
        real: "Настоящий Mihomo API",
      },
      themeOptions: {
        graphite: "Graphite",
        pearl: "Pearl",
        cobalt: "Cobalt",
        ember: "Ember",
        sage: "Sage",
        noir: "Noir",
      },
      densityOptions: {
        comfortable: "Обычная",
        compact: "Компактная",
      },
      graphRangeOptions: {
        1: "1 минута",
        60: "1 час",
      },
      speedUnitOptions: {
        bits: "Биты в секунду",
        bytes: "Байты в секунду",
      },
      storageUnitOptions: {
        binary: "Бинарные: KiB / MiB / GiB",
        decimal: "Десятичные: kB / MB / GB",
      },
      languageOptions: {
        ru: "Русский",
        en: "English",
      },
    },
    rulesView: {
      kicker: "Базы и правила",
      title: "Чем наполняются правила маршрутизации",
      subtitle: "Здесь видно, какие базы загружаются, какие правила активны и что именно они используют.",
      basesTitle: "Каталог баз",
      rulesTitle: "Порядок правил",
      baseEditorTitle: "Настройки выбранной базы",
      ruleEditorTitle: "Настройки выбранного правила",
      createBaseTitle: "Добавить базу",
      createRuleTitle: "Добавить правило",
      updateAll: "Обновить все remote-базы",
      syncNow: "Обновить сейчас",
      attachBases: "Какие базы использует правило",
      entries: "Строки локального списка",
      preview: "Превью содержимого",
      emptyEntries: "Локальный список пока пуст.",
      baseSourceUrl: "Источник",
      baseFormat: "Формат",
      baseRuntime: "Как используется в runtime",
      baseInterval: "Автообновление",
      baseKind: "Тип",
      baseScope: "Назначение",
      baseEnabled: "База включена",
      baseAutoUpdate: "Обновлять автоматически",
      baseItems: "Элементов",
      baseLastSync: "Последнее обновление",
      rulePriority: "Приоритет",
      ruleAction: "Действие",
      ruleTarget: "Куда отправлять",
      ruleEnabled: "Правило включено",
      ruleLocked: "Системное правило",
      ruleMatchMode: "Режим совпадения",
      note: "Комментарий",
      addBase: "Добавить базу",
      addRule: "Добавить правило",
      addEntry: "Добавить строку",
      remove: "Удалить",
      enable: "Включено",
      disable: "Выключено",
      kindOptions: {
        domains: "Домены",
        ips: "IP / CIDR",
      },
      scopeOptions: {
        proxy: "Для туннеля",
        direct: "Для direct-исключений",
      },
      sourceTypeOptions: {
        local: "Локальный список",
        remote: "Удаленный источник",
      },
      formatOptions: {
        "plain-list": "Plain list",
        "geosite-dat": "geosite.dat",
        "geoip-dat": "geoip.dat",
      },
      intervalOptions: {
        0: "Вручную",
        6: "Каждые 6 часов",
        12: "Каждые 12 часов",
        24: "Раз в сутки",
      },
      actionOptions: {
        DIRECT: "DIRECT",
        PROXY: "PROXY",
      },
      targetOptions: {
        DIRECT: "DIRECT",
        "BLOCKED SITES": "BLOCKED SITES",
      },
      matchModes: {
        any: "Любое совпадение",
        final: "Финальное правило",
      },
      ruleSummary: (bases, items) => `${bases} баз, ${items} элементов`,
    },
    listEditor: {
      search: "Поиск по подстроке",
      searchPlaceholder: "Найти домен, IP или фрагмент строки",
      previous: "Назад",
      next: "Вперед",
      scale: "Масштаб окна",
      apply: "Применить изменения",
      cancel: "Отменить изменения",
      noMatches: "Совпадений нет",
      lines: (count) => count ? `${count} строк` : "Список пуст",
      matches: (current, total) => `${current} / ${total} совпадений`,
    },
    connectionsView: {
      kicker: "Соединения",
      title: "Живые соединения",
      subtitle: "Здесь видно, какие адреса сейчас открыты, какое правило сработало, через какой путь ушел трафик и сколько данных передано.",
      activeTab: (count) => `Активные (${count})`,
      closedTab: "Закрытые",
      scope: "Показать",
      allScope: "Все источники",
      search: "Поиск по подстроке",
      closeVisible: "Закрыть видимые",
      clearClosed: "Очистить закрытые",
      pause: "Заморозить счетчики",
      resume: "Возобновить счетчики",
      stats: {
        active: "Активных",
        dlSpeed: "Скорость загрузки",
        dl: "DL",
        ulSpeed: "Скорость отдачи",
        ul: "UL",
        memory: "Память",
      },
      columns: {
        close: "Закрыть",
        host: "Адрес",
        type: "Тип",
        rule: "Правило",
        chains: "Путь",
        dlSpeed: "Загрузка",
        ulSpeed: "Отдача",
        dl: "Получено",
        ul: "Отдано",
        connected: "Открыто",
      },
      noMatches: "По текущему фильтру соединений нет.",
    },
    toolsView: {
      kicker: "Инструменты",
      title: "Диагностика маршрута, правил, DNS и задержки",
      subtitle: "Проверка адреса показывает, куда пойдет трафик, какое правило сработает, что вернет DNS и какой будет задержка.",
      diagnosticTitle: "Диагностика адреса",
      diagnosticSubtitle: "Один ввод вместо набора отдельных кнопок: быстрая проверка показывает DNS, правило и путь трафика, полная дополнительно измеряет задержку.",
      diagnosticLabel: "Домены, IP или URL",
      diagnosticPlaceholder: "chatgpt.com\nopenai.com\n1.1.1.1",
      quickButton: "Быстрая проверка",
      fullButton: "Полная проверка",
      reportTitle: "Отчет диагностики",
      reportWaiting: "Запустите проверку, чтобы увидеть маршрут трафика.",
      reportRunning: "Собираю диагностику...",
      reportError: "Часть диагностики завершилась ошибкой.",
      reportTunnel: "Идет через туннель",
      reportDirect: "Идет напрямую",
      reportUnknown: "Маршрут пока не определен",
      primaryAddress: "Основной адрес",
      quickHint: "DNS, правило и путь трафика проверяются для первого адреса в списке.",
      fullHint: "Задержка измеряется для всех введенных адресов.",
      pipelineInput: "Ввод",
      pipelineDns: "DNS",
      pipelineRule: "Правило",
      pipelineGroup: "Группа",
      pipelineNode: "Узел",
      pipelineEgress: "Выходной IP",
      whyTitle: "Почему так",
      advancedTitle: "Детали для отладки",
      advancedSubtitle: "Сырые результаты проверок оставлены ниже для диагностики спорных случаев.",
      advancedRoute: "Маршрут и выходной IP",
      advancedRule: "Правила",
      advancedDns: "DNS",
      advancedLatency: "Задержка",
      routeTitle: "Через какой IP выйдет адрес",
      routeSubtitle: "Введите домен, IP или URL. Панель покажет внешний IP, страну, провайдера и отметит, совпадает ли этот IP с известной нодой из подписок.",
      routeLabel: "Адрес",
      routePlaceholder: "chatgpt.com или https://chatgpt.com/",
      routeButton: "Определить выходной IP",
      routeEmpty: "Пока ничего не проверялось.",
      routeDirect: "Напрямую",
      routeProxy: "Через туннель",
      nodeFound: "Совпадает с нодой",
      nodeMissing: "Не совпадает с нодами",
      ip: "IP",
      country: "Страна",
      provider: "Провайдер",
      node: "Нода",
      subscription: "Подписка",
      rule: "Правило",
      bases: "Списки / базы",
      basis: "Почему так",
      lastCheck: "Последняя проверка",
      addressRequired: "Нужно указать адрес",
      statusIdle: "\u041d\u0435 \u0437\u0430\u043f\u0443\u0441\u043a\u0430\u043b\u043e\u0441\u044c",
      statusIdleHint: "\u0417\u0430\u043f\u0443\u0441\u0442\u0438\u0442\u0435 \u043f\u0440\u043e\u0432\u0435\u0440\u043a\u0443, \u0447\u0442\u043e\u0431\u044b \u043f\u043e\u043b\u0443\u0447\u0438\u0442\u044c \u0440\u0435\u0437\u0443\u043b\u044c\u0442\u0430\u0442.",
      statusRunning: "\u0418\u0434\u0435\u0442 \u043f\u0440\u043e\u0432\u0435\u0440\u043a\u0430",
      statusRunningHint: "\u0416\u0434\u0443 \u043e\u0442\u0432\u0435\u0442 \u043e\u0442 \u0440\u043e\u0443\u0442\u0435\u0440\u0430. \u042d\u0442\u043e \u043c\u043e\u0436\u0435\u0442 \u0437\u0430\u043d\u044f\u0442\u044c \u0434\u043e 45 \u0441\u0435\u043a\u0443\u043d\u0434.",
      statusSuccess: "\u0420\u0435\u0437\u0443\u043b\u044c\u0442\u0430\u0442 \u043f\u043e\u043b\u0443\u0447\u0435\u043d",
      statusError: "\u041e\u0448\u0438\u0431\u043a\u0430",
      buttonLoading: "\u041f\u0440\u043e\u0432\u0435\u0440\u044f\u0435\u043c...",
      basisLabels: {
        "mode-direct": "Сейчас включен режим direct: весь трафик уходит напрямую.",
        "mode-global": "Сейчас включен глобальный режим: весь трафик идет через активную ноду.",
        "rule-match": "Сработало одно из настроенных правил маршрутизации.",
        "proxy-bypassed": "Адрес попал под proxy-правило, но для блокируемого трафика выбран direct.",
        "default-direct": "Ни одно tunnel-правило не совпало, поэтому адрес идет напрямую.",
      },
      warnings: {
        "proxy-exit-not-found": "Внешний IP не найден среди известных нод из подписок.",
        "not-from-subscription": "Этот IP не совпадает ни с одной нодой из текущих подписок.",
      },
      ruleTitle: "Тестер правила",
      ruleSubtitle: "Показывает, какое правило и какие базы сработают для домена или IP еще до реального запроса.",
      ruleLabel: "Домен или IP",
      rulePlaceholder: "chatgpt.com или 1.1.1.1",
      ruleButton: "Проверить правило",
      ruleEmpty: "Проверка правил пока не запускалась.",
      matchedRule: "Сработает правило",
      priority: "Приоритет",
      action: "Действие",
      target: "Назначение",
      finalRoute: "Фактический маршрут сейчас",
      ruleBasis: "Логика выбора",
      ruleBasisLabels: {
        "rule-match": "Сработает первое подходящее правило по порядку приоритета.",
        fallback: "Совпадений с базами нет, поэтому сработает финальный fallback.",
      },
      dnsTitle: "DNS-диагностика",
      dnsSubtitle: "Показывает, какой локальный резолвер ответил, какой upstream был использован и какие A/AAAA записи вернулись.",
      dnsLabel: "Домен или URL",
      dnsPlaceholder: "chatgpt.com",
      dnsButton: "Проверить DNS",
      dnsEmpty: "DNS-проверка пока не запускалась.",
      dnsIpLiteral: "Для IP-адреса DNS-запрос не нужен: ответов A/AAAA не будет.",
      dnsResolved: "DNS",
      dnsLiteralIp: "IP literal",
      resolver: "Резолвер",
      resolverEndpoint: "Точка ответа",
      upstream: "Upstream",
      domainBases: "Базы для самого домена",
      dnsColumns: {
        type: "Тип",
        value: "Ответ",
        classification: "Попадание",
        bases: "Базы",
        rule: "Rule",
      },
      classificationLabels: {
        proxy: "proxy",
        direct: "direct",
        none: "нет совпадений",
      },
      latencyTitle: "Задержка до адресов",
      latencySubtitle: "Введите домены или IP через запятую. Для каждого адреса будут показаны разные типы ping и маршрут, по которому он пойдет сейчас.",
      latencyLabel: "Адреса",
      latencyPlaceholder: "chatgpt.com, youtube.com, 1.1.1.1",
      latencyButton: "Замерить задержку",
      latencyEmpty: "Результатов пока нет.",
      latencyColumns: {
        address: "Адрес",
        route: "Маршрут",
        icmp: "ICMP",
        tcp: "TCP 443",
        tls: "TLS",
        jitter: "Jitter",
        loss: "Loss",
        provider: "Провайдер",
      },
      latencyNoReply: "timeout",
      latencyInvalid: "ошибка",
    },
    misc: {
      eligibleNodes: "доступны",
      hiddenNodes: "скрыты",
      regionExit: "Выход",
      noData: "нет данных",
      direct: "Напрямую",
      noTunnel: "Без туннеля",
      mockSource: "Mock mode",
      choose: "Выбрать",
      current: "Текущий",
      usedNow: "Сейчас используется",
      summaryActive: "Текущий выход",
      processingReportSummary: "Сводка обработки",
      countryPickerEmpty: "Ничего не выбрано",
      egressPolicyInline: "Исключать egress по кодам стран",
      addDisabled: "Нужно заполнить URL",
      eligibleCountLine: (alive, blocked) => `${alive} годных узлов, ${blocked} скрыто политикой`,
      notReported: "не задан",
      connectionCountLine: (proxy, direct) => `${proxy} через туннель, ${direct} напрямую`,
      toastTheme: (value) => `Тема: ${value}`,
      toastLanguage: (value) => `Язык: ${value}`,
      toastMode: (value) => `Режим: ${value}`,
      toastTarget: (value) => `Цель для блокируемого трафика: ${value}`,
      toastAction: (value) => `Запущено действие: ${value}`,
      toastManualServer: (value) => `Ручной сервер: ${value}`,
      toastAddedSubscription: "Подписка добавлена в mock.",
      toastRemovedSubscription: "Подписка удалена из mock.",
      toastMeasured: "Диагностика обновлена.",
      toastUpdated: "Настройка обновлена.",
      liveEgressHint: "Политика egress применяется при полной пересборке подписок. Изменение списка стран или unknown-нод сразу влияет на новый пул.",
      liveAutoSelectionHint: "Автовыбор на роутере выполняет bridge-скрипт: metric, interval, sticky и tolerance применяются к реальному выбору узла.",
      liveRulesHint: "Базы и правила на роутере управляются из Mission Control: изменения сохраняются в модели, синхронизируются в UCI и перезагружают Nikki.",
      justNow: "только что",
      minAgo: (value) => `${value} мин назад`,
      hourAgo: (value) => `${value} ч назад`,
    },
  },
  en: {
    locale: "en-US",
    brandKicker: "by Blackfire",
    title: "Mission Control",
    tunnelHealthy: "Tunnel healthy",
    tunnelIssue: "Tunnel issue",
    tunnelSync: "Syncing",
    mockMode: "Local mode",
    realMode: "Router connected",
    headerSubtitle: "Routing control panel for Nikki and Mihomo with node, subscription, and maintenance workflows.",
    nav: {
      overview: "Overview",
      routing: "Routing",
      subscriptions: "Subscriptions",
      nodes: "Nodes",
      rules: "Bases & Rules",
      connections: "Connections",
      tools: "Tools",
      settings: "Settings",
      debug: "Debug",
    },
    sections: {
      workspace: "Workspace",
      currentProfile: "Current profile",
      lastMaintenance: "Last maintenance",
      subscriptions: "Subscriptions",
      nodeRetest: "Node retest",
      listUpdate: "List update",
      statsDownload: "Download",
      statsUpload: "Upload",
      statsMemory: "Memory",
      statsConnections: "Connections",
      liveTraffic: "Tunnel traffic",
      totalTraffic: "Total traffic",
      memoryBudget: "Budget",
      activeConnections: "active",
      traffic: "Traffic",
      throughputTitle: "Throughput in the last 30 minutes",
      incoming: "Incoming",
      outgoing: "Outgoing",
      currentRoute: "Current route",
      currentRouteTitle: "What happens with traffic now",
      latency: "Latency",
      latencyTitle: "Active node latency",
      latencyNote: "The panel shows the selected node latency against a check address close to real user traffic.",
      maintenance: "Maintenance",
      maintenanceTitle: "Real buttons, not fake proxy groups",
      recentEvents: "Recent events",
      recentEventsTitle: "What the system has done",
      internetMode: "Internet mode",
      internetModeTitle: "How traffic is routed",
      tunnelChoice: "Tunnel choice",
      tunnelChoiceTitle: "Who carries blocked traffic",
      autoSelection: "Auto selection",
      autoSelectionTitle: "How the system automatically chooses an exit node",
      listSection: "Lists",
      listSectionTitle: "What is routed",
      tunnelLists: "Tunnel lists",
      directOverrides: "Direct overrides",
      subscriptionsMenu: "Subscription management",
      subscriptionsMenuTitle: "Node sources and their settings",
      egressPolicy: "Exit-country policy",
      egressPolicyTitle: "Which exit countries should be excluded from the pool",
      inventory: "Subscription inventory",
      inventoryTitle: "Which sources exist and how many nodes they provide",
      reprocessReport: "Processing report",
      reprocessReportTitle: "What was kept after applying the exit-country policy",
      healthyPool: "Healthy pool",
      healthyPoolTitle: "Available tunnel nodes without forbidden egress",
      healthyPoolNote: "",
      hiddenNodes: "Hidden nodes",
      hiddenNodesTitle: "What is removed from the client-facing list",
      appearance: "Appearance",
      appearanceTitle: "Theme, language, and interface scale",
      panelBehavior: "Panel behavior",
      panelBehaviorTitle: "Live panel behavior",
      automation: "Automation",
      automationTitle: "All automatic updates",
      mihomoRuntime: "Mihomo",
      mihomoRuntimeTitle: "Core memory limit",
      measurements: "Charts and units",
      measurementsTitle: "Range, line thickness, and measurement units",
      controller: "Debug",
      controllerTitle: "Controller connection and service checks",
      integration: "Integration",
      integrationTitle: "How this mock maps to the real router",
      integrationRouting: "Routing",
      integrationRoutingText: "Buttons will call the Mihomo controller directly for mode changes and node selection while hiding GLOBAL and service groups.",
      integrationMaintenance: "Maintenance",
      integrationMaintenanceText: "Maintenance buttons call the router bridge directly, so refresh, base sync, retest, and restart return the real router-side result instead of a fake selector state.",
      integrationStatus: "Status",
      integrationStatusText: "Charts, node health, the active tunnel path, and the live service groups come from the router controller rather than mock data.",
    },
    modes: {
      smart: "Normal mode",
      direct: "All direct",
      global: "Full tunnel",
    },
    modeDescriptions: {
      smart: "Direct by default. Only traffic from RU lists uses the tunnel.",
      direct: "Disable tunnel usage for all traffic while keeping the stack intact.",
      global: "Force all traffic through the selected tunnel node.",
    },
    modeWarnings: {
      global: "Warning: full-tunnel mode can leak traffic if the selected node or route path fails unexpectedly.",
    },
    targets: {
      auto: "Auto best",
      manual: "Manual",
      direct: "Direct",
    },
    routeBadges: {
      listModeRu: "Lists: RU only",
      listModeFull: "Lists: full",
      node: "Node",
    },
    routeDetails: {
      activeNode: "Active node",
      bestNode: "Best node",
      rejected: "Policy exclusions",
      lastRetest: "Last retest",
    },
    routeSummary: {
      direct: "Nothing goes through the tunnel right now: all traffic is direct.",
      global: "All traffic goes through this node.",
      blockedVia: (listsLabel) => `Only traffic from these lists goes through this node: ${listsLabel}.`,
      blockedDirect: "Nothing goes through the tunnel right now: listed traffic is also direct.",
      emptyLists: "Nothing goes through the tunnel right now: the tunnel list set is empty.",
      waiting: "No suitable exit node is available, so nothing goes through the tunnel right now.",
    },
    maintenanceActions: {
      refreshSubscriptions: {
        title: "Refresh subscriptions",
        subtitle: "Pull all sources, remove nodes with blocked exit countries, and rebuild the pool",
      },
      retestServers: {
        title: "Retest servers",
        subtitle: "Run a fresh latency pass and choose the best node",
      },
      updateLists: {
        title: "Update RU lists",
        subtitle: "Refresh runetfreedom domain/IP datasets",
      },
      restartTunnel: {
        title: "Restart tunnel",
        subtitle: "Restart the Mihomo core and wait for the controller API to come back",
      },
      reprocessSubscriptions: {
        title: "Reprocess all subscriptions",
        subtitle: "Apply the current exit-country policy and produce a short report",
      },
      idle: "Ready",
      busy: "Running...",
    },
    autoSelection: {
      metric: "Selection metric",
      interval: "Re-evaluate nodes",
      tolerance: "Switch only if the new node is better by at least",
      sticky: "Keep the current node while it remains healthy",
      minScore: "Minimum quality score for auto selection",
      metricOptions: {
        latency: "By latency",
        speed: "By speed",
        hybrid: "Hybrid",
      },
      intervalOptions: {
        5: "Every 5 minutes",
        10: "Every 10 minutes",
        30: "Every 30 minutes",
        60: "Every hour",
      },
      toleranceOptions: {
        60: "60 ms / 10%",
        120: "120 ms / 18%",
        200: "200 ms / 25%",
      },
      summaryTitle: "AUTO BEST currently prefers",
      summaryLine: (metric, interval) => `Metric: ${metric}. Recheck: ${interval}.`,
    },
    lists: {
      currentResult: "Current outcome",
    },
    subscriptionForm: {
      name: "Name",
      namePlaceholder: "For example, Family US pool",
      url: "Subscription URL",
      urlPlaceholder: "https://example.com/sub/....",
      format: "Format",
      add: "Add subscription",
      remove: "Remove",
      lastSync: "Last sync",
      discovered: "Discovered",
      used: "Used",
      rejected: "Rejected",
      egresses: "Exit countries",
      refreshHint: "Add a node source: the panel will fetch the subscription, rebuild the pool, and show the processing result.",
      managementHint: "Add, edit, and remove subscription sources. After changes, the panel rebuilds the pool and refreshes the processing report.",
      formatOptions: {
        "3x-ui": "3x-ui",
        sharx: "SharX",
        clash: "Clash",
      },
    },
    egressPolicy: {
      blockedCountries: "Blocked exit countries",
      helper: "If a node exits through one of these countries, it will not enter the working pool.",
      reprocess: "Reprocess all subscriptions",
      allowUnknown: "Allow nodes without a detected exit country",
      reportAt: "Last reprocess",
      discovered: "Discovered nodes",
      kept: "Used nodes",
      rejected: "Rejected nodes",
      bySubscription: "Per subscription",
      usedNodes: "Used",
      rejectedNodes: "Rejected",
      reasonCountry: "Exit country blocked by policy",
      reasonUnknown: "Exit country not detected",
    },
    nodeStatus: {
      best: "Best",
      alive: "Ready",
      unstable: "Unstable",
      blocked: "Hidden by policy",
    },
    nodeFields: {
      provider: "Provider",
      protocol: "Protocol",
      egress: "Exit country",
      jitter: "Latency jitter",
      down: "Download",
      up: "Upload",
      score: "Score",
      subscription: "Subscription",
      useManual: "Use manually",
      timeout: "timeout",
    },
    settings: {
      theme: "Theme",
      language: "Language",
      scale: "Interface scale",
      density: "Density",
      graphRange: "Graph range",
      chartLineWidth: "Chart line thickness",
      chartLinePreview: "Line preview",
      speedUnitMode: "Speed units",
      storageUnitSystem: "Traffic and memory units",
      autoRefresh: "Live auto refresh",
      animations: "Animations",
      automationEnabled: "Enable automatic updates",
      subscriptionRefreshMinutes: "Pool and subscription refresh, min",
      logCleanupMinutes: "Log cleanup, min",
      manualIntervalHint: "0 = manual only",
      automationHint:
        "All intervals are configured here: live metrics, node auto-selection, subscription refresh, log cleanup, and remote base updates.",
      automationDisabledHint: "When disabled, automatic subscription refresh, log cleanup, and remote base sync stop running.",
      mihomoMemoryLimit: "Mihomo memory limit",
      mihomoMemoryLimitHint:
        "Limits the Mihomo process through GOMEMLIMIT. Value 0 disables the limit. Changing it saves the setting on the router and restarts the tunnel.",
      memoryLimitDisabled: "No limit",
      remoteBaseTimers: "Remote base timers",
      remoteBaseTimersHint: "Each remote domain or IP base is scheduled here instead of inside the base editor card.",
      noRemoteTimers: "There are no remote auto-updated bases.",
      timerOverviewTitle: "What auto-updates and where to configure it",
      timerOverviewLive: "Charts and live metrics: the live polling slider in this card.",
      timerOverviewAutoBest: "Node auto-selection: the node re-evaluation slider in this card.",
      timerOverviewSubscriptions: "Pool and subscription rebuild: the subscription refresh slider in this card.",
      timerOverviewLogCleanup: "Log cleanup: the log cleanup slider in this card.",
      timerOverviewBases: "Remote domain/IP bases: individual timers in this card.",
      controllerMode: "Data source",
      controllerUrl: "Mihomo API URL",
      controllerSecret: "Bearer secret",
      selectorGroup: "Proxy selector group",
      delayUrl: "Delay test URL",
      delayTimeout: "Delay timeout, ms",
      pollInterval: "Refresh live metrics every",
      useWebSocket: "Use WebSocket for traffic",
      testApi: "Test API",
      refreshApi: "Refresh now",
      secretSaved: "Secret is saved in localStorage and will be sent as Authorization: Bearer <secret>.",
      clearSecret: "Clear secret",
      apiConfigHint: "Mission Control talks through a built-in bridge on the router, so the Mihomo secret and API URL stay hidden there. Switch to direct Mihomo API only for PC debugging.",
      managedByBridge: "Managed by router bridge",
      releaseCheckMinutes: "Mission Control update check, min",
      uiAutoUpdate: "Auto-update UI",
      bridgeAutoUpdate: "Auto-update bridge",
      releaseStatusTitle: "Mission Control update status",
      releaseStatusHint: "The UI and bridge check GitHub Releases on this schedule. Checks and updates run entirely on the router.",
      releaseCurrentUi: "Current UI version",
      releaseCurrentBridge: "Current bridge version",
      releaseLatestUi: "Latest UI version",
      releaseLatestBridge: "Latest bridge version",
      releaseLastCheckedAt: "Last checked",
      releaseLastAppliedAt: "Last applied",
      releaseManifestUrl: "Manifest URL",
      releaseStateIdle: "Waiting",
      releaseStateOk: "Success",
      releaseStateFailed: "Failed",
      releaseLastError: "Last error",
      releaseStateRunning: "Checking...",
      releaseLatestTag: "Latest release",
      releasePublishedAt: "Published",
      releaseReleaseUrl: "Release URL",
      releaseChangelog: "Latest release changelog",
      releaseNoChangelog: "No changelog has been published for this release yet.",
      releaseCheckNow: "Check for updates",
      releaseUpdateNow: "Update",
      releaseManualHint:
        "This button checks GitHub Releases on demand, shows the changelog for the latest release, and turns into Update when a newer version is available.",
      releaseUpdateAvailable: "Update available",
      secretPlaceholder: "Bearer token",
      backendModeOptions: {
        mock: "Local mock",
        real: "Real Mihomo API",
      },
      themeOptions: {
        graphite: "Graphite",
        pearl: "Pearl",
        cobalt: "Cobalt",
        ember: "Ember",
        sage: "Sage",
        noir: "Noir",
      },
      densityOptions: {
        comfortable: "Comfortable",
        compact: "Compact",
      },
      graphRangeOptions: {
        1: "1 minute",
        60: "1 hour",
      },
      speedUnitOptions: {
        bits: "Bits per second",
        bytes: "Bytes per second",
      },
      storageUnitOptions: {
        binary: "Binary: KiB / MiB / GiB",
        decimal: "Decimal: kB / MB / GB",
      },
      languageOptions: {
        ru: "Russian",
        en: "English",
      },
    },
    rulesView: {
      kicker: "Bases & Rules",
      title: "What feeds the routing rules",
      subtitle: "This page shows which bases are loaded, which rules are active, and what each rule actually consumes.",
      basesTitle: "Base catalog",
      rulesTitle: "Rule order",
      baseEditorTitle: "Selected base settings",
      ruleEditorTitle: "Selected rule settings",
      createBaseTitle: "Add a base",
      createRuleTitle: "Add a rule",
      updateAll: "Update all remote bases",
      syncNow: "Sync now",
      attachBases: "Bases used by this rule",
      entries: "Local list lines",
      preview: "Content preview",
      emptyEntries: "This local list is empty.",
      baseSourceUrl: "Source",
      baseFormat: "Format",
      baseRuntime: "Runtime mode",
      baseInterval: "Auto update",
      baseKind: "Kind",
      baseScope: "Purpose",
      baseEnabled: "Base enabled",
      baseAutoUpdate: "Update automatically",
      baseItems: "Items",
      baseLastSync: "Last sync",
      rulePriority: "Priority",
      ruleAction: "Action",
      ruleTarget: "Send to",
      ruleEnabled: "Rule enabled",
      ruleLocked: "System rule",
      ruleMatchMode: "Match mode",
      note: "Note",
      addBase: "Add base",
      addRule: "Add rule",
      addEntry: "Add line",
      remove: "Remove",
      enable: "Enabled",
      disable: "Disabled",
      kindOptions: {
        domains: "Domains",
        ips: "IP / CIDR",
      },
      scopeOptions: {
        proxy: "For tunnel",
        direct: "For direct overrides",
      },
      sourceTypeOptions: {
        local: "Local list",
        remote: "Remote source",
      },
      formatOptions: {
        "plain-list": "Plain list",
        "geosite-dat": "geosite.dat",
        "geoip-dat": "geoip.dat",
      },
      intervalOptions: {
        0: "Manual",
        6: "Every 6 hours",
        12: "Every 12 hours",
        24: "Every day",
      },
      actionOptions: {
        DIRECT: "DIRECT",
        PROXY: "PROXY",
      },
      targetOptions: {
        DIRECT: "DIRECT",
        "BLOCKED SITES": "BLOCKED SITES",
      },
      matchModes: {
        any: "Any match",
        final: "Final fallback",
      },
      ruleSummary: (bases, items) => `${bases} base(s), ${items} item(s)`,
    },
    listEditor: {
      search: "Substring search",
      searchPlaceholder: "Find a domain, IP, or line fragment",
      previous: "Previous",
      next: "Next",
      scale: "Editor scale",
      apply: "Apply changes",
      cancel: "Cancel changes",
      noMatches: "No matches",
      lines: (count) => count ? `${count} lines` : "List is empty",
      matches: (current, total) => `${current} / ${total} matches`,
    },
    connectionsView: {
      kicker: "Connections",
      title: "Live connections",
      subtitle: "See which addresses are open, which rule matched, which path traffic used, and how much data moved.",
      activeTab: (count) => `Active (${count})`,
      closedTab: "Closed",
      scope: "Show",
      allScope: "All sources",
      search: "Substring search",
      closeVisible: "Close visible",
      clearClosed: "Clear closed",
      pause: "Freeze counters",
      resume: "Resume counters",
      stats: {
        active: "Active",
        dlSpeed: "DL speed",
        dl: "DL",
        ulSpeed: "UL speed",
        ul: "UL",
        memory: "Memory",
      },
      columns: {
        close: "Close",
        host: "Host",
        type: "Type",
        rule: "Rule",
        chains: "Chains",
        dlSpeed: "DL speed",
        ulSpeed: "UL speed",
        dl: "DL",
        ul: "UL",
        connected: "Connect time",
      },
      noMatches: "No connections match the current filter.",
    },
    toolsView: {
      kicker: "Tools",
      title: "Route, rule, DNS, and latency diagnostics",
      subtitle: "Check where traffic will go, which rule will match, what DNS returns, and what latency to expect.",
      diagnosticTitle: "Address diagnostics",
      diagnosticSubtitle: "One workflow instead of separate buttons: quick check shows DNS, rule, and traffic path; full check also measures latency.",
      diagnosticLabel: "Domains, IPs, or URLs",
      diagnosticPlaceholder: "chatgpt.com\nopenai.com\n1.1.1.1",
      quickButton: "Quick check",
      fullButton: "Full check",
      reportTitle: "Diagnostic report",
      reportWaiting: "Run a check to see the traffic path.",
      reportRunning: "Collecting diagnostics...",
      reportError: "Part of the diagnostics failed.",
      reportTunnel: "Leaves through tunnel",
      reportDirect: "Leaves directly",
      reportUnknown: "Route is not known yet",
      primaryAddress: "Primary address",
      quickHint: "DNS, rule, and traffic path are checked for the first address in the list.",
      fullHint: "Latency is measured for all entered addresses.",
      pipelineInput: "Input",
      pipelineDns: "DNS",
      pipelineRule: "Rule",
      pipelineGroup: "Group",
      pipelineNode: "Node",
      pipelineEgress: "Exit IP",
      whyTitle: "Why",
      advancedTitle: "Debug details",
      advancedSubtitle: "Raw check results are kept below for diagnostics and edge cases.",
      advancedRoute: "Route and exit IP",
      advancedRule: "Rules",
      advancedDns: "DNS",
      advancedLatency: "Latency",
      routeTitle: "Which IP is used for this address",
      routeSubtitle: "Enter a domain, IP, or URL. The panel will show the exit IP, country, provider, and whether that IP matches a known node from subscriptions.",
      routeLabel: "Address",
      routePlaceholder: "chatgpt.com or https://chatgpt.com/",
      routeButton: "Detect exit IP",
      routeEmpty: "Nothing checked yet.",
      routeDirect: "Direct",
      routeProxy: "Via tunnel",
      nodeFound: "Matches a node",
      nodeMissing: "No node match",
      ip: "IP",
      country: "Country",
      provider: "Provider",
      node: "Node",
      subscription: "Subscription",
      rule: "Rule",
      bases: "Lists / bases",
      basis: "Why",
      lastCheck: "Last check",
      addressRequired: "Address is required",
      statusIdle: "Not started",
      statusIdleHint: "Run a check to get a result.",
      statusRunning: "Check in progress",
      statusRunningHint: "Waiting for the router to respond. This can take up to 45 seconds.",
      statusSuccess: "Result received",
      statusError: "Error",
      buttonLoading: "Checking...",
      basisLabels: {
        "mode-direct": "Direct mode is enabled, so every request leaves directly.",
        "mode-global": "Global mode is enabled, so every request leaves through the active node.",
        "rule-match": "A configured routing rule matched this address.",
        "proxy-bypassed": "A proxy rule matched, but blocked traffic is currently set to direct.",
        "default-direct": "No tunnel rule matched, so the address leaves directly.",
      },
      warnings: {
        "proxy-exit-not-found": "The exit IP is not present in the known subscription node inventory.",
        "not-from-subscription": "This exit IP does not match any node from the current subscriptions.",
      },
      ruleTitle: "Rule tester",
      ruleSubtitle: "Shows which rule and which bases would match a domain or IP before the real request is sent.",
      ruleLabel: "Domain or IP",
      rulePlaceholder: "chatgpt.com or 1.1.1.1",
      ruleButton: "Test rule",
      ruleEmpty: "Rule testing has not been run yet.",
      matchedRule: "Matched rule",
      priority: "Priority",
      action: "Action",
      target: "Target",
      finalRoute: "Effective route right now",
      ruleBasis: "Selection logic",
      ruleBasisLabels: {
        "rule-match": "The first matching rule in priority order wins.",
        fallback: "No base matched, so the final fallback rule would apply.",
      },
      dnsTitle: "DNS diagnostics",
      dnsSubtitle: "Shows which local resolver answered, which upstream path was used, and which A/AAAA records came back.",
      dnsLabel: "Domain or URL",
      dnsPlaceholder: "chatgpt.com",
      dnsButton: "Check DNS",
      dnsEmpty: "DNS diagnostics have not been run yet.",
      dnsIpLiteral: "A literal IP does not need DNS resolution, so there are no A/AAAA answers.",
      dnsResolved: "DNS",
      dnsLiteralIp: "IP literal",
      resolver: "Resolver",
      resolverEndpoint: "Reply endpoint",
      upstream: "Upstream",
      domainBases: "Bases matching the domain",
      dnsColumns: {
        type: "Type",
        value: "Answer",
        classification: "Hit",
        bases: "Bases",
        rule: "Rule",
      },
      classificationLabels: {
        proxy: "proxy",
        direct: "direct",
        none: "no hits",
      },
      latencyTitle: "Latency to target addresses",
      latencySubtitle: "Enter domains or IPs separated by commas. The table shows different ping types and the route each target would currently use.",
      latencyLabel: "Addresses",
      latencyPlaceholder: "chatgpt.com, youtube.com, 1.1.1.1",
      latencyButton: "Measure latency",
      latencyEmpty: "No measurements yet.",
      latencyColumns: {
        address: "Address",
        route: "Route",
        icmp: "ICMP",
        tcp: "TCP 443",
        tls: "TLS",
        jitter: "Jitter",
        loss: "Loss",
        provider: "Provider",
      },
      latencyNoReply: "timeout",
      latencyInvalid: "error",
    },
    misc: {
      eligibleNodes: "eligible",
      hiddenNodes: "hidden",
      regionExit: "Exit",
      noData: "no data",
      direct: "Direct",
      noTunnel: "No tunnel",
      mockSource: "Mock mode",
      choose: "Choose",
      current: "Current",
      usedNow: "Used now",
      summaryActive: "Current exit",
      processingReportSummary: "Processing summary",
      countryPickerEmpty: "Nothing selected",
      egressPolicyInline: "Exclude by country code",
      addDisabled: "URL is required",
      eligibleCountLine: (alive, blocked) => `${alive} good nodes, ${blocked} hidden by policy`,
      notReported: "not reported",
      connectionCountLine: (proxy, direct) => `${proxy} tunneled, ${direct} direct`,
      toastTheme: (value) => `Theme: ${value}`,
      toastLanguage: (value) => `Language: ${value}`,
      toastMode: (value) => `Mode: ${value}`,
      toastTarget: (value) => `Blocked traffic target: ${value}`,
      toastAction: (value) => `Action started: ${value}`,
      toastManualServer: (value) => `Manual server: ${value}`,
      toastAddedSubscription: "Subscription added to the mock.",
      toastRemovedSubscription: "Subscription removed from the mock.",
      toastMeasured: "Diagnostics refreshed.",
      toastUpdated: "Setting updated.",
      liveEgressHint: "The egress policy is applied during a full subscription rebuild. Changing blocked countries or unknown-node handling immediately affects the rebuilt pool.",
      liveAutoSelectionHint: "Auto selection is executed by the router bridge script: metric, interval, sticky mode, and tolerance now control the real node selection logic.",
      liveRulesHint: "Bases and rules are managed from Mission Control: changes are persisted in the panel model, synchronized into Nikki UCI sections, and reloaded live.",
      justNow: "just now",
      minAgo: (value) => `${value} min ago`,
      hourAgo: (value) => `${value} h ago`,
    },
  },
};

const state = {
  view: "overview",
  snapshot: null,
  toast: "",
  renderedShellSignature: "",
  renderedViewStructureSignature: "",
  activeRangeKey: "",
  openMenu: null,
  selectedBaseId: "ru-blocked-domains",
  selectedRuleId: "direct-overrides",
  listEditors: {},
  connectionFilters: {
    tab: "active",
    scope: CONNECTION_SCOPE_ALL,
    search: "",
  },
  subscriptionDraft: createEmptySubscriptionDraft(),
  subscriptionEdits: {},
  baseDraft: {
    name: "",
    scope: "proxy",
    kind: "domains",
    sourceType: "local",
  },
  ruleDraft: {
    name: "",
    action: "PROXY",
    target: "BLOCKED SITES",
  },
  controllerSecretDraft: "",
  toolDrafts: {
    diagnosticAddresses: "chatgpt.com\nopenai.com\n1.1.1.1",
    routeAddress: "chatgpt.com",
    ruleAddress: "chatgpt.com",
    dnsAddress: "chatgpt.com",
    latencyAddresses: "chatgpt.com, youtube.com, 1.1.1.1",
  },
};

function createEmptySubscriptionDraft() {
  return {
    name: "",
    url: "",
    format: "3x-ui",
  };
}

function createSubscriptionEdit(subscription) {
  return {
    name: subscription.name || "",
    url: subscription.url || "",
    format: subscription.format || "clash",
    persistedName: subscription.name || "",
    persistedUrl: subscription.url || "",
    persistedFormat: subscription.format || "clash",
  };
}

function isSubscriptionEditDirty(edit) {
  return edit.name !== edit.persistedName || edit.url !== edit.persistedUrl || edit.format !== edit.persistedFormat;
}

function reconcileSubscriptionEdits(snapshot) {
  const next = {};
  for (const subscription of snapshot?.derived?.subscriptionSummaries || []) {
    const existing = state.subscriptionEdits[subscription.id];
    const persisted = createSubscriptionEdit(subscription);
    if (!existing) {
      next[subscription.id] = persisted;
      continue;
    }
    next[subscription.id] = {
      ...existing,
      persistedName: persisted.persistedName,
      persistedUrl: persisted.persistedUrl,
      persistedFormat: persisted.persistedFormat,
    };
    if (!isSubscriptionEditDirty(next[subscription.id])) {
      next[subscription.id] = persisted;
    }
  }
  state.subscriptionEdits = next;
}

function ensureSubscriptionEdit(subscription) {
  if (!state.subscriptionEdits[subscription.id]) {
    state.subscriptionEdits[subscription.id] = createSubscriptionEdit(subscription);
  }
  return state.subscriptionEdits[subscription.id];
}

function getCopy(language) {
  return translations[language] || translations.ru;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeCssIdentifier(value) {
  if (window.CSS && typeof window.CSS.escape === "function") {
    return window.CSS.escape(String(value));
  }
  return String(value).replace(/[^a-zA-Z0-9_-]/g, "\\$&");
}

function listEditorTextFromItems(items) {
  return (Array.isArray(items) ? items : [])
    .map((item) => String(item ?? "").replaceAll("\r", "").trim())
    .filter(Boolean)
    .join("\n");
}

function parseListEditorText(text) {
  return String(text ?? "")
    .replaceAll("\r", "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function normalizeListEditorText(text) {
  return parseListEditorText(text).join("\n");
}

function clampListEditorScale(value) {
  return clampRangeValue(value, 70, 170);
}

function findListEditorMatches(text, query) {
  const source = String(text ?? "");
  const needle = String(query ?? "").trim().toLocaleLowerCase();
  if (!needle) {
    return [];
  }
  const haystack = source.toLocaleLowerCase();
  const matches = [];
  let offset = 0;

  while (offset <= haystack.length) {
    const start = haystack.indexOf(needle, offset);
    if (start === -1) {
      break;
    }
    matches.push({
      start,
      end: start + needle.length,
    });
    offset = start + Math.max(needle.length, 1);
  }

  return matches;
}

function createListEditorState(sourceText, options = {}) {
  return {
    persistedText: sourceText,
    draftText: sourceText,
    search: "",
    activeMatchIndex: -1,
    scale: clampListEditorScale(options.defaultScale ?? 100),
    readOnly: options.readOnly !== false,
    isSaving: false,
    saveError: "",
    scrollTop: 0,
    scrollLeft: 0,
  };
}

function isListEditorDirty(editor) {
  return normalizeListEditorText(editor.draftText) !== editor.persistedText;
}

function getListEditorState(editorId, items, options = {}) {
  const sourceText = listEditorTextFromItems(items);
  let editor = state.listEditors[editorId];

  if (!editor) {
    editor = createListEditorState(sourceText, options);
    state.listEditors[editorId] = editor;
  }

  const wasDirty = isListEditorDirty(editor);
  editor.persistedText = sourceText;
  editor.readOnly = options.readOnly !== false;
  if (!Number.isFinite(editor.scale)) {
    editor.scale = clampListEditorScale(options.defaultScale ?? 100);
  }

  if (editor.readOnly || !wasDirty || normalizeListEditorText(editor.draftText) === sourceText) {
    editor.draftText = sourceText;
  }

  return editor;
}

function getListEditorComputed(editor) {
  const matches = findListEditorMatches(editor.draftText, editor.search);
  let activeMatchIndex = editor.activeMatchIndex;
  if (!matches.length) {
    activeMatchIndex = -1;
  } else if (activeMatchIndex < 0 || activeMatchIndex >= matches.length) {
    activeMatchIndex = 0;
  }
  editor.activeMatchIndex = activeMatchIndex;
  return {
    dirty: !editor.readOnly && isListEditorDirty(editor),
    lineCount: parseListEditorText(editor.draftText).length,
    matches,
    activeMatchIndex,
  };
}

function renderListEditorHighlights(text, search, activeMatchIndex) {
  const source = String(text ?? "");
  const matches = findListEditorMatches(source, search);
  if (!matches.length) {
    return escapeHtml(source || " ");
  }

  let cursor = 0;
  let html = "";
  matches.forEach((match, index) => {
    html += escapeHtml(source.slice(cursor, match.start));
    html += `<mark class="list-editor-highlight ${index === activeMatchIndex ? "is-active" : ""}">${escapeHtml(source.slice(match.start, match.end))}</mark>`;
    cursor = match.end;
  });
  html += escapeHtml(source.slice(cursor));
  return html || " ";
}

function listEditorMatchStatus(copy, editor, computed) {
  if (!editor.search.trim()) {
    return copy.listEditor.matches(0, 0);
  }
  if (!computed.matches.length) {
    return copy.listEditor.noMatches;
  }
  return copy.listEditor.matches(computed.activeMatchIndex + 1, computed.matches.length);
}

function listEditorStatusText(copy, editor, computed) {
  const summary = copy.listEditor.lines(computed.lineCount);
  if (editor.isSaving) {
    return `${summary} · ${state.snapshot?.settings?.language === "ru" ? "Сохранение..." : "Saving..."}`;
  }
  if (editor.saveError) {
    return `${summary} · ${editor.saveError}`;
  }
  return summary;
}

function syncListEditorOverlayScroll(textarea) {
  const container = textarea.closest("[data-list-editor]");
  const overlay = container?.querySelector("[data-list-editor-overlay]");
  if (!(overlay instanceof HTMLElement)) {
    return;
  }
  overlay.scrollTop = textarea.scrollTop;
  overlay.scrollLeft = textarea.scrollLeft;
}

function syncRenderedListEditor(editorId) {
  const container = root.querySelector(`[data-list-editor="${escapeCssIdentifier(editorId)}"]`);
  if (!(container instanceof HTMLElement)) {
    return;
  }

  const editor = state.listEditors[editorId];
  if (!editor) {
    return;
  }

  const copy = getCopy(state.snapshot?.settings?.language || "ru");
  const computed = getListEditorComputed(editor);
  container.style.setProperty("--list-editor-scale", String(editor.scale / 100));
  container.classList.toggle("is-saving", Boolean(editor.isSaving));

  const searchInput = container.querySelector("[data-list-editor-search]");
  if (searchInput instanceof HTMLInputElement && searchInput.value !== editor.search) {
    searchInput.value = editor.search;
  }
  if (searchInput instanceof HTMLInputElement) {
    searchInput.disabled = editor.isSaving;
  }

  const scaleInput = container.querySelector("[data-list-editor-scale]");
  if (scaleInput instanceof HTMLInputElement && scaleInput.value !== String(editor.scale)) {
    scaleInput.value = String(editor.scale);
  }
  if (scaleInput instanceof HTMLInputElement) {
    scaleInput.disabled = editor.isSaving;
  }

  const scaleValue = container.querySelector("[data-list-editor-scale-value]");
  if (scaleValue) {
    scaleValue.textContent = formatScaleLabel(editor.scale);
  }

  const status = container.querySelector("[data-list-editor-status]");
  if (status) {
    status.textContent = listEditorStatusText(copy, editor, computed);
  }

  const matchStatus = container.querySelector("[data-list-editor-match-status]");
  if (matchStatus) {
    matchStatus.textContent = listEditorMatchStatus(copy, editor, computed);
  }

  const textarea = container.querySelector("[data-list-editor-text]");
  if (textarea instanceof HTMLTextAreaElement) {
    if (textarea.value !== editor.draftText) {
      textarea.value = editor.draftText;
    }
    textarea.readOnly = editor.readOnly || editor.isSaving;
    textarea.scrollTop = editor.scrollTop;
    textarea.scrollLeft = editor.scrollLeft;
  }

  const overlayContent = container.querySelector("[data-list-editor-overlay-content]");
  if (overlayContent) {
    overlayContent.innerHTML = renderListEditorHighlights(
      editor.draftText,
      editor.search,
      computed.activeMatchIndex,
    );
  }

  if (textarea instanceof HTMLTextAreaElement) {
    syncListEditorOverlayScroll(textarea);
  }

  const navButtons = container.querySelectorAll("[data-list-editor-nav]");
  navButtons.forEach((button) => {
    button.disabled = editor.isSaving || !computed.matches.length;
  });

  const applyButton = container.querySelector("[data-list-editor-apply]");
  if (applyButton instanceof HTMLButtonElement) {
    applyButton.disabled = editor.isSaving || !computed.dirty;
  }

  const cancelButton = container.querySelector("[data-list-editor-cancel]");
  if (cancelButton instanceof HTMLButtonElement) {
    cancelButton.disabled = editor.isSaving || !computed.dirty;
  }
}

function syncRenderedListEditors() {
  root.querySelectorAll("[data-list-editor]").forEach((element) => {
    const editorId = element.getAttribute("data-list-editor");
    if (editorId) {
      syncRenderedListEditor(editorId);
    }
  });
}

function focusListEditorMatch(editorId) {
  const container = root.querySelector(`[data-list-editor="${escapeCssIdentifier(editorId)}"]`);
  const textarea = container?.querySelector("[data-list-editor-text]");
  const editor = state.listEditors[editorId];
  if (!(textarea instanceof HTMLTextAreaElement) || !editor) {
    return;
  }
  const computed = getListEditorComputed(editor);
  const match = computed.matches[computed.activeMatchIndex];
  if (!match) {
    return;
  }

  try {
    textarea.focus({ preventScroll: true });
  } catch {
    textarea.focus();
  }
  textarea.setSelectionRange(match.start, match.end);
  editor.scrollTop = textarea.scrollTop;
  editor.scrollLeft = textarea.scrollLeft;
  syncListEditorOverlayScroll(textarea);
}

function moveListEditorMatch(editorId, direction) {
  const editor = state.listEditors[editorId];
  if (!editor) {
    return;
  }
  const computed = getListEditorComputed(editor);
  if (!computed.matches.length) {
    syncRenderedListEditor(editorId);
    return;
  }
  const step = direction === "prev" ? -1 : 1;
  editor.activeMatchIndex = (computed.activeMatchIndex + step + computed.matches.length) % computed.matches.length;
  syncRenderedListEditor(editorId);
  focusListEditorMatch(editorId);
}

async function applyListEditorChanges(editorId) {
  const editor = state.listEditors[editorId];
  if (!editor || editor.readOnly || editor.isSaving || !isListEditorDirty(editor)) {
    return false;
  }

  if (editorId.startsWith("base:")) {
    const baseId = editorId.slice(5);
    const entries = parseListEditorText(editor.draftText);
    const normalized = entries.join("\n");
    editor.draftText = normalized;
    editor.isSaving = true;
    editor.saveError = "";
    syncRenderedListEditor(editorId);
    try {
      await backend.updateBase(baseId, { entries }, { propagateError: true });
      editor.persistedText = normalized;
      editor.draftText = normalized;
      editor.activeMatchIndex = -1;
      editor.saveError = "";
      return true;
    } catch (error) {
      editor.saveError = error?.message || String(error || "Save failed.");
      throw error;
    } finally {
      editor.isSaving = false;
      syncRenderedListEditor(editorId);
    }
  }

  return false;
}

function cancelListEditorChanges(editorId) {
  const editor = state.listEditors[editorId];
  if (!editor || editor.readOnly || editor.isSaving) {
    return false;
  }
  editor.draftText = editor.persistedText;
  editor.activeMatchIndex = -1;
  editor.saveError = "";
  syncRenderedListEditor(editorId);
  return true;
}

function renderListEditor({
  editorId,
  items,
  copy,
  editable = false,
  placeholder = "",
  emptyText = "",
}) {
  const editor = getListEditorState(editorId, items, {
    readOnly: !editable,
    defaultScale: 100,
  });
  const computed = getListEditorComputed(editor);
  const disabledActions = computed.dirty && !editor.isSaving ? "" : "disabled";
  return `
    <div class="list-editor ${editable ? "is-editable" : "is-readonly"} ${editor.isSaving ? "is-saving" : ""}" data-list-editor="${escapeHtml(editorId)}" style="--list-editor-scale:${editor.scale / 100};">
      <div class="list-editor-toolbar">
        <label class="field field-wide list-editor-search-field">
          <span>${copy.listEditor.search}</span>
          <input class="input" data-focus-key="list-editor-search:${escapeHtml(editorId)}" data-list-editor-search value="${escapeHtml(editor.search)}" placeholder="${escapeHtml(copy.listEditor.searchPlaceholder)}" spellcheck="false" />
        </label>
        <div class="list-editor-nav" aria-label="${escapeHtml(copy.listEditor.search)}">
          <button class="secondary-button" type="button" data-list-editor-nav="prev" ${computed.matches.length ? "" : "disabled"}>${copy.listEditor.previous}</button>
          <button class="secondary-button" type="button" data-list-editor-nav="next" ${computed.matches.length ? "" : "disabled"}>${copy.listEditor.next}</button>
          <span class="list-editor-match-status" data-list-editor-match-status>${escapeHtml(listEditorMatchStatus(copy, editor, computed))}</span>
        </div>
        <label class="field list-editor-scale-field">
          <span>${copy.listEditor.scale}</span>
          <div class="list-editor-scale-control">
            <input type="range" min="70" max="170" step="10" value="${editor.scale}" data-focus-key="list-editor-scale:${escapeHtml(editorId)}" data-list-editor-scale />
            <span class="list-editor-scale-badge" data-list-editor-scale-value>${formatScaleLabel(editor.scale)}</span>
          </div>
        </label>
      </div>
      <div class="list-editor-status" data-list-editor-status>${escapeHtml(listEditorStatusText(copy, editor, computed))}</div>
      <div class="list-editor-stage">
        <div class="list-editor-overlay" data-list-editor-overlay>
          <div class="list-editor-overlay-content" data-list-editor-overlay-content>${renderListEditorHighlights(editor.draftText, editor.search, computed.activeMatchIndex)}</div>
        </div>
        <textarea
          class="list-editor-textarea"
          data-focus-key="list-editor-text:${escapeHtml(editorId)}"
          data-list-editor-text
          placeholder="${escapeHtml(placeholder || emptyText)}"
          spellcheck="false"
          autocapitalize="off"
          autocomplete="off"
          ${editable ? "" : "readonly"}
        >${escapeHtml(editor.draftText)}</textarea>
      </div>
      ${
        editable
          ? `
            <div class="list-editor-actions">
              <button class="primary-button primary-button-success" type="button" data-list-editor-apply ${disabledActions}>${copy.listEditor.apply}</button>
              <button class="primary-button primary-button-danger" type="button" data-list-editor-cancel ${disabledActions}>${copy.listEditor.cancel}</button>
            </div>
          `
          : ""
      }
    </div>
  `;
}

function formatDateTime(value, language) {
  const copy = getCopy(language);
  return new Intl.DateTimeFormat(copy.locale, {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatRelative(value, language) {
  const copy = getCopy(language);
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) {
    return copy.misc.noData;
  }
  const diff = Math.max(0, Date.now() - timestamp);
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) {
    return copy.misc.justNow;
  }
  if (minutes < 60) {
    return copy.misc.minAgo(minutes);
  }
  return copy.misc.hourAgo(Math.round(minutes / 60));
}

function countryName(code, language) {
  try {
    return (
      new Intl.DisplayNames([getCopy(language).locale], {
        type: "region",
      }).of(code) || code
    );
  } catch {
    return code;
  }
}

function joinHumanList(items, language) {
  const values = items.filter(Boolean);
  if (!values.length) {
    return getCopy(language).misc.noData;
  }
  return new Intl.ListFormat(getCopy(language).locale, {
    style: "long",
    type: "conjunction",
  }).format(values);
}

function lookupSubscriptionSummary(snapshot, subscriptionId) {
  return snapshot.derived.subscriptionSummaries.find((subscription) => subscription.id === subscriptionId) || null;
}

function formatLocalizedNumber(value, language, minimumFractionDigits = 0, maximumFractionDigits = 1) {
  return new Intl.NumberFormat(getCopy(language).locale, {
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(value);
}

function formatScaledUnits(value, language, units, base) {
  if (!Number.isFinite(value)) {
    return getCopy(language).misc.noData;
  }
  let current = Math.max(0, value);
  let unitIndex = 0;
  while (current >= base && unitIndex < units.length - 1) {
    current /= base;
    unitIndex += 1;
  }
  const abs = Math.abs(current);
  const digits = abs >= 100 || unitIndex === 0 ? 0 : abs >= 10 ? 1 : 2;
  return `${formatLocalizedNumber(current, language, digits, digits)} ${units[unitIndex]}`;
}

function formatBytes(value, language, settings = state.snapshot?.settings) {
  if (!Number.isFinite(value)) {
    return getCopy(language).misc.noData;
  }
  const binary = settings?.storageUnitSystem !== "decimal";
  return formatScaledUnits(
    value,
    language,
    binary ? ["B", "KiB", "MiB", "GiB", "TiB"] : ["B", "kB", "MB", "GB", "TB"],
    binary ? 1024 : 1000,
  );
}

function formatRate(value, language, settings = state.snapshot?.settings) {
  if (!Number.isFinite(value)) {
    return getCopy(language).misc.noData;
  }
  if (settings?.speedUnitMode === "bytes") {
    return formatScaledUnits(value, language, ["B/s", "kB/s", "MB/s", "GB/s", "TB/s"], 1000);
  }
  return formatScaledUnits(value * 8, language, ["b/s", "kb/s", "Mb/s", "Gb/s", "Tb/s"], 1000);
}

function formatThroughput(valueMbps, language, settings = state.snapshot?.settings) {
  if (!Number.isFinite(valueMbps)) {
    return getCopy(language).misc.noData;
  }
  return formatRate((valueMbps * 1000 * 1000) / 8, language, settings);
}

function formatMemory(valueMiB, language, settings = state.snapshot?.settings) {
  if (!Number.isFinite(valueMiB)) {
    return getCopy(language).misc.noData;
  }
  return formatBytes(valueMiB * 1024 * 1024, language, settings);
}

function formatMemoryBudget(valueMiB, copy, language, settings = state.snapshot?.settings) {
  if (!Number.isFinite(valueMiB)) {
    return copy.misc.notReported;
  }
  if (valueMiB <= 0) {
    return copy.settings.memoryLimitDisabled;
  }
  return formatMemory(valueMiB, language, settings);
}

function formatMemoryLimitLabel(valueMiB, copy, language, settings = state.snapshot?.settings) {
  const value = Math.round(Number(valueMiB) || 0);
  if (value <= 0) {
    return copy.settings.memoryLimitDisabled;
  }
  return formatMemory(value, language, settings);
}

function isDirectConnection(connection) {
  const chains = Array.isArray(connection?.chains)
    ? connection.chains.map((item) => String(item || "").trim().toUpperCase()).filter(Boolean)
    : [];
  if (!chains.length) {
    return false;
  }
  return chains.every((chain) => chain === "DIRECT" || chain === "COMPATIBLE");
}

function topConnectionsFootline(snapshot, copy) {
  const activeConnections = Array.isArray(snapshot.connections?.items)
    ? snapshot.connections.items.filter((connection) => connection.state !== "closed")
    : [];
  if (!activeConnections.length) {
    return copy.misc.noData;
  }
  const counts = activeConnections.reduce(
    (summary, connection) => {
      if (isDirectConnection(connection)) {
        summary.direct += 1;
      } else {
        summary.proxy += 1;
      }
      return summary;
    },
    { proxy: 0, direct: 0 },
  );
  return copy.misc.connectionCountLine(counts.proxy, counts.direct);
}

function formatMinutesLabel(value, language) {
  const rounded = Math.round(Number(value) || 0);
  if (language === "ru") {
    return rounded === 1 ? "1 минута" : `${rounded} мин`;
  }
  return rounded === 1 ? "1 minute" : `${rounded} min`;
}

function formatHoursLabel(value, language) {
  const rounded = Math.round(Number(value) || 0);
  if (rounded === 0) {
    return language === "ru" ? "вручную" : "manual";
  }
  if (language === "ru") {
    return rounded === 1 ? "1 час" : `${rounded} ч`;
  }
  return rounded === 1 ? "1 hour" : `${rounded} h`;
}

function formatAutomationMinutesLabel(value, language) {
  const rounded = Math.max(0, Math.round(Number(value) || 0));
  if (rounded === 0) {
    return language === "ru" ? "вручную" : "manual";
  }
  if (rounded >= 60 && rounded % 60 === 0) {
    return formatHoursLabel(rounded / 60, language);
  }
  return formatMinutesLabel(rounded, language);
}

function formatPollingIntervalLabel(value, language) {
  const rounded = Math.max(1000, Math.round(Number(value) || 0));
  if (rounded % 1000 === 0) {
    const seconds = rounded / 1000;
    return language === "ru" ? `${seconds} с` : `${seconds} s`;
  }
  const seconds = rounded / 1000;
  return language === "ru" ? `${seconds.toFixed(1)} с` : `${seconds.toFixed(1)} s`;
}

function formatToleranceLabel(value, language) {
  const rounded = Math.round(Number(value) || 0);
  return language === "ru" ? `${rounded} мс` : `${rounded} ms`;
}

function formatScaleLabel(value) {
  return `${Math.round(Number(value) || 0)}%`;
}

function formatLineWidthLabel(value, language) {
  const rounded = Math.round(Number(value) || 0);
  return language === "ru" ? `${rounded} px` : `${rounded} px`;
}

function isRangeInput(element) {
  return element instanceof HTMLInputElement && element.type === "range";
}

function clampRangeValue(value, min, max) {
  return Math.max(min, Math.min(max, Number(value) || min));
}

function activeRangeLabel(target, snapshot = state.snapshot) {
  const language = snapshot?.settings?.language || "ru";
  if (target.dataset.pollIntervalRange !== undefined) {
    return formatPollingIntervalLabel(clampRangeValue(target.value, 1000, 60000), language);
  }
  if (target.dataset.uiScale !== undefined) {
    return formatScaleLabel(clampRangeValue(target.value, 80, 130));
  }
  if (target.dataset.graphRange !== undefined) {
    return formatMinutesLabel(clampRangeValue(target.value, 1, 60), language);
  }
  if (target.dataset.chartLineWidth !== undefined) {
    return formatLineWidthLabel(clampRangeValue(target.value, 1, 8), language);
  }
  if (target.dataset.mihomoMemoryLimitRange !== undefined) {
    const copy = getCopy(language);
    const maxMemoryLimit = Math.max(128, Number(target.dataset.memoryLimitMax) || snapshot?.settings?.mihomoMemoryLimitMaxMiB || 512);
    return formatMemoryLimitLabel(clampRangeValue(target.value, 0, maxMemoryLimit), copy, language, snapshot?.settings);
  }
  if (target.dataset.autoIntervalRange !== undefined) {
    return formatMinutesLabel(clampRangeValue(target.value, 1, 60), language);
  }
  if (target.dataset.autoToleranceRange !== undefined) {
    return formatToleranceLabel(clampRangeValue(target.value, 20, 300), language);
  }
  if (target.dataset.automationSubscriptionRefreshRange !== undefined) {
    return formatAutomationMinutesLabel(clampRangeValue(target.value, 0, 1440), language);
  }
  if (target.dataset.automationLogCleanupRange !== undefined) {
    return formatAutomationMinutesLabel(clampRangeValue(target.value, 0, 1440), language);
  }
  if (target.dataset.releaseCheckRange !== undefined) {
    return formatAutomationMinutesLabel(clampRangeValue(target.value, 0, 1440), language);
  }
  if (target.dataset.baseIntervalRange !== undefined) {
    return formatHoursLabel(clampRangeValue(target.value, 0, 24), language);
  }
  if (target.dataset.autoMinScore !== undefined) {
    return String(clampRangeValue(target.value, 1, 99));
  }
  return target.value;
}

function syncActiveRangeUi(target, snapshot = state.snapshot) {
  if (!isRangeInput(target)) {
    return;
  }
  const shell = target.closest(".range-shell");
  const current = shell?.querySelector(".range-current");
  if (current) {
    current.textContent = activeRangeLabel(target, snapshot);
  }

  if (target.dataset.uiScale !== undefined) {
    const scale = clampRangeValue(target.value, 80, 130);
    document.documentElement.style.setProperty("--ui-scale", String(scale / 100));
  }

  if (target.dataset.chartLineWidth !== undefined) {
    const width = clampRangeValue(target.value, 1, 8);
    document.documentElement.style.setProperty("--chart-line-width", String(width));
  }
}

function beginRangeInteraction(target) {
  if (!isRangeInput(target)) {
    return;
  }
  state.activeRangeKey = target.dataset.focusKey || "range";
  syncActiveRangeUi(target);
}

function endRangeInteraction() {
  if (!state.activeRangeKey) {
    return;
  }
  state.activeRangeKey = "";
  renderSnapshotUpdate();
}

function commitRangeInputValue(target) {
  if (!isRangeInput(target)) {
    return false;
  }
  if (target.dataset.pollIntervalRange !== undefined) {
    backend.updateControllerConfig({ pollIntervalMs: clampRangeValue(target.value, 1000, 60000) });
    return true;
  }
  if (target.dataset.uiScale !== undefined) {
    backend.setScale(clampRangeValue(target.value, 80, 130));
    return true;
  }
  if (target.dataset.graphRange !== undefined) {
    backend.setGraphRange(clampRangeValue(target.value, 1, 60));
    return true;
  }
  if (target.dataset.chartLineWidth !== undefined) {
    backend.setChartLineWidth(clampRangeValue(target.value, 1, 8));
    return true;
  }
  if (target.dataset.mihomoMemoryLimitRange !== undefined) {
    const copy = getCopy(state.snapshot?.settings?.language || "ru");
    const maxMemoryLimit = Math.max(128, Number(target.dataset.memoryLimitMax) || state.snapshot?.settings?.mihomoMemoryLimitMaxMiB || 512);
    backend
      .setMihomoMemoryLimit(clampRangeValue(target.value, 0, maxMemoryLimit))
      .then(() => flashToast(copy.misc.toastUpdated))
      .catch((error) => flashToast(formatActionError(copy.settings.mihomoMemoryLimit, error)));
    return true;
  }
  if (target.dataset.autoIntervalRange !== undefined) {
    backend.updateAutoSelection({ intervalMinutes: clampRangeValue(target.value, 1, 60) });
    return true;
  }
  if (target.dataset.autoToleranceRange !== undefined) {
    backend.updateAutoSelection({ switchTolerance: clampRangeValue(target.value, 20, 300) });
    return true;
  }
  if (target.dataset.automationSubscriptionRefreshRange !== undefined) {
    backend.updateAutomation({ subscriptionRefreshMinutes: clampRangeValue(target.value, 0, 1440) });
    return true;
  }
  if (target.dataset.automationLogCleanupRange !== undefined) {
    backend.updateAutomation({ logCleanupMinutes: clampRangeValue(target.value, 0, 1440) });
    return true;
  }
  if (target.dataset.releaseCheckRange !== undefined) {
    backend.updateAutomation({ releaseCheckMinutes: clampRangeValue(target.value, 0, 1440) });
    return true;
  }
  if (target.dataset.baseIntervalRange !== undefined) {
    backend.updateBase(target.dataset.baseId || state.selectedBaseId, { updateEveryHours: clampRangeValue(target.value, 0, 24) });
    return true;
  }
  if (target.dataset.autoMinScore !== undefined) {
    backend.updateAutoSelection({ minScore: clampRangeValue(target.value, 1, 99) });
    return true;
  }
  return false;
}

function commitEditableInputValue(target) {
  if (!(target instanceof HTMLInputElement) && !(target instanceof HTMLTextAreaElement)) {
    return false;
  }
  if (target.dataset.baseInput) {
    const patch = {};
    patch[target.dataset.baseInput] = target.dataset.baseInput === "name" ? target.value : target.value.trim();
    backend.updateBase(state.selectedBaseId, patch);
    return true;
  }
  if (target.dataset.ruleInput) {
    const patch = {};
    patch[target.dataset.ruleInput] = target.dataset.ruleInput === "priority" ? Number(target.value) || 1 : target.value;
    backend.updateRule(state.selectedRuleId, patch);
    return true;
  }
  if (target.dataset.controllerInput) {
    const key = target.dataset.controllerInput;
    let value = target.value;
    if (key === "secret") {
      state.controllerSecretDraft = value;
    }
    if (key === "delayTimeout" || key === "pollIntervalMs") {
      value = Number(value) || 0;
    }
    backend.updateControllerConfig({ [key]: value });
    return true;
  }
  if (target.dataset.automationInput) {
    const key = target.dataset.automationInput;
    const limits = {
      subscriptionRefreshMinutes: { min: 0, max: 1440 },
      logCleanupMinutes: { min: 0, max: 1440 },
    };
    const range = limits[key];
    if (!range) {
      return false;
    }
    const value = Math.max(range.min, Math.min(range.max, Math.round(Number(target.value) || 0)));
    if (String(value) !== target.value) {
      target.value = String(value);
    }
    backend.updateAutomation({ [key]: value });
    return true;
  }
  return false;
}

function graphWindowTitle(value, language) {
  const label = formatMinutesLabel(value, language);
  return language === "ru" ? `Скорость за последние ${label}` : `Speed over the last ${label}`;
}

function formatLatencyMetric(value, copy) {
  if (!Number.isFinite(value)) {
    return copy.toolsView.latencyNoReply;
  }
  return `${value} ms`;
}

function formatPacketLoss(value, copy) {
  if (!Number.isFinite(value)) {
    return copy.misc.noData;
  }
  return `${value}%`;
}

function findBase(snapshot, baseId) {
  return snapshot.ruleEngine.bases.find((base) => base.id === baseId) || null;
}

function findRule(snapshot, ruleId) {
  return snapshot.ruleEngine.rules.find((rule) => rule.id === ruleId) || null;
}

function selectedBase(snapshot) {
  return findBase(snapshot, state.selectedBaseId) || snapshot.ruleEngine.bases[0] || null;
}

function selectedRule(snapshot) {
  return findRule(snapshot, state.selectedRuleId) || snapshot.ruleEngine.rules[0] || null;
}

function matchesConnectionSearch(connection, search) {
  const query = search.trim().toLocaleLowerCase();
  if (!query) {
    return true;
  }
  const haystack = [
    connection.host,
    `${connection.inbound} | ${connection.network}`,
    connection.rule,
    connection.chainLabel,
    connection.sourceLabel,
  ]
    .join(" ")
    .toLocaleLowerCase();
  return haystack.includes(query);
}

function niceAxisStep(rawStep) {
  if (!Number.isFinite(rawStep) || rawStep <= 0) {
    return 1;
  }
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const normalized = rawStep / magnitude;
  if (normalized <= 1) {
    return magnitude;
  }
  if (normalized <= 2) {
    return 2 * magnitude;
  }
  if (normalized <= 2.5) {
    return 2.5 * magnitude;
  }
  if (normalized <= 5) {
    return 5 * magnitude;
  }
  return 10 * magnitude;
}

function recentScaleReferencePoints(points, tickCount = 4) {
  return points;
}

function chartPointValue(point) {
  const candidate =
    point && typeof point === "object"
      ? point.value ?? point.delay ?? point.Delay ?? point.latency ?? point.y
      : point;
  const value = Number(candidate);
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function chartPointTimestamp(point) {
  if (!point || typeof point !== "object") {
    return 0;
  }
  const rawAt = point.at ?? point.time ?? point.Time ?? point.timestamp ?? point.ts;
  if (typeof rawAt === "number" && Number.isFinite(rawAt) && rawAt > 0) {
    return rawAt;
  }
  if (typeof rawAt === "string" && rawAt.trim()) {
    const parsed = Date.parse(rawAt);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  }
  return 0;
}

function normalizeChartPoints(points) {
  return (Array.isArray(points) ? points : [])
    .map((point) => {
      const value = chartPointValue(point);
      if (!Number.isFinite(value) || value < 0) {
        return null;
      }
      return {
        value,
        at: chartPointTimestamp(point),
      };
    })
    .filter(Boolean);
}

function buildChartScale(points, tickCount = 4) {
  if (!points.length) {
    return { min: 0, max: 1, ticks: [0, 0.5, 1] };
  }
  const scalePoints = recentScaleReferencePoints(points.map((point) => point.value), tickCount);
  const minPoint = Math.min(...scalePoints);
  const maxPoint = Math.max(...scalePoints);
  const naturalSpan = maxPoint - minPoint;
  const paddingSpan = naturalSpan > 0 ? naturalSpan * 0.14 : Math.max(1, Math.abs(maxPoint) * 0.22);
  let rawMin = minPoint - paddingSpan;
  let rawMax = maxPoint + paddingSpan;
  if (minPoint >= 0) {
    rawMin = Math.max(0, rawMin);
  }
  if (rawMax <= rawMin) {
    rawMax = rawMin + 1;
  }
  const step = niceAxisStep((rawMax - rawMin) / Math.max(2, tickCount - 1));
  const min = Math.floor(rawMin / step) * step;
  const max = Math.ceil(rawMax / step) * step;
  const ticks = [];
  for (let value = min; value <= max + step * 0.5; value += step) {
    ticks.push(Number(value.toFixed(4)));
  }
  return { min, max, ticks };
}

function normalizePadding(padding) {
  if (typeof padding === "number") {
    return { top: padding, right: padding, bottom: padding, left: padding };
  }
  return {
    top: padding.top ?? 10,
    right: padding.right ?? 10,
    bottom: padding.bottom ?? 10,
    left: padding.left ?? 10,
  };
}

function createChartGeometry(points, width, height, padding, tickCount = 4, xDomain = null) {
  const hasTimedPoints = points.some((point) => point.at > 0);
  const validDomain =
    hasTimedPoints &&
    xDomain &&
    Number.isFinite(xDomain.startAt) &&
    Number.isFinite(xDomain.endAt) &&
    xDomain.endAt > xDomain.startAt
      ? {
          startAt: Number(xDomain.startAt),
          endAt: Number(xDomain.endAt),
        }
      : null;
  const box = normalizePadding(padding);
  return {
    width,
    height,
    padding: box,
    plotWidth: Math.max(1, width - box.left - box.right),
    plotHeight: Math.max(1, height - box.top - box.bottom),
    scale: buildChartScale(points, tickCount),
    xDomain: validDomain,
  };
}

function chartX(geometry, point, index, pointCount) {
  if (geometry.xDomain && point?.at > 0) {
    const span = Math.max(1, geometry.xDomain.endAt - geometry.xDomain.startAt);
    const clamped = Math.min(Math.max(point.at, geometry.xDomain.startAt), geometry.xDomain.endAt);
    return geometry.padding.left + ((clamped - geometry.xDomain.startAt) * geometry.plotWidth) / span;
  }
  return geometry.padding.left + (index * geometry.plotWidth) / Math.max(1, pointCount - 1);
}

function chartY(geometry, value) {
  const span = Math.max(1, geometry.scale.max - geometry.scale.min);
  return geometry.height - geometry.padding.bottom - ((value - geometry.scale.min) * geometry.plotHeight) / span;
}

function sparklinePath(points, geometry) {
  if (!points.length) {
    return "";
  }
  return points
    .map((point, index) => {
      const x = chartX(geometry, point, index, points.length);
      const y = chartY(geometry, point.value);
      return `${index === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

function areaPath(points, geometry) {
  if (!points.length) {
    return "";
  }
  const line = sparklinePath(points, geometry);
  const firstX = chartX(geometry, points[0], 0, points.length);
  const lastX = chartX(geometry, points[points.length - 1], points.length - 1, points.length);
  const baseline = geometry.height - geometry.padding.bottom;
  return `${line} L${lastX} ${baseline} L${firstX} ${baseline} Z`;
}

function chartTimeLabels(rangeMinutes, language) {
  const rounded = Math.max(1, Math.round(Number(rangeMinutes) || 1));
  const middle = Math.max(1, Math.round(rounded / 2));
  if (language === "ru") {
    return [
      { value: 0, label: `-${rounded} мин`, anchor: "start" },
      { value: 0.5, label: `-${middle} мин`, anchor: "middle" },
      { value: 1, label: "сейчас", anchor: "end" },
    ];
  }
  return [
    { value: 0, label: `-${rounded} min`, anchor: "start" },
    { value: 0.5, label: `-${middle} min`, anchor: "middle" },
    { value: 1, label: "now", anchor: "end" },
  ];
}

function chartHistoryLabels(language) {
  return language === "ru"
    ? [
        { value: 0, label: "раньше", anchor: "start" },
        { value: 1, label: "сейчас", anchor: "end" },
      ]
    : [
        { value: 0, label: "earlier", anchor: "start" },
        { value: 1, label: "now", anchor: "end" },
      ];
}

function hashString(value) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash.toString(36);
}

function renderChartSvg({
  points,
  width,
  height,
  padding,
  tickCount,
  areaClass,
  lineClass,
  yFormatter,
  xLabels,
  xDomain = null,
  compact = false,
}) {
  const normalizedPoints = normalizeChartPoints(points);
  const geometry = createChartGeometry(normalizedPoints, width, height, padding, tickCount, xDomain);
  const axisBottom = geometry.height - geometry.padding.bottom;
  const axisRight = geometry.width - geometry.padding.right;
  const axisLeft = geometry.padding.left;
  const labels = xLabels || [];
  const clipId = `chart-clip-${hashString(
    JSON.stringify({
      width,
      height,
      padding: geometry.padding,
      compact,
      areaClass,
      lineClass,
      points: normalizedPoints,
      xDomain: geometry.xDomain,
    }),
  )}`;

  return `
    <svg viewBox="0 0 ${width} ${height}" class="chart-svg ${compact ? "chart-svg-compact" : "chart-svg-full"}" aria-hidden="true">
      <defs>
        <clipPath id="${clipId}">
          <rect x="${axisLeft}" y="${geometry.padding.top}" width="${geometry.plotWidth}" height="${geometry.plotHeight}"></rect>
        </clipPath>
      </defs>
      <g class="chart-grid">
        ${geometry.scale.ticks
          .map((tick) => {
            const y = chartY(geometry, tick);
            return `<line class="chart-grid-line" x1="${axisLeft}" y1="${y.toFixed(2)}" x2="${axisRight}" y2="${y.toFixed(2)}"></line>`;
          })
          .join("")}
        ${labels
          .map((label) => {
            const x = axisLeft + label.value * geometry.plotWidth;
            return `<line class="chart-grid-line chart-grid-line-vertical" x1="${x.toFixed(2)}" y1="${geometry.padding.top}" x2="${x.toFixed(2)}" y2="${axisBottom}"></line>`;
          })
          .join("")}
      </g>
      <g class="chart-axis">
        <line class="chart-axis-domain" x1="${axisLeft}" y1="${geometry.padding.top}" x2="${axisLeft}" y2="${axisBottom}"></line>
        <line class="chart-axis-domain" x1="${axisLeft}" y1="${axisBottom}" x2="${axisRight}" y2="${axisBottom}"></line>
        ${geometry.scale.ticks
          .map((tick) => {
            const y = chartY(geometry, tick);
            return `<text class="chart-axis-label chart-axis-label-y" x="${axisLeft - 6}" y="${(y + 4).toFixed(2)}" text-anchor="end">${escapeHtml(yFormatter(tick))}</text>`;
          })
          .join("")}
        ${labels
          .map((label) => {
            const x = axisLeft + label.value * geometry.plotWidth;
            return `<text class="chart-axis-label chart-axis-label-x" x="${x.toFixed(2)}" y="${height - 4}" text-anchor="${label.anchor}">${escapeHtml(label.label)}</text>`;
          })
          .join("")}
      </g>
      <g clip-path="url(#${clipId})">
        <path class="chart-area ${areaClass}" d="${areaPath(normalizedPoints, geometry)}"></path>
        <path class="chart-line ${lineClass}" d="${sparklinePath(normalizedPoints, geometry)}"></path>
      </g>
    </svg>
  `;
}

function latencyTone(value) {
  if (!value) {
    return "is-bad";
  }
  if (value <= 600) {
    return "is-good";
  }
  if (value <= 1000) {
    return "is-warn";
  }
  return "is-bad";
}

function badgeClass(node) {
  if (node.availability === "best") {
    return "badge badge-good";
  }
  if (node.availability === "blocked" || node.availability === "unstable") {
    return "badge badge-bad";
  }
  return "badge badge-muted";
}

function nodeStatusLabel(node, copy) {
  return copy.nodeStatus[node.availability] || copy.nodeStatus.alive;
}

function policyReasonLabel(reason, copy) {
  if (reason === "unknown-egress") {
    return copy.egressPolicy.reasonUnknown;
  }
  return copy.egressPolicy.reasonCountry;
}

function renderRejectedSubscriptionNodeChip(node, copy) {
  const parts = [escapeHtml(node.label), escapeHtml(node.egressCountry)];
  if (node.reason === "unknown-egress") {
    parts.push(escapeHtml(policyReasonLabel(node.reason, copy)));
  }
  return `<span class="tag tag-danger">${parts.join(" / ")}</span>`;
}

function routedTrafficScope(snapshot) {
  if (snapshot.routing.mode === "direct") {
    return { kind: "direct" };
  }
  if (snapshot.routing.mode === "global") {
    return { kind: "global" };
  }
  if (snapshot.routing.blockedTrafficTarget === "direct") {
    return { kind: "blocked-direct" };
  }
  if (!snapshot.routing.proxyLists.length) {
    return { kind: "empty-lists" };
  }
  return {
    kind: "lists",
    lists: snapshot.routing.proxyLists,
  };
}

function currentSummary(snapshot, copy) {
  const active = snapshot.derived.activeProxy;
  const scope = routedTrafficScope(snapshot);

  if (scope.kind === "direct") {
    return copy.routeSummary.direct;
  }
  if (scope.kind === "blocked-direct") {
    return copy.routeSummary.blockedDirect;
  }
  if (scope.kind === "empty-lists") {
    return copy.routeSummary.emptyLists;
  }
  if (!active) {
    return copy.routeSummary.waiting;
  }
  if (scope.kind === "global") {
    return copy.routeSummary.global;
  }
  return copy.routeSummary.blockedVia(joinHumanList(scope.lists, snapshot.settings.language));
}

function toolBasisLabel(result, copy) {
  if (!result) {
    return copy.misc.noData;
  }
  return copy.toolsView.basisLabels[result.basis] || copy.misc.noData;
}

function toolRuleBasisLabel(result, copy) {
  if (!result) {
    return copy.misc.noData;
  }
  return copy.toolsView.ruleBasisLabels[result.basis] || copy.misc.noData;
}

function toolWarningLabel(result, copy) {
  if (!result?.warning) {
    return "";
  }
  return copy.toolsView.warnings[result.warning] || "";
}

function toolClassificationLabel(classification, copy) {
  return copy.toolsView.classificationLabels[classification] || copy.misc.noData;
}

function currentToolStatus(tool) {
  const status = typeof tool?.status === "string" ? tool.status : "";
  if (status === "running" || status === "success" || status === "error" || status === "idle") {
    return status;
  }
  return tool?.lastCheckedAt ? "success" : "idle";
}

function renderToolStatus(tool, copy, language) {
  const viewCopy = copy.toolsView;
  const status = currentToolStatus(tool);
  const label =
    status === "running"
      ? viewCopy.statusRunning
      : status === "success"
        ? viewCopy.statusSuccess
        : status === "error"
          ? viewCopy.statusError
          : viewCopy.statusIdle;
  const badgeClass = status === "success" ? "badge-good" : status === "error" ? "badge-bad" : "badge-muted";
  const detail =
    status === "running"
      ? viewCopy.statusRunningHint
      : status === "error"
        ? tool?.error || copy.misc.noData
        : status === "success" && tool?.lastCheckedAt
          ? `${viewCopy.lastCheck}: ${formatRelative(tool.lastCheckedAt, language)}`
          : viewCopy.statusIdleHint;
  const spinner = status === "running" ? '<span class="button-spinner" aria-hidden="true"></span>' : "";

  return `
    <div class="tool-status-row">
      <span class="badge ${badgeClass}">${spinner}${escapeHtml(label)}</span>
      <span class="tool-status-detail">${escapeHtml(detail)}</span>
    </div>
  `;
}

function pointsForGraphRange(points, graphRangeMinutes) {
  const items = Array.isArray(points) ? points : [];
  if (!items.length) {
    return [];
  }
  const timedPoints = items.filter((point) => chartPointTimestamp(point) > 0);
  if (!timedPoints.length) {
    const visiblePoints = Math.max(2, Math.round((Math.max(1, Number(graphRangeMinutes) || 1) / 60) * items.length));
    return items.slice(-visiblePoints);
  }
  const latestAt = timedPoints.reduce((max, point) => Math.max(max, chartPointTimestamp(point)), 0);
  const cutoff = latestAt - Math.max(1, Number(graphRangeMinutes) || 1) * 60 * 1000;
  const beforeCutoff = timedPoints.filter((point) => chartPointTimestamp(point) < cutoff);
  const visible = timedPoints.filter((point) => chartPointTimestamp(point) >= cutoff);
  if (!visible.length) {
    return timedPoints.slice(-2);
  }
  if (beforeCutoff.length) {
    return [beforeCutoff[beforeCutoff.length - 1], ...visible];
  }
  return visible;
}

function chartTimeDomain(points, graphRangeMinutes) {
  const latestAt = normalizeChartPoints(points).reduce((max, point) => (point.at > max ? point.at : max), 0);
  if (!latestAt) {
    return null;
  }
  return {
    startAt: latestAt - Math.max(1, Number(graphRangeMinutes) || 1) * 60 * 1000,
    endAt: latestAt,
  };
}

function activeServerLabel(snapshot, copy) {
  if (snapshot.routing.mode === "direct") {
    return copy.misc.direct;
  }
  return snapshot.derived.activeProxy?.label || copy.misc.noTunnel;
}

function activeServerDetails(snapshot, copy) {
  const active = snapshot.derived.activeProxy;
  if (!active) {
    return "";
  }
  const subscriptionName = lookupSubscriptionSummary(snapshot, active.subscriptionId)?.name;
  const latencyLabel = active.latency ? `${active.latency} ms` : copy.misc.noData;
  return [subscriptionName, latencyLabel].filter(Boolean).join(" • ");
}

function routeModeTitle(snapshot, copy) {
  if (snapshot.routing.mode === "smart") {
    return copy.modes.smart;
  }
  if (snapshot.routing.mode === "direct") {
    return copy.modes.direct;
  }
  return copy.modes.global;
}

function selectedLabelFromMap(map, value) {
  return map[String(value)] || map[value] || String(value);
}

function isRealController(snapshot) {
  return snapshot.controller?.mode === "real" && snapshot.controller?.bridgeManaged !== true;
}

function disabledAttribute(disabled) {
  return disabled ? 'disabled aria-disabled="true"' : "";
}

function icon(name) {
  const icons = {
    overview: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h7v6H4zM13 5h7v10h-7zM4 13h7v6H4zM13 17h7v2h-7z"/></svg>`,
    routing: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h7l2 3h7M20 9l-2-2m2 2-2 2M20 15h-7l-2 3H4m0 0 2-2m-2 2 2 2"/></svg>`,
    subscriptions: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4h12a2 2 0 0 1 2 2v12H8a2 2 0 0 0-2 2V4zm0 0a2 2 0 0 0-2 2v14h16M9 8h7M9 12h7M9 16h4"/></svg>`,
    nodes: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v6m0 6v6M5 9h14M5 15h14M7 6h.01M17 6h.01M7 18h.01M17 18h.01"/></svg>`,
    rules: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M5 12h10M5 17h14M18 9l2 3-2 3M15 9l-2 3 2 3"/></svg>`,
    connections: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 7h8M8 12h8M8 17h8M5 7h.01M5 12h.01M5 17h.01M19 7h.01M19 12h.01M19 17h.01"/></svg>`,
    tools: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.7 6.3a4.4 4.4 0 0 0-5.4 5.4l-5.2 5.2a1.5 1.5 0 0 0 2.1 2.1l5.2-5.2a4.4 4.4 0 0 0 5.4-5.4l-2.3 2.3-2.1-.2-.2-2.1z"/></svg>`,
    settings: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 8.5A3.5 3.5 0 1 1 8.5 12 3.5 3.5 0 0 1 12 8.5zm8 3.5-2 .6a6.9 6.9 0 0 1-.5 1.3l1.1 1.8-1.8 1.8-1.8-1.1a6.9 6.9 0 0 1-1.3.5L12 20l-1.7-2.1a6.9 6.9 0 0 1-1.3-.5l-1.8 1.1-1.8-1.8 1.1-1.8a6.9 6.9 0 0 1-.5-1.3L4 12l2.1-1.7a6.9 6.9 0 0 1 .5-1.3L5.5 7.2l1.8-1.8 1.8 1.1a6.9 6.9 0 0 1 1.3-.5L12 4l1.7 2.1a6.9 6.9 0 0 1 1.3.5l1.8-1.1 1.8 1.8-1.1 1.8a6.9 6.9 0 0 1 .5 1.3z"/></svg>`,
    chevron: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>`,
    plus: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>`,
    trash: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12h10l1-12M9 7V4h6v3"/></svg>`,
  };

  return icons[name] || icons.overview;
}

function renderMenuSelect({ id, label, selectedLabel, options, selectedValue, copy, fullWidth = true, disabled = false }) {
  const open = !disabled && state.openMenu === id;
  return `
    <div class="menu-field ${fullWidth ? "is-full" : ""} ${open ? "is-open" : ""} ${disabled ? "is-disabled" : ""}" data-dropdown-root="${id}">
      ${label ? `<span class="menu-label">${escapeHtml(label)}</span>` : ""}
      <button class="menu-trigger ${open ? "is-open" : ""}" data-menu-trigger="${id}" ${disabledAttribute(disabled)}>
        <span class="menu-trigger-text">${escapeHtml(selectedLabel)}</span>
        <span class="menu-trigger-icon">${icon("chevron")}</span>
      </button>
      ${
        open
          ? `
            <div class="menu-panel">
              ${options
                .map(
                  (option) => `
                    <button class="menu-option ${String(option.value) === String(selectedValue) ? "is-active" : ""}" data-menu-option="${id}" data-value="${escapeHtml(option.value)}">
                      <span class="menu-option-label">${escapeHtml(option.label)}</span>
                      ${option.hint ? `<span class="menu-option-hint">${escapeHtml(option.hint)}</span>` : ""}
                    </button>
                  `,
                )
                .join("")}
            </div>
          `
          : ""
      }
    </div>
  `;
}

function renderRangeSlider({
  label,
  value,
  min,
  max,
  step = 1,
  currentLabel,
  minLabel,
  maxLabel,
  dataAttr,
  focusKey,
  disabled = false,
}) {
  return `
    <label class="range-field ${disabled ? "is-disabled" : ""}">
      <span>${escapeHtml(label)}</span>
      <div class="range-shell">
        <div class="range-minmax">
          <span>${escapeHtml(minLabel)}</span>
          <span>${escapeHtml(maxLabel)}</span>
        </div>
        <input
          class="range-input"
          type="range"
          min="${min}"
          max="${max}"
          step="${step}"
          value="${value}"
          ${focusKey ? `data-focus-key="${focusKey}"` : ""}
          ${dataAttr}
          ${disabled ? "disabled" : ""}
        />
        <div class="range-current">${escapeHtml(currentLabel)}</div>
      </div>
    </label>
  `;
}

function renderCountryPicker(snapshot, copy, disabled = false) {
  const selected = snapshot.subscriptions.egressPolicy.blockedCountries;
  const open = !disabled && state.openMenu === "blocked-countries";
  const label = selected.length ? selected.join(", ") : copy.misc.countryPickerEmpty;

  return `
    <div class="menu-field is-full ${open ? "is-open" : ""} ${disabled ? "is-disabled" : ""}" data-dropdown-root="blocked-countries">
      <span class="menu-label">${copy.egressPolicy.blockedCountries}</span>
      <button class="menu-trigger ${open ? "is-open" : ""}" data-menu-trigger="blocked-countries" ${disabledAttribute(disabled)}>
        <span class="menu-trigger-text">${escapeHtml(label)}</span>
        <span class="menu-trigger-icon">${icon("chevron")}</span>
      </button>
      ${
        open
          ? `
            <div class="menu-panel">
              <div class="country-grid">
                ${countryOptions
                  .map((code) => {
                    const active = selected.includes(code);
                    return `
                      <button class="country-option ${active ? "is-active" : ""}" data-country-toggle="${code}" ${disabledAttribute(disabled)}>
                        <span class="country-code">${code}</span>
                        <span class="country-name">${escapeHtml(countryName(code, snapshot.settings.language))}</span>
                      </button>
                    `;
                  })
                  .join("")}
              </div>
            </div>
          `
          : ""
      }
    </div>
  `;
}

function renderHeaderContent(snapshot, copy) {
  const tunnelConnected = snapshot.health.apiState === "connected";
  const tunnelHealthy = tunnelConnected && snapshot.health.tunnelState === "healthy";
  const tunnelPillClass = tunnelConnected ? (tunnelHealthy ? "pill-good" : "pill-bad") : "pill-muted";
  const tunnelPillLabel = tunnelConnected ? (tunnelHealthy ? copy.tunnelHealthy : copy.tunnelIssue) : copy.tunnelSync;
  const releaseVersion = snapshot.automation?.release?.currentUiVersion || MISSION_CONTROL_VERSION;
  return `
    <div class="brand-block">
      <div class="brand-kicker">
        <span>${copy.brandKicker}</span>
        <span class="brand-version">${escapeHtml(releaseVersion)}</span>
      </div>
      <div class="brand-line">
        <h1>${copy.title}</h1>
        <span class="pill ${tunnelPillClass}">
          ${tunnelPillLabel}
        </span>
        <span class="pill pill-muted">${snapshot.controller?.mode === "real" ? copy.realMode : copy.mockMode}</span>
      </div>
      <p class="brand-subtitle">${copy.headerSubtitle}</p>
    </div>
  `;
}

function renderHeader(snapshot, copy) {
  return `
    <header class="topbar" data-live-region="header">
      ${renderHeaderContent(snapshot, copy)}
    </header>
  `;
}

function renderSidebarProfileContent(snapshot, copy) {
  const profileDetails = activeServerDetails(snapshot, copy);
  return `
    <div class="sidebar-card-label">${copy.sections.currentProfile}</div>
    <div class="sidebar-card-title" data-current-profile-title>${escapeHtml(activeServerLabel(snapshot, copy))}</div>
    ${
      profileDetails
        ? `<div class="sidebar-card-submeta" data-current-profile-details>${escapeHtml(profileDetails)}</div>`
        : ""
    }
    <div class="sidebar-card-meta" data-current-profile-summary>${escapeHtml(currentSummary(snapshot, copy))}</div>
  `;
}

function renderSidebarMaintenanceContent(snapshot, copy) {
  return `
    <div class="sidebar-card-label">${copy.sections.lastMaintenance}</div>
    <ul class="mini-list">
      <li><span>${copy.sections.subscriptions}</span><strong>${formatRelative(snapshot.subscriptions.items[0]?.lastSyncAt || snapshot.meta.updatedAt, snapshot.settings.language)}</strong></li>
      <li><span>${copy.sections.nodeRetest}</span><strong>${formatRelative(snapshot.events.find((event) => event.kind === "auto-best-retested")?.at || snapshot.meta.bootAt, snapshot.settings.language)}</strong></li>
      <li><span>${copy.sections.listUpdate}</span><strong>${formatRelative(snapshot.events.find((event) => event.kind === "lists-ip-updated")?.at || snapshot.meta.bootAt, snapshot.settings.language)}</strong></li>
    </ul>
  `;
}

function renderSidebar(snapshot, copy) {
  return `
    <aside class="sidebar">
      <div class="sidebar-section">
        <div class="sidebar-label">${copy.sections.workspace}</div>
        <nav class="sidebar-nav">
          ${navItems
            .map(
              (item) => `
                <button class="sidebar-link ${state.view === item.id ? "is-active" : ""}" data-view="${item.id}">
                  <span class="sidebar-icon">${icon(item.icon)}</span>
                  <span>${copy.nav[item.id]}</span>
                </button>
              `,
            )
            .join("")}
        </nav>
      </div>

      <div class="sidebar-card" data-live-region="sidebar-profile">
        ${renderSidebarProfileContent(snapshot, copy)}
      </div>

      <div class="sidebar-card" data-live-region="sidebar-maintenance">
        ${renderSidebarMaintenanceContent(snapshot, copy)}
      </div>
    </aside>
  `;
}

function renderTopStatsContent(snapshot, copy) {
  const trafficFootLabel = snapshot.health.trafficScope === "total"
    ? copy.sections.totalTraffic
    : copy.sections.liveTraffic;
  return `
    <article class="stat-card">
      <div class="stat-label">${copy.sections.statsDownload}</div>
      <div class="stat-value">${formatThroughput(snapshot.health.downloadMbps, snapshot.settings.language, snapshot.settings)}</div>
      <div class="stat-foot">${trafficFootLabel}</div>
    </article>
    <article class="stat-card">
      <div class="stat-label">${copy.sections.statsUpload}</div>
      <div class="stat-value">${formatThroughput(snapshot.health.uploadMbps, snapshot.settings.language, snapshot.settings)}</div>
      <div class="stat-foot">${trafficFootLabel}</div>
    </article>
    <article class="stat-card">
      <div class="stat-label">${copy.sections.statsMemory}</div>
      <div class="stat-value">${formatMemory(snapshot.health.memoryMiB, snapshot.settings.language, snapshot.settings)}</div>
      <div class="stat-foot">${copy.sections.memoryBudget} ${formatMemoryBudget(snapshot.health.memoryBudgetMiB, copy, snapshot.settings.language, snapshot.settings)}</div>
    </article>
    <article class="stat-card">
      <div class="stat-label">${copy.sections.statsConnections}</div>
      <div class="stat-value">${snapshot.health.activeConnections}<span> ${copy.sections.activeConnections}</span></div>
      <div class="stat-foot">${topConnectionsFootline(snapshot, copy)}</div>
    </article>
  `;
}

function renderTopStats(snapshot, copy) {
  return `
    <section class="stats-grid" data-live-region="top-stats">
      ${renderTopStatsContent(snapshot, copy)}
    </section>
  `;
}

function renderMaintenanceButton(snapshot, copy, action, { className = "secondary-button" } = {}) {
  const busy = snapshot.actions[action];
  const descriptor = copy.maintenanceActions[action] || { title: action, subtitle: "" };
  return `
    <button class="${className}" data-action="${action}" ${busy ? 'disabled aria-busy="true"' : ""}>
      ${busy ? '<span class="button-spinner" aria-hidden="true"></span>' : ""}
      <span>${busy ? copy.maintenanceActions.busy : descriptor.title}</span>
    </button>
  `;
}

function renderMaintenanceActionBlock(snapshot, copy, action, options = {}) {
  const descriptor = copy.maintenanceActions[action] || { title: action, subtitle: "" };
  return `
    <div class="section-action-block">
      <div class="panel-actions">
        ${renderMaintenanceButton(snapshot, copy, action, options)}
      </div>
      ${descriptor.subtitle ? `<p class="muted-note section-action-note">${escapeHtml(descriptor.subtitle)}</p>` : ""}
    </div>
  `;
}

function eventText(event, snapshot, copy) {
  const lookupNode = (id) => snapshot.derived.eligibleNodes.find((node) => node.id === id) || snapshot.derived.rejectedNodes.find((node) => node.id === id);

  switch (event.kind) {
    case "pool-rebuilt":
      return snapshot.settings.language === "en"
        ? `Pool rebuilt from ${event.data.subscriptions} subscriptions. ${event.data.kept} eligible nodes kept.`
        : `Пул пересобран из ${event.data.subscriptions} подписок. Оставлено ${event.data.kept} подходящих узлов.`;
    case "lists-domains-updated":
      return snapshot.settings.language === "en"
        ? "RU-only domain list refreshed from runetfreedom."
        : "Список доменов RU-only обновлен из runetfreedom.";
    case "lists-ip-updated":
      return snapshot.settings.language === "en"
        ? "RU-only IP list refreshed from runetfreedom."
        : "Список IP RU-only обновлен из runetfreedom.";
    case "auto-best-selected": {
      const node = lookupNode(event.data.nodeId);
      return snapshot.settings.language === "en"
        ? `AUTO BEST selected ${node?.label || "a node"}.`
        : `AUTO BEST выбрал ${node?.label || "узел"}.`;
    }
    case "direct-overrides-applied":
      return snapshot.settings.language === "en"
        ? `${event.data.count} direct overrides were applied.`
        : `Применено ${event.data.count} direct-исключений.`;
    case "action-started":
      return snapshot.settings.language === "en"
        ? `Action started: ${event.data.action}.`
        : `Запущено действие: ${event.data.action}.`;
    case "routing-mode-changed":
      return snapshot.settings.language === "en"
        ? `Routing mode switched to ${event.data.mode}.`
        : `Режим маршрутизации переключен: ${event.data.mode}.`;
    case "blocked-target-changed":
      return snapshot.settings.language === "en"
        ? `Blocked traffic target changed to ${event.data.value}.`
        : `Цель для блокируемого трафика переключена: ${event.data.value}.`;
    case "manual-server-changed": {
      const node = lookupNode(event.data.id);
      return snapshot.settings.language === "en"
        ? `Manual server changed to ${node?.label || event.data.id}.`
        : `Ручной сервер переключен: ${node?.label || event.data.id}.`;
    }
    case "auto-selection-updated":
      return snapshot.settings.language === "en"
        ? "Auto-selection settings were updated."
        : "Настройки автовыбора обновлены.";
    case "egress-policy-updated":
      return snapshot.settings.language === "en"
        ? `Egress policy changed. Blocked countries: ${event.data.blockedCountries.join(", ") || "none"}.`
        : `Политика egress изменена. Заблокированные страны: ${event.data.blockedCountries.join(", ") || "нет"}.`;
    case "subscription-added":
      return snapshot.settings.language === "en"
        ? `Subscription added: ${event.data.name}.`
        : `Добавлена подписка: ${event.data.name}.`;
    case "subscription-removed":
      return snapshot.settings.language === "en"
        ? `Subscription removed: ${event.data.name}.`
        : `Удалена подписка: ${event.data.name}.`;
    case "auto-best-retested":
      return snapshot.settings.language === "en"
        ? `Server retest finished. Metric: ${event.data.metric}.`
        : `Ретест узлов завершен. Метрика: ${event.data.metric}.`;
    case "tunnel-restarted":
      return snapshot.settings.language === "en"
        ? "Tunnel restarted. Controller and local hooks recovered."
        : "Туннель перезапущен. Controller и локальные хуки восстановлены.";
    case "policy-reprocessed":
      return snapshot.settings.language === "en"
        ? `Subscriptions reprocessed with blocked egress: ${event.data.blockedCountries.join(", ") || "none"}.`
        : `Подписки переобработаны с блокировкой egress: ${event.data.blockedCountries.join(", ") || "нет"}.`;
    case "mihomo-log":
      return snapshot.settings.language === "en"
        ? `Mihomo ${event.data.level || "log"}: ${event.data.message || ""}`
        : `Mihomo ${event.data.level || "log"}: ${event.data.message || ""}`;
    default:
      return event.kind;
  }
}

function renderOverviewTrafficContent(snapshot, copy) {
  const throughputDownPoints = pointsForGraphRange(snapshot.graphs.throughputDown, snapshot.settings.graphRange);
  const throughputUpPoints = pointsForGraphRange(snapshot.graphs.throughputUp, snapshot.settings.graphRange);
  const throughputTimeDomain = chartTimeDomain(
    [
      ...(Array.isArray(snapshot.graphs.throughputDown) ? snapshot.graphs.throughputDown : []),
      ...(Array.isArray(snapshot.graphs.throughputUp) ? snapshot.graphs.throughputUp : []),
    ],
    snapshot.settings.graphRange,
  );
  const speedAxisLabel = (value) => formatThroughput(value, snapshot.settings.language, snapshot.settings);
  const timeLabels = chartTimeLabels(snapshot.settings.graphRange, snapshot.settings.language);

  return `
    <div class="panel-head">
      <div>
        <div class="eyebrow">${copy.sections.traffic}</div>
        <h2>${graphWindowTitle(snapshot.settings.graphRange, snapshot.settings.language)}</h2>
      </div>
    </div>
    <div class="chart-stack">
      <div class="chart-box">
        <div class="chart-box-heading chart-box-heading-download">${copy.sections.incoming}</div>
        ${renderChartSvg({
          points: throughputDownPoints,
          width: 320,
          height: 118,
          padding: { top: 10, right: 10, bottom: 24, left: 58 },
          tickCount: 4,
          areaClass: "chart-area-download",
          lineClass: "chart-line-download",
          yFormatter: speedAxisLabel,
          xLabels: timeLabels,
          xDomain: throughputTimeDomain,
        })}
      </div>
      <div class="chart-box chart-box-subtle">
        <div class="chart-box-heading chart-box-heading-upload">${copy.sections.outgoing}</div>
        ${renderChartSvg({
          points: throughputUpPoints,
          width: 320,
          height: 118,
          padding: { top: 10, right: 10, bottom: 24, left: 58 },
          tickCount: 4,
          areaClass: "chart-area-upload",
          lineClass: "chart-line-upload",
          yFormatter: speedAxisLabel,
          xLabels: timeLabels,
          xDomain: throughputTimeDomain,
        })}
      </div>
      <div class="chart-range-panel">
        ${renderRangeSlider({
          label: copy.settings.graphRange,
          value: snapshot.settings.graphRange,
          min: 1,
          max: 60,
          step: 1,
          currentLabel: formatMinutesLabel(snapshot.settings.graphRange, snapshot.settings.language),
          minLabel: formatMinutesLabel(1, snapshot.settings.language),
          maxLabel: formatMinutesLabel(60, snapshot.settings.language),
          dataAttr: 'data-graph-range',
          focusKey: "overview-graph-range",
        })}
      </div>
    </div>
  `;
}

function renderOverviewRouteContent(snapshot, copy) {
  const active = snapshot.derived.activeProxy;

  return `
    <div class="route-mode-card">
      <div class="route-mode-large">${routeModeTitle(snapshot, copy)}</div>
      <p>${escapeHtml(currentSummary(snapshot, copy))}</p>
      <div class="route-mode-tags">
        <span class="badge badge-muted">${snapshot.routing.listMode === "ru-only" ? copy.routeBadges.listModeRu : copy.routeBadges.listModeFull}</span>
        ${active ? `<span class="badge badge-muted">Egress ${escapeHtml(active.egressCountry)}</span>` : ""}
      </div>
    </div>
    <dl class="detail-grid">
      <div>
        <dt>${copy.routeDetails.activeNode}</dt>
        <dd>${active ? escapeHtml(active.label) : escapeHtml(copy.misc.direct)}</dd>
      </div>
      <div>
        <dt>${copy.routeDetails.bestNode}</dt>
        <dd>${escapeHtml(snapshot.derived.bestAutoNode?.label || copy.misc.noData)}</dd>
      </div>
      <div>
        <dt>${copy.routeDetails.rejected}</dt>
        <dd>${snapshot.derived.rejectedNodes.length}</dd>
      </div>
      <div>
        <dt>${copy.routeDetails.lastRetest}</dt>
        <dd>${formatRelative(snapshot.events.find((event) => event.kind === "auto-best-retested")?.at || snapshot.meta.bootAt, snapshot.settings.language)}</dd>
      </div>
    </dl>
  `;
}

function renderOverviewLatencyContent(snapshot, copy) {
  const activeNode = snapshot.derived.activeProxy || null;
  const latencyPoints = pointsForGraphRange(activeNode?.trend || [], snapshot.settings.graphRange);
  const latencyTimeDomain = chartTimeDomain(activeNode?.trend || [], snapshot.settings.graphRange);
  const latencyAxisLabel = (value) => `${formatLocalizedNumber(value, snapshot.settings.language, 0, 0)} ms`;
  const timeLabels = chartTimeLabels(snapshot.settings.graphRange, snapshot.settings.language);
  const currentLatency = Math.max(0, Number(activeNode?.latency) || 0);
  const latencyLabel = currentLatency > 0 ? `${currentLatency} ms` : copy.misc.noData;
  const nodeLabel = activeNode?.label || copy.misc.noTunnel;

  return `
    <div class="panel-head">
      <div>
        <div class="eyebrow">${copy.sections.latency}</div>
        <h2>${copy.sections.latencyTitle}</h2>
        <div class="panel-subtitle">${escapeHtml(nodeLabel)}</div>
      </div>
      <span class="latency-pill ${latencyTone(currentLatency)}">${latencyLabel}</span>
    </div>
    <div class="chart-box tall-chart">
      ${renderChartSvg({
        points: latencyPoints,
        width: 320,
        height: 118,
        padding: { top: 10, right: 10, bottom: 24, left: 58 },
        tickCount: 4,
        areaClass: "chart-area-latency",
        lineClass: "chart-line-latency",
        yFormatter: latencyAxisLabel,
        xLabels: timeLabels,
        xDomain: latencyTimeDomain,
      })}
    </div>
    <p class="muted-note">${copy.sections.latencyNote}</p>
  `;
}

function renderOverviewEventsContent(snapshot, copy) {
  return `
    <div class="event-list">
      ${snapshot.events
        .slice(0, 7)
        .map(
          (event) => `
            <div class="event-row">
              <span class="event-dot event-${event.level}"></span>
              <div class="event-body">
                <div class="event-text">${escapeHtml(eventText(event, snapshot, copy))}</div>
                <div class="event-time">${formatDateTime(event.at, snapshot.settings.language)}</div>
              </div>
            </div>
          `,
        )
        .join("")}
    </div>
  `;
}

function renderOverview(snapshot, copy) {
  return `
    ${renderTopStats(snapshot, copy)}
    <section class="content-grid content-grid-overview">
      <article class="panel chart-panel">
        <div data-live-region="overview-traffic">
          ${renderOverviewTrafficContent(snapshot, copy)}
        </div>
      </article>

      <article class="panel">
        <div class="panel-head">
          <div>
            <div class="eyebrow">${copy.sections.currentRoute}</div>
            <h2>${copy.sections.currentRouteTitle}</h2>
          </div>
        </div>
        <div data-live-region="overview-route">
          ${renderOverviewRouteContent(snapshot, copy)}
        </div>
      </article>

      <article class="panel">
        <div data-live-region="overview-latency">
          ${renderOverviewLatencyContent(snapshot, copy)}
        </div>
      </article>

      <article class="panel panel-wide">
        <div class="panel-head">
          <div>
            <div class="eyebrow">${copy.sections.recentEvents}</div>
            <h2>${copy.sections.recentEventsTitle}</h2>
          </div>
        </div>
        <div data-live-region="overview-events">
          ${renderOverviewEventsContent(snapshot, copy)}
        </div>
      </article>
    </section>
  `;
}

function renderRoutingManualSelector(snapshot, copy, manualNodeOptions) {
  return renderMenuSelect({
    id: "manual-server",
    label: copy.routeDetails.activeNode,
    selectedLabel:
      snapshot.derived.eligibleNodes.find((node) => node.id === snapshot.routing.manualServerId)?.label ||
      snapshot.derived.bestAutoNode?.label ||
      copy.misc.noData,
    options: manualNodeOptions,
    selectedValue: snapshot.routing.manualServerId || snapshot.derived.bestAutoNode?.id || "",
    copy,
  });
}

function renderRoutingTunnelSummary(snapshot, copy) {
  return `
    <div class="summary-box">
      <div class="summary-box-label">${copy.lists.currentResult}</div>
      <div class="summary-box-value">${escapeHtml(snapshot.derived.activeProxy?.label || copy.misc.direct)}</div>
      <div class="summary-box-note">${escapeHtml(currentSummary(snapshot, copy))}</div>
    </div>
  `;
}

function renderRoutingAutoSummary(snapshot, copy) {
  return `
    <div class="summary-box">
      <div class="summary-box-label">${copy.autoSelection.summaryTitle}</div>
      <div class="summary-box-value">${escapeHtml(snapshot.derived.bestAutoNode?.label || copy.misc.noData)}</div>
      <div class="summary-box-note">
        ${copy.autoSelection.summaryLine(
          copy.autoSelection.metricOptions[snapshot.routing.autoSelection.metric],
          formatMinutesLabel(snapshot.routing.autoSelection.intervalMinutes, snapshot.settings.language),
        )}
        ${copy.nodeFields.score} >= ${snapshot.routing.autoSelection.minScore}. ${copy.autoSelection.tolerance}: ${formatToleranceLabel(snapshot.routing.autoSelection.switchTolerance, snapshot.settings.language)}.
      </div>
    </div>
  `;
}

function renderRoutingLists(snapshot, copy) {
  return `
    <div class="list-section">
      <div class="list-title">${copy.sections.tunnelLists}</div>
      ${renderListEditor({
        editorId: "routing:proxy-lists",
        items: snapshot.routing.proxyLists,
        copy,
        emptyText: copy.misc.noData,
      })}
    </div>
    <div class="list-section">
      <div class="list-title">${copy.sections.directOverrides}</div>
      ${renderListEditor({
        editorId: "routing:direct-overrides",
        items: snapshot.routing.directOverrides,
        copy,
        emptyText: copy.misc.noData,
      })}
    </div>
  `;
}

function renderRouting(snapshot, copy) {
  const controllerIsReal = isRealController(snapshot);
  const metricOptions = Object.entries(copy.autoSelection.metricOptions).map(([value, label]) => ({
    value,
    label,
  }));

  return `
    <section class="content-grid content-grid-routing">
      <article class="panel panel-wide">
        <div class="panel-head">
          <div>
            <div class="eyebrow">${copy.sections.internetMode}</div>
            <h2>${copy.sections.internetModeTitle}</h2>
          </div>
        </div>
        <div class="segmented-grid">
          ${["smart", "direct", "global"]
            .map(
              (mode) => `
                <button class="mode-card ${mode === "global" ? "mode-card-danger" : ""} ${snapshot.routing.mode === mode ? "is-active" : ""}" data-mode="${mode}">
                  <span class="mode-card-title">${copy.modes[mode]}</span>
                  <span class="mode-card-copy">${copy.modeDescriptions[mode]}</span>
                  ${mode === "global" ? `<span class="mode-card-warning">${copy.modeWarnings.global}</span>` : ""}
                  <span class="mode-card-state">${snapshot.routing.mode === mode ? copy.misc.current : copy.misc.choose}</span>
                </button>
              `,
            )
            .join("")}
        </div>
      </article>

      <article class="panel">
        <div class="panel-head">
          <div>
            <div class="eyebrow">${copy.sections.autoSelection}</div>
            <h2>${copy.sections.autoSelectionTitle}</h2>
          </div>
        </div>
        <div class="field-grid">
          ${renderMenuSelect({
            id: "auto-metric",
            label: copy.autoSelection.metric,
            selectedLabel: copy.autoSelection.metricOptions[snapshot.routing.autoSelection.metric],
            options: metricOptions,
            selectedValue: snapshot.routing.autoSelection.metric,
            copy,
            disabled: controllerIsReal,
          })}
          ${renderRangeSlider({
            label: copy.autoSelection.tolerance,
            value: snapshot.routing.autoSelection.switchTolerance,
            min: 20,
            max: 300,
            step: 10,
            currentLabel: formatToleranceLabel(snapshot.routing.autoSelection.switchTolerance, snapshot.settings.language),
            minLabel: formatToleranceLabel(20, snapshot.settings.language),
            maxLabel: formatToleranceLabel(300, snapshot.settings.language),
            dataAttr: 'data-auto-tolerance-range',
            focusKey: "auto-tolerance",
            disabled: controllerIsReal,
          })}
          ${renderRangeSlider({
            label: copy.autoSelection.minScore,
            value: snapshot.routing.autoSelection.minScore,
            min: 1,
            max: 99,
            step: 1,
            currentLabel: String(snapshot.routing.autoSelection.minScore),
            minLabel: "1",
            maxLabel: "99",
            dataAttr: 'data-auto-min-score',
            focusKey: "auto-min-score",
            disabled: controllerIsReal,
          })}
        </div>
        <label class="switch-row switch-row-alone ${controllerIsReal ? "is-disabled" : ""}">
          <span>${copy.autoSelection.sticky}</span>
          <input type="checkbox" data-auto-sticky ${snapshot.routing.autoSelection.stickyBest ? "checked" : ""} ${disabledAttribute(controllerIsReal)} />
        </label>
        ${controllerIsReal ? `<p class="muted-note">${escapeHtml(copy.misc.liveAutoSelectionHint)}</p>` : ""}
        <div data-live-region="routing-auto-summary">
          ${renderRoutingAutoSummary(snapshot, copy)}
        </div>
      </article>

      <article class="panel panel-wide">
        <div class="panel-head">
          <div>
            <div class="eyebrow">${copy.sections.listSection}</div>
            <h2>${copy.sections.listSectionTitle}</h2>
          </div>
        </div>
        <div data-live-region="routing-lists">
          ${renderRoutingLists(snapshot, copy)}
        </div>
      </article>
    </section>
  `;
}

function renderSubscriptionManagementContent(snapshot, copy, { disabled = false } = {}) {
  const actionDisabled = disabled || snapshot.actions.refreshSubscriptions;
  const formatOptions = Object.entries(copy.subscriptionForm.formatOptions).map(([value, label]) => ({
    value,
    label,
  }));

  return `
    <div class="subscription-list">
      ${snapshot.derived.subscriptionSummaries
        .map((subscription) => {
          const edit = ensureSubscriptionEdit(subscription);
          const dirty = isSubscriptionEditDirty(edit);
          return `
            <article class="subscription-card">
              <div class="subscription-meta-grid">
                <div><span>${copy.subscriptionForm.lastSync}</span><strong>${formatRelative(subscription.lastSyncAt, snapshot.settings.language)}</strong></div>
                <div><span>${copy.subscriptionForm.discovered}</span><strong>${subscription.discoveredCount}</strong></div>
                <div><span>${copy.subscriptionForm.used}</span><strong>${subscription.usedCount}</strong></div>
                <div><span>${copy.subscriptionForm.rejected}</span><strong>${subscription.rejectedCount}</strong></div>
              </div>
              <div class="subscription-editor-grid">
                <label class="field">
                  <span>${copy.subscriptionForm.name}</span>
                  <input class="input" data-focus-key="sub-edit-name:${escapeHtml(subscription.id)}" data-subscription-id="${escapeHtml(subscription.id)}" data-subscription-edit-input="name" value="${escapeHtml(edit.name)}" ${disabledAttribute(actionDisabled)} />
                </label>
                <label class="field field-wide">
                  <span>${copy.subscriptionForm.url}</span>
                  <input class="input" data-focus-key="sub-edit-url:${escapeHtml(subscription.id)}" data-subscription-id="${escapeHtml(subscription.id)}" data-subscription-edit-input="url" value="${escapeHtml(edit.url)}" ${disabledAttribute(actionDisabled)} />
                </label>
                ${renderMenuSelect({
                  id: `subscription-edit-format:${subscription.id}`,
                  label: copy.subscriptionForm.format,
                  selectedLabel: copy.subscriptionForm.formatOptions[edit.format] || edit.format,
                  options: formatOptions,
                  selectedValue: edit.format,
                  copy,
                  fullWidth: false,
                  disabled: actionDisabled,
                })}
                <div class="subscription-editor-actions">
                  <button class="primary-button primary-button-success" data-save-subscription="${escapeHtml(subscription.id)}" ${actionDisabled || !dirty || !edit.url.trim() ? "disabled" : ""}>${copy.listEditor.apply}</button>
                  <button class="primary-button primary-button-danger" data-cancel-subscription="${escapeHtml(subscription.id)}" ${actionDisabled || !dirty ? "disabled" : ""}>${copy.listEditor.cancel}</button>
                  <button class="icon-button" data-remove-subscription="${escapeHtml(subscription.id)}" aria-label="${escapeHtml(copy.subscriptionForm.remove)}" ${disabledAttribute(actionDisabled)}>
                    ${icon("trash")}
                  </button>
                </div>
              </div>
              <div class="token-row">
                ${(subscription.egressCountries || [])
                  .map((code) => `<span class="tag">${code} / ${escapeHtml(countryName(code, snapshot.settings.language))}</span>`)
                  .join("") || `<span class="tag">${copy.misc.noData}</span>`}
              </div>
            </article>
          `;
        })
        .join("")}
      <article class="subscription-card subscription-card-add">
        <div class="subscription-editor-grid">
          <label class="field">
            <span>${copy.subscriptionForm.name}</span>
            <input class="input" data-focus-key="sub-name" data-sub-input="name" value="${escapeHtml(state.subscriptionDraft.name)}" placeholder="${escapeHtml(copy.subscriptionForm.namePlaceholder)}" ${disabledAttribute(actionDisabled)} />
          </label>
          <label class="field field-wide">
            <span>${copy.subscriptionForm.url}</span>
            <input class="input" data-focus-key="sub-url" data-sub-input="url" value="${escapeHtml(state.subscriptionDraft.url)}" placeholder="${escapeHtml(copy.subscriptionForm.urlPlaceholder)}" ${disabledAttribute(actionDisabled)} />
          </label>
          ${renderMenuSelect({
            id: "subscription-format",
            label: copy.subscriptionForm.format,
            selectedLabel: copy.subscriptionForm.formatOptions[state.subscriptionDraft.format],
            options: formatOptions,
            selectedValue: state.subscriptionDraft.format,
            copy,
            fullWidth: false,
            disabled: actionDisabled,
          })}
          <div class="subscription-editor-actions">
            <button class="primary-button primary-button-success" data-add-subscription ${actionDisabled || !state.subscriptionDraft.url.trim() ? "disabled" : ""}>${copy.subscriptionForm.add}</button>
          </div>
        </div>
      </article>
    </div>
  `;
}

function renderSubscriptionsManagement(snapshot, copy) {
  return `
    <article class="panel panel-wide">
      <div class="panel-head">
        <div>
          <div class="eyebrow">${copy.sections.subscriptionsMenu}</div>
          <h2>${copy.sections.subscriptionsMenuTitle}</h2>
        </div>
      </div>
      <div data-live-region="subscriptions-management">
        ${renderSubscriptionManagementContent(snapshot, copy, { disabled: isRealController(snapshot) })}
      </div>
      <p class="muted-note">${escapeHtml(isRealController(snapshot) ? copy.subscriptionForm.managementHint : copy.subscriptionForm.refreshHint)}</p>
    </article>
  `;
}

function renderSubscriptionsReport(snapshot, copy) {
  const report = snapshot.derived.policyReport;
  return `
    <article class="panel panel-wide">
      <div class="panel-head">
        <div>
          <div class="eyebrow">${copy.sections.reprocessReport}</div>
          <h2>${copy.sections.reprocessReportTitle}</h2>
        </div>
      </div>
      <div class="subscription-report-actions">
        ${renderMaintenanceButton(snapshot, copy, "refreshSubscriptions")}
        ${renderMaintenanceButton(snapshot, copy, "reprocessSubscriptions")}
      </div>
      <div class="report-top-grid">
        <div class="report-card">
          <div class="report-label">${copy.egressPolicy.reportAt}</div>
          <div class="report-value">${formatDateTime(report.at, snapshot.settings.language)}</div>
        </div>
        <div class="report-card">
          <div class="report-label">${copy.egressPolicy.discovered}</div>
          <div class="report-value">${report.totals.discovered}</div>
        </div>
        <div class="report-card">
          <div class="report-label">${copy.egressPolicy.kept}</div>
          <div class="report-value">${report.totals.used}</div>
        </div>
        <div class="report-card">
          <div class="report-label">${copy.egressPolicy.rejected}</div>
          <div class="report-value">${report.totals.rejected}</div>
        </div>
      </div>
      <div class="report-list">
        ${report.bySubscription
          .map(
            (subscription) => `
              <div class="report-subscription">
                <div class="report-subscription-head">
                  <h3>${escapeHtml(subscription.subscriptionName)}</h3>
                  <span class="badge badge-muted">${subscription.used.length}/${subscription.rejected.length}</span>
                </div>
                <div class="report-subscription-grid">
                  <div class="report-column">
                    <div class="report-column-title">${copy.egressPolicy.usedNodes}</div>
                    <div class="report-chip-list">
                      ${
                        subscription.used.length
                          ? subscription.used
                              .map((node) => `<span class="tag">${escapeHtml(node.label)} / ${escapeHtml(node.egressCountry)}</span>`)
                              .join("")
                          : `<span class="tag">${copy.misc.noData}</span>`
                      }
                    </div>
                  </div>
                  <div class="report-column">
                    <div class="report-column-title">${copy.egressPolicy.rejectedNodes}</div>
                    <div class="report-chip-list">
                      ${
                        subscription.rejected.length
                          ? subscription.rejected
                              .map((node) => renderRejectedSubscriptionNodeChip(node, copy))
                              .join("")
                          : `<span class="tag">${copy.misc.noData}</span>`
                      }
                    </div>
                  </div>
                </div>
              </div>
            `,
          )
          .join("")}
      </div>
    </article>
  `;
}

function renderSubscriptions(snapshot, copy) {
  const controllerIsReal = isRealController(snapshot);
  const managedLive = snapshot.controller?.bridgeManaged === true;

  return `
    <section class="content-grid content-grid-subscriptions">
      ${renderSubscriptionsManagement(snapshot, copy)}

      <article class="panel panel-wide">
        <div class="panel-head">
          <div>
            <div class="eyebrow">${copy.sections.egressPolicy}</div>
            <h2>${copy.sections.egressPolicyTitle}</h2>
          </div>
        </div>
        <div data-live-region="subscriptions-policy">
          ${renderCountryPicker(snapshot, copy, controllerIsReal)}
          <label class="switch-row switch-row-alone ${controllerIsReal ? "is-disabled" : ""}">
            <span>${copy.egressPolicy.allowUnknown}</span>
            <input type="checkbox" data-allow-unknown ${snapshot.subscriptions.egressPolicy.allowUnknown ? "checked" : ""} ${disabledAttribute(controllerIsReal)} />
          </label>
        </div>
        <p class="muted-note">${escapeHtml(managedLive ? copy.misc.liveEgressHint : copy.egressPolicy.helper)}</p>
      </article>

      <div class="panel-wide" data-live-region="subscriptions-report">
        ${renderSubscriptionsReport(snapshot, copy)}
      </div>
    </section>
  `;
}

function renderNodesSummaryContent(snapshot, copy) {
  return `
    <div class="panel-head">
      <div>
        <div class="eyebrow">${copy.sections.healthyPool}</div>
        <h2>${copy.sections.healthyPoolTitle}</h2>
      </div>
      <div class="chip-row">
        <span class="chip chip-neutral">${snapshot.derived.eligibleNodes.length} ${copy.misc.eligibleNodes}</span>
        <span class="chip chip-danger">${snapshot.derived.rejectedNodes.length} ${copy.misc.hiddenNodes}</span>
      </div>
    </div>
    ${renderMaintenanceActionBlock(snapshot, copy, "retestServers")}
  `;
}

function renderEligibleNodesContent(snapshot, copy) {
  const eligibleNodes = [...snapshot.derived.eligibleNodes].sort((left, right) => {
    const rank = { best: 0, alive: 1, unstable: 2, blocked: 3 };
    return rank[left.availability] - rank[right.availability] || (left.latency || 9999) - (right.latency || 9999);
  });

  return `
    <div class="server-list">
      ${eligibleNodes
        .map(
          (node) => `
            <article class="server-card ${snapshot.routing.manualServerId === node.id ? "is-selected" : ""}">
              <div class="server-main">
                <div class="server-head">
                  <div>
                    <div class="server-title-line">
                      <h3>${escapeHtml(node.label)}</h3>
                      <span class="${badgeClass(node)}">${escapeHtml(nodeStatusLabel(node, copy))}</span>
                    </div>
                    <div class="server-meta">${escapeHtml(node.region)} / ${copy.nodeFields.provider}: ${escapeHtml(node.provider)} / ${copy.nodeFields.protocol}: ${escapeHtml(node.protocol)}</div>
                    <div class="server-meta">${copy.nodeFields.subscription}: ${escapeHtml(snapshot.derived.subscriptionSummaries.find((subscription) => subscription.id === node.subscriptionId)?.name || node.subscriptionId)} / ${copy.nodeFields.egress}: ${escapeHtml(node.egressCountry)} (${escapeHtml(countryName(node.egressCountry, snapshot.settings.language))})</div>
                  </div>
                  <div class="latency-badge ${latencyTone(node.latency)}">${node.latency ? `${node.latency} ms` : copy.nodeFields.timeout}</div>
                </div>
                <div class="server-trend">
                  ${renderChartSvg({
                    points: node.trend,
                    width: 240,
                    height: 52,
                    padding: { top: 6, right: 8, bottom: 18, left: 46 },
                    tickCount: 3,
                    areaClass: "chart-area-latency",
                    lineClass: "chart-line-latency",
                    yFormatter: (value) => `${formatLocalizedNumber(value, snapshot.settings.language, 0, 0)} ms`,
                    xLabels: chartHistoryLabels(snapshot.settings.language),
                    compact: true,
                  })}
                </div>
                <div class="server-stats">
                  <span>${copy.nodeFields.jitter} ${node.jitter} ms</span>
                  <span>${copy.nodeFields.down} ${formatThroughput(node.rxMbps, snapshot.settings.language, snapshot.settings)}</span>
                  <span>${copy.nodeFields.up} ${formatThroughput(node.txMbps, snapshot.settings.language, snapshot.settings)}</span>
                  <span>${copy.nodeFields.score} ${node.score}</span>
                </div>
              </div>
              <div class="server-side">
                <button class="secondary-button" data-manual-server="${escapeHtml(node.id)}" ${node.baseStatus === "unstable" ? "disabled" : ""}>
                  ${copy.nodeFields.useManual}
                </button>
              </div>
            </article>
          `,
        )
        .join("")}
    </div>
  `;
}

function renderRejectedNodesContent(snapshot, copy) {
  return `
    <div class="rejected-list">
      ${snapshot.derived.rejectedNodes
        .map(
          (node) => `
            <div class="rejected-row">
              <div>
                <div class="rejected-title">${escapeHtml(node.label)}</div>
                <div class="rejected-note">${copy.nodeFields.subscription}: ${escapeHtml(snapshot.derived.subscriptionSummaries.find((subscription) => subscription.id === node.subscriptionId)?.name || node.subscriptionId)}</div>
                <div class="rejected-note">${copy.nodeFields.egress}: ${escapeHtml(node.egressCountry)} (${escapeHtml(countryName(node.egressCountry, snapshot.settings.language))})</div>
              </div>
              <span class="badge badge-bad">${escapeHtml(policyReasonLabel(node.rejectionReason, copy))}</span>
            </div>
          `,
        )
        .join("")}
    </div>
  `;
}

function renderNodes(snapshot, copy) {
  return `
    <section class="content-grid content-grid-nodes">
      <article class="panel panel-wide">
        <div data-live-region="nodes-summary">
          ${renderNodesSummaryContent(snapshot, copy)}
        </div>
        ${copy.sections.healthyPoolNote ? `<p class="muted-note">${copy.sections.healthyPoolNote}</p>` : ""}
        <div data-live-region="nodes-eligible-list">
          ${renderEligibleNodesContent(snapshot, copy)}
        </div>
      </article>

      <article class="panel">
        <div class="panel-head">
          <div>
            <div class="eyebrow">${copy.sections.hiddenNodes}</div>
            <h2>${copy.sections.hiddenNodesTitle}</h2>
          </div>
        </div>
        <div data-live-region="nodes-rejected-list">
          ${renderRejectedNodesContent(snapshot, copy)}
        </div>
      </article>
    </section>
  `;
}

function renderRulesMaintenanceAction(snapshot, copy) {
  return renderMaintenanceActionBlock(snapshot, copy, "updateLists");
}

function renderRules(snapshot, copy) {
  const viewCopy = copy.rulesView;
  const controllerIsReal = isRealController(snapshot);
  const base = selectedBase(snapshot);
  const rule = selectedRule(snapshot);
  const formatOptions = Object.entries(viewCopy.formatOptions).map(([value, label]) => ({ value, label }));
  const kindOptions = Object.entries(viewCopy.kindOptions).map(([value, label]) => ({ value, label }));
  const scopeOptions = Object.entries(viewCopy.scopeOptions).map(([value, label]) => ({ value, label }));
  const actionOptions = Object.entries(viewCopy.actionOptions).map(([value, label]) => ({ value, label }));
  const targetOptions = Object.entries(viewCopy.targetOptions).map(([value, label]) => ({ value, label }));

  return `
    <section class="content-grid content-grid-rules">
      <article class="panel">
        <div class="panel-head">
          <div>
            <div class="eyebrow">${viewCopy.kicker}</div>
            <h2>${viewCopy.basesTitle}</h2>
          </div>
        </div>
        <p class="muted-note">${viewCopy.subtitle}</p>
        ${controllerIsReal ? `<p class="muted-note">${escapeHtml(copy.misc.liveRulesHint)}</p>` : ""}
        <div data-live-region="rules-maintenance">
          ${renderRulesMaintenanceAction(snapshot, copy)}
        </div>
        <div class="base-list">
          ${snapshot.ruleEngine.bases
            .map(
              (item) => `
                <button class="select-card ${base?.id === item.id ? "is-selected" : ""}" data-select-base="${escapeHtml(item.id)}">
                  <span class="select-card-top">
                    <strong>${escapeHtml(item.name)}</strong>
                    <span class="badge ${item.enabled ? "badge-good" : "badge-muted"}">${item.enabled ? viewCopy.enable : viewCopy.disable}</span>
                  </span>
                  <span class="select-card-line">${escapeHtml(viewCopy.kindOptions[item.kind])} / ${escapeHtml(viewCopy.scopeOptions[item.scope])}</span>
                  <span class="select-card-line">${viewCopy.baseItems}: ${item.entryCount}</span>
                  <span class="select-card-line">${viewCopy.baseLastSync}: ${formatRelative(item.lastSyncAt, snapshot.settings.language)}</span>
                </button>
              `,
            )
            .join("")}
        </div>
      </article>

      <article class="panel">
        <div class="panel-head">
          <div>
            <div class="eyebrow">${viewCopy.kicker}</div>
            <h2>${viewCopy.rulesTitle}</h2>
          </div>
        </div>
        <div class="rule-list">
          ${snapshot.ruleEngine.rules
            .map(
              (item) => `
                <button class="select-card ${rule?.id === item.id ? "is-selected" : ""}" data-select-rule="${escapeHtml(item.id)}">
                  <span class="select-card-top">
                    <strong>${item.priority}. ${escapeHtml(item.name)}</strong>
                    <span class="badge ${item.enabled ? "badge-good" : "badge-muted"}">${item.action}</span>
                  </span>
                  <span class="select-card-line">${escapeHtml(item.target)}</span>
                  <span class="select-card-line">${escapeHtml(viewCopy.ruleSummary(item.activeBaseCount, item.itemCount))}</span>
                </button>
              `,
            )
            .join("")}
        </div>
      </article>

      ${
        base
          ? `
            <article class="panel">
              <div class="panel-head">
                <div>
                  <div class="eyebrow">${viewCopy.kicker}</div>
                  <h2>${viewCopy.baseEditorTitle}</h2>
                </div>
                <div class="panel-actions">
                  ${base.isRemote ? `<button class="secondary-button" data-sync-base="${escapeHtml(base.id)}">${viewCopy.syncNow}</button>` : ""}
                  <button class="icon-button" data-remove-base="${escapeHtml(base.id)}" aria-label="${escapeHtml(viewCopy.remove)}" ${disabledAttribute(controllerIsReal)}>${icon("trash")}</button>
                </div>
              </div>
              <div class="field-grid">
                <label class="field">
                  <span>${copy.subscriptionForm.name}</span>
                  <input class="input" data-focus-key="base-name" data-base-input="name" value="${escapeHtml(base.name)}" ${disabledAttribute(controllerIsReal)} />
                </label>
                ${renderMenuSelect({
                  id: "base-kind",
                  label: viewCopy.baseKind,
                  selectedLabel: viewCopy.kindOptions[base.kind],
                  options: kindOptions,
                  selectedValue: base.kind,
                  copy,
                  disabled: controllerIsReal,
                })}
                ${renderMenuSelect({
                  id: "base-scope",
                  label: viewCopy.baseScope,
                  selectedLabel: viewCopy.scopeOptions[base.scope],
                  options: scopeOptions,
                  selectedValue: base.scope,
                  copy,
                  disabled: controllerIsReal,
                })}
                ${renderMenuSelect({
                  id: "base-format",
                  label: viewCopy.baseFormat,
                  selectedLabel: viewCopy.formatOptions[base.format] || base.format,
                  options: formatOptions,
                  selectedValue: base.format,
                  copy,
                  disabled: controllerIsReal,
                })}
                <label class="field field-wide">
                  <span>${viewCopy.baseSourceUrl}</span>
                  <input class="input" data-focus-key="base-source-url" data-base-input="sourceUrl" value="${escapeHtml(base.sourceUrl || "")}" ${base.isLocal ? "placeholder=\"local list\"" : ""} ${disabledAttribute(controllerIsReal)} />
                </label>
                <label class="field">
                  <span>${viewCopy.baseRuntime}</span>
                  <input class="input" value="${escapeHtml(base.runtimeMode || "-")}" disabled />
                </label>
              </div>
              <div class="switch-grid">
                <label class="switch-row ${controllerIsReal ? "is-disabled" : ""}">
                  <span>${viewCopy.baseEnabled}</span>
                  <input type="checkbox" data-base-enabled ${base.enabled ? "checked" : ""} ${disabledAttribute(controllerIsReal)} />
                </label>
              </div>
              ${base.isRemote ? `<p class="muted-note">${copy.settings.remoteBaseTimersHint}</p>` : ""}
              <div class="summary-grid">
                <div class="summary-box">
                  <div class="summary-box-label">${viewCopy.baseItems}</div>
                  <div class="summary-box-value">${base.entryCount}</div>
                </div>
                <div class="summary-box">
                  <div class="summary-box-label">${viewCopy.baseLastSync}</div>
                  <div class="summary-box-value">${formatRelative(base.lastSyncAt, snapshot.settings.language)}</div>
                </div>
              </div>
              ${
                base.isLocal
                  ? `
                    <div class="list-section">
                      <div class="list-title">${viewCopy.entries}</div>
                      ${renderListEditor({
                        editorId: `base:${base.id}`,
                        items: base.entries || [],
                        copy,
                        editable: !controllerIsReal,
                        emptyText: viewCopy.emptyEntries,
                        placeholder: viewCopy.emptyEntries,
                      })}
                    </div>
                  `
                  : `
                    <div class="list-section">
                      <div class="list-title">${viewCopy.preview}</div>
                      ${renderListEditor({
                        editorId: `base-preview:${base.id}`,
                        items: base.preview || [],
                        copy,
                        emptyText: viewCopy.emptyEntries,
                        placeholder: viewCopy.emptyEntries,
                      })}
                    </div>
                  `
              }
              ${base.note ? `<p class="muted-note">${escapeHtml(base.note)}</p>` : ""}
            </article>
          `
          : ""
      }

      ${
        rule
          ? `
            <article class="panel">
              <div class="panel-head">
                <div>
                  <div class="eyebrow">${viewCopy.kicker}</div>
                  <h2>${viewCopy.ruleEditorTitle}</h2>
                </div>
                ${rule.locked ? `<span class="badge badge-muted">${viewCopy.ruleLocked}</span>` : `<button class="icon-button" data-remove-rule="${escapeHtml(rule.id)}" aria-label="${escapeHtml(viewCopy.remove)}" ${disabledAttribute(controllerIsReal)}>${icon("trash")}</button>`}
              </div>
              <div class="field-grid">
                <label class="field">
                  <span>${copy.subscriptionForm.name}</span>
                  <input class="input" data-focus-key="rule-name" data-rule-input="name" value="${escapeHtml(rule.name)}" ${rule.locked ? "disabled" : disabledAttribute(controllerIsReal)} />
                </label>
                <label class="field">
                  <span>${viewCopy.rulePriority}</span>
                  <input class="input" type="number" min="1" max="999" data-focus-key="rule-priority" data-rule-input="priority" value="${rule.priority}" ${rule.locked ? "disabled" : disabledAttribute(controllerIsReal)} />
                </label>
                ${renderMenuSelect({
                  id: "rule-action",
                  label: viewCopy.ruleAction,
                  selectedLabel: viewCopy.actionOptions[rule.action],
                  options: actionOptions,
                  selectedValue: rule.action,
                  copy,
                  disabled: controllerIsReal || rule.locked,
                })}
                ${renderMenuSelect({
                  id: "rule-target",
                  label: viewCopy.ruleTarget,
                  selectedLabel: viewCopy.targetOptions[rule.target] || rule.target,
                  options: targetOptions,
                  selectedValue: rule.target,
                  copy,
                  disabled: controllerIsReal || rule.locked,
                })}
              </div>
              <div class="switch-grid">
                <label class="switch-row ${controllerIsReal || rule.locked ? "is-disabled" : ""}">
                  <span>${viewCopy.ruleEnabled}</span>
                  <input type="checkbox" data-rule-enabled ${rule.enabled ? "checked" : ""} ${rule.locked ? "disabled" : disabledAttribute(controllerIsReal)} />
                </label>
                <label class="switch-row">
                  <span>${viewCopy.ruleMatchMode}</span>
                  <input class="input" value="${escapeHtml(viewCopy.matchModes[rule.matchMode] || rule.matchMode)}" disabled />
                </label>
              </div>
              <label class="field">
                <span>${viewCopy.note}</span>
                <input class="input" data-focus-key="rule-note" data-rule-input="note" value="${escapeHtml(rule.note || "")}" ${rule.locked ? "disabled" : disabledAttribute(controllerIsReal)} />
              </label>
              <div class="list-section">
                <div class="list-title">${viewCopy.attachBases}</div>
                <div class="attach-grid">
                  ${snapshot.ruleEngine.bases
                    .map(
                      (item) => `
                        <label class="attach-card ${rule.baseIds.includes(item.id) ? "is-selected" : ""}">
                          <input type="checkbox" data-toggle-rule-base="${escapeHtml(item.id)}" ${rule.baseIds.includes(item.id) ? "checked" : ""} ${rule.locked ? "disabled" : disabledAttribute(controllerIsReal)} />
                          <span>${escapeHtml(item.name)}</span>
                        </label>
                      `,
                    )
                    .join("")}
                </div>
              </div>
            </article>
          `
          : ""
      }

      <article class="panel panel-wide">
        <div class="panel-head">
          <div>
            <div class="eyebrow">${viewCopy.kicker}</div>
            <h2>${viewCopy.createBaseTitle} / ${viewCopy.createRuleTitle}</h2>
          </div>
        </div>
        <div class="split-grid">
          <div class="stack-card">
            <div class="list-title">${viewCopy.createBaseTitle}</div>
            <div class="field-grid">
              <label class="field">
                <span>${copy.subscriptionForm.name}</span>
                <input class="input" data-focus-key="draft-base-name" data-draft-input="base-name" value="${escapeHtml(state.baseDraft.name)}" ${disabledAttribute(controllerIsReal)} />
              </label>
              ${renderMenuSelect({
                id: "draft-base-kind",
                label: viewCopy.baseKind,
                selectedLabel: viewCopy.kindOptions[state.baseDraft.kind],
                options: kindOptions,
                selectedValue: state.baseDraft.kind,
                copy,
                disabled: controllerIsReal,
              })}
              ${renderMenuSelect({
                id: "draft-base-scope",
                label: viewCopy.baseScope,
                selectedLabel: viewCopy.scopeOptions[state.baseDraft.scope],
                options: scopeOptions,
                selectedValue: state.baseDraft.scope,
                copy,
                disabled: controllerIsReal,
              })}
              ${renderMenuSelect({
                id: "draft-base-source-type",
                label: copy.subscriptionForm.format,
                selectedLabel: viewCopy.sourceTypeOptions[state.baseDraft.sourceType],
                options: Object.entries(viewCopy.sourceTypeOptions).map(([value, label]) => ({ value, label })),
                selectedValue: state.baseDraft.sourceType,
                copy,
                disabled: controllerIsReal,
              })}
            </div>
            <button class="primary-button" data-add-base ${disabledAttribute(controllerIsReal)}>${icon("plus")}<span>${viewCopy.addBase}</span></button>
          </div>
          <div class="stack-card">
            <div class="list-title">${viewCopy.createRuleTitle}</div>
            <div class="field-grid">
              <label class="field">
                <span>${copy.subscriptionForm.name}</span>
                <input class="input" data-focus-key="draft-rule-name" data-draft-input="rule-name" value="${escapeHtml(state.ruleDraft.name)}" ${disabledAttribute(controllerIsReal)} />
              </label>
              ${renderMenuSelect({
                id: "draft-rule-action",
                label: viewCopy.ruleAction,
                selectedLabel: viewCopy.actionOptions[state.ruleDraft.action],
                options: actionOptions,
                selectedValue: state.ruleDraft.action,
                copy,
                disabled: controllerIsReal,
              })}
              ${renderMenuSelect({
                id: "draft-rule-target",
                label: viewCopy.ruleTarget,
                selectedLabel: viewCopy.targetOptions[state.ruleDraft.target],
                options: targetOptions,
                selectedValue: state.ruleDraft.target,
                copy,
                disabled: controllerIsReal,
              })}
            </div>
            <button class="primary-button" data-add-rule ${disabledAttribute(controllerIsReal)}>${icon("plus")}<span>${viewCopy.addRule}</span></button>
          </div>
        </div>
      </article>
    </section>
  `;
}

function getFilteredConnections(snapshot) {
  const tab = state.connectionFilters.tab;
  const scope = state.connectionFilters.scope;
  const search = state.connectionFilters.search.trim();
  return snapshot.connections.items.filter((connection) => {
    if (tab === "active" && connection.state !== "active") {
      return false;
    }
    if (tab === "closed" && connection.state !== "closed") {
      return false;
    }
    if (scope !== CONNECTION_SCOPE_ALL && connection.sourceKey !== scope) {
      return false;
    }
    return matchesConnectionSearch(connection, search);
  });
}

function getVisibleConnectionStats(filteredConnections) {
  return {
    active: filteredConnections.filter((connection) => connection.state === "active").length,
    dlSpeedBps: filteredConnections.reduce((sum, connection) => sum + connection.dlSpeedBps, 0),
    ulSpeedBps: filteredConnections.reduce((sum, connection) => sum + connection.ulSpeedBps, 0),
    dlBytes: filteredConnections.reduce((sum, connection) => sum + connection.dlBytes, 0),
    ulBytes: filteredConnections.reduce((sum, connection) => sum + connection.ulBytes, 0),
  };
}

function renderConnectionsActions(snapshot, copy, filteredConnections) {
  const viewCopy = copy.connectionsView;
  return `
    <button class="secondary-button" data-close-visible-connections ${filteredConnections.length ? "" : "disabled"}>${viewCopy.closeVisible}</button>
    <button class="secondary-button" data-clear-closed-connections ${snapshot.connections.closedCount ? "" : "disabled"}>${viewCopy.clearClosed}</button>
    <button class="secondary-button" data-toggle-connections-pause>${snapshot.connections.paused ? viewCopy.resume : viewCopy.pause}</button>
  `;
}

function renderConnectionsStats(snapshot, copy, filteredConnections) {
  const viewCopy = copy.connectionsView;
  const visibleStats = getVisibleConnectionStats(filteredConnections);
  return `
    <article class="stat-card stat-card-compact"><div class="stat-label">${viewCopy.stats.active}</div><div class="stat-value">${state.connectionFilters.tab === "active" ? visibleStats.active : snapshot.connections.activeCount}</div></article>
    <article class="stat-card stat-card-compact"><div class="stat-label">${viewCopy.stats.dlSpeed}</div><div class="stat-value">${formatRate(visibleStats.dlSpeedBps, snapshot.settings.language, snapshot.settings)}</div></article>
    <article class="stat-card stat-card-compact"><div class="stat-label">${viewCopy.stats.dl}</div><div class="stat-value">${formatBytes(visibleStats.dlBytes, snapshot.settings.language, snapshot.settings)}</div></article>
    <article class="stat-card stat-card-compact"><div class="stat-label">${viewCopy.stats.ulSpeed}</div><div class="stat-value">${formatRate(visibleStats.ulSpeedBps, snapshot.settings.language, snapshot.settings)}</div></article>
    <article class="stat-card stat-card-compact"><div class="stat-label">${viewCopy.stats.ul}</div><div class="stat-value">${formatBytes(visibleStats.ulBytes, snapshot.settings.language, snapshot.settings)}</div></article>
    <article class="stat-card stat-card-compact"><div class="stat-label">${viewCopy.stats.memory}</div><div class="stat-value">${formatMemory(snapshot.connections.totals.memoryMiB, snapshot.settings.language, snapshot.settings)}</div></article>
  `;
}

function renderConnectionsTabs(snapshot, copy) {
  const viewCopy = copy.connectionsView;
  const tab = state.connectionFilters.tab;
  return `
    <button class="soft-toggle ${tab === "active" ? "is-active" : ""}" data-connections-tab="active">${viewCopy.activeTab(snapshot.connections.activeCount)}</button>
    <button class="soft-toggle ${tab === "closed" ? "is-active" : ""}" data-connections-tab="closed">${viewCopy.closedTab}</button>
  `;
}

function renderConnectionsTable(snapshot, copy, filteredConnections) {
  const viewCopy = copy.connectionsView;
  return `
    <div class="table-shell">
      <table class="connections-table">
        <thead>
          <tr>
            <th>${viewCopy.columns.close}</th>
            <th>${viewCopy.columns.host}</th>
            <th>${viewCopy.columns.type}</th>
            <th>${viewCopy.columns.rule}</th>
            <th>${viewCopy.columns.chains}</th>
            <th>${viewCopy.columns.dlSpeed}</th>
            <th>${viewCopy.columns.ulSpeed}</th>
            <th>${viewCopy.columns.dl}</th>
            <th>${viewCopy.columns.ul}</th>
            <th>${viewCopy.columns.connected}</th>
          </tr>
        </thead>
        <tbody>
          ${
            filteredConnections.length
              ? filteredConnections
                  .map(
                    (connection) => `
                      <tr>
                        <td>
                          ${
                            connection.state === "active"
                              ? `<button class="mini-button" data-close-connection="${escapeHtml(connection.id)}">${viewCopy.columns.close}</button>`
                              : `<span class="muted-note">-</span>`
                          }
                        </td>
                        <td>
                          <div class="cell-title">${escapeHtml(connection.host)}</div>
                          <div class="cell-subtitle">${escapeHtml(connection.sourceLabel)}</div>
                        </td>
                        <td>${escapeHtml(`${connection.inbound} | ${connection.network}`)}</td>
                        <td>${escapeHtml(connection.rule)}</td>
                        <td><div class="chain-stack">${connection.chains.map((chain) => `<span class="tag">${escapeHtml(chain)}</span>`).join("")}</div></td>
                        <td>${formatRate(connection.dlSpeedBps, snapshot.settings.language, snapshot.settings)}</td>
                        <td>${formatRate(connection.ulSpeedBps, snapshot.settings.language, snapshot.settings)}</td>
                        <td>${formatBytes(connection.dlBytes, snapshot.settings.language, snapshot.settings)}</td>
                        <td>${formatBytes(connection.ulBytes, snapshot.settings.language, snapshot.settings)}</td>
                        <td>${formatRelative(connection.connectedAt, snapshot.settings.language)}</td>
                      </tr>
                    `,
                  )
                  .join("")
              : `<tr><td colspan="10"><div class="muted-note">${viewCopy.noMatches}</div></td></tr>`
          }
        </tbody>
      </table>
    </div>
  `;
}

function renderConnections(snapshot, copy) {
  const viewCopy = copy.connectionsView;
  const filteredConnections = getFilteredConnections(snapshot);
  const scopeOptions = [
    { value: CONNECTION_SCOPE_ALL, label: viewCopy.allScope },
    ...snapshot.connections.scopeOptions.map((value) => ({ value, label: value })),
  ];
  const selectedScopeLabel =
    state.connectionFilters.scope === CONNECTION_SCOPE_ALL ? viewCopy.allScope : state.connectionFilters.scope;

  return `
    <section class="content-grid content-grid-connections">
      <article class="panel panel-wide">
        <div class="panel-head">
          <div>
            <div class="eyebrow">${viewCopy.kicker}</div>
            <h2>${viewCopy.title}</h2>
          </div>
          <div class="panel-actions" data-live-region="connections-actions">
            ${renderConnectionsActions(snapshot, copy, filteredConnections)}
          </div>
        </div>
        <p class="muted-note">${viewCopy.subtitle}</p>
        <div class="connections-stats" data-live-region="connections-stats">
          ${renderConnectionsStats(snapshot, copy, filteredConnections)}
        </div>
        <div class="connections-toolbar">
          <div class="toggle-row" data-live-region="connections-tabs">
            ${renderConnectionsTabs(snapshot, copy)}
          </div>
          ${renderMenuSelect({
            id: "connections-scope",
            label: viewCopy.scope,
            selectedLabel: selectedScopeLabel,
            options: scopeOptions,
            selectedValue: state.connectionFilters.scope,
            copy,
            fullWidth: false,
          })}
          <label class="field field-grow">
            <span>${viewCopy.search}</span>
            <input class="input" data-focus-key="connections-search" data-connection-search value="${escapeHtml(state.connectionFilters.search)}" placeholder="${escapeHtml(viewCopy.search)}" />
          </label>
        </div>
        <div data-live-region="connections-table">
          ${renderConnectionsTable(snapshot, copy, filteredConnections)}
        </div>
      </article>
    </section>
  `;
}

function renderTools(snapshot, copy) {
  const viewCopy = copy.toolsView;

  return `
    <section class="content-grid content-grid-tools">
      <article class="panel panel-wide diagnostic-card">
        <div class="panel-head">
          <div>
            <div class="eyebrow">${viewCopy.kicker}</div>
            <h2>${viewCopy.diagnosticTitle}</h2>
          </div>
        </div>
        <p class="muted-note">${viewCopy.diagnosticSubtitle}</p>
        <label class="field">
          <span>${viewCopy.diagnosticLabel}</span>
          <textarea class="input diagnostic-input" data-focus-key="tool-diagnostic-addresses" data-tool-input="diagnosticAddresses" placeholder="${escapeHtml(viewCopy.diagnosticPlaceholder)}">${escapeHtml(state.toolDrafts.diagnosticAddresses)}</textarea>
        </label>
        <div class="diagnostic-actions" data-live-region="tool-diagnostic-actions">
          ${renderDiagnosticActions(snapshot, copy)}
        </div>
        <div class="diagnostic-hints">
          <span>${escapeHtml(viewCopy.quickHint)}</span>
          <span>${escapeHtml(viewCopy.fullHint)}</span>
        </div>
        <div data-live-region="tool-diagnostic-report">
          ${renderDiagnosticReport(snapshot, copy)}
        </div>
        ${renderAdvancedToolDetails(snapshot, copy)}
      </article>
    </section>
  `;
}

function renderToolActionButton(actionAttr, busy, iconName, idleLabel, loadingLabel) {
  return `
    <button class="primary-button" ${actionAttr} ${busy ? 'disabled aria-busy="true"' : ""}>
      ${busy ? '<span class="button-spinner" aria-hidden="true"></span>' : icon(iconName)}
      <span>${busy ? loadingLabel : idleLabel}</span>
    </button>
  `;
}

function renderDiagnosticActions(snapshot, copy) {
  const viewCopy = copy.toolsView;
  const routeBusy = currentToolStatus(snapshot.tools.routeProbe) === "running";
  const ruleBusy = currentToolStatus(snapshot.tools.ruleProbe) === "running";
  const dnsBusy = currentToolStatus(snapshot.tools.dnsProbe) === "running";
  const latencyBusy = currentToolStatus(snapshot.tools.latencyProbe) === "running";
  const diagnosticBusy = routeBusy || ruleBusy || dnsBusy || latencyBusy;

  return `
    <button class="primary-button" data-run-diagnostic="quick" ${diagnosticBusy ? 'disabled aria-busy="true"' : ""}>
      ${diagnosticBusy && !latencyBusy ? '<span class="button-spinner" aria-hidden="true"></span>' : icon("tools")}
      <span>${diagnosticBusy && !latencyBusy ? viewCopy.buttonLoading : viewCopy.quickButton}</span>
    </button>
    <button class="secondary-button" data-run-diagnostic="full" ${diagnosticBusy ? 'disabled aria-busy="true"' : ""}>
      ${diagnosticBusy && latencyBusy ? '<span class="button-spinner" aria-hidden="true"></span>' : icon("connections")}
      <span>${diagnosticBusy && latencyBusy ? viewCopy.buttonLoading : viewCopy.fullButton}</span>
    </button>
  `;
}

function parseDiagnosticAddresses(value) {
  return String(value || "")
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function firstDiagnosticAddress(snapshot, copy) {
  const draftAddress = parseDiagnosticAddresses(state.toolDrafts.diagnosticAddresses)[0];
  if (draftAddress) {
    return draftAddress;
  }
  return (
    snapshot.tools.routeProbe?.result?.address ||
    snapshot.tools.ruleProbe?.result?.address ||
    snapshot.tools.dnsProbe?.result?.address ||
    copy.misc.noData
  );
}

function probeStatusClass(tool) {
  const status = currentToolStatus(tool);
  if (status === "success") {
    return "is-ok";
  }
  if (status === "error") {
    return "is-bad";
  }
  if (status === "running") {
    return "is-running";
  }
  return "is-idle";
}

function diagnosticRouteKind(snapshot) {
  return (
    snapshot.tools.routeProbe?.result?.routeKind ||
    snapshot.tools.ruleProbe?.result?.finalRouteKind ||
    snapshot.tools.dnsProbe?.result?.routeKind ||
    ""
  );
}

function diagnosticHasResult(snapshot) {
  return Boolean(
    snapshot.tools.routeProbe?.result ||
      snapshot.tools.ruleProbe?.result ||
      snapshot.tools.dnsProbe?.result ||
      snapshot.tools.latencyProbe?.results?.length,
  );
}

function diagnosticHasError(snapshot) {
  return ["routeProbe", "ruleProbe", "dnsProbe", "latencyProbe"].some((key) => currentToolStatus(snapshot.tools[key]) === "error");
}

function diagnosticIsRunning(snapshot) {
  return ["routeProbe", "ruleProbe", "dnsProbe", "latencyProbe"].some((key) => currentToolStatus(snapshot.tools[key]) === "running");
}

function renderDiagnosticReport(snapshot, copy) {
  const viewCopy = copy.toolsView;
  const routeTool = snapshot.tools.routeProbe;
  const ruleTool = snapshot.tools.ruleProbe;
  const dnsTool = snapshot.tools.dnsProbe;
  const latencyTool = snapshot.tools.latencyProbe;
  const routeResult = routeTool.result;
  const ruleResult = ruleTool.result;
  const dnsResult = dnsTool.result;
  const routeKind = diagnosticRouteKind(snapshot);
  const hasResult = diagnosticHasResult(snapshot);
  const hasError = diagnosticHasError(snapshot);
  const running = diagnosticIsRunning(snapshot);
  const title =
    running
      ? viewCopy.reportRunning
      : hasError
        ? viewCopy.reportError
        : routeKind === "proxy"
          ? viewCopy.reportTunnel
          : routeKind === "direct"
            ? viewCopy.reportDirect
            : hasResult
              ? viewCopy.reportUnknown
              : viewCopy.reportWaiting;
  const badgeClass = hasError ? "badge-bad" : routeKind === "proxy" ? "badge-good" : routeKind === "direct" ? "badge-muted" : "badge-muted";
  const exitCountry = routeResult?.exitCountry || ruleResult?.finalExitCountry || "";
  const exitIp = routeResult?.exitIp || ruleResult?.finalExitIp || "";
  const nodeLabel = routeResult?.nodeLabel || (routeKind === "direct" ? viewCopy.routeDirect : copy.misc.noData);
  const groupLabel = ruleResult?.matchedTarget || routeResult?.matchedTarget || (routeKind === "direct" ? viewCopy.routeDirect : copy.misc.noData);
  const dnsLabel =
    currentToolStatus(dnsTool) === "running"
      ? viewCopy.statusRunning
      : dnsResult?.status === "ip-literal"
        ? viewCopy.dnsLiteralIp
        : dnsResult?.resolverName || viewCopy.dnsResolved;
  const ruleLabel = ruleResult?.matchedRuleName || routeResult?.matchedRuleName || copy.misc.noData;
  const egressLabel =
    exitIp || exitCountry
      ? [exitCountry ? countryName(exitCountry, snapshot.settings.language) : "", exitIp].filter(Boolean).join(" / ")
      : routeKind === "direct"
        ? viewCopy.routeDirect
        : copy.misc.noData;

  return `
    <div class="diagnostic-report">
      <div class="diagnostic-hero">
        <div>
          <div class="eyebrow">${viewCopy.reportTitle}</div>
          <h3>${escapeHtml(title)}</h3>
          <p class="muted-note">${escapeHtml(viewCopy.primaryAddress)}: ${escapeHtml(firstDiagnosticAddress(snapshot, copy))}</p>
        </div>
        <div class="diagnostic-result-badge">
          <span class="badge ${badgeClass}">${running ? '<span class="button-spinner" aria-hidden="true"></span>' : ""}${escapeHtml(routeKind === "proxy" ? viewCopy.routeProxy : routeKind === "direct" ? viewCopy.routeDirect : viewCopy.reportUnknown)}</span>
        </div>
      </div>
      <div class="diagnostic-route-map">
        ${renderDiagnosticStep(viewCopy.pipelineInput, firstDiagnosticAddress(snapshot, copy), "is-ok", "globe")}
        ${renderDiagnosticStep(viewCopy.pipelineDns, dnsLabel, probeStatusClass(dnsTool), "dns")}
        ${renderDiagnosticStep(viewCopy.pipelineRule, ruleLabel, probeStatusClass(ruleTool), "filter")}
        ${renderDiagnosticStep(viewCopy.pipelineGroup, groupLabel, probeStatusClass(ruleTool), "group")}
        ${renderDiagnosticStep(viewCopy.pipelineNode, nodeLabel, probeStatusClass(routeTool), "node")}
        ${renderDiagnosticStep(viewCopy.pipelineEgress, egressLabel, probeStatusClass(routeTool), "egress")}
      </div>
      ${renderDiagnosticWhy(snapshot, copy)}
    </div>
  `;
}

function renderDiagnosticStep(label, value, statusClass, iconName) {
  return `
    <div class="diagnostic-step ${statusClass}">
      <div class="diagnostic-step-icon">${diagnosticIcon(iconName)}</div>
      <div class="diagnostic-step-body">
        <div class="diagnostic-step-label">${escapeHtml(label)}</div>
        <div class="diagnostic-step-value">${escapeHtml(value || "")}</div>
      </div>
    </div>
  `;
}

function diagnosticIcon(name) {
  const icons = {
    globe: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16zm0 0c2 2.1 3 4.7 3 8s-1 5.9-3 8m0-16c-2 2.1-3 4.7-3 8s1 5.9 3 8M5 12h14"/></svg>`,
    dns: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 6h14v5H5zM5 14h14v4H5zM8 8h.01M8 16h.01M11 8h5M11 16h5"/></svg>`,
    filter: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5h14l-5 6v6l-4 2v-8z"/></svg>`,
    group: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h6l2 3h6M19 10l-2-2m2 2-2 2M19 16h-6l-2 3H5"/></svg>`,
    node: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h10v6H7zM7 13h10v6H7zM10 8h.01M10 16h.01M13 8h4M13 16h4"/></svg>`,
    egress: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h12M12 8l4 4-4 4M6 5h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6"/></svg>`,
  };
  return icons[name] || icons.globe;
}

function renderDiagnosticWhy(snapshot, copy) {
  const viewCopy = copy.toolsView;
  const routeResult = snapshot.tools.routeProbe.result;
  const ruleResult = snapshot.tools.ruleProbe.result;
  const dnsResult = snapshot.tools.dnsProbe.result;
  const rows = [];
  if (ruleResult?.matchedRuleName) {
    rows.push([viewCopy.rule, `${ruleResult.matchedRuleName}${ruleResult.matchedTarget ? ` -> ${ruleResult.matchedTarget}` : ""}`]);
  }
  if (ruleResult) {
    rows.push([viewCopy.ruleBasis, toolRuleBasisLabel(ruleResult, copy)]);
  }
  if (routeResult) {
    rows.push([viewCopy.basis, toolBasisLabel(routeResult, copy)]);
  }
  if (dnsResult?.resolverName || dnsResult?.upstreamName) {
    rows.push([viewCopy.dnsTitle, [dnsResult.resolverName, dnsResult.upstreamName].filter(Boolean).join(" / ")]);
  }
  if (routeResult?.matchedBaseNames?.length || ruleResult?.matchedBaseNames?.length || dnsResult?.matchedDomainBaseNames?.length) {
    const bases = [
      ...(routeResult?.matchedBaseNames || []),
      ...(ruleResult?.matchedBaseNames || []),
      ...(dnsResult?.matchedDomainBaseNames || []),
    ];
    rows.push([viewCopy.bases, [...new Set(bases)].join(", ")]);
  }
  if (routeResult && toolWarningLabel(routeResult, copy)) {
    rows.push([viewCopy.statusError, toolWarningLabel(routeResult, copy)]);
  }

  if (!rows.length) {
    return `<p class="muted-note">${viewCopy.reportWaiting}</p>`;
  }

  return `
    <div class="diagnostic-why">
      <div class="list-title">${viewCopy.whyTitle}</div>
      ${rows
        .map(
          ([label, value]) => `
            <div class="diagnostic-why-row">
              <span>${escapeHtml(label)}</span>
              <strong>${escapeHtml(value)}</strong>
            </div>
          `,
        )
        .join("")}
    </div>
  `;
}

function renderAdvancedToolDetails(snapshot, copy) {
  const viewCopy = copy.toolsView;
  return `
    <details class="diagnostic-details">
      <summary>
        <span>${escapeHtml(viewCopy.advancedTitle)}</span>
        <small>${escapeHtml(viewCopy.advancedSubtitle)}</small>
      </summary>
      <div data-live-region="tool-diagnostic-details-body">
        ${renderAdvancedToolDetailsBody(snapshot, copy)}
      </div>
    </details>
  `;
}

function renderAdvancedToolDetailsBody(snapshot, copy) {
  const viewCopy = copy.toolsView;
  return `
      <div class="diagnostic-detail-grid">
        <section class="diagnostic-detail-card">
          <h3>${escapeHtml(viewCopy.advancedRoute)}</h3>
          ${renderRouteToolOutput(snapshot, copy, snapshot.tools.routeProbe)}
        </section>
        <section class="diagnostic-detail-card">
          <h3>${escapeHtml(viewCopy.advancedRule)}</h3>
          ${renderRuleToolOutput(snapshot, copy, snapshot.tools.ruleProbe)}
        </section>
        <section class="diagnostic-detail-card">
          <h3>${escapeHtml(viewCopy.advancedDns)}</h3>
          ${renderDnsToolOutput(snapshot, copy, snapshot.tools.dnsProbe)}
        </section>
        <section class="diagnostic-detail-card">
          <h3>${escapeHtml(viewCopy.advancedLatency)}</h3>
          ${renderLatencyToolOutput(snapshot, copy, snapshot.tools.latencyProbe)}
        </section>
      </div>
  `;
}

function renderAutomationRemoteBaseTimers(snapshot, copy, remoteBases, disabled) {
  const viewCopy = copy.rulesView;
  if (!remoteBases.length) {
    return `<p class="muted-note">${copy.settings.noRemoteTimers}</p>`;
  }

  return `
    <div class="list-section">
      <div class="list-title">${copy.settings.remoteBaseTimers}</div>
      <p class="muted-note">${copy.settings.remoteBaseTimersHint}</p>
      <div class="rule-list">
        ${remoteBases
          .map(
            (base) => `
              <div class="stack-card">
                <div class="panel-head">
                  <div>
                    <strong>${escapeHtml(base.name)}</strong>
                    <p class="muted-note">${viewCopy.baseLastSync}: ${formatRelative(base.lastSyncAt, snapshot.settings.language)}</p>
                  </div>
                  <span class="badge ${base.enabled ? "badge-good" : "badge-muted"}">${escapeHtml(viewCopy.kindOptions[base.kind] || base.kind)}</span>
                </div>
                <label class="switch-row ${disabled ? "is-disabled" : ""}">
                  <span>${viewCopy.baseAutoUpdate}</span>
                  <input type="checkbox" data-automation-base-auto-update data-base-id="${escapeHtml(base.id)}" ${base.autoUpdate ? "checked" : ""} ${disabledAttribute(disabled)} />
                </label>
                ${renderRangeSlider({
                  label: `${base.name} · ${viewCopy.baseInterval}`,
                  value: base.updateEveryHours,
                  min: 0,
                  max: 24,
                  step: 1,
                  currentLabel: formatHoursLabel(base.updateEveryHours, snapshot.settings.language),
                  minLabel: formatHoursLabel(0, snapshot.settings.language),
                  maxLabel: formatHoursLabel(24, snapshot.settings.language),
                  dataAttr: `data-base-interval-range data-base-id="${escapeHtml(base.id)}"`,
                  focusKey: `automation-base-interval-${base.id}`,
                  disabled: disabled || !base.autoUpdate,
                })}
              </div>
            `,
          )
          .join("")}
      </div>
    </div>
  `;
}

function formatReleaseStatusLabel(release, copy) {
  const status = String(release?.lastStatus || "").trim().toLowerCase();
  if (status === "success" || status === "ok") {
    return copy.settings.releaseStateOk;
  }
  if (status === "failure" || status === "error") {
    return copy.settings.releaseStateFailed;
  }
  if (status === "running") {
    return copy.settings.releaseStateRunning;
  }
  return copy.settings.releaseStateIdle;
}

function releaseStatusTone(release) {
  const status = String(release?.lastStatus || "").trim().toLowerCase();
  if (status === "success" || status === "ok") {
    return "badge-good";
  }
  if (status === "failure" || status === "error") {
    return "badge-bad";
  }
  return "badge-muted";
}

function releaseActionMode(release) {
  return release?.updateAvailable ? "apply" : "check";
}

function releaseActionLabel(release, copy) {
  return releaseActionMode(release) === "apply" ? copy.settings.releaseUpdateNow : copy.settings.releaseCheckNow;
}

function renderReleaseAutomationStatus(snapshot, copy) {
  const release = snapshot.automation?.release && typeof snapshot.automation.release === "object" ? snapshot.automation.release : {};
  const statusTone = releaseStatusTone(release);
  const actionMode = releaseActionMode(release);
  const busy = Boolean(snapshot.actions.checkMissionControlUpdates || snapshot.actions.applyMissionControlUpdate);
  const changelog = String(release.latestChangelog || "").trim();
  const infoRows = [
    [copy.settings.releaseCurrentUi, release.currentUiVersion || copy.misc.noData],
    [copy.settings.releaseCurrentBridge, release.currentBridgeVersion || copy.misc.noData],
    [copy.settings.releaseLatestUi, release.latestUiVersion || release.latestVersion || copy.misc.noData],
    [copy.settings.releaseLatestBridge, release.latestBridgeVersion || release.latestVersion || copy.misc.noData],
    [copy.settings.releaseLatestTag, release.latestTag || copy.misc.noData],
    [copy.settings.releasePublishedAt, formatRelative(release.latestPublishedAt, snapshot.settings.language)],
    [copy.settings.releaseLastCheckedAt, formatRelative(release.lastCheckedAt, snapshot.settings.language)],
    [copy.settings.releaseLastAppliedAt, formatRelative(release.lastAppliedAt, snapshot.settings.language)],
    [copy.settings.releaseManifestUrl, release.manifestUrl || copy.misc.noData],
  ];

  return `
    <div class="list-section">
      <div class="panel-head">
        <div>
          <div class="list-title">${copy.settings.releaseStatusTitle}</div>
          <p class="muted-note">${copy.settings.releaseStatusHint}</p>
        </div>
        <div class="release-status-actions">
          ${
            release.updateAvailable
              ? `<span class="badge badge-good">${escapeHtml(copy.settings.releaseUpdateAvailable)}</span>`
              : ""
          }
          <span class="badge ${statusTone}">${escapeHtml(formatReleaseStatusLabel(release, copy))}</span>
          <button class="secondary-button" data-release-action="${actionMode}" ${busy ? 'disabled aria-busy="true"' : ""}>
            ${busy ? '<span class="button-spinner" aria-hidden="true"></span>' : ""}
            <span>${escapeHtml(releaseActionLabel(release, copy))}</span>
          </button>
        </div>
      </div>
      <p class="muted-note">${escapeHtml(copy.settings.releaseManualHint)}</p>
      <div class="info-list">
        ${infoRows
          .map(
            ([label, value]) => `
              <div class="info-row">
                <span>${escapeHtml(label)}</span>
                <strong>${escapeHtml(String(value || copy.misc.noData))}</strong>
              </div>
            `,
          )
          .join("")}
      </div>
      ${
        release.latestReleaseUrl
          ? `<p class="muted-note">${escapeHtml(copy.settings.releaseReleaseUrl)}: <a href="${escapeHtml(release.latestReleaseUrl)}" target="_blank" rel="noreferrer">${escapeHtml(release.latestReleaseUrl)}</a></p>`
          : ""
      }
      <div class="release-changelog-block">
        <div class="list-title">${escapeHtml(copy.settings.releaseChangelog)}</div>
        <pre class="release-changelog">${escapeHtml(changelog || copy.settings.releaseNoChangelog)}</pre>
      </div>
      ${
        release.lastError
          ? `<p class="muted-note">${escapeHtml(copy.settings.releaseLastError)}: ${escapeHtml(release.lastError)}</p>`
          : ""
      }
    </div>
  `;
}

function renderRouteToolOutput(snapshot, copy, routeTool) {
  const viewCopy = copy.toolsView;
  const routeResult = routeTool.result;
  return `
    ${renderToolStatus(routeTool, copy, snapshot.settings.language)}
    ${
      routeResult
        ? `
          <div class="tool-result-card">
            <div class="select-card-top">
              <strong>${escapeHtml(routeResult.address)}</strong>
              <div class="tool-badge-row">
                <span class="badge ${routeResult.routeKind === "proxy" ? "badge-good" : "badge-muted"}">${routeResult.routeKind === "proxy" ? viewCopy.routeProxy : viewCopy.routeDirect}</span>
                <span class="badge ${routeResult.nodeMatched ? "badge-good" : "badge-bad"}">${routeResult.nodeMatched ? viewCopy.nodeFound : viewCopy.nodeMissing}</span>
              </div>
            </div>
            <div class="summary-grid">
              <div class="summary-box">
                <div class="summary-box-label">${viewCopy.ip}</div>
                <div class="summary-box-value">${escapeHtml(routeResult.exitIp || copy.misc.noData)}</div>
              </div>
              <div class="summary-box">
                <div class="summary-box-label">${viewCopy.country}</div>
                <div class="summary-box-value">${escapeHtml(routeResult.exitCountry ? countryName(routeResult.exitCountry, snapshot.settings.language) : copy.misc.noData)}</div>
              </div>
              <div class="summary-box">
                <div class="summary-box-label">${viewCopy.provider}</div>
                <div class="summary-box-value">${escapeHtml(routeResult.exitProvider || copy.misc.noData)}</div>
              </div>
              <div class="summary-box">
                <div class="summary-box-label">${viewCopy.lastCheck}</div>
                <div class="summary-box-value">${formatRelative(snapshot.tools.routeProbe.lastCheckedAt, snapshot.settings.language)}</div>
              </div>
            </div>
            <div class="tool-meta-grid">
              <div class="tool-meta-card">
                <div class="tool-meta-label">${viewCopy.node}</div>
                <div class="tool-meta-value">${escapeHtml(routeResult.nodeLabel || copy.misc.noData)}</div>
              </div>
              <div class="tool-meta-card">
                <div class="tool-meta-label">${viewCopy.subscription}</div>
                <div class="tool-meta-value">${escapeHtml(routeResult.subscriptionName || copy.misc.noData)}</div>
              </div>
              <div class="tool-meta-card">
                <div class="tool-meta-label">${viewCopy.rule}</div>
                <div class="tool-meta-value">${escapeHtml(routeResult.matchedRuleName || copy.misc.noData)}</div>
              </div>
              <div class="tool-meta-card">
                <div class="tool-meta-label">${viewCopy.basis}</div>
                <div class="tool-meta-value">${escapeHtml(toolBasisLabel(routeResult, copy))}</div>
              </div>
            </div>
            <div class="list-section">
              <div class="list-title">${viewCopy.bases}</div>
              ${
                routeResult.matchedBaseNames?.length
                  ? `<div class="tag-cloud">${routeResult.matchedBaseNames.map((item) => `<span class="tag">${escapeHtml(item)}</span>`).join("")}</div>`
                  : `<div class="muted-note">${copy.misc.noData}</div>`
              }
            </div>
            ${
              toolWarningLabel(routeResult, copy)
                ? `<div class="tool-callout is-warning">${escapeHtml(toolWarningLabel(routeResult, copy))}</div>`
                : `<div class="tool-callout is-good">${routeResult.nodeMatched ? escapeHtml(`${routeResult.nodeLabel} / ${routeResult.subscriptionName || copy.misc.noData}`) : escapeHtml(viewCopy.routeDirect)}</div>`
            }
          </div>
        `
        : `<p class="muted-note">${viewCopy.routeEmpty}</p>`
    }
  `;
}

function renderRuleToolOutput(snapshot, copy, ruleTool) {
  const viewCopy = copy.toolsView;
  const ruleResult = ruleTool.result;
  return `
    ${renderToolStatus(ruleTool, copy, snapshot.settings.language)}
    ${
      ruleResult
        ? `
          <div class="tool-result-card">
            <div class="select-card-top">
              <strong>${escapeHtml(ruleResult.address)}</strong>
              <div class="tool-badge-row">
                <span class="badge ${ruleResult.matchedAction === "PROXY" ? "badge-good" : "badge-muted"}">${escapeHtml(ruleResult.matchedAction || copy.misc.noData)}</span>
                <span class="badge ${ruleResult.finalRouteKind === "proxy" ? "badge-good" : "badge-muted"}">${ruleResult.finalRouteKind === "proxy" ? viewCopy.routeProxy : viewCopy.routeDirect}</span>
              </div>
            </div>
            <div class="summary-grid">
              <div class="summary-box">
                <div class="summary-box-label">${viewCopy.matchedRule}</div>
                <div class="summary-box-value">${escapeHtml(ruleResult.matchedRuleName || copy.misc.noData)}</div>
              </div>
              <div class="summary-box">
                <div class="summary-box-label">${viewCopy.priority}</div>
                <div class="summary-box-value">${escapeHtml(ruleResult.matchedRulePriority || copy.misc.noData)}</div>
              </div>
              <div class="summary-box">
                <div class="summary-box-label">${viewCopy.target}</div>
                <div class="summary-box-value">${escapeHtml(ruleResult.matchedTarget || copy.misc.noData)}</div>
              </div>
              <div class="summary-box">
                <div class="summary-box-label">${viewCopy.finalRoute}</div>
                <div class="summary-box-value">${ruleResult.finalRouteKind === "proxy" ? viewCopy.routeProxy : viewCopy.routeDirect}</div>
              </div>
            </div>
            <div class="tool-meta-grid">
              <div class="tool-meta-card">
                <div class="tool-meta-label">${viewCopy.ruleBasis}</div>
                <div class="tool-meta-value">${escapeHtml(toolRuleBasisLabel(ruleResult, copy))}</div>
              </div>
              <div class="tool-meta-card">
                <div class="tool-meta-label">${viewCopy.country}</div>
                <div class="tool-meta-value">${escapeHtml(ruleResult.finalExitCountry ? countryName(ruleResult.finalExitCountry, snapshot.settings.language) : copy.misc.noData)}</div>
              </div>
              <div class="tool-meta-card">
                <div class="tool-meta-label">${viewCopy.ip}</div>
                <div class="tool-meta-value">${escapeHtml(ruleResult.finalExitIp || copy.misc.noData)}</div>
              </div>
              <div class="tool-meta-card">
                <div class="tool-meta-label">${viewCopy.lastCheck}</div>
                <div class="tool-meta-value">${formatRelative(snapshot.tools.ruleProbe.lastCheckedAt, snapshot.settings.language)}</div>
              </div>
            </div>
            <div class="list-section">
              <div class="list-title">${viewCopy.bases}</div>
              ${
                ruleResult.matchedBaseNames?.length
                  ? `<div class="tag-cloud">${ruleResult.matchedBaseNames.map((item) => `<span class="tag">${escapeHtml(item)}</span>`).join("")}</div>`
                  : `<div class="muted-note">${copy.misc.noData}</div>`
              }
            </div>
          </div>
        `
        : `<p class="muted-note">${viewCopy.ruleEmpty}</p>`
    }
  `;
}

function renderDnsToolOutput(snapshot, copy, dnsTool) {
  const viewCopy = copy.toolsView;
  const dnsResult = dnsTool.result;
  return `
    ${renderToolStatus(dnsTool, copy, snapshot.settings.language)}
    ${
      dnsResult
        ? `
          <div class="tool-result-card">
            <div class="select-card-top">
              <strong>${escapeHtml(dnsResult.address)}</strong>
              <div class="tool-badge-row">
                <span class="badge ${dnsResult.routeKind === "proxy" ? "badge-good" : "badge-muted"}">${dnsResult.routeKind === "proxy" ? viewCopy.routeProxy : viewCopy.routeDirect}</span>
                <span class="badge ${dnsResult.status === "ok" ? "badge-good" : "badge-muted"}">${dnsResult.status === "ok" ? viewCopy.dnsResolved : viewCopy.dnsLiteralIp}</span>
              </div>
            </div>
            ${
              dnsResult.status === "ip-literal"
                ? `<div class="tool-callout is-warning">${viewCopy.dnsIpLiteral}</div>`
                : `
                  <div class="summary-grid">
                    <div class="summary-box">
                      <div class="summary-box-label">${viewCopy.resolver}</div>
                      <div class="summary-box-value">${escapeHtml(dnsResult.resolverName || copy.misc.noData)}</div>
                    </div>
                    <div class="summary-box">
                      <div class="summary-box-label">${viewCopy.resolverEndpoint}</div>
                      <div class="summary-box-value">${escapeHtml(dnsResult.resolverEndpoint || copy.misc.noData)}</div>
                    </div>
                    <div class="summary-box">
                      <div class="summary-box-label">${viewCopy.upstream}</div>
                      <div class="summary-box-value">${escapeHtml(dnsResult.upstreamName || copy.misc.noData)}</div>
                    </div>
                    <div class="summary-box">
                      <div class="summary-box-label">${viewCopy.rule}</div>
                      <div class="summary-box-value">${escapeHtml(dnsResult.matchedRuleName || copy.misc.noData)}</div>
                    </div>
                  </div>
                  <div class="list-section">
                    <div class="list-title">${viewCopy.domainBases}</div>
                    ${
                      dnsResult.matchedDomainBaseNames?.length
                        ? `<div class="tag-cloud">${dnsResult.matchedDomainBaseNames.map((item) => `<span class="tag">${escapeHtml(item)}</span>`).join("")}</div>`
                        : `<div class="muted-note">${copy.misc.noData}</div>`
                    }
                  </div>
                  <div class="table-shell">
                    <table class="connections-table">
                      <thead>
                        <tr>
                          <th>${viewCopy.dnsColumns.type}</th>
                          <th>${viewCopy.dnsColumns.value}</th>
                          <th>${viewCopy.dnsColumns.classification}</th>
                          <th>${viewCopy.dnsColumns.bases}</th>
                          <th>${viewCopy.dnsColumns.rule}</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${dnsResult.records
                          .map(
                            (record) => `
                              <tr>
                                <td>${escapeHtml(record.family)}</td>
                                <td><div class="cell-title">${escapeHtml(record.value)}</div></td>
                                <td><span class="badge ${record.classification === "proxy" ? "badge-good" : record.classification === "direct" ? "badge-muted" : "badge-bad"}">${escapeHtml(toolClassificationLabel(record.classification, copy))}</span></td>
                                <td>${record.matchedBaseNames?.length ? `<div class="tag-cloud">${record.matchedBaseNames.map((item) => `<span class="tag">${escapeHtml(item)}</span>`).join("")}</div>` : `<span class="muted-note">${copy.misc.noData}</span>`}</td>
                                <td>${escapeHtml(record.matchedRuleName || copy.misc.noData)}</td>
                              </tr>
                            `,
                          )
                          .join("")}
                      </tbody>
                    </table>
                  </div>
                `
            }
          </div>
        `
        : `<p class="muted-note">${viewCopy.dnsEmpty}</p>`
    }
  `;
}

function renderLatencyToolOutput(snapshot, copy, latencyTool) {
  const viewCopy = copy.toolsView;
  const latencyResults = latencyTool.results || [];
  return `
    ${renderToolStatus(latencyTool, copy, snapshot.settings.language)}
    ${
      latencyResults.length
        ? `
          <div class="table-shell">
            <table class="connections-table">
              <thead>
                <tr>
                  <th>${viewCopy.latencyColumns.address}</th>
                  <th>${viewCopy.latencyColumns.route}</th>
                  <th>${viewCopy.latencyColumns.icmp}</th>
                  <th>${viewCopy.latencyColumns.tcp}</th>
                  <th>${viewCopy.latencyColumns.tls}</th>
                  <th>${viewCopy.latencyColumns.jitter}</th>
                  <th>${viewCopy.latencyColumns.loss}</th>
                  <th>${viewCopy.latencyColumns.provider}</th>
                </tr>
              </thead>
              <tbody>
                ${latencyResults
                  .map(
                    (item) => `
                      <tr>
                        <td>
                          <div class="cell-title">${escapeHtml(item.address || item.input || copy.misc.noData)}</div>
                          <div class="cell-subtitle">${escapeHtml(item.addressKind)}</div>
                        </td>
                        <td><span class="badge ${item.routeKind === "proxy" ? "badge-good" : item.routeKind === "direct" ? "badge-muted" : "badge-bad"}">${item.routeKind === "proxy" ? viewCopy.routeProxy : item.routeKind === "direct" ? viewCopy.routeDirect : viewCopy.latencyInvalid}</span></td>
                        <td>${item.status === "invalid" ? viewCopy.latencyInvalid : escapeHtml(formatLatencyMetric(item.icmpMs, copy))}</td>
                        <td>${item.status === "invalid" ? viewCopy.latencyInvalid : escapeHtml(formatLatencyMetric(item.tcpMs, copy))}</td>
                        <td>${item.status === "invalid" ? viewCopy.latencyInvalid : escapeHtml(formatLatencyMetric(item.tlsMs, copy))}</td>
                        <td>${item.status === "invalid" ? viewCopy.latencyInvalid : escapeHtml(formatLatencyMetric(item.jitterMs, copy))}</td>
                        <td>${item.status === "invalid" ? viewCopy.latencyInvalid : escapeHtml(formatPacketLoss(item.packetLoss, copy))}</td>
                        <td>${escapeHtml(item.exitProvider || copy.misc.noData)}</td>
                      </tr>
                    `,
                  )
                  .join("")}
              </tbody>
            </table>
          </div>
        `
        : `<p class="muted-note">${viewCopy.latencyEmpty}</p>`
    }
  `;
}

function renderSettings(snapshot, copy) {
  const languageOptions = Object.entries(copy.settings.languageOptions).map(([value, label]) => ({ value, label }));
  const speedUnitOptions = Object.entries(copy.settings.speedUnitOptions).map(([value, label]) => ({ value, label }));
  const storageUnitOptions = Object.entries(copy.settings.storageUnitOptions).map(([value, label]) => ({ value, label }));
  const controller = snapshot.controller || {};
  const automation = snapshot.automation && typeof snapshot.automation === "object" ? snapshot.automation : {};
  const release = automation.release && typeof automation.release === "object" ? automation.release : {};
  const automationEnabled = automation.enabled !== false;
  const subscriptionRefreshMinutes = Math.max(0, Math.round(Number(automation.subscriptionRefreshMinutes) || 360));
  const logCleanupMinutes = Math.max(0, Math.round(Number(automation.logCleanupMinutes) || 5));
  const releaseCheckMinutes = Math.max(0, Math.round(Number(release.checkMinutes) || 360));
  const pollIntervalMs = Math.max(1000, Math.round(Number(controller.pollIntervalMs) || 2000));
  const remoteBases = snapshot.ruleEngine.bases.filter((base) => base.isRemote);
  const mihomoMemoryLimitMaxMiB = Math.max(128, Math.round(Number(snapshot.settings.mihomoMemoryLimitMaxMiB) || 512));
  const mihomoMemoryLimitMiB = Math.max(
    0,
    Math.min(mihomoMemoryLimitMaxMiB, Math.round(Number(snapshot.settings.mihomoMemoryLimitMiB) || 0)),
  );

  return `
    <section class="content-grid content-grid-settings">
      <article class="panel">
        <div class="panel-head">
          <div>
            <div class="eyebrow">${copy.sections.appearance}</div>
            <h2>${copy.sections.appearanceTitle}</h2>
          </div>
        </div>
        <label class="field">
          <span>${copy.settings.theme}</span>
          <div class="theme-switcher theme-switcher-settings">
            ${themeKeys
              .map(
                (theme) => `
                  <button class="theme-dot ${snapshot.settings.theme === theme ? "is-active" : ""}" data-theme="${escapeHtml(theme)}" data-theme-dot="${escapeHtml(theme)}" aria-label="${escapeHtml(copy.settings.themeOptions[theme])}">
                    <span></span>
                  </button>
                `,
              )
              .join("")}
          </div>
        </label>
        <div class="field-grid">
          ${renderMenuSelect({
            id: "language",
            label: copy.settings.language,
            selectedLabel: copy.settings.languageOptions[snapshot.settings.language],
            options: languageOptions,
            selectedValue: snapshot.settings.language,
            copy,
          })}
          ${renderRangeSlider({
            label: copy.settings.scale,
            value: snapshot.settings.scale,
            min: 80,
            max: 130,
            step: 5,
            currentLabel: formatScaleLabel(snapshot.settings.scale),
            minLabel: formatScaleLabel(80),
            maxLabel: formatScaleLabel(130),
            dataAttr: 'data-ui-scale',
            focusKey: "ui-scale",
          })}
        </div>
      </article>

      <article class="panel">
        <div class="panel-head">
          <div>
            <div class="eyebrow">${copy.sections.panelBehavior}</div>
            <h2>${copy.sections.panelBehaviorTitle}</h2>
          </div>
        </div>
        <label class="switch-row">
          <span>${copy.settings.autoRefresh}</span>
          <input type="checkbox" data-auto-refresh ${snapshot.settings.autoRefresh ? "checked" : ""} />
        </label>
        <label class="switch-row">
          <span>${copy.settings.animations}</span>
          <input type="checkbox" data-animations ${snapshot.settings.animations ? "checked" : ""} />
        </label>
      </article>

      <article class="panel panel-wide">
        <div class="panel-head">
          <div>
            <div class="eyebrow">${copy.sections.mihomoRuntime}</div>
            <h2>${copy.sections.mihomoRuntimeTitle}</h2>
          </div>
        </div>
        <p class="muted-note">${copy.settings.mihomoMemoryLimitHint}</p>
        <div class="field-grid">
          <div class="field-wide">
            ${renderRangeSlider({
              label: copy.settings.mihomoMemoryLimit,
              value: mihomoMemoryLimitMiB,
              min: 0,
              max: mihomoMemoryLimitMaxMiB,
              step: 8,
              currentLabel: formatMemoryLimitLabel(mihomoMemoryLimitMiB, copy, snapshot.settings.language, snapshot.settings),
              minLabel: copy.settings.memoryLimitDisabled,
              maxLabel: formatMemory(mihomoMemoryLimitMaxMiB, snapshot.settings.language, snapshot.settings),
              dataAttr: `data-mihomo-memory-limit-range data-memory-limit-max="${mihomoMemoryLimitMaxMiB}"`,
              focusKey: "mihomo-memory-limit",
            })}
          </div>
        </div>
      </article>

      <article class="panel panel-wide">
        <div class="panel-head">
          <div>
            <div class="eyebrow">${copy.sections.automation}</div>
            <h2>${copy.sections.automationTitle}</h2>
          </div>
        </div>
        <p class="muted-note">${copy.settings.automationHint}</p>
        <label class="switch-row">
          <span>${copy.settings.automationEnabled}</span>
          <input type="checkbox" data-automation-enabled ${automationEnabled ? "checked" : ""} />
        </label>
        <div class="field-grid">
          <div class="field-wide">
            ${renderRangeSlider({
              label: copy.settings.pollInterval,
              value: pollIntervalMs,
              min: 1000,
              max: 60000,
              step: 500,
              currentLabel: formatPollingIntervalLabel(pollIntervalMs, snapshot.settings.language),
              minLabel: formatPollingIntervalLabel(1000, snapshot.settings.language),
              maxLabel: formatPollingIntervalLabel(60000, snapshot.settings.language),
              dataAttr: 'data-poll-interval-range',
              focusKey: "automation-poll-interval",
            })}
          </div>
          <div class="field-wide">
            ${renderRangeSlider({
              label: copy.autoSelection.interval,
              value: snapshot.routing.autoSelection.intervalMinutes,
              min: 1,
              max: 60,
              step: 1,
              currentLabel: formatMinutesLabel(snapshot.routing.autoSelection.intervalMinutes, snapshot.settings.language),
              minLabel: formatMinutesLabel(1, snapshot.settings.language),
              maxLabel: formatMinutesLabel(60, snapshot.settings.language),
              dataAttr: 'data-auto-interval-range',
              focusKey: "automation-auto-interval",
              disabled: !automationEnabled,
            })}
          </div>
          <div class="field-wide">
            ${renderRangeSlider({
              label: copy.settings.subscriptionRefreshMinutes,
              value: subscriptionRefreshMinutes,
              min: 0,
              max: 1440,
              step: 5,
              currentLabel: formatAutomationMinutesLabel(subscriptionRefreshMinutes, snapshot.settings.language),
              minLabel: copy.settings.manualIntervalHint,
              maxLabel: formatHoursLabel(24, snapshot.settings.language),
              dataAttr: 'data-automation-subscription-refresh-range',
              focusKey: "automation-subscription-refresh",
              disabled: !automationEnabled,
            })}
          </div>
          <div class="field-wide">
            ${renderRangeSlider({
              label: copy.settings.logCleanupMinutes,
              value: logCleanupMinutes,
              min: 0,
              max: 1440,
              step: 5,
              currentLabel: formatAutomationMinutesLabel(logCleanupMinutes, snapshot.settings.language),
              minLabel: copy.settings.manualIntervalHint,
              maxLabel: formatHoursLabel(24, snapshot.settings.language),
              dataAttr: 'data-automation-log-cleanup-range',
              focusKey: "automation-log-cleanup",
              disabled: !automationEnabled,
            })}
          </div>
          <div class="field-wide">
            ${renderRangeSlider({
              label: copy.settings.releaseCheckMinutes,
              value: releaseCheckMinutes,
              min: 0,
              max: 1440,
              step: 5,
              currentLabel: formatAutomationMinutesLabel(releaseCheckMinutes, snapshot.settings.language),
              minLabel: copy.settings.manualIntervalHint,
              maxLabel: formatHoursLabel(24, snapshot.settings.language),
              dataAttr: 'data-release-check-range',
              focusKey: "automation-release-check",
              disabled: !automationEnabled,
            })}
          </div>
        </div>
        <label class="switch-row ${!automationEnabled ? "is-disabled" : ""}">
          <span>${copy.settings.uiAutoUpdate}</span>
          <input type="checkbox" data-ui-auto-update ${release.uiAutoUpdate !== false ? "checked" : ""} ${disabledAttribute(!automationEnabled)} />
        </label>
        <label class="switch-row ${!automationEnabled ? "is-disabled" : ""}">
          <span>${copy.settings.bridgeAutoUpdate}</span>
          <input type="checkbox" data-bridge-auto-update ${release.bridgeAutoUpdate !== false ? "checked" : ""} ${disabledAttribute(!automationEnabled)} />
        </label>
        ${renderReleaseAutomationStatus(snapshot, copy)}
        ${renderAutomationRemoteBaseTimers(snapshot, copy, remoteBases, !automationEnabled)}
        ${automationEnabled ? "" : `<p class="muted-note">${copy.settings.automationDisabledHint}</p>`}
      </article>

      <article class="panel">
        <div class="panel-head">
          <div>
            <div class="eyebrow">${copy.sections.measurements}</div>
            <h2>${copy.sections.measurementsTitle}</h2>
          </div>
        </div>
        <div class="field-grid">
          <div class="field-wide">
            ${renderRangeSlider({
              label: copy.settings.graphRange,
              value: snapshot.settings.graphRange,
              min: 1,
              max: 60,
              step: 1,
              currentLabel: formatMinutesLabel(snapshot.settings.graphRange, snapshot.settings.language),
              minLabel: formatMinutesLabel(1, snapshot.settings.language),
              maxLabel: formatMinutesLabel(60, snapshot.settings.language),
              dataAttr: 'data-graph-range',
              focusKey: "graph-range",
            })}
          </div>
          <div class="field-wide">
            ${renderRangeSlider({
              label: copy.settings.chartLineWidth,
              value: snapshot.settings.chartLineWidth,
              min: 1,
              max: 8,
              step: 1,
              currentLabel: formatLineWidthLabel(snapshot.settings.chartLineWidth, snapshot.settings.language),
              minLabel: formatLineWidthLabel(1, snapshot.settings.language),
              maxLabel: formatLineWidthLabel(8, snapshot.settings.language),
              dataAttr: 'data-chart-line-width',
              focusKey: "chart-line-width",
            })}
            <div class="line-preview-shell">
              <span class="menu-label">${copy.settings.chartLinePreview}</span>
              <svg viewBox="0 0 220 30" class="line-preview-svg" aria-hidden="true">
                <path class="chart-preview-line" d="M12 20 C 44 11, 78 23, 110 14 S 168 9, 208 14"></path>
              </svg>
            </div>
          </div>
          ${renderMenuSelect({
            id: "speed-unit-mode",
            label: copy.settings.speedUnitMode,
            selectedLabel: copy.settings.speedUnitOptions[snapshot.settings.speedUnitMode],
            options: speedUnitOptions,
            selectedValue: snapshot.settings.speedUnitMode,
            copy,
          })}
          ${renderMenuSelect({
            id: "storage-unit-system",
            label: copy.settings.storageUnitSystem,
            selectedLabel: copy.settings.storageUnitOptions[snapshot.settings.storageUnitSystem],
            options: storageUnitOptions,
            selectedValue: snapshot.settings.storageUnitSystem,
            copy,
          })}
        </div>
      </article>
    </section>
  `;
}

function renderDebug(snapshot, copy) {
  const backendModeOptions = Object.entries(copy.settings.backendModeOptions).map(([value, label]) => ({ value, label }));
  const controller = snapshot.controller || {};
  const controllerManaged = controller.bridgeManaged === true;

  return `
    <section class="content-grid content-grid-settings">
      <article class="panel panel-wide">
        <div class="panel-head">
          <div>
            <div class="eyebrow">${copy.sections.controller}</div>
            <h2>${copy.sections.controllerTitle}</h2>
          </div>
        </div>
        <p class="muted-note">${copy.settings.apiConfigHint}</p>
        <div data-live-region="debug-controller-actions">
          ${renderSettingsControllerActions(snapshot, copy)}
        </div>
        <div class="field-grid">
          ${renderMenuSelect({
            id: "controller-mode",
            label: copy.settings.controllerMode,
            selectedLabel: copy.settings.backendModeOptions[controller.mode || "mock"],
            options: backendModeOptions,
            selectedValue: controller.mode || "mock",
            copy,
          })}
          <label class="field">
            <span>${copy.settings.controllerUrl}</span>
            <input class="input" data-focus-key="controller-base-url" data-controller-input="baseUrl" value="${escapeHtml(controller.baseUrl || "")}" placeholder="http://127.0.0.1:9090" ${controllerManaged ? "readonly" : ""} />
          </label>
          ${
            controllerManaged
              ? `
                <label class="field">
                  <span>${copy.settings.controllerSecret}</span>
                  <input class="input" value="${escapeHtml(copy.settings.managedByBridge)}" readonly />
                </label>
                <label class="field">
                  <span>${copy.settings.selectorGroup}</span>
                  <input class="input" value="${escapeHtml(controller.selectorGroup || "GLOBAL")}" readonly />
                </label>
              `
              : `
                <label class="field field-grow">
                  <span>${copy.settings.controllerSecret}</span>
                  <input class="input" type="password" data-focus-key="controller-secret" data-controller-input="secret" value="${escapeHtml(controller.secret || state.controllerSecretDraft || "")}" placeholder="${escapeHtml(copy.settings.secretPlaceholder)}" autocomplete="off" spellcheck="false" />
                  <small class="muted-note">${copy.settings.secretSaved}</small>
                </label>
                <label class="field">
                  <span>&nbsp;</span>
                  <button class="secondary-button" data-clear-controller-secret type="button">${copy.settings.clearSecret}</button>
                </label>
                <label class="field">
                  <span>${copy.settings.selectorGroup}</span>
                  <input class="input" data-focus-key="controller-selector-group" data-controller-input="selectorGroup" value="${escapeHtml(controller.selectorGroup || "GLOBAL")}" placeholder="GLOBAL" />
                </label>
              `
          }
          <label class="field field-grow">
            <span>${copy.settings.delayUrl}</span>
            <input class="input" data-focus-key="controller-delay-url" data-controller-input="delayUrl" value="${escapeHtml(controller.delayUrl || "")}" placeholder="https://www.gstatic.com/generate_204" />
          </label>
          <label class="field">
            <span>${copy.settings.delayTimeout}</span>
            <input class="input" type="number" min="1000" max="30000" step="500" data-focus-key="controller-delay-timeout" data-controller-input="delayTimeout" value="${escapeHtml(controller.delayTimeout || 5000)}" />
          </label>
        </div>
        <label class="switch-row ${controllerManaged ? "is-disabled" : ""}">
          <span>${copy.settings.useWebSocket}</span>
          <input type="checkbox" data-controller-ws ${controller.useWebSocket ? "checked" : ""} ${controllerManaged ? "disabled" : ""} />
        </label>
      </article>
    </section>
  `;
}

function renderSettingsControllerActions(snapshot, copy) {
  const controller = snapshot.controller || {};
  const controllerIsReal = controller.mode === "real";
  return `
    <div class="section-action-block">
      <div class="panel-actions">
        <button class="secondary-button" data-test-controller ${controllerIsReal ? "" : "disabled"}>${copy.settings.testApi}</button>
        <button class="secondary-button" data-refresh-controller ${controllerIsReal ? "" : "disabled"}>${copy.settings.refreshApi}</button>
        ${renderMaintenanceButton(snapshot, copy, "restartTunnel")}
      </div>
      <p class="muted-note section-action-note">${escapeHtml(copy.maintenanceActions.restartTunnel.subtitle)}</p>
    </div>
  `;
}

function renderView(snapshot, copy) {
  if (state.view === "routing") {
    return renderRouting(snapshot, copy);
  }
  if (state.view === "subscriptions") {
    return renderSubscriptions(snapshot, copy);
  }
  if (state.view === "nodes") {
    return renderNodes(snapshot, copy);
  }
  if (state.view === "rules") {
    return renderRules(snapshot, copy);
  }
  if (state.view === "connections") {
    return renderConnections(snapshot, copy);
  }
  if (state.view === "tools") {
    return renderTools(snapshot, copy);
  }
  if (state.view === "settings") {
    return renderSettings(snapshot, copy);
  }
  if (state.view === "debug") {
    return renderDebug(snapshot, copy);
  }
  return renderOverview(snapshot, copy);
}

function renderToastContent() {
  if (!state.toast) {
    return "";
  }
  return `<div class="toast">${escapeHtml(state.toast)}</div>`;
}

function liveRegionSelector(name) {
  return `[data-live-region="${escapeCssIdentifier(name)}"]`;
}

function patchLiveRegion(name, html) {
  const region = root.querySelector(liveRegionSelector(name));
  if (!(region instanceof HTMLElement)) {
    return false;
  }
  if (region.innerHTML !== html) {
    region.innerHTML = html;
  }
  return true;
}

function applyDocumentState(snapshot) {
  const copy = getCopy(snapshot.settings.language);
  document.body.dataset.theme = snapshot.settings.theme;
  document.body.dataset.density = snapshot.settings.density;
  document.body.dataset.motion = snapshot.settings.animations ? "on" : "off";
  document.documentElement.lang = snapshot.settings.language || "en";
  document.title = copy.title;
  document.documentElement.style.setProperty("--ui-scale", String((snapshot.settings.scale || 100) / 100));
  document.documentElement.style.setProperty("--chart-line-width", String(snapshot.settings.chartLineWidth || 3));

  if (state.activeRangeKey) {
    const activeRange = root.querySelector(`[data-focus-key="${escapeCssIdentifier(state.activeRangeKey)}"]`);
    if (activeRange instanceof HTMLInputElement && isRangeInput(activeRange)) {
      syncActiveRangeUi(activeRange, snapshot);
    }
  }
}

function createShellRenderSignature(snapshot) {
  return JSON.stringify({
    view: state.view,
    language: snapshot.settings.language,
    openMenu: state.openMenu,
  });
}

function createViewStructureSignature(snapshot) {
  const controller = snapshot.controller || {};

  if (state.view === "routing") {
    return JSON.stringify({
      view: state.view,
      language: snapshot.settings.language,
      openMenu: state.openMenu,
      controllerMode: controller.mode || "mock",
      routing: {
        mode: snapshot.routing.mode,
        listMode: snapshot.routing.listMode,
        autoSelection: snapshot.routing.autoSelection,
      },
    });
  }

  if (state.view === "subscriptions") {
    return JSON.stringify({
      view: state.view,
      language: snapshot.settings.language,
      openMenu: state.openMenu,
      controllerMode: controller.mode || "mock",
      blockedCountries: snapshot.subscriptions.egressPolicy.blockedCountries,
      allowUnknown: snapshot.subscriptions.egressPolicy.allowUnknown,
      subscriptionFormat: state.subscriptionDraft.format,
    });
  }

  if (state.view === "rules") {
    return JSON.stringify({
      view: state.view,
      language: snapshot.settings.language,
      controllerMode: controller.mode || "mock",
      selectedBaseId: state.selectedBaseId,
      selectedRuleId: state.selectedRuleId,
      baseDraft: state.baseDraft,
      ruleDraft: state.ruleDraft,
      bases: snapshot.ruleEngine.bases.map((base) => ({
        id: base.id,
        name: base.name,
        scope: base.scope,
        kind: base.kind,
        enabled: base.enabled,
        autoUpdate: base.autoUpdate,
        format: base.format,
        sourceType: base.sourceType,
        isLocal: base.isLocal,
        isRemote: base.isRemote,
        entryCount: base.entryCount,
        lastSyncAt: base.lastSyncAt,
      })),
      rules: snapshot.ruleEngine.rules.map((rule) => ({
        id: rule.id,
        name: rule.name,
        action: rule.action,
        target: rule.target,
        enabled: rule.enabled,
        locked: rule.locked,
        priority: rule.priority,
        baseIds: rule.baseIds,
        activeBaseCount: rule.activeBaseCount,
        itemCount: rule.itemCount,
      })),
    });
  }

  if (state.view === "connections") {
    return JSON.stringify({
      view: state.view,
      language: snapshot.settings.language,
      openMenu: state.openMenu,
      tab: state.connectionFilters.tab,
      scope: state.connectionFilters.scope,
      search: state.connectionFilters.search,
      scopeOptions: snapshot.connections.scopeOptions,
    });
  }

  if (state.view === "settings") {
    return JSON.stringify({
      view: state.view,
      language: snapshot.settings.language,
      openMenu: state.openMenu,
      settings: {
        theme: snapshot.settings.theme,
        density: snapshot.settings.density,
        scale: snapshot.settings.scale,
        autoRefresh: snapshot.settings.autoRefresh,
        animations: snapshot.settings.animations,
        graphRange: snapshot.settings.graphRange,
        chartLineWidth: snapshot.settings.chartLineWidth,
        speedUnitMode: snapshot.settings.speedUnitMode,
        storageUnitSystem: snapshot.settings.storageUnitSystem,
        mihomoMemoryLimitMiB: snapshot.settings.mihomoMemoryLimitMiB,
        mihomoMemoryLimitMaxMiB: snapshot.settings.mihomoMemoryLimitMaxMiB,
      },
      automation: {
        enabled: snapshot.automation?.enabled !== false,
        subscriptionRefreshMinutes: snapshot.automation?.subscriptionRefreshMinutes ?? 360,
        logCleanupMinutes: snapshot.automation?.logCleanupMinutes ?? 5,
        release: {
          checkMinutes: snapshot.automation?.release?.checkMinutes ?? 360,
          uiAutoUpdate: snapshot.automation?.release?.uiAutoUpdate !== false,
          bridgeAutoUpdate: snapshot.automation?.release?.bridgeAutoUpdate !== false,
          currentUiVersion: snapshot.automation?.release?.currentUiVersion ?? "",
          currentBridgeVersion: snapshot.automation?.release?.currentBridgeVersion ?? "",
          latestUiVersion: snapshot.automation?.release?.latestUiVersion ?? "",
          latestBridgeVersion: snapshot.automation?.release?.latestBridgeVersion ?? "",
          lastStatus: snapshot.automation?.release?.lastStatus ?? "",
        },
      },
      autoSelectionIntervalMinutes: snapshot.routing.autoSelection.intervalMinutes,
      remoteBaseAutomation: snapshot.ruleEngine.bases
        .filter((base) => base.isRemote)
        .map((base) => ({
          id: base.id,
          enabled: base.enabled,
          autoUpdate: base.autoUpdate,
          updateEveryHours: base.updateEveryHours,
        })),
    });
  }

  if (state.view === "debug") {
    return JSON.stringify({
      view: state.view,
      language: snapshot.settings.language,
      openMenu: state.openMenu,
      controller: {
        mode: controller.mode || "mock",
        bridgeManaged: controller.bridgeManaged === true,
        baseUrl: controller.baseUrl || "",
        secret: controller.secret || "",
        selectorGroup: controller.selectorGroup || "",
        delayUrl: controller.delayUrl || "",
        delayTimeout: controller.delayTimeout || 0,
        pollIntervalMs: controller.pollIntervalMs || 0,
        useWebSocket: controller.useWebSocket === true,
      },
      controllerSecretDraft: state.controllerSecretDraft,
    });
  }

  return JSON.stringify({
    view: state.view,
    language: snapshot.settings.language,
  });
}

function updateRenderSignatures(snapshot) {
  state.renderedShellSignature = createShellRenderSignature(snapshot);
  state.renderedViewStructureSignature = createViewStructureSignature(snapshot);
}

function patchLiveRegions(regions) {
  for (const [name, html] of regions) {
    if (!patchLiveRegion(name, html)) {
      return false;
    }
  }
  return true;
}

function patchSnapshotRegions(snapshot, copy) {
  if (
    !patchLiveRegions([
      ["header", renderHeaderContent(snapshot, copy)],
      ["sidebar-profile", renderSidebarProfileContent(snapshot, copy)],
      ["sidebar-maintenance", renderSidebarMaintenanceContent(snapshot, copy)],
      ["toast", renderToastContent()],
    ])
  ) {
    return false;
  }

  if (state.view === "routing") {
    return patchLiveRegions([
      ["routing-auto-summary", renderRoutingAutoSummary(snapshot, copy)],
      ["routing-lists", renderRoutingLists(snapshot, copy)],
    ]);
  }

  if (state.view === "subscriptions") {
    return patchLiveRegions([
      ["subscriptions-management", renderSubscriptionManagementContent(snapshot, copy, { disabled: isRealController(snapshot) })],
      ["subscriptions-policy", `${renderCountryPicker(snapshot, copy, isRealController(snapshot))}
          <label class="switch-row switch-row-alone ${isRealController(snapshot) ? "is-disabled" : ""}">
            <span>${copy.egressPolicy.allowUnknown}</span>
            <input type="checkbox" data-allow-unknown ${snapshot.subscriptions.egressPolicy.allowUnknown ? "checked" : ""} ${disabledAttribute(isRealController(snapshot))} />
          </label>`],
      ["subscriptions-report", renderSubscriptionsReport(snapshot, copy)],
    ]);
  }

  if (state.view === "nodes") {
    return patchLiveRegions([
      ["nodes-summary", renderNodesSummaryContent(snapshot, copy)],
      ["nodes-eligible-list", renderEligibleNodesContent(snapshot, copy)],
      ["nodes-rejected-list", renderRejectedNodesContent(snapshot, copy)],
    ]);
  }

  if (state.view === "connections") {
    const filteredConnections = getFilteredConnections(snapshot);
    return patchLiveRegions([
      ["connections-actions", renderConnectionsActions(snapshot, copy, filteredConnections)],
      ["connections-stats", renderConnectionsStats(snapshot, copy, filteredConnections)],
      ["connections-tabs", renderConnectionsTabs(snapshot, copy)],
      ["connections-table", renderConnectionsTable(snapshot, copy, filteredConnections)],
    ]);
  }

  if (state.view === "rules") {
    return patchLiveRegions([["rules-maintenance", renderRulesMaintenanceAction(snapshot, copy)]]);
  }

  if (state.view === "tools") {
    return patchLiveRegions([
      ["tool-diagnostic-actions", renderDiagnosticActions(snapshot, copy)],
      ["tool-diagnostic-report", renderDiagnosticReport(snapshot, copy)],
      ["tool-diagnostic-details-body", renderAdvancedToolDetailsBody(snapshot, copy)],
    ]);
  }

  if (state.view === "overview") {
    const regions = [
      ["top-stats", renderTopStatsContent(snapshot, copy)],
      ["overview-traffic", renderOverviewTrafficContent(snapshot, copy)],
      ["overview-route", renderOverviewRouteContent(snapshot, copy)],
      ["overview-latency", renderOverviewLatencyContent(snapshot, copy)],
      ["overview-events", renderOverviewEventsContent(snapshot, copy)],
    ];

    if (state.activeRangeKey === "overview-graph-range") {
      return patchLiveRegions(regions.filter(([name]) => name !== "overview-traffic"));
    }

    return patchLiveRegions(regions);
  }

  if (state.view === "settings") {
    return true;
  }

  if (state.view === "debug") {
    return patchLiveRegions([["debug-controller-actions", renderSettingsControllerActions(snapshot, copy)]]);
  }

  return true;
}

function renderSnapshotUpdate() {
  if (!state.snapshot) {
    return;
  }

  const snapshot = state.snapshot;
  const copy = getCopy(snapshot.settings.language);
  const focusState = captureFocusState();
  const scrollState = captureScrollState();
  applyDocumentState(snapshot);
  const structureChanged = state.renderedViewStructureSignature !== createViewStructureSignature(snapshot);

  if (
    state.openMenu ||
    !root.querySelector(".shell") ||
    state.renderedShellSignature !== createShellRenderSignature(snapshot)
  ) {
    render();
    return;
  }

  if (structureChanged && !state.activeRangeKey) {
    render();
    return;
  }

  if (!patchSnapshotRegions(snapshot, copy)) {
    render();
    return;
  }

  syncRenderedListEditors();
  restoreFocusState(focusState, scrollState);

  if (structureChanged) {
    return;
  }

  updateRenderSignatures(snapshot);
}

function supportsTextSelection(element) {
  if (element instanceof HTMLTextAreaElement) {
    return true;
  }
  if (!(element instanceof HTMLInputElement)) {
    return false;
  }
  return ["text", "search", "url", "tel", "password"].includes(element.type);
}

function captureFocusState() {
  const active = document.activeElement;
  if (!(active instanceof HTMLInputElement) && !(active instanceof HTMLTextAreaElement)) {
    return null;
  }
  const key = active.getAttribute("data-focus-key");
  if (!key) {
    return null;
  }
  const supportsSelection = supportsTextSelection(active);
  return {
    key,
    start: supportsSelection ? active.selectionStart : null,
    end: supportsSelection ? active.selectionEnd : null,
    scrollTop: active instanceof HTMLTextAreaElement ? active.scrollTop : null,
    scrollLeft: active instanceof HTMLTextAreaElement ? active.scrollLeft : null,
  };
}

function captureScrollState() {
  return {
    x: window.scrollX,
    y: window.scrollY,
  };
}

function restoreFocusState(focusState, scrollState) {
  if (!focusState) {
    return;
  }
  const next = root.querySelector(`[data-focus-key="${escapeCssIdentifier(focusState.key)}"]`);
  if (!(next instanceof HTMLInputElement) && !(next instanceof HTMLTextAreaElement)) {
    return;
  }
  try {
    next.focus({ preventScroll: true });
  } catch {
    next.focus();
  }
  if (
    supportsTextSelection(next) &&
    typeof focusState.start === "number" &&
    typeof focusState.end === "number"
  ) {
    next.setSelectionRange(focusState.start, focusState.end);
  }
  if (
    next instanceof HTMLTextAreaElement &&
    typeof focusState.scrollTop === "number" &&
    typeof focusState.scrollLeft === "number"
  ) {
    next.scrollTop = focusState.scrollTop;
    next.scrollLeft = focusState.scrollLeft;
    syncListEditorOverlayScroll(next);
  }
  if (scrollState) {
    window.scrollTo(scrollState.x, scrollState.y);
  }
}

function render() {
  if (!state.snapshot) {
    return;
  }

  const snapshot = state.snapshot;
  const copy = getCopy(snapshot.settings.language);
  applyDocumentState(snapshot);

  const focusState = captureFocusState();
  const scrollState = captureScrollState();

  root.innerHTML = `
    <div class="shell">
      <div class="bg-orb bg-orb-a"></div>
      <div class="bg-orb bg-orb-b"></div>
      ${renderSidebar(snapshot, copy)}
      <main class="main">
        ${renderHeader(snapshot, copy)}
        ${renderView(snapshot, copy)}
      </main>
      <div data-live-region="toast">${renderToastContent()}</div>
    </div>
  `;

  updateRenderSignatures(snapshot);
  syncRenderedListEditors();
  restoreFocusState(focusState, scrollState);
}

function flashToast(text) {
  state.toast = text;
  renderSnapshotUpdate();
  window.clearTimeout(flashToast.timeoutId);
  flashToast.timeoutId = window.setTimeout(() => {
    state.toast = "";
    renderSnapshotUpdate();
  }, 1800);
}

function handleMenuOption(menuId, value) {
  if (!state.snapshot) {
    return;
  }
  const copy = getCopy(state.snapshot.settings.language);

  if (menuId === "theme") {
    backend.setTheme(value);
    flashToast(copy.misc.toastTheme(copy.settings.themeOptions[value] || value));
  } else if (menuId === "language") {
    const nextCopy = getCopy(value);
    backend.setLanguage(value);
    flashToast(nextCopy.misc.toastLanguage(nextCopy.settings.languageOptions[value] || value));
  } else if (menuId === "density") {
    backend.setDensity(value);
    flashToast(copy.misc.toastUpdated);
  } else if (menuId === "graph-range") {
    backend.setGraphRange(value);
    flashToast(copy.misc.toastUpdated);
  } else if (menuId === "speed-unit-mode") {
    backend.setSpeedUnitMode(value);
    flashToast(copy.misc.toastUpdated);
  } else if (menuId === "storage-unit-system") {
    backend.setStorageUnitSystem(value);
    flashToast(copy.misc.toastUpdated);
  } else if (menuId === "controller-mode") {
    backend.setControllerMode(value);
    flashToast(copy.misc.toastUpdated);
  } else if (menuId === "manual-server") {
    backend.setManualServer(value);
    backend.setTunnelPreference("manual");
    flashToast(copy.misc.toastManualServer(value));
  } else if (menuId === "auto-metric") {
    backend.updateAutoSelection({ metric: value });
    flashToast(copy.misc.toastUpdated);
  } else if (menuId === "auto-tolerance") {
    backend.updateAutoSelection({ switchTolerance: Number(value) });
    flashToast(copy.misc.toastUpdated);
  } else if (menuId === "subscription-format") {
    state.subscriptionDraft.format = value;
    renderSnapshotUpdate();
  } else if (menuId.startsWith("subscription-edit-format:")) {
    const subscriptionId = menuId.slice("subscription-edit-format:".length);
    if (state.subscriptionEdits[subscriptionId]) {
      state.subscriptionEdits[subscriptionId].format = value;
      renderSnapshotUpdate();
    }
  } else if (menuId === "connections-scope") {
    state.connectionFilters.scope = value;
    render();
  } else if (menuId === "base-kind") {
    backend.updateBase(state.selectedBaseId, { kind: value });
    flashToast(copy.misc.toastUpdated);
  } else if (menuId === "base-scope") {
    backend.updateBase(state.selectedBaseId, { scope: value });
    flashToast(copy.misc.toastUpdated);
  } else if (menuId === "base-format") {
    backend.updateBase(state.selectedBaseId, { format: value });
    flashToast(copy.misc.toastUpdated);
  } else if (menuId === "rule-action") {
    backend.updateRule(state.selectedRuleId, { action: value });
    flashToast(copy.misc.toastUpdated);
  } else if (menuId === "rule-target") {
    backend.updateRule(state.selectedRuleId, { target: value });
    flashToast(copy.misc.toastUpdated);
  } else if (menuId === "draft-base-kind") {
    state.baseDraft.kind = value;
    flashToast(copy.misc.toastUpdated);
  } else if (menuId === "draft-base-scope") {
    state.baseDraft.scope = value;
    flashToast(copy.misc.toastUpdated);
  } else if (menuId === "draft-base-source-type") {
    state.baseDraft.sourceType = value;
    flashToast(copy.misc.toastUpdated);
  } else if (menuId === "draft-rule-action") {
    state.ruleDraft.action = value;
    flashToast(copy.misc.toastUpdated);
  } else if (menuId === "draft-rule-target") {
    state.ruleDraft.target = value;
    flashToast(copy.misc.toastUpdated);
  }

  state.openMenu = null;
}

root.addEventListener("click", async (event) => {
  const target = event.target.closest(
    "[data-view], [data-theme-dot], [data-mode], [data-target], [data-action], [data-release-action], [data-manual-server], [data-menu-trigger], [data-menu-option], [data-country-toggle], [data-add-subscription], [data-save-subscription], [data-cancel-subscription], [data-remove-subscription], [data-select-base], [data-select-rule], [data-sync-base], [data-remove-base], [data-remove-rule], [data-add-base], [data-add-rule], [data-list-editor-nav], [data-list-editor-apply], [data-list-editor-cancel], [data-close-connection], [data-close-visible-connections], [data-clear-closed-connections], [data-toggle-connections-pause], [data-connections-tab], [data-run-diagnostic], [data-run-route-probe], [data-run-rule-probe], [data-run-dns-probe], [data-run-latency-probe], [data-test-controller], [data-refresh-controller], [data-clear-controller-secret]",
  );

  if (!target || !state.snapshot) {
    return;
  }

  const copy = getCopy(state.snapshot.settings.language);
  const listEditorId = target.closest("[data-list-editor]")?.getAttribute("data-list-editor") || "";
  const actionTitle = (action) => copy.maintenanceActions[action]?.title || action;
  const formatActionError = (title, error) => {
    const message = error?.message || String(error || "Failed.");
    return `${title}: ${message}`;
  };


  if (target.dataset.clearControllerSecret !== undefined) {
    state.controllerSecretDraft = "";
    backend.updateControllerConfig({ secret: "" });
    flashToast(copy.misc.toastUpdated);
    return;
  }

  if (target.dataset.testController !== undefined) {
    backend.testController?.();
    flashToast(copy.misc.toastMeasured);
    return;
  }

  if (target.dataset.refreshController !== undefined) {
    backend.refreshNow?.();
    flashToast(copy.misc.toastUpdated);
    return;
  }

  if (target.dataset.view) {
    state.view = target.dataset.view;
    state.openMenu = null;
    render();
    return;
  }

  if (target.dataset.themeDot) {
    backend.setTheme(target.dataset.themeDot);
    flashToast(copy.misc.toastTheme(copy.settings.themeOptions[target.dataset.themeDot] || target.dataset.themeDot));
    return;
  }

  if (target.dataset.mode) {
    backend.setRoutingMode(target.dataset.mode);
    flashToast(copy.misc.toastMode(copy.modes[target.dataset.mode] || target.dataset.mode));
    return;
  }

  if (target.dataset.target) {
    backend.setTunnelPreference(target.dataset.target);
    flashToast(copy.misc.toastTarget(copy.targets[target.dataset.target] || target.dataset.target));
    return;
  }

  if (target.dataset.releaseAction) {
    const release = state.snapshot.automation?.release || {};
    const label = releaseActionLabel(release, copy);
    try {
      if (target.dataset.releaseAction === "apply") {
        await backend.applyMissionControlUpdate();
      } else {
        await backend.checkMissionControlUpdates();
      }
      flashToast(label);
    } catch (error) {
      flashToast(formatActionError(label, error));
    }
    return;
  }

  if (target.dataset.action) {
    if (target.dataset.action === "refreshSubscriptions") {
      try {
        const started = await backend.triggerAction(target.dataset.action);
        if (started !== false) {
          flashToast(state.snapshot.settings.language === "ru" ? "Подписки обновлены." : "Subscriptions refreshed.");
        }
      } catch (error) {
        flashToast(formatActionError(actionTitle(target.dataset.action), error));
      }
      return;
    }
    if (target.dataset.action === "reprocessSubscriptions") {
      try {
        const started = await backend.triggerAction(target.dataset.action);
        if (started !== false) {
          flashToast(state.snapshot.settings.language === "ru" ? "Проверка EGRESS завершена." : "EGRESS policy reapplied.");
        }
      } catch (error) {
        flashToast(formatActionError(actionTitle(target.dataset.action), error));
      }
      return;
    }
    backend.triggerAction(target.dataset.action);
    flashToast(copy.misc.toastAction(target.dataset.action));
    return;
  }

  if (target.dataset.manualServer) {
    backend.setTunnelPreference("manual");
    backend.setManualServer(target.dataset.manualServer);
    flashToast(copy.misc.toastManualServer(target.dataset.manualServer));
    return;
  }

  if (target.dataset.menuTrigger) {
    state.openMenu = state.openMenu === target.dataset.menuTrigger ? null : target.dataset.menuTrigger;
    render();
    return;
  }

  if (target.dataset.menuOption) {
    handleMenuOption(target.dataset.menuOption, target.dataset.value);
    return;
  }

  if (target.dataset.countryToggle) {
    backend.toggleBlockedCountry(target.dataset.countryToggle);
    flashToast(copy.misc.toastUpdated);
    return;
  }

  if (target.dataset.connectionsTab) {
    state.connectionFilters.tab = target.dataset.connectionsTab;
    render();
    return;
  }

  if (target.dataset.selectBase) {
    state.selectedBaseId = target.dataset.selectBase;
    render();
    return;
  }

  if (target.dataset.selectRule) {
    state.selectedRuleId = target.dataset.selectRule;
    render();
    return;
  }

  if (target.dataset.syncBase) {
    backend.syncBase(target.dataset.syncBase);
    flashToast(copy.misc.toastUpdated);
    return;
  }

  if (target.dataset.removeBase) {
    backend.removeBase(target.dataset.removeBase);
    if (state.selectedBaseId === target.dataset.removeBase) {
      state.selectedBaseId = "";
    }
    flashToast(copy.misc.toastUpdated);
    return;
  }

  if (target.dataset.removeRule) {
    backend.removeRule(target.dataset.removeRule);
    if (state.selectedRuleId === target.dataset.removeRule) {
      state.selectedRuleId = "";
    }
    flashToast(copy.misc.toastUpdated);
    return;
  }

  if (target.dataset.addBase !== undefined) {
    backend.addBase(state.baseDraft);
    state.baseDraft = {
      name: "",
      scope: "proxy",
      kind: "domains",
      sourceType: "local",
    };
    flashToast(copy.misc.toastUpdated);
    return;
  }

  if (target.dataset.addRule !== undefined) {
    backend.addRule(state.ruleDraft);
    state.ruleDraft = {
      name: "",
      action: "PROXY",
      target: "BLOCKED SITES",
    };
    flashToast(copy.misc.toastUpdated);
    return;
  }

  if (target.dataset.listEditorNav && listEditorId) {
    moveListEditorMatch(listEditorId, target.dataset.listEditorNav);
    return;
  }

  if (target.dataset.listEditorApply !== undefined && listEditorId) {
    void applyListEditorChanges(listEditorId)
      .then((changed) => {
        if (changed) {
          flashToast(getCopy(state.snapshot.settings.language).misc.toastUpdated);
        }
      })
      .catch((error) => {
        flashToast(error?.message || String(error || "Save failed."));
      });
    return;
  }

  if (target.dataset.listEditorCancel !== undefined && listEditorId) {
    cancelListEditorChanges(listEditorId);
    return;
  }

  if (target.dataset.closeConnection) {
    backend.closeConnection(target.dataset.closeConnection);
    flashToast(copy.misc.toastUpdated);
    return;
  }

  if (target.dataset.closeVisibleConnections !== undefined) {
    const ids = state.snapshot.connections.items
      .filter((connection) => {
        if (state.connectionFilters.tab === "active" && connection.state !== "active") {
          return false;
        }
        if (state.connectionFilters.tab === "closed" && connection.state !== "closed") {
          return false;
        }
        if (state.connectionFilters.scope !== CONNECTION_SCOPE_ALL && connection.sourceKey !== state.connectionFilters.scope) {
          return false;
        }
        return matchesConnectionSearch(connection, state.connectionFilters.search);
      })
      .map((connection) => connection.id);
    backend.closeConnections(ids);
    flashToast(copy.misc.toastUpdated);
    return;
  }

  if (target.dataset.clearClosedConnections !== undefined) {
    backend.clearClosedConnections();
    flashToast(copy.misc.toastUpdated);
    return;
  }

  if (target.dataset.toggleConnectionsPause !== undefined) {
    backend.setConnectionsPaused(!state.snapshot.connections.paused);
    flashToast(copy.misc.toastUpdated);
    return;
  }

  if (target.dataset.runDiagnostic !== undefined) {
    const value = state.toolDrafts.diagnosticAddresses.trim();
    const addresses = parseDiagnosticAddresses(value);
    const firstAddress = addresses[0] || "";
    if (!firstAddress) {
      flashToast(copy.toolsView.addressRequired);
      return;
    }
    state.toolDrafts.routeAddress = firstAddress;
    state.toolDrafts.ruleAddress = firstAddress;
    state.toolDrafts.dnsAddress = firstAddress;
    state.toolDrafts.latencyAddresses = addresses.join(", ");
    if (typeof backend.runDiagnostics === "function") {
      backend.runDiagnostics(value, target.dataset.runDiagnostic);
      return;
    }
    backend.runRouteProbe(firstAddress);
    backend.runRuleProbe(firstAddress);
    backend.runDnsProbe(firstAddress);
    if (target.dataset.runDiagnostic === "full") {
      backend.runLatencyProbe(addresses.join(", "));
    }
    return;
  }

  if (target.dataset.runRouteProbe !== undefined) {
    if (!state.toolDrafts.routeAddress.trim()) {
      flashToast(copy.toolsView.addressRequired);
      return;
    }
    backend.runRouteProbe(state.toolDrafts.routeAddress.trim());
    return;
  }

  if (target.dataset.runRuleProbe !== undefined) {
    if (!state.toolDrafts.ruleAddress.trim()) {
      flashToast(copy.toolsView.addressRequired);
      return;
    }
    backend.runRuleProbe(state.toolDrafts.ruleAddress.trim());
    return;
  }

  if (target.dataset.runDnsProbe !== undefined) {
    if (!state.toolDrafts.dnsAddress.trim()) {
      flashToast(copy.toolsView.addressRequired);
      return;
    }
    backend.runDnsProbe(state.toolDrafts.dnsAddress.trim());
    return;
  }

  if (target.dataset.runLatencyProbe !== undefined) {
    if (!state.toolDrafts.latencyAddresses.trim()) {
      flashToast(copy.toolsView.addressRequired);
      return;
    }
    backend.runLatencyProbe(state.toolDrafts.latencyAddresses.trim());
    return;
  }

  if (target.dataset.addSubscription !== undefined) {
    if (!state.subscriptionDraft.url.trim()) {
      flashToast(copy.misc.addDisabled);
      return;
    }
    try {
      const started = await backend.addSubscription({
        ...state.subscriptionDraft,
        name: state.subscriptionDraft.name.trim(),
        url: state.subscriptionDraft.url.trim(),
      });
      if (started !== false) {
        state.subscriptionDraft = createEmptySubscriptionDraft();
        renderSnapshotUpdate();
        flashToast(copy.misc.toastAddedSubscription);
      }
    } catch (error) {
      flashToast(formatActionError(copy.subscriptionForm.add, error));
    }
    return;
  }

  if (target.dataset.saveSubscription) {
    const subscriptionId = target.dataset.saveSubscription;
    const edit = state.subscriptionEdits[subscriptionId];
    if (!edit || !edit.url.trim()) {
      flashToast(copy.misc.addDisabled);
      return;
    }
    try {
      const started = await backend.updateSubscription(subscriptionId, {
        name: edit.name.trim(),
        url: edit.url.trim(),
        format: edit.format,
      });
      if (started !== false) {
        flashToast(state.snapshot.settings.language === "ru" ? "Подписка сохранена и перепроверена." : "Subscription saved and refreshed.");
      }
    } catch (error) {
      flashToast(formatActionError(copy.listEditor.apply, error));
    }
    return;
  }

  if (target.dataset.cancelSubscription) {
    const subscriptionId = target.dataset.cancelSubscription;
    const subscription = state.snapshot.derived.subscriptionSummaries.find((item) => item.id === subscriptionId);
    if (subscription) {
      state.subscriptionEdits[subscriptionId] = createSubscriptionEdit(subscription);
      renderSnapshotUpdate();
    }
    return;
  }

  if (target.dataset.removeSubscription) {
    try {
      const started = await backend.removeSubscription(target.dataset.removeSubscription);
      if (started !== false) {
        delete state.subscriptionEdits[target.dataset.removeSubscription];
        flashToast(copy.misc.toastRemovedSubscription);
      }
    } catch (error) {
      flashToast(formatActionError(copy.subscriptionForm.remove, error));
    }
    return;
  }
});

root.addEventListener("pointerdown", (event) => {
  const target = event.target;
  if (!isRangeInput(target)) {
    return;
  }
  beginRangeInteraction(target);
});

root.addEventListener("input", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLInputElement) && !(target instanceof HTMLTextAreaElement)) {
    return;
  }
  const listEditorId = target.closest("[data-list-editor]")?.getAttribute("data-list-editor") || "";
  if (target instanceof HTMLInputElement && isRangeInput(target)) {
    syncActiveRangeUi(target);
    return;
  }
  if (target.dataset.connectionSearch !== undefined) {
    state.connectionFilters.search = target.value;
    render();
    return;
  }
  if (target.dataset.toolInput) {
    state.toolDrafts[target.dataset.toolInput] = target.value;
    return;
  }
  if (target.dataset.listEditorSearch !== undefined && listEditorId) {
    const editor = state.listEditors[listEditorId];
    if (!editor || editor.isSaving) {
      return;
    }
    editor.search = target.value;
    editor.activeMatchIndex = -1;
    syncRenderedListEditor(listEditorId);
    return;
  }
  if (target.dataset.listEditorText !== undefined && listEditorId) {
    const editor = state.listEditors[listEditorId];
    if (!editor || editor.isSaving) {
      return;
    }
    editor.draftText = target.value.replaceAll("\r", "");
    editor.saveError = "";
    editor.scrollTop = target.scrollTop;
    editor.scrollLeft = target.scrollLeft;
    syncRenderedListEditor(listEditorId);
    return;
  }
  if (target.dataset.listEditorScale !== undefined && listEditorId) {
    const editor = state.listEditors[listEditorId];
    if (!editor || editor.isSaving) {
      return;
    }
    editor.scale = clampListEditorScale(target.value);
    syncRenderedListEditor(listEditorId);
    return;
  }
  if (target.dataset.draftInput) {
    if (target.dataset.draftInput === "base-name") {
      state.baseDraft.name = target.value;
    } else if (target.dataset.draftInput === "rule-name") {
      state.ruleDraft.name = target.value;
    }
    return;
  }
  if (target.dataset.automationInput) {
    return;
  }
  if (commitEditableInputValue(target)) {
    return;
  }
  if (target.dataset.subscriptionEditInput && target.dataset.subscriptionId) {
    const edit = state.subscriptionEdits[target.dataset.subscriptionId];
    if (!edit) {
      return;
    }
    edit[target.dataset.subscriptionEditInput] = target.value;
    renderSnapshotUpdate();
    return;
  }
  if (!target.dataset.subInput) {
    return;
  }
  state.subscriptionDraft[target.dataset.subInput] = target.value;
  renderSnapshotUpdate();
});

root.addEventListener(
  "scroll",
  (event) => {
    const target = event.target;
    if (!(target instanceof HTMLTextAreaElement) || target.dataset.listEditorText === undefined) {
      return;
    }
    const listEditorId = target.closest("[data-list-editor]")?.getAttribute("data-list-editor") || "";
    if (!listEditorId || !state.listEditors[listEditorId]) {
      return;
    }
    state.listEditors[listEditorId].scrollTop = target.scrollTop;
    state.listEditors[listEditorId].scrollLeft = target.scrollLeft;
    syncListEditorOverlayScroll(target);
  },
  true,
);

root.addEventListener("change", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLInputElement) && !(target instanceof HTMLTextAreaElement)) {
    return;
  }
  if (target instanceof HTMLInputElement && isRangeInput(target)) {
    syncActiveRangeUi(target);
    commitRangeInputValue(target);
    endRangeInteraction();
    return;
  }
  if (commitEditableInputValue(target)) {
    return;
  }
  if (!(target instanceof HTMLInputElement)) {
    return;
  }
  if (target.matches("[data-auto-refresh]")) {
    backend.setAutoRefresh(target.checked);
    flashToast(getCopy(state.snapshot.settings.language).misc.toastUpdated);
    return;
  }
  if (target.matches("[data-animations]")) {
    backend.setAnimations(target.checked);
    flashToast(getCopy(state.snapshot.settings.language).misc.toastUpdated);
    return;
  }
  if (target.matches("[data-controller-ws]")) {
    backend.updateControllerConfig({ useWebSocket: target.checked });
    flashToast(getCopy(state.snapshot.settings.language).misc.toastUpdated);
    return;
  }
  if (target.matches("[data-automation-enabled]")) {
    backend.updateAutomation({ enabled: target.checked });
    flashToast(getCopy(state.snapshot.settings.language).misc.toastUpdated);
    return;
  }
  if (target.matches("[data-ui-auto-update]")) {
    backend.updateAutomation({ uiAutoUpdate: target.checked });
    flashToast(getCopy(state.snapshot.settings.language).misc.toastUpdated);
    return;
  }
  if (target.matches("[data-bridge-auto-update]")) {
    backend.updateAutomation({ bridgeAutoUpdate: target.checked });
    flashToast(getCopy(state.snapshot.settings.language).misc.toastUpdated);
    return;
  }
  if (target.matches("[data-auto-sticky]")) {
    backend.updateAutoSelection({ stickyBest: target.checked });
    flashToast(getCopy(state.snapshot.settings.language).misc.toastUpdated);
    return;
  }
  if (target.matches("[data-allow-unknown]")) {
    backend.setAllowUnknownEgress(target.checked);
    flashToast(getCopy(state.snapshot.settings.language).misc.toastUpdated);
    return;
  }
  if (target.matches("[data-automation-base-auto-update]")) {
    backend.updateBase(target.dataset.baseId, { autoUpdate: target.checked });
    flashToast(getCopy(state.snapshot.settings.language).misc.toastUpdated);
    return;
  }
  if (target.matches("[data-base-enabled]")) {
    backend.updateBase(state.selectedBaseId, { enabled: target.checked });
    flashToast(getCopy(state.snapshot.settings.language).misc.toastUpdated);
    return;
  }
  if (target.matches("[data-rule-enabled]")) {
    backend.updateRule(state.selectedRuleId, { enabled: target.checked });
    flashToast(getCopy(state.snapshot.settings.language).misc.toastUpdated);
    return;
  }
  if (target.matches("[data-toggle-rule-base]")) {
    backend.toggleRuleBase(state.selectedRuleId, target.dataset.toggleRuleBase);
    flashToast(getCopy(state.snapshot.settings.language).misc.toastUpdated);
    return;
  }
});

document.addEventListener("click", (event) => {
  if (!state.openMenu) {
    return;
  }
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }
  if (target.closest("[data-dropdown-root]")) {
    return;
  }
  state.openMenu = null;
  render();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && state.openMenu) {
    state.openMenu = null;
    render();
  }
});

document.addEventListener("pointerup", () => {
  endRangeInteraction();
});

document.addEventListener("pointercancel", () => {
  endRangeInteraction();
});

backend.subscribe((snapshot) => {
  state.snapshot = snapshot;
  reconcileSubscriptionEdits(snapshot);
  if (!findBase(snapshot, state.selectedBaseId)) {
    state.selectedBaseId = snapshot.ruleEngine.bases[0]?.id || "";
  }
  if (!findRule(snapshot, state.selectedRuleId)) {
    state.selectedRuleId = snapshot.ruleEngine.rules[0]?.id || "";
  }
  renderSnapshotUpdate();
});

window.addEventListener("beforeunload", () => {
  backend.destroy();
});
