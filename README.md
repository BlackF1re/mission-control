# Mission Control

Mission Control is a custom external web UI for `nikki`, backed by a router-side bridge for `mihomo`.

The UI is distributed as a Nikki-compatible ZIP archive, so it can be plugged into LuCI through `Services -> Nikki -> Mixin -> External control settings -> UI URL`.
The bridge is installed separately on the router and exposes `/cgi-bin/mission-control-bridge`, which keeps Mihomo secrets and router-side automation logic away from the browser.

## What this repository contains

- `router-export/`: the current live Mission Control UI and bridge sources
- `scripts/build-release.ps1`: builds release-ready artifacts into `dist/`
- `scripts/install.sh.template`: template for the router bootstrap installer
- `.github/workflows/build-release-assets.yml`: CI job that validates the release bundle

## Release assets

Each GitHub release publishes these files:

- `mission-control-ui.zip`
- `mission-control-bridge.cgi`
- `mission-control-manifest.json`
- `install.sh`

Mission Control releases now use semantic versioning: `X.Y.Z`.
The version is sourced from `router-export/ui/bridge/mission_control_bridge.cgi`, and the release tag format is always `vX.Y.Z`.

Direct latest URLs:

- UI ZIP: `https://github.com/BlackF1re/mission-control/releases/latest/download/mission-control-ui.zip`
- bridge installer: `https://github.com/BlackF1re/mission-control/releases/latest/download/install.sh`
- update manifest: `https://github.com/BlackF1re/mission-control/releases/latest/download/mission-control-manifest.json`

## Install on OpenWrt

Prerequisites:

- the router has outbound HTTPS access to GitHub Releases
- the router runs a firewall4-based OpenWrt build supported by Nikki

### Recommended one-shot install

Run one command on the router:

```sh
sh -c "$(wget -qO- https://github.com/BlackF1re/mission-control/releases/latest/download/install.sh)"
```

What this does:

- detects whether Nikki is missing or installed incompletely
- detects OpenWrt release and architecture from `/etc/openwrt_release`
- if needed, first tries the official Nikki feed from `https://nikkinikki.pages.dev`
- if that feed is unreachable on `apk`-based systems, falls back automatically to the matching official Nikki release bundle from GitHub Releases
- installs or repairs `mihomo-meta`, `nikki`, and `luci-app-nikki` from official Nikki sources
- installs bridge dependencies if they are missing: `curl`, `yq`, `unzip`
- installs the Mission Control bridge into `/usr/libexec/mission-control/mission_control_bridge.cgi`
- installs the CGI wrapper into `/www/cgi-bin/mission-control-bridge`
- configures Nikki to use:
  - `ui_path='ui'`
  - `ui_name='Mission Control'`
  - `ui_url='https://github.com/BlackF1re/mission-control/releases/latest/download/mission-control-ui.zip'`
- seeds the live panel model with the Mission Control manifest URL
- restarts Nikki, primes the bridge state, and installs the UI assets

After that, open the panel at:

```text
http://ROUTER_IP:9090/ui/
```

The intended first-run flow is:

- open Mission Control
- leave or adjust the prefilled runetfreedom lists
- add your subscription
- wait for the first pool rebuild to finish

The first subscription import can take a while, because Mission Control checks nodes one by one and fills the egress cache on the router side.

### Manual full installation

If you want the `README` path to match exactly what a user does by hand, use the commands below.

#### 1. Detect OpenWrt release and Nikki feed URL

```sh
. /etc/openwrt_release
case "$DISTRIB_RELEASE" in
  *24.10*) NIKKI_BRANCH="openwrt-24.10" ;;
  *25.12*) NIKKI_BRANCH="openwrt-25.12" ;;
  SNAPSHOT) NIKKI_BRANCH="SNAPSHOT" ;;
  *) echo "Unsupported OpenWrt release: $DISTRIB_RELEASE" >&2; false ;;
esac
NIKKI_ARCH="$DISTRIB_ARCH"
NIKKI_REPO_BASE="https://nikkinikki.pages.dev"
NIKKI_FEED_URL="$NIKKI_REPO_BASE/$NIKKI_BRANCH/$NIKKI_ARCH/nikki"
echo "$NIKKI_FEED_URL"
```

