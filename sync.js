/* Cross-device sync through Firebase Firestore.
   Every device keeps its own full copy (localStorage + Firestore's offline cache),
   so the app works with no connection and catches up when it reconnects.
   Devices share data by joining the same private sync code. */
import { FIREBASE_CONFIG } from "./config.js";

const FB = "https://www.gstatic.com/firebasejs/10.12.2/";
const CODEKEY = "bushido-sync-code";
const App = window.App;
const btn = document.getElementById("syncBtn");
const readCode = () => { try { return localStorage.getItem(CODEKEY) || ""; } catch (e) { return ""; } };
const writeCode = c => { try { c ? localStorage.setItem(CODEKEY, c) : localStorage.removeItem(CODEKEY); } catch (e) {} };
const pretty = c => c.match(/.{1,4}/g).join("-");
const clean = c => (c || "").toUpperCase().replace(/[^A-Z0-9]/g, "");

let fb = null, db = null, code = clean(readCode()), unsubs = [], online = navigator.onLine, lastSynced = null;
const timers = {};

if (btn) btn.hidden = false;
const configured = FIREBASE_CONFIG && FIREBASE_CONFIG.apiKey;

function setStatus() {
  if (!configured) return App.status("Not set up", "off");
  if (!code) return App.status("Off", "off");
  if (!db) return App.status(online ? "Connecting…" : "Offline", "wait");
  if (!online) return App.status("Offline · will sync", "wait");
  App.status("Synced", "ok");
}
window.addEventListener("online", () => { online = true; setStatus(); if (code && !db) connect(); });
window.addEventListener("offline", () => { online = false; setStatus(); });

async function loadFirebase() {
  if (fb) return fb;
  const [app, auth, fs] = await Promise.all([
    import(FB + "firebase-app.js"), import(FB + "firebase-auth.js"), import(FB + "firebase-firestore.js")
  ]);
  const a = app.initializeApp(FIREBASE_CONFIG);
  const firestore = fs.initializeFirestore(a, { localCache: fs.persistentLocalCache({ tabManager: fs.persistentMultipleTabManager() }) });
  fb = { auth: auth.getAuth(a), authMod: auth, fs, firestore };
  return fb;
}

async function connect() {
  if (!configured || !code) return setStatus();
  try {
    const { auth, authMod, fs, firestore } = await loadFirebase();
    if (!auth.currentUser) {
      await new Promise(res => { const off = authMod.onAuthStateChanged(auth, u => { off(); res(u); }); });
      if (!auth.currentUser) await authMod.signInAnonymously(auth);
    }
    db = firestore;
    listen(fs);
    setStatus();
  } catch (err) {
    db = null;
    App.status(online ? "Can't connect" : "Offline", "wait");
    console.warn("Sync connect failed", err);
  }
}

const col = (fs, name) => fs.collection(db, "groups", code, name);

function listen(fs) {
  unsubs.forEach(u => u()); unsubs = [];
  for (const name of ["games", "warbands", "tests"]) {
    let first = true;
    unsubs.push(fs.onSnapshot(col(fs, name), { includeMetadataChanges: true }, snap => {
      const remoteIds = new Set();
      snap.docChanges().forEach(ch => {
        if (ch.doc.metadata.hasPendingWrites) return;
        if (ch.type === "removed") return App.applyRemove(name, ch.doc.id);
        const d = ch.doc.data();
        try { const obj = JSON.parse(d.json); name === "games" ? App.applyGame(obj) : name === "tests" ? App.applyTest(obj) : App.applyWarband(obj); } catch (e) {}
      });
      if (first && !snap.metadata.fromCache) {
        /* On joining, send up anything this device has that the cloud doesn't (or has older) */
        first = false;
        snap.docs.forEach(d => remoteIds.add(d.id));
        const remote = Object.fromEntries(snap.docs.map(d => [d.id, d.data().updated || 0]));
        const local = name === "games" ? App.data().GAMES : name === "tests" ? App.data().TESTS : App.data().WB;
        Object.values(local).forEach(x => { if (!(x.id in remote) || (x.updated || 0) > remote[x.id]) write(name, x); });
      }
      if (!snap.metadata.fromCache) lastSynced = Date.now();
      setStatus();
    }, err => { console.warn(err); App.status("Sync error", "wait"); }));
  }
  let firstLib = true;
  unsubs.push(fs.onSnapshot(fs.doc(db, "groups", code, "meta", "library"), snap => {
    if (snap.metadata.hasPendingWrites) return;
    if (snap.exists()) { try { App.mergeLibrary(JSON.parse(snap.data().json)); } catch (e) {} }
    if (firstLib && !snap.metadata.fromCache) { firstLib = false; pushLibraryNow(); }
  }));
}

