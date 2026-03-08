// src/pages/TeamTracker.jsx
// npm install firebase recharts

import { useState, useEffect } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell
} from "recharts";
import { db } from "../firebaseConfig";
import { doc, setDoc, onSnapshot } from "firebase/firestore";

const FIRESTORE_DOC = "tracker/state";
const MAX_TASKS = 10;

const INITIAL_MEMBERS = [
  { id: 1, name: "Annu Tiwari", role: "Lead",         avatar: "AT" },
  { id: 2, name: "Sanjeev",     role: "Hardware",      avatar: "SJ" },
  { id: 3, name: "Archi",       role: "Frontend",      avatar: "AR" },
  { id: 4, name: "Asmi",        role: "ML / Dataset",  avatar: "AS" },
  { id: 5, name: "Kiran",       role: "Speech System", avatar: "KI" },
];

const defaultState = () => ({
  members: INITIAL_MEMBERS.map(m => ({ ...m, points: 0, history: [], tasks: [] })),
  taskIdCounter: 1,
});

const now     = () => new Date().toISOString();
const fmt     = (iso) => new Date(iso).toLocaleDateString("en-IN", { day:"2-digit", month:"short" });
const fmtFull = (iso) => new Date(iso).toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" });
const isPast  = (d)   => new Date(d) < new Date();
const getRef  = ()    => { const [c,d] = FIRESTORE_DOC.split("/"); return doc(db,c,d); };

const COLORS  = ["#2563EB","#0891B2","#7C3AED","#059669","#DC2626"];
const LCOLORS = ["#EFF6FF","#ECFEFF","#F5F3FF","#ECFDF5","#FEF2F2"];
const RANKS   = ["🥇","🥈","🥉","④","⑤"];

/* ─────────────────────────────── CSS ─────────────────────────────── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800&family=Fira+Code:wght@400;500&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { -webkit-text-size-adjust: 100%; }
html, body, #root { background: #F1F5F9 !important; width: 100%; min-height: 100vh; }

::-webkit-scrollbar { width: 5px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 99px; }

.btn { cursor: pointer; border: none; outline: none; transition: all 0.15s ease; font-family:'Nunito',sans-serif; }
.btn:active { transform: scale(0.97); }

/* ── Shell ── */
.app-shell { display: flex; min-height: 100vh; width: 100%; }

/* ── Sidebar ── */
.sidebar {
  width: 248px; flex-shrink: 0; background: #1E3A8A;
  position: fixed; top: 0; left: 0; bottom: 0;
  display: flex; flex-direction: column;
  z-index: 60; box-shadow: 4px 0 24px rgba(30,58,138,0.15);
  transition: transform 0.3s ease;
}
.sidebar.open { transform: translateX(0) !important; }
.sb-logo    { padding: 22px 20px 16px; border-bottom: 1px solid rgba(255,255,255,0.08); }
.sb-nav     { padding: 8px 12px; flex: 1; overflow-y: auto; }
.sb-section { font-size: 10px; color: rgba(255,255,255,0.3); letter-spacing:.1em;
              text-transform: uppercase; padding: 14px 14px 6px;
              font-family: 'Fira Code', monospace; }
