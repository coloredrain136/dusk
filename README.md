# Dusk

Nightstand clock for the iPad: day screen with a sky that follows the time of day, pure-black night mode, sleep sounds all night, and gentle alarms that take over when the sleep sound fades out.

- Single `index.html`, no build step. Everything is stored on the iPad (localStorage).
- `sounds/waves.mp3`, `rain.mp3`, `thunder.mp3` are Mixkit sound effects (Mixkit Sound Effects Free License). If a file is missing, Dusk plays a built-in generated version.
- Alarm melodies are generated in code (Web Audio).
- `version.json` must match `APP_VERSION` in `index.html`; the iPad shows "Update ready" when they differ.
