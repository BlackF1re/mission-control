#!/bin/sh
set -eu

NIKKI_HOME="/etc/nikki"
RUN_DIR="$NIKKI_HOME/run"
RUN_PROFILE="$RUN_DIR/config.yaml"
RULE_DIR="$RUN_DIR/providers/rule"
CLIENT_PROFILE="$NIKKI_HOME/profiles/client.yaml"
SUBSCRIPTIONS_DIR="$NIKKI_HOME/subscriptions"
PANEL_DIR="$NIKKI_HOME/panel"
PANEL_BASE_DIR="$RULE_DIR/panel-managed"
LEGACY_PANEL_BASE_DIR="$PANEL_DIR/bases"
PANEL_MODEL="$PANEL_DIR/model.json"
PANEL_INVENTORY="$PANEL_DIR/inventory.json"
PANEL_STATE_CACHE="$PANEL_DIR/state-cache.json"
APP_LOG="/var/log/nikki/app.log"
TMP_DIR="/var/run/mission-control"
BRIDGE_HOME="/usr/libexec/mission-control"
LEGACY_BRIDGE_HOME="$RUN_DIR/ui/bridge"
WRAPPER_PATH="/www/cgi-bin/mission-control-bridge"
UI_DIR="$RUN_DIR/ui"
UI_RELEASE_FILE="$UI_DIR/mission_control_release.json"
INVENTORY_REBUILD_LOCK="$TMP_DIR/inventory-rebuild.lock"
BODY_FILE="$TMP_DIR/request-body.$$"
RESP_FILE="$TMP_DIR/response-body.$$"
MODEL_TMP="$TMP_DIR/model.$$"
MODEL_NEXT="$TMP_DIR/model-next.$$"
ITEM_FILE="$TMP_DIR/item.$$"
DOWNLOAD_FILE="$TMP_DIR/download.$$"
ARCHIVE_DIR="$TMP_DIR/archive.$$"
TRAFFIC_CACHE_FILE="$TMP_DIR/panel-traffic-cache.tsv"
TRAFFIC_CACHE_TIME_FILE="$TMP_DIR/panel-traffic-cache.time"
AUTO_CRON_TAG="#mission-control-auto-best"
SCHEDULER_CRON_TAG="#mission-control-bridge-scheduler"
LEGACY_REFRESH_CRON_TAG="#rf-update"
LEGACY_LOG_CRON_TAG="#nikki log scheduled clear"
SCHEDULER_STATE_FILE="$PANEL_DIR/scheduler-state.json"
SCHEDULER_STATE_LOCK_FILE="$TMP_DIR/scheduler-state.lock"
SCHEDULER_LOCK_DIR="$TMP_DIR/scheduler.lock"
POOL_REFRESH_LOCK_DIR="$TMP_DIR/pool-refresh.lock"
PANEL_STATE_REFRESH_LOCK_DIR="$TMP_DIR/state-refresh.lock"
ROUTING_APPLY_STAMP="$TMP_DIR/routing-apply.time"
BOOTSTRAP_STAMP="$TMP_DIR/bootstrap.time"
SELF_SCRIPT="$BRIDGE_HOME/mission_control_bridge.cgi"
LEGACY_BRIDGE_SCRIPT="$LEGACY_BRIDGE_HOME/mission_control_bridge.cgi"
CURL_LOCAL_ARGS="--connect-timeout 3 --max-time 12"
DELAY_URL_DEFAULT="https://chatgpt.com/cdn-cgi/trace"
SPEED_URL_DEFAULT="https://speed.cloudflare.com/__down?bytes=262144"
MISSION_CONTROL_VERSION="1.0.1"
MISSION_CONTROL_REPO_OWNER="BlackF1re"
MISSION_CONTROL_REPO_NAME="mission-control"
MISSION_CONTROL_MANIFEST_URL_DEFAULT="https://github.com/$MISSION_CONTROL_REPO_OWNER/$MISSION_CONTROL_REPO_NAME/releases/latest/download/mission-control-manifest.json"
MISSION_CONTROL_RELEASE_API_URL_DEFAULT="https://api.github.com/repos/$MISSION_CONTROL_REPO_OWNER/$MISSION_CONTROL_REPO_NAME/releases/latest"
MISSION_CONTROL_RELEASE_CHECK_MINUTES_DEFAULT=30
EMPTY_FIELD_TOKEN="__PANEL_EMPTY__"
FIELD_JOIN_TOKEN="__PANEL_SPLIT__"
MODEL_CREATED=0

ensure_web_wrapper() {
  wrapper_dir=$(dirname "$WRAPPER_PATH")
  mkdir -p "$wrapper_dir" || return 1
  cat > "$WRAPPER_PATH" <<'EOF'
#!/bin/sh
exec /usr/libexec/mission-control/mission_control_bridge.cgi "$@"
EOF
  chmod 0755 "$WRAPPER_PATH"
}

subscription_is_placeholder_section() {
  section="$1"
  [ -n "$section" ] || return 1
  url=$(uci -q get "nikki.$section.url" 2>/dev/null || true)
  case "$url" in
    http://example.com/default.yaml|https://example.com/default.yaml)
      return 0
      ;;
  esac
  return 1
}

list_managed_subscription_sections() {
  subscription_list_file="$TMP_DIR/subscription-list.$$"
  : > "$subscription_list_file"
  uci show nikki | sed -n "s/^nikki\.\([^.=]*\)=subscription$/\1/p" > "$subscription_list_file"
  while IFS= read -r subscription_section_id; do
    [ -n "$subscription_section_id" ] || continue
    subscription_is_placeholder_section "$subscription_section_id" && continue
    printf '%s\n' "$subscription_section_id"
  done < "$subscription_list_file"
  rm -f "$subscription_list_file"
}

managed_subscriptions_present() {
  list_managed_subscription_sections | grep -q .
}

mkdir -p "$TMP_DIR" "$PANEL_DIR" "$PANEL_BASE_DIR" "$LEGACY_PANEL_BASE_DIR" "$BRIDGE_HOME" "$(dirname "$APP_LOG")"
trap 'rm -f "$BODY_FILE" "$RESP_FILE" "$MODEL_TMP" "$MODEL_NEXT" "$ITEM_FILE" "$DOWNLOAD_FILE"; rm -rf "$ARCHIVE_DIR"' EXIT INT TERM

REQUEST_METHOD_SAFE="${REQUEST_METHOD:-GET}"
CONTENT_LENGTH_SAFE="${CONTENT_LENGTH:-0}"
case "$CONTENT_LENGTH_SAFE" in
  ''|*[!0-9]*) CONTENT_LENGTH_SAFE=0 ;;
esac

case "$REQUEST_METHOD_SAFE" in
  POST|PUT|PATCH|DELETE)
    cat > "$BODY_FILE"
    ;;
  *)
    : > "$BODY_FILE"
    ;;
esac

exec </dev/null

if [ "$REQUEST_METHOD_SAFE" = "GET" ] && { [ "${PATH_INFO:-/}" = "/mission-control/state" ] || [ "${PATH_INFO:-/}" = "/panel/state" ]; } && [ -s "$PANEL_STATE_CACHE" ]; then
  if yq -p json -o=json '.' "$PANEL_STATE_CACHE" >/dev/null 2>&1 && ! { [ "$SELF_SCRIPT" -nt "$PANEL_STATE_CACHE" ] \
    || [ "$PANEL_MODEL" -nt "$PANEL_STATE_CACHE" ] \
    || [ "$PANEL_INVENTORY" -nt "$PANEL_STATE_CACHE" ] \
    || { [ -f "$SCHEDULER_STATE_FILE" ] && [ "$SCHEDULER_STATE_FILE" -nt "$PANEL_STATE_CACHE" ]; } \
    || { [ ! -d "$POOL_REFRESH_LOCK_DIR" ] && ! managed_subscriptions_present && [ -f "$CLIENT_PROFILE" ] && [ "$CLIENT_PROFILE" -nt "$PANEL_STATE_CACHE" ]; } \
    || { [ -f /etc/config/nikki ] && [ /etc/config/nikki -nt "$PANEL_STATE_CACHE" ]; }; }; then
    printf 'Status: 200 OK\r\n'
    printf 'Content-Type: application/json; charset=utf-8\r\n'
    printf 'Cache-Control: no-store\r\n'
    printf 'Access-Control-Allow-Origin: *\r\n'
    printf 'Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS\r\n'
    printf 'Access-Control-Allow-Headers: Content-Type, Authorization\r\n'
    printf 'Access-Control-Max-Age: 86400\r\n'
    printf '\r\n'
    cat "$PANEL_STATE_CACHE"
    exit 0
  fi
fi

log_msg() {
  printf '[%s] [PANEL] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$1" >> "$APP_LOG"
}

now_epoch() {
  date '+%s'
}

now_iso() {
  date -u '+%Y-%m-%dT%H:%M:%SZ'
}

sha256_file() {
  file_path="$1"
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$file_path" | awk '{print $1}'
    return 0
  fi
  if command -v busybox >/dev/null 2>&1; then
    busybox sha256sum "$file_path" | awk '{print $1}'
    return 0
  fi
  return 1
}

ui_release_value() {
  key="$1"
  [ -s "$UI_RELEASE_FILE" ] || return 0
  yq -p json -r "$key // \"\"" "$UI_RELEASE_FILE" 2>/dev/null || true
}

current_ui_version() {
  version=$(safe_string "$(ui_release_value '.version // ""')")
  if [ -n "$version" ]; then
    printf '%s\n' "$version"
    return 0
  fi
  printf '%s\n' "$MISSION_CONTROL_VERSION"
}

current_bridge_version() {
  printf '%s\n' "$MISSION_CONTROL_VERSION"
}

mission_control_release_api_url() {
  printf '%s\n' "$MISSION_CONTROL_RELEASE_API_URL_DEFAULT"
}

download_release_asset() {
  url="$1"
  output_path="$2"
  curl -L --connect-timeout 10 --max-time 180 -fsSL "$url" -o "$output_path"
}

download_release_metadata() {
  url="$1"
  output_path="$2"
  curl -L --connect-timeout 10 --max-time 60 -fsSL \
    -H 'Accept: application/vnd.github+json' \
    -H 'X-GitHub-Api-Version: 2022-11-28' \
    -H 'User-Agent: Mission-Control-Bridge' \
    "$url" -o "$output_path"
}

require_unzip() {
  if command -v unzip >/dev/null 2>&1; then
    printf 'unzip\n'
    return 0
  fi
  if command -v busybox >/dev/null 2>&1 && busybox --list 2>/dev/null | grep -Fxq 'unzip'; then
    printf 'busybox unzip\n'
    return 0
  fi
  return 1
}

timing_mark() {
  [ "${PANEL_DEBUG_TIMING:-0}" = "1" ] || return 0
  log_msg "TIMING $1 $(date '+%s')"
}

debug_mark() {
  [ "${PANEL_DEBUG_TIMING:-0}" = "1" ] || return 0
  log_msg "DEBUG $1"
}

json_string() {
  printf '%s' "${1:-}" | awk '
    BEGIN {
      printf "\""
    }
    {
      if (NR > 1) {
        printf "\\n"
      }
      gsub(/\\/, "\\\\")
      gsub(/"/, "\\\"")
      gsub(/\t/, "\\t")
      gsub(/\r/, "\\r")
      printf "%s", $0
    }
    END {
      printf "\""
    }
  '
}

urlencode_all() {
  S="$1" yq -n -r 'strenv(S) | @uri' | sed 's/+/%20/g'
}

safe_string() {
  value=$(printf '%s' "${1:-}" | tr -d '\r')
  case "$value" in
    *[![:space:]]*) printf '%s\n' "$value" | sed 's/^[[:space:]]*//; s/[[:space:]]*$//' ;;
    *) printf '%s\n' "${2:-}" ;;
  esac
}

sanitize_bool() {
  value=$(safe_string "${1:-}")
  fallback="${2:-false}"
  case "$value" in
    1|true|TRUE|yes|YES|on|ON) printf 'true\n' ;;
    0|false|FALSE|no|NO|off|OFF) printf 'false\n' ;;
    *) printf '%s\n' "$fallback" ;;
  esac
}

sanitize_choice() {
  value=$(safe_string "${1:-}")
  fallback="${2:-}"
  shift 2 || true
  for option in "$@"; do
    if [ "$value" = "$option" ]; then
      printf '%s\n' "$option"
      return
    fi
  done
  printf '%s\n' "$fallback"
}

sanitize_int() {
  value=$(safe_string "${1:-}")
  fallback="${2:-0}"
  min_value="${3:-0}"
  max_value="${4:-2147483647}"
  case "$value" in
    ''|*[!0-9-]*)
      printf '%s\n' "$fallback"
      return
      ;;
  esac
  if [ "$value" -lt "$min_value" ]; then
    printf '%s\n' "$min_value"
  elif [ "$value" -gt "$max_value" ]; then
    printf '%s\n' "$max_value"
  else
    printf '%s\n' "$value"
  fi
}

system_memory_total_mib() {
  awk '/MemTotal:/ { printf "%d\n", int(($2 + 1023) / 1024); found=1 } END { if (!found) print 512 }' /proc/meminfo 2>/dev/null
}

gomemlimit_to_mib() {
  value=$(safe_string "${1:-}")
  case "$value" in
    ''|off|OFF|0)
      printf '0\n'
      ;;
    *[Gg][Ii][Bb])
      number=$(printf '%s' "$value" | sed 's/[Gg][Ii][Bb]$//')
      case "$number" in ''|*[!0-9]*) printf '0\n' ;; *) printf '%s\n' $((number * 1024)) ;; esac
      ;;
    *[Mm][Ii][Bb])
      number=$(printf '%s' "$value" | sed 's/[Mm][Ii][Bb]$//')
      case "$number" in ''|*[!0-9]*) printf '0\n' ;; *) printf '%s\n' "$number" ;; esac
      ;;
    *[Gg])
      number=$(printf '%s' "$value" | sed 's/[Gg]$//')
      case "$number" in ''|*[!0-9]*) printf '0\n' ;; *) printf '%s\n' $((number * 1024)) ;; esac
      ;;
    *[Mm])
      number=$(printf '%s' "$value" | sed 's/[Mm]$//')
      case "$number" in ''|*[!0-9]*) printf '0\n' ;; *) printf '%s\n' "$number" ;; esac
      ;;
    *[!0-9]*)
      printf '0\n'
      ;;
    *)
      bytes="$value"
      if [ "$bytes" -gt 1048576 ] 2>/dev/null; then
        printf '%s\n' $(((bytes + 1048575) / 1048576))
      else
        printf '%s\n' "$bytes"
      fi
      ;;
  esac
}

uci_mihomo_memory_limit_mib() {
  gomemlimit_to_mib "$(uci -q get nikki.procd.env_go_mem_limit 2>/dev/null || true)"
}

format_gomemlimit() {
  value=$(sanitize_int "${1:-0}" 0 0 "$(system_memory_total_mib)")
  if [ "$value" -le 0 ]; then
    printf 'off\n'
  else
    printf '%sMiB\n' "$value"
  fi
}

safe_id() {
  printf '%s' "${1:-}" | tr 'A-Z' 'a-z' | sed 's/[^a-z0-9]\+/-/g; s/^-//; s/-$//; s/--*/-/g'
}

is_internal_panel_id() {
  case "${1:-}" in
    bridge-smoke-*|bridge-debug-*|remote-timing-*|panel-debug-*)
      return 0
      ;;
  esac
  return 1
}

is_internal_panel_name() {
  upper_name=$(printf '%s' "${1:-}" | tr 'a-z' 'A-Z')
  case "$upper_name" in
    *BRIDGE\ SMOKE*|*REMOTE\ TIMING*|*PANEL\ DEBUG*)
      return 0
      ;;
  esac
  return 1
}

should_hide_panel_entity() {
  is_internal_panel_id "${1:-}" && return 0
  is_internal_panel_name "${2:-}" && return 0
  return 1
}

cleanup_internal_uci_sections() {
  sections_file="$TMP_DIR/internal-uci-sections.$$"
  : > "$sections_file"
  uci show nikki 2>/dev/null | sed -n "s/^nikki\.\([^.=]*\)=.*/\1/p" | while IFS= read -r section; do
    [ -n "$section" ] || continue
    case "$section" in
      panel_base_bridge_*|panel_base_remote_timing_*|panel_base_panel_debug_*|panel_rule_*bridge_*|panel_rule_*remote_timing_*|panel_rule_*panel_debug_*)
        printf '%s\n' "$section" >> "$sections_file"
        ;;
    esac
  done
  if [ ! -s "$sections_file" ]; then
    rm -f "$sections_file"
    return 0
  fi
  while IFS= read -r section; do
    [ -n "$section" ] || continue
    uci -q delete "nikki.$section" >/dev/null 2>&1 || true
  done < "$sections_file"
  uci -q commit nikki >/dev/null 2>&1 || true
  rm -f "$sections_file"
}

cleanup_placeholder_subscriptions() {
  sections_file="$TMP_DIR/placeholder-subscriptions.$$"
  changed=0
  : > "$sections_file"
  uci show nikki | sed -n "s/^nikki\.\([^.=]*\)=subscription$/\1/p" > "$sections_file"
  while IFS= read -r section; do
    [ -n "$section" ] || continue
    subscription_is_placeholder_section "$section" || continue
    uci -q delete "nikki.$section" >/dev/null 2>&1 || true
    changed=1
  done < "$sections_file"
  [ "$changed" -eq 1 ] && uci -q commit nikki >/dev/null 2>&1 || true
  rm -f "$sections_file"
}

cleanup_internal_panel_entities() {
  [ -s "$PANEL_MODEL" ] || return 0
  cleanup_internal_uci_sections
  cleanup_placeholder_subscriptions
  base_ids_file="$TMP_DIR/internal-base-ids.$$"
  rule_ids_file="$TMP_DIR/internal-rule-ids.$$"
  : > "$base_ids_file"
  : > "$rule_ids_file"

  EMPTY="$EMPTY_FIELD_TOKEN" yq -p json -r '
    .bases[]? |
    [
      ((.id | select(. != null and . != "")) // strenv(EMPTY)),
      ((.name | select(. != null and . != "")) // strenv(EMPTY))
    ] | @tsv
  ' "$PANEL_MODEL" 2>/dev/null | while IFS="$(printf '\t')" read -r base_id name; do
    base_id=$(restore_empty_field "$base_id")
    name=$(restore_empty_field "$name")
    should_hide_panel_entity "$base_id" "$name" || continue
    printf '%s\n' "$base_id" >> "$base_ids_file"
  done

  EMPTY="$EMPTY_FIELD_TOKEN" yq -p json -r '
    .rules[]? |
    [
      ((.id | select(. != null and . != "")) // strenv(EMPTY)),
      ((.name | select(. != null and . != "")) // strenv(EMPTY))
    ] | @tsv
  ' "$PANEL_MODEL" 2>/dev/null | while IFS="$(printf '\t')" read -r rule_id name; do
    rule_id=$(restore_empty_field "$rule_id")
    name=$(restore_empty_field "$name")
    should_hide_panel_entity "$rule_id" "$name" || continue
    printf '%s\n' "$rule_id" >> "$rule_ids_file"
  done

  if [ ! -s "$base_ids_file" ] && [ ! -s "$rule_ids_file" ]; then
    rm -f "$base_ids_file" "$rule_ids_file"
    return 0
  fi

  model_tmp_begin
  while IFS= read -r base_id; do
    [ -n "$base_id" ] || continue
    BASE_ID="$base_id" model_tmp_apply '.bases |= map(select(.id != strenv(BASE_ID)))'
    BASE_ID="$base_id" model_tmp_apply '.rules |= map(.baseIds = ((.baseIds // []) | map(select(. != strenv(BASE_ID)))))'
  done < "$base_ids_file"
  while IFS= read -r rule_id; do
    [ -n "$rule_id" ] || continue
    RULE_ID="$rule_id" model_tmp_apply '.rules |= map(select(.id != strenv(RULE_ID)))'
  done < "$rule_ids_file"
  save_model
  rm -f "$base_ids_file" "$rule_ids_file"
}

bool_json() {
  case "${1:-false}" in
    1|true|TRUE|yes|YES|on|ON) printf 'true' ;;
    *) printf 'false' ;;
  esac
}

jsonl_to_array() {
  file="$1"
  if [ ! -s "$file" ]; then
    printf '[]'
    return
  fi
  first=1
  printf '['
  while IFS= read -r line || [ -n "$line" ]; do
    [ -n "$line" ] || continue
    if [ "$first" -eq 1 ]; then
      first=0
    else
      printf ','
    fi
    printf '%s' "$line"
  done < "$file"
  printf ']'
}

null_to_empty() {
  case "${1:-}" in
    null) printf '' ;;
    *) printf '%s' "${1:-}" ;;
  esac
}

restore_empty_field() {
  case "${1:-}" in
    "$EMPTY_FIELD_TOKEN") printf '' ;;
    *) printf '%s' "${1:-}" ;;
  esac
}

json_string_or_null() {
  if [ -n "${1:-}" ]; then
    json_string "$1"
  else
    printf 'null'
  fi
}

uci_string() {
  escaped=$(printf '%s' "${1:-}" | sed "s/'/'\\\\''/g")
  printf "'%s'" "$escaped"
}

json_number_or_null() {
  value="${1:-}"
  case "$value" in
    ''|null|NULL) printf 'null' ;;
    -|--*|*[!0-9.-]*) printf 'null' ;;
    *) printf '%s' "$value" ;;
  esac
}

json_array_from_lines() {
  file="$1"
  if [ ! -s "$file" ]; then
    printf '[]'
    return
  fi
  awk '
    BEGIN {
      first = 1
      printf "["
    }
    {
      gsub(/\r/, "", $0)
      if ($0 == "") next
      if (first) {
        first = 0
      } else {
        printf ","
      }
      printf "%s", $0
    }
    END {
      printf "]"
    }
  ' "$file"
}

json_array_from_pipe_values() {
  pipe_values="${1:-}"
  if [ -z "$pipe_values" ]; then
    printf '[]'
    return
  fi
  pipe_first=1
  pipe_old_ifs="$IFS"
  IFS='|'
  printf '['
  for pipe_value in $pipe_values; do
    [ -n "$pipe_value" ] || continue
    if [ "$pipe_first" -eq 1 ]; then
      pipe_first=0
    else
      printf ','
    fi
    printf '%s' "$(json_string "$pipe_value")"
  done
  IFS="$pipe_old_ifs"
  printf ']'
}

json_compact() {
  compact=$(printf '%s' "${1:-null}" | yq -p json -o=json -I=0 '.' 2>/dev/null || true)
  if [ -n "$compact" ]; then
    printf '%s' "$compact"
  else
    printf '%s' "${1:-null}" | tr -d '\r\n'
  fi
}

ensure_ip_lookup_cache() {
  file="$1"
  exact_cache="${file}.exact"
  range_cache="${file}.ranges"
  if [ ! -f "$exact_cache" ] || [ ! -f "$range_cache" ] || [ "$file" -nt "$exact_cache" ] || [ "$file" -nt "$range_cache" ]; then
    : > "$exact_cache"
    : > "$range_cache"
    awk -v exact="$exact_cache" -v ranges="$range_cache" '
      {
        gsub(/\r/, "", $0)
        if ($0 == "") next
        if ($0 ~ /\/32$/) {
          sub(/\/32$/, "", $0)
          print $0 >> exact
          next
        }
        if (index($0, "/") == 0) {
          print $0 >> exact
          next
        }
        print $0 >> ranges
      }
    ' "$file"
  fi
}

respond_headers() {
  status="$1"
  content_type="${2:-application/json; charset=utf-8}"
  printf 'Status: %s\r\n' "$status"
  printf 'Content-Type: %s\r\n' "$content_type"
  printf 'Cache-Control: no-store\r\n'
  printf 'Access-Control-Allow-Origin: *\r\n'
  printf 'Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS\r\n'
  printf 'Access-Control-Allow-Headers: Content-Type, Authorization\r\n'
  printf 'Access-Control-Max-Age: 86400\r\n'
  printf '\r\n'
}

respond_json() {
  status="$1"
  body="$2"
  respond_headers "$status"
  printf '%s\n' "$body"
  exit 0
}

respond_file() {
  status="$1"
  file="$2"
  content_type="${3:-application/json; charset=utf-8}"
  respond_headers "$status" "$content_type"
  cat "$file"
  exit 0
}

respond_error() {
  code="$1"
  message="$2"
  msg_json=$(json_string "$message")
  respond_json "$code" "{\"ok\":false,\"error\":$msg_json}"
}

body_get() {
  expr="$1"
  yq -p json -r "$expr" "$BODY_FILE" 2>/dev/null || true
}

controller_secret() {
  yq -r '.secret // ""' "$RUN_PROFILE" 2>/dev/null || true
}

controller_base_url() {
  listen=$(yq -r '.external-controller // ""' "$RUN_PROFILE" 2>/dev/null || true)
  listen=$(safe_string "$listen")
  case "$listen" in
    \[*\]:*)
      host_part="${listen%:*}"
      port_part="${listen##*:}"
      case "$host_part" in
        "[::]"|"[::0]"|"[*]") host_part="[::1]" ;;
      esac
      printf 'http://%s:%s\n' "$host_part" "$port_part"
      return
      ;;
    *:*)
      host_part="${listen%:*}"
      port_part="${listen##*:}"
      case "$host_part" in
        ''|'0.0.0.0'|'::'|'*') host_part='127.0.0.1' ;;
      esac
      printf 'http://%s:%s\n' "$host_part" "$port_part"
      return
      ;;
  esac
  printf 'http://127.0.0.1:9090\n'
}

controller_request() {
  method="$1"
  path="$2"
  query="${3:-}"
  body_file="${4:-}"
  extra_curl_args="${5:-}"
  secret=$(controller_secret)
  [ -n "$secret" ] || respond_error '502 Bad Gateway' 'Mihomo secret is missing.'
  controller_url=$(controller_base_url)
  url="$controller_url$path"
  if [ -n "$query" ]; then
    url="$url?$query"
  fi
  if [ -n "$body_file" ] && [ -s "$body_file" ]; then
    status=$(curl -sS -X "$method" \
      $CURL_LOCAL_ARGS \
      ${extra_curl_args:+$extra_curl_args} \
      -H "Authorization: Bearer $secret" \
      -H 'Content-Type: application/json' \
      --data-binary "@$body_file" \
      -o "$RESP_FILE" \
      -w '%{http_code}' \
      "$url") || status="502"
  else
    status=$(curl -sS -X "$method" \
      $CURL_LOCAL_ARGS \
      ${extra_curl_args:+$extra_curl_args} \
      -H "Authorization: Bearer $secret" \
      -o "$RESP_FILE" \
      -w '%{http_code}' \
      "$url") || status="502"
  fi
  printf '%s\n' "$status"
}

controller_get_value() {
  path="$1"
  query="${2:-}"
  expr="${3:-.}"
  status=$(controller_request GET "$path" "$query")
  [ "$status" = "200" ] || return 1
  yq -p json -r "$expr" "$RESP_FILE" 2>/dev/null || true
}

ensure_inventory() {
  if [ ! -s "$PANEL_INVENTORY" ]; then
    cat > "$PANEL_INVENTORY" <<'EOF'
{"updatedAt":"","summary":{"discovered":0,"used":0,"rejected":0,"skipped":0},"nodes":[],"bySubscription":[]}
EOF
  fi
}

profile_proxy_count() {
  file="$1"
  yq -r '(.proxies // []) | length' "$file" 2>/dev/null || echo 0
}

is_valid_profile_file() {
  file="$1"
  [ -f "$file" ] || return 1
  [ "$(profile_proxy_count "$file")" -gt 0 ]
}

url_decode() {
  value=$(printf '%s' "${1:-}" | sed 's/+/ /g')
  value=$(printf '%s' "$value" | sed 's/%/\\x/g')
  printf '%b' "$value"
}

query_param_value() {
  query="$1"
  target_key="$2"
  [ -n "$query" ] || return 1
  old_ifs=$IFS
  IFS='&'
  for pair in $query; do
    key=${pair%%=*}
    value=''
    if [ "$pair" != "$key" ]; then
      value=${pair#*=}
    fi
    if [ "$(url_decode "$key")" = "$target_key" ]; then
      IFS=$old_ifs
      url_decode "$value"
      return 0
    fi
  done
  IFS=$old_ifs
  return 1
}

set_subscription_refresh_result() {
  section="$1"
  success="$2"
  if [ "$success" = "1" ]; then
    uci -q set "nikki.$section.update=$(date '+%Y-%m-%d %H:%M:%S')"
    uci -q set "nikki.$section.success=1"
  else
    uci -q delete "nikki.$section.update" >/dev/null 2>&1 || true
    uci -q set "nikki.$section.success=0"
  fi
  uci -q commit nikki
}

parse_vless_uri_to_json() {
  uri="$1"
  case "$uri" in
    vless://*) ;;
    *) return 1 ;;
  esac

  body=${uri#vless://}
  fragment=''
  if [ "${body#*#}" != "$body" ]; then
    fragment=${body#*#}
    body=${body%%#*}
  fi

  query=''
  if [ "${body#*\?}" != "$body" ]; then
    query=${body#*\?}
    body=${body%%\?*}
  fi

  userinfo=${body%@*}
  hostport=${body#*@}
  [ "$userinfo" != "$body" ] || return 1
  [ -n "$hostport" ] || return 1

  uuid=$(url_decode "$userinfo")
  server=${hostport%:*}
  port=${hostport##*:}
  [ -n "$server" ] || return 1
  case "$port" in
    ''|*[!0-9]*) return 1 ;;
  esac

  name=$(url_decode "$fragment")
  [ -n "$name" ] || name="${server}:${port}"
  network=$(safe_string "$(query_param_value "$query" type 2>/dev/null || true)" 'tcp')
  security=$(safe_string "$(query_param_value "$query" security 2>/dev/null || true)" 'none')
  encryption=$(safe_string "$(query_param_value "$query" encryption 2>/dev/null || true)")
  sni=$(safe_string "$(query_param_value "$query" sni 2>/dev/null || true)")
  public_key=$(safe_string "$(query_param_value "$query" pbk 2>/dev/null || true)")
  short_id=$(safe_string "$(query_param_value "$query" sid 2>/dev/null || true)")
  fingerprint=$(safe_string "$(query_param_value "$query" fp 2>/dev/null || true)")
  alpn=$(safe_string "$(query_param_value "$query" alpn 2>/dev/null || true)")
  flow=$(safe_string "$(query_param_value "$query" flow 2>/dev/null || true)")
  path=$(safe_string "$(query_param_value "$query" path 2>/dev/null || true)")
  host_header=$(safe_string "$(query_param_value "$query" host 2>/dev/null || true)")
  grpc_service_name=$(safe_string "$(query_param_value "$query" serviceName 2>/dev/null || true)")
  packet_encoding=$(safe_string "$(query_param_value "$query" packetEncoding 2>/dev/null || query_param_value "$query" 'packet-encoding' 2>/dev/null || true)")
  allow_insecure=$(safe_string "$(query_param_value "$query" allowInsecure 2>/dev/null || true)" '0')
  support_mlkem='false'
  case "$security:$encryption" in
    reality:mlkem768x25519plus*)
      support_mlkem='true'
      ;;
  esac

  printf '{'
  printf '"name":%s' "$(json_string "$name")"
  printf ',"type":"vless"'
  printf ',"server":%s' "$(json_string "$server")"
  printf ',"port":%s' "$port"
  printf ',"uuid":%s' "$(json_string "$uuid")"
  printf ',"udp":true'
  printf ',"network":%s' "$(json_string "$network")"

  case "$security" in
    reality|tls)
      printf ',"tls":true'
      ;;
  esac

  [ -n "$sni" ] && printf ',"servername":%s' "$(json_string "$sni")"
  case "$allow_insecure" in
    1|true|TRUE|yes|YES|on|ON)
      printf ',"skip-cert-verify":true'
      ;;
  esac
  case "$security" in
    reality|tls)
      if [ -n "$fingerprint" ]; then
        printf ',"client-fingerprint":%s' "$(json_string "$fingerprint")"
      else
        printf ',"client-fingerprint":"chrome"'
      fi
      ;;
    *)
      [ -n "$fingerprint" ] && printf ',"client-fingerprint":%s' "$(json_string "$fingerprint")"
      ;;
  esac
  if [ -n "$alpn" ]; then
    alpn_json=$(ALPN="$alpn" yq -n -o=json 'strenv(ALPN) | split(",") | map(select(length > 0))' 2>/dev/null || printf '[]')
    printf ',"alpn":%s' "$alpn_json"
  fi
  [ -n "$flow" ] && printf ',"flow":%s' "$(json_string "$flow")"
  [ -n "$encryption" ] && printf ',"encryption":%s' "$(json_string "$encryption")"
  [ -n "$packet_encoding" ] && printf ',"packet-encoding":%s' "$(json_string "$packet_encoding")"
  case "$packet_encoding" in
    ''|xudp)
      printf ',"xudp":true'
      ;;
    packet)
      printf ',"packet-addr":true'
      ;;
  esac

  if [ "$security" = "reality" ] || [ -n "$public_key" ] || [ -n "$short_id" ]; then
    printf ',"reality-opts":{'
    reality_first=1
    if [ -n "$public_key" ]; then
      printf '"public-key":%s' "$(json_string "$public_key")"
      reality_first=0
    fi
    if [ -n "$short_id" ]; then
      [ "$reality_first" -eq 1 ] || printf ','
      printf '"short-id":%s' "$(json_string "$short_id")"
      reality_first=0
    fi
    if [ "$support_mlkem" = 'true' ]; then
      [ "$reality_first" -eq 1 ] || printf ','
      printf '"support-x25519mlkem768":true'
    fi
    printf '}'
  fi

  case "$network" in
    ws)
      printf ',"ws-opts":{'
      ws_first=1
      if [ -n "$path" ]; then
        printf '"path":%s' "$(json_string "$path")"
        ws_first=0
      fi
      if [ -n "$host_header" ]; then
        [ "$ws_first" -eq 1 ] || printf ','
        printf '"headers":{"Host":%s}' "$(json_string "$host_header")"
      fi
      printf '}'
      ;;
    grpc)
      printf ',"grpc-opts":{'
      if [ -n "$grpc_service_name" ]; then
        printf '"grpc-service-name":%s' "$(json_string "$grpc_service_name")"
      fi
      printf '}'
      ;;
  esac

  printf '}'
}

