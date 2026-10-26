// Dusk · Leave by
// Muse (or anything else) POSTs tomorrow's first morning event; the iPad GETs it.
// Auth: header "x-dusk-key: <DUSK_KEY>" (or "Authorization: Bearer <key>", or ?key= for agents that can only open links).
// Storage: Supabase table dusk_leave (see the SQL file). Times are local wall-clock "HH:MM" strings.
const TZ = process.env.DUSK_TZ || 'America/Detroit';

function keyFrom(req){
  const h = req.headers || {};
  return h['x-dusk-key'] || String(h.authorization || '').replace(/^Bearer\s+/i, '') || (req.query && req.query.key) || (req.body && req.body.key) || '';
}
function sb(path, init = {}){
  const url = process.env.SUPABASE_URL.replace(/\/$/, '') + '/rest/v1/' + path;
  const k = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return fetch(url, { ...init, headers:{ apikey:k, Authorization:'Bearer ' + k, 'Content-Type':'application/json', ...(init.headers || {}) } });
}
const isDay = s => /^\d{4}-\d{2}-\d{2}$/.test(s);
const str = (v, n) => v == null ? null : String(v).slice(0, n);
// "08:30", "8:30 AM", or an ISO date-time → local "HH:MM" (and day)
function toLocal(v){
  if (v == null || v === '') return null;
  const s = String(v).trim();
  let m = /^(\d{1,2}):(\d{2})\s*(am|pm)?$/i.exec(s);
  if (m){ let h = +m[1]; const ap = (m[3] || '').toLowerCase(); if (ap === 'pm' && h < 12) h += 12; if (ap === 'am' && h === 12) h = 0; if (h > 23 || +m[2] > 59) return null; return { hm:`${String(h).padStart(2,'0')}:${m[2]}` }; }
  const d = new Date(s); if (isNaN(d)) return null;
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone:TZ, year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', hourCycle:'h23' }).formatToParts(d).map(x => [x.type, x.value]));
  return { hm:`${p.hour}:${p.minute}`, day:`${p.year}-${p.month}-${p.day}` };
}
function today(){ return new Intl.DateTimeFormat('en-CA', { timeZone:TZ }).format(new Date()); }

export default async function handler(req, res){
  res.setHeader('Cache-Control', 'no-store');
  if (!process.env.DUSK_KEY || !process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY)
    return res.status(500).json({ error:'Server not set up: add DUSK_KEY, SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Vercel, then redeploy.' });
  if (keyFrom(req) !== process.env.DUSK_KEY) return res.status(401).json({ error:'Wrong or missing key' });

  let body = req.body || {};
  if (typeof body === 'string'){ try { body = JSON.parse(body); } catch(e){ body = {}; } }
  const q = req.query || {};
  const input = req.method === 'POST' ? body : q;
  const writing = req.method === 'POST' || q.start || q.leave || q.clear || q.day;

  try {
    if (req.method === 'DELETE' || (writing && (input.clear === true || input.clear === 'true' || input.clear === '1'))){
      const day = input.day; if (!isDay(day)) return res.status(400).json({ error:'day must be YYYY-MM-DD' });
      const r = await sb('dusk_leave?day=eq.' + day, { method:'DELETE' });
      if (!r.ok) return res.status(502).json({ error:'Database error', detail: await r.text() });
      return res.status(200).json({ ok:true, cleared:day });
    }
    if (writing){
      const st = toLocal(input.start), lv = toLocal(input.leave || input.leave_by);
      const day = isDay(input.day) ? input.day : (st && st.day) || (lv && lv.day);
      if (!day) return res.status(400).json({ error:'Send day (YYYY-MM-DD) or a full date-time in start' });
      if (!st && !lv) return res.status(400).json({ error:'Send start ("HH:MM") with drive_min, or leave ("HH:MM")' });
      const drive = input.drive_min ?? input.travel_min ?? input.drive;
      const row = { day, event:str(input.event, 80), location:str(input.location, 160), start: st ? st.hm : null,
        drive_min: drive == null || drive === '' ? null : Math.max(0, Math.min(600, Math.round(+drive) || 0)),
        leave: lv ? lv.hm : null, note:str(input.note, 200), updated_at:new Date().toISOString() };
      const r = await sb('dusk_leave?on_conflict=day', { method:'POST', headers:{ Prefer:'resolution=merge-duplicates,return=representation' }, body:JSON.stringify(row) });
      if (!r.ok) return res.status(502).json({ error:'Database error', detail: await r.text() });
      return res.status(200).json({ ok:true, saved:(await r.json())[0] });
    }
    // read: today and later
    const r = await sb(`dusk_leave?day=gte.${today()}&order=day.asc&limit=7`);
    if (!r.ok) return res.status(502).json({ error:'Database error', detail: await r.text() });
    return res.status(200).json({ items: await r.json() });
  } catch(e){
    return res.status(500).json({ error:'Server error', detail:String(e && e.message || e) });
  }
}
