# Dusk

Nightstand clock for the iPad: lock-screen-style customizable home screen, pure-black night mode, sleep sounds all night, and layered generated alarm music that takes over when the sleep sound fades out. "Leave by" shows tomorrow morning's departure time, sent each night by Muse.

- `index.html`: the whole app (no build step). Settings, alarms and the wallpaper photo are stored on the iPad (localStorage + IndexedDB).
- `api/leave.js`: Leave by inbox. Needs Vercel env vars `DUSK_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (table `dusk_leave`, SQL in the build folder).
  - Write: `POST /api/leave` with header `x-dusk-key`, JSON `{"day":"2026-10-27","event":"INC Systems","location":"...","start":"08:30","drive_min":25}`; clear a day with `{"day":"...","clear":true}`.
  - Read: `GET /api/leave` with the same header.
- `sounds/`: Mixkit sound effects (Mixkit Sound Effects Free License). Missing files fall back to a generated stand-in.
- `version.json` must match `APP_VERSION` in `index.html`.
