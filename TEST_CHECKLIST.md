# FabLab — Full Functionality Test Checklist

Two apps + one API:
- **User app**: https://fablab-bmk.web.app
- **Admin app**: https://fablab-cmc.web.app
- **API**: https://fablab-api.ofppt.me (Oracle VM)

Before testing: **hard-refresh** each app (⌘⇧R) or reopen the tab so you get the latest build. Lab hours are back to normal (**08:30–18:30, weekends closed**) — for scan tests during off-hours, an admin can add nothing / or test on a weekday in working hours.

Legend: each item = one thing to click and the expected result. ☐ = to test.

---

# PART A — USER APP (fablab-bmk)

## A1. Onboarding & Authentication
- ☐ Open app → **Home** shows logo, rotating illustration (tap image → changes), "Continuer avec Google".
- ☐ **Continue with Google** → Google popup → pick account.
  - New user → **Role selection** screen (Stagiaire / Formateur / Administrateur / Visiteur).
  - Existing complete profile → goes straight to the logged-in app (Scan tab).
- ☐ **Stagiaire registration**: fill Prénom, Nom, CIN, Pôle→Niveau→Filière→Année→Option (cascading — each choice filters the next), Tel (06/07 + 10 digits), Email, accept charte + reproduction → **Créer un compte**.
  - Bad email / bad phone / missing field → inline error, blocked.
  - **Duplicate prénom+nom** (someone already registered with that name) → error "Un compte existe déjà avec ce nom et prénom."
- ☐ **Formateur / Admin / Visiteur registration** (RoleRegistration): Prénom, Nom, CIN, Tel, Email, charte → create.
- ☐ **Charte screen**: reachable from the "charte de fab lab" link, back returns to the form with data preserved.
- ☐ **Session recovery** (iOS Safari): if the page reloads mid-registration, submitting still works (auto re-auth), no "Missing bearer token".
- ☐ **Logout** (My Profile → Se déconnecter) → returns to Home, session cleared.

## A2. FabLab Home tab
- ☐ Landing content renders (tagline, illustration).
- ☐ **Search bar** here → routes into Search tab.
- ☐ **Role filter** chip (Tous / Stagiaires / Formateurs / Administrateurs / Visiteurs) → sets active filter.

## A3. Scan (gate) — camera
- ☐ **Scan tab** → camera starts (permission prompt first time). Camera error shows a message if denied.
- ☐ Scan **Gate-IN QR** → opens **Scan Objective modal** (see A4). On success you're "in the lab".
- ☐ Scan **Gate-OUT QR** while in lab → **Feedback modal** (rating 1–5 + comment) → check-out recorded.
- ☐ Scan **Gate-IN again while already in** → blocked with "scannez le QR Gate-OUT pour sortir".
- ☐ Scan **Event QR** → event objective flow.
- ☐ Outside opening hours / weekend → check-in refused with "Le FabLab est fermé…".