.nav-btn {
  display: flex; align-items: center; gap: 12px; width: 100%;
  padding: 11px 14px; border-radius: 10px; font-family: 'Nunito', sans-serif;
  font-size: 14px; font-weight: 600; color: rgba(255,255,255,0.55);
  background: none; border: none; cursor: pointer; text-align: left;
  transition: all 0.15s ease; margin-bottom: 2px;
}
.nav-btn:hover  { background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.85); }
.nav-btn.active { background: rgba(255,255,255,0.18); color: #fff; }
.nav-btn .ico   { font-size: 17px; width: 22px; text-align: center; flex-shrink: 0; }
.sb-footer { padding: 14px 20px; border-top: 1px solid rgba(255,255,255,0.08); }

/* ── Sidebar overlay (mobile) ── */
.sb-backdrop {
  display: none; position: fixed; inset: 0;
  background: rgba(15,23,42,0.5); z-index: 55;
}
.sb-backdrop.show { display: block; }

/* ── Main ── */
.main-wrap { margin-left: 248px; flex: 1; min-height: 100vh; display: flex; flex-direction: column; }
.topbar {
  background: #fff; border-bottom: 1px solid #E2E8F0;
  padding: 0 24px; height: 62px;
  display: flex; align-items: center; justify-content: space-between;
  position: sticky; top: 0; z-index: 40;
}
.page { padding: 24px 24px 40px; flex: 1; }

/* ── Cards ── */
.card      { background: #fff; border: 1px solid #E2E8F0; border-radius: 14px; width: 100%; }
.card-blue { background: linear-gradient(135deg,#1E3A8A 0%,#2563EB 100%); border:none; border-radius:14px; }
.stat-card { background: #fff; border: 1px solid #E2E8F0; border-radius: 12px; padding: 18px 20px; }

/* ── Tags ── */
.tag      { padding: 3px 9px; border-radius: 20px; font-size: 11px; font-weight: 700;
            white-space: nowrap; font-family: 'Fira Code', monospace; }
.tag-done { background: #DCFCE7; color: #15803D; }
.tag-miss { background: #FEE2E2; color: #B91C1C; }
.tag-pend { background: #FEF9C3; color: #A16207; }
.tag-late { background: #FFEDD5; color: #C2410C; }
.tag-collab { background: #EDE9FE; color: #6D28D9; }

/* ── Inputs ── */
input, textarea, select {
  background: #F8FAFC; border: 1.5px solid #E2E8F0; color: #1E293B;
  border-radius: 10px; padding: 11px 14px; font-family: 'Nunito', sans-serif;
  font-size: 14px; font-weight: 500; width: 100%; outline: none;
  transition: border 0.2s, box-shadow 0.2s; -webkit-appearance: none; appearance: none;
}
input:focus, textarea:focus, select:focus {
  border-color: #2563EB; background: #fff;
  box-shadow: 0 0 0 3px rgba(37,99,235,0.12);
}
select option { background: #fff; color: #1E293B; }
input[type="date"]::-webkit-calendar-picker-indicator { opacity: 0.5; }

/* ── Modal ── */
.overlay {
  position: fixed; inset: 0; background: rgba(15,23,42,0.55);
  backdrop-filter: blur(4px); display: flex; align-items: flex-end;
  justify-content: center; z-index: 200; padding: 0;
}
.modal {
  background: #fff; border-radius: 20px 20px 0 0; padding: 24px 20px 36px;
  width: 100%; max-height: 92vh; overflow-y: auto;
  box-shadow: 0 -8px 40px rgba(0,0,0,0.15);
  animation: slideUp 0.25s ease forwards;
}
@keyframes slideUp { from{transform:translateY(100%)} to{transform:translateY(0)} }
@media(min-width:600px) {
  .overlay { align-items: center; padding: 20px; }
  .modal   { border-radius: 16px; max-width: 500px; padding: 28px; animation: fadeIn 0.2s ease; }
}
@keyframes fadeIn { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
.modal-handle { width: 40px; height: 4px; background: #E2E8F0; border-radius: 99px; margin: 0 auto 20px; }

/* ── Buttons ── */
.btn-blue  { background: #2563EB; color: #fff; border-radius: 10px; padding: 12px 20px;
             font-size: 14px; font-weight: 700; border: none; cursor: pointer; transition: all .18s; }
.btn-blue:hover { background: #1D4ED8; }
.btn-ghost { background: #F1F5F9; color: #64748B; border-radius: 10px; padding: 12px 20px;
             font-size: 14px; font-weight: 600; border: none; cursor: pointer; transition: all .18s; }
.btn-ghost:hover { background: #E2E8F0; }
.btn-green { background: #DCFCE7; color: #15803D; border: 1px solid #BBF7D0;
             border-radius: 8px; padding: 6px 12px; font-size: 13px;
             font-weight: 700; cursor: pointer; transition: all .15s; }
.btn-green:hover { background: #BBF7D0; }
.btn-red   { background: #FEE2E2; color: #B91C1C; border: 1px solid #FECACA;
             border-radius: 8px; padding: 6px 12px; font-size: 13px;
             font-weight: 700; cursor: pointer; transition: all .15s; }
.btn-red:hover { background: #FECACA; }
.icon-btn  { background: none; border: none; cursor: pointer; padding: 6px; border-radius: 8px;
             color: #94A3B8; transition: all .15s; }
.icon-btn:hover { background: #F1F5F9; color: #475569; }

/* ── Rows ── */
.trow { border-bottom: 1px solid #F1F5F9; transition: background .1s; }
.trow:hover { background: #FAFBFC; }
.trow:last-child { border-bottom: none; }
.clickrow { cursor: pointer; }

/* ── Progress bar ── */
.pbar-bg { background: #F1F5F9; border-radius: 99px; height: 5px; overflow: hidden; }
.pbar    { height: 100%; border-radius: 99px; transition: width .8s ease; }

/* ── Live badge ── */
.live-badge { display:inline-flex;align-items:center;gap:5px;background:#DCFCE7;
              color:#15803D;border-radius:20px;padding:3px 10px;
              font-size:12px;font-weight:700;font-family:'Nunito'; }
.live-dot   { width:6px;height:6px;border-radius:50%;background:#22C55E;animation:livep 2s infinite; }
@keyframes livep { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.4;transform:scale(.7)} }

/* ── Loading ── */
.ldot { width:9px;height:9px;border-radius:50%;background:#2563EB;animation:ld 1.2s ease-in-out infinite; }
.ldot:nth-child(2){animation-delay:.2s} .ldot:nth-child(3){animation-delay:.4s}
@keyframes ld{0%,80%,100%{transform:scale(.55);opacity:.25}40%{transform:scale(1);opacity:1}}

/* ── Animation ── */
@keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
.fi{animation:fadeUp 0.22s ease forwards}

/* ── Grids ── */
.g2 { display:grid;grid-template-columns:1fr 1fr;gap:12px; }
.g4 { display:grid;grid-template-columns:repeat(4,1fr);gap:12px; }
.g5 { display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:12px; }

/* ── Typography ── */
.sec { font-weight:800;font-size:15px;color:#1E293B;margin-bottom:14px; }
.lbl { font-size:13px;color:#64748B;font-weight:600;margin-bottom:6px; }

/* ── Help preview box ── */
.help-preview {
  background: #EDE9FE; border: 1px solid #C4B5FD; border-radius: 10px;
  padding: 12px 14px; margin-top: 10px;
}

/* ── Bottom nav (mobile only) ── */
.bnav {
  display: none; position: fixed; bottom: 0; left: 0; right: 0;
  background: #1E3A8A; z-index: 50;
  padding-bottom: env(safe-area-inset-bottom, 0px);
  border-top: 1px solid rgba(255,255,255,0.08);
}
.bni {
  flex: 1; display: flex; flex-direction: column; align-items: center;
  justify-content: center; padding: 10px 4px 8px; gap: 3px;
  cursor: pointer; border: none; background: none; outline: none;
}
.bni-label { font-size: 10px; font-family:'Nunito',sans-serif; font-weight:600; }

/* ══════════════ RESPONSIVE ══════════════ */
@media(max-width:900px) {
  /* Hide sidebar by default on mobile, slide in when .open */
  .sidebar    { transform: translateX(-100%); }
  .main-wrap  { margin-left: 0; }
  .desk-only  { display: none !important; }
  .page       { padding: 14px 14px 82px; }
  .bnav       { display: flex; }
  .g4         { grid-template-columns: 1fr 1fr; }
  .topbar     { padding: 0 16px; height: 56px; }
}
@media(min-width:901px) {
  .mob-only   { display: none !important; }
  .sidebar    { transform: translateX(0) !important; }
}
@media(max-width:500px) {
  .g4         { grid-template-columns: 1fr 1fr; }
  .g2         { grid-template-columns: 1fr 1fr; }
  .page       { padding: 12px 12px 82px; }
  .trow-actions { flex-direction: column; align-items: flex-start !important; gap: 8px !important; }
  .task-btns  { display: flex; gap: 6px; }
}
`;

/* ── Avatar ── */
function Av({ label, color, light, size=38, fs=13 }) {
  return (
    <div style={{
      width:size, height:size, borderRadius:"50%",
      background: light || color+"20", border:`2px solid ${color}30`,
      display:"flex", alignItems:"center", justifyContent:"center",
      fontSize:fs, fontWeight:800, color, flexShrink:0,
      fontFamily:"'Nunito',sans-serif",
    }}>{label}</div>
  );
}

/* ══════════════ MAIN COMPONENT ══════════════ */
export default function TeamTracker() {
  const [state,   setState]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [view,    setView]    = useState("dashboard");
  const [sel,     setSel]     = useState(null);
  const [modal,   setModal]   = useState(null);
  const [skip,    setSkip]    = useState(false);
  const [sideOpen,setSideOpen]= useState(false);

  // Task form
  const [tf, setTf] = useState({ title:"", desc:"", assignee:"", deadline:"", points:10 });
  // Help form — helper = who helped, needer = who asked for help
  // Auto-picks the needer's most recently created pending task
  const [hf, setHf] = useState({ helper:"", needer:"" });

  /* Firebase */
  useEffect(() => {
    const ref = getRef();
    const unsub = onSnapshot(ref, snap => {
      if (snap.exists()) { setSkip(true); setState(snap.data()); }
      else { const i = defaultState(); setDoc(ref,i); setState(i); }
      setLoading(false);
    }, e => { console.error(e); setState(defaultState()); setLoading(false); });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!state || loading) return;
    if (skip) { setSkip(false); return; }
    setSaving(true);
    const t = setTimeout(async () => {
      try { await setDoc(getRef(), state); } catch(e) { console.error(e); }
      setSaving(false);
    }, 700);
    return () => clearTimeout(t);
  }, [state]);

  const upd  = fn => setState(prev => { const n = JSON.parse(JSON.stringify(prev)); fn(n); return n; });
  const getM = id => state?.members.find(m => m.id === id);

  /* ── Actions ── */
  const addTask = () => {
    if (!tf.title || !tf.assignee || !tf.deadline) return;
    const member = state.members.find(m => m.id === Number(tf.assignee));
    if (member?.tasks.filter(t => t.status==="pending").length >= MAX_TASKS) return;
    upd(s => {
      const m = s.members.find(m => m.id===Number(tf.assignee));
      m.tasks.push({
        id: s.taskIdCounter++, title: tf.title, desc: tf.desc,
        deadline: tf.deadline, points: Number(tf.points),
        status: "pending", createdAt: now(),
      });
    });
    setTf({ title:"", desc:"", assignee:"", deadline:"", points:10 });
    setModal(null);
  };

  const doneTask = (mid, tid) => upd(s => {
    const m = s.members.find(m => m.id===mid);
    const t = m.tasks.find(t => t.id===tid);
    if (t.status !== "pending") return;
    t.status = "done"; t.completedAt = now();
    m.points += t.points;
    m.history.push({
      date: fmt(now()), fullDate: fmtFull(now()),
      points: m.points, earned: t.points,
      task: t.title, type: "done",
    });
  });

  const missTask = (mid, tid) => upd(s => {
    const m = s.members.find(m => m.id===mid);
    const t = m.tasks.find(t => t.id===tid);
    if (t.status !== "pending") return;
    t.status = "missed"; t.missedAt = now();
    m.history.push({
      date: fmt(now()), fullDate: fmtFull(now()),
      points: m.points, earned: 0,
      task: t.title, type: "missed",
    });
  });

  /*
   * Log Help logic:
   * - Select who helped and who asked for help
   * - Auto-picks the needer's CURRENT active task (most recently created pending task)
   * - Task's total points split 50/50 (Math.floor) between both
   * - Task marked as done (collab), both get their share in history
   */
  const addHelp = () => {
    const helperId = Number(hf.helper);
    const neederId = Number(hf.needer);
    if (!helperId || !neederId || helperId===neederId) return;

    upd(s => {
      const helper = s.members.find(m => m.id===helperId);
      const needer = s.members.find(m => m.id===neederId);

      // Auto-pick: most recently created pending task of needer
      const pendingTasks = needer.tasks.filter(t => t.status==="pending");
      if (pendingTasks.length === 0) return;
      const task = pendingTasks[pendingTasks.length - 1]; // last = most recent

      const half    = Math.floor(task.points / 2);
      const dateStr = fmt(now());
      const fullD   = fmtFull(now());

      // Mark task as collaboratively done
      task.status      = "done";
      task.completedAt = now();
      task.collab      = true;
      task.helperId    = helperId;

      // Needer gets their half
      needer.points += half;
      needer.history.push({
        date: dateStr, fullDate: fullD,
        points: needer.points, earned: half,
        task: task.title, type: "collab",
        with: helper.name, role: "needer",
        note: `🤝 "${task.title}" completed with help from ${helper.name} (+${half} pts)`,
      });

      // Helper gets their half
      helper.points += half;
      helper.history.push({
        date: dateStr, fullDate: fullD,
        points: helper.points, earned: half,
        task: task.title, type: "collab",
        with: needer.name, role: "helper",
        note: `🤝 Helped ${needer.name} with "${task.title}" (+${half} pts)`,
      });
    });

    setHf({ helper:"", needer:"" });
    setModal(null);
  };

  const goM = id => { setSel(id); setView("member"); setSideOpen(false); };
  const goV = v  => { setView(v); if (v!=="member") setSel(null); setSideOpen(false); };

  /* Loading */
  if (loading || !state) return (
    <div style={{ background:"#F1F5F9", minHeight:"100vh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:20 }}>
      <style>{CSS}</style>
      <div style={{ fontFamily:"'Nunito',sans-serif", fontWeight:800, fontSize:24, color:"#1E3A8A" }}>
        INORA <span style={{ color:"#2563EB" }}>Team</span>
      </div>
      <div style={{ display:"flex", gap:8 }}><div className="ldot"/><div className="ldot"/><div className="ldot"/></div>
      <div style={{ fontSize:13, color:"#94A3B8", fontFamily:"Nunito,sans-serif", fontWeight:600 }}>Connecting to Firebase…</div>
    </div>
  );

  const sorted  = [...state.members].sort((a,b) => b.points - a.points);
  const maxP    = Math.max(...state.members.map(m => m.points), 1);
  const totalDone = state.members.reduce((a,m) => a + m.tasks.filter(t=>t.status==="done").length, 0);
  const totalTask = state.members.reduce((a,m) => a + m.tasks.length, 0);

  const NAV = [
    { id:"dashboard",    label:"Dashboard",   ico:"📊" },
    { id:"tasks",        label:"Tasks",        ico:"✅" },
    { id:"history",      label:"History",      ico:"📋" },
    { id:"leaderboard",  label:"Leaderboard",  ico:"🏆" },
  ];

  // Help modal computed values
  const helperMember  = hf.helper ? getM(Number(hf.helper)) : null;
  const neederMember  = hf.needer ? getM(Number(hf.needer)) : null;
  const neederPending = neederMember?.tasks.filter(t=>t.status==="pending") || [];
  // Auto-pick: most recently created pending task
  const autoTask      = neederPending.length > 0 ? neederPending[neederPending.length - 1] : null;
  const halfPoints    = autoTask ? Math.floor(autoTask.points / 2) : 0;
  const canLogHelp    = helperMember && neederMember && autoTask;

  /* ── Task Row ── */
  const TaskRow = ({ t, m, showMember=false }) => {
    const ov = isPast(t.deadline) && t.status==="pending";
    const mi = state.members.findIndex(x => x.id===m.id);
    return (
      <div className="trow" style={{ padding:"14px 16px" }}>
        <div className="trow-actions" style={{ display:"flex", alignItems:"flex-start", gap:12 }}>
          {showMember && (
            <Av label={m.avatar} color={COLORS[mi%COLORS.length]} light={LCOLORS[mi%LCOLORS.length]} size={30} fs={10}/>
          )}
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:4, flexWrap:"wrap" }}>
              <span style={{ fontSize:14, fontWeight:700, color:"#1E293B" }}>{t.title}</span>
              {t.status==="done" && !t.collab && <span className="tag tag-done">✓ Done</span>}
              {t.status==="done" && t.collab  && <span className="tag tag-collab">🤝 Collab</span>}
              {t.status==="missed"             && <span className="tag tag-miss">✗ Missed</span>}
              {t.status==="pending" && !ov     && <span className="tag tag-pend">Pending</span>}
              {t.status==="pending" && ov      && <span className="tag tag-late">Overdue</span>}
            </div>
            {showMember && <div style={{ fontSize:12, color:"#94A3B8", marginBottom:3 }}>{m.name} · {m.role}</div>}
            {t.desc && <div style={{ fontSize:13, color:"#64748B", marginBottom:4 }}>{t.desc}</div>}
            <div style={{ fontSize:12, color:"#94A3B8", fontFamily:"Fira Code,monospace" }}>
              Due <span style={{ color: ov&&t.status==="pending"?"#DC2626":"#64748B", fontWeight:500 }}>{fmt(t.deadline)}</span>
              <span style={{ marginLeft:10, color:"#2563EB", fontWeight:600 }}>+{t.points} pts</span>
              {t.collab && <span style={{ marginLeft:8, color:"#7C3AED", fontWeight:600 }}>({Math.floor(t.points/2)} each)</span>}
            </div>
          </div>
          {t.status==="pending" && (
            <div className="task-btns" style={{ display:"flex", gap:6, flexShrink:0 }}>
              <button className="btn-green btn" onClick={()=>doneTask(m.id,t.id)}>✓</button>
              <button className="btn-red   btn" onClick={()=>missTask(m.id,t.id)}>✗</button>
            </div>
          )}
        </div>
      </div>
    );
  };

  /* ── View title ── */
  const pageTitle = {
    dashboard:"Dashboard", tasks:"Tasks",
    history:"History", leaderboard:"Leaderboard",
    member: sel ? getM(sel)?.name : "Member",
  }[view] || "Dashboard";

  return (
    <div className="app-shell" style={{ fontFamily:"'Nunito',sans-serif" }}>
      <style>{CSS}</style>

      {/* Mobile sidebar backdrop */}
      <div className={`sb-backdrop${sideOpen?" show":""}`} onClick={()=>setSideOpen(false)}/>

      {/* ═══════════ SIDEBAR ═══════════ */}
      <aside className={`sidebar${sideOpen?" open":""}`}>
        <div className="sb-logo">
          <div style={{ fontWeight:800, fontSize:19, color:"#fff", letterSpacing:"-0.02em" }}>
            INORA <span style={{ color:"#60A5FA" }}>·</span> Team
          </div>
          <div style={{ fontSize:11, color:"rgba(255,255,255,0.3)", marginTop:2, fontFamily:"Fira Code,monospace" }}>
            accountability tracker
          </div>
        </div>

        <div className="sb-nav">
          <div className="sb-section">Menu</div>
          {NAV.map(n => (
            <button key={n.id}
              className={`nav-btn${view===n.id||(view==="member"&&n.id==="leaderboard")?" active":""}`}
              onClick={()=>goV(n.id)}>
              <span className="ico">{n.ico}</span>{n.label}
            </button>
          ))}
          <div className="sb-section" style={{ marginTop:8 }}>Actions</div>
          <button className="nav-btn" onClick={()=>{setModal("task");setSideOpen(false);}}>
            <span className="ico">➕</span>Assign Task
          </button>
          <button className="nav-btn" onClick={()=>{setModal("help");setSideOpen(false);}}>
            <span className="ico">🤝</span>Log Help
          </button>
        </div>

        <div className="sb-footer">
          {saving
            ? <div style={{ fontSize:11, color:"rgba(255,255,255,0.3)", fontFamily:"Fira Code,monospace" }}>syncing…</div>
            : <div className="live-badge"><div className="live-dot"/>Live</div>
          }
        </div>
      </aside>

      {/* ═══════════ MAIN ═══════════ */}
      <div className="main-wrap">

        {/* Topbar */}
        <header className="topbar">
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            {/* Hamburger — mobile only */}
            <button className="mob-only icon-btn btn" onClick={()=>setSideOpen(v=>!v)} style={{ fontSize:20, padding:"6px 8px" }}>☰</button>
            <div>
              <div style={{ fontWeight:800, fontSize:17, color:"#1E293B" }}>{pageTitle}</div>
              <div style={{ fontSize:11, color:"#94A3B8", fontFamily:"Fira Code,monospace" }}>
                {new Date().toLocaleDateString("en-IN",{weekday:"short",day:"numeric",month:"short",year:"numeric"})}
              </div>
            </div>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <button className="btn btn-ghost desk-only" onClick={()=>setModal("task")} style={{ fontSize:13, padding:"8px 14px" }}>+ Task</button>
            <button className="btn btn-blue  desk-only" onClick={()=>setModal("help")} style={{ fontSize:13, padding:"8px 14px" }}>🤝 Help</button>
            {saving && <div style={{ fontSize:11, color:"#94A3B8", alignSelf:"center", fontFamily:"Fira Code,monospace" }}>saving…</div>}
          </div>
        </header>

        {/* Page content */}
        <main className="page fi" key={view}>

          {/* ═══ DASHBOARD ═══ */}
          {view==="dashboard" && (
            <div>
              <div className="g4" style={{ marginBottom:20 }}>
                {[
                  ["Members",   state.members.length,  "#2563EB"],
                  ["Assigned",  totalTask,              "#0891B2"],
                  ["Done",      totalDone,              "#059669"],
                  ["Top Score", `${sorted[0]?.points??0}`, "#7C3AED"],
                ].map(([label,val,color])=>(
                  <div key={label} className="stat-card">
                    <div style={{ fontSize:10, color:"#94A3B8", fontFamily:"Fira Code,monospace", marginBottom:6, textTransform:"uppercase", letterSpacing:".06em" }}>{label}</div>
                    <div style={{ fontSize:26, fontWeight:800, color }}>{val}</div>
                    {label==="Top Score" && <div style={{ fontSize:11, color:"#64748B", marginTop:3 }}>{sorted[0]?.name}</div>}
                  </div>
                ))}
              </div>

              <div className="card" style={{ padding:"20px 14px 12px", marginBottom:20 }}>
                <div className="sec">Points Overview</div>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={sorted} barSize={34}>
                    <XAxis dataKey="name" tick={{ fill:"#94A3B8", fontSize:11, fontFamily:"Nunito" }} axisLine={false} tickLine={false}/>
                    <YAxis hide/>
                    <Tooltip contentStyle={{ background:"#fff", border:"1px solid #E2E8F0", borderRadius:10, fontFamily:"Nunito", fontSize:13, boxShadow:"0 4px 20px rgba(0,0,0,0.1)" }} labelStyle={{ color:"#1E293B", fontWeight:700 }} itemStyle={{ color:"#2563EB" }}/>
                    <Bar dataKey="points" radius={[6,6,0,0]}>
                      {sorted.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="sec">Team Members</div>
              <div className="g5">
                {state.members.map((m,i)=>{
                  const pend = m.tasks.filter(t=>t.status==="pending");
                  const ovd  = pend.filter(t=>isPast(t.deadline));
                  const dn   = m.tasks.filter(t=>t.status==="done");
                  const ms   = m.tasks.filter(t=>t.status==="missed");
                  return (
                    <div key={m.id} className="card btn clickrow"
                      style={{ padding:16, borderWidth:ovd.length>0?"2px":"1px", borderColor:ovd.length>0?"#FECACA":"#E2E8F0" }}
                      onClick={()=>goM(m.id)}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
                        <Av label={m.avatar} color={COLORS[i%COLORS.length]} light={LCOLORS[i%LCOLORS.length]} size={40} fs={13}/>
                        <div style={{ textAlign:"right" }}>
                          <div style={{ fontWeight:800, fontSize:20, color:COLORS[i%COLORS.length] }}>{m.points}</div>
                          <div style={{ fontSize:10, color:"#94A3B8" }}>pts</div>
                        </div>
                      </div>
                      <div style={{ fontWeight:800, fontSize:15, color:"#1E293B", marginBottom:2 }}>{m.name}</div>
                      <div style={{ fontSize:12, color:"#94A3B8", marginBottom:10 }}>{m.role}</div>
                      <div className="pbar-bg"><div className="pbar" style={{ width:`${(m.points/maxP)*100}%`, background:COLORS[i%COLORS.length] }}/></div>
                      <div style={{ display:"flex", gap:8, marginTop:8, fontSize:12, fontWeight:600 }}>
                        <span style={{ color:"#15803D" }}>{dn.length}✓</span>
                        <span style={{ color:"#CBD5E1" }}>·</span>
                        <span style={{ color:"#A16207" }}>{pend.length} open</span>
                        {ms.length>0&&<><span style={{ color:"#CBD5E1" }}>·</span><span style={{ color:"#B91C1C" }}>{ms.length}✗</span></>}
                      </div>
                      {ovd.length>0&&<div style={{ marginTop:8,fontSize:11,color:"#B91C1C",fontWeight:700,background:"#FEF2F2",borderRadius:6,padding:"3px 8px",display:"inline-block" }}>⚠ {ovd.length} overdue</div>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ═══ TASKS ═══ */}
          {view==="tasks" && (
            <div>
              {state.members.map((m,mi)=>{
                if (m.tasks.length===0) return null;
                const pending  = m.tasks.filter(t=>t.status==="pending");
                const atLimit  = pending.length >= MAX_TASKS;
                return (
                  <div key={m.id} style={{ marginBottom:22 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
                      <Av label={m.avatar} color={COLORS[mi%COLORS.length]} light={LCOLORS[mi%LCOLORS.length]} size={32} fs={11}/>
                      <div style={{ flex:1 }}>
                        <div style={{ fontWeight:800, fontSize:14, color:"#1E293B" }}>{m.name}</div>
                        <div style={{ fontSize:12, color:"#94A3B8" }}>{m.role}</div>
                      </div>
                      <div style={{ fontSize:12, fontWeight:700, color:atLimit?"#DC2626":"#94A3B8" }}>
                        {pending.length}/{MAX_TASKS}{atLimit&&" LIMIT"}
                      </div>
                    </div>
                    <div className="card" style={{ overflow:"hidden" }}>
                      {m.tasks.map(t=><TaskRow key={t.id} t={t} m={m}/>)}
                    </div>
                  </div>
                );
              })}
              {state.members.every(m=>m.tasks.length===0)&&(
                <div className="card" style={{ padding:52, textAlign:"center" }}>
                  <div style={{ fontSize:40, marginBottom:14 }}>📋</div>
                  <div style={{ fontWeight:800, fontSize:16, color:"#1E293B", marginBottom:6 }}>No tasks yet</div>
                  <div style={{ fontSize:14, color:"#94A3B8", marginBottom:20 }}>Assign tasks to your team to get started</div>
                  <button className="btn btn-blue" onClick={()=>setModal("task")}>+ Assign First Task</button>
                </div>
              )}
            </div>
          )}

          {/* ═══ HISTORY ═══ */}
          {view==="history" && (
            <div>
              <div className="sec">Member Summary</div>
              <div className="g4" style={{ marginBottom:24 }}>
                {state.members.map((m,i)=>{
                  const doneH = m.history.filter(h=>h.type==="done"||h.type==="collab");
                  return (
                    <div key={m.id} className="stat-card btn clickrow" onClick={()=>goM(m.id)}>
                      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
                        <Av label={m.avatar} color={COLORS[i%COLORS.length]} light={LCOLORS[i%LCOLORS.length]} size={32} fs={11}/>
                        <div>
                          <div style={{ fontWeight:800, fontSize:13, color:"#1E293B" }}>{m.name}</div>
                          <div style={{ fontSize:11, color:"#94A3B8" }}>{m.role}</div>
                        </div>
                      </div>
                      <div style={{ fontWeight:800, fontSize:24, color:COLORS[i%COLORS.length] }}>
                        {m.points} <span style={{ fontSize:12, fontWeight:500, color:"#94A3B8" }}>pts</span>
                      </div>
                      <div style={{ fontSize:12, color:"#64748B", marginTop:3 }}>{doneH.length} completed</div>
                    </div>
                  );
                })}
              </div>

              <div className="sec">Activity Log</div>
              <div className="card" style={{ overflow:"hidden" }}>
                {state.members.every(m=>m.history.length===0)&&(
                  <div style={{ padding:44, textAlign:"center", color:"#94A3B8", fontSize:14, fontWeight:600 }}>
                    No activity yet. Complete tasks to see history.
                  </div>
                )}
                {[...state.members.flatMap((m,mi)=>m.history.map(h=>({...h,member:m,mi})))]
                  .reverse()
                  .map((h,hi)=>(
                    <div key={hi} className="trow" style={{ padding:"13px 16px", display:"flex", alignItems:"center", gap:12 }}>
                      <div style={{ width:36, height:36, borderRadius:"50%", flexShrink:0,
                        background: h.type==="done"?"#DCFCE7":h.type==="missed"?"#FEE2E2":h.type==="collab"?"#EDE9FE":"#F0FDF4",
                        display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>
                        {h.type==="done"?"✅":h.type==="missed"?"❌":h.type==="collab"?"🤝":"⭐"}
                      </div>
                      <Av label={h.member.avatar} color={COLORS[h.mi%COLORS.length]} light={LCOLORS[h.mi%LCOLORS.length]} size={32} fs={11}/>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontWeight:700, fontSize:13, color:"#1E293B" }}>{h.member.name}</div>
                        <div style={{ fontSize:12, color:"#64748B", marginTop:1 }}>
                          {h.type==="done"   && `Completed "${h.task}"`}
                          {h.type==="missed" && `Missed "${h.task}"`}
                          {h.type==="collab" && (h.note || `Collab on "${h.task}"`)}
                        </div>
                      </div>
                      <div style={{ textAlign:"right", flexShrink:0 }}>
                        {h.earned>0  && <div style={{ fontWeight:800, fontSize:15, color:"#2563EB" }}>+{h.earned}</div>}
                        {h.type==="missed" && <div style={{ fontWeight:600, fontSize:14, color:"#DC2626" }}>—</div>}
                        <div style={{ fontSize:10, color:"#94A3B8", fontFamily:"Fira Code,monospace", marginTop:1 }}>{h.fullDate||h.date}</div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* ═══ LEADERBOARD ═══ */}
          {view==="leaderboard" && (
            <div>
              {/* Podium */}
              <div style={{ display:"flex", justifyContent:"center", alignItems:"flex-end", gap:10, marginBottom:24, padding:"10px 0 0" }}>
                {[sorted[1],sorted[0],sorted[2]].filter(Boolean).map((m,pi)=>{
                  const heights=[110,150,90], sizes=[42,56,38];
                  const podRanks=["🥈","🥇","🥉"];
                  const mi=state.members.findIndex(x=>x.id===m.id);
                  const podBg=pi===1?"linear-gradient(160deg,#2563EB,#1E3A8A)":pi===0?"linear-gradient(160deg,#94A3B8,#64748B)":"linear-gradient(160deg,#D97706,#92400E)";
                  return (
                    <div key={m.id} onClick={()=>goM(m.id)} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:7, cursor:"pointer" }}>
                      <Av label={m.avatar} color={COLORS[mi%COLORS.length]} light={LCOLORS[mi%LCOLORS.length]} size={sizes[pi]} fs={pi===1?16:12}/>
                      <div style={{ fontWeight:800, fontSize:pi===1?14:12, color:"#1E293B", textAlign:"center", maxWidth:80 }}>{m.name}</div>
                      <div style={{ width:pi===1?96:76, height:heights[pi], background:podBg, borderRadius:"8px 8px 0 0",
                        display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:3 }}>
                        <div style={{ fontSize:pi===1?22:17, fontWeight:800, color:"#fff" }}>{m.points}</div>
                        <div style={{ fontSize:10, color:"rgba(255,255,255,0.6)" }}>pts</div>
                        <div style={{ fontSize:pi===1?20:15 }}>{podRanks[pi]}</div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="card" style={{ overflow:"hidden" }}>
                {sorted.map((m,i)=>{
                  const mi = state.members.findIndex(x=>x.id===m.id);
                  const dn = m.tasks.filter(t=>t.status==="done").length;
                  const ms = m.tasks.filter(t=>t.status==="missed").length;
                  return (
                    <div key={m.id} className="trow clickrow btn" onClick={()=>goM(m.id)}
                      style={{ padding:"14px 16px", display:"flex", alignItems:"center", gap:14 }}>
                      <div style={{ width:26, fontSize:18, textAlign:"center", flexShrink:0 }}>{RANKS[i]}</div>
                      <Av label={m.avatar} color={COLORS[mi%COLORS.length]} light={LCOLORS[mi%LCOLORS.length]} size={38} fs={12}/>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:5, flexWrap:"wrap" }}>
                          <span style={{ fontWeight:800, fontSize:14, color:"#1E293B" }}>{m.name}</span>
                          <span style={{ fontSize:12, color:"#94A3B8" }}>{m.role}</span>
                        </div>
                        <div className="pbar-bg"><div className="pbar" style={{ width:`${(m.points/maxP)*100}%`, background:COLORS[mi%COLORS.length] }}/></div>
                      </div>
                      <div style={{ display:"flex", gap:14, alignItems:"center", flexShrink:0 }}>
                        <div style={{ textAlign:"center" }}>
                          <div style={{ fontWeight:800, fontSize:14, color:"#15803D" }}>{dn}</div>
                          <div style={{ fontSize:10, color:"#94A3B8" }}>done</div>
                        </div>
                        <div style={{ textAlign:"center" }}>
                          <div style={{ fontWeight:800, fontSize:14, color:"#B91C1C" }}>{ms}</div>
                          <div style={{ fontSize:10, color:"#94A3B8" }}>miss</div>
                        </div>
                        <div style={{ textAlign:"right", minWidth:56 }}>
                          <div style={{ fontWeight:800, fontSize:22, color:COLORS[mi%COLORS.length] }}>{m.points}</div>
                          <div style={{ fontSize:10, color:"#94A3B8" }}>pts</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ═══ MEMBER DETAIL ═══ */}
          {view==="member" && sel && (()=>{
            const m   = getM(sel); if (!m) return null;
            const mi  = state.members.findIndex(x=>x.id===sel);
            const col = COLORS[mi%COLORS.length];
            const dn  = m.tasks.filter(t=>t.status==="done");
            const pnd = m.tasks.filter(t=>t.status==="pending");
            const ms  = m.tasks.filter(t=>t.status==="missed");
            return (
              <div>
                <button className="btn btn-ghost" style={{ marginBottom:16, fontSize:13, padding:"7px 12px", display:"inline-flex", alignItems:"center", gap:5 }}
                  onClick={()=>{setView("leaderboard");setSel(null);}}>← Back</button>

                <div className="card-blue" style={{ padding:22, marginBottom:16 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:18 }}>
                    <div style={{ width:56, height:56, borderRadius:"50%", background:"rgba(255,255,255,0.2)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:17, fontWeight:800, color:"#fff", border:"2px solid rgba(255,255,255,0.3)", flexShrink:0 }}>
                      {m.avatar}
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:800, fontSize:20, color:"#fff" }}>{m.name}</div>
                      <div style={{ fontSize:13, color:"rgba(255,255,255,0.6)", marginTop:2 }}>{m.role}</div>
                    </div>
                    <div style={{ textAlign:"right" }}>
                      <div style={{ fontWeight:800, fontSize:34, color:"#fff" }}>{m.points}</div>
                      <div style={{ fontSize:11, color:"rgba(255,255,255,0.5)" }}>total pts</div>
                    </div>
                  </div>
                  <div style={{ display:"flex", gap:8 }}>
                    {[["✅ Done",dn.length],["⏳ Open",pnd.length],["❌ Missed",ms.length]].map(([l,v])=>(
                      <div key={l} style={{ flex:1, background:"rgba(255,255,255,0.12)", borderRadius:10, padding:"11px 6px", textAlign:"center", border:"1px solid rgba(255,255,255,0.1)" }}>
                        <div style={{ fontWeight:800, fontSize:22, color:"#fff" }}>{v}</div>
                        <div style={{ fontSize:11, color:"rgba(255,255,255,0.55)", marginTop:2 }}>{l}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {m.history.length>1 && (
                  <>
                    <div className="sec" style={{ marginTop:18 }}>Progress</div>
                    <div className="card" style={{ padding:"18px 12px 10px", marginBottom:16 }}>
                      <ResponsiveContainer width="100%" height={140}>
                        <LineChart data={m.history}>
                          <XAxis dataKey="date" tick={{ fill:"#94A3B8", fontSize:10, fontFamily:"Nunito" }} axisLine={false} tickLine={false}/>
                          <YAxis hide/>
                          <Tooltip contentStyle={{ background:"#fff", border:"1px solid #E2E8F0", borderRadius:10, fontFamily:"Nunito", fontSize:13 }} labelStyle={{ color:"#1E293B" }} itemStyle={{ color:col }}/>
                          <Line type="monotone" dataKey="points" stroke={col} strokeWidth={2.5} dot={{ fill:col,r:4,strokeWidth:0 }} activeDot={{ r:6 }}/>
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </>
                )}

                {m.history.length>0 && (
                  <>
                    <div className="sec" style={{ marginTop:18 }}>Activity History</div>
                    <div className="card" style={{ overflow:"hidden", marginBottom:18 }}>
                      {[...m.history].reverse().map((h,hi)=>(
                        <div key={hi} className="trow" style={{ padding:"12px 16px", display:"flex", alignItems:"center", gap:10 }}>
                          <div style={{ width:32, height:32, borderRadius:"50%", flexShrink:0,
                            background:h.type==="done"?"#DCFCE7":h.type==="missed"?"#FEE2E2":h.type==="collab"?"#EDE9FE":"#F0FDF4",
                            display:"flex", alignItems:"center", justifyContent:"center", fontSize:14 }}>
                            {h.type==="done"?"✅":h.type==="missed"?"❌":"🤝"}
                          </div>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontSize:13, color:"#1E293B", fontWeight:600 }}>
                              {h.type==="collab" ? (h.note||h.task) : h.task}
                            </div>
                            <div style={{ fontSize:11, color:"#94A3B8", fontFamily:"Fira Code,monospace", marginTop:2 }}>{h.fullDate||h.date}</div>
                          </div>
                          <div style={{ textAlign:"right", flexShrink:0 }}>
                            {h.earned>0 && <div style={{ fontWeight:800, fontSize:14, color:"#2563EB" }}>+{h.earned}</div>}
                            {h.type==="missed" && <div style={{ fontWeight:600, color:"#DC2626" }}>—</div>}
                            <div style={{ fontSize:11, color:"#94A3B8", marginTop:1 }}>{h.points} total</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
                  <div className="sec" style={{ marginBottom:0 }}>Tasks</div>
                  <div style={{ fontSize:12, fontWeight:700, color:pnd.length>=MAX_TASKS?"#DC2626":"#94A3B8" }}>
                    {pnd.length}/{MAX_TASKS} pending
                  </div>
                </div>
                <div className="card" style={{ overflow:"hidden" }}>
                  {m.tasks.length===0&&<div style={{ padding:32, textAlign:"center", color:"#94A3B8", fontSize:14, fontWeight:600 }}>No tasks yet</div>}
                  {m.tasks.map(t=><TaskRow key={t.id} t={t} m={m}/>)}
                </div>
              </div>
            );
          })()}
        </main>
      </div>

      {/* ═══════════ MOBILE BOTTOM NAV ═══════════ */}
      <nav className="bnav">
        {NAV.map(n=>{
          const on = view===n.id||(n.id==="leaderboard"&&view==="member");
          return (
            <button key={n.id} className="bni btn" onClick={()=>goV(n.id)}>
              <div style={{ fontSize:20 }}>{n.ico}</div>
              <div className="bni-label" style={{ color:on?"#60A5FA":"rgba(255,255,255,0.35)", fontWeight:on?700:500 }}>{n.label}</div>
            </button>
          );
        })}
      </nav>

      {/* ═══════════ MODAL — ASSIGN TASK ═══════════ */}
      {modal==="task" && (
        <div className="overlay" onClick={()=>setModal(null)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div className="modal-handle mob-only"/>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
              <div style={{ fontWeight:800, fontSize:19, color:"#1E293B" }}>Assign Task</div>
              <button className="btn icon-btn" onClick={()=>setModal(null)} style={{ fontSize:18 }}>✕</button>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
              <div>
                <div className="lbl">Task Title *</div>
                <input placeholder="What needs to be done?" value={tf.title} onChange={e=>setTf(p=>({...p,title:e.target.value}))}/>
              </div>
              <div>
                <div className="lbl">Description</div>
                <textarea placeholder="Optional details…" rows={2} value={tf.desc} onChange={e=>setTf(p=>({...p,desc:e.target.value}))} style={{resize:"none"}}/>
              </div>
              <div>
                <div className="lbl">Assign To *</div>
                <select value={tf.assignee} onChange={e=>setTf(p=>({...p,assignee:e.target.value}))}>
                  <option value="">Select team member</option>
                  {state.members.map(m=>{
                    const pCount = m.tasks.filter(t=>t.status==="pending").length;
                    const full   = pCount >= MAX_TASKS;
                    return <option key={m.id} value={m.id} disabled={full}>{m.name}{full?" — limit reached":""}</option>;
                  })}
                </select>
                {tf.assignee && state.members.find(m=>m.id===Number(tf.assignee))?.tasks.filter(t=>t.status==="pending").length>=MAX_TASKS && (
                  <div style={{ fontSize:12, color:"#DC2626", fontWeight:700, marginTop:6 }}>⚠ Task limit ({MAX_TASKS}) reached for this member</div>
                )}
              </div>
              <div className="g2">
                <div>
                  <div className="lbl">Deadline *</div>
                  <input type="date" value={tf.deadline} onChange={e=>setTf(p=>({...p,deadline:e.target.value}))}/>
                </div>
                <div>
                  <div className="lbl">Points</div>
                  <input type="number" min={1} max={100} value={tf.points} onChange={e=>setTf(p=>({...p,points:e.target.value}))}/>
                </div>
              </div>
            </div>
            <div style={{ display:"flex", gap:10, marginTop:20 }}>
              <button className="btn btn-ghost" style={{ flex:1 }} onClick={()=>setModal(null)}>Cancel</button>
              <button className="btn btn-blue"  style={{ flex:1 }} onClick={addTask}>Assign →</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════ MODAL — LOG HELP ═══════════ */}
      {modal==="help" && (
        <div className="overlay" onClick={()=>setModal(null)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div className="modal-handle mob-only"/>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:6 }}>
              <div style={{ fontWeight:800, fontSize:19, color:"#1E293B" }}>Log Help</div>
              <button className="btn icon-btn" onClick={()=>setModal(null)} style={{ fontSize:18 }}>✕</button>
            </div>
            <div style={{ fontSize:13, color:"#94A3B8", fontWeight:500, marginBottom:20 }}>
              When someone helps a teammate, both share the points of that person's current task — split 50/50.
            </div>

            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>

              {/* Helper */}
              <div>
                <div className="lbl">Who helped? 🙋</div>
                <select value={hf.helper} onChange={e=>setHf({helper:e.target.value,needer:""})}>
                  <option value="">Select the helper</option>
                  {state.members.map(m=>(
                    <option key={m.id} value={m.id}>{m.name} — {m.role}</option>
                  ))}
                </select>
              </div>

              {/* Needer */}
              <div>
                <div className="lbl">Who asked for help? 🙏</div>
                <select value={hf.needer} onChange={e=>setHf(p=>({...p,needer:e.target.value}))} disabled={!hf.helper}>
                  <option value="">Select the person who needed help</option>
                  {state.members
                    .filter(m=>m.id!==Number(hf.helper))
                    .map(m=>(
                      <option key={m.id} value={m.id}>{m.name} — {m.role}</option>
                    ))}
                </select>
              </div>

              {/* Auto-task display */}
              {neederMember && (
                <div>
                  {neederPending.length === 0 ? (
                    <div style={{ fontSize:13, color:"#DC2626", fontWeight:600, padding:"12px 14px", background:"#FEF2F2", borderRadius:10, border:"1px solid #FECACA" }}>
                      ⚠ {neederMember.name} has no pending tasks — assign a task first.
                    </div>
                  ) : (
                    <div style={{ background:"#F8FAFC", border:"1.5px solid #E2E8F0", borderRadius:10, padding:"12px 14px" }}>
                      <div style={{ fontSize:11, color:"#94A3B8", fontWeight:600, marginBottom:6, textTransform:"uppercase", letterSpacing:".06em" }}>
                        Auto-selected current task
                      </div>
                      <div style={{ fontWeight:800, fontSize:15, color:"#1E293B", marginBottom:4 }}>
                        "{autoTask.title}"
                      </div>
                      <div style={{ fontSize:12, color:"#94A3B8", fontFamily:"Fira Code,monospace" }}>
                        Total: <span style={{ color:"#2563EB", fontWeight:700 }}>{autoTask.points} pts</span>
                        <span style={{ marginLeft:10 }}>Due: {fmt(autoTask.deadline)}</span>
                      </div>
                      {neederPending.length > 1 && (
                        <div style={{ fontSize:11, color:"#94A3B8", marginTop:4 }}>
                          (most recent of {neederPending.length} pending tasks)
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Points preview */}
              {canLogHelp && (
                <div className="help-preview">
                  <div style={{ fontWeight:800, fontSize:13, color:"#5B21B6", marginBottom:10 }}>
                    🤝 Points Split Preview
                  </div>
                  <div style={{ display:"flex", gap:10, marginBottom:8 }}>
                    <div style={{ flex:1, background:"#fff", borderRadius:8, padding:"12px 10px", textAlign:"center", border:"1px solid #C4B5FD" }}>
                      <div style={{ fontSize:12, color:"#94A3B8", marginBottom:6, fontWeight:600 }}>{neederMember.name}</div>
                      <div style={{ fontSize:11, color:"#7C3AED", marginBottom:4 }}>asked for help</div>
                      <div style={{ fontWeight:800, fontSize:24, color:"#7C3AED" }}>+{halfPoints}</div>
                      <div style={{ fontSize:11, color:"#94A3B8" }}>pts</div>
                    </div>
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, color:"#C4B5FD", fontSize:22 }}>⇄</div>
                    <div style={{ flex:1, background:"#fff", borderRadius:8, padding:"12px 10px", textAlign:"center", border:"1px solid #C4B5FD" }}>
                      <div style={{ fontSize:12, color:"#94A3B8", marginBottom:6, fontWeight:600 }}>{helperMember.name}</div>
                      <div style={{ fontSize:11, color:"#7C3AED", marginBottom:4 }}>helped out</div>
                      <div style={{ fontWeight:800, fontSize:24, color:"#7C3AED" }}>+{halfPoints}</div>
                      <div style={{ fontSize:11, color:"#94A3B8" }}>pts</div>
                    </div>
                  </div>
                  <div style={{ fontSize:12, color:"#6D28D9", fontWeight:600, textAlign:"center" }}>
                    Task marked as ✅ Collab Done · {autoTask.points} pts total → {halfPoints} + {halfPoints}
                    {autoTask.points % 2 !== 0 && <span style={{ color:"#94A3B8" }}> (1 pt remainder dropped)</span>}
                  </div>
                </div>
              )}
            </div>

            <div style={{ display:"flex", gap:10, marginTop:20 }}>
              <button className="btn btn-ghost" style={{ flex:1 }} onClick={()=>setModal(null)}>Cancel</button>
              <button
                className="btn btn-blue"
                style={{ flex:1, background:canLogHelp?"#7C3AED":"#CBD5E1", cursor:canLogHelp?"pointer":"not-allowed", transition:"background .2s" }}
                disabled={!canLogHelp}
                onClick={addHelp}>
                Log Help →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}