#### 2A. Install Nikki from the official feed on `apk`-based OpenWrt

```sh
mkdir -p /etc/apk/repositories.d /etc/apk/keys
wget -qO /etc/apk/keys/nikki.pem https://nikkinikki.pages.dev/public-key.pem
printf '%s\n' "${NIKKI_FEED_URL}/packages.adb" > /etc/apk/repositories.d/customfeeds.list
apk update
apk add --allow-untrusted --force-reinstall -X "${NIKKI_FEED_URL}/packages.adb" mihomo-meta nikki luci-app-nikki
```

#### 2B. Install Nikki from the official feed on `opkg`-based OpenWrt

```sh
wget -qO /tmp/nikki.pub https://nikkinikki.pages.dev/key-build.pub
opkg-key add /tmp/nikki.pub
grep -Fv 'src/gz nikki ' /etc/opkg/customfeeds.conf 2>/dev/null > /tmp/customfeeds.conf || true
mv /tmp/customfeeds.conf /etc/opkg/customfeeds.conf 2>/dev/null || true
printf '%s\n' "src/gz nikki $NIKKI_FEED_URL" >> /etc/opkg/customfeeds.conf
opkg update
opkg install mihomo-meta nikki luci-app-nikki
```

#### 3. Install Mission Control

```sh
sh -c "$(wget -qO- https://github.com/BlackF1re/mission-control/releases/latest/download/install.sh)"
```

#### 4. Open the panel

```text
http://ROUTER_IP:9090/ui/
```

### Manual UI URL mode

If you want to configure the Nikki dashboard selector yourself in LuCI, paste this into the custom `UI URL` field:

```text
https://github.com/BlackF1re/mission-control/releases/latest/download/mission-control-ui.zip
```

That only installs the frontend ZIP.
You still need the bridge on the router, so run:

```sh
sh -c "$(wget -qO- https://github.com/BlackF1re/mission-control/releases/latest/download/install.sh)"
```

## Auto-update model

Mission Control does not rely on separate external scripts or hand-written cron jobs outside the installed bridge.

- Nikki stores the UI source in `nikki.mixin.ui_url`
- the bridge stores the release manifest URL in `/etc/nikki/panel/model.json`
- the bridge scheduler installs one cron entry that runs every minute and internally decides which jobs are due
- the scheduler handles:
  - subscription refresh timers
  - remote base sync timers
  - log cleanup
  - Mission Control release checks
- UI and bridge auto-update settings are managed from the Mission Control automation controls, not from browser `localStorage`

The default manifest URL is:

```text
https://github.com/BlackF1re/mission-control/releases/latest/download/mission-control-manifest.json
```

Current release-update behavior:

- when `uiAutoUpdate` is enabled, the bridge applies the latest `mission-control-ui.zip`
- when `bridgeAutoUpdate` is enabled, the bridge replaces `mission_control_bridge.cgi` in the active install path and any detected legacy bridge path
- release checks run on the timer configured in the Automation section
- new installs and upgraded routers probe the latest release on the first scheduler pass, then continue on the configured timer
- the default release check interval is `30` minutes
- the scheduler persists its state on the router, so versions and timestamps survive page reloads and service restarts
- Settings also provide a manual release check button that queries GitHub Releases, shows the latest changelog, and turns into `Update` when a newer version is available

## Build a release locally

From Windows PowerShell:

```powershell
./scripts/build-release.ps1
```

Artifacts will be written to `dist/`.

If `dist/` is busy because you are serving it locally, build into a separate directory:

```powershell
./scripts/build-release.ps1 -DistRoot ./dist-build
```

## Publish a release manually

Build the release bundle first:

```powershell
./scripts/build-release.ps1
```

The build script enforces semantic versioning in `X.Y.Z` format.

Then publish the current version embedded in `router-export/ui/bridge/mission_control_bridge.cgi`:

```powershell
$version = (Select-String -Path .\router-export\ui\bridge\mission_control_bridge.cgi -Pattern 'MISSION_CONTROL_VERSION="([^"]+)"').Matches[0].Groups[1].Value
gh release create "v$version" `
  dist/mission-control-ui.zip `
  dist/mission-control-bridge.cgi `
  dist/mission-control-manifest.json `
  dist/install.sh `
  --title "Mission Control $version"
```