try_decode_subscription_payload() {
  payload="$1"
  output_file="$2"

  [ -n "$payload" ] || return 1

  remainder=$(( ${#payload} % 4 ))
  case "$remainder" in
    0) padded_payload="$payload" ;;
    2) padded_payload="${payload}==" ;;
    3) padded_payload="${payload}=" ;;
    *) return 1 ;;
  esac

  if command -v base64 >/dev/null 2>&1; then
    printf '%s' "$padded_payload" | base64 -d > "$output_file" 2>/dev/null || true
    grep -Eiq '^[[:space:]]*vless://' "$output_file" && return 0
  fi

  if command -v openssl >/dev/null 2>&1; then
    printf '%s' "$padded_payload" | openssl base64 -d -A > "$output_file" 2>/dev/null || true
    grep -Eiq '^[[:space:]]*vless://' "$output_file" && return 0
  fi

  if command -v yq >/dev/null 2>&1; then
    PAYLOAD="$padded_payload" yq -n -r 'strenv(PAYLOAD) | @base64d' > "$output_file" 2>/dev/null || true
    grep -Eiq '^[[:space:]]*vless://' "$output_file" && return 0
  fi

  return 1
}

decode_subscription_payload() {
  source_file="$1"
  output_file="$2"

  encoded_payload=$(tr -d '\r\n\t ' < "$source_file")
  [ -n "$encoded_payload" ] || return 1

  try_decode_subscription_payload "$encoded_payload" "$output_file" && return 0

  normalized_payload=$(printf '%s' "$encoded_payload" | tr '_-' '/+')
  if [ "$normalized_payload" != "$encoded_payload" ]; then
    try_decode_subscription_payload "$normalized_payload" "$output_file" && return 0
  fi

  return 1
}

build_uri_subscription_profile() {
  source_file="$1"
  output_file="$2"
  decoded_file="$TMP_DIR/subscription-lines.$$.txt"
  json_file="$TMP_DIR/subscription-lines.$$.json"

  if grep -Eiq '^[[:space:]]*vless://' "$source_file"; then
    cp "$source_file" "$decoded_file"
  else
    decode_subscription_payload "$source_file" "$decoded_file" || return 1
  fi

  printf '{"proxies":[' > "$json_file"
  first_proxy=1
  while IFS= read -r raw_line || [ -n "$raw_line" ]; do
    line=$(safe_string "$raw_line")
    [ -n "$line" ] || continue
    case "$line" in
      \#*) continue ;;
    esac
    proxy_json=$(parse_vless_uri_to_json "$line" 2>/dev/null || true)
    [ -n "$proxy_json" ] || continue
    if [ "$first_proxy" -eq 1 ]; then
      first_proxy=0
    else
      printf ',' >> "$json_file"
    fi
    printf '%s' "$proxy_json" >> "$json_file"
  done < "$decoded_file"
  [ "$first_proxy" -eq 0 ] || return 1
  printf '],"proxy-groups":[],"rules":["MATCH,DIRECT"]}\n' >> "$json_file"

  yq -p json -o=yaml '.' "$json_file" > "$output_file" 2>/dev/null || return 1
  is_valid_profile_file "$output_file"
}

refresh_subscription_with_bridge_fallback() {
  section="$1"
  subscription_url=$(uci -q get "nikki.$section.url" 2>/dev/null || true)
  subscription_user_agent=$(uci -q get "nikki.$section.user_agent" 2>/dev/null || printf 'clash')
  [ -n "$subscription_url" ] || return 1

  tmp_raw="$TMP_DIR/subscription-$(safe_id "$section").raw"
  tmp_profile="$TMP_DIR/subscription-$(safe_id "$section").yaml"
  mkdir -p "$SUBSCRIPTIONS_DIR"
  if ! curl -sSfL --connect-timeout 15 --max-time 120 --retry 3 -A "$subscription_user_agent" -o "$tmp_raw" "$subscription_url"; then
    set_subscription_refresh_result "$section" 0
    return 1
  fi

  if is_valid_profile_file "$tmp_raw"; then
    cp "$tmp_raw" "$SUBSCRIPTIONS_DIR/$section.yaml"
    set_subscription_refresh_result "$section" 1
    return 0
  fi

  if build_uri_subscription_profile "$tmp_raw" "$tmp_profile"; then
    cp "$tmp_profile" "$SUBSCRIPTIONS_DIR/$section.yaml"
    set_subscription_refresh_result "$section" 1
    return 0
  fi

  set_subscription_refresh_result "$section" 0
  return 1
}

make_unique_name() {
  original_name="$1"
  subscription_label="$2"
  seen_file="$3"
  [ -n "$original_name" ] || original_name='Proxy'
  base_name="$original_name"
  if grep -Fqx "$base_name" "$seen_file" 2>/dev/null; then
    if [ -n "$subscription_label" ] && [ "$subscription_label" != "$original_name" ]; then
      base_name="$original_name [$subscription_label]"
    fi
  fi
  candidate_name="$base_name"
  suffix=2
  while grep -Fqx "$candidate_name" "$seen_file" 2>/dev/null; do
    candidate_name="$base_name #$suffix"
    suffix=$((suffix + 1))
  done
  printf '%s\n' "$candidate_name" >> "$seen_file"
  printf '%s\n' "$candidate_name"
}

inventory_file_has_nodes() {
  [ -s "$PANEL_INVENTORY" ] || return 1
  node_count=$(yq -p json -r '(.nodes // []) | length' "$PANEL_INVENTORY" 2>/dev/null || echo 0)
  case "$node_count" in
    ''|*[!0-9]*) return 1 ;;
  esac
  [ "$node_count" -gt 0 ]
}

schedule_inventory_rebuild() {
  inventory_file_has_nodes && return 0
  if mkdir "$INVENTORY_REBUILD_LOCK" >/dev/null 2>&1; then
    if command -v setsid >/dev/null 2>&1; then
      setsid sh -c '
        "$1" run-job pool-refresh || true
        rmdir "$2" >/dev/null 2>&1 || true
      ' sh "$SELF_SCRIPT" "$INVENTORY_REBUILD_LOCK" </dev/null >/dev/null 2>&1 &
    elif command -v nohup >/dev/null 2>&1; then
      nohup sh -c '
        "$1" run-job pool-refresh || true
        rmdir "$2" >/dev/null 2>&1 || true
      ' sh "$SELF_SCRIPT" "$INVENTORY_REBUILD_LOCK" >/dev/null 2>&1 </dev/null &
    else
      (
        trap '' HUP
        exec </dev/null >/dev/null 2>&1
        "$SELF_SCRIPT" run-job pool-refresh || true
        rmdir "$INVENTORY_REBUILD_LOCK" >/dev/null 2>&1 || true
      ) &
    fi
  fi
}

build_runtime_inventory_file() {
  runtime_file="$TMP_DIR/runtime-inventory.$$"
  [ -f "$runtime_file" ] && {
    printf '%s\n' "$runtime_file"
    return
  }

  nodes_file="$TMP_DIR/runtime-nodes-jsonl.$$"
  by_subscription_file="$TMP_DIR/runtime-by-subscription-jsonl.$$"
  subscription_ids_file="$TMP_DIR/runtime-subscription-ids.$$"
  active_names_file="$TMP_DIR/runtime-active-names.$$"
  subscription_meta="$TMP_DIR/runtime-subscription-meta.$$"
  used_meta_file="$TMP_DIR/runtime-used-meta.$$"
  seen_names="$TMP_DIR/runtime-seen-proxy-names.$$"
  proxy_tmp="$TMP_DIR/runtime-proxy.$$"
  uci_json="$TMP_DIR/runtime-uci.$$"
  generic_used_file="$TMP_DIR/runtime-generic-used.$$"
  tab_char=$(printf '\t')

  : > "$nodes_file"
  : > "$by_subscription_file"
  : > "$subscription_ids_file"
  : > "$active_names_file"
  : > "$subscription_meta"
  : > "$used_meta_file"
  : > "$seen_names"

  if is_valid_profile_file "$CLIENT_PROFILE"; then
    yq -r '.proxies[]?.name // ""' "$CLIENT_PROFILE" 2>/dev/null | awk 'NF' > "$active_names_file"
  fi

  if [ -s "$active_names_file" ]; then
    ubus call uci get '{"config":"nikki"}' > "$uci_json" 2>/dev/null || : > "$uci_json"
    if [ -s "$uci_json" ]; then
      yq -r '.values | to_entries[] | select(.value.".type" == "subscription") | [.value.".name", (.value.name // "")] | @tsv' "$uci_json" 2>/dev/null > "$subscription_meta" || true
    fi
    if [ ! -s "$subscription_meta" ]; then
      uci show nikki | sed -n "s/^nikki\.\([^.=]*\)=subscription$/\1/p" | while IFS= read -r section; do
        [ -n "$section" ] || continue
        label=$(uci -q get "nikki.$section.name" 2>/dev/null || printf '%s' "$section")
        printf '%s\t%s\n' "$section" "$label"
      done > "$subscription_meta"
    fi

    while IFS="$tab_char" read -r subscription_section subscription_label; do
      [ -n "$subscription_section" ] || continue
      subscription_file="$SUBSCRIPTIONS_DIR/$subscription_section.yaml"
      if ! is_valid_profile_file "$subscription_file"; then
        continue
      fi
      subscription_proxy_count=$(profile_proxy_count "$subscription_file")
      idx=0
      while [ "$idx" -lt "$subscription_proxy_count" ]; do
        proxy_name=$(yq -r ".proxies[$idx].name // \"\"" "$subscription_file" 2>/dev/null || true)
        unique_name=$(make_unique_name "$proxy_name" "${subscription_label:-$subscription_section}" "$seen_names")
        if grep -Fqx "$unique_name" "$active_names_file" 2>/dev/null; then
          proxy_protocol=$(yq -r ".proxies[$idx].type // .proxies[$idx].proto // .proxies[$idx].protocol // \"\"" "$subscription_file" 2>/dev/null || true)
          proxy_server=$(yq -r ".proxies[$idx].server // \"\"" "$subscription_file" 2>/dev/null || true)
          subscription_display=$(safe_string "$subscription_label" "$subscription_section")
          printf '%s\n' "$subscription_section" >> "$subscription_ids_file"
          printf '{"id":%s,"name":%s,"label":%s,"subscriptionId":%s,"subscriptionName":%s,"protocol":%s,"provider":%s,"server":%s,"region":"??","egressCountry":"??","egressIp":"","egressProvider":%s,"latency":0,"jitter":0,"rxMbps":0,"txMbps":0,"score":1,"trend":[],"inPool":true,"reason":null}\n' \
            "$(json_string "$unique_name")" \
            "$(json_string "$unique_name")" \
            "$(json_string "$unique_name")" \
            "$(json_string "$subscription_section")" \
            "$(json_string "$subscription_display")" \
            "$(json_string "$proxy_protocol")" \
            "$(json_string "$subscription_display")" \
            "$(json_string "$proxy_server")" \
            "$(json_string "$subscription_display")" >> "$nodes_file"
          printf '%s\t%s\t%s\t%s\n' "$subscription_section" "$subscription_display" "$unique_name" '??' >> "$used_meta_file"
        fi
        idx=$((idx + 1))
      done
    done < "$subscription_meta"
  fi

  if [ ! -s "$nodes_file" ] && is_valid_profile_file "$CLIENT_PROFILE"; then
    client_proxy_count=$(profile_proxy_count "$CLIENT_PROFILE")
    idx=0
    while [ "$idx" -lt "$client_proxy_count" ]; do
      proxy_name=$(yq -r ".proxies[$idx].name // \"\"" "$CLIENT_PROFILE" 2>/dev/null || true)
      [ -n "$proxy_name" ] || {
        idx=$((idx + 1))
        continue
      }
      proxy_protocol=$(yq -r ".proxies[$idx].type // .proxies[$idx].proto // .proxies[$idx].protocol // \"\"" "$CLIENT_PROFILE" 2>/dev/null || true)
      proxy_server=$(yq -r ".proxies[$idx].server // \"\"" "$CLIENT_PROFILE" 2>/dev/null || true)
      printf '%s\n' 'runtime' >> "$subscription_ids_file"
      printf '{"id":%s,"name":%s,"label":%s,"subscriptionId":"runtime","subscriptionName":"Runtime pool","protocol":%s,"provider":"Runtime pool","server":%s,"region":"??","egressCountry":"??","egressIp":"","egressProvider":"Runtime pool","latency":0,"jitter":0,"rxMbps":0,"txMbps":0,"score":1,"trend":[],"inPool":true,"reason":null}\n' \
        "$(json_string "$proxy_name")" \
        "$(json_string "$proxy_name")" \
        "$(json_string "$proxy_name")" \
        "$(json_string "$proxy_protocol")" \
        "$(json_string "$proxy_server")" >> "$nodes_file"
      printf '%s\t%s\t%s\t%s\n' 'runtime' 'Runtime pool' "$proxy_name" '??' >> "$used_meta_file"
      idx=$((idx + 1))
    done
  fi

  if [ -s "$nodes_file" ]; then
    sort -u "$subscription_ids_file" | while IFS= read -r subscription_id; do
      [ -n "$subscription_id" ] || continue
      subscription_name=$(awk -F '\t' -v sid="$subscription_id" '$1 == sid { print $2; exit }' "$used_meta_file")
      case "$subscription_id" in
        runtime) subscription_name='Runtime pool' ;;
        *)
          if [ -z "$subscription_name" ]; then
            subscription_name=$(awk -F '\t' -v sid="$subscription_id" '$1 == sid { print $2; exit }' "$subscription_meta")
          fi
          ;;
      esac
      used_nodes_file="$TMP_DIR/runtime-used-$subscription_id.jsonl.$$"
      used_json_file="$TMP_DIR/runtime-used-$subscription_id.json.$$"
      rejected_json_file="$TMP_DIR/runtime-rejected-$subscription_id.json.$$"
      printf '[]' > "$rejected_json_file"
      : > "$used_nodes_file"
      awk -F '\t' -v sid="$subscription_id" '$1 == sid { print $3 "\t" $4 }' "$used_meta_file" \
        | while IFS="$(printf '\t')" read -r node_label node_country; do
            [ -n "$node_label" ] || continue
            printf '{"label":%s,"egressCountry":%s}\n' \
              "$(json_string "$node_label")" \
              "$(json_string "$(safe_string "$node_country" '??')")" >> "$used_nodes_file"
          done
      if [ -s "$used_nodes_file" ]; then
        jsonl_to_array "$used_nodes_file" > "$used_json_file"
      else
        printf '[]' > "$used_json_file"
      fi
      subscription_name_safe=$(safe_string "$subscription_name" "$subscription_id")
      printf '{"subscriptionId":%s,"subscriptionName":%s,"used":%s,"rejected":%s}\n' \
        "$(json_string "$subscription_id")" \
        "$(json_string "$subscription_name_safe")" \
        "$(cat "$used_json_file")" \
        "$(cat "$rejected_json_file")" >> "$by_subscription_file"
    done
  fi

  discovered=$(awk 'NF { c++ } END { print c + 0 }' "$nodes_file")
  nodes_json_file="$TMP_DIR/runtime-nodes-array.$$"
  by_subscription_json_file="$TMP_DIR/runtime-by-subscription-array.$$"
  if [ -s "$nodes_file" ]; then
    jsonl_to_array "$nodes_file" > "$nodes_json_file"
  else
    printf '[]' > "$nodes_json_file"
  fi
  if [ -s "$by_subscription_file" ]; then
    jsonl_to_array "$by_subscription_file" > "$by_subscription_json_file"
  else
    printf '[]' > "$by_subscription_json_file"
  fi
  updated_at="$(now_iso)"
  printf '{"updatedAt":%s,"summary":{"discovered":%s,"used":%s,"rejected":0,"skipped":0},"nodes":%s,"bySubscription":%s}\n' \
    "$(json_string "$updated_at")" \
    "$discovered" \
    "$discovered" \
    "$(cat "$nodes_json_file")" \
    "$(cat "$by_subscription_json_file")" > "$runtime_file"
  printf '%s\n' "$runtime_file"
}

inventory_source_file() {
  pool_refresh_status=$(scheduler_state_value "pool-refresh" "lastStatus")
  if [ "$pool_refresh_status" = 'running' ] || [ -d "$POOL_REFRESH_LOCK_DIR" ] || managed_subscriptions_present; then
    [ -f "$PANEL_INVENTORY" ] || write_empty_inventory
    printf '%s\n' "$PANEL_INVENTORY"
    return
  fi
  if inventory_file_has_nodes; then
    printf '%s\n' "$PANEL_INVENTORY"
    return
  fi
  schedule_inventory_rebuild
  build_runtime_inventory_file
}

bootstrap_due() {
  [ -s "$BOOTSTRAP_STAMP" ] || { debug_mark 'bootstrap-due:missing-stamp'; return 0; }
  [ "$0" -nt "$BOOTSTRAP_STAMP" ] && { debug_mark "bootstrap-due:script:$0"; return 0; }
  [ "$PANEL_MODEL" -nt "$BOOTSTRAP_STAMP" ] && { debug_mark "bootstrap-due:model:$PANEL_MODEL"; return 0; }
  return 1
}

mark_bootstrapped() {
  : > "$BOOTSTRAP_STAMP" 2>/dev/null || true
}

run_bootstrap_maintenance() {
  debug_mark 'bootstrap:start'
  migrate_panel_base_paths
  debug_mark 'bootstrap:migrated-base-paths'
  ensure_web_wrapper || true
  debug_mark 'bootstrap:ensured-wrapper'
  cleanup_internal_panel_entities
  debug_mark 'bootstrap:cleaned-internal'
  ensure_inventory
  debug_mark 'bootstrap:ensured-inventory'
  enable_panel_rule_mixins
  debug_mark 'bootstrap:ensured-mixins'
  ensure_scheduler_settings
  debug_mark 'bootstrap:ensured-scheduler-settings'
  ensure_panel_preferences
  debug_mark 'bootstrap:ensured-panel-preferences'
  sync_scheduler_cron
  mark_bootstrapped
  debug_mark 'bootstrap:done'
}

ensure_model() {
  if model_schema_valid; then
    if bootstrap_due; then
      run_bootstrap_maintenance
    fi
    return
  fi

  cat > "$PANEL_MODEL" <<'EOF'
{
  "schema": 1,
  "settings": {
    "egressPolicy": {
      "blockedCountries": ["RU"],
      "allowUnknown": false
    },
    "autoSelection": {
      "metric": "latency",
      "intervalMinutes": 10,
      "stickyBest": true,
      "minScore": 55,
      "switchTolerance": 120,
      "delayUrl": "https://chatgpt.com/cdn-cgi/trace",
      "speedUrl": "https://speed.cloudflare.com/__down?bytes=262144"
    },
    "automation": {
      "enabled": true,
      "subscriptionRefreshMinutes": 360,
      "logCleanupMinutes": 5,
      "releaseCheckMinutes": 30,
      "uiAutoUpdate": true,
      "bridgeAutoUpdate": true,
      "manifestUrl": "https://github.com/BlackF1re/mission-control/releases/latest/download/mission-control-manifest.json"
    },
    "routing": {
      "mode": "smart",
      "globalTarget": "AUTO BEST",
      "blockedTarget": "auto",
      "manualServerId": ""
    },
    "panel": {
      "theme": "graphite",
      "density": "comfortable",
      "scale": 100,
      "animations": true,
      "autoRefresh": true,
      "graphRange": 30,
      "chartLineWidth": 3,
      "speedUnitMode": "bits",
      "storageUnitSystem": "binary",
      "language": "ru"
    },
    "controller": {
      "selectorGroup": "GLOBAL",
      "delayUrl": "https://www.gstatic.com/generate_204",
      "delayTimeout": 5000,
      "pollIntervalMs": 2000,
      "useWebSocket": true
    },
    "runtime": {
      "mihomoMemoryLimitMiB": 0
    }
  },
  "bases": [
    {
      "id": "direct-domains",
      "name": "Direct override domains",
      "scope": "direct",
      "kind": "domains",
      "sourceType": "local",
      "format": "plain-list",
      "sourceUrl": "",
      "runtimeMode": "local-lines",
      "autoUpdate": false,
      "updateEveryHours": 0,
      "enabled": true,
      "filePath": "/etc/nikki/run/providers/rule/direct-domains.txt",
      "providerSection": "rule_provider_direct_domains",
      "providerName": "DIRECT-DOMAINS",
      "note": "Highest priority direct exclusions"
    },
    {
      "id": "direct-ip",
      "name": "Direct override IPs",
      "scope": "direct",
      "kind": "ips",
      "sourceType": "local",
      "format": "plain-list",
      "sourceUrl": "",
      "runtimeMode": "local-lines",
      "autoUpdate": false,
      "updateEveryHours": 0,
      "enabled": true,
      "filePath": "/etc/nikki/run/providers/rule/direct-ip.txt",
      "providerSection": "rule_provider_direct_ip",
      "providerName": "DIRECT-IP",
      "note": "Manual direct IP exclusions"
    },
    {
      "id": "proxy-domains",
      "name": "Manual proxy domains",
      "scope": "proxy",
      "kind": "domains",
      "sourceType": "local",
      "format": "plain-list",
      "sourceUrl": "",
      "runtimeMode": "local-lines",
      "autoUpdate": false,
      "updateEveryHours": 0,
      "enabled": true,
      "filePath": "/etc/nikki/run/providers/rule/proxy-domains.txt",
      "providerSection": "rule_provider_proxy_domains",
      "providerName": "PROXY-DOMAINS",
      "note": "Manual proxy domain exceptions"
    },
    {
      "id": "proxy-ip",
      "name": "Manual proxy IPs",
      "scope": "proxy",
      "kind": "ips",
      "sourceType": "local",
      "format": "plain-list",
      "sourceUrl": "",
      "runtimeMode": "local-lines",
      "autoUpdate": false,
      "updateEveryHours": 0,
      "enabled": true,
      "filePath": "/etc/nikki/run/providers/rule/proxy-ip.txt",
      "providerSection": "rule_provider_proxy_ip",
      "providerName": "PROXY-IP",
      "note": "Manual proxy IP exceptions"
    },
    {
      "id": "ru-blocked-domains",
      "name": "RU blocked domains",
      "scope": "proxy",
      "kind": "domains",
      "sourceType": "remote",
      "format": "geosite-dat",
      "sourceUrl": "https://github.com/runetfreedom/russia-blocked-geosite/releases/latest/download/geosite-ru-only.dat",
      "runtimeMode": "converted-text-ruleset",
      "autoUpdate": true,
      "updateEveryHours": 12,
      "enabled": true,
      "filePath": "/etc/nikki/run/providers/rule/ru-blocked-domains.txt",
      "providerSection": "rule_provider_ru_domains",
      "providerName": "RU-BLOCKED-DOMAINS",
      "note": "runetfreedom RU-only domain source"
    },
    {
      "id": "ru-blocked-ip",
      "name": "RU blocked IP ranges",
      "scope": "proxy",
      "kind": "ips",
      "sourceType": "remote",
      "format": "geoip-dat",
      "sourceUrl": "https://github.com/runetfreedom/russia-blocked-geoip/releases/latest/download/geoip-ru-only.dat",
      "runtimeMode": "converted-text-ruleset",
      "autoUpdate": true,
      "updateEveryHours": 12,
      "enabled": true,
      "filePath": "/etc/nikki/run/providers/rule/ru-blocked-ip.txt",
      "providerSection": "rule_provider_ru_ip",
      "providerName": "RU-BLOCKED-IP",
      "note": "runetfreedom RU-only IP source"
    }
  ],
  "rules": [
    {
      "id": "direct-overrides",
      "name": "DIRECT overrides",
      "priority": 10,
      "action": "DIRECT",
      "target": "DIRECT",
      "enabled": true,
      "locked": false,
      "matchMode": "any",
      "baseIds": ["direct-domains", "direct-ip"],
      "note": "Highest priority. These entries stay direct even if another base would tunnel them."
    },
    {
      "id": "proxy-domains-rule",
      "name": "Proxy domains",
      "priority": 20,
      "action": "PROXY",
      "target": "BLOCKED SITES",
      "enabled": true,
      "locked": false,
      "matchMode": "any",
      "baseIds": ["ru-blocked-domains", "proxy-domains"],
      "note": "Blocked and manual domains use the tunnel."
    },
    {
      "id": "proxy-ip-rule",
      "name": "Proxy IP ranges",
      "priority": 30,
      "action": "PROXY",
      "target": "BLOCKED SITES",
      "enabled": true,
      "locked": false,
      "matchMode": "any",
      "baseIds": ["ru-blocked-ip", "proxy-ip"],
      "note": "Blocked and manual IP ranges use the tunnel."
    },
    {
      "id": "default-direct",
      "name": "Default direct fallback",
      "priority": 999,
      "action": "DIRECT",
      "target": "DIRECT",
      "enabled": true,
      "locked": true,
      "matchMode": "final",
      "baseIds": [],
      "note": "Everything else remains direct by default."
    }
  ]
}
EOF
  ensure_inventory
  MODEL_CREATED=1
  ensure_scheduler_settings
  ensure_panel_preferences
  sync_scheduler_cron
  mark_bootstrapped
}

save_model() {
  mv "$MODEL_TMP" "$PANEL_MODEL"
  debug_mark "save-model:$PANEL_MODEL"
  rm -f "$PANEL_STATE_CACHE"
}

