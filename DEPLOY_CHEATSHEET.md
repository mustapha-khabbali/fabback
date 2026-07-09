# FabLab — Deploy Cheatsheet

**The #1 rule:** editing code or running `npm run build` (or Codex saying "done, build green")
does **NOTHING** to the public websites. The live sites only change after `firebase deploy`.

- Live user app  → https://fablab-bmk.web.app
- Live admin app → https://fablab-cmc.web.app  (admin login: seeded from `ADMIN_SEED_*` in `fablab-api/.env` — credentials never live in this repo)
- Both talk to the API on your Mac **through the Cloudflare tunnel** — keep that terminal open.

---

## After ANY code change (Codex or you): rebuild + redeploy

Run from `/Users/mac/Desktop/fablab`. First grab the current tunnel URL:

```bash
URL=$(grep -o "https://[a-z0-9-]*\.trycloudflare\.com" /tmp/cloudflared.log | head -1)
echo "$URL"          # should print a trycloudflare URL
curl -s "$URL/api/health"   # should print {"ok":true}
```

### If the change was in the ADMIN app (admin-main)
```bash
printf 'VITE_API_URL=%s/api\n' "$URL" > admin-main/.env.production
cd admin-main && npm run build && cd ..
firebase deploy --project fablab-bmk --only hosting:admin
```

### If the change was in the USER app (fabweb0-master)
```bash
printf 'VITE_API_URL=%s/api\n' "$URL" > fabweb0-master/.env.production
cd fabweb0-master && npm run build && cd ..
firebase deploy --project fablab-bmk --only hosting:user
```

### If the change was in the API (fablab-api) — no rebuild/deploy of the sites needed
```bash
pkill -f "npm start"; sleep 1
cd fablab-api && nohup npm start > /tmp/fablab-api.log 2>&1 & cd ..
curl -s http://localhost:4000/api/health   # {"ok":true}
```
(The API is served live through the tunnel, so restarting it is enough.)

---

## Then: HARD-REFRESH the browser
The sites cache `index.html` for ~1h, so a normal refresh shows the OLD page.
- Mac: **⌘ + Shift + R**
- Or open an **Incognito** window
- Or DevTools → right-click refresh → "Empty Cache and Hard Reload"

## Prove the deploy actually went live (optional)
```bash
# which JS the live site references vs what you built
curl -s https://fablab-cmc.web.app/ | grep -o '/assets/index-[^"]*\.js' | head -1
ls admin-main/dist/assets/index-*.js
```
If the hashes match, the new code is live and the only thing left is your browser cache.

---

## When "Identifiants incorrects" / data won't load / login is stuck
Almost always the **tunnel URL changed** (Mac slept, terminal closed, tunnel restarted).
The apps were built against a dead URL. Fix = restart tunnel, then rebuild+redeploy BOTH apps:

```bash
pkill -f "cloudflared tunnel"; rm -f /tmp/cloudflared.log
nohup /Users/mac/.local/bin/cloudflared tunnel --protocol http2 --url http://localhost:4000 \
  > /tmp/cloudflared.log 2>&1 &
sleep 6
URL=$(grep -o "https://[a-z0-9-]*\.trycloudflare\.com" /tmp/cloudflared.log | head -1); echo "$URL"
# then rebuild + redeploy admin AND user (both blocks above)
```