function write(name, obj) {
  if (!db) return;
  const { fs } = fb;
  fs.setDoc(fs.doc(db, "groups", code, name, obj.id), { json: JSON.stringify(obj), updated: obj.updated || Date.now() })
    .catch(err => console.warn("Sync write failed", err));
}
function debounced(key, fn, ms = 600) { clearTimeout(timers[key]); timers[key] = setTimeout(fn, ms); }
function pushLibraryNow() {
  if (!db) return;
  const json = JSON.stringify(App.data().LIB);
  if (json.length > 900000) return App.toast("Card library is too large to sync. Your games still sync.");
  const { fs } = fb;
  fs.setDoc(fs.doc(db, "groups", code, "meta", "library"), { json, updated: Date.now() }).catch(err => console.warn(err));
}

window.Sync = {
  pushGame: g => debounced("g" + g.id, () => write("games", g)),
  pushWarband: w => debounced("w" + w.id, () => write("warbands", w)),
  pushTest: t => debounced("t" + t.id, () => write("tests", t), 400),
  pushLibrary: () => debounced("lib", pushLibraryNow, 1500),
  remove: (name, id) => { if (db) fb.fs.deleteDoc(fb.fs.doc(db, "groups", code, name, id)).catch(() => {}); }
};

/* ---------- Sync sheet ---------- */
let leaveArmed = false;
function newCode() {
  const abc = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789", a = new Uint32Array(28);
  crypto.getRandomValues(a);
  return Array.from(a, n => abc[n % abc.length]).join("");
}
function syncSheet(msg) {
  const e = App.esc;
  if (!configured) return App.sheet(`<h3>Sync</h3><p class="sub">Sync isn't set up in this copy of the app yet.</p>`);
  App.sheet(code ? `<h3>Sync</h3>
    <p class="sub">This device shares warbands, games, testing lists and the card library with every device using the same sync code. It works offline and catches up when it's back online.</p>
    <p class="note">Status: <b id="syncStatus2">${e(document.getElementById("syncStatus").textContent)}</b>${lastSynced ? ` · last synced ${new Date(lastSynced).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : ""}</p>
    <h4 class="sheet-h">Your sync code</h4>
    <div class="code-box" id="codeBox">${pretty(code)}</div>
    <div class="row"><button class="btn" data-sync="copy">Copy code</button></div>
    <p class="note">Enter this code on your other devices. Keep it private: anyone with it can see and change your games.</p>
    <p class="note" id="syncNote" role="status">${e(msg || "")}</p>
    <div class="row"><button class="btn ${leaveArmed ? "danger" : "quiet"}" data-sync="leave">${leaveArmed ? "Stop syncing on this device?" : "Stop syncing on this device"}</button></div>`
  : `<h3>Sync</h3>
    <p class="sub">Share warbands, games and the card library between your devices.</p>
    <h4 class="sheet-h">First device</h4>
    <div class="row"><button class="btn primary" data-sync="create">Create a sync code</button></div>
    <h4 class="sheet-h">Other devices</h4>
    <form class="opp-add" id="syncJoin"><input id="syncCodeIn" placeholder="Enter sync code" autocomplete="off" autocapitalize="characters" aria-label="Sync code"><button type="submit">Join</button></form>
    <p class="note" id="syncNote" role="status">${e(msg || "Joining merges this device's warbands and games with the others. Nothing is deleted.")}</p>`);
}
function join(c) {
  code = c; writeCode(c); leaveArmed = false;
  connect().then(() => syncSheet(online ? "Connected. Your warbands and games are being merged." : "Saved. It will connect when this device is online."));
}
document.addEventListener("click", ev => {
  const t = ev.target.closest("button"); if (!t) return;
  if (t.id === "syncBtn") { leaveArmed = false; return syncSheet(); }
  const act = t.dataset.sync; if (!act) return;
  if (act === "create") return join(newCode());
  if (act === "copy") {
    const note = document.getElementById("syncNote");
    try { navigator.clipboard.writeText(pretty(code)).then(() => note.textContent = "Code copied.", () => note.textContent = "Couldn't copy. Write the code down instead."); } catch (e) { note.textContent = "Couldn't copy. Write the code down instead."; }
    return;
  }
  if (act === "leave") {
    if (!leaveArmed) { leaveArmed = true; return syncSheet(); }
    unsubs.forEach(u => u()); unsubs = []; db = null; code = ""; writeCode(""); leaveArmed = false;
    setStatus(); return syncSheet("This device has stopped syncing. Its own copy of everything is kept.");
  }
});
document.addEventListener("submit", ev => {
  if (ev.target.id !== "syncJoin") return;
  ev.preventDefault();
  const c = clean(document.getElementById("syncCodeIn").value);
  if (c.length < 24) { document.getElementById("syncNote").textContent = "That code is too short. It should be 28 letters and numbers."; return; }
  join(c);
});

setStatus();
connect();
/* If the first attempt failed (patchy signal), keep trying quietly */
setInterval(() => { if (code && !db && navigator.onLine) connect(); }, 30000);
document.addEventListener("visibilitychange", () => { if (!document.hidden && code && !db && navigator.onLine) connect(); });