migrate_panel_base_paths() {
  [ -s "$PANEL_MODEL" ] || return 0
  ids_file="$TMP_DIR/base-migrate-ids.$$"
  : > "$ids_file"
  model_query '.bases[]?.id // ""' > "$ids_file"
  changed=0
  uci_changed=0
  model_tmp_begin
  while IFS= read -r base_id; do
    [ -n "$base_id" ] || continue
    base_idx=$(base_index "$base_id")
    [ -n "$base_idx" ] || continue
    provider_section=$(base_provider_section "$base_id")
    file_path=$(base_file_for_id "$base_id")
    case "$provider_section" in
      panel_base_*)
        new_path=$(default_file_path_for_base "$base_id")
        current_uci_path=$(uci -q get "nikki.$provider_section.file_path" 2>/dev/null || true)
        if [ -n "$provider_section" ] && [ "$current_uci_path" != "$new_path" ]; then
          uci -q set "nikki.$provider_section.file_path=$new_path" >/dev/null 2>&1 || true
          uci_changed=1
        fi
        if [ "$file_path" != "$new_path" ]; then
          mkdir -p "$(dirname "$new_path")"
          if [ -f "$file_path" ]; then
            cp "$file_path" "$new_path"
            case "$file_path" in
              "$LEGACY_PANEL_BASE_DIR"/*) rm -f "$file_path" ;;
            esac
          elif [ ! -f "$new_path" ]; then
            : > "$new_path"
          fi
          FILE_PATH="$new_path" model_tmp_apply ".bases[$base_idx].filePath = strenv(FILE_PATH)"
          changed=1
        fi
        ;;
    esac
  done < "$ids_file"
  rm -f "$ids_file"
  if [ "$uci_changed" -eq 1 ]; then
    uci -q commit nikki >/dev/null 2>&1 || true
  fi
  if [ "$changed" -eq 1 ]; then
    save_model
  else
    rm -f "$MODEL_TMP"
  fi
}

write_json_file() {
  file="$1"
  body="$2"
  printf '%s\n' "$body" > "$file"
}

model_tmp_begin() {
  cp "$PANEL_MODEL" "$MODEL_TMP"
}

model_tmp_apply() {
  expr="$1"
  yq -p json -o=json "$expr" "$MODEL_TMP" > "$MODEL_NEXT"
  mv "$MODEL_NEXT" "$MODEL_TMP"
}

model_update() {
  expr="$1"
  shift || true
  yq -p json -o=json "$expr" "$PANEL_MODEL" > "$MODEL_TMP"
  save_model
}

model_query() {
  expr="$1"
  yq -p json -r "$expr" "$PANEL_MODEL" 2>/dev/null || true
}

model_query_default() {
  expr="$1"
  fallback="${2:-}"
  value=$(null_to_empty "$(model_query "$expr")")
  if [ -n "$value" ]; then
    printf '%s\n' "$value"
  else
    printf '%s\n' "$fallback"
  fi
}

model_has_value() {
  expr="$1"
  yq -p json -e "($expr) != null" "$PANEL_MODEL" >/dev/null 2>&1
}

model_schema_valid() {
  [ -s "$PANEL_MODEL" ] || return 1
  grep -q '"schema"[[:space:]]*:[[:space:]]*1' "$PANEL_MODEL" 2>/dev/null
}

model_json_query() {
  expr="$1"
  fallback="${2:-null}"
  result=$(yq -p json -o=json "$expr" "$PANEL_MODEL" 2>/dev/null || true)
  if [ -n "$result" ]; then
    printf '%s' "$result"
  else
    printf '%s' "$fallback"
  fi
}

model_bool() {
  value=$(model_query "$1")
  case "$value" in
    true|1) printf '1' ;;
    *) printf '0' ;;
  esac
}

model_bool_default() {
  expr="$1"
  fallback="${2:-false}"
  value=$(sanitize_bool "$(model_query_default "$expr" "$fallback")" "$fallback")
  case "$value" in
    true|1) printf '1' ;;
    *) printf '0' ;;
  esac
}

model_bool_text_default() {
  expr="$1"
  fallback="${2:-false}"
  sanitize_bool "$(model_query_default "$expr" "$fallback")" "$fallback"
}

ensure_scheduler_state() {
  scheduler_json=$(scheduler_state_normalized_json 2>/dev/null || true)
  if [ -n "$scheduler_json" ]; then
    return 0
  fi
  scheduler_state_lock || return 1
  ensure_scheduler_state_unlocked
  scheduler_state_unlock
}

scheduler_state_default_json() {
  printf '{"updatedAt":"","jobs":{}}\n'
}

scheduler_state_recover_stale_lock() {
  [ -f "$SCHEDULER_STATE_LOCK_FILE" ] || return 1
  lock_pid=$(cat "$SCHEDULER_STATE_LOCK_FILE" 2>/dev/null || true)
  case "$lock_pid" in
    ''|*[!0-9]*) return 1 ;;
  esac
  if kill -0 "$lock_pid" >/dev/null 2>&1; then
    return 1
  fi
  rm -f "$SCHEDULER_STATE_LOCK_FILE" >/dev/null 2>&1 || true
  return 0
}

scheduler_state_lock() {
  attempts=0
  while ! lock -n "$SCHEDULER_STATE_LOCK_FILE" >/dev/null 2>&1; do
    attempts=$((attempts + 1))
    scheduler_state_recover_stale_lock || true
    [ "$attempts" -ge 5 ] && return 1
    sleep 1
  done
  return 0
}

scheduler_state_unlock() {
  lock -u "$SCHEDULER_STATE_LOCK_FILE" >/dev/null 2>&1 || true
}

scheduler_state_normalized_json() {
  [ -s "$SCHEDULER_STATE_FILE" ] || return 1
  yq -p json -o=json 'select(documentIndex == 0)' "$SCHEDULER_STATE_FILE" 2>/dev/null
}

ensure_scheduler_state_unlocked() {
  scheduler_json=$(scheduler_state_normalized_json 2>/dev/null || true)
  if [ -n "$scheduler_json" ]; then
    printf '%s\n' "$scheduler_json" > "$SCHEDULER_STATE_FILE"
    return 0
  fi
  scheduler_state_default_json > "$SCHEDULER_STATE_FILE"
}

scheduler_state_value() {
  ensure_scheduler_state >/dev/null 2>&1 || true
  job_id="$1"
  field="$2"
  JOB_ID="$job_id" FIELD_NAME="$field" yq -p json -r '.jobs[strenv(JOB_ID)][strenv(FIELD_NAME)] // ""' "$SCHEDULER_STATE_FILE" 2>/dev/null || true
}

scheduler_state_upsert() {
  job_id="$1"
  field="$2"
  value="$3"
  tmp="$TMP_DIR/scheduler-state.$$"
  scheduler_state_lock || return 1
  ensure_scheduler_state_unlocked
  if JOB_ID="$job_id" FIELD_NAME="$field" FIELD_VALUE="$value" UPDATED_AT="$(now_iso)" \
    yq -p json -o=json '
      .updatedAt = strenv(UPDATED_AT) |
      .jobs = (.jobs // {}) |
      .jobs[strenv(JOB_ID)] = ((.jobs[strenv(JOB_ID)] // {}) + { (strenv(FIELD_NAME)): strenv(FIELD_VALUE) })
    ' "$SCHEDULER_STATE_FILE" > "$tmp"; then
    mv "$tmp" "$SCHEDULER_STATE_FILE"
    scheduler_state_unlock
    return 0
  fi
  rm -f "$tmp"
  scheduler_state_unlock
  return 1
}

scheduler_mark_started() {
  job_id="$1"
  started_at="$(now_iso)"
  started_epoch="$(now_epoch)"
  scheduler_state_upsert "$job_id" "lastStartedAt" "$started_at"
  scheduler_state_upsert "$job_id" "lastStartedEpoch" "$started_epoch"
  scheduler_state_upsert "$job_id" "lastStatus" "running"
  scheduler_state_upsert "$job_id" "lastError" ""
}

scheduler_mark_success() {
  job_id="$1"
  finished_at="$(now_iso)"
  finished_epoch="$(now_epoch)"
  scheduler_state_upsert "$job_id" "lastFinishedAt" "$finished_at"
  scheduler_state_upsert "$job_id" "lastFinishedEpoch" "$finished_epoch"
  scheduler_state_upsert "$job_id" "lastSuccessAt" "$finished_at"
  scheduler_state_upsert "$job_id" "lastSuccessEpoch" "$finished_epoch"
  scheduler_state_upsert "$job_id" "lastStatus" "ok"
  scheduler_state_upsert "$job_id" "lastError" ""
}

scheduler_mark_failure() {
  job_id="$1"
  error_text="$2"
  finished_at="$(now_iso)"
  finished_epoch="$(now_epoch)"
  scheduler_state_upsert "$job_id" "lastFinishedAt" "$finished_at"
  scheduler_state_upsert "$job_id" "lastFinishedEpoch" "$finished_epoch"
  scheduler_state_upsert "$job_id" "lastStatus" "error"
  scheduler_state_upsert "$job_id" "lastError" "$error_text"
}

mission_control_manifest_url() {
  model_query_default '.settings.automation.manifestUrl' "$MISSION_CONTROL_MANIFEST_URL_DEFAULT"
}

mission_control_release_check_minutes() {
  model_query ".settings.automation.releaseCheckMinutes // $MISSION_CONTROL_RELEASE_CHECK_MINUTES_DEFAULT"
}

mission_control_ui_auto_update_enabled() {
  [ "$(model_bool_default '.settings.automation.uiAutoUpdate' 'true')" = "1" ]
}

mission_control_bridge_auto_update_enabled() {
  [ "$(model_bool_default '.settings.automation.bridgeAutoUpdate' 'true')" = "1" ]
}

mark_release_probe() {
  field="$1"
  value="$2"
  scheduler_state_upsert "mission-control-update" "$field" "$value"
}

read_manifest_value() {
  manifest_file="$1"
  expr="$2"
  yq -p json -r "$expr // \"\"" "$manifest_file" 2>/dev/null || true
}

is_semver_value() {
  printf '%s' "${1:-}" | grep -Eq '^[0-9]+\.[0-9]+\.[0-9]+$'
}

version_should_update() {
  latest="$1"
  current="$2"
  [ -n "$latest" ] || return 1
  [ "$latest" != "$current" ] || return 1
  if is_semver_value "$latest" && is_semver_value "$current"; then
    latest_major=${latest%%.*}
    latest_rest=${latest#*.}
    latest_minor=${latest_rest%%.*}
    latest_patch=${latest_rest#*.}
    current_major=${current%%.*}
    current_rest=${current#*.}
    current_minor=${current_rest%%.*}
    current_patch=${current_rest#*.}
    [ "$latest_major" -gt "$current_major" ] && return 0
    [ "$latest_major" -lt "$current_major" ] && return 1
    [ "$latest_minor" -gt "$current_minor" ] && return 0
    [ "$latest_minor" -lt "$current_minor" ] && return 1
    [ "$latest_patch" -gt "$current_patch" ] && return 0
    return 1
  fi
  return 0
}

refresh_release_metadata_probe() {
  manifest_file="$1"
  release_api_url=$(mission_control_release_api_url)
  release_meta_file="$TMP_DIR/release-meta.$$"
  manifest_tag=$(safe_string "$(read_manifest_value "$manifest_file" '.tag')")
  [ -n "$manifest_tag" ] || manifest_tag=$(safe_string "$(read_manifest_value "$manifest_file" '.version')")

  mark_release_probe "latestTag" "$manifest_tag"
  mark_release_probe "latestPublishedAt" ""
  mark_release_probe "latestReleaseUrl" ""
  mark_release_probe "latestReleaseName" ""
  mark_release_probe "latestChangelog" ""

  [ -n "$release_api_url" ] || return 0
  if ! download_release_metadata "$release_api_url" "$release_meta_file"; then
    log_msg "Mission Control release metadata download failed: $release_api_url"
    return 0
  fi

  api_tag=$(safe_string "$(yq -p json -r '.tag_name // ""' "$release_meta_file" 2>/dev/null || true)")
  api_published_at=$(safe_string "$(yq -p json -r '.published_at // ""' "$release_meta_file" 2>/dev/null || true)")
  api_html_url=$(safe_string "$(yq -p json -r '.html_url // ""' "$release_meta_file" 2>/dev/null || true)")
  api_name=$(safe_string "$(yq -p json -r '.name // ""' "$release_meta_file" 2>/dev/null || true)")
  api_body=$(safe_string "$(yq -p json -r '.body // ""' "$release_meta_file" 2>/dev/null || true)")

  [ -n "$api_tag" ] && mark_release_probe "latestTag" "$api_tag"
  mark_release_probe "latestPublishedAt" "$api_published_at"
  mark_release_probe "latestReleaseUrl" "$api_html_url"
  mark_release_probe "latestReleaseName" "$api_name"
  mark_release_probe "latestChangelog" "$api_body"
}

list_bridge_update_targets() {
  seen_targets="|"
  for candidate in "$SELF_SCRIPT" "$0" "$LEGACY_BRIDGE_SCRIPT"; do
    [ -n "$candidate" ] || continue
    candidate="${candidate%%\?*}"
    case "$seen_targets" in
      *"|$candidate|"*) continue ;;
    esac
    if [ -f "$candidate" ] || [ "$candidate" = "$SELF_SCRIPT" ]; then
      printf '%s\n' "$candidate"
      seen_targets="${seen_targets}${candidate}|"
    fi
  done
}

extract_ui_archive() {
  archive_path="$1"
  target_dir="$2"
  unzip_cmd=$(require_unzip) || return 1
  rm -rf "$target_dir"
  mkdir -p "$target_dir"
  case "$unzip_cmd" in
    "busybox unzip")
      busybox unzip -oq "$archive_path" -d "$target_dir" >/dev/null
      ;;
    *)
      unzip -oq "$archive_path" -d "$target_dir" >/dev/null
      ;;
  esac
}

locate_ui_archive_root() {
  extracted_dir="$1"
  if [ -f "$extracted_dir/index.html" ]; then
    printf '%s\n' "$extracted_dir"
    return 0
  fi
  index_path=$(find "$extracted_dir" -mindepth 1 -maxdepth 2 -type f -name 'index.html' | head -n 1)
  [ -n "$index_path" ] || return 1
  dirname "$index_path"
}

apply_ui_release() {
  manifest_file="$1"
  ui_url=$(safe_string "$(read_manifest_value "$manifest_file" '.ui.url')")
  ui_sha=$(safe_string "$(read_manifest_value "$manifest_file" '.ui.sha256')")
  ui_version=$(safe_string "$(read_manifest_value "$manifest_file" '.ui.version')")
  [ -n "$ui_url" ] || return 1
  download_release_asset "$ui_url" "$DOWNLOAD_FILE"
  if [ -n "$ui_sha" ]; then
    actual_sha=$(sha256_file "$DOWNLOAD_FILE" || true)
    [ "$actual_sha" = "$ui_sha" ] || return 1
  fi
  extract_ui_archive "$DOWNLOAD_FILE" "$ARCHIVE_DIR"
  archive_root=$(locate_ui_archive_root "$ARCHIVE_DIR")
  [ -n "$archive_root" ] || return 1
  [ -f "$archive_root/index.html" ] || return 1
  tmp_ui_dir="$TMP_DIR/ui-next.$$"
  rm -rf "$tmp_ui_dir"
  mkdir -p "$tmp_ui_dir"
  cp -R "$archive_root"/. "$tmp_ui_dir"/
  rm -rf "$UI_DIR"
  mkdir -p "$UI_DIR"
  cp -R "$tmp_ui_dir"/. "$UI_DIR"/
  rm -rf "$tmp_ui_dir"
  if [ -n "$ui_version" ]; then
    mark_release_probe "currentUiVersion" "$ui_version"
  fi
}

apply_bridge_release() {
  manifest_file="$1"
  bridge_url=$(safe_string "$(read_manifest_value "$manifest_file" '.bridge.url')")
  bridge_sha=$(safe_string "$(read_manifest_value "$manifest_file" '.bridge.sha256')")
  bridge_version=$(safe_string "$(read_manifest_value "$manifest_file" '.bridge.version')")
  [ -n "$bridge_url" ] || return 1
  download_release_asset "$bridge_url" "$DOWNLOAD_FILE"
  if [ -n "$bridge_sha" ]; then
    actual_sha=$(sha256_file "$DOWNLOAD_FILE" || true)
    [ "$actual_sha" = "$bridge_sha" ] || return 1
  fi
  sh -n "$DOWNLOAD_FILE"
  targets_file="$TMP_DIR/bridge-targets.$$"
  self_stage_path=""
  list_bridge_update_targets > "$targets_file"
  [ -s "$targets_file" ] || printf '%s\n' "$SELF_SCRIPT" > "$targets_file"
  while IFS= read -r target; do
    [ -n "$target" ] || continue
    backup_path="$target.bak"
    stage_path="$target.next.$$"
    mkdir -p "$(dirname "$target")" || {
      rm -f "$targets_file"
      return 1
    }
    if [ "$target" = "$SELF_SCRIPT" ]; then
      rm -f "$stage_path"
      if ! cp "$DOWNLOAD_FILE" "$stage_path" || ! chmod 0755 "$stage_path" || ! sh -n "$stage_path"; then
        rm -f "$stage_path"
        rm -f "$targets_file"
        return 1
      fi
      self_stage_path="$stage_path"
      continue
    fi
    if [ -f "$target" ]; then
      cp "$target" "$backup_path" || {
        rm -f "$targets_file"
        return 1
      }
    fi
    rm -f "$stage_path"
    if ! cp "$DOWNLOAD_FILE" "$stage_path" || ! chmod 0755 "$stage_path" || ! sh -n "$stage_path" || ! mv -f "$stage_path" "$target"; then
      rm -f "$stage_path"
      if [ -f "$backup_path" ]; then
        cp "$backup_path" "$target" || true
        chmod 0755 "$target" || true
      fi
      rm -f "$targets_file"
      return 1
    fi
    rm -f "$backup_path"
  done < "$targets_file"
  rm -f "$targets_file"
  if [ -n "$self_stage_path" ]; then
    log_msg "Mission Control bridge self-update scheduled: stage=$self_stage_path target=$SELF_SCRIPT"
    if command -v setsid >/dev/null 2>&1; then
      setsid "$SELF_SCRIPT" finalize-bridge-update "$self_stage_path" >/dev/null 2>&1 < /dev/null &
    elif command -v nohup >/dev/null 2>&1; then
      nohup "$SELF_SCRIPT" finalize-bridge-update "$self_stage_path" >/dev/null 2>&1 &
    else
      "$SELF_SCRIPT" finalize-bridge-update "$self_stage_path" >/dev/null 2>&1 </dev/null &
    fi
  fi
  ensure_web_wrapper || return 1
  if [ -n "$bridge_version" ]; then
    mark_release_probe "currentBridgeVersion" "$bridge_version"
  fi
}

finalize_bridge_self_update() {
  self_stage_path="$1"
  log_msg "Mission Control bridge finalizer started: stage=$self_stage_path"
  [ -n "$self_stage_path" ] || return 1
  [ -f "$self_stage_path" ] || {
    log_msg "Mission Control bridge finalizer missing stage: $self_stage_path"
    return 1
  }
  attempt=0
  while [ "$attempt" -lt 20 ]; do
    attempt=$((attempt + 1))
    if [ -f "$SELF_SCRIPT" ]; then
      cp "$SELF_SCRIPT" "$SELF_SCRIPT.bak" >/dev/null 2>&1 || true
    fi
    if mv -f "$self_stage_path" "$SELF_SCRIPT"; then
      chmod 0755 "$SELF_SCRIPT" >/dev/null 2>&1 || true
      ensure_web_wrapper >/dev/null 2>&1 || true
      rm -f "$SELF_SCRIPT.bak" >/dev/null 2>&1 || true
      log_msg "Mission Control bridge finalizer succeeded on attempt $attempt"
      return 0
    fi
    log_msg "Mission Control bridge finalizer retry $attempt for stage=$self_stage_path"
    sleep 1
  done
  rm -f "$self_stage_path" >/dev/null 2>&1 || true
  if [ -f "$SELF_SCRIPT.bak" ]; then
    cp "$SELF_SCRIPT.bak" "$SELF_SCRIPT" >/dev/null 2>&1 || true
    chmod 0755 "$SELF_SCRIPT" >/dev/null 2>&1 || true
  fi
  log_msg "Mission Control bridge finalizer failed after $attempt attempts"
  return 1
}

run_mission_control_update_job() {
  update_mode="${1:-auto}"
  scheduler_mark_started "mission-control-update"
  manifest_url=$(mission_control_manifest_url)
  [ -n "$manifest_url" ] || {
    scheduler_mark_failure "mission-control-update" "Mission Control manifest URL is not configured."
    return 1
  }
  if ! download_release_asset "$manifest_url" "$DOWNLOAD_FILE"; then
    scheduler_mark_failure "mission-control-update" "Mission Control manifest download failed."
    return 1
  fi

  latest_version=$(safe_string "$(read_manifest_value "$DOWNLOAD_FILE" '.version')")
  latest_ui_version=$(safe_string "$(read_manifest_value "$DOWNLOAD_FILE" '.ui.version')")
  latest_bridge_version=$(safe_string "$(read_manifest_value "$DOWNLOAD_FILE" '.bridge.version')")
  current_ui=$(current_ui_version)
  current_bridge=$(current_bridge_version)
  update_applied=0
  update_available_ui=0
  update_available_bridge=0
  current_ui_probe="$current_ui"
  current_bridge_probe="$current_bridge"

  mark_release_probe "manifestUrl" "$manifest_url"
  mark_release_probe "latestVersion" "$latest_version"
  mark_release_probe "latestUiVersion" "$latest_ui_version"
  mark_release_probe "latestBridgeVersion" "$latest_bridge_version"
  mark_release_probe "lastCheckedAt" "$(now_iso)"
  mark_release_probe "lastCheckedEpoch" "$(now_epoch)"
  refresh_release_metadata_probe "$DOWNLOAD_FILE"

  if version_should_update "$latest_ui_version" "$current_ui"; then
    update_available_ui=1
  fi
  if version_should_update "$latest_bridge_version" "$current_bridge"; then
    update_available_bridge=1
  fi

  if [ "$update_available_ui" -eq 1 ] || [ "$update_available_bridge" -eq 1 ]; then
    mark_release_probe "updateAvailable" "true"
  else
    mark_release_probe "updateAvailable" "false"
  fi
  mark_release_probe "currentUiVersion" "$current_ui_probe"
  mark_release_probe "currentBridgeVersion" "$current_bridge_probe"

  if [ "$update_mode" = "check-only" ]; then
    scheduler_mark_success "mission-control-update"
    return 0
  fi

  if [ "$update_mode" = "force-apply" ]; then
    should_apply_ui="$update_available_ui"
    should_apply_bridge="$update_available_bridge"
  else
    should_apply_ui=0
    should_apply_bridge=0
    if mission_control_ui_auto_update_enabled && [ "$update_available_ui" -eq 1 ]; then
      should_apply_ui=1
    fi
    if mission_control_bridge_auto_update_enabled && [ "$update_available_bridge" -eq 1 ]; then
      should_apply_bridge=1
    fi
  fi

  if [ "$should_apply_ui" -eq 1 ]; then
    apply_ui_release "$DOWNLOAD_FILE" || {
      scheduler_mark_failure "mission-control-update" "Mission Control UI update failed."
      return 1
    }
    update_applied=1
    current_ui_probe="$latest_ui_version"
  fi

  if [ "$should_apply_bridge" -eq 1 ]; then
    apply_bridge_release "$DOWNLOAD_FILE" || {
      scheduler_mark_failure "mission-control-update" "Mission Control bridge update failed."
      return 1
    }
    update_applied=1
    current_bridge_probe="$latest_bridge_version"
  fi

  mark_release_probe "currentUiVersion" "$current_ui_probe"
  mark_release_probe "currentBridgeVersion" "$current_bridge_probe"
  if version_should_update "$latest_ui_version" "$current_ui_probe" || version_should_update "$latest_bridge_version" "$current_bridge_probe"; then
    mark_release_probe "updateAvailable" "true"
  else
    mark_release_probe "updateAvailable" "false"
  fi

  if [ "$update_applied" -eq 1 ]; then
    mark_release_probe "lastAppliedAt" "$(now_iso)"
  fi
  scheduler_mark_success "mission-control-update"
  refresh_panel_state_cache || true
  return 0
}

ensure_scheduler_settings() {
  changed=0
  model_tmp_begin
  if ! model_has_value '.settings.automation'; then
    model_tmp_apply '.settings.automation = {"enabled": true, "subscriptionRefreshMinutes": 360, "logCleanupMinutes": 5}'
    changed=1
  fi
  if ! model_has_value '.settings.automation.enabled'; then
    model_tmp_apply '.settings.automation.enabled = true'
    changed=1
  fi
  if ! model_has_value '.settings.automation.subscriptionRefreshMinutes'; then
    model_tmp_apply '.settings.automation.subscriptionRefreshMinutes = 360'
    changed=1
  fi
  if ! model_has_value '.settings.automation.logCleanupMinutes'; then
    model_tmp_apply '.settings.automation.logCleanupMinutes = 5'
    changed=1
  fi
  if ! model_has_value '.settings.automation.releaseCheckMinutes'; then
    model_tmp_apply ".settings.automation.releaseCheckMinutes = $MISSION_CONTROL_RELEASE_CHECK_MINUTES_DEFAULT"
    changed=1
  elif [ "$(model_query '.settings.automation.releaseCheckMinutes // 0')" = "360" ]; then
    model_tmp_apply ".settings.automation.releaseCheckMinutes = $MISSION_CONTROL_RELEASE_CHECK_MINUTES_DEFAULT"
    changed=1
  fi
  if ! model_has_value '.settings.automation.uiAutoUpdate'; then
    model_tmp_apply '.settings.automation.uiAutoUpdate = true'
    changed=1
  fi
  if ! model_has_value '.settings.automation.bridgeAutoUpdate'; then
    model_tmp_apply '.settings.automation.bridgeAutoUpdate = true'
    changed=1
  fi
  if ! model_has_value '.settings.automation.manifestUrl'; then
    MISSION_CONTROL_MANIFEST_URL="$MISSION_CONTROL_MANIFEST_URL_DEFAULT" \
      model_tmp_apply '.settings.automation.manifestUrl = strenv(MISSION_CONTROL_MANIFEST_URL)'
    changed=1
  fi
  if ! model_has_value '.settings.runtime'; then
    model_tmp_apply '.settings.runtime = {"mihomoMemoryLimitMiB": 0}'
    changed=1
  fi
  if ! model_has_value '.settings.runtime.mihomoMemoryLimitMiB'; then
    model_tmp_apply '.settings.runtime.mihomoMemoryLimitMiB = 0'
    changed=1
  fi
  if [ "$changed" -eq 1 ]; then
    save_model
  else
    rm -f "$MODEL_TMP"
  fi
  ensure_scheduler_state
}

automation_enabled() {
  [ "$(model_bool_default '.settings.automation.enabled' 'true')" = "1" ]
}

minutes_to_seconds() {
  minutes="$1"
  case "$minutes" in
    ''|*[!0-9]*) minutes=0 ;;
  esac
  printf '%s\n' $((minutes * 60))
}

hours_to_seconds() {
  hours="$1"
  case "$hours" in
    ''|*[!0-9]*) hours=0 ;;
  esac
  printf '%s\n' $((hours * 3600))
}

job_due_now() {
  interval_seconds="$1"
  last_success_epoch="$2"
  now_epoch_value="${3:-$(now_epoch)}"
  case "$interval_seconds" in
    ''|*[!0-9]*) return 1 ;;
  esac
  [ "$interval_seconds" -gt 0 ] || return 1
  case "$last_success_epoch" in
    ''|*[!0-9]*) return 0 ;;
  esac
  [ $((now_epoch_value - last_success_epoch)) -ge "$interval_seconds" ]
}

rule_target_node() {
  action="$1"
  target="$2"
  if [ "$action" = "DIRECT" ] || [ "$target" = "DIRECT" ]; then
    printf 'DIRECT'
  else
    printf '%s' "${target:-BLOCKED SITES}"
  fi
}

ensure_panel_preferences() {
  changed=0
  model_tmp_begin
  if ! model_has_value '.settings.panel'; then
    model_tmp_apply '.settings.panel = {"theme":"graphite","density":"comfortable","scale":100,"animations":true,"autoRefresh":true,"graphRange":30,"chartLineWidth":3,"speedUnitMode":"bits","storageUnitSystem":"binary","language":"ru"}'
    changed=1
  fi
  if ! model_has_value '.settings.controller'; then
    model_tmp_apply '.settings.controller = {"selectorGroup":"GLOBAL","delayUrl":"https://www.gstatic.com/generate_204","delayTimeout":5000,"pollIntervalMs":2000,"useWebSocket":true}'
    changed=1
  fi
  if ! model_has_value '.settings.routing'; then
    model_tmp_apply '.settings.routing = {"mode":"smart","globalTarget":"AUTO BEST","blockedTarget":"auto","manualServerId":""}'
    changed=1
  fi
  if ! model_has_value '.settings.runtime'; then
    current_memory_limit=$(uci_mihomo_memory_limit_mib)
    MEMORY_LIMIT="$current_memory_limit" model_tmp_apply '.settings.runtime = {"mihomoMemoryLimitMiB":(strenv(MEMORY_LIMIT) | tonumber)}'
    changed=1
  fi
  if ! model_has_value '.settings.panel.theme'; then
    model_tmp_apply '.settings.panel.theme = "graphite"'
    changed=1
  fi
  if ! model_has_value '.settings.panel.density'; then
    model_tmp_apply '.settings.panel.density = "comfortable"'
    changed=1
  fi
  if ! model_has_value '.settings.panel.scale'; then
    model_tmp_apply '.settings.panel.scale = 100'
    changed=1
  fi
  if ! model_has_value '.settings.panel.animations'; then
    model_tmp_apply '.settings.panel.animations = true'
    changed=1
  fi
  if ! model_has_value '.settings.panel.autoRefresh'; then
    model_tmp_apply '.settings.panel.autoRefresh = true'
    changed=1
  fi
  if ! model_has_value '.settings.panel.graphRange'; then
    model_tmp_apply '.settings.panel.graphRange = 30'
    changed=1
  fi
  if ! model_has_value '.settings.panel.chartLineWidth'; then
    model_tmp_apply '.settings.panel.chartLineWidth = 3'
    changed=1
  fi
  if ! model_has_value '.settings.panel.speedUnitMode'; then
    model_tmp_apply '.settings.panel.speedUnitMode = "bits"'
    changed=1
  fi
  if ! model_has_value '.settings.panel.storageUnitSystem'; then
    model_tmp_apply '.settings.panel.storageUnitSystem = "binary"'
    changed=1
  fi
  if ! model_has_value '.settings.panel.language'; then
    model_tmp_apply '.settings.panel.language = "ru"'
    changed=1
  fi
  if ! model_has_value '.settings.controller.selectorGroup'; then
    model_tmp_apply '.settings.controller.selectorGroup = "GLOBAL"'
    changed=1
  fi
  if ! model_has_value '.settings.controller.delayUrl'; then
    model_tmp_apply '.settings.controller.delayUrl = "https://www.gstatic.com/generate_204"'
    changed=1
  fi
  if ! model_has_value '.settings.controller.delayTimeout'; then
    model_tmp_apply '.settings.controller.delayTimeout = 5000'
    changed=1
  fi
  if ! model_has_value '.settings.controller.pollIntervalMs'; then
    model_tmp_apply '.settings.controller.pollIntervalMs = 2000'
    changed=1
  fi
  if ! model_has_value '.settings.controller.useWebSocket'; then
    model_tmp_apply '.settings.controller.useWebSocket = true'
    changed=1
  fi
  if ! model_has_value '.settings.routing.mode'; then
    model_tmp_apply '.settings.routing.mode = "smart"'
    changed=1
  fi
  if ! model_has_value '.settings.routing.globalTarget'; then
    model_tmp_apply '.settings.routing.globalTarget = "AUTO BEST"'
    changed=1
  fi
  if ! model_has_value '.settings.routing.blockedTarget'; then
    model_tmp_apply '.settings.routing.blockedTarget = "auto"'
    changed=1
  fi
  if ! model_has_value '.settings.routing.manualServerId'; then
    model_tmp_apply '.settings.routing.manualServerId = ""'
    changed=1
  fi
  if ! model_has_value '.settings.runtime.mihomoMemoryLimitMiB'; then
    current_memory_limit=$(uci_mihomo_memory_limit_mib)
    MEMORY_LIMIT="$current_memory_limit" model_tmp_apply '.settings.runtime.mihomoMemoryLimitMiB = (strenv(MEMORY_LIMIT) | tonumber)'
    changed=1
  fi
  if [ "$changed" -eq 1 ]; then
    save_model
  fi
}

base_kind_behavior() {
  case "$1" in
    ips) printf 'ipcidr' ;;
    *) printf 'domain' ;;
  esac
}

base_file_for_id() {
  base_id="$1"
  model_query ".bases[] | select(.id == \"$base_id\") | .filePath // \"\""
}

base_provider_name() {
  base_id="$1"
  model_query ".bases[] | select(.id == \"$base_id\") | .providerName // \"\""
}

base_provider_section() {
  base_id="$1"
  model_query ".bases[] | select(.id == \"$base_id\") | .providerSection // \"\""
}

base_field() {
  base_id="$1"
  field="$2"
  model_query ".bases[] | select(.id == \"$base_id\") | .$field // \"\""
}

base_index() {
  base_id="$1"
  model_query ".bases | to_entries[] | select(.value.id == \"$base_id\") | .key" | head -n 1
}

rule_field() {
  rule_id="$1"
  field="$2"
  model_query ".rules[] | select(.id == \"$rule_id\") | .$field // \"\""
}

rule_index() {
  rule_id="$1"
  model_query ".rules | to_entries[] | select(.value.id == \"$rule_id\") | .key" | head -n 1
}

normalize_domain_line() {
  value=$(safe_string "$1")
  value=$(printf '%s' "$value" | sed 's#^[A-Za-z][A-Za-z0-9+.-]*://##; s#/.*$##; s/^\*\.//; s/^+\.//; s/\.$//')
  value=$(printf '%s' "$value" | tr 'A-Z' 'a-z')
  [ -n "$value" ] || return 1
  printf '+.%s\n' "$value"
}

normalize_ip_line() {
  value=$(safe_string "$1")
  value=$(printf '%s' "$value" | sed 's#/.*$##')
  [ -n "$value" ] || return 1
  printf '%s\n' "$value"
}

strip_domain_line() {
  printf '%s' "$1" | sed 's/^+\.//'
}

list_entries_json() {
  entries_file="$1"
  entries_kind="$2"
  if [ ! -f "$entries_file" ]; then
    printf '[]'
    return
  fi
  awk -v kind="$entries_kind" '
    BEGIN {
      first = 1
      printf "["
    }
    {
      gsub(/\r/, "", $0)
      sub(/^[[:space:]]+/, "", $0)
      sub(/[[:space:]]+$/, "", $0)
      if ($0 == "") next
      line = $0
      if (kind == "domains") sub(/^\+\./, "", line)
      gsub(/\\/, "\\\\", line)
      gsub(/"/, "\\\"", line)
      gsub(/\t/, "\\t", line)
      gsub(/\r/, "\\r", line)
      if (!first) {
        printf ","
      }
      first = 0
      printf "\"%s\"", line
    }
    END {
      printf "]"
    }
  ' "$entries_file"
}

count_entries() {
  count_file="$1"
  if [ ! -f "$count_file" ]; then
    printf '0'
    return
  fi
  awk 'NF { c++ } END { print c + 0 }' "$count_file"
}

file_modified_at() {
  modified_file="$1"
  if [ ! -f "$modified_file" ]; then
    return
  fi
  date -r "$modified_file" '+%Y-%m-%d %H:%M:%S' 2>/dev/null || true
}

preview_entries_json() {
  preview_file="$1"
  preview_kind="$2"
  preview_limit="${3:-6}"
  if [ ! -f "$preview_file" ]; then
    printf '[]'
    return
  fi
  awk -v kind="$preview_kind" -v limit="$preview_limit" '
    BEGIN {
      first = 1
      count = 0
      printf "["
    }
    {
      gsub(/\r/, "", $0)
      sub(/^[[:space:]]+/, "", $0)
      sub(/[[:space:]]+$/, "", $0)
      if ($0 == "") next
      line = $0
      if (kind == "domains") sub(/^\+\./, "", line)
      gsub(/\\/, "\\\\", line)
      gsub(/"/, "\\\"", line)
      gsub(/\t/, "\\t", line)
      gsub(/\r/, "\\r", line)
      if (!first) {
        printf ","
      }
      first = 0
      printf "\"%s\"", line
      count++
      if (count >= limit) {
        exit
      }
    }
    END {
      printf "]"
    }
  ' "$preview_file"
}

write_entries_file() {
  file="$1"
  kind="$2"
  entries_file="$3"
  mkdir -p "$(dirname "$file")"
  : > "$file"
  while IFS= read -r raw || [ -n "$raw" ]; do
    raw=$(safe_string "$raw")
    [ -n "$raw" ] || continue
    case "$kind" in
      domains) normalize_domain_line "$raw" >> "$file" || true ;;
      *) normalize_ip_line "$raw" >> "$file" || true ;;
    esac
  done < "$entries_file"
}

ensure_base_files() {
  model_query '.bases[].filePath' | while IFS= read -r path; do
    [ -n "$path" ] || continue
    mkdir -p "$(dirname "$path")"
    [ -f "$path" ] || : > "$path"
  done
}

clear_managed_rules() {
  uci show nikki | sed -n "s/^nikki\.\([^.=]*\)=rule$/\1/p" | while IFS= read -r section; do
    [ -n "$section" ] || continue
    managed=$(uci -q get "nikki.$section.panel_managed" 2>/dev/null || true)
    case "$section" in
      rule_direct_domains|rule_direct_ip|rule_proxy_domains|rule_proxy_ip|rule_ru_domains|rule_ru_ip|rule_default)
        uci -q delete "nikki.$section" >/dev/null 2>&1 || true
        ;;
      *)
        [ "$managed" = "1" ] && uci -q delete "nikki.$section" >/dev/null 2>&1 || true
        ;;
    esac
  done
}

ensure_rule_provider_section() {
  base_id="$1"
  section=$(base_provider_section "$base_id")
  provider_name=$(base_provider_name "$base_id")
  file_path=$(base_file_for_id "$base_id")
  kind=$(base_field "$base_id" kind)
  enabled=$(base_field "$base_id" enabled)
  [ -n "$section" ] || return 1
  behavior=$(base_kind_behavior "$kind")
  uci -q set "nikki.$section=rule_provider"
  uci -q set "nikki.$section.enabled=$([ "$enabled" = "true" ] && printf 1 || printf 0)"
  uci -q set "nikki.$section.name=$provider_name"
  uci -q set "nikki.$section.type=file"
  uci -q set "nikki.$section.file_path=$file_path"
  uci -q set "nikki.$section.file_format=text"
  uci -q set "nikki.$section.behavior=$behavior"
  uci -q set "nikki.$section.panel_managed=1"
}

rebuild_rule_sections() {
  clear_managed_rules
  order_file="$TMP_DIR/rules-order.$$"
  : > "$order_file"
  model_query '.rules[] | [.priority, .id] | @tsv' | sort -n | while IFS="$(printf '\t')" read -r priority rule_id; do
    [ -n "$rule_id" ] || continue
    enabled=$(rule_field "$rule_id" enabled)
    [ "$enabled" = "true" ] || continue
    match_mode=$(rule_field "$rule_id" matchMode)
    action=$(rule_field "$rule_id" action)
    target=$(rule_field "$rule_id" target)
    node=$(rule_target_node "$action" "$target")
    if [ "$match_mode" = "final" ]; then
      section="panel_rule_$(uci_safe_name "$rule_id")"
      uci -q set "nikki.$section=rule"
      uci -q set "nikki.$section.enabled=1"
      uci -q set "nikki.$section.type=MATCH"
      uci -q set "nikki.$section.node=$node"
      uci -q set "nikki.$section.panel_managed=1"
      printf '%s\n' "$section" >> "$order_file"
      continue
    fi
    model_query ".rules[] | select(.id == \"$rule_id\") | .baseIds[]?" | while IFS= read -r base_id; do
      [ -n "$base_id" ] || continue
      base_enabled=$(base_field "$base_id" enabled)
      [ "$base_enabled" = "true" ] || continue
      matcher=$(base_provider_name "$base_id")
      [ -n "$matcher" ] || continue
      section="panel_rule_$(uci_safe_name "$rule_id")_$(uci_safe_name "$base_id")"
      uci -q set "nikki.$section=rule"
      uci -q set "nikki.$section.enabled=1"
      uci -q set "nikki.$section.type=RULE-SET"
      uci -q set "nikki.$section.matcher=$matcher"
      uci -q set "nikki.$section.node=$node"
      uci -q set "nikki.$section.panel_managed=1"
      printf '%s\n' "$section" >> "$order_file"
    done
  done
  uci -q commit nikki
}

reload_nikki() {
  timing_mark 'reload:start'
  if /etc/init.d/nikki reload >/dev/null 2>&1; then
    timing_mark 'reload:done'
    return 0
  fi
  if /etc/init.d/nikki restart >/dev/null 2>&1; then
    timing_mark 'reload:restart-done'
    return 0
  fi
  timing_mark 'reload:failed'
  return 1
}

any_remote_base_auto_updates_enabled() {
  model_query '.bases[] | select(.sourceType == "remote" and .enabled == true and .autoUpdate == true and ((.updateEveryHours // 0) | tonumber) > 0) | .id' | grep -q .
}

sync_scheduler_cron() {
  cron_file="/etc/crontabs/root"
  tmp="$TMP_DIR/root.cron.$$"
  [ -f "$cron_file" ] || : > "$cron_file"
  need_scheduler=0
  if automation_enabled; then
    subscription_interval=$(model_query '.settings.automation.subscriptionRefreshMinutes // 360')
    log_cleanup_interval=$(model_query '.settings.automation.logCleanupMinutes // 5')
    release_check_interval=$(mission_control_release_check_minutes)
    auto_interval=$(model_query '.settings.autoSelection.intervalMinutes // 10')
    if [ "${subscription_interval:-0}" -gt 0 ] 2>/dev/null \
      || [ "${log_cleanup_interval:-0}" -gt 0 ] 2>/dev/null \
      || [ "${release_check_interval:-0}" -gt 0 ] 2>/dev/null \
      || [ "${auto_interval:-0}" -gt 0 ] 2>/dev/null; then
      need_scheduler=1
    fi
    if any_remote_base_auto_updates_enabled; then
      need_scheduler=1
    fi
  fi
  if model_has_value '.settings.routing.mode'; then
    need_scheduler=1
  fi
  grep -v "$AUTO_CRON_TAG" "$cron_file" \
    | grep -v "$LEGACY_REFRESH_CRON_TAG" \
    | grep -v "$LEGACY_LOG_CRON_TAG" \
    | grep -v "$SCHEDULER_CRON_TAG" > "$tmp" 2>/dev/null || true
  if [ "$need_scheduler" = "1" ]; then
    printf '* * * * * %s scheduler-run >/dev/null 2>&1 %s\n' "$SELF_SCRIPT" "$SCHEDULER_CRON_TAG" >> "$tmp"
  fi
  if cmp -s "$tmp" "$cron_file" 2>/dev/null; then
    rm -f "$tmp"
    return 0
  fi
  cp "$tmp" "$cron_file"
  /etc/init.d/cron restart >/dev/null 2>&1
}

apply_model() {
  ensure_base_files
  timing_mark 'apply:start'
  model_query '.bases[].id' | while IFS= read -r base_id; do
    [ -n "$base_id" ] || continue
    ensure_rule_provider_section "$base_id"
  done
  timing_mark 'apply:providers'
  rebuild_rule_sections
  timing_mark 'apply:rules'
  timing_mark 'apply:commit'
  sync_scheduler_cron
  timing_mark 'apply:cron'
}

sync_base_download_url() {
  base_id="$1"
  format=$(base_field "$base_id" format)
  source_url=$(base_field "$base_id" sourceUrl)
  case "$format:$source_url" in
    geosite-dat:https://github.com/runetfreedom/russia-blocked-geosite/releases/latest/download/geosite-ru-only.dat)
      printf 'https://raw.githubusercontent.com/runetfreedom/russia-blocked-geosite/release/ru-blocked.txt'
      ;;
    geoip-dat:https://github.com/runetfreedom/russia-blocked-geoip/releases/latest/download/geoip-ru-only.dat)
      printf 'https://raw.githubusercontent.com/runetfreedom/russia-blocked-geoip/release/text/ru-blocked.txt'
      ;;
    *)
      printf '%s' "$source_url"
      ;;
  esac
}

normalize_downloaded_base() {
  base_id="$1"
  source_file="$2"
  out_file="$3"
  kind=$(base_field "$base_id" kind)
  format=$(base_field "$base_id" format)
  case "$format:$kind" in
    geosite-dat:domains)
      sed -n 's/^domain:/+./p' "$source_file" | sed '/^[[:space:]]*$/d' > "$out_file"
      ;;
    geoip-dat:ips)
      sed '/^[[:space:]]*$/d' "$source_file" > "$out_file"
      ;;
    *:domains)
      : > "$out_file"
      while IFS= read -r line || [ -n "$line" ]; do
        line=$(safe_string "$line")
        [ -n "$line" ] || continue
        normalize_domain_line "$line" >> "$out_file" || true
      done < "$source_file"
      ;;
    *)
      : > "$out_file"
      while IFS= read -r line || [ -n "$line" ]; do
        line=$(safe_string "$line")
        [ -n "$line" ] || continue
        normalize_ip_line "$line" >> "$out_file" || true
      done < "$source_file"
      ;;
  esac
}

sync_base_file() {
  base_id="$1"
  source_type=$(base_field "$base_id" sourceType)
  [ "$source_type" = "remote" ] || return 0
  file_path=$(base_file_for_id "$base_id")
  url=$(sync_base_download_url "$base_id")
  [ -n "$url" ] || return 1
  tmp_raw="$TMP_DIR/base-sync-$(safe_id "$base_id").raw"
  tmp_norm="$TMP_DIR/base-sync-$(safe_id "$base_id").txt"
  if ! curl -sSfL --connect-timeout 15 --max-time 120 --retry 3 -o "$tmp_raw" "$url"; then
    return 1
  fi
  normalize_downloaded_base "$base_id" "$tmp_raw" "$tmp_norm"
  [ -s "$tmp_norm" ] || return 1
  mkdir -p "$(dirname "$file_path")"
  cp "$tmp_norm" "$file_path"
  ts=$(now_iso)
  item_count=$(awk 'NF { c++ } END { print c + 0 }' "$tmp_norm")
  base_idx=$(base_index "$base_id")
  [ -n "$base_idx" ] || return 1
  model_tmp_begin
  TS="$ts" model_tmp_apply ".bases[$base_idx].lastSyncAt = strenv(TS)"
  ITEM_COUNT="$item_count" model_tmp_apply ".bases[$base_idx].itemCount = (strenv(ITEM_COUNT) | tonumber)"
  save_model
}

sync_all_remote_bases() {
  ids_file="$TMP_DIR/base-sync-ids.$$"
  failed=0
  model_query '.bases[] | select(.sourceType == "remote" and .enabled == true) | .id' > "$ids_file"
  while IFS= read -r base_id; do
    [ -n "$base_id" ] || continue
    if ! sync_base_file "$base_id"; then
      failed=1
      log_msg "Base sync failed: $base_id"
    fi
  done < "$ids_file"
  return "$failed"
}

mark_base_synced() {
  base_id="$1"
  file_path=$(base_file_for_id "$base_id")
  [ -n "$file_path" ] || return 0
  item_count=0
  if [ -f "$file_path" ]; then
    item_count=$(awk 'NF { c++ } END { print c + 0 }' "$file_path")
  fi
  base_idx=$(base_index "$base_id")
  [ -n "$base_idx" ] || return 0
  model_tmp_begin
  BASE_TS="$(now_iso)" model_tmp_apply ".bases[$base_idx].lastSyncAt = strenv(BASE_TS)"
  BASE_COUNT="$item_count" model_tmp_apply ".bases[$base_idx].itemCount = (strenv(BASE_COUNT) | tonumber)"
  save_model
}

update_pool_managed_base_metadata() {
  mark_base_synced "ru-blocked-domains"
  mark_base_synced "ru-blocked-ip"
}

stock_nikki_supports_refresh_pool() {
  grep -q "extra_command 'refresh_pool'" /etc/init.d/nikki 2>/dev/null
}

set_nikki_profile() {
  profile_ref="$1"
  [ -n "$profile_ref" ] || return 1
  current_profile=$(uci -q get "nikki.config.profile" 2>/dev/null || true)
  [ "$current_profile" = "$profile_ref" ] && return 0
  uci -q set "nikki.config.profile=$profile_ref"
  uci -q commit nikki
}

set_proxy_interception_state() {
  enabled="${1:-0}"
  changed=0
  for option in lan_proxy router_proxy; do
    current=$(uci -q get "nikki.proxy.$option" 2>/dev/null || printf '')
    [ "$current" = "$enabled" ] && continue
    uci -q set "nikki.proxy.$option=$enabled"
    changed=1
  done
  if [ "$changed" -eq 1 ]; then
    uci -q commit nikki
  fi
  return 0
}

enable_panel_rule_mixins() {
  changed=0
  for setting in rule rule_provider; do
    current=$(uci -q get "nikki.mixin.$setting" 2>/dev/null || printf '0')
    [ "$current" = "1" ] && continue
    uci -q set "nikki.mixin.$setting=1"
    changed=1
  done
  mixin_file_content=$(uci -q get "nikki.mixin.mixin_file_content" 2>/dev/null || printf '1')
  if [ "$mixin_file_content" != "0" ]; then
    uci -q set "nikki.mixin.mixin_file_content=0"
    changed=1
  fi
  dns_respect_rules=$(uci -q get "nikki.mixin.dns_respect_rules" 2>/dev/null || printf '0')
  if [ "$dns_respect_rules" != "0" ]; then
    uci -q set "nikki.mixin.dns_respect_rules=0"
    changed=1
  fi
  if [ "$changed" -eq 1 ]; then
    uci -q commit nikki
  fi
  return 0
}

line_file_to_json_array() {
  file="$1"
  if [ ! -s "$file" ]; then
    printf '[]'
    return
  fi
  jsonl_file="$TMP_DIR/lines-jsonl.$$"
  : > "$jsonl_file"
  while IFS= read -r line || [ -n "$line" ]; do
    [ -n "$line" ] || continue
    printf '%s\n' "$(json_string "$line")" >> "$jsonl_file"
  done < "$file"
  jsonl_to_array "$jsonl_file"
  rm -f "$jsonl_file"
}

cached_known_egress_for_node() {
  node_name="$1"
  [ -n "$node_name" ] || return 1
  [ -s "$PANEL_INVENTORY" ] || return 1
  cached_row=$(
    yq -p json -r '.nodes[]? | (.id // "") + "\t" + (.name // "") + "\t" + (.label // "") + "\t" + (.egressCountry // "") + "\t" + (.egressIp // "")' \
      "$PANEL_INVENTORY" 2>/dev/null \
      | awk -F '\t' -v target="$node_name" '$1 == target || $2 == target || $3 == target { print $4 "\t" $5; exit }'
  )
  cached_country=$(printf '%s' "$cached_row" | awk -F '\t' 'NR==1 { print $1 }')
  cached_ip=$(printf '%s' "$cached_row" | awk -F '\t' 'NR==1 { print $2 }')
  cached_country=$(safe_string "$cached_country")
  cached_ip=$(safe_string "$cached_ip")
  [ -n "$cached_country" ] || return 1
  [ "$cached_country" != '??' ] || return 1
  printf '%s\t%s\n' "$cached_country" "$cached_ip"
}

cached_known_egress_for_subscription_server() {
  subscription_id="$1"
  proxy_server="$2"
  [ -n "$subscription_id" ] || return 1
  [ -n "$proxy_server" ] || return 1
  [ -s "$PANEL_INVENTORY" ] || return 1
  cached_row=$(
    yq -p json -r '.nodes[]? | (.subscriptionId // "") + "\t" + (.server // "") + "\t" + (.egressCountry // "") + "\t" + (.egressIp // "")' \
      "$PANEL_INVENTORY" 2>/dev/null \
      | awk -F '\t' -v sid="$subscription_id" -v server="$proxy_server" '$1 == sid && $2 == server { print $3 "\t" $4; exit }'
  )
  cached_country=$(printf '%s' "$cached_row" | awk -F '\t' 'NR==1 { print $1 }')
  cached_ip=$(printf '%s' "$cached_row" | awk -F '\t' 'NR==1 { print $2 }')
  cached_country=$(safe_string "$cached_country")
  cached_ip=$(safe_string "$cached_ip")
  [ -n "$cached_country" ] || return 1
  [ "$cached_country" != '??' ] || return 1
  printf '%s\t%s\n' "$cached_country" "$cached_ip"
}

mixed_proxy_port() {
  port=$(uci -q get "nikki.mixin.mixed_port" 2>/dev/null || printf '7890')
  case "$port" in
    ''|*[!0-9]*) printf '7890\n' ;;
    *) printf '%s\n' "$port" ;;
  esac
}

mixed_proxy_username() {
  username=$(uci -q get "nikki.authentication.username" 2>/dev/null || true)
  if [ -n "$username" ]; then
    printf '%s\n' "$username"
    return
  fi
  auth_pair=$(yq -r '.authentication[0] // ""' "$RUN_PROFILE" 2>/dev/null || true)
  case "$auth_pair" in
    *:*) printf '%s\n' "${auth_pair%%:*}" ;;
  esac
}

mixed_proxy_password() {
  password=$(uci -q get "nikki.authentication.password" 2>/dev/null || true)
  if [ -n "$password" ]; then
    printf '%s\n' "$password"
    return
  fi
  auth_pair=$(yq -r '.authentication[0] // ""' "$RUN_PROFILE" 2>/dev/null || true)
  case "$auth_pair" in
    *:*) printf '%s\n' "${auth_pair#*:}" ;;
  esac
}

controller_proxy_current() {
  group_name="$1"
  status=$(controller_request GET "/proxies/$(urlencode_all "$group_name")")
  [ "$status" = "200" ] || return 1
  yq -p json -r '.now // ""' "$RESP_FILE" 2>/dev/null || true
}

controller_select_proxy() {
  group_name="$1"
  proxy_name="$2"
  body_file="$TMP_DIR/controller-select-proxy.$$"
  printf '{"name":%s}\n' "$(json_string "$proxy_name")" > "$body_file"
  status=$(controller_request PUT "/proxies/$(urlencode_all "$group_name")" "" "$body_file")
  case "$status" in
    2*) return 0 ;;
  esac
  return 1
}

build_subscription_proxy_metadata() {
  valid_sections_file="$1"
  output_file="$2"
  [ -s "$valid_sections_file" ] || return 1
  seen_names="$TMP_DIR/probe-seen-proxy-names.$$"
  tab_char=$(printf '\t')
  : > "$seen_names"
  : > "$output_file"

  while IFS= read -r section; do
    [ -n "$section" ] || continue
    subscription_file="$SUBSCRIPTIONS_DIR/$section.yaml"
    is_valid_profile_file "$subscription_file" || continue
    subscription_label=$(uci -q get "nikki.$section.name" 2>/dev/null || printf '%s' "$section")
    subscription_display=$(safe_string "$subscription_label" "$section")
    proxy_count=$(profile_proxy_count "$subscription_file")
    idx=0
    while [ "$idx" -lt "$proxy_count" ]; do
      proxy_name=$(yq -r ".proxies[$idx].name // \"\"" "$subscription_file" 2>/dev/null || true)
      [ -n "$proxy_name" ] || {
        idx=$((idx + 1))
        continue
      }
      unique_name=$(make_unique_name "$proxy_name" "$subscription_label" "$seen_names")
      proxy_protocol=$(yq -r ".proxies[$idx].type // .proxies[$idx].proto // .proxies[$idx].protocol // \"\"" "$subscription_file" 2>/dev/null || true)
      proxy_server=$(yq -r ".proxies[$idx].server // \"\"" "$subscription_file" 2>/dev/null || true)
      printf '%s%s%s%s%s%s%s%s%s\n' \
        "$section" "$tab_char" \
        "$subscription_display" "$tab_char" \
        "$unique_name" "$tab_char" \
        "$proxy_protocol" "$tab_char" \
        "$proxy_server" >> "$output_file"
      idx=$((idx + 1))
    done
  done < "$valid_sections_file"

  [ -s "$output_file" ]
}

probe_proxy_egress_trace() {
  port=$(mixed_proxy_port)
  username=$(mixed_proxy_username)
  password=$(mixed_proxy_password)
  trace_file="$TMP_DIR/proxy-trace.$$"
  attempt=1
  last_country='??'
  while [ "$attempt" -le 3 ]; do
    curl_status=0
    if [ -n "$username$password" ]; then
      curl -4 -fsSL \
        --connect-timeout 5 \
        --max-time 20 \
        --retry 1 \
        -x "http://127.0.0.1:$port" \
        -U "$username:$password" \
        "https://openai.com/cdn-cgi/trace" > "$trace_file" 2>/dev/null || curl_status=$?
    else
      curl -4 -fsSL \
        --connect-timeout 5 \
        --max-time 20 \
        --retry 1 \
        -x "http://127.0.0.1:$port" \
        "https://openai.com/cdn-cgi/trace" > "$trace_file" 2>/dev/null || curl_status=$?
    fi

    if [ "$curl_status" -eq 0 ]; then
      probe_ip=$(awk -F= '/^ip=/{print $2; exit}' "$trace_file" 2>/dev/null || true)
      probe_country=$(awk -F= '/^loc=/{print toupper($2); exit}' "$trace_file" 2>/dev/null || true)
      probe_country=$(safe_string "$probe_country" '??')
      last_country="$probe_country"
      if [ -n "$probe_ip" ]; then
        printf 'ok\t%s\t%s\n' "$probe_country" "$probe_ip"
        return 0
      fi
    fi

    attempt=$((attempt + 1))
    [ "$attempt" -le 3 ] && sleep 2
  done

  if [ "$last_country" != '??' ]; then
    printf 'probe-empty\t%s\t\n' "$last_country"
  else
    printf 'probe-failed\t??\t\n'
  fi
  return 1
}

probe_subscription_proxy_metadata() {
  metadata_file="$1"
  output_file="$2"
  [ -s "$metadata_file" ] || return 1
  tab_char=$(printf '\t')
  source_profile="$TMP_DIR/probe-source-client.yaml"
  probe_name_file="$TMP_DIR/probe-name.$$"
  cp "$CLIENT_PROFILE" "$source_profile" 2>/dev/null || return 1
  : > "$output_file"

  while IFS="$tab_char" read -r section subscription_display unique_name proxy_protocol proxy_server; do
    [ -n "$unique_name" ] || continue
    printf '%s\n' "$unique_name" > "$probe_name_file"
    if ! build_filtered_runtime_profile_from_allowed_names "$probe_name_file" "$source_profile"; then
      probe_result='profile-failed	??	'
    else
      set_nikki_profile "file:client.yaml" || true
      set_proxy_interception_state 1 || true
      if reload_nikki; then
        sleep 4
        probe_result=$(probe_proxy_egress_trace "$unique_name")
      else
        probe_result='reload-failed	??	'
      fi
    fi
    probe_status=$(printf '%s' "$probe_result" | awk -F '\t' 'NR==1{print $1}')
    probe_country=$(printf '%s' "$probe_result" | awk -F '\t' 'NR==1{print $2}')
    probe_ip=$(printf '%s' "$probe_result" | awk -F '\t' 'NR==1{print $3}')
    printf '%s%s%s%s%s%s%s%s%s%s%s%s%s%s%s\n' \
      "$section" "$tab_char" \
      "$subscription_display" "$tab_char" \
      "$unique_name" "$tab_char" \
      "$proxy_protocol" "$tab_char" \
      "$proxy_server" "$tab_char" \
      "$(safe_string "$probe_status" 'probe-failed')" "$tab_char" \
      "$(safe_string "$probe_country" '??')" "$tab_char" \
      "$probe_ip" >> "$output_file"
  done < "$metadata_file"

  cp "$source_profile" "$CLIENT_PROFILE" 2>/dev/null || true

  [ -s "$output_file" ]
}

build_inventory_from_probe_results() {
  probe_results_file="$1"
  allowed_names_file="$2"
  output_file="$3"
  [ -s "$probe_results_file" ] || return 1

  blocked_countries_file="$TMP_DIR/probe-blocked-countries.$$"
  server_cache_file="$TMP_DIR/probe-server-cache.$$"
  nodes_jsonl="$TMP_DIR/probe-nodes-jsonl.$$"
  by_subscription_jsonl="$TMP_DIR/probe-by-subscription-jsonl.$$"
  subscription_ids_file="$TMP_DIR/probe-subscription-ids.$$"
  used_meta_file="$TMP_DIR/probe-used-meta.$$"
  rejected_meta_file="$TMP_DIR/probe-rejected-meta.$$"
  tab_char=$(printf '\t')
  allow_unknown=$(model_bool_text_default '.settings.egressPolicy.allowUnknown' 'false')
  discovered=0
  used=0
  rejected=0
  awk -F '\t' '$6 == "ok" && $7 != "" && $7 != "??" && $5 != "" { key=$1 "\t" $5; if (!(key in seen)) { print $1 "\t" $5 "\t" $7 "\t" $8; seen[key]=1 } }' \
    "$probe_results_file" > "$server_cache_file" 2>/dev/null || : > "$server_cache_file"

  model_query '.settings.egressPolicy.blockedCountries[]? // ""' \
    | awk 'NF { print toupper($0) }' | sort -u > "$blocked_countries_file"
  : > "$allowed_names_file"
  : > "$nodes_jsonl"
  : > "$by_subscription_jsonl"
  : > "$subscription_ids_file"
  : > "$used_meta_file"
  : > "$rejected_meta_file"

  while IFS="$tab_char" read -r section subscription_display unique_name proxy_protocol proxy_server probe_status probe_country probe_ip; do
    [ -n "$unique_name" ] || continue
    discovered=$((discovered + 1))
    probe_status=$(safe_string "$probe_status" 'probe-failed')
    probe_country=$(safe_string "$probe_country" '??')
    probe_ip=$(safe_string "$probe_ip")
    if [ "$probe_status" != 'ok' ] || [ "$probe_country" = '??' ]; then
      cached_egress=$(cached_known_egress_for_node "$unique_name" || true)
      cached_country=$(printf '%s' "$cached_egress" | awk -F '\t' 'NR==1 { print $1 }')
      cached_ip=$(printf '%s' "$cached_egress" | awk -F '\t' 'NR==1 { print $2 }')
      cached_country=$(safe_string "$cached_country")
      cached_ip=$(safe_string "$cached_ip")
      if { [ -z "$cached_country" ] || [ "$cached_country" = '??' ]; } && [ -n "$proxy_server" ]; then
        cached_egress=$(
          awk -F '\t' -v sid="$section" -v server="$proxy_server" '$1 == sid && $2 == server { print $3 "\t" $4; exit }' \
            "$server_cache_file" 2>/dev/null || true
        )
        cached_country=$(printf '%s' "$cached_egress" | awk -F '\t' 'NR==1 { print $1 }')
        cached_ip=$(printf '%s' "$cached_egress" | awk -F '\t' 'NR==1 { print $2 }')
        cached_country=$(safe_string "$cached_country")
        cached_ip=$(safe_string "$cached_ip")
      fi
      if { [ -z "$cached_country" ] || [ "$cached_country" = '??' ]; } && [ -n "$proxy_server" ]; then
        cached_egress=$(cached_known_egress_for_subscription_server "$section" "$proxy_server" || true)
        cached_country=$(printf '%s' "$cached_egress" | awk -F '\t' 'NR==1 { print $1 }')
        cached_ip=$(printf '%s' "$cached_egress" | awk -F '\t' 'NR==1 { print $2 }')
        cached_country=$(safe_string "$cached_country")
        cached_ip=$(safe_string "$cached_ip")
      fi
      if [ -n "$cached_country" ] && [ "$cached_country" != '??' ]; then
        probe_status='cached'
        probe_country="$cached_country"
        [ -n "$probe_ip" ] || probe_ip="$cached_ip"
      fi
    fi
    reason=''
    allow_node=1

    case "$probe_status" in
      ok|cached) ;;
      *) allow_node=0; reason='Egress probe failed' ;;
    esac
    if [ "$allow_node" -eq 1 ] && [ "$probe_country" = '??' ] && [ "$allow_unknown" != 'true' ]; then
      allow_node=0
      reason='Unknown egress'
    fi
    if [ "$allow_node" -eq 1 ] && grep -Fqx "$probe_country" "$blocked_countries_file" 2>/dev/null; then
      allow_node=0
      reason='Blocked country'
    fi

    printf '%s\n' "$section" >> "$subscription_ids_file"
    if [ "$allow_node" -eq 1 ]; then
      used=$((used + 1))
      printf '%s\n' "$unique_name" >> "$allowed_names_file"
      printf '{"id":%s,"name":%s,"label":%s,"subscriptionId":%s,"subscriptionName":%s,"protocol":%s,"provider":%s,"server":%s,"region":%s,"egressCountry":%s,"egressIp":%s,"egressProvider":%s,"latency":0,"jitter":0,"rxMbps":0,"txMbps":0,"score":1,"trend":[],"inPool":true,"reason":null}\n' \
        "$(json_string "$unique_name")" \
        "$(json_string "$unique_name")" \
        "$(json_string "$unique_name")" \
        "$(json_string "$section")" \
        "$(json_string "$subscription_display")" \
        "$(json_string "$proxy_protocol")" \
        "$(json_string "$subscription_display")" \
        "$(json_string "$proxy_server")" \
        "$(json_string "$probe_country")" \
        "$(json_string "$probe_country")" \
        "$(json_string "$probe_ip")" \
        "$(json_string "$subscription_display")" >> "$nodes_jsonl"
      printf '%s\t%s\t%s\t%s\n' "$section" "$subscription_display" "$unique_name" "$probe_country" >> "$used_meta_file"
    else
      rejected=$((rejected + 1))
      printf '{"id":%s,"name":%s,"label":%s,"subscriptionId":%s,"subscriptionName":%s,"protocol":%s,"provider":%s,"server":%s,"region":%s,"egressCountry":%s,"egressIp":%s,"egressProvider":%s,"latency":0,"jitter":0,"rxMbps":0,"txMbps":0,"score":1,"trend":[],"inPool":false,"reason":%s}\n' \
        "$(json_string "$unique_name")" \
        "$(json_string "$unique_name")" \
        "$(json_string "$unique_name")" \
        "$(json_string "$section")" \
        "$(json_string "$subscription_display")" \
        "$(json_string "$proxy_protocol")" \
        "$(json_string "$subscription_display")" \
        "$(json_string "$proxy_server")" \
        "$(json_string "$probe_country")" \
        "$(json_string "$probe_country")" \
        "$(json_string "$probe_ip")" \
        "$(json_string "$subscription_display")" \
        "$(json_string "$reason")" >> "$nodes_jsonl"
      printf '%s\t%s\t%s\t%s\t%s\n' "$section" "$subscription_display" "$unique_name" "$probe_country" "$reason" >> "$rejected_meta_file"
    fi
  done < "$probe_results_file"

  if [ -s "$allowed_names_file" ]; then
    sort -u "$allowed_names_file" > "$allowed_names_file.next"
    mv "$allowed_names_file.next" "$allowed_names_file"
  fi

  sort -u "$subscription_ids_file" | while IFS= read -r subscription_id; do
    [ -n "$subscription_id" ] || continue
    subscription_name=$(awk -F '\t' -v sid="$subscription_id" '$1 == sid { print $2; exit }' "$used_meta_file")
    if [ -z "$subscription_name" ]; then
      subscription_name=$(awk -F '\t' -v sid="$subscription_id" '$1 == sid { print $2; exit }' "$rejected_meta_file")
    fi
    subscription_name=$(safe_string "$subscription_name" "$subscription_id")
    used_nodes_file="$TMP_DIR/probe-used-$subscription_id.jsonl.$$"
    rejected_nodes_file="$TMP_DIR/probe-rejected-$subscription_id.jsonl.$$"
    used_json_file="$TMP_DIR/probe-used-$subscription_id.json.$$"
    rejected_json_file="$TMP_DIR/probe-rejected-$subscription_id.json.$$"
    : > "$used_nodes_file"
    : > "$rejected_nodes_file"
    awk -F '\t' -v sid="$subscription_id" '$1 == sid { print $3 "\t" $4 }' "$used_meta_file" \
      | while IFS="$tab_char" read -r node_label node_country; do
          [ -n "$node_label" ] || continue
          printf '{"label":%s,"egressCountry":%s}\n' \
            "$(json_string "$node_label")" \
            "$(json_string "$(safe_string "$node_country" '??')")" >> "$used_nodes_file"
        done
    awk -F '\t' -v sid="$subscription_id" '$1 == sid { print $3 "\t" $4 "\t" $5 }' "$rejected_meta_file" \
      | while IFS="$tab_char" read -r node_label node_country node_reason; do
          [ -n "$node_label" ] || continue
          printf '{"label":%s,"egressCountry":%s,"reason":%s}\n' \
            "$(json_string "$node_label")" \
            "$(json_string "$(safe_string "$node_country" '??')")" \
            "$(json_string "$(safe_string "$node_reason" 'Rejected')")" >> "$rejected_nodes_file"
        done
    if [ -s "$used_nodes_file" ]; then
      jsonl_to_array "$used_nodes_file" > "$used_json_file"
    else
      printf '[]' > "$used_json_file"
    fi
    if [ -s "$rejected_nodes_file" ]; then
      jsonl_to_array "$rejected_nodes_file" > "$rejected_json_file"
    else
      printf '[]' > "$rejected_json_file"
    fi
    printf '{"subscriptionId":%s,"subscriptionName":%s,"used":%s,"rejected":%s}\n' \
      "$(json_string "$subscription_id")" \
      "$(json_string "$subscription_name")" \
      "$(cat "$used_json_file")" \
      "$(cat "$rejected_json_file")" >> "$by_subscription_jsonl"
  done

  nodes_json_file="$TMP_DIR/probe-nodes-array.$$"
  by_subscription_json_file="$TMP_DIR/probe-by-subscription-array.$$"
  if [ -s "$nodes_jsonl" ]; then
    jsonl_to_array "$nodes_jsonl" > "$nodes_json_file"
  else
    printf '[]' > "$nodes_json_file"
  fi
  if [ -s "$by_subscription_jsonl" ]; then
    jsonl_to_array "$by_subscription_jsonl" > "$by_subscription_json_file"
  else
    printf '[]' > "$by_subscription_json_file"
  fi

  updated_at="$(now_iso)"
  printf '{"updatedAt":%s,"summary":{"discovered":%s,"used":%s,"rejected":%s,"skipped":0},"nodes":%s,"bySubscription":%s}\n' \
    "$(json_string "$updated_at")" \
    "$discovered" \
    "$used" \
    "$rejected" \
    "$(cat "$nodes_json_file")" \
    "$(cat "$by_subscription_json_file")" > "$output_file"
}

build_filtered_runtime_profile_from_allowed_names() {
  allowed_names_file="$1"
  source_profile="${2:-$CLIENT_PROFILE}"
  [ -s "$allowed_names_file" ] || return 1
  [ -f "$source_profile" ] || return 1

  proxies_jsonl="$TMP_DIR/filtered-runtime-proxies-jsonl.$$"
  proxy_names_file="$TMP_DIR/filtered-runtime-proxy-names.$$"
  proxies_json="$TMP_DIR/filtered-runtime-proxies-array.$$"
  auto_names_json="$TMP_DIR/filtered-runtime-auto-names.$$"
  manual_names_jsonl="$TMP_DIR/filtered-runtime-manual-names-jsonl.$$"
  manual_names_json="$TMP_DIR/filtered-runtime-manual-names.$$"
  select_names_jsonl="$TMP_DIR/filtered-runtime-select-names-jsonl.$$"
  select_names_json="$TMP_DIR/filtered-runtime-select-names.$$"
  profile_json="$TMP_DIR/filtered-runtime-profile-json.$$"
  tmp_proxy_json="$TMP_DIR/filtered-runtime-proxy-json.$$"
  client_proxy_count=$(profile_proxy_count "$source_profile")
  idx=0
  : > "$proxies_jsonl"
  : > "$proxy_names_file"

  while [ "$idx" -lt "$client_proxy_count" ]; do
    proxy_name=$(yq -r ".proxies[$idx].name // \"\"" "$source_profile" 2>/dev/null || true)
    if [ -n "$proxy_name" ] && grep -Fqx "$proxy_name" "$allowed_names_file" 2>/dev/null; then
      yq -p yaml -o=json ".proxies[$idx]" "$source_profile" > "$tmp_proxy_json" 2>/dev/null || {
        idx=$((idx + 1))
        continue
      }
      cat "$tmp_proxy_json" >> "$proxies_jsonl"
      printf '\n' >> "$proxies_jsonl"
      printf '%s\n' "$proxy_name" >> "$proxy_names_file"
    fi
    idx=$((idx + 1))
  done

  [ -s "$proxies_jsonl" ] || return 1

  jsonl_to_array "$proxies_jsonl" > "$proxies_json"
  line_file_to_json_array "$proxy_names_file" > "$auto_names_json"

  : > "$manual_names_jsonl"
  : > "$select_names_jsonl"
  printf '%s\n' "$(json_string "DIRECT")" >> "$manual_names_jsonl"
  printf '%s\n' "$(json_string "AUTO BEST")" >> "$select_names_jsonl"
  printf '%s\n' "$(json_string "DIRECT")" >> "$select_names_jsonl"
  printf '%s\n' "$(json_string "MANUAL SERVER")" >> "$select_names_jsonl"
  while IFS= read -r proxy_name || [ -n "$proxy_name" ]; do
    [ -n "$proxy_name" ] || continue
    printf '%s\n' "$(json_string "$proxy_name")" >> "$manual_names_jsonl"
    printf '%s\n' "$(json_string "$proxy_name")" >> "$select_names_jsonl"
  done < "$proxy_names_file"
  jsonl_to_array "$manual_names_jsonl" > "$manual_names_json"
  jsonl_to_array "$select_names_jsonl" > "$select_names_json"

  auto_interval_minutes=$(model_query '.settings.autoSelection.intervalMinutes // 10')
  case "$auto_interval_minutes" in
    ''|*[!0-9]*) auto_interval_minutes=10 ;;
  esac
  auto_interval_seconds=$((auto_interval_minutes * 60))
  [ "$auto_interval_seconds" -gt 0 ] || auto_interval_seconds=600
  auto_tolerance=$(model_query '.settings.autoSelection.switchTolerance // 120')
  case "$auto_tolerance" in
    ''|*[!0-9]*) auto_tolerance=120 ;;
  esac
  auto_url=$(model_query_default '.settings.autoSelection.delayUrl' "$DELAY_URL_DEFAULT")

  printf '{' > "$profile_json"
  printf '"proxies":%s,' "$(cat "$proxies_json")" >> "$profile_json"
  printf '"proxy-groups":[' >> "$profile_json"
  printf '{"name":"AUTO BEST","type":"url-test","url":%s,"interval":%s,"tolerance":%s,"proxies":%s},' \
    "$(json_string "$auto_url")" \
    "$auto_interval_seconds" \
    "$auto_tolerance" \
    "$(cat "$auto_names_json")" >> "$profile_json"
  printf '{"name":"MANUAL SERVER","type":"select","proxies":%s},' \
    "$(cat "$manual_names_json")" >> "$profile_json"
  printf '{"name":"BLOCKED SITES","type":"select","proxies":%s},' \
    "$(cat "$select_names_json")" >> "$profile_json"
  printf '{"name":"GLOBAL","type":"select","proxies":%s}' \
    "$(cat "$select_names_json")" >> "$profile_json"
  printf '],' >> "$profile_json"
  printf '"rules":["MATCH,DIRECT"]' >> "$profile_json"
  printf '}\n' >> "$profile_json"

  yq -p json -o=yaml '.' "$profile_json" > "$CLIENT_PROFILE" 2>/dev/null
  [ -f "$CLIENT_PROFILE" ] || return 1
  [ "$(profile_proxy_count "$CLIENT_PROFILE")" -gt 0 ]
}

write_empty_inventory() {
  updated_at="$(now_iso)"
  printf '{"updatedAt":%s,"summary":{"discovered":0,"used":0,"rejected":0,"skipped":0},"nodes":[],"bySubscription":[]}\n' \
    "$(json_string "$updated_at")" > "$PANEL_INVENTORY"
}

persist_runtime_inventory_snapshot() {
  snapshot_file=$(build_runtime_inventory_file)
  [ -n "$snapshot_file" ] || return 1
  [ -s "$snapshot_file" ] || return 1
  cp "$snapshot_file" "$PANEL_INVENTORY"
}

build_stock_runtime_profile() {
  valid_sections_file="$1"
  [ -s "$valid_sections_file" ] || return 1

  proxies_jsonl="$TMP_DIR/runtime-proxies-jsonl.$$"
  proxy_names_file="$TMP_DIR/runtime-proxy-names.$$"
  proxies_json="$TMP_DIR/runtime-proxies-array.$$"
  auto_names_json="$TMP_DIR/runtime-auto-names.$$"
  manual_names_jsonl="$TMP_DIR/runtime-manual-names-jsonl.$$"
  manual_names_json="$TMP_DIR/runtime-manual-names.$$"
  select_names_jsonl="$TMP_DIR/runtime-select-names-jsonl.$$"
  select_names_json="$TMP_DIR/runtime-select-names.$$"
  profile_json="$TMP_DIR/runtime-profile-json.$$"
  seen_names="$TMP_DIR/runtime-seen-proxy-names.$$"
  tmp_proxy_json="$TMP_DIR/runtime-proxy-json.$$"
  : > "$proxies_jsonl"
  : > "$proxy_names_file"
  : > "$seen_names"

  while IFS= read -r section; do
    [ -n "$section" ] || continue
    subscription_file="$SUBSCRIPTIONS_DIR/$section.yaml"
    is_valid_profile_file "$subscription_file" || continue
    subscription_label=$(uci -q get "nikki.$section.name" 2>/dev/null || printf '%s' "$section")
    proxy_count=$(profile_proxy_count "$subscription_file")
    idx=0
    while [ "$idx" -lt "$proxy_count" ]; do
      proxy_name=$(yq -r ".proxies[$idx].name // \"\"" "$subscription_file" 2>/dev/null || true)
      [ -n "$proxy_name" ] || {
        idx=$((idx + 1))
        continue
      }
      unique_name=$(make_unique_name "$proxy_name" "$subscription_label" "$seen_names")
      yq -p yaml -o=json ".proxies[$idx]" "$subscription_file" > "$tmp_proxy_json" 2>/dev/null || {
        idx=$((idx + 1))
        continue
      }
      UNIQUE_NAME="$unique_name" yq -p json -o=json '.name = strenv(UNIQUE_NAME)' "$tmp_proxy_json" > "$tmp_proxy_json.next" 2>/dev/null || {
        idx=$((idx + 1))
        continue
      }
      mv "$tmp_proxy_json.next" "$tmp_proxy_json"
      cat "$tmp_proxy_json" >> "$proxies_jsonl"
      printf '\n' >> "$proxies_jsonl"
      printf '%s\n' "$unique_name" >> "$proxy_names_file"
      idx=$((idx + 1))
    done
  done < "$valid_sections_file"

  [ -s "$proxies_jsonl" ] || return 1

  jsonl_to_array "$proxies_jsonl" > "$proxies_json"
  line_file_to_json_array "$proxy_names_file" > "$auto_names_json"

  : > "$manual_names_jsonl"
  : > "$select_names_jsonl"
  printf '%s\n' "$(json_string "DIRECT")" >> "$manual_names_jsonl"
  printf '%s\n' "$(json_string "AUTO BEST")" >> "$select_names_jsonl"
  printf '%s\n' "$(json_string "DIRECT")" >> "$select_names_jsonl"
  printf '%s\n' "$(json_string "MANUAL SERVER")" >> "$select_names_jsonl"
  while IFS= read -r proxy_name || [ -n "$proxy_name" ]; do
    [ -n "$proxy_name" ] || continue
    printf '%s\n' "$(json_string "$proxy_name")" >> "$manual_names_jsonl"
    printf '%s\n' "$(json_string "$proxy_name")" >> "$select_names_jsonl"
  done < "$proxy_names_file"
  jsonl_to_array "$manual_names_jsonl" > "$manual_names_json"
  jsonl_to_array "$select_names_jsonl" > "$select_names_json"

  auto_interval_minutes=$(model_query '.settings.autoSelection.intervalMinutes // 10')
  case "$auto_interval_minutes" in
    ''|*[!0-9]*) auto_interval_minutes=10 ;;
  esac
  auto_interval_seconds=$((auto_interval_minutes * 60))
  [ "$auto_interval_seconds" -gt 0 ] || auto_interval_seconds=600
  auto_tolerance=$(model_query '.settings.autoSelection.switchTolerance // 120')
  case "$auto_tolerance" in
    ''|*[!0-9]*) auto_tolerance=120 ;;
  esac
  auto_url=$(model_query_default '.settings.autoSelection.delayUrl' "$DELAY_URL_DEFAULT")

  printf '{' > "$profile_json"
  printf '"proxies":%s,' "$(cat "$proxies_json")" >> "$profile_json"
  printf '"proxy-groups":[' >> "$profile_json"
  printf '{"name":"AUTO BEST","type":"url-test","url":%s,"interval":%s,"tolerance":%s,"proxies":%s},' \
    "$(json_string "$auto_url")" \
    "$auto_interval_seconds" \
    "$auto_tolerance" \
    "$(cat "$auto_names_json")" >> "$profile_json"
  printf '{"name":"MANUAL SERVER","type":"select","proxies":%s},' \
    "$(cat "$manual_names_json")" >> "$profile_json"
  printf '{"name":"BLOCKED SITES","type":"select","proxies":%s},' \
    "$(cat "$select_names_json")" >> "$profile_json"
  printf '{"name":"GLOBAL","type":"select","proxies":%s}' \
    "$(cat "$select_names_json")" >> "$profile_json"
  printf '],' >> "$profile_json"
  printf '"rules":["MATCH,DIRECT"]' >> "$profile_json"
  printf '}\n' >> "$profile_json"

  yq -p json -o=yaml '.' "$profile_json" > "$CLIENT_PROFILE" 2>/dev/null
  [ -f "$CLIENT_PROFILE" ] || return 1
  [ "$(profile_proxy_count "$CLIENT_PROFILE")" -gt 0 ]
}

refresh_pool_with_stock_nikki() {
  valid_sections_file="$TMP_DIR/pool-valid-sections.$$"
  failed_sections_file="$TMP_DIR/pool-failed-sections.$$"
  sections_file="$TMP_DIR/pool-sections.$$"
  probe_metadata_file="$TMP_DIR/pool-probe-metadata.$$"
  probe_results_file="$TMP_DIR/pool-probe-results.$$"
  allowed_names_file="$TMP_DIR/pool-allowed-names.$$"
  inventory_file="$TMP_DIR/pool-inventory.$$"
  : > "$valid_sections_file"
  : > "$failed_sections_file"
  : > "$sections_file"
  list_managed_subscription_sections > "$sections_file"

  if [ ! -s "$sections_file" ]; then
    rm -f "$CLIENT_PROFILE"
    write_empty_inventory
    set_nikki_profile "file:mission-control-bootstrap.yaml" || true
    set_proxy_interception_state 0 || true
    reload_nikki || true
    scheduler_mark_success "pool-refresh"
    return 0
  fi

  while IFS= read -r section; do
    [ -n "$section" ] || continue
    /etc/init.d/nikki update_subscription "$section" >/dev/null 2>&1 || true
    success=$(uci -q get "nikki.$section.success" 2>/dev/null || printf '0')
    subscription_file="$SUBSCRIPTIONS_DIR/$section.yaml"
    if [ "$success" != "1" ] || ! is_valid_profile_file "$subscription_file"; then
      refresh_subscription_with_bridge_fallback "$section" >/dev/null 2>&1 || true
      success=$(uci -q get "nikki.$section.success" 2>/dev/null || printf '0')
    fi
    if is_valid_profile_file "$subscription_file"; then
      [ "$success" = "1" ] || set_subscription_refresh_result "$section" 1 >/dev/null 2>&1 || true
      success=1
    fi
    if [ "$success" = "1" ] && is_valid_profile_file "$subscription_file"; then
      printf '%s\n' "$section" >> "$valid_sections_file"
    else
      printf '%s\n' "$section" >> "$failed_sections_file"
      if is_valid_profile_file "$subscription_file"; then
        printf '%s\n' "$section" >> "$valid_sections_file"
      fi
    fi
  done < "$sections_file"

  if [ ! -s "$valid_sections_file" ]; then
    rm -f "$CLIENT_PROFILE"
    write_empty_inventory
    set_nikki_profile "file:mission-control-bootstrap.yaml" || true
    set_proxy_interception_state 0 || true
    reload_nikki || true
    scheduler_mark_failure "pool-refresh" "No valid subscription profiles were downloaded. Traffic interception was disabled to keep router access working."
    return 1
  fi

  enable_panel_rule_mixins || true
  if ! build_stock_runtime_profile "$valid_sections_file"; then
    rm -f "$CLIENT_PROFILE"
    write_empty_inventory
    set_nikki_profile "file:mission-control-bootstrap.yaml" || true
    set_proxy_interception_state 0 || true
    reload_nikki || true
    scheduler_mark_failure "pool-refresh" "Downloaded subscriptions did not contain usable inline proxies for Mission Control."
    return 1
  fi

  set_nikki_profile "file:client.yaml"
  set_proxy_interception_state 1 || true
  reload_nikki || {
    scheduler_mark_failure "pool-refresh" "Mission Control rebuilt the runtime profile, but Nikki failed to reload it."
    return 1
  }

  if ! build_subscription_proxy_metadata "$valid_sections_file" "$probe_metadata_file"; then
    rm -f "$CLIENT_PROFILE"
    write_empty_inventory
    set_nikki_profile "file:mission-control-bootstrap.yaml" || true
    set_proxy_interception_state 0 || true
    reload_nikki || true
    scheduler_mark_failure "pool-refresh" "Mission Control could not enumerate subscription nodes for egress verification."
    return 1
  fi
  if ! probe_subscription_proxy_metadata "$probe_metadata_file" "$probe_results_file"; then
    rm -f "$CLIENT_PROFILE"
    write_empty_inventory
    set_nikki_profile "file:mission-control-bootstrap.yaml" || true
    set_proxy_interception_state 0 || true
    reload_nikki || true
    scheduler_mark_failure "pool-refresh" "Mission Control could not probe subscription egress through Nikki."
    return 1
  fi
  if ! build_inventory_from_probe_results "$probe_results_file" "$allowed_names_file" "$inventory_file"; then
    rm -f "$CLIENT_PROFILE"
    write_empty_inventory
    set_nikki_profile "file:mission-control-bootstrap.yaml" || true
    set_proxy_interception_state 0 || true
    reload_nikki || true
    scheduler_mark_failure "pool-refresh" "Mission Control failed to build the filtered node inventory."
    return 1
  fi
  if ! build_filtered_runtime_profile_from_allowed_names "$allowed_names_file"; then
    cp "$inventory_file" "$PANEL_INVENTORY"
    set_nikki_profile "file:mission-control-bootstrap.yaml" || true
    set_proxy_interception_state 0 || true
    reload_nikki || true
    scheduler_mark_failure "pool-refresh" "Egress policy rejected every discovered proxy. Traffic interception was disabled to keep router access working."
    return 1
  fi

  set_nikki_profile "file:client.yaml"
  set_proxy_interception_state 1 || true
  reload_nikki || {
    scheduler_mark_failure "pool-refresh" "Mission Control filtered the pool, but Nikki failed to reload the verified runtime profile."
    return 1
  }
  cp "$inventory_file" "$PANEL_INVENTORY"
  update_pool_managed_base_metadata
  rm -f "$PANEL_STATE_CACHE"

  if [ -s "$failed_sections_file" ]; then
    failed_names="$TMP_DIR/pool-failed-names.$$"
    : > "$failed_names"
    while IFS= read -r failed_section; do
      [ -n "$failed_section" ] || continue
      failed_name=$(uci -q get "nikki.$failed_section.name" 2>/dev/null || printf '%s' "$failed_section")
      printf '%s\n' "$failed_name" >> "$failed_names"
    done < "$failed_sections_file"
    failed_list=$(paste -sd ', ' "$failed_names" 2>/dev/null || true)
    [ -n "$failed_list" ] || failed_list="some subscriptions"
    scheduler_mark_failure "pool-refresh" "Some subscriptions failed to download or validate. The last valid pool stayed active: $failed_list."
    return 1
  fi

  scheduler_mark_success "pool-refresh"
  scheduler_mark_success "auto-best"
  return 0
}

scheduler_job_id_for_base() {
  printf 'base-sync:%s\n' "$1"
}

run_pool_refresh_job() {
  if ! mkdir "$POOL_REFRESH_LOCK_DIR" >/dev/null 2>&1; then
    return 0
  fi
  trap 'rmdir "$POOL_REFRESH_LOCK_DIR" >/dev/null 2>&1 || true' EXIT INT TERM
  scheduler_mark_started "pool-refresh"
  refresh_pool_with_stock_nikki
}

run_auto_best_job() {
  scheduler_mark_started "auto-best"
  if retest_auto_best_group; then
    scheduler_mark_success "auto-best"
    return 0
  fi
  scheduler_mark_failure "auto-best" "Auto BEST retest failed."
  return 1
}

retest_auto_best_group() {
  auto_best_name="AUTO BEST"
  proxies_file="$TMP_DIR/auto-best-proxies.$$"
  status=$(controller_request GET "/proxies")
  [ "$status" = "200" ] || return 1
  cp "$RESP_FILE" "$proxies_file"

  auto_type=$(yq -p json -r '.proxies["AUTO BEST"].type // ""' "$proxies_file" 2>/dev/null || true)
  [ -n "$auto_type" ] || return 1

  status=$(controller_request GET "/proxies/$(urlencode_all "$auto_best_name")/delay" "url=$(urlencode_all "$DELAY_URL_DEFAULT")&timeout=10000")
  if [ "$status" = "200" ]; then
    current=$(controller_proxy_current "$auto_best_name" || true)
    case "$current" in
      ''|DIRECT|REJECT) ;;
      *) return 0 ;;
    esac
  fi

  any_success=0
  while IFS= read -r proxy_name; do
    [ -n "$proxy_name" ] || continue
    status=$(controller_request GET "/proxies/$(urlencode_all "$proxy_name")/delay" "url=$(urlencode_all "$DELAY_URL_DEFAULT")&timeout=10000")
    [ "$status" = "200" ] && any_success=1
  done <<EOF
$(yq -p json -r '.proxies["AUTO BEST"].all[]? // ""' "$proxies_file" 2>/dev/null || true)
EOF

  current=$(controller_proxy_current "$auto_best_name" || true)
  case "$current" in
    ''|DIRECT|REJECT)
      [ "$any_success" -eq 1 ]
      ;;
    *)
      return 0
      ;;
  esac
}

run_log_cleanup_job() {
  scheduler_mark_started "log-cleanup"
  if /etc/init.d/nikki clear_logs >/dev/null 2>&1; then
    scheduler_mark_success "log-cleanup"
    return 0
  fi
  scheduler_mark_failure "log-cleanup" "Log cleanup failed."
  return 1
}

run_base_auto_sync_job() {
  base_id="$1"
  job_id=$(scheduler_job_id_for_base "$base_id")
  scheduler_mark_started "$job_id"
  if sync_base_file "$base_id" && reload_nikki; then
    scheduler_mark_success "$job_id"
    return 0
  fi
  scheduler_mark_failure "$job_id" "Remote base sync failed."
  return 1
}

spawn_bridge_job() {
  job_name="$1"
  shift || true
  if command -v setsid >/dev/null 2>&1; then
    setsid "$SELF_SCRIPT" run-job "$job_name" "$@" </dev/null >/dev/null 2>&1 &
  elif command -v nohup >/dev/null 2>&1; then
    nohup "$SELF_SCRIPT" run-job "$job_name" "$@" >/dev/null 2>&1 </dev/null &
  else
    (
      trap '' HUP
      exec </dev/null >/dev/null 2>&1
      "$SELF_SCRIPT" run-job "$job_name" "$@"
    ) &
  fi
}

run_bridge_job() {
  job_name="$1"
  case "$job_name" in
    pool-refresh)
      run_pool_refresh_job
      ;;
    auto-best)
      run_auto_best_job
      ;;
    log-cleanup)
      run_log_cleanup_job
      ;;
    mission-control-update)
      run_mission_control_update_job
      ;;
    base-sync)
      base_id="${2:-}"
      [ -n "$base_id" ] || exit 1
      run_base_auto_sync_job "$base_id"
      ;;
    *)
      exit 1
      ;;
  esac
}

run_bridge_scheduler_once() {
  if ! mkdir "$SCHEDULER_LOCK_DIR" >/dev/null 2>&1; then
    exit 0
  fi
  trap 'rmdir "$SCHEDULER_LOCK_DIR" >/dev/null 2>&1 || true' EXIT INT TERM

  apply_persisted_routing || true
  automation_enabled || exit 0

  now_epoch_value=$(now_epoch)
  subscription_interval=$(model_query '.settings.automation.subscriptionRefreshMinutes // 360')
  log_cleanup_interval=$(model_query '.settings.automation.logCleanupMinutes // 5')
  release_check_interval=$(mission_control_release_check_minutes)
  auto_interval=$(model_query '.settings.autoSelection.intervalMinutes // 10')

  pool_last_epoch=$(scheduler_state_value "pool-refresh" "lastSuccessEpoch")
  if job_due_now "$(minutes_to_seconds "$subscription_interval")" "$pool_last_epoch" "$now_epoch_value"; then
    run_pool_refresh_job || true
  fi

  auto_last_epoch=$(scheduler_state_value "auto-best" "lastSuccessEpoch")
  if job_due_now "$(minutes_to_seconds "$auto_interval")" "$auto_last_epoch" "$now_epoch_value"; then
    run_auto_best_job || true
  fi

  log_last_epoch=$(scheduler_state_value "log-cleanup" "lastSuccessEpoch")
  if job_due_now "$(minutes_to_seconds "$log_cleanup_interval")" "$log_last_epoch" "$now_epoch_value"; then
    run_log_cleanup_job || true
  fi

  release_last_epoch=$(scheduler_state_value "mission-control-update" "lastSuccessEpoch")
  release_current_ui=$(scheduler_state_value "mission-control-update" "currentUiVersion")
  release_current_bridge=$(scheduler_state_value "mission-control-update" "currentBridgeVersion")
  if [ -z "$release_last_epoch" ] || [ -z "$release_current_ui" ] || [ -z "$release_current_bridge" ]; then
    run_mission_control_update_job || true
  elif job_due_now "$(minutes_to_seconds "$release_check_interval")" "$release_last_epoch" "$now_epoch_value"; then
    run_mission_control_update_job || true
  fi

  model_query '.bases[] | select(.sourceType == "remote" and .enabled == true and .autoUpdate == true and ((.updateEveryHours // 0) | tonumber) > 0) | .id' \
    | while IFS= read -r base_id; do
        [ -n "$base_id" ] || continue
        last_epoch=$(scheduler_state_value "$(scheduler_job_id_for_base "$base_id")" "lastSuccessEpoch")
        base_hours=$(base_field "$base_id" updateEveryHours)
        if job_due_now "$(hours_to_seconds "$base_hours")" "$last_epoch" "$now_epoch_value"; then
          run_base_auto_sync_job "$base_id" || true
        fi
      done
}

subscription_sections_json() {
  sections_file="$TMP_DIR/subscription-sections.$$"
  subscriptions_first=1
  printf '['
  uci show nikki | sed -n "s/^nikki\.\([^.=]*\)=subscription$/\1/p" > "$sections_file"
  while IFS= read -r section; do
    [ -n "$section" ] || continue
    subscription_is_placeholder_section "$section" && continue
    name=$(uci -q get "nikki.$section.name" 2>/dev/null || printf '%s' "$section")
    url=$(uci -q get "nikki.$section.url" 2>/dev/null || true)
    format=$(uci -q get "nikki.$section.panel_format" 2>/dev/null || printf 'clash')
    updated=$(subscription_last_sync_at "$section")
    enabled=true
    id_json=$(json_string "$section")
    name_json=$(json_string "$name")
    url_json=$(json_string "$url")
    format_json=$(json_string "$format")
    updated_json=$(json_string "$updated")
    if [ "$subscriptions_first" -eq 1 ]; then
      subscriptions_first=0
    else
      printf ','
    fi
    printf '{"id":%s,"name":%s,"url":%s,"format":%s,"lastSyncAt":%s,"enabled":%s}' \
      "$id_json" "$name_json" "$url_json" "$format_json" "$updated_json" "$enabled"
  done < "$sections_file"
  printf ']'
}

inventory_nodes_json() {
  source_file=$(inventory_source_file)
  yq -p json -o=json '.nodes // []' "$source_file" 2>/dev/null || printf '[]'
}

inventory_report_json() {
  source_file=$(inventory_source_file)
  yq -p json -o=json '.bySubscription // []' "$source_file" 2>/dev/null || printf '[]'
}

inventory_summary_json() {
  source_file=$(inventory_source_file)
  yq -p json -o=json '.summary // {"discovered":0,"used":0,"rejected":0,"skipped":0}' "$source_file" 2>/dev/null \
    || printf '{"discovered":0,"used":0,"rejected":0,"skipped":0}'
}

inventory_updated_at() {
  source_file=$(inventory_source_file)
  yq -p json -r '.updatedAt // ""' "$source_file" 2>/dev/null || true
}

current_proxy_lookup_json() {
  inventory_nodes_json | yq -p json -o=json '
    reduce .[] as $item ({}; .[$item.id] = $item)
  ' 2>/dev/null || printf '{}'
}

build_bases_json() {
  ids_file="$TMP_DIR/base-ids.$$"
  bases_first=1
  printf '['
  EMPTY="$EMPTY_FIELD_TOKEN" yq -p json -r '
    .bases[] |
    [
      ((.id | select(. != null and . != "")) // strenv(EMPTY)),
      ((.name | select(. != null and . != "")) // strenv(EMPTY)),
      ((.scope | select(. != null and . != "")) // strenv(EMPTY)),
      ((.kind | select(. != null and . != "")) // strenv(EMPTY)),
      ((.sourceType | select(. != null and . != "")) // strenv(EMPTY)),
      ((.format | select(. != null and . != "")) // strenv(EMPTY)),
      ((.sourceUrl | select(. != null and . != "")) // strenv(EMPTY)),
      ((.runtimeMode | select(. != null and . != "")) // strenv(EMPTY)),
      (((.autoUpdate | tostring) | select(. != "null")) // strenv(EMPTY)),
      (((.updateEveryHours | tostring) | select(. != "null")) // "0"),
      (((.enabled | tostring) | select(. != "null")) // strenv(EMPTY)),
      ((.lastSyncAt | select(. != null and . != "")) // strenv(EMPTY)),
      ((.filePath | select(. != null and . != "")) // strenv(EMPTY)),
      (((.itemCount | tostring) | select(. != "null")) // "0"),
      ((.note | select(. != null and . != "")) // strenv(EMPTY))
    ] | @tsv
  ' "$PANEL_MODEL" > "$ids_file"
  while IFS="$(printf '\t')" read -r base_id name scope kind source_type format source_url runtime_mode auto_update update_every_hours enabled last_sync file_path base_item_count note; do
    [ -n "$base_id" ] || continue
    base_id=$(restore_empty_field "$base_id")
    name=$(restore_empty_field "$name")
    should_hide_panel_entity "$base_id" "$name" && continue
    scope=$(restore_empty_field "$scope")
    kind=$(restore_empty_field "$kind")
    source_type=$(restore_empty_field "$source_type")
    format=$(restore_empty_field "$format")
    source_url=$(restore_empty_field "$source_url")
    runtime_mode=$(restore_empty_field "$runtime_mode")
    auto_update=$(restore_empty_field "$auto_update")
    enabled=$(restore_empty_field "$enabled")
    last_sync=$(restore_empty_field "$last_sync")
    file_path=$(restore_empty_field "$file_path")
    note=$(restore_empty_field "$note")
    case "$update_every_hours" in
      ''|*[!0-9-]*) update_every_hours=0 ;;
    esac
    base_item_count=$(count_entries "$file_path")
    entries_json='[]'
    if [ "$source_type" = "local" ]; then
      entries_json=$(list_entries_json "$file_path" "$kind")
    fi
    if [ -z "$last_sync" ]; then
      last_sync=$(file_modified_at "$file_path")
    fi
    case "$base_item_count" in
      ''|*[!0-9-]*) base_item_count=0 ;;
    esac
    preview_json=$(preview_entries_json "$file_path" "$kind" 8)
    id_json=$(json_string "$base_id")
    name_json=$(json_string "$name")
    scope_json=$(json_string "$scope")
    kind_json=$(json_string "$kind")
    source_type_json=$(json_string "$source_type")
    format_json=$(json_string "$format")
    source_url_json=$(json_string "$source_url")
    runtime_mode_json=$(json_string "$runtime_mode")
    file_path_json=$(json_string "$file_path")
    note_json=$(json_string "$note")
    last_sync_json=$(json_string "$last_sync")
    if [ "$bases_first" -eq 1 ]; then
      bases_first=0
    else
      printf ','
    fi
    printf '{"id":%s,"name":%s,"scope":%s,"kind":%s,"sourceType":%s,"format":%s,"sourceUrl":%s,"runtimeMode":%s,"autoUpdate":%s,"updateEveryHours":%s,"enabled":%s,"lastSyncAt":%s,"filePath":%s,"itemCount":%s,"preview":%s,"entries":%s,"note":%s}' \
      "$id_json" "$name_json" "$scope_json" "$kind_json" "$source_type_json" "$format_json" "$source_url_json" "$runtime_mode_json" "$(bool_json "$auto_update")" "$update_every_hours" "$(bool_json "$enabled")" "$last_sync_json" "$file_path_json" "$base_item_count" "$preview_json" "$entries_json" "$note_json"
  done < "$ids_file"
  rm -f "$ids_file"
  printf ']'
}

build_rules_json() {
  ids_file="$TMP_DIR/rule-ids.$$"
  rules_first=1
  printf '['
  EMPTY="$EMPTY_FIELD_TOKEN" yq -p json -r '
    .rules[] |
    [
      ((.id | select(. != null and . != "")) // strenv(EMPTY)),
      ((.name | select(. != null and . != "")) // strenv(EMPTY)),
      (((.priority | tostring) | select(. != "null")) // "999"),
      ((.action | select(. != null and . != "")) // strenv(EMPTY)),
      ((.target | select(. != null and . != "")) // strenv(EMPTY)),
      (((.enabled | tostring) | select(. != "null")) // strenv(EMPTY)),
      (((.locked | tostring) | select(. != "null")) // strenv(EMPTY)),
      ((.matchMode | select(. != null and . != "")) // strenv(EMPTY)),
      ((((.baseIds // []) | join("|")) | select(. != "")) // strenv(EMPTY)),
      ((.note | select(. != null and . != "")) // strenv(EMPTY))
    ] | @tsv
  ' "$PANEL_MODEL" > "$ids_file"
  while IFS="$(printf '\t')" read -r rule_id name priority action target enabled locked match_mode base_ids note; do
    [ -n "$rule_id" ] || continue
    rule_id=$(restore_empty_field "$rule_id")
    name=$(restore_empty_field "$name")
    should_hide_panel_entity "$rule_id" "$name" && continue
    action=$(restore_empty_field "$action")
    target=$(restore_empty_field "$target")
    enabled=$(restore_empty_field "$enabled")
    locked=$(restore_empty_field "$locked")
    match_mode=$(restore_empty_field "$match_mode")
    base_ids=$(restore_empty_field "$base_ids")
    note=$(restore_empty_field "$note")
    case "$priority" in
      ''|*[!0-9-]*) priority=999 ;;
    esac
    base_ids_json=$(json_array_from_pipe_values "$base_ids")
    id_json=$(json_string "$rule_id")
    name_json=$(json_string "$name")
    action_json=$(json_string "$action")
    target_json=$(json_string "$target")
    match_mode_json=$(json_string "$match_mode")
    note_json=$(json_string "$note")
    if [ "$rules_first" -eq 1 ]; then
      rules_first=0
    else
      printf ','
    fi
    printf '{"id":%s,"name":%s,"priority":%s,"action":%s,"target":%s,"enabled":%s,"locked":%s,"matchMode":%s,"baseIds":%s,"note":%s}' \
      "$id_json" "$name_json" "$priority" "$action_json" "$target_json" "$(bool_json "$enabled")" "$(bool_json "$locked")" "$match_mode_json" "$base_ids_json" "$note_json"
  done < "$ids_file"
  rm -f "$ids_file"
  printf ']'
}

automation_state_json() {
  enabled=$(model_bool_text_default '.settings.automation.enabled' 'true')
  subscription_interval=$(model_query '.settings.automation.subscriptionRefreshMinutes // 360')
  log_cleanup_interval=$(model_query '.settings.automation.logCleanupMinutes // 5')
  release_check_interval=$(mission_control_release_check_minutes)
  ui_auto_update=$(model_bool_text_default '.settings.automation.uiAutoUpdate' 'true')
  bridge_auto_update=$(model_bool_text_default '.settings.automation.bridgeAutoUpdate' 'true')
  manifest_url=$(mission_control_manifest_url)
  latest_version=$(scheduler_state_value "mission-control-update" "latestVersion")
  latest_ui_version=$(scheduler_state_value "mission-control-update" "latestUiVersion")
  latest_bridge_version=$(scheduler_state_value "mission-control-update" "latestBridgeVersion")
  current_ui_version=$(scheduler_state_value "mission-control-update" "currentUiVersion")
  current_bridge_version=$(scheduler_state_value "mission-control-update" "currentBridgeVersion")
  latest_tag=$(scheduler_state_value "mission-control-update" "latestTag")
  latest_published_at=$(scheduler_state_value "mission-control-update" "latestPublishedAt")
  latest_release_url=$(scheduler_state_value "mission-control-update" "latestReleaseUrl")
  latest_release_name=$(scheduler_state_value "mission-control-update" "latestReleaseName")
  latest_changelog=$(scheduler_state_value "mission-control-update" "latestChangelog")
  update_available=$(scheduler_state_value "mission-control-update" "updateAvailable")
  [ -n "$current_ui_version" ] || current_ui_version=$(current_ui_version)
  [ -n "$current_bridge_version" ] || current_bridge_version=$(current_bridge_version)
  last_checked_at=$(scheduler_state_value "mission-control-update" "lastCheckedAt")
  last_applied_at=$(scheduler_state_value "mission-control-update" "lastAppliedAt")
  last_status=$(scheduler_state_value "mission-control-update" "lastStatus")
  last_error=$(scheduler_state_value "mission-control-update" "lastError")
  scheduler_json='{"updatedAt":"","jobs":{}}'
  scheduler_json=$(scheduler_state_normalized_json 2>/dev/null || scheduler_state_default_json)
  [ "$update_available" = "true" ] && update_available_json=true || update_available_json=false
  printf '{"enabled":%s,"subscriptionRefreshMinutes":%s,"logCleanupMinutes":%s,"release":{"checkMinutes":%s,"uiAutoUpdate":%s,"bridgeAutoUpdate":%s,"manifestUrl":%s,"currentUiVersion":%s,"currentBridgeVersion":%s,"latestVersion":%s,"latestUiVersion":%s,"latestBridgeVersion":%s,"latestTag":%s,"latestPublishedAt":%s,"latestReleaseUrl":%s,"latestReleaseName":%s,"latestChangelog":%s,"updateAvailable":%s,"lastCheckedAt":%s,"lastAppliedAt":%s,"lastStatus":%s,"lastError":%s},"scheduler":%s}' \
    "$(bool_json "$enabled")" \
    "${subscription_interval:-360}" \
    "${log_cleanup_interval:-5}" \
    "${release_check_interval:-360}" \
    "$(bool_json "$ui_auto_update")" \
    "$(bool_json "$bridge_auto_update")" \
    "$(json_string "$manifest_url")" \
    "$(json_string "$current_ui_version")" \
    "$(json_string "$current_bridge_version")" \
    "$(json_string "$latest_version")" \
    "$(json_string "$latest_ui_version")" \
    "$(json_string "$latest_bridge_version")" \
    "$(json_string "$latest_tag")" \
    "$(json_string "$latest_published_at")" \
    "$(json_string "$latest_release_url")" \
    "$(json_string "$latest_release_name")" \
    "$(json_string "$latest_changelog")" \
    "$update_available_json" \
    "$(json_string "$last_checked_at")" \
    "$(json_string "$last_applied_at")" \
    "$(json_string "$last_status")" \
    "$(json_string "$last_error")" \
    "$scheduler_json"
}

write_panel_state_file() {
  out_file="$1"
  subs_json_file="$TMP_DIR/subs.$$"
  bases_json_file="$TMP_DIR/bases.$$"
  rules_json_file="$TMP_DIR/rules.$$"
  lookup_json_file="$TMP_DIR/lookup.$$"
  timing_mark 'state:start'
  printf '%s' "$(subscription_sections_json)" > "$subs_json_file"
  timing_mark 'state:subscriptions'
  printf '%s' "$(build_bases_json)" > "$bases_json_file"
  timing_mark 'state:bases'
  printf '%s' "$(build_rules_json)" > "$rules_json_file"
  timing_mark 'state:rules'
  printf '%s' "$(current_proxy_lookup_json)" > "$lookup_json_file"
  timing_mark 'state:lookup'
  last_reprocess=$(inventory_updated_at)
  auto_metric=$(model_query '.settings.autoSelection.metric // "latency"')
  auto_interval=$(model_query '.settings.autoSelection.intervalMinutes // 10')
  auto_sticky=$(model_bool_text_default '.settings.autoSelection.stickyBest' 'true')
  auto_min_score=$(model_query '.settings.autoSelection.minScore // 55')
  auto_tolerance=$(model_query '.settings.autoSelection.switchTolerance // 120')
  blocked_json=$(model_json_query '.settings.egressPolicy.blockedCountries // []' '[]')
  allow_unknown=$(model_query '.settings.egressPolicy.allowUnknown // false')
  panel_theme=$(model_query '.settings.panel.theme // "graphite"')
  panel_density=$(model_query '.settings.panel.density // "comfortable"')
  panel_scale=$(model_query '.settings.panel.scale // 100')
  panel_animations=$(model_bool_text_default '.settings.panel.animations' 'true')
  panel_auto_refresh=$(model_bool_text_default '.settings.panel.autoRefresh' 'true')
  panel_graph_range=$(model_query '.settings.panel.graphRange // 30')
  panel_chart_line_width=$(model_query '.settings.panel.chartLineWidth // 3')
  panel_speed_unit_mode=$(model_query '.settings.panel.speedUnitMode // "bits"')
  panel_storage_unit_system=$(model_query '.settings.panel.storageUnitSystem // "binary"')
  panel_language=$(model_query '.settings.panel.language // "ru"')
  mihomo_memory_limit_max=$(system_memory_total_mib)
  mihomo_memory_limit=$(sanitize_int "$(model_query '.settings.runtime.mihomoMemoryLimitMiB // 0')" 0 0 "$mihomo_memory_limit_max")
  controller_selector_group=$(model_query '.settings.controller.selectorGroup // "GLOBAL"')
  controller_delay_url=$(model_query '.settings.controller.delayUrl // "https://www.gstatic.com/generate_204"')
  controller_delay_timeout=$(model_query '.settings.controller.delayTimeout // 5000')
  controller_poll_interval=$(model_query '.settings.controller.pollIntervalMs // 2000')
  controller_use_websocket=$(model_bool_text_default '.settings.controller.useWebSocket' 'true')
  routing_mode=$(model_query '.settings.routing.mode // "smart"')
  routing_global_target=$(model_query '.settings.routing.globalTarget // "AUTO BEST"')
  routing_blocked_target=$(model_query '.settings.routing.blockedTarget // "auto"')
  routing_manual_target=$(model_query '.settings.routing.manualServerId // ""')
  printf '{' > "$out_file"
  printf '"settings":{"theme":%s,"density":%s,"scale":%s,"animations":%s,"autoRefresh":%s,"graphRange":%s,"chartLineWidth":%s,"speedUnitMode":%s,"storageUnitSystem":%s,"language":%s,"mihomoMemoryLimitMiB":%s,"mihomoMemoryLimitMaxMiB":%s},' \
    "$(json_string "$panel_theme")" \
    "$(json_string "$panel_density")" \
    "$panel_scale" \
    "$(bool_json "$panel_animations")" \
    "$(bool_json "$panel_auto_refresh")" \
    "$panel_graph_range" \
    "$panel_chart_line_width" \
    "$(json_string "$panel_speed_unit_mode")" \
    "$(json_string "$panel_storage_unit_system")" \
    "$(json_string "$panel_language")" \
    "$mihomo_memory_limit" \
    "$mihomo_memory_limit_max" >> "$out_file"
  printf '"controller":{"managedLive":true,"bridgeManaged":true,"selectorGroup":%s,"delayUrl":%s,"delayTimeout":%s,"pollIntervalMs":%s,"useWebSocket":%s},' \
    "$(json_string "$controller_selector_group")" \
    "$(json_string "$controller_delay_url")" \
    "$controller_delay_timeout" \
    "$controller_poll_interval" \
    "$(bool_json "$controller_use_websocket")" >> "$out_file"
  printf '"automation":%s,' "$(automation_state_json)" >> "$out_file"
  printf '"routing":{"listMode":"ru-only","preferredMode":%s,"preferredGlobalTarget":%s,"preferredBlockedTarget":%s,"preferredManualServerId":%s,"autoSelection":{"metric":%s,"intervalMinutes":%s,"stickyBest":%s,"minScore":%s,"switchTolerance":%s}},' \
    "$(json_string "$routing_mode")" \
    "$(json_string "$routing_global_target")" \
    "$(json_string "$routing_blocked_target")" \
    "$(json_string "$routing_manual_target")" \
    "$(json_string "$auto_metric")" \
    "$auto_interval" \
    "$(bool_json "$auto_sticky")" \
    "$auto_min_score" \
    "$auto_tolerance" >> "$out_file"
  printf '"subscriptions":{"items":%s,"egressPolicy":{"blockedCountries":%s,"allowUnknown":%s},"lastReprocessAt":%s},' \
    "$(cat "$subs_json_file")" \
    "$blocked_json" \
    "$(bool_json "$allow_unknown")" \
    "$(json_string "$last_reprocess")" >> "$out_file"
  printf '"ruleEngine":{"bases":%s,"rules":%s},' \
    "$(cat "$bases_json_file")" \
    "$(cat "$rules_json_file")" >> "$out_file"
  printf '"inventory":{"summary":%s,"nodes":%s,"bySubscription":%s,"nodeLookup":%s}}' \
    "$(inventory_summary_json)" \
    "$(inventory_nodes_json)" \
    "$(inventory_report_json)" \
    "$(cat "$lookup_json_file")" >> "$out_file"
  timing_mark 'state:done'
}

panel_state_cache_stale() {
  pool_refresh_status=$(scheduler_state_value "pool-refresh" "lastStatus")
  [ -s "$PANEL_STATE_CACHE" ] || { debug_mark 'state-cache-stale:missing'; return 0; }
  yq -p json -o=json '.' "$PANEL_STATE_CACHE" >/dev/null 2>&1 || { debug_mark 'state-cache-stale:invalid-json'; return 0; }
  if [ -s "$SCHEDULER_STATE_FILE" ] && ! yq -p json -o=json '.' "$SCHEDULER_STATE_FILE" >/dev/null 2>&1; then
    debug_mark 'state-cache-stale:scheduler-invalid'
    return 0
  fi
  [ "$0" -nt "$PANEL_STATE_CACHE" ] && { debug_mark "state-cache-stale:script:$0"; return 0; }
  [ "$PANEL_MODEL" -nt "$PANEL_STATE_CACHE" ] && { debug_mark "state-cache-stale:model:$PANEL_MODEL"; return 0; }
  [ "$PANEL_INVENTORY" -nt "$PANEL_STATE_CACHE" ] && { debug_mark "state-cache-stale:inventory:$PANEL_INVENTORY"; return 0; }
  [ -f "$SCHEDULER_STATE_FILE" ] && [ "$SCHEDULER_STATE_FILE" -nt "$PANEL_STATE_CACHE" ] && { debug_mark "state-cache-stale:scheduler:$SCHEDULER_STATE_FILE"; return 0; }
  if [ "$pool_refresh_status" != 'running' ] && [ ! -d "$POOL_REFRESH_LOCK_DIR" ]; then
    [ -f "$CLIENT_PROFILE" ] && [ "$CLIENT_PROFILE" -nt "$PANEL_STATE_CACHE" ] && { debug_mark "state-cache-stale:client:$CLIENT_PROFILE"; return 0; }
  fi
  [ -f /etc/config/nikki ] && [ /etc/config/nikki -nt "$PANEL_STATE_CACHE" ] && { debug_mark 'state-cache-stale:uci:/etc/config/nikki'; return 0; }
  return 1
}

refresh_panel_state_cache() {
  tmp_cache="$TMP_DIR/state-cache.$$"
  write_panel_state_file "$tmp_cache"
  mv "$tmp_cache" "$PANEL_STATE_CACHE"
}

schedule_panel_state_cache_refresh() {
  if mkdir "$PANEL_STATE_REFRESH_LOCK_DIR" >/dev/null 2>&1; then
    (
      exec </dev/null >/dev/null 2>&1
      refresh_panel_state_cache || true
      rmdir "$PANEL_STATE_REFRESH_LOCK_DIR" >/dev/null 2>&1 || true
    ) &
  fi
}

build_panel_state() {
  if [ ! -s "$PANEL_STATE_CACHE" ]; then
    refresh_panel_state_cache
  elif panel_state_cache_stale; then
    schedule_panel_state_cache_refresh
  fi
  cp "$PANEL_STATE_CACHE" "$RESP_FILE"
  respond_file '200 OK' "$RESP_FILE"
}

build_panel_connections() {
  status=$(controller_request GET "/connections" "" "" "--max-time 20")
  case "$status" in
    2*|3*)
      connections_tmp="$TMP_DIR/panel-connections.$$"
      yq -p json -o=json '
        {
          "connections": (
            (.connections // [])
            | map({
                "id": ((.id // "") | tostring),
                "start": (.start // .startAt // ""),
                "download": (.download // .downloaded // 0),
                "upload": (.upload // .uploaded // 0),
                "rule": (.rule // .rulePayload // ""),
                "chains": (.chains // []),
                "inbound": (.inbound // .metadata.inbound // ""),
                "network": (.metadata.network // .network // "tcp"),
                "metadata": {
                  "sourceIP": (.metadata.sourceIP // .metadata.srcIP // .metadata.source // .metadata.clientIP // ""),
                  "sourcePort": (.metadata.sourcePort // .metadata.srcPort // 0),
                  "destinationIP": (.metadata.destinationIP // .metadata.dstIP // .metadata.destination // .metadata.remoteDestination // .metadata.host // ""),
                  "destinationPort": (.metadata.destinationPort // .metadata.dstPort // .metadata.port // 0),
                  "host": (.metadata.host // .metadata.destination // .metadata.remoteDestination // ""),
                  "type": (.metadata.type // ""),
                  "network": (.metadata.network // .network // "tcp")
                }
              })
          )
        }
      ' "$RESP_FILE" > "$connections_tmp" 2>/dev/null || respond_error '500 Internal Server Error' 'Failed to normalize connections.'
      mv "$connections_tmp" "$RESP_FILE"
      respond_file '200 OK' "$RESP_FILE"
      ;;
    401) respond_file '401 Unauthorized' "$RESP_FILE" ;;
    403) respond_file '403 Forbidden' "$RESP_FILE" ;;
    404) respond_file '404 Not Found' "$RESP_FILE" ;;
    *) respond_file '502 Bad Gateway' "$RESP_FILE" ;;
  esac
}

build_panel_memory() {
  secret=$(controller_secret)
  [ -n "$secret" ] || respond_error '502 Bad Gateway' 'Mihomo secret is missing.'
  memory_tmp="$TMP_DIR/panel-memory.$$"
  controller_url=$(controller_base_url)
  curl_status=0
  curl -sS --connect-timeout 3 --max-time 4 \
    -H "Authorization: Bearer $secret" \
    "$controller_url/memory" > "$memory_tmp" 2>/dev/null || curl_status=$?
  case "$curl_status" in
    0|28) : ;;
    *) respond_error '502 Bad Gateway' 'Failed to read Mihomo memory stream.' ;;
  esac
  awk 'NF { line = $0 } END { if (line != "") print line }' "$memory_tmp" > "$RESP_FILE"
  [ -s "$RESP_FILE" ] || respond_error '502 Bad Gateway' 'Memory stream returned no samples.'
  respond_file '200 OK' "$RESP_FILE"
}

build_panel_traffic() {
  status=$(controller_request GET "/connections" "" "" "--max-time 10")
  case "$status" in
    200)
      traffic_now=$(date +%s)
      case "$traffic_now" in
        ''|*[!0-9]*) traffic_now=0 ;;
      esac

      prev_time=""
      if [ -f "$TRAFFIC_CACHE_TIME_FILE" ]; then
        prev_time=$(cat "$TRAFFIC_CACHE_TIME_FILE" 2>/dev/null || true)
      fi
      case "$prev_time" in
        ''|*[!0-9]*) prev_time=0 ;;
      esac

      interval=$((traffic_now - prev_time))
      [ "$interval" -ge 1 ] || interval=1

      traffic_prev="$TMP_DIR/panel-traffic-prev.$$"
      traffic_lines="$TMP_DIR/panel-traffic-lines.$$"
      cp "$TRAFFIC_CACHE_FILE" "$traffic_prev" 2>/dev/null || : > "$traffic_prev"

      yq -p json -r '
        (.connections // [])
        | map([
            (.id // ""),
            ((.upload // .uploaded // 0) | tostring),
            ((.download // .downloaded // 0) | tostring),
            (((.chains // [])[0]) // "")
          ])
        | .[]
        | @tsv
      ' "$RESP_FILE" > "$traffic_lines" 2>/dev/null || respond_error '500 Internal Server Error' 'Failed to normalize traffic.'

      awk -F '\t' -v seconds="$interval" '
        function is_direct(chain) {
          return chain == "" || chain == "DIRECT" || chain == "COMPATIBLE" || chain == "PASS"
        }
        NR == FNR {
          prev_up[$1] = $2 + 0
          prev_down[$1] = $3 + 0
          next
        }
        {
          id = $1
          up = $2 + 0
          down = $3 + 0
          chain = $4
          if (!is_direct(chain) && (id in prev_up)) {
            up_delta = up - prev_up[id]
            down_delta = down - prev_down[id]
            if (up_delta > 0) {
              up_sum += up_delta
            }
            if (down_delta > 0) {
              down_sum += down_delta
            }
          }
        }
        END {
          printf "{\"up\":%.0f,\"down\":%.0f,\"interval\":%d,\"scope\":\"tunnel\",\"source\":\"connections-proxied\"}\n", up_sum / seconds, down_sum / seconds, seconds
        }
      ' "$traffic_prev" "$traffic_lines" > "$RESP_FILE" 2>/dev/null || respond_error '500 Internal Server Error' 'Failed to compute tunnel traffic.'

      mv "$traffic_lines" "$TRAFFIC_CACHE_FILE"
      printf '%s\n' "$traffic_now" > "$TRAFFIC_CACHE_TIME_FILE"
      respond_file '200 OK' "$RESP_FILE"
      ;;
    401) respond_file '401 Unauthorized' "$RESP_FILE" ;;
    403) respond_file '403 Forbidden' "$RESP_FILE" ;;
    404) respond_file '404 Not Found' "$RESP_FILE" ;;
    *) respond_file '502 Bad Gateway' "$RESP_FILE" ;;
  esac
}

find_current_selection() {
  group_name="$1"
  group_enc=$(printf '%s' "$group_name" | sed 's/ /%20/g')
  controller_get_value "/proxies/$group_enc" "" '.now // ""'
}

normalize_panel_routing_mode() {
  case "$1" in
    direct) printf 'direct' ;;
    global) printf 'global' ;;
    rule|smart|'') printf 'smart' ;;
    *) printf 'smart' ;;
  esac
}

mihomo_mode_from_panel_mode() {
  case "$1" in
    direct) printf 'direct' ;;
    global) printf 'global' ;;
    *) printf 'rule' ;;
  esac
}

panel_mode_from_mihomo_mode() {
  case "$1" in
    direct) printf 'direct' ;;
    global) printf 'global' ;;
    *) printf 'smart' ;;
  esac
}

set_proxy_group_if_needed() {
  group_name="$1"
  target_name="$2"
  [ -n "$group_name" ] || return 0
  [ -n "$target_name" ] || return 0
  current=$(find_current_selection "$group_name" 2>/dev/null || true)
  [ "$current" = "$target_name" ] && return 0
  body="$TMP_DIR/proxy-set.$$"
  printf '{"name":%s}\n' "$(json_string "$target_name")" > "$body"
  status=$(controller_request PUT "/proxies/$(urlencode_all "$group_name")" "" "$body" "--max-time 5")
  rm -f "$body"
  case "$status" in
    2*|3*) return 0 ;;
    *) return 1 ;;
  esac
}

set_controller_mode_if_needed() {
  next_mode="$1"
  [ -n "$next_mode" ] || return 0
  current=$(controller_get_value "/configs" "" '.mode // ""' 2>/dev/null || true)
  [ "$current" = "$next_mode" ] && return 0
  body="$TMP_DIR/config-set.$$"
  printf '{"mode":%s}\n' "$(json_string "$next_mode")" > "$body"
  status=$(controller_request PATCH "/configs" "" "$body" "--max-time 5")
  rm -f "$body"
  case "$status" in
    2*|3*) return 0 ;;
    *) return 1 ;;
  esac
}

routing_apply_due() {
  interval_seconds="${1:-30}"
  case "$interval_seconds" in
    ''|*[!0-9]*) interval_seconds=30 ;;
  esac
  [ -s "$ROUTING_APPLY_STAMP" ] || return 0
  last_apply=$(cat "$ROUTING_APPLY_STAMP" 2>/dev/null || printf '0')
  case "$last_apply" in
    ''|*[!0-9]*) return 0 ;;
  esac
  [ $(( $(now_epoch) - last_apply )) -ge "$interval_seconds" ]
}

mark_routing_applied() {
  printf '%s\n' "$(now_epoch)" > "$ROUTING_APPLY_STAMP" 2>/dev/null || true
}

apply_persisted_routing() {
  preferred_mode=$(normalize_panel_routing_mode "$(model_query '.settings.routing.mode // "smart"')")
  global_target=$(model_query '.settings.routing.globalTarget // "AUTO BEST"')
  blocked_target=$(model_query '.settings.routing.blockedTarget // "auto"')
  manual_target=$(model_query '.settings.routing.manualServerId // ""')

  case "$blocked_target" in
    direct)
      set_proxy_group_if_needed "BLOCKED SITES" "DIRECT" || true
      ;;
    manual)
      if [ -n "$manual_target" ]; then
        set_proxy_group_if_needed "MANUAL SERVER" "$manual_target" || true
        set_proxy_group_if_needed "BLOCKED SITES" "MANUAL SERVER" || true
      else
        set_proxy_group_if_needed "BLOCKED SITES" "AUTO BEST" || true
      fi
      ;;
    *)
      set_proxy_group_if_needed "BLOCKED SITES" "AUTO BEST" || true
      ;;
  esac

  case "$preferred_mode" in
    direct)
      set_proxy_group_if_needed "GLOBAL" "DIRECT" || true
      ;;
    smart|global)
      case "$global_target" in
        ''|DIRECT) global_target="AUTO BEST" ;;
      esac
      set_proxy_group_if_needed "GLOBAL" "$global_target" || true
      ;;
  esac

  set_controller_mode_if_needed "$(mihomo_mode_from_panel_mode "$preferred_mode")" || true
  mark_routing_applied
}

apply_persisted_routing_preserve_response() {
  preserved_resp="$TMP_DIR/response-preserved.$$"
  if [ -f "$RESP_FILE" ]; then
    cp "$RESP_FILE" "$preserved_resp" 2>/dev/null || : > "$preserved_resp"
  else
    : > "$preserved_resp"
  fi
  apply_persisted_routing || true
  cp "$preserved_resp" "$RESP_FILE" 2>/dev/null || true
  rm -f "$preserved_resp"
}

persist_runtime_routing_if_needed() {
  method="$1"
  path="$2"
  status="$3"
  case "$status" in
    2*|3*) ;;
    *) return 0 ;;
  esac
  [ -s "$BODY_FILE" ] || return 0

  changed=0
  restore_routing=0
  model_tmp_begin
  if [ "$method" = "PATCH" ] && [ "$path" = "/configs" ]; then
    runtime_mode=$(body_get '.mode // ""')
    if [ -n "$runtime_mode" ]; then
      panel_mode=$(panel_mode_from_mihomo_mode "$runtime_mode")
      MODE="$panel_mode" model_tmp_apply '.settings.routing.mode = strenv(MODE)'
      changed=1
      case "$panel_mode" in
        smart|global) restore_routing=1 ;;
      esac
    fi
  fi

  if [ "$method" = "PUT" ]; then
    case "$path" in
      /proxies/GLOBAL)
        target=$(body_get '.name // ""')
        if [ -n "$target" ] && [ "$target" != "DIRECT" ]; then
          TARGET="$target" model_tmp_apply '.settings.routing.globalTarget = strenv(TARGET)'
          changed=1
        fi
        ;;
      /proxies/BLOCKED%20SITES|/proxies/BLOCKED+SITES|"/proxies/BLOCKED SITES")
        target=$(body_get '.name // ""')
        case "$target" in
          DIRECT) blocked="direct" ;;
          "MANUAL SERVER") blocked="manual" ;;
          *) blocked="auto" ;;
        esac
        BLOCKED="$blocked" model_tmp_apply '.settings.routing.blockedTarget = strenv(BLOCKED)'
        changed=1
        ;;
      /proxies/MANUAL%20SERVER|/proxies/MANUAL+SERVER|"/proxies/MANUAL SERVER")
        target=$(body_get '.name // ""')
        if [ -n "$target" ] && [ "$target" != "DIRECT" ]; then
          TARGET="$target" model_tmp_apply '.settings.routing.manualServerId = strenv(TARGET)'
          changed=1
        fi
        ;;
    esac
  fi

  if [ "$changed" -eq 1 ]; then
    save_model
    rm -f "$PANEL_STATE_CACHE"
    rm -f "$ROUTING_APPLY_STAMP"
    if [ "$restore_routing" -eq 1 ]; then
      apply_persisted_routing_preserve_response
    fi
  else
    rm -f "$MODEL_TMP"
  fi
}

normalize_input_address() {
  raw=$(safe_string "$1")
  raw=$(printf '%s' "$raw" | sed 's#^[A-Za-z][A-Za-z0-9+.-]*://##; s#/.*$##')
  case "$raw" in
    \[*\]:*)
      raw=$(printf '%s' "$raw" | sed 's/^\[//; s/\]:[0-9][0-9]*$//')
      ;;
    *:*)
      if printf '%s' "$raw" | awk -F: 'NF==2 && $2 ~ /^[0-9]+$/ { exit 0 } { exit 1 }'; then
        raw=${raw%:*}
      fi
      ;;
  esac
  raw=$(printf '%s' "$raw" | sed 's/^\[//; s/\]$//')
  printf '%s' "$raw" | tr 'A-Z' 'a-z'
}

probe_address_json() {
  raw=$(safe_string "$1")
  [ -n "$raw" ] || return 1
  host=$(normalize_input_address "$raw")
  [ -n "$host" ] || return 1
  kind="domain"
  if is_ipv4 "$host"; then
    kind="ip"
  fi
  printf '{"raw":%s,"host":%s,"kind":%s}' \
    "$(json_string "$raw")" \
    "$(json_string "$host")" \
    "$(json_string "$kind")"
}

is_ipv4() {
  printf '%s' "$1" | awk -F. 'NF==4 { ok=1; for (i=1;i<=4;i++) if ($i !~ /^[0-9]+$/ || $i < 0 || $i > 255) ok=0; exit ok?0:1 } { if (NF!=4) exit 1 }'
}

ipv4_to_int() {
  OLDIFS="$IFS"
  IFS='.'
  set -- $1
  IFS="$OLDIFS"
  printf '%s\n' $((($1 << 24) + ($2 << 16) + ($3 << 8) + $4))
}

ip_in_cidr() {
  ip="$1"
  cidr="$2"
  base=$(printf '%s' "$cidr" | cut -d/ -f1)
  prefix=$(printf '%s' "$cidr" | cut -d/ -f2)
  is_ipv4 "$ip" || return 1
  is_ipv4 "$base" || return 1
  case "$prefix" in
    ''|*[!0-9]*) return 1 ;;
  esac
  [ "$prefix" -ge 0 ] && [ "$prefix" -le 32 ] || return 1
  ip_int=$(ipv4_to_int "$ip")
  base_int=$(ipv4_to_int "$base")
  if [ "$prefix" -eq 0 ]; then
    mask=0
  else
    mask=$((((0xffffffff << (32 - prefix)) & 0xffffffff)))
  fi
  [ $(((ip_int & mask))) -eq $(((base_int & mask))) ]
}

base_matches_value() {
  base_id="$1"
  kind=$(base_field "$base_id" kind)
  file=$(base_file_for_id "$base_id")
  value=$(normalize_input_address "$2")
  [ -f "$file" ] || return 1
  case "$kind" in
    domains)
      patterns="$TMP_DIR/domain-patterns.$$"
      : > "$patterns"
      candidate="$value"
      while [ -n "$candidate" ]; do
        printf '%s\n+.%s\n' "$candidate" "$candidate" >> "$patterns"
        case "$candidate" in
          *.*) candidate=${candidate#*.} ;;
          *) break ;;
        esac
      done
      if grep -Fxf "$patterns" "$file" >/dev/null 2>&1; then
        rm -f "$patterns"
        return 0
      fi
      rm -f "$patterns"
      return 1
      ;;
    *)
      is_ipv4 "$value" || return 1
      ensure_ip_lookup_cache "$file"
      grep -Fqx "$value" "${file}.exact" >/dev/null 2>&1 && return 0
      if [ -s "${file}.ranges" ]; then
        TARGET_IP="$value" awk '
          function ip2int(ip, oct) {
            split(ip, oct, ".")
            return (((oct[1] * 256 + oct[2]) * 256 + oct[3]) * 256 + oct[4])
          }
          BEGIN {
            target = ip2int(ENVIRON["TARGET_IP"])
          }
          {
            gsub(/\r/, "", $0)
            if ($0 == "") next
            split($0, parts, "/")
            base = ip2int(parts[1])
            prefix = (parts[2] == "" ? 32 : parts[2] + 0)
            if (prefix >= 32) {
              if (target == base) exit 0
              next
            }
            size = 2 ^ (32 - prefix)
            start = int(base / size) * size
            if (target >= start && target < start + size) exit 0
          }
          END { exit 1 }
        ' "${file}.ranges" >/dev/null 2>&1 && return 0
      fi
      return 1
      ;;
  esac
}

evaluate_rule_json() {
  raw_value="$1"
  value=$(normalize_input_address "$raw_value")
  matched_rule=""
  matched_base_names=""
  rules_file="$TMP_DIR/rule-eval.$$"
  model_query '.rules[] | [.priority, .id] | @tsv' | sort -n > "$rules_file"
  while IFS="$(printf '\t')" read -r _priority rule_id; do
    [ -n "$rule_id" ] || continue
    enabled=$(rule_field "$rule_id" enabled)
    [ "$enabled" = "true" ] || continue
    match_mode=$(rule_field "$rule_id" matchMode)
    if [ "$match_mode" = "final" ]; then
      if [ -z "$matched_rule" ]; then
        matched_rule="$rule_id"
      fi
      break
    fi
    base_names=""
    hit=0
    base_ids_file="$TMP_DIR/rule-base-ids.$$"
    model_query ".rules[] | select(.id == \"$rule_id\") | .baseIds[]?" > "$base_ids_file"
    while IFS= read -r base_id; do
      [ -n "$base_id" ] || continue
      base_enabled=$(base_field "$base_id" enabled)
      [ "$base_enabled" = "true" ] || continue
      if base_matches_value "$base_id" "$value"; then
        base_name=$(base_field "$base_id" name)
        if [ -n "$base_names" ]; then
          base_names="$base_names|$base_name"
        else
          base_names="$base_name"
        fi
        hit=1
      fi
    done < "$base_ids_file"
    if [ "${hit:-0}" -eq 1 ]; then
      matched_rule="$rule_id"
      matched_base_names="$base_names"
      break
    fi
  done < "$rules_file"
  if [ -z "$matched_rule" ]; then
    matched_rule="default-direct"
  fi
  rule_name=$(rule_field "$matched_rule" name)
  rule_priority=$(rule_field "$matched_rule" priority)
  rule_action=$(rule_field "$matched_rule" action)
  rule_target=$(rule_field "$matched_rule" target)
  first=1
  printf '{'
  printf '"matchedRuleId":%s,' "$(json_string "$matched_rule")"
  printf '"matchedRuleName":%s,' "$(json_string "$rule_name")"
  printf '"matchedRulePriority":%s,' "${rule_priority:-999}"
  printf '"matchedAction":%s,' "$(json_string "${rule_action:-DIRECT}")"
  printf '"matchedTarget":%s,' "$(json_string "${rule_target:-DIRECT}")"
  printf '"matchedBaseNames":['
  old_ifs="$IFS"
  IFS='|'
  for base_name in $matched_base_names; do
    [ -n "$base_name" ] || continue
    if [ "$first" -eq 1 ]; then
      first=0
    else
      printf ','
    fi
    printf '%s' "$(json_string "$base_name")"
  done
  IFS="$old_ifs"
  printf ']}'
}

inventory_node_json() {
  proxy_name="$1"
  source_file=$(inventory_source_file)
  yq -p json -o=json ".nodes[] | select(.id == \"$proxy_name\" or .label == \"$proxy_name\" or .name == \"$proxy_name\")" "$source_file" 2>/dev/null || true
}

resolve_runtime_route_json() {
  matched_action="${1:-DIRECT}"
  mode="rule"
  proxy_name=""
  route_kind="direct"
  configs_file="$TMP_DIR/runtime-configs.$$"
  proxies_file="$TMP_DIR/runtime-proxies.$$"
  status=$(controller_request GET "/configs")
  if [ "$status" = "200" ]; then
    cp "$RESP_FILE" "$configs_file"
    mode=$(yq -p json -r '.mode // "rule"' "$configs_file" 2>/dev/null || printf 'rule')
  fi
  status=$(controller_request GET "/proxies")
  if [ "$status" = "200" ]; then
    cp "$RESP_FILE" "$proxies_file"
    global_now=$(yq -p json -r '.proxies["GLOBAL"].now // ""' "$proxies_file" 2>/dev/null || true)
    blocked_now=$(yq -p json -r '.proxies["BLOCKED SITES"].now // ""' "$proxies_file" 2>/dev/null || true)
    manual_now=$(yq -p json -r '.proxies["MANUAL SERVER"].now // ""' "$proxies_file" 2>/dev/null || true)
    auto_now=$(yq -p json -r '.proxies["AUTO BEST"].now // ""' "$proxies_file" 2>/dev/null || true)
  else
    global_now=""
    blocked_now=""
    manual_now=""
    auto_now=""
  fi

  case "$mode" in
    direct)
      route_kind="direct"
      ;;
    global)
      case "$global_now" in
        DIRECT|'')
          route_kind="direct"
          ;;
        "BLOCKED SITES")
          case "$blocked_now" in
            DIRECT|'')
              route_kind="direct"
              ;;
            "MANUAL SERVER")
              route_kind="proxy"
              proxy_name="$manual_now"
              ;;
            "AUTO BEST")
              route_kind="proxy"
              proxy_name="$auto_now"
              ;;
            *)
              route_kind="proxy"
              proxy_name="$blocked_now"
              ;;
          esac
          ;;
        "MANUAL SERVER")
          route_kind="proxy"
          proxy_name="$manual_now"
          ;;
        "AUTO BEST")
          route_kind="proxy"
          proxy_name="$auto_now"
          ;;
        *)
          route_kind="proxy"
          proxy_name="$global_now"
          ;;
      esac
      ;;
    *)
      if [ "$matched_action" = "PROXY" ]; then
        case "$blocked_now" in
          DIRECT|'')
            route_kind="direct"
            ;;
          "MANUAL SERVER")
            route_kind="proxy"
            proxy_name="$manual_now"
            ;;
          "AUTO BEST")
            route_kind="proxy"
            proxy_name="$auto_now"
            ;;
          *)
            route_kind="proxy"
            proxy_name="$blocked_now"
            ;;
        esac
      else
        route_kind="direct"
      fi
      ;;
  esac

  if [ "$route_kind" = "direct" ] || [ -z "$proxy_name" ] || [ "$proxy_name" = "DIRECT" ]; then
    log_msg "RUNTIME caller=${ROUTE_TRACE_CALLER:-unknown} action=$matched_action mode=$mode global=$global_now blocked=$blocked_now manual=$manual_now auto=$auto_now route=direct proxy="
    printf '{"mode":%s,"routeKind":"direct","nodeMatched":false,"node":{}}' "$(json_string "$mode")"
    return
  fi

  node_json=$(inventory_node_json "$proxy_name")
  if [ -n "$node_json" ]; then
    log_msg "RUNTIME caller=${ROUTE_TRACE_CALLER:-unknown} action=$matched_action mode=$mode global=$global_now blocked=$blocked_now manual=$manual_now auto=$auto_now route=proxy proxy=$proxy_name matched=1"
    printf '{"mode":%s,"routeKind":"proxy","nodeMatched":true,"node":%s}' \
      "$(json_string "$mode")" \
      "$node_json"
  else
    log_msg "RUNTIME caller=${ROUTE_TRACE_CALLER:-unknown} action=$matched_action mode=$mode global=$global_now blocked=$blocked_now manual=$manual_now auto=$auto_now route=proxy proxy=$proxy_name matched=0"
    printf '{"mode":%s,"routeKind":"proxy","nodeMatched":false,"node":{"id":%s,"name":%s,"label":%s}}' \
      "$(json_string "$mode")" \
      "$(json_string "$proxy_name")" \
      "$(json_string "$proxy_name")" \
      "$(json_string "$proxy_name")"
  fi
}

load_route_probe_context() {
  address="$1"
  rule_json="${2:-}"
  [ -n "$rule_json" ] || rule_json=$(evaluate_rule_json "$address")
  ROUTE_MATCHED_ACTION=$(safe_string "$(printf '%s' "$rule_json" | yq -p json -r '.matchedAction // "DIRECT"' 2>/dev/null || printf 'DIRECT')" "DIRECT")
  active_json=$(resolve_runtime_route_json "$ROUTE_MATCHED_ACTION")
  ROUTE_NORMALIZED_ADDRESS=$(normalize_input_address "$address")
  ROUTE_ACTIVE_MODE=$(safe_string "$(printf '%s' "$active_json" | yq -p json -r '.mode // "rule"' 2>/dev/null || printf 'rule')" "rule")
  ROUTE_KIND=$(safe_string "$(printf '%s' "$active_json" | yq -p json -r '.routeKind // "direct"' 2>/dev/null || printf 'direct')" "direct")
  ROUTE_NODE_MATCHED=$(safe_string "$(printf '%s' "$active_json" | yq -p json -r '.nodeMatched // false' 2>/dev/null || printf 'false')" "false")
  ROUTE_NODE_ID=$(safe_string "$(printf '%s' "$active_json" | yq -p json -r '.node.id // .node.label // .node.name // ""' 2>/dev/null || true)" "")
  ROUTE_NODE_LABEL=$(safe_string "$(printf '%s' "$active_json" | yq -p json -r '.node.label // .node.name // .node.id // ""' 2>/dev/null || true)" "")
  ROUTE_SUBSCRIPTION_NAME=$(safe_string "$(printf '%s' "$active_json" | yq -p json -r '.node.subscriptionName // ""' 2>/dev/null || true)" "")
  ROUTE_EXIT_IP=$(safe_string "$(printf '%s' "$active_json" | yq -p json -r '.node.egressIp // ""' 2>/dev/null || true)" "")
  ROUTE_EXIT_COUNTRY=$(safe_string "$(printf '%s' "$active_json" | yq -p json -r '.node.egressCountry // "??"' 2>/dev/null || printf '??')" "??")
  ROUTE_EXIT_PROVIDER=$(safe_string "$(printf '%s' "$active_json" | yq -p json -r '.node.egressProvider // .node.provider // ""' 2>/dev/null || true)" "")
  ROUTE_MATCHED_RULE_NAME=$(safe_string "$(printf '%s' "$rule_json" | yq -p json -r '.matchedRuleName // ""' 2>/dev/null || true)" "")
  ROUTE_MATCHED_BASE_NAMES=$(json_compact "$(printf '%s' "$rule_json" | yq -p json -o=json '.matchedBaseNames // []' 2>/dev/null || printf '[]')")
  case "$ROUTE_ACTIVE_MODE:$ROUTE_MATCHED_ACTION:$ROUTE_KIND" in
    direct:*) ROUTE_BASIS="mode-direct" ;;
    global:*) ROUTE_BASIS="mode-global" ;;
    *:PROXY:direct) ROUTE_BASIS="proxy-bypassed" ;;
    *:PROXY:proxy) ROUTE_BASIS="rule-match" ;;
    *) ROUTE_BASIS="default-direct" ;;
  esac
  ROUTE_WARNING_JSON="null"
  if [ "$ROUTE_KIND" = "proxy" ] && [ "$(bool_json "$ROUTE_NODE_MATCHED")" != "true" ]; then
    ROUTE_WARNING_JSON=$(json_string "proxy-exit-not-found")
  fi
  ROUTE_RESULT_JSON=$(printf '{"address":%s,"routeKind":%s,"nodeMatched":%s,"nodeId":%s,"nodeLabel":%s,"subscriptionName":%s,"exitIp":%s,"exitCountry":%s,"exitProvider":%s,"matchedRuleName":%s,"matchedAction":%s,"matchedBaseNames":%s,"basis":%s,"warning":%s}' \
    "$(json_string "$ROUTE_NORMALIZED_ADDRESS")" \
    "$(json_string "$ROUTE_KIND")" \
    "$(bool_json "$ROUTE_NODE_MATCHED")" \
    "$(json_string "$ROUTE_NODE_ID")" \
    "$(json_string "$ROUTE_NODE_LABEL")" \
    "$(json_string "$ROUTE_SUBSCRIPTION_NAME")" \
    "$(json_string "$ROUTE_EXIT_IP")" \
    "$(json_string "$ROUTE_EXIT_COUNTRY")" \
    "$(json_string "$ROUTE_EXIT_PROVIDER")" \
    "$(json_string "$ROUTE_MATCHED_RULE_NAME")" \
    "$(json_string "$ROUTE_MATCHED_ACTION")" \
    "$ROUTE_MATCHED_BASE_NAMES" \
    "$(json_string "$ROUTE_BASIS")" \
    "$ROUTE_WARNING_JSON")
}

build_route_probe_result_json() {
  load_route_probe_context "$1" "${2:-}"
  printf '%s' "$ROUTE_RESULT_JSON"
}

handle_route_probe() {
  address=$(body_get '.payload.value // ""')
  [ -n "$address" ] || respond_error '400 Bad Request' 'Address is required.'
  rule_json=$(evaluate_rule_json "$address")
  ROUTE_TRACE_CALLER="route"
  load_route_probe_context "$address" "$rule_json"
  printf '{"lastCheckedAt":%s,"result":%s}' \
    "$(json_string "$(now_iso)")" \
    "$ROUTE_RESULT_JSON" > "$RESP_FILE"
  respond_file '200 OK' "$RESP_FILE"
}

handle_rule_probe() {
  address=$(body_get '.payload.value // ""')
  [ -n "$address" ] || respond_error '400 Bad Request' 'Address is required.'
  rule_json=$(evaluate_rule_json "$address")
  ROUTE_TRACE_CALLER="rule"
  load_route_probe_context "$address" "$rule_json"
  normalized_address=$(normalize_input_address "$address")
  matched_rule_name=$(printf '%s' "$rule_json" | yq -p json -r '.matchedRuleName // ""' 2>/dev/null || true)
  matched_rule_priority=$(printf '%s' "$rule_json" | yq -p json -r '.matchedRulePriority // 999' 2>/dev/null || printf '999')
  matched_target=$(printf '%s' "$rule_json" | yq -p json -r '.matchedTarget // "DIRECT"' 2>/dev/null || printf 'DIRECT')
  matched_rule_id=$(printf '%s' "$rule_json" | yq -p json -r '.matchedRuleId // ""' 2>/dev/null || true)
  matched_base_names=$(json_compact "$(printf '%s' "$rule_json" | yq -p json -o=json '.matchedBaseNames // []' 2>/dev/null || printf '[]')")
  basis="rule-match"
  [ "$matched_rule_id" = "default-direct" ] && basis="fallback"
  printf '{"lastCheckedAt":%s,"result":{"address":%s,"matchedRuleName":%s,"matchedRulePriority":%s,"matchedAction":%s,"matchedTarget":%s,"matchedBaseNames":%s,"basis":%s,"finalRouteKind":%s,"finalExitIp":%s,"finalExitCountry":%s}}' \
    "$(json_string "$(now_iso)")" \
    "$(json_string "$normalized_address")" \
    "$(json_string "$matched_rule_name")" \
    "$matched_rule_priority" \
    "$(json_string "$ROUTE_MATCHED_ACTION")" \
    "$(json_string "$matched_target")" \
    "$matched_base_names" \
    "$(json_string "$basis")" \
    "$(json_string "$ROUTE_KIND")" \
    "$(json_string "$ROUTE_EXIT_IP")" \
    "$(json_string "$ROUTE_EXIT_COUNTRY")" > "$RESP_FILE"
  respond_file '200 OK' "$RESP_FILE"
}

handle_dns_probe() {
  address=$(body_get '.payload.value // ""')
  [ -n "$address" ] || respond_error '400 Bad Request' 'Address is required.'
  normalized=$(normalize_input_address "$address")
  rule_json=$(evaluate_rule_json "$normalized")
  ROUTE_TRACE_CALLER="dns"
  load_route_probe_context "$normalized" "$rule_json"
  matched_action="$ROUTE_MATCHED_ACTION"
  if is_ipv4 "$normalized"; then
    matched_rule_name=$(printf '%s' "$rule_json" | yq -p json -r '.matchedRuleName // ""' 2>/dev/null || true)
    printf '{"lastCheckedAt":%s,"result":{"address":%s,"status":"ip-literal","routeKind":%s,"resolverName":null,"resolverEndpoint":null,"upstreamName":null,"matchedRuleName":%s,"matchedDomainBaseNames":[],"records":[]}}' \
      "$(json_string "$(now_iso)")" \
      "$(json_string "$normalized")" \
      "$(json_string "$ROUTE_KIND")" \
      "$(json_string "$matched_rule_name")" > "$RESP_FILE"
    respond_file '200 OK' "$RESP_FILE"
  fi

  resolver_name="mihomo DNS"
  resolver_endpoint="127.0.0.1:9090/dns/query"
  upstream_name="Direct resolver path"
  [ "$matched_action" = "PROXY" ] && upstream_name="Tunnel resolver path"
  dns_source="controller"
  status_a=$(controller_request GET "/dns/query" "name=$(urlencode_all "$normalized")&type=A")
  if [ "$status_a" = "200" ]; then
    cp "$RESP_FILE" "$TMP_DIR/dns-a.$$"
  else
    : > "$TMP_DIR/dns-a.$$"
  fi
  status_aaaa=$(controller_request GET "/dns/query" "name=$(urlencode_all "$normalized")&type=AAAA")
  if [ "$status_aaaa" = "200" ]; then
    cp "$RESP_FILE" "$TMP_DIR/dns-aaaa.$$"
  else
    : > "$TMP_DIR/dns-aaaa.$$"
  fi
  records_file="$TMP_DIR/dns-records.$$"
  answers_file="$TMP_DIR/dns-answers-all.$$"
  : > "$records_file"
  : > "$answers_file"
  for family in A AAAA; do
    file="$TMP_DIR/dns-$(printf '%s' "$family" | tr 'A-Z' 'a-z').$$"
    yq -p json -r '.Answer[]?.data' "$file" 2>/dev/null >> "$answers_file" || true
    yq -p json -r '.Answer[]?.Data' "$file" 2>/dev/null >> "$answers_file" || true
    yq -p json -r '.answer[]?.data' "$file" 2>/dev/null >> "$answers_file" || true
    yq -p json -r '.answer[]?.Data' "$file" 2>/dev/null >> "$answers_file" || true
    yq -p json -r '.answers[]?.data' "$file" 2>/dev/null >> "$answers_file" || true
    yq -p json -r '.answers[]?.Data' "$file" 2>/dev/null >> "$answers_file" || true
    yq -p json -r '.addresses[]?' "$file" 2>/dev/null >> "$answers_file" || true
    yq -p json -r '.data[]?' "$file" 2>/dev/null >> "$answers_file" || true
  done
  if [ ! -s "$answers_file" ]; then
    dns_source="router"
    resolver_name="router dnsmasq"
    resolver_endpoint="127.0.0.1:53"
    upstream_name="Router resolver path"
    nslookup "$normalized" 127.0.0.1 2>/dev/null | awk '
      /^Name:[[:space:]]*/ { in_answer = 1; next }
      in_answer && /^Address:[[:space:]]*/ {
        sub(/^Address:[[:space:]]*/, "", $0)
        print $0
      }
    ' >> "$answers_file"
  fi
  if [ -s "$answers_file" ]; then
    awk 'NF && !seen[$0]++ { print }' "$answers_file" > "$TMP_DIR/dns-answers-dedup.$$"
    cp "$TMP_DIR/dns-answers-dedup.$$" "$answers_file"
  fi
  domain_rule_name=$(printf '%s' "$rule_json" | yq -p json -r '.matchedRuleName // ""' 2>/dev/null || true)
  matched_domain_bases=$(json_compact "$(printf '%s' "$rule_json" | yq -p json -o=json '.matchedBaseNames // []' 2>/dev/null || printf '[]')")
  classification="none"
  case "$matched_action" in
    PROXY) classification="proxy" ;;
    DIRECT) classification="direct" ;;
  esac
  while IFS= read -r value; do
    [ -n "$value" ] || continue
    family="AAAA"
    is_ipv4 "$value" && family="A"
    printf '{"family":%s,"value":%s,"classification":%s,"matchedBaseNames":%s,"matchedRuleName":%s}\n' \
      "$(json_string "$family")" \
      "$(json_string "$value")" \
      "$(json_string "$classification")" \
      "$matched_domain_bases" \
      "$(json_string "$domain_rule_name")" >> "$records_file"
  done < "$answers_file"
  records_json='[]'
  if [ -s "$records_file" ]; then
    records_json=$(json_array_from_lines "$records_file")
  fi
  status_text="ok"
  [ -s "$answers_file" ] || status_text="empty"
  printf '{"lastCheckedAt":%s,"result":{"address":%s,"status":%s,"routeKind":%s,"resolverName":%s,"resolverEndpoint":%s,"upstreamName":%s,"matchedRuleName":%s,"matchedDomainBaseNames":%s,"records":%s,"dnsSource":%s}}' \
    "$(json_string "$(now_iso)")" \
    "$(json_string "$normalized")" \
    "$(json_string "$status_text")" \
    "$(json_string "$ROUTE_KIND")" \
    "$(json_string "$resolver_name")" \
    "$(json_string "$resolver_endpoint")" \
    "$(json_string "$upstream_name")" \
    "$(json_string "$domain_rule_name")" \
    "$matched_domain_bases" \
    "$records_json" \
    "$(json_string "$dns_source")" > "$RESP_FILE"
  respond_file '200 OK' "$RESP_FILE"
}

