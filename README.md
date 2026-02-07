# Hume + Hue Mood Sync (CLI)

This project is a reference CLI that streams live microphone audio to Hume.ai, reads emotion/prosody scores, and maps the dominant mood to Philips Hue lights with smooth transitions.

## Requirements
- Node.js 18+
- A Hume.ai API key and streaming endpoint
- A Philips Hue Bridge on the same network

## Setup
1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy the environment template:
   ```bash
   cp .env.example .env
   ```
3. Fill in the environment variables in `.env`:
   - `HUME_API_KEY`: Hume API key
   - `HUME_ENDPOINT`: Hume websocket streaming endpoint (e.g., `wss://api.hume.ai/v0/stream/models`)
   - `HUME_CONFIG_ID`: Optional Hume config ID
   - `HUE_BRIDGE_IP`: Hue Bridge IP address
   - `HUE_APP_KEY`: Hue application key (username)
   - `HUE_LIGHT_IDS`: Comma-separated list of Hue v2 light resource IDs (UUIDs) to control

## Getting Hume credentials
- Create an account at https://hume.ai
- Generate an API key from the Hume developer console
- Create/configure a streaming model and copy the websocket endpoint

## Getting a Hue application key
1. Press the physical button on your Hue Bridge.
2. Within 30 seconds, run:
   ```bash
   curl -k -X POST https://<HUE_BRIDGE_IP>/api \
     -d '{"devicetype":"hume-hue#cli"}'
   ```
3. Copy the `username` from the response and use it as `HUE_APP_KEY`.

## Finding Hue v2 light IDs
Use the v2 API to list light resources and copy the `id` values:
```bash
curl -k https://<HUE_BRIDGE_IP>/clip/v2/resource/light \
  -H "hue-application-key: <HUE_APP_KEY>"
```

## Run
```bash
npm run dev
```

## Notes
- The app aggregates emotions over a short window and rate-limits Hue updates to avoid flicker.
- If the mic permissions fail, confirm OS microphone access and try again.