## A4. Scan Objective modal (gate-in) — the big one
- ☐ Objective list appears (Projet en cours, Demande d'info, Amélioration/idée, Event, Stage, Other).
- ☐ **Projet en cours** → pick a project from your projects.
  - ☐ **Autre encadrant accompagné** dropdown lists encadrants already on that project.
  - ☐ **Options rapides**: Responsable Entrepreneuriat / Responsable Incubateur / Formateur PIE buttons → adds that encadrant; if already added → "déjà encadrant de ce projet" (not a false "aucun trouvé").
  - ☐ **Ajouter un encadrant existant** (search bar) → type a name/email → existing formateurs/admins appear → +Ajouter attaches them.
  - ☐ **Créer un nouvel encadrant** → Prénom, Nom, role (Formateur/Administrateur), Type(titre) → "Créer et lier" → creates the user (role saved, Type saved as bio/à propos) and attaches to project. Duplicate name → rejected.
- ☐ **Event** → pick event; **space picker auto-hidden** when scanning the FabLab gate-in QR for a FabLab event; shown for multi-space venue events.
- ☐ **Other** → free text objective.
- ☐ **Validate** → check-in recorded with the chosen objective.
- ☐ **Create project from here** shortcut → jumps to project create, returns to scan.

## A5. Notifications tab
- ☐ List renders with icons per type; unread highlighted; tap marks read.
- ☐ **Contact request** received → Approve / Refuse buttons.
  - Approve → requester gets a **"Coordonnées partagées"** notification, and can now see your contact.
- ☐ **Contact approved** notification (you're the requester) → tap opens the sharer's profile with contact visible.
- ☐ **Project invite** → tap opens the project (My Project); accept via the project banner.
- ☐ **Help request / Review request / Interaction offer / Interaction approved / Feedback request** → each opens its action sheet (approve/reject/rate/complete).
- ☐ Realtime: a notification sent from another device appears **without refresh**.

## A6. Search tab
- ☐ Type a name → results filter (prénom/nom starts-with).
- ☐ Role filter (All / Stagiaire / Formateur / Administrateur / Visiteur) → narrows results.
- ☐ A **formateur created from a project/DB** appears here under the Formateur filter.
- ☐ Tap a result → opens that member's profile.

## A7. My Profile tab (own)
- ☐ Header: avatar, name, role badge, points, comportement rating (stagiaire).
- ☐ **Avatar**: tap to view; **change** → crop modal (pan/zoom) → save; **remove**.
- ☐ **Parcours Académique** (stagiaire): Pôle/Niveau/Filière/Année/Option — **editable in edit mode** (cascading dropdowns), saves.
- ☐ **Identifiants**: CIN, CEF, Email, Tel — editable in edit mode, validation on email/phone.
- ☐ **À propos / bio** editable.
- ☐ **Programmes**: add a program (name, description, image w/ **crop**, date single/range, type, result), **edit** an existing one, remove. Saves to profile.
- ☐ **Modifier le profil / Enregistrer** toggle; **back while editing** → asks "Enregistrer les modifications ?".
- ☐ **Attendance heatmap / presence history** renders.
- ☐ **Settings** (gear): Appearance (theme), Language (FR/EN/AR), **Contact privacy** (Public / Personnalisé / Privé), and (Personnalisé) pick allowed users — **persists to server**.

## A8. Member Profile tab (viewing others)
- ☐ Opens from Search / team / notifications.
- ☐ Header, à propos, parcours, comportement (read-only).
- ☐ **Contact section**: if private → "Demander l'accès" (sends contact request); if allowed/public → contact shown.
- ☐ **Voir les projets** → shows **that member's** projects (loads from server), tap one → project detail.
- ☐ **Reconnaissance** (recognition): rating + comment (+ optional machine/project) → sends; self-recognition blocked; weekly cap per sender.
- ☐ **Signalement** (report): category (disrespect/cooperation/copy) + details → sends.
- ☐ **Proposer de l'aide** / **Aidé sur un de tes projets** interaction flows.

## A9. My Project tab
- ☐ **Project home**: grid of your projects (+ ones you contribute to). Empty state "Aucun projet".
- ☐ **Create project**: title, description, phase, image, SDGs, supervisors → creates.
- ☐ **Delete mode**: select projects → Confirmer → owned projects go to **Recycle bin**; if project has other accepted members, you get the decision prompt.
- ☐ **Project detail**:
  - ☐ Header, description, phase badge, image.
  - ☐ **Invitation banner** (if you were invited) → Accepter / Décliner → **banner disappears and stays gone** (persisted).
  - ☐ **L'Équipe (team)**: founder + contributors with role/badges.
    - ☐ **Add contributor** (ContributorsModal): search user → role (Co-fondateur / Membre-Tuteur / Custom), **grant admin access** toggle → add. Sends a **project_invite** notification. Multi-admin projects require all admins to approve.
    - ☐ **Change a member's role** → pending role change (needs approval/acceptance).
    - ☐ **Remove a member** → removed (to recycle bin as member entry).
    - ☐ A **co-founder/admin** member can edit the project (title, team, etc.) — not just the owner.
  - ☐ **Encadrants (supervisors)**: SupervisorModal — current list (Sara fixed), quick presets, **search existing**, **create new**; add/remove.
  - ☐ **Journals**: create (date, phase, content, image), read, edit, delete (→ recycle bin).
  - ☐ **Phase** change (MOC/POC/MVP/Ready to market).
  - ☐ **SDG** selection.
  - ☐ **Modify project** (title/description/supervisors).
  - ☐ **Ask for review** → creates review request.
- ☐ **Recycle bin**: deleted projects/journals/members listed **once each** (no duplicates); restore / permanently delete.
- ☐ **Articles** (if enabled): home / create / pending.

## A10. Project Review tab
- ☐ Opens from a review request notification.
- ☐ 8 rating criteria (problem solving, technical, functionality, innovation, feasibility, safety, SDG, usability) + feedback → submit → review saved, notification handled.

---

# PART B — ADMIN APP (fablab-cmc)

## B1. Admin login
- ☐ Login overlay: email + password → **Se connecter**. Wrong creds → error.
- ☐ Session persists across reload; if the API session dies → kicked back to login (no "Missing bearer token" zombie dashboard).

## B2. Overview / Dashboard
- ☐ **Metrics**: Présents maintenant, and period-based counts.
- ☐ **Lab status badge**: green **Lab Ouvert** / red **Lab Restreint** — follows real enforced hours (08:30–18:30, weekends/holidays closed).
- ☐ **Period configuration** modal: Now vs Custom Period; Custom → Un jour / Du–Au, and **Heure début/fin default 08:30–18:30** (independent of enforcement hours).
- ☐ **Ajouter une fermeture exceptionnelle**: Motif + **Date** (new) + optional Horaire (from–to; empty = whole day) → **+** adds a closure. Closure appears; delete removes it.
- ☐ Existing exceptions/holidays for the selected date are listed.
- ☐ Navigate to Analyse.

## B3. Users view
- ☐ **User list**: columns (Nom, Prénom, Type, Email, Phone, CIN) — toggle visible columns.
- ☐ **Search** (name starts-with) + **Role filter**.
- ☐ **Add user** (AddUserModal) → creates.
- ☐ **Open a profile** → detail view:
  - ☐ Avatar (upload w/ crop, remove), identity, role badge, deactivated badge.
  - ☐ **À propos (bio)** editable in edit mode (was read-only — now fixed).
  - ☐ Editable fields (Nom, Prénom, Email, Tel, CIN, CEF, and stagiaire academic fields) → **Enregistrer** / Annuler.
  - ☐ **Edit mode does NOT leak** to the next profile you open; closing mid-edit asks to save.
  - ☐ **Comportement** stars (computed, read-only).
  - ☐ **Programmes panel** (stagiaire): view/add/edit programs with **image crop**.
  - ☐ **Interactions panel**: help/review history with peers.
  - ☐ **Projects panel**: the user's projects (team, supervisors, journals, recycle).
  - ☐ **Deactivate / Reactivate** (protected profiles like Sara can't be deactivated).
  - ☐ **Delete** user.

## B4. Projects (admin)
- ☐ Same project management as user app but admin-wide: view any project, edit, team (TeamSection), supervisors (SupervisorSection), journals, phases, SDG, recycle bin.

## B5. Events
- ☐ **Event list** (EventSection). **Create event** (EventForm): title, description, date (single/range), spaces, intervenants → save.
- ☐ **Edit** an event, **Delete** an event.

## B6. QR Codes
- ☐ Generate/display the permanent **Gate-IN / Gate-OUT / Event** QR codes (rendered to canvas).
- ☐ **Download** a QR as image.
- ☐ Saving gate config persists the objective options shown to users at scan.

## B7. Signalements (reports)
- ☐ List of behavior reports; filter by status (nouveau / valide / rejeté).
- ☐ **Valider** a report → applies the comportement penalty to the target; **Rejeter** → no penalty.
- ☐ Only admins can access (a stagiaire is forbidden).

## B8. PV (procès-verbal / présence)
- ☐ Filters: date (single/range), time from/to, role, presence type, event.
- ☐ **Générer** → report table (entries, days, avg rating, rows).
- ☐ **Export Excel** → downloads `fablab_pv_<date>.xlsx` (styled, real data).
- ☐ Weekend date selection is blocked with a toast.

## B9. Analyse
- ☐ Analytics view opens (charts/metrics as built).

---

# PART C — Cross-cutting logic to verify
- ☐ **Realtime (WebSocket)**: changes on one device (new attendance, notification, project change) reflect on another **without refresh**. Verified live through wss://.
- ☐ **Roles/permissions**: a stagiaire can't reach admin-only endpoints (reports inbox, deactivate, etc.).
- ☐ **Comportement score**: computed only from validated recognitions/reports (no manual set); Bayesian prior, weekly cap, decay, double penalty for "vol d'idée".
- ☐ **Duplicate name** blocked everywhere (register, admin create, rename, scan create-encadrant).
- ☐ **Recycle bin dedup**: deleting shows exactly one entry, even across two tabs/devices.
- ☐ **Contact privacy**: server-persisted; approval notifies + reveals; "public" reveals to all.
- ☐ **Lab availability**: weekends, Moroccan holidays, custom closures, and opening hours all enforced on check-in.

---

# Backend coverage note
All 70 automated API tests pass (`cd fablab-api && npm test`), covering every endpoint's create/read/update/delete plus the interaction chain and the full project-team lifecycle. Every frontend `api.*` call maps to a real, responding backend route; both frontend bundles are deployed (live == build); the VM API is current and healthy.