handle_latency_probe() {
  raw_values=$(body_get '.payload.value // ""')
  [ -n "$raw_values" ] || raw_values=$(controller_get_value '/proxies' '' '.proxies["AUTO BEST"].all[]? // ""' | paste -sd, -)
  result_file="$TMP_DIR/latency.$$"
  : > "$result_file"
  old_ifs="$IFS"
  IFS=','
  for item in $raw_values; do
    IFS="$old_ifs"
    item=$(safe_string "$item")
    [ -n "$item" ] || continue
    encoded=$(urlencode_all "$item")
    node_json=$(inventory_node_json "$item")
    if [ -n "$node_json" ]; then
      status=$(controller_request GET "/proxies/$encoded/delay" "url=$(urlencode_all "$DELAY_URL_DEFAULT")&timeout=10000")
      node_label=$(printf '%s' "$node_json" | yq -p json -r '.label // .name // ""' 2>/dev/null || true)
      node_country=$(printf '%s' "$node_json" | yq -p json -r '.egressCountry // "??"' 2>/dev/null || printf '??')
      node_provider=$(printf '%s' "$node_json" | yq -p json -r '.subscriptionName // .provider // ""' 2>/dev/null || true)
      if [ "$status" = "200" ]; then
        delay=$(yq -p json -r '.delay // .Delay // 0' "$RESP_FILE" 2>/dev/null || printf '0')
        tcp_json='null'
        tls_json='null'
        packet_loss=100
        status_text="invalid"
        if [ "${delay:-0}" -gt 0 ] 2>/dev/null; then
          tcp_json="$delay"
          tls_json=$((delay + 12))
          packet_loss=0
          status_text="ok"
        fi
        printf '{"input":%s,"address":%s,"addressKind":"proxy","routeKind":"proxy","matchedRuleName":"mihomo delay API","exitCountry":%s,"exitProvider":%s,"icmpMs":null,"tcpMs":%s,"tlsMs":%s,"jitterMs":0,"packetLoss":%s,"status":%s}\n' \
          "$(json_string "$item")" \
          "$(json_string "${node_label:-$item}")" \
          "$(json_string "$node_country")" \
          "$(json_string "$node_provider")" \
          "$tcp_json" \
          "$tls_json" \
          "$packet_loss" \
          "$(json_string "$status_text")" >> "$result_file"
      else
        printf '{"input":%s,"address":%s,"addressKind":"proxy","routeKind":"proxy","matchedRuleName":"mihomo delay API","exitCountry":%s,"exitProvider":%s,"icmpMs":null,"tcpMs":null,"tlsMs":null,"jitterMs":null,"packetLoss":100,"status":"invalid"}\n' \
          "$(json_string "$item")" \
          "$(json_string "${node_label:-$item}")" \
          "$(json_string "$node_country")" \
          "$(json_string "$node_provider")" >> "$result_file"
      fi
    else
      probe=$(probe_address_json "$item" || true)
      if [ -z "$probe" ]; then
        printf '{"input":%s,"address":%s,"addressKind":"invalid","routeKind":"unknown","matchedRuleName":null,"exitCountry":null,"exitProvider":null,"icmpMs":null,"tcpMs":null,"tlsMs":null,"jitterMs":null,"packetLoss":100,"status":"invalid"}\n' \
          "$(json_string "$item")" \
          "$(json_string "$item")" >> "$result_file"
        continue
      fi
      rule_json=$(evaluate_rule_json "$item")
      ROUTE_TRACE_CALLER="latency"
      load_route_probe_context "$item" "$rule_json"
      host=$(printf '%s' "$probe" | yq -p json -r '.host // ""' 2>/dev/null || true)
      kind=$(printf '%s' "$probe" | yq -p json -r '.kind // "domain"' 2>/dev/null || printf 'domain')
      probe_url="https://$host/"
      [ "$kind" = "ip" ] && probe_url="http://$host/"
      if [ "$ROUTE_KIND" = "proxy" ]; then
        proxy_name="$ROUTE_NODE_ID"
        delay=0
        if [ -n "$proxy_name" ]; then
          status=$(controller_request GET "/proxies/$(urlencode_all "$proxy_name")/delay" "url=$(urlencode_all "$probe_url")&timeout=10000")
          if [ "$status" = "200" ]; then
            delay=$(yq -p json -r '.delay // .Delay // 0' "$RESP_FILE" 2>/dev/null || printf '0')
          fi
        fi
        matched_rule_name="$ROUTE_MATCHED_RULE_NAME"
        node_country="$ROUTE_EXIT_COUNTRY"
        node_provider="$ROUTE_SUBSCRIPTION_NAME"
        [ -n "$node_provider" ] || node_provider="$ROUTE_EXIT_PROVIDER"
        tcp_json='null'
        tls_json='null'
        packet_loss=100
        status_text="invalid"
        if [ "${delay:-0}" -gt 0 ] 2>/dev/null; then
          tcp_json="$delay"
          tls_json=$((delay + 12))
          packet_loss=0
          status_text="ok"
        fi
        printf '{"input":%s,"address":%s,"addressKind":%s,"routeKind":"proxy","matchedRuleName":%s,"exitCountry":%s,"exitProvider":%s,"icmpMs":null,"tcpMs":%s,"tlsMs":%s,"jitterMs":0,"packetLoss":%s,"status":%s}\n' \
          "$(json_string "$item")" \
          "$(json_string "$host")" \
          "$(json_string "$kind")" \
          "$(json_string "$matched_rule_name")" \
          "$(json_string "$node_country")" \
          "$(json_string "$node_provider")" \
          "$tcp_json" \
          "$tls_json" \
          "$packet_loss" \
          "$(json_string "$status_text")" >> "$result_file"
      else
        curl_stats=$(curl -k -sS -o /dev/null --connect-timeout 8 --max-time 15 -w '%{time_connect} %{time_appconnect}' "$probe_url" 2>/dev/null || true)
        tcp_ms=""
        tls_ms=""
        if [ -n "$curl_stats" ]; then
          tcp_ms=$(printf '%s' "$curl_stats" | awk '{ if ($1 > 0) printf "%d", $1 * 1000 }' 2>/dev/null || true)
          tls_ms=$(printf '%s' "$curl_stats" | awk '{ if ($2 > 0) printf "%d", $2 * 1000 }' 2>/dev/null || true)
        fi
        matched_rule_name=$(printf '%s' "$rule_json" | yq -p json -r '.matchedRuleName // ""' 2>/dev/null || true)
        printf '{"input":%s,"address":%s,"addressKind":%s,"routeKind":"direct","matchedRuleName":%s,"exitCountry":null,"exitProvider":"direct","icmpMs":null,"tcpMs":%s,"tlsMs":%s,"jitterMs":null,"packetLoss":0,"status":"ok"}\n' \
          "$(json_string "$item")" \
          "$(json_string "$host")" \
          "$(json_string "$kind")" \
          "$(json_string "$matched_rule_name")" \
          "$(json_number_or_null "${tcp_ms:-}")" \
          "$(json_number_or_null "${tls_ms:-}")" >> "$result_file"
      fi
    fi
  done
  IFS="$old_ifs"
  if [ -s "$result_file" ]; then
    results_json=$(json_array_from_lines "$result_file")
    printf '{"lastQuery":%s,"lastCheckedAt":%s,"results":%s}' \
      "$(json_string "$raw_values")" \
      "$(json_string "$(now_iso)")" \
      "$results_json" > "$RESP_FILE"
  else
    printf '{"lastQuery":"","lastCheckedAt":"","results":[]}' > "$RESP_FILE"
  fi
  respond_file '200 OK' "$RESP_FILE"
}

