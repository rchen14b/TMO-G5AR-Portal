# TMO-G5AR Portal

A modern web admin interface for the T-Mobile Arcadyan G5AR 5G Gateway, built with Next.js and shadcn/ui.

[![GitHub](https://img.shields.io/badge/GitHub-rchen14b-181717?style=flat&logo=github)](https://github.com/rchen14b/TMO-G5AR-Portal)
[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20A%20Coffee-support-yellow?style=flat&logo=buy-me-a-coffee)](https://buymeacoffee.com/rchen14b)

## Screenshots

### Dashboard
Real-time gateway status with 5G signal metrics, connection details, and device overview.

![Dashboard](docs/screenshots/screenshot_dashboard.png)

### Cell Information
Detailed 5G cellular metrics with signal quality sparklines, tower information, and SIM details.

![Cell Info](docs/screenshots/screenshot_cell_info.png)

### Connected Devices
View all devices connected to your network with IP/MAC addresses and signal strength.

![Devices](docs/screenshots/screenshot_devices.png)

### WiFi Settings
Manage your wireless networks across 2.4GHz, 5GHz, and 6GHz bands.

![WiFi](docs/screenshots/screenshot_wifi.png)

### System
Gateway information, system status, and quick actions like reboot.

![System](docs/screenshots/screenshot_system.png)

## Features

- **Dashboard** - Real-time signal strength gauges (RSRP/RSRQ/SINR), connection status, uptime
- **Connected Devices** - View all clients with names, IPs, MAC addresses, and signal strength
- **WiFi Settings** - Manage SSID, password, and band configurations (2.4GHz, 5GHz, 6GHz)
- **Cell Info** - Detailed 5G metrics including tower ID, band info (n41), and GPS coordinates
- **SIM Info** - ICCID, IMEI, IMSI details
- **System Controls** - Reboot gateway, view device info and firmware version
- **Signal History** - Background-recorded RSRP/RSRQ/SINR/RSSI charted over time (1h–7d) to compare antenna placement and track performance
- **Placement Survey** - Tag samples with the gateway's current spot and compare spots side by side (SINR/RSRP, stability, band, cell, measured speed), with a live readout for fine positioning
- **Speed Test** - Server-side download/upload and idle/loaded latency test, stored with the signal and survey spot at the time

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **UI Components**: shadcn/ui
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **Data Fetching**: SWR for real-time updates
- **Icons**: Lucide React

## Router API Endpoints

| Endpoint | Auth | Description |
|----------|------|-------------|
| `POST /TMI/v1/auth/login` | No | Authenticate, returns JWT token |
| `GET /TMI/v1/version` | No | API version |
| `GET /TMI/v1/gateway?get=all` | No | Device info, signal summary, uptime |
| `GET /TMI/v1/gateway?get=signal` | No | Signal info only |
| `GET /TMI/v1/network/telemetry?get=cell` | Yes | 5G signal metrics |
| `GET /TMI/v1/network/telemetry?get=clients` | Yes | Connected devices |
| `GET /TMI/v1/network/telemetry?get=sim` | Yes | SIM card info |
| `GET /TMI/v1/network/configuration/v2?get=ap` | Yes | WiFi AP settings |
| `POST /TMI/v1/network/configuration/v2?set=ap` | Yes | Update WiFi settings |
| `POST /TMI/v1/gateway/reset?set=reboot` | Yes | Reboot gateway |

## Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the portal.

Login with your gateway credentials (found on the label of your device). The default username is `admin` and the default gateway IP is `192.168.12.1`.

## Signal History

The server records the gateway's 5G signal (RSRP/RSRQ/SINR/RSSI/band) on an
interval and stores it as JSONL, so the **History** page can chart signal
quality over time — handy for finding the best antenna placement. Recording
starts automatically the first time the portal is opened and continues in the
background while the server runs (no browser needed). Samples are written to
`.data/signal-history.jsonl` (mount a volume at `/app/.data` to persist across
container restarts).

Configure via environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `ROUTER_IP` | `192.168.12.1` | Gateway IP the background poller queries |
| `SIGNAL_POLL_INTERVAL_MS` | `60000` | How often to record a sample (ms) |
| `SIGNAL_SURVEY_INTERVAL_MS` | `10000` | How often to record while a placement survey location is set (ms) |
| `SIGNAL_MAX_ENTRIES` | `20000` | Max samples retained before old ones are pruned |
| `SIGNAL_DATA_DIR` | `<cwd>/.data` | Directory for the JSONL store |
| `SIGNAL_HISTORY_DISABLED` | _(unset)_ | Set to `1` to disable recording |

### Placement survey

To find the best spot for the gateway, open **Placement**, type a name for the
spot, and press **Start recording here**, then move the gateway there. Samples
are taken every 10 seconds and tagged with that name until you start another
spot or stop. The comparison table skips the first 2 minutes of each visit
while the gateway reconnects and ranks spots in this order: stays on the cell
most samples used, reaches 15 dB average SINR, then RSRP (which sets upload
speed) plus half the SINR, capped at 25 dB. Spots on another cell are
highlighted, and the SINR spread column shows how steady each spot is. The
**Live signal** card refreshes every 3 seconds and compares the current
reading with the best spot so far, for nudging the gateway within a room. Run
the portal on a laptop plugged into the gateway (or on its Wi-Fi) so it keeps
reaching the gateway as you move it. **Export CSV** downloads every survey
sample.

### Speed test

**Run speed test** on the Placement page measures download and upload with
four parallel streams against Cloudflare (`speed.cloudflare.com`), and latency
to 1.1.1.1 while idle and while each direction is saturated. A test takes about
20 seconds and moves a few hundred MB on a fast link. Results are appended to
`.data/speed-tests.jsonl` with the signal and survey spot at the time, and the
comparison table shows each spot's median speeds. The test runs on the
portal's host, so keep that machine wired to the gateway; over Wi-Fi the
result measures the Wi-Fi link.

## Docker

### Prerequisites

Make sure [Docker Desktop](https://www.docker.com/products/docker-desktop/) is installed and running before proceeding.

### Build

```bash
docker buildx build -t g5ar-portal .
```

### Run

**Linux:**
```bash
docker run --network host g5ar-portal
```

**macOS/Windows:** Docker Desktop doesn't support `--network host`. Use port mapping instead:
```bash
docker run -p 3000:3000 g5ar-portal
```

Access the portal at [http://localhost:3000](http://localhost:3000).

### Docker Compose

**Linux** (`docker-compose.yml`):
```yaml
services:
  g5ar-portal:
    build: .
    network_mode: host
    restart: unless-stopped
```

**macOS/Windows** (`docker-compose.yml`):
```yaml
services:
  g5ar-portal:
    build: .
    ports:
      - "3000:3000"
    restart: unless-stopped
```

Then run:

```bash
docker compose up -d
```

## Project Structure

```
src/
├── app/
│   ├── api/router/       # API routes proxying to gateway
│   ├── (dashboard)/      # Main dashboard page
│   ├── devices/          # Connected devices page
│   ├── wifi/             # WiFi settings page
│   ├── cell/             # Cell/5G info page
│   └── system/           # System controls page
├── components/
│   ├── ui/               # shadcn/ui components
│   ├── signal-gauge.tsx  # Signal strength visualization
│   ├── device-table.tsx  # Connected devices table
│   └── ...
├── lib/
│   ├── router-api.ts     # Router API client
│   └── utils.ts          # Utility functions
└── hooks/
    └── use-router-data.ts # SWR hooks for router data
```

## License

MIT