subscription_exists() {
  section="$1"
  uci -q get "nikki.$section" >/dev/null 2>&1
}

subscription_last_sync_at() {
  section="$1"
  updated=$(uci -q get "nikki.$section.update" 2>/dev/null || true)
  if [ -n "$updated" ]; then
    offset=$(date '+%z' 2>/dev/null || printf '+0000')
    offset=$(printf '%s' "$offset" | sed 's/\([+-][0-9][0-9]\)\([0-9][0-9]\)$/\1:\2/')
    printf '%sT%s%s\n' "${updated%% *}" "${updated#* }" "$offset"
    return 0
  fi
  file_path="$SUBSCRIPTIONS_DIR/$section.yaml"
  if [ -f "$file_path" ]; then
    date -u -r "$file_path" '+%Y-%m-%dT%H:%M:%SZ' 2>/dev/null && return 0
  fi
  printf '\n'
}

add_subscription() {
  name=$(safe_string "$(body_get '.payload.name // ""')")
  url=$(safe_string "$(body_get '.payload.url // ""')")
  format=$(safe_string "$(body_get '.payload.format // "clash"')" 'clash')
  [ -n "$url" ] || respond_error '400 Bad Request' 'Subscription URL is required.'
  section="subscription_$(uci_safe_name "${name:-sub}")"
  [ -n "$section" ] || section="subscription_custom"
  suffix=2
  while subscription_exists "$section"; do
    section="$(uci_safe_name "${name:-sub}")_$suffix"
    section="subscription_$section"
    suffix=$((suffix + 1))
  done
  uci -q set "nikki.$section=subscription"
  uci -q set "nikki.$section.name=${name:-$section}"
  uci -q set "nikki.$section.url=$url"
  uci -q set "nikki.$section.user_agent=clash"
  uci -q set "nikki.$section.prefer=remote"
  uci -q set "nikki.$section.panel_format=$format"
  uci -q commit nikki
  spawn_bridge_job "pool-refresh"
}

remove_subscription() {
  section=$(safe_string "$(body_get '.payload.id // ""')")
  [ -n "$section" ] || respond_error '400 Bad Request' 'Subscription id is required.'
  subscription_exists "$section" || respond_error '404 Not Found' 'Subscription not found.'
  uci -q delete "nikki.$section"
  uci -q commit nikki
  rm -f "$SUBSCRIPTIONS_DIR/$section.yaml"
  spawn_bridge_job "pool-refresh"
}

update_subscription() {
  section=$(safe_string "$(body_get '.payload.id // ""')")
  name=$(safe_string "$(body_get '.payload.name // ""')")
  url=$(safe_string "$(body_get '.payload.url // ""')")
  format=$(safe_string "$(body_get '.payload.format // "clash"')" 'clash')
  [ -n "$section" ] || respond_error '400 Bad Request' 'Subscription id is required.'
  subscription_exists "$section" || respond_error '404 Not Found' 'Subscription not found.'
  [ -n "$url" ] || respond_error '400 Bad Request' 'Subscription URL is required.'
  [ -n "$name" ] || name="$section"
  uci -q set "nikki.$section.name=$name"
  uci -q set "nikki.$section.url=$url"
  uci -q set "nikki.$section.panel_format=$format"
  uci -q commit nikki
  spawn_bridge_job "pool-refresh"
}

update_automation() {
  enabled=$(safe_string "$(null_to_empty "$(body_get '.payload.enabled')")")
  subscription_interval=$(safe_string "$(body_get '.payload.subscriptionRefreshMinutes // ""')")
  log_cleanup_interval=$(safe_string "$(body_get '.payload.logCleanupMinutes // ""')")
  release_check_interval=$(safe_string "$(body_get '.payload.releaseCheckMinutes // ""')")
  ui_auto_update=$(safe_string "$(null_to_empty "$(body_get '.payload.uiAutoUpdate')")")
  bridge_auto_update=$(safe_string "$(null_to_empty "$(body_get '.payload.bridgeAutoUpdate')")")
  manifest_url=$(safe_string "$(body_get '.payload.manifestUrl // ""')")
  current_enabled=$(model_bool_text_default '.settings.automation.enabled' 'true')
  current_subscription_interval=$(model_query '.settings.automation.subscriptionRefreshMinutes // 360')
  current_log_cleanup_interval=$(model_query '.settings.automation.logCleanupMinutes // 5')
  current_release_check_interval=$(mission_control_release_check_minutes)
  current_ui_auto_update=$(model_bool_text_default '.settings.automation.uiAutoUpdate' 'true')
  current_bridge_auto_update=$(model_bool_text_default '.settings.automation.bridgeAutoUpdate' 'true')
  current_manifest_url=$(mission_control_manifest_url)
  AUTOMATION_ENABLED=$(safe_string "${enabled:-}" "$current_enabled")
  AUTOMATION_SUBSCRIPTION_INTERVAL=$(safe_string "${subscription_interval:-}" "$current_subscription_interval")
  AUTOMATION_LOG_CLEANUP_INTERVAL=$(safe_string "${log_cleanup_interval:-}" "$current_log_cleanup_interval")
  AUTOMATION_RELEASE_CHECK_INTERVAL=$(safe_string "${release_check_interval:-}" "$current_release_check_interval")
  AUTOMATION_UI_AUTO_UPDATE=$(safe_string "${ui_auto_update:-}" "$current_ui_auto_update")
  AUTOMATION_BRIDGE_AUTO_UPDATE=$(safe_string "${bridge_auto_update:-}" "$current_bridge_auto_update")
  AUTOMATION_MANIFEST_URL=$(safe_string "${manifest_url:-}" "$current_manifest_url")
  AUTOMATION_ENABLED="$AUTOMATION_ENABLED" \
  AUTOMATION_SUBSCRIPTION_INTERVAL="$AUTOMATION_SUBSCRIPTION_INTERVAL" \
  AUTOMATION_LOG_CLEANUP_INTERVAL="$AUTOMATION_LOG_CLEANUP_INTERVAL" \
  AUTOMATION_RELEASE_CHECK_INTERVAL="$AUTOMATION_RELEASE_CHECK_INTERVAL" \
  AUTOMATION_UI_AUTO_UPDATE="$AUTOMATION_UI_AUTO_UPDATE" \
  AUTOMATION_BRIDGE_AUTO_UPDATE="$AUTOMATION_BRIDGE_AUTO_UPDATE" \
  AUTOMATION_MANIFEST_URL="$AUTOMATION_MANIFEST_URL" \
  yq -p json -o=json '
    .settings.automation.enabled = (strenv(AUTOMATION_ENABLED) == "true" or strenv(AUTOMATION_ENABLED) == "1") |
    .settings.automation.subscriptionRefreshMinutes = (strenv(AUTOMATION_SUBSCRIPTION_INTERVAL) | tonumber) |
    .settings.automation.logCleanupMinutes = (strenv(AUTOMATION_LOG_CLEANUP_INTERVAL) | tonumber) |
    .settings.automation.releaseCheckMinutes = (strenv(AUTOMATION_RELEASE_CHECK_INTERVAL) | tonumber) |
    .settings.automation.uiAutoUpdate = (strenv(AUTOMATION_UI_AUTO_UPDATE) == "true" or strenv(AUTOMATION_UI_AUTO_UPDATE) == "1") |
    .settings.automation.bridgeAutoUpdate = (strenv(AUTOMATION_BRIDGE_AUTO_UPDATE) == "true" or strenv(AUTOMATION_BRIDGE_AUTO_UPDATE) == "1") |
    .settings.automation.manifestUrl = strenv(AUTOMATION_MANIFEST_URL)
  ' "$PANEL_MODEL" > "$MODEL_TMP"
  save_model
  sync_scheduler_cron || respond_error '502 Bad Gateway' 'Automation schedule update failed.'
}

update_auto_selection() {
  metric=$(safe_string "$(body_get '.payload.metric // ""')")
  interval=$(safe_string "$(body_get '.payload.intervalMinutes // ""')")
  sticky=$(safe_string "$(null_to_empty "$(body_get '.payload.stickyBest')")")
  min_score=$(safe_string "$(body_get '.payload.minScore // ""')")
  tolerance=$(safe_string "$(body_get '.payload.switchTolerance // ""')")
  delay_url=$(safe_string "$(body_get '.payload.delayUrl // ""')")
  speed_url=$(safe_string "$(body_get '.payload.speedUrl // ""')")
  current_metric=$(model_query '.settings.autoSelection.metric // "latency"')
  current_interval=$(model_query '.settings.autoSelection.intervalMinutes // 10')
  current_sticky=$(model_bool_text_default '.settings.autoSelection.stickyBest' 'true')
  current_min_score=$(model_query '.settings.autoSelection.minScore // 55')
  current_tolerance=$(model_query '.settings.autoSelection.switchTolerance // 120')
  current_delay_url=$(model_query '.settings.autoSelection.delayUrl // "https://chatgpt.com/cdn-cgi/trace"')
  current_speed_url=$(model_query '.settings.autoSelection.speedUrl // "https://speed.cloudflare.com/__down?bytes=262144"')
  AUTO_METRIC=$(safe_string "${metric:-}" "$current_metric")
  AUTO_INTERVAL=$(safe_string "${interval:-}" "$current_interval")
  AUTO_STICKY=$(safe_string "${sticky:-}" "$current_sticky")
  AUTO_MIN_SCORE=$(safe_string "${min_score:-}" "$current_min_score")
  AUTO_TOLERANCE=$(safe_string "${tolerance:-}" "$current_tolerance")
  AUTO_DELAY_URL=$(safe_string "${delay_url:-}" "$current_delay_url")
  AUTO_SPEED_URL=$(safe_string "${speed_url:-}" "$current_speed_url")
  AUTO_INTERVAL="$AUTO_INTERVAL" \
  AUTO_MIN_SCORE="$AUTO_MIN_SCORE" \
  AUTO_TOLERANCE="$AUTO_TOLERANCE" \
  AUTO_METRIC="$AUTO_METRIC" \
  AUTO_STICKY="$AUTO_STICKY" \
  AUTO_DELAY_URL="$AUTO_DELAY_URL" \
  AUTO_SPEED_URL="$AUTO_SPEED_URL" \
  yq -p json -o=json '
    .settings.autoSelection.metric = strenv(AUTO_METRIC) |
    .settings.autoSelection.intervalMinutes = (strenv(AUTO_INTERVAL) | tonumber) |
    .settings.autoSelection.stickyBest = (strenv(AUTO_STICKY) == "true" or strenv(AUTO_STICKY) == "1") |
    .settings.autoSelection.minScore = (strenv(AUTO_MIN_SCORE) | tonumber) |
    .settings.autoSelection.switchTolerance = (strenv(AUTO_TOLERANCE) | tonumber) |
    .settings.autoSelection.delayUrl = strenv(AUTO_DELAY_URL) |
    .settings.autoSelection.speedUrl = strenv(AUTO_SPEED_URL)
  ' "$PANEL_MODEL" > "$MODEL_TMP"
  save_model
  sync_scheduler_cron || respond_error '502 Bad Gateway' 'Auto selection schedule update failed.'
}

toggle_blocked_country() {
  country=$(safe_string "$(body_get '.payload.country // ""')")
  [ -n "$country" ] || respond_error '400 Bad Request' 'Country code is required.'
  model_tmp_begin
  if model_query '.settings.egressPolicy.blockedCountries[]? // ""' | grep -Fxq "$country"; then
    COUNTRY="$country" model_tmp_apply '.settings.egressPolicy.blockedCountries = ((.settings.egressPolicy.blockedCountries // []) | map(select(. != strenv(COUNTRY))))'
  else
    COUNTRY="$country" model_tmp_apply '.settings.egressPolicy.blockedCountries = ((.settings.egressPolicy.blockedCountries // []) + [strenv(COUNTRY)] | unique)'
  fi
  save_model
}

set_allow_unknown() {
  enabled=$(safe_string "$(null_to_empty "$(body_get '.payload.enabled')")")
  [ -n "$enabled" ] || respond_error '400 Bad Request' 'Enabled flag is required.'
  model_tmp_begin
  ALLOW_UNKNOWN="$enabled" model_tmp_apply '.settings.egressPolicy.allowUnknown = (strenv(ALLOW_UNKNOWN) == "true" or strenv(ALLOW_UNKNOWN) == "1")'
  save_model
}

update_panel_settings() {
  theme=$(safe_string "$(body_get '.payload.theme // ""')")
  density=$(safe_string "$(body_get '.payload.density // ""')")
  scale=$(safe_string "$(body_get '.payload.scale // ""')")
  animations=$(safe_string "$(null_to_empty "$(body_get '.payload.animations')")")
  auto_refresh=$(safe_string "$(null_to_empty "$(body_get '.payload.autoRefresh')")")
  graph_range=$(safe_string "$(body_get '.payload.graphRange // ""')")
  chart_line_width=$(safe_string "$(body_get '.payload.chartLineWidth // ""')")
  speed_unit_mode=$(safe_string "$(body_get '.payload.speedUnitMode // ""')")
  storage_unit_system=$(safe_string "$(body_get '.payload.storageUnitSystem // ""')")
  language=$(safe_string "$(body_get '.payload.language // ""')")
  current_theme=$(model_query '.settings.panel.theme // "graphite"')
  current_density=$(model_query '.settings.panel.density // "comfortable"')
  current_scale=$(model_query '.settings.panel.scale // 100')
  current_animations=$(model_bool_text_default '.settings.panel.animations' 'true')
  current_auto_refresh=$(model_bool_text_default '.settings.panel.autoRefresh' 'true')
  current_graph_range=$(model_query '.settings.panel.graphRange // 30')
  current_chart_line_width=$(model_query '.settings.panel.chartLineWidth // 3')
  current_speed_unit_mode=$(model_query '.settings.panel.speedUnitMode // "bits"')
  current_storage_unit_system=$(model_query '.settings.panel.storageUnitSystem // "binary"')
  current_language=$(model_query '.settings.panel.language // "ru"')
  PANEL_THEME=$(sanitize_choice "${theme:-}" "$current_theme" graphite pearl cobalt ember sage noir)
  PANEL_DENSITY=$(sanitize_choice "${density:-}" "$current_density" comfortable compact)
  PANEL_SCALE=$(sanitize_int "${scale:-}" "$current_scale" 80 130)
  PANEL_ANIMATIONS=$(sanitize_bool "${animations:-}" "$current_animations")
  PANEL_AUTO_REFRESH=$(sanitize_bool "${auto_refresh:-}" "$current_auto_refresh")
  PANEL_GRAPH_RANGE=$(sanitize_int "${graph_range:-}" "$current_graph_range" 1 60)
  PANEL_CHART_LINE_WIDTH=$(sanitize_int "${chart_line_width:-}" "$current_chart_line_width" 1 8)
  PANEL_SPEED_UNIT_MODE=$(sanitize_choice "${speed_unit_mode:-}" "$current_speed_unit_mode" bits bytes)
  PANEL_STORAGE_UNIT_SYSTEM=$(sanitize_choice "${storage_unit_system:-}" "$current_storage_unit_system" binary decimal)
  PANEL_LANGUAGE=$(sanitize_choice "${language:-}" "$current_language" ru en)
  PANEL_THEME="$PANEL_THEME" \
  PANEL_DENSITY="$PANEL_DENSITY" \
  PANEL_SCALE="$PANEL_SCALE" \
  PANEL_ANIMATIONS="$PANEL_ANIMATIONS" \
  PANEL_AUTO_REFRESH="$PANEL_AUTO_REFRESH" \
  PANEL_GRAPH_RANGE="$PANEL_GRAPH_RANGE" \
  PANEL_CHART_LINE_WIDTH="$PANEL_CHART_LINE_WIDTH" \
  PANEL_SPEED_UNIT_MODE="$PANEL_SPEED_UNIT_MODE" \
  PANEL_STORAGE_UNIT_SYSTEM="$PANEL_STORAGE_UNIT_SYSTEM" \
  PANEL_LANGUAGE="$PANEL_LANGUAGE" \
  yq -p json -o=json '
    .settings.panel.theme = strenv(PANEL_THEME) |
    .settings.panel.density = strenv(PANEL_DENSITY) |
    .settings.panel.scale = (strenv(PANEL_SCALE) | tonumber) |
    .settings.panel.animations = (strenv(PANEL_ANIMATIONS) == "true" or strenv(PANEL_ANIMATIONS) == "1") |
    .settings.panel.autoRefresh = (strenv(PANEL_AUTO_REFRESH) == "true" or strenv(PANEL_AUTO_REFRESH) == "1") |
    .settings.panel.graphRange = (strenv(PANEL_GRAPH_RANGE) | tonumber) |
    .settings.panel.chartLineWidth = (strenv(PANEL_CHART_LINE_WIDTH) | tonumber) |
    .settings.panel.speedUnitMode = strenv(PANEL_SPEED_UNIT_MODE) |
    .settings.panel.storageUnitSystem = strenv(PANEL_STORAGE_UNIT_SYSTEM) |
    .settings.panel.language = strenv(PANEL_LANGUAGE)
  ' "$PANEL_MODEL" > "$MODEL_TMP"
  save_model
}

update_mihomo_memory_limit() {
  value=$(safe_string "$(body_get '.payload.value // .payload.mihomoMemoryLimitMiB // ""')")
  max_memory_limit=$(system_memory_total_mib)
  current_memory_limit=$(model_query '.settings.runtime.mihomoMemoryLimitMiB // 0')
  memory_limit=$(sanitize_int "${value:-}" "$current_memory_limit" 0 "$max_memory_limit")
  gomemlimit=$(format_gomemlimit "$memory_limit")

  MEMORY_LIMIT="$memory_limit" \
  yq -p json -o=json '
    .settings.runtime.mihomoMemoryLimitMiB = (strenv(MEMORY_LIMIT) | tonumber)
  ' "$PANEL_MODEL" > "$MODEL_TMP"
  save_model

  uci -q set "nikki.procd.env_go_mem_limit=$gomemlimit" >/dev/null 2>&1 || respond_error '502 Bad Gateway' 'Failed to save Mihomo memory limit.'
  uci -q commit nikki >/dev/null 2>&1 || respond_error '502 Bad Gateway' 'Failed to commit Mihomo memory limit.'
  /etc/init.d/nikki restart >/dev/null 2>&1 || respond_error '502 Bad Gateway' 'Nikki restart failed after memory limit change.'
}

update_controller_settings() {
  selector_group=$(safe_string "$(body_get '.payload.selectorGroup // ""')")
  delay_url=$(safe_string "$(body_get '.payload.delayUrl // ""')")
  delay_timeout=$(safe_string "$(body_get '.payload.delayTimeout // ""')")
  poll_interval=$(safe_string "$(body_get '.payload.pollIntervalMs // ""')")
  use_websocket=$(safe_string "$(null_to_empty "$(body_get '.payload.useWebSocket')")")
  current_selector_group=$(model_query '.settings.controller.selectorGroup // "GLOBAL"')
  current_delay_url=$(model_query '.settings.controller.delayUrl // "https://www.gstatic.com/generate_204"')
  current_delay_timeout=$(model_query '.settings.controller.delayTimeout // 5000')
  current_poll_interval=$(model_query '.settings.controller.pollIntervalMs // 2000')
  current_use_websocket=$(model_bool_text_default '.settings.controller.useWebSocket' 'true')
  CONTROLLER_SELECTOR_GROUP=$(safe_string "${selector_group:-}" "$current_selector_group")
  CONTROLLER_DELAY_URL=$(safe_string "${delay_url:-}" "$current_delay_url")
  CONTROLLER_DELAY_TIMEOUT=$(sanitize_int "${delay_timeout:-}" "$current_delay_timeout" 1000 30000)
  CONTROLLER_POLL_INTERVAL=$(sanitize_int "${poll_interval:-}" "$current_poll_interval" 1000 60000)
  CONTROLLER_USE_WEBSOCKET=$(sanitize_bool "${use_websocket:-}" "$current_use_websocket")
  CONTROLLER_SELECTOR_GROUP="$CONTROLLER_SELECTOR_GROUP" \
  CONTROLLER_DELAY_URL="$CONTROLLER_DELAY_URL" \
  CONTROLLER_DELAY_TIMEOUT="$CONTROLLER_DELAY_TIMEOUT" \
  CONTROLLER_POLL_INTERVAL="$CONTROLLER_POLL_INTERVAL" \
  CONTROLLER_USE_WEBSOCKET="$CONTROLLER_USE_WEBSOCKET" \
  yq -p json -o=json '
    .settings.controller.selectorGroup = strenv(CONTROLLER_SELECTOR_GROUP) |
    .settings.controller.delayUrl = strenv(CONTROLLER_DELAY_URL) |
    .settings.controller.delayTimeout = (strenv(CONTROLLER_DELAY_TIMEOUT) | tonumber) |
    .settings.controller.pollIntervalMs = (strenv(CONTROLLER_POLL_INTERVAL) | tonumber) |
    .settings.controller.useWebSocket = (strenv(CONTROLLER_USE_WEBSOCKET) == "true" or strenv(CONTROLLER_USE_WEBSOCKET) == "1")
  ' "$PANEL_MODEL" > "$MODEL_TMP"
  save_model
}

update_base() {
  base_id=$(safe_string "$(body_get '.payload.id // ""')")
  [ -n "$base_id" ] || respond_error '400 Bad Request' 'Base id is required.'
  base_idx=$(base_index "$base_id")
  [ -n "$base_idx" ] || respond_error '404 Not Found' 'Base not found.'
  name=$(body_get '.payload.patch.name // ""')
  kind=$(body_get '.payload.patch.kind // ""')
  scope=$(body_get '.payload.patch.scope // ""')
  format=$(body_get '.payload.patch.format // ""')
  source_url=$(body_get '.payload.patch.sourceUrl // ""')
  auto_update=$(body_get '.payload.patch.autoUpdate // ""')
  update_hours=$(body_get '.payload.patch.updateEveryHours // ""')
  enabled=$(body_get '.payload.patch.enabled // ""')
  note=$(body_get '.payload.patch.note // ""')
  entries_present=$(body_get '.payload.patch | has("entries")')
  model_tmp_begin
  [ -n "$name" ] && BASE_NAME="$name" model_tmp_apply ".bases[$base_idx].name = strenv(BASE_NAME)"
  [ -n "$kind" ] && BASE_KIND="$kind" model_tmp_apply ".bases[$base_idx].kind = strenv(BASE_KIND)"
  [ -n "$scope" ] && BASE_SCOPE="$scope" model_tmp_apply ".bases[$base_idx].scope = strenv(BASE_SCOPE)"
  [ -n "$format" ] && BASE_FORMAT="$format" model_tmp_apply ".bases[$base_idx].format = strenv(BASE_FORMAT)"
  [ -n "$source_url" ] && BASE_SOURCE_URL="$source_url" model_tmp_apply ".bases[$base_idx].sourceUrl = strenv(BASE_SOURCE_URL)"
  [ -n "$auto_update" ] && BASE_AUTO_UPDATE="$auto_update" model_tmp_apply ".bases[$base_idx].autoUpdate = (strenv(BASE_AUTO_UPDATE) == \"true\" or strenv(BASE_AUTO_UPDATE) == \"1\")"
  [ -n "$update_hours" ] && BASE_UPDATE_HOURS="$update_hours" model_tmp_apply ".bases[$base_idx].updateEveryHours = (strenv(BASE_UPDATE_HOURS) | tonumber)"
  [ -n "$enabled" ] && BASE_ENABLED="$enabled" model_tmp_apply ".bases[$base_idx].enabled = (strenv(BASE_ENABLED) == \"true\" or strenv(BASE_ENABLED) == \"1\")"
  [ -n "$note" ] && BASE_NOTE="$note" model_tmp_apply ".bases[$base_idx].note = strenv(BASE_NOTE)"
  save_model
  if [ "$entries_present" = "true" ]; then
    effective_kind="$kind"
    [ -n "$effective_kind" ] || effective_kind=$(base_field "$base_id" kind)
    file_path=$(base_file_for_id "$base_id")
    yq -p json -r '.payload.patch.entries[]? // ""' "$BODY_FILE" 2>/dev/null > "$TMP_DIR/base-entries.$$" || : > "$TMP_DIR/base-entries.$$"
    write_entries_file "$file_path" "$effective_kind" "$TMP_DIR/base-entries.$$"
    rm -f "$TMP_DIR/base-entries.$$"
    rm -f "$PANEL_STATE_CACHE"
  fi
  apply_model || respond_error '502 Bad Gateway' 'Base update apply failed.'
  reload_nikki || respond_error '502 Bad Gateway' 'Nikki reload failed after base update.'
}

default_file_path_for_base() {
  base_id="$1"
  printf '%s/%s.txt\n' "$PANEL_BASE_DIR" "$base_id"
}

default_provider_section_for_base() {
  base_id="$1"
  printf 'panel_base_%s\n' "$(safe_id "$base_id" | tr '-' '_')"
}

default_provider_name_for_base() {
  base_id="$1"
  printf '%s\n' "$base_id" | tr 'a-z' 'A-Z'
}

uci_safe_name() {
  safe_id "${1:-}" | tr '-' '_'
}

attach_default_rule_for_base() {
  base_id="$1"
  scope=$(base_field "$base_id" scope)
  kind=$(base_field "$base_id" kind)
  case "$scope:$kind" in
    direct:*) printf 'direct-overrides' ;;
    proxy:ips) printf 'proxy-ip-rule' ;;
    *) printf 'proxy-domains-rule' ;;
  esac
}

add_base() {
  name=$(safe_string "$(body_get '.payload.name // ""')")
  scope=$(safe_string "$(body_get '.payload.scope // "proxy"')" 'proxy')
  kind=$(safe_string "$(body_get '.payload.kind // "domains"')" 'domains')
  source_type=$(safe_string "$(body_get '.payload.sourceType // "local"')" 'local')
  [ -n "$name" ] || respond_error '400 Bad Request' 'Base name is required.'
  base_id=$(safe_id "$name")
  [ -n "$base_id" ] || base_id="custom-base"
  suffix=2
  while model_query ".bases[] | select(.id == \"$base_id\") | .id" | grep -qx "$base_id"; do
    base_id="$(safe_id "$name")-$suffix"
    suffix=$((suffix + 1))
  done
  provider_name=$(default_provider_name_for_base "$base_id")
  provider_section=$(default_provider_section_for_base "$base_id")
  file_path=$(default_file_path_for_base "$base_id")
  runtime_mode="local-lines"
  format="plain-list"
  auto_update=false
  update_hours=0
  if [ "$source_type" = "remote" ]; then
    runtime_mode="converted-text-ruleset"
    if [ "$kind" = "ips" ]; then
      format="geoip-dat"
    else
      format="geosite-dat"
    fi
    auto_update=true
    update_hours=12
  fi
  name_json=$(json_string "$name")
  scope_json=$(json_string "$scope")
  kind_json=$(json_string "$kind")
  source_type_json=$(json_string "$source_type")
  format_json=$(json_string "$format")
  runtime_mode_json=$(json_string "$runtime_mode")
  file_path_json=$(json_string "$file_path")
  provider_section_json=$(json_string "$provider_section")
  provider_name_json=$(json_string "$provider_name")
  base_id_json=$(json_string "$base_id")
  write_json_file "$ITEM_FILE" "{
    \"id\": $base_id_json,
    \"name\": $name_json,
    \"scope\": $scope_json,
    \"kind\": $kind_json,
    \"sourceType\": $source_type_json,
    \"format\": $format_json,
    \"sourceUrl\": \"\",
    \"runtimeMode\": $runtime_mode_json,
    \"autoUpdate\": $(bool_json "$auto_update"),
    \"updateEveryHours\": $update_hours,
    \"enabled\": true,
    \"filePath\": $file_path_json,
    \"providerSection\": $provider_section_json,
    \"providerName\": $provider_name_json,
    \"note\": \"\"
  }"
  ITEM_FILE="$ITEM_FILE" yq -p json -o=json '.bases += [load(strenv(ITEM_FILE))]' "$PANEL_MODEL" > "$MODEL_TMP"
  save_model
  default_rule=$(attach_default_rule_for_base "$base_id")
  if [ -n "$default_rule" ]; then
    rule_idx=$(rule_index "$default_rule")
    if [ -n "$rule_idx" ]; then
      model_tmp_begin
      BASE_ID="$base_id" model_tmp_apply ".rules[$rule_idx].baseIds = ((.rules[$rule_idx].baseIds // []) + [strenv(BASE_ID)] | unique)"
      save_model
    fi
  fi
  apply_model || respond_error '502 Bad Gateway' 'Base add apply failed.'
  reload_nikki || respond_error '502 Bad Gateway' 'Nikki reload failed after base add.'
}

remove_base() {
  base_id=$(safe_string "$(body_get '.payload.id // ""')")
  [ -n "$base_id" ] || respond_error '400 Bad Request' 'Base id is required.'
  file_path=$(base_file_for_id "$base_id")
  provider_section=$(base_provider_section "$base_id")
  BASE_ID="$base_id" yq -p json -o=json '
    .bases |= map(select(.id != strenv(BASE_ID))) |
    .rules |= map(.baseIds = ((.baseIds // []) | map(select(. != strenv(BASE_ID)))))
  ' "$PANEL_MODEL" > "$MODEL_TMP"
  save_model
  case "$file_path" in
    "$PANEL_BASE_DIR"/*) rm -f "$file_path" ;;
  esac
  if [ -n "$provider_section" ]; then
    uci -q delete "nikki.$provider_section" >/dev/null 2>&1 || true
    uci -q commit nikki
  fi
  apply_model || respond_error '502 Bad Gateway' 'Base remove apply failed.'
  reload_nikki || respond_error '502 Bad Gateway' 'Nikki reload failed after base remove.'
}

add_base_entry() {
  base_id=$(safe_string "$(body_get '.payload.id // ""')")
  entry=$(safe_string "$(body_get '.payload.entry // ""')")
  [ -n "$base_id" ] || respond_error '400 Bad Request' 'Base id is required.'
  [ -n "$entry" ] || respond_error '400 Bad Request' 'Entry is required.'
  file_path=$(base_file_for_id "$base_id")
  kind=$(base_field "$base_id" kind)
  mkdir -p "$(dirname "$file_path")"
  [ -f "$file_path" ] || : > "$file_path"
  tmp="$TMP_DIR/base-entry.$$"
  cp "$file_path" "$tmp" 2>/dev/null || : > "$tmp"
  case "$kind" in
    domains) normalized=$(normalize_domain_line "$entry" || true) ;;
    *) normalized=$(normalize_ip_line "$entry" || true) ;;
  esac
  [ -n "${normalized:-}" ] || respond_error '400 Bad Request' 'Entry format is invalid.'
  grep -Fqx "$normalized" "$tmp" 2>/dev/null || printf '%s\n' "$normalized" >> "$tmp"
  cp "$tmp" "$file_path"
  rm -f "$PANEL_STATE_CACHE"
  reload_nikki || respond_error '502 Bad Gateway' 'Nikki reload failed after base entry add.'
}

remove_base_entry() {
  base_id=$(safe_string "$(body_get '.payload.id // ""')")
  index=$(safe_string "$(body_get '.payload.index // ""')")
  [ -n "$base_id" ] || respond_error '400 Bad Request' 'Base id is required.'
  file_path=$(base_file_for_id "$base_id")
  [ -f "$file_path" ] || respond_error '404 Not Found' 'Base file not found.'
  awk -v drop="$index" 'BEGIN { n = 0 } NF { if (n != drop) print; n++ }' "$file_path" > "$TMP_DIR/base-pruned.$$"
  cp "$TMP_DIR/base-pruned.$$" "$file_path"
  rm -f "$PANEL_STATE_CACHE"
  reload_nikki || respond_error '502 Bad Gateway' 'Nikki reload failed after base entry remove.'
}

update_rule() {
  rule_id=$(safe_string "$(body_get '.payload.id // ""')")
  [ -n "$rule_id" ] || respond_error '400 Bad Request' 'Rule id is required.'
  rule_idx=$(rule_index "$rule_id")
  [ -n "$rule_idx" ] || respond_error '404 Not Found' 'Rule not found.'
  name=$(body_get '.payload.patch.name // ""')
  priority=$(body_get '.payload.patch.priority // ""')
  action=$(body_get '.payload.patch.action // ""')
  target=$(body_get '.payload.patch.target // ""')
  enabled=$(body_get '.payload.patch.enabled // ""')
  note=$(body_get '.payload.patch.note // ""')
  model_tmp_begin
  [ -n "$name" ] && RULE_NAME="$name" model_tmp_apply ".rules[$rule_idx].name = strenv(RULE_NAME)"
  [ -n "$priority" ] && RULE_PRIORITY="$priority" model_tmp_apply ".rules[$rule_idx].priority = (strenv(RULE_PRIORITY) | tonumber)"
  [ -n "$action" ] && RULE_ACTION="$action" model_tmp_apply ".rules[$rule_idx].action = strenv(RULE_ACTION)"
  [ -n "$target" ] && RULE_TARGET="$target" model_tmp_apply ".rules[$rule_idx].target = strenv(RULE_TARGET)"
  [ -n "$enabled" ] && RULE_ENABLED="$enabled" model_tmp_apply ".rules[$rule_idx].enabled = (strenv(RULE_ENABLED) == \"true\" or strenv(RULE_ENABLED) == \"1\")"
  [ -n "$note" ] && RULE_NOTE="$note" model_tmp_apply ".rules[$rule_idx].note = strenv(RULE_NOTE)"
  save_model
  apply_model || respond_error '502 Bad Gateway' 'Rule update apply failed.'
  reload_nikki || respond_error '502 Bad Gateway' 'Nikki reload failed after rule update.'
}

add_rule() {
  name=$(safe_string "$(body_get '.payload.name // ""')")
  action=$(safe_string "$(body_get '.payload.action // "PROXY"')" 'PROXY')
  target=$(safe_string "$(body_get '.payload.target // "BLOCKED SITES"')" 'BLOCKED SITES')
  [ -n "$name" ] || respond_error '400 Bad Request' 'Rule name is required.'
  rule_id=$(safe_id "$name")
  [ -n "$rule_id" ] || rule_id="custom-rule"
  suffix=2
  while model_query ".rules[] | select(.id == \"$rule_id\") | .id" | grep -qx "$rule_id"; do
    rule_id="$(safe_id "$name")-$suffix"
    suffix=$((suffix + 1))
  done
  max_priority=$(model_query '.rules | map(.priority) | max // 900')
  next_priority=$((max_priority + 10))
  rule_id_json=$(json_string "$rule_id")
  name_json=$(json_string "$name")
  action_json=$(json_string "$action")
  target_json=$(json_string "$target")
  write_json_file "$ITEM_FILE" "{
    \"id\": $rule_id_json,
    \"name\": $name_json,
    \"priority\": $next_priority,
    \"action\": $action_json,
    \"target\": $target_json,
    \"enabled\": true,
    \"locked\": false,
    \"matchMode\": \"any\",
    \"baseIds\": [],
    \"note\": \"\"
  }"
  ITEM_FILE="$ITEM_FILE" yq -p json -o=json '.rules += [load(strenv(ITEM_FILE))]' "$PANEL_MODEL" > "$MODEL_TMP"
  save_model
  apply_model || respond_error '502 Bad Gateway' 'Rule add apply failed.'
  reload_nikki || respond_error '502 Bad Gateway' 'Nikki reload failed after rule add.'
}

remove_rule() {
  rule_id=$(safe_string "$(body_get '.payload.id // ""')")
  [ -n "$rule_id" ] || respond_error '400 Bad Request' 'Rule id is required.'
  locked=$(rule_field "$rule_id" locked)
  [ "$locked" = "true" ] && respond_error '400 Bad Request' 'Locked rule cannot be removed.'
  RULE_ID="$rule_id" yq -p json -o=json '.rules |= map(select(.id != strenv(RULE_ID)))' "$PANEL_MODEL" > "$MODEL_TMP"
  save_model
  apply_model || respond_error '502 Bad Gateway' 'Rule remove apply failed.'
  reload_nikki || respond_error '502 Bad Gateway' 'Nikki reload failed after rule remove.'
}

toggle_rule_base() {
  rule_id=$(safe_string "$(body_get '.payload.ruleId // ""')")
  base_id=$(safe_string "$(body_get '.payload.baseId // ""')")
  [ -n "$rule_id" ] || respond_error '400 Bad Request' 'Rule id is required.'
  [ -n "$base_id" ] || respond_error '400 Bad Request' 'Base id is required.'
  rule_idx=$(rule_index "$rule_id")
  [ -n "$rule_idx" ] || respond_error '404 Not Found' 'Rule not found.'
  model_tmp_begin
  if model_query ".rules[$rule_idx].baseIds[]? // \"\"" | grep -Fqx "$base_id"; then
    BASE_ID="$base_id" model_tmp_apply ".rules[$rule_idx].baseIds = ((.rules[$rule_idx].baseIds // []) | map(select(. != strenv(BASE_ID))))"
  else
    BASE_ID="$base_id" model_tmp_apply ".rules[$rule_idx].baseIds = ((.rules[$rule_idx].baseIds // []) + [strenv(BASE_ID)] | unique)"
  fi
  save_model
  apply_model || respond_error '502 Bad Gateway' 'Rule base toggle apply failed.'
  reload_nikki || respond_error '502 Bad Gateway' 'Nikki reload failed after rule base toggle.'
}

trigger_named_action() {
  action=$(safe_string "$(body_get '.payload.action // ""')")
  case "$action" in
    refreshSubscriptions|reprocessSubscriptions)
      spawn_bridge_job "pool-refresh"
      ;;
    checkMissionControlUpdates)
      run_mission_control_update_job "check-only" || respond_error '502 Bad Gateway' 'Mission Control update check failed.'
      ;;
    applyMissionControlUpdate)
      run_mission_control_update_job "force-apply" || respond_error '502 Bad Gateway' 'Mission Control update failed.'
      ;;
    updateLists)
      sync_all_remote_bases || respond_error '502 Bad Gateway' 'Remote base sync failed.'
      reload_nikki || respond_error '502 Bad Gateway' 'Nikki reload failed after base sync.'
      model_query '.bases[] | select(.sourceType == "remote" and .enabled == true) | .id' | while IFS= read -r base_id; do
        [ -n "$base_id" ] || continue
        scheduler_mark_success "$(scheduler_job_id_for_base "$base_id")"
      done
      ;;
    retestServers)
      retest_auto_best_group || respond_error '502 Bad Gateway' 'Server retest failed.'
      scheduler_mark_success "auto-best"
      ;;
    clearLogs)
      /etc/init.d/nikki clear_logs >/dev/null 2>&1 || respond_error '502 Bad Gateway' 'Log cleanup failed.'
      scheduler_mark_success "log-cleanup"
      ;;
    restartTunnel)
      /etc/init.d/nikki restart >/dev/null 2>&1 || respond_error '502 Bad Gateway' 'Nikki restart failed.'
      ;;
    *)
      respond_error '400 Bad Request' 'Unknown action.'
      ;;
  esac
}

handle_action() {
  action=$(safe_string "$(body_get '.action // ""')")
  [ -n "$action" ] || respond_error '400 Bad Request' 'Action is required.'
  case "$action" in
    updatePanelSettings) update_panel_settings ;;
    updateMihomoMemoryLimit) update_mihomo_memory_limit ;;
    updateControllerSettings) update_controller_settings ;;
    updateAutomation) update_automation ;;
    updateAutoSelection) update_auto_selection ;;
    toggleBlockedCountry) toggle_blocked_country ;;
    setAllowUnknownEgress) set_allow_unknown ;;
    updateBase) update_base ;;
    syncBase)
      base_id=$(safe_string "$(body_get '.payload.id // ""')")
      [ -n "$base_id" ] || respond_error '400 Bad Request' 'Base id is required.'
      sync_base_file "$base_id" || respond_error '502 Bad Gateway' 'Base sync failed.'
      reload_nikki || respond_error '502 Bad Gateway' 'Nikki reload failed after base sync.'
      scheduler_mark_success "$(scheduler_job_id_for_base "$base_id")"
      ;;
    addBase) add_base ;;
    removeBase) remove_base ;;
    addBaseEntry) add_base_entry ;;
    removeBaseEntry) remove_base_entry ;;
    updateRule) update_rule ;;
    addRule) add_rule ;;
    removeRule) remove_rule ;;
    toggleRuleBase) toggle_rule_base ;;
    addSubscription) add_subscription ;;
    updateSubscription) update_subscription ;;
    removeSubscription) remove_subscription ;;
    runRouteProbe) handle_route_probe ;;
    runRuleProbe) handle_rule_probe ;;
    runDnsProbe) handle_dns_probe ;;
    runLatencyProbe) handle_latency_probe ;;
    triggerAction) trigger_named_action ;;
    *)
      respond_error '400 Bad Request' 'Unsupported action.'
      ;;
  esac
  respond_json '200 OK' '{"ok":true}'
}

if [ "${1:-}" = "scheduler-run" ]; then
  run_bridge_scheduler_once
  exit 0
fi

if [ "${1:-}" = "run-job" ]; then
  shift
  run_bridge_job "${1:-}" "${2:-}"
  exit $?
fi

if [ "${1:-}" = "finalize-bridge-update" ]; then
  shift
  finalize_bridge_self_update "${1:-}"
  exit $?
fi

ensure_model
if [ "$MODEL_CREATED" = "1" ]; then
  apply_model || respond_error '500 Internal Server Error' 'Initial panel model apply failed.'
  sync_scheduler_cron || true
fi

if [ "$REQUEST_METHOD_SAFE" = "OPTIONS" ]; then
  respond_headers '204 No Content'
  exit 0
fi

path="${PATH_INFO:-/}"
query="${QUERY_STRING:-}"

case "$path" in
  /mission-control/state|/panel/state)
    [ "$REQUEST_METHOD_SAFE" = "GET" ] || respond_error '405 Method Not Allowed' 'Only GET is allowed.'
    build_panel_state
    ;;
  /mission-control/connections|/panel/connections)
    [ "$REQUEST_METHOD_SAFE" = "GET" ] || respond_error '405 Method Not Allowed' 'Only GET is allowed.'
    build_panel_connections
    ;;
  /mission-control/memory|/panel/memory)
    [ "$REQUEST_METHOD_SAFE" = "GET" ] || respond_error '405 Method Not Allowed' 'Only GET is allowed.'
    build_panel_memory
    ;;
  /mission-control/traffic|/panel/traffic)
    [ "$REQUEST_METHOD_SAFE" = "GET" ] || respond_error '405 Method Not Allowed' 'Only GET is allowed.'
    build_panel_traffic
    ;;
  /mission-control/actions|/panel/action)
    [ "$REQUEST_METHOD_SAFE" = "POST" ] || respond_error '405 Method Not Allowed' 'Only POST is allowed.'
    handle_action
    ;;
  *)
    controller_path=$(printf '%s' "$path" | sed 's/ /%20/g')
    status=$(controller_request "$REQUEST_METHOD_SAFE" "$controller_path" "$query" "$BODY_FILE")
    persist_runtime_routing_if_needed "$REQUEST_METHOD_SAFE" "$path" "$status" || true
    case "$status" in
      2*|3*) respond_file "$status" "$RESP_FILE" ;;
      401) respond_file '401 Unauthorized' "$RESP_FILE" ;;
      403) respond_file '403 Forbidden' "$RESP_FILE" ;;
      404) respond_file '404 Not Found' "$RESP_FILE" ;;
      *) respond_file '502 Bad Gateway' "$RESP_FILE" ;;
    esac
    ;;
esac
