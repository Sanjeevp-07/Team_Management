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
  { id: 1, name: "Annu Tiwari", role: "Lead",          avatar: "AT" },
  { id: 2, name: "Sanjeev",     role: "Hardware",       avatar: "SJ" },
  { id: 3, name: "Archi",       role: "Frontend",       avatar: "AR" },
  { id: 4, name: "Asmi",        role: "ML / Dataset",   avatar: "AS" },
  { id: 5, name: "Kiran",       role: "Speech System",  avatar: "KI" },
];

const defaultState = () => ({
  members: INITIAL_MEMBERS.map(m => ({ ...m, points: 0, history: [], tasks: [] })),
  taskIdCounter: 1,
});

const now    = () => new Date().toISOString();
const fmt    = (iso) => new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
const fmtFull= (iso) => new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
const isPast = (d) => new Date(d) < new Date();
const getRef = () => { const [c, d] = FIRESTORE_DOC.split("/"); return doc(db, c, d); };

const COLORS  = ["#2563EB", "#0891B2", "#7C3AED", "#059669", "#DC2626"];
const LCOLORS = ["#EFF6FF", "#ECFEFF", "#F5F3FF", "#ECFDF5", "#FEF2F2"];
const RANKS   = ["🥇", "🥈", "🥉", "④", "⑤"];

/* ── CSS ─────────────────────────────────────────────────── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800&family=Fira+Code:wght@400;500&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { -webkit-text-size-adjust: 100%; }
html, body, #root { background: #F1F5F9 !important; width: 100%; min-height: 100vh; }
::-webkit-scrollbar { width: 5px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 99px; }

.btn { cursor: pointer; border: none; outline: none; transition: all 0.15s ease; }
.btn:active { transform: scale(0.97); }

/* ── Layout ── */
.app-shell  { display: flex; min-height: 100vh; }
.sidebar    { width: 248px; flex-shrink: 0; background: #1E3A8A; min-height: 100vh;
              position: fixed; top: 0; left: 0; bottom: 0; display: flex; flex-direction: column;
              z-index: 50; box-shadow: 4px 0 24px rgba(30,58,138,0.15); }
.main-wrap  { margin-left: 248px; flex: 1; min-height: 100vh; display: flex; flex-direction: column; }
.topbar     { background: #fff; border-bottom: 1px solid #E2E8F0; padding: 0 28px; height: 62px;
              display: flex; align-items: center; justify-content: space-between;
              position: sticky; top: 0; z-index: 40; }
.page       { padding: 28px 28px 40px; flex: 1; }

/* ── Sidebar items ── */
.sb-logo    { padding: 24px 20px 16px; border-bottom: 1px solid rgba(255,255,255,0.08); }
.sb-section { font-size: 10px; color: rgba(255,255,255,0.3); letter-spacing: .1em;
              text-transform: uppercase; padding: 16px 20px 6px; font-family: 'Fira Code', monospace; }
.sb-nav     { padding: 8px 12px; flex: 1; overflow-y: auto; }
.nav-btn    { display: flex; align-items: center; gap: 12px; width: 100%;
              padding: 11px 14px; border-radius: 10px; font-family: 'Nunito', sans-serif;
              font-size: 14px; font-weight: 600; color: rgba(255,255,255,0.55);
              background: none; border: none; cursor: pointer; text-align: left;
              transition: all 0.15s ease; margin-bottom: 2px; }
.nav-btn:hover  { background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.85); }
.nav-btn.active { background: rgba(255,255,255,0.15); color: #fff; }
.nav-btn .ico   { font-size: 17px; width: 22px; text-align: center; flex-shrink: 0; }
.sb-footer  { padding: 14px 20px; border-top: 1px solid rgba(255,255,255,0.08); }

/* ── Cards ── */
.card       { background: #fff; border: 1px solid #E2E8F0; border-radius: 14px; width: 100%; }
.card-blue  { background: linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%);
              border: none; border-radius: 14px; }
.stat-card  { background: #fff; border: 1px solid #E2E8F0; border-radius: 12px; padding: 18px 20px; }

/* ── Tags ── */
.tag        { padding: 3px 9px; border-radius: 20px; font-size: 11px; font-weight: 700;
              white-space: nowrap; font-family: 'Fira Code', monospace; }
.tag-done   { background: #DCFCE7; color: #15803D; }
.tag-miss   { background: #FEE2E2; color: #B91C1C; }
.tag-pend   { background: #FEF9C3; color: #A16207; }
.tag-late   { background: #FFEDD5; color: #C2410C; }

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
.overlay { position: fixed; inset: 0; background: rgba(15,23,42,0.55);
           backdrop-filter: blur(4px); display: flex; align-items: center;
           justify-content: center; z-index: 200; padding: 20px; }
.modal   { background: #fff; border-radius: 16px; padding: 28px; width: 100%;
           max-width: 500px; max-height: 90vh; overflow-y: auto;
           box-shadow: 0 24px 60px rgba(0,0,0,0.18); }

/* ── Buttons ── */
.btn-blue  { background: #2563EB; color: #fff; border-radius: 10px;
             padding: 11px 20px; font-family: 'Nunito'; font-size: 14px;
             font-weight: 700; border: none; cursor: pointer; transition: all .18s; }
.btn-blue:hover { background: #1D4ED8; }
.btn-ghost { background: #F1F5F9; color: #64748B; border-radius: 10px;
             padding: 11px 20px; font-family: 'Nunito'; font-size: 14px;
             font-weight: 600; border: none; cursor: pointer; transition: all .18s; }
.btn-ghost:hover { background: #E2E8F0; }
.btn-green { background: #DCFCE7; color: #15803D; border: 1px solid #BBF7D0;
             border-radius: 8px; padding: 6px 13px; font-size: 13px;
             font-family: 'Nunito'; font-weight: 700; cursor: pointer; transition: all .15s; }
.btn-green:hover { background: #BBF7D0; }
.btn-red   { background: #FEE2E2; color: #B91C1C; border: 1px solid #FECACA;
             border-radius: 8px; padding: 6px 13px; font-size: 13px;
             font-family: 'Nunito'; font-weight: 700; cursor: pointer; transition: all .15s; }
.btn-red:hover { background: #FECACA; }

/* ── Table rows ── */
.trow { border-bottom: 1px solid #F1F5F9; transition: background .1s; }
.trow:hover { background: #F8FAFC; }
.trow:last-child { border-bottom: none; }
.clickrow { cursor: pointer; }

/* ── Progress bar ── */
.pbar-bg { background: #F1F5F9; border-radius: 99px; height: 5px; overflow: hidden; }
.pbar    { height: 100%; border-radius: 99px; transition: width .8s ease; }

/* ── Live indicator ── */
.live-badge { display: inline-flex; align-items: center; gap: 5px; background: #DCFCE7;
              color: #15803D; border-radius: 20px; padding: 3px 10px;
              font-size: 12px; font-weight: 700; font-family: 'Nunito'; }
.live-dot   { width: 6px; height: 6px; border-radius: 50%; background: #22C55E;
              animation: livep 2s infinite; }
@keyframes livep { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.4;transform:scale(.7)} }

/* ── Loading ── */
.ldot { width: 9px; height: 9px; border-radius: 50%; background: #2563EB;
        animation: ld 1.2s ease-in-out infinite; }
.ldot:nth-child(2) { animation-delay: .2s; }
.ldot:nth-child(3) { animation-delay: .4s; }
@keyframes ld { 0%,80%,100%{transform:scale(.55);opacity:.25} 40%{transform:scale(1);opacity:1} }

/* ── Animations ── */
@keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
.fi { animation: fadeUp 0.22s ease forwards; }

/* ── Grid helpers ── */
.g2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.g4 { display: grid; grid-template-columns: repeat(4,1fr); gap: 14px; }
.g5 { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px,1fr)); gap: 14px; }
@media(max-width:900px) { .g4 { grid-template-columns: repeat(2,1fr); } }
@media(max-width:500px) { .g4 { grid-template-columns: 1fr 1fr; } }

/* ── Section heading ── */
.sec { font-family: 'Nunito'; font-weight: 800; font-size: 15px; color: #1E293B; margin-bottom: 14px; }
.lbl { font-size: 13px; color: #64748B; font-family: 'Nunito'; font-weight: 600; margin-bottom: 6px; }

/* ── Mobile ── */
.mob-topbar { display: none; }
@media(max-width:900px) {
  .sidebar   { transform: translateX(-100%); }
  .main-wrap { margin-left: 0; }
  .page      { padding: 16px 14px 80px; }
  .mob-topbar { display: flex; }
  .desk-topbar{ display: none; }
  .bnav      { display: flex !important; }
}
.bnav {
  display: none; position: fixed; bottom: 0; left: 0; right: 0;
  background: #1E3A8A; z-index: 100;
  padding-bottom: env(safe-area-inset-bottom, 0px);
}
.bni {
  flex: 1; display: flex; flex-direction: column; align-items: center;
  justify-content: center; padding: 10px 4px 8px; gap: 3px;
  cursor: pointer; border: none; background: none; outline: none;
}
`;

/* ── Avatar ─────────────────────────────────────────────── */
function Av({ label, color, light, size = 38, fs = 13 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: light || color + "20", border: `2px solid ${color}30`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: fs, fontWeight: 800, color, flexShrink: 0,
      fontFamily: "'Nunito', sans-serif",
    }}>{label}</div>
  );
}

/* ── Main export ─────────────────────────────────────────── */
export default function TeamTracker() {
  const [state,    setState]   = useState(null);
  const [loading,  setLoading] = useState(true);
  const [saving,   setSaving]  = useState(false);
  const [view,     setView]    = useState("dashboard");
  const [sel,      setSel]     = useState(null);
  const [modal,    setModal]   = useState(null);
  const [skip,     setSkip]    = useState(false);
  const [tf, setTf] = useState({ title:"", desc:"", assignee:"", deadline:"", points:10 });
  const [hf, setHf] = useState({ from:"", to:"", note:"" });

  /* Firebase sync */
  useEffect(() => {
    const ref = getRef();
    const unsub = onSnapshot(ref, snap => {
      if (snap.exists()) { setSkip(true); setState(snap.data()); }
      else { const i = defaultState(); setDoc(ref, i); setState(i); }
      setLoading(false);
    }, e => { console.error(e); setState(defaultState()); setLoading(false); });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!state || loading) return;
    if (skip) { setSkip(false); return; }
    setSaving(true);
    const t = setTimeout(async () => {
      try { await setDoc(getRef(), state); } catch (e) { console.error(e); }
      setSaving(false);
    }, 700);
    return () => clearTimeout(t);
  }, [state]);

  const upd  = fn => setState(prev => { const n = JSON.parse(JSON.stringify(prev)); fn(n); return n; });
  const getM = id => state?.members.find(m => m.id === id);

  /* Actions */
  const addTask = () => {
    if (!tf.title || !tf.assignee || !tf.deadline) return;
    const member = state.members.find(m => m.id === Number(tf.assignee));
    const pendingCount = member?.tasks.filter(t => t.status === "pending").length || 0;
    if (pendingCount >= MAX_TASKS) return;
    upd(s => {
      const m = s.members.find(m => m.id === Number(tf.assignee));
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
    const m = s.members.find(m => m.id === mid);
    const t = m.tasks.find(t => t.id === tid);
    if (t.status !== "pending") return;
    t.status = "done"; t.completedAt = now();
    m.points += t.points;
    m.history.push({ date: fmt(now()), fullDate: fmtFull(now()), points: m.points, earned: t.points, task: t.title, type: "done" });
  });

  const missTask = (mid, tid) => upd(s => {
    const m = s.members.find(m => m.id === mid);
    const t = m.tasks.find(t => t.id === tid);
    if (t.status !== "pending") return;
    t.status = "missed"; t.missedAt = now();
    m.history.push({ date: fmt(now()), fullDate: fmtFull(now()), points: m.points, earned: 0, task: t.title, type: "missed" });
  });

  const addHelp = () => {
    if (!hf.from || !hf.to || hf.from === hf.to) return;
    upd(s => {
      const m = s.members.find(m => m.id === Number(hf.from));
      m.points += 5;
      m.history.push({ date: fmt(now()), fullDate: fmtFull(now()), points: m.points, earned: 5, task: `Helped ${getM(Number(hf.to))?.name}`, type: "help" });
    });
    setHf({ from:"", to:"", note:"" }); setModal(null);
  };

  const goM = id => { setSel(id); setView("member"); };
  const goV = v  => { setView(v); if (v !== "member") setSel(null); };

  /* Loading screen */
  if (loading || !state) return (
    <div style={{ background:"#F1F5F9", minHeight:"100vh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:20 }}>
      <style>{CSS}</style>
      <div style={{ fontFamily:"'Nunito',sans-serif", fontWeight:800, fontSize:24, color:"#1E3A8A" }}>
        INORA <span style={{ color:"#2563EB" }}>Team</span>
      </div>
      <div style={{ display:"flex", gap:7 }}><div className="ldot"/><div className="ldot"/><div className="ldot"/></div>
      <div style={{ fontSize:13, color:"#94A3B8", fontFamily:"Nunito,sans-serif" }}>Connecting to Firebase…</div>
    </div>
  );

  const sorted = [...state.members].sort((a, b) => b.points - a.points);
  const maxP   = Math.max(...state.members.map(m => m.points), 1);
  const totalDone = state.members.reduce((a, m) => a + m.tasks.filter(t => t.status === "done").length, 0);
  const totalTask = state.members.reduce((a, m) => a + m.tasks.length, 0);

  const NAV = [
    { id:"dashboard",   label:"Dashboard",   ico:"📊" },
    { id:"tasks",       label:"Tasks",        ico:"✅" },
    { id:"history",     label:"History",      ico:"📋" },
    { id:"leaderboard", label:"Leaderboard",  ico:"🏆" },
  ];

  /* Task row */
  const TaskRow = ({ t, m, showMember = false }) => {
    const ov  = isPast(t.deadline) && t.status === "pending";
    const mi  = state.members.findIndex(x => x.id === m.id);
    return (
      <div className="trow" style={{ padding:"14px 20px", display:"flex", alignItems:"center", gap:14 }}>
        {showMember && (
          <Av label={m.avatar} color={COLORS[mi % COLORS.length]} light={LCOLORS[mi % LCOLORS.length]} size={32} fs={11}/>
        )}
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4, flexWrap:"wrap" }}>
            <span style={{ fontSize:14, fontWeight:700, color:"#1E293B", fontFamily:"'Nunito',sans-serif" }}>{t.title}</span>
            {t.status==="done"             && <span className="tag tag-done">✓ Done</span>}
            {t.status==="missed"           && <span className="tag tag-miss">✗ Missed</span>}
            {t.status==="pending" && !ov   && <span className="tag tag-pend">Pending</span>}
            {t.status==="pending" && ov    && <span className="tag tag-late">Overdue</span>}
          </div>
          {showMember && <div style={{ fontSize:12, color:"#94A3B8", marginBottom:3, fontFamily:"'Nunito',sans-serif" }}>{m.name} · {m.role}</div>}
          {t.desc && <div style={{ fontSize:13, color:"#64748B", marginBottom:4, fontFamily:"'Nunito',sans-serif" }}>{t.desc}</div>}
          <div style={{ fontSize:12, color:"#94A3B8", fontFamily:"'Fira Code',monospace" }}>
            Due <span style={{ color: ov && t.status==="pending" ? "#DC2626":"#64748B", fontWeight:500 }}>{fmt(t.deadline)}</span>
            <span style={{ marginLeft:10, color:"#2563EB", fontWeight:600 }}>+{t.points} pts</span>
          </div>
        </div>
        {t.status === "pending" && (
          <div style={{ display:"flex", gap:8, flexShrink:0 }}>
            <button className="btn-green btn" onClick={() => doneTask(m.id, t.id)}>✓ Done</button>
            <button className="btn-red   btn" onClick={() => missTask(m.id, t.id)}>✗ Miss</button>
          </div>
        )}
      </div>
    );
  };

  const isLeaderView = view === "member" || view === "leaderboard";

  return (
    <div className="app-shell" style={{ fontFamily:"'Nunito',sans-serif" }}>
      <style>{CSS}</style>

      {/* ── SIDEBAR ───────────────────────────────── */}
      <aside className="sidebar">
        <div className="sb-logo">
          <div style={{ fontWeight:800, fontSize:20, color:"#fff", letterSpacing:"-0.02em" }}>
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
              className={`nav-btn ${view===n.id || (n.id==="leaderboard"&&view==="member") ? "active":""}`}
              onClick={() => goV(n.id)}>
              <span className="ico">{n.ico}</span>{n.label}
            </button>
          ))}

          <div className="sb-section" style={{ marginTop:10 }}>Actions</div>
          <button className="nav-btn" onClick={() => setModal("task")}>
            <span className="ico">➕</span>Assign Task
          </button>
          <button className="nav-btn" onClick={() => setModal("help")}>
            <span className="ico">🤝</span>Log Help (+5 pts)
          </button>
        </div>

        <div className="sb-footer">
          {saving
            ? <div style={{ fontSize:11, color:"rgba(255,255,255,0.3)", fontFamily:"Fira Code,monospace" }}>syncing…</div>
            : <div className="live-badge"><div className="live-dot"/>Live</div>
          }
        </div>
      </aside>

      {/* ── MAIN ──────────────────────────────────── */}
      <div className="main-wrap">

        {/* Topbar */}
        <header className="topbar desk-topbar">
          <div>
            <div style={{ fontWeight:800, fontSize:18, color:"#1E293B" }}>
              {view==="dashboard"   && "Dashboard"}
              {view==="tasks"       && "Tasks"}
              {view==="history"     && "History"}
              {view==="leaderboard" && "Leaderboard"}
              {view==="member"      && (sel ? getM(sel)?.name : "Member")}
            </div>
            <div style={{ fontSize:12, color:"#94A3B8", fontFamily:"Fira Code,monospace" }}>
              {new Date().toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}
            </div>
          </div>
          <div style={{ display:"flex", gap:10 }}>
            <button className="btn btn-ghost" onClick={() => setModal("task")} style={{ fontSize:13, padding:"8px 16px" }}>+ Assign Task</button>
            <button className="btn btn-blue"  onClick={() => setModal("help")} style={{ fontSize:13, padding:"8px 16px" }}>🤝 Log Help</button>
          </div>
        </header>

        {/* Page */}
        <main className="page fi">

          {/* ── DASHBOARD ────────────────────────── */}
          {view==="dashboard" && (
            <div>
              {/* Stat row */}
              <div className="g4" style={{ marginBottom:22 }}>
                <div className="stat-card">
                  <div style={{ fontSize:11, color:"#94A3B8", fontFamily:"Fira Code,monospace", marginBottom:6 }}>MEMBERS</div>
                  <div style={{ fontSize:28, fontWeight:800, color:"#1E3A8A" }}>{state.members.length}</div>
                </div>
                <div className="stat-card">
                  <div style={{ fontSize:11, color:"#94A3B8", fontFamily:"Fira Code,monospace", marginBottom:6 }}>TASKS ASSIGNED</div>
                  <div style={{ fontSize:28, fontWeight:800, color:"#0891B2" }}>{totalTask}</div>
                </div>
                <div className="stat-card">
                  <div style={{ fontSize:11, color:"#94A3B8", fontFamily:"Fira Code,monospace", marginBottom:6 }}>COMPLETED</div>
                  <div style={{ fontSize:28, fontWeight:800, color:"#059669" }}>{totalDone}</div>
                </div>
                <div className="stat-card">
                  <div style={{ fontSize:11, color:"#94A3B8", fontFamily:"Fira Code,monospace", marginBottom:6 }}>TOP SCORE</div>
                  <div style={{ fontSize:28, fontWeight:800, color:"#7C3AED" }}>{sorted[0]?.points ?? 0} <span style={{ fontSize:14, fontWeight:500, color:"#94A3B8" }}>pts</span></div>
                  <div style={{ fontSize:12, color:"#64748B", marginTop:2 }}>{sorted[0]?.name}</div>
                </div>
              </div>

              {/* Chart */}
              <div className="card" style={{ padding:"20px 16px 12px", marginBottom:20 }}>
                <div className="sec">Points Overview</div>
                <ResponsiveContainer width="100%" height={170}>
                  <BarChart data={sorted} barSize={36}>
                    <XAxis dataKey="name" tick={{ fill:"#94A3B8", fontSize:12, fontFamily:"Nunito" }} axisLine={false} tickLine={false}/>
                    <YAxis hide/>
                    <Tooltip contentStyle={{ background:"#fff", border:"1px solid #E2E8F0", borderRadius:10, fontFamily:"Nunito", fontSize:13, boxShadow:"0 4px 20px rgba(0,0,0,0.1)" }} labelStyle={{ color:"#1E293B", fontWeight:700 }} itemStyle={{ color:"#2563EB" }}/>
                    <Bar dataKey="points" radius={[6,6,0,0]}>
                      {sorted.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]}/>)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Member cards */}
              <div className="sec">Team Members</div>
              <div className="g5">
                {state.members.map((m, i) => {
                  const pend = m.tasks.filter(t => t.status==="pending");
                  const ovd  = pend.filter(t => isPast(t.deadline));
                  const dn   = m.tasks.filter(t => t.status==="done");
                  const ms   = m.tasks.filter(t => t.status==="missed");
                  return (
                    <div key={m.id} className="card btn clickrow"
                      style={{ padding:18, borderWidth: ovd.length>0?"2px":"1px", borderColor: ovd.length>0?"#FECACA":"#E2E8F0" }}
                      onClick={() => goM(m.id)}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14 }}>
                        <Av label={m.avatar} color={COLORS[i%COLORS.length]} light={LCOLORS[i%LCOLORS.length]} size={42} fs={13}/>
                        <div style={{ textAlign:"right" }}>
                          <div style={{ fontWeight:800, fontSize:22, color:COLORS[i%COLORS.length] }}>{m.points}</div>
                          <div style={{ fontSize:10, color:"#94A3B8" }}>pts</div>
                        </div>
                      </div>
                      <div style={{ fontWeight:800, fontSize:15, color:"#1E293B", marginBottom:2 }}>{m.name}</div>
                      <div style={{ fontSize:12, color:"#94A3B8", marginBottom:12 }}>{m.role}</div>
                      <div className="pbar-bg">
                        <div className="pbar" style={{ width:`${(m.points/maxP)*100}%`, background:COLORS[i%COLORS.length] }}/>
                      </div>
                      <div style={{ display:"flex", gap:8, marginTop:10, fontSize:12, fontWeight:600 }}>
                        <span style={{ color:"#15803D" }}>{dn.length} done</span>
                        <span style={{ color:"#CBD5E1" }}>·</span>
                        <span style={{ color:"#A16207" }}>{pend.length} open</span>
                        {ms.length>0 && <><span style={{ color:"#CBD5E1" }}>·</span><span style={{ color:"#B91C1C" }}>{ms.length} missed</span></>}
                      </div>
                      {ovd.length>0 && (
                        <div style={{ marginTop:10, fontSize:11, color:"#B91C1C", fontWeight:700, background:"#FEF2F2", borderRadius:6, padding:"4px 8px", display:"inline-block" }}>
                          ⚠ {ovd.length} overdue
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── TASKS ────────────────────────────── */}
          {view==="tasks" && (
            <div>
              {state.members.map((m, mi) => {
                if (m.tasks.length===0) return null;
                const pending = m.tasks.filter(t => t.status==="pending");
                const atLimit = pending.length >= MAX_TASKS;
                return (
                  <div key={m.id} style={{ marginBottom:22 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
                      <Av label={m.avatar} color={COLORS[mi%COLORS.length]} light={LCOLORS[mi%LCOLORS.length]} size={34} fs={12}/>
                      <div style={{ flex:1 }}>
                        <div style={{ fontWeight:800, fontSize:15, color:"#1E293B" }}>{m.name}</div>
                        <div style={{ fontSize:12, color:"#94A3B8" }}>{m.role}</div>
                      </div>
                      <div style={{ fontSize:12, fontWeight:700, color: atLimit?"#DC2626":"#94A3B8" }}>
                        {pending.length}/{MAX_TASKS} pending
                        {atLimit && " — LIMIT REACHED"}
                      </div>
                    </div>
                    <div className="card" style={{ overflow:"hidden" }}>
                      {m.tasks.map(t => <TaskRow key={t.id} t={t} m={m}/>)}
                    </div>
                  </div>
                );
              })}
              {state.members.every(m => m.tasks.length===0) && (
                <div className="card" style={{ padding:52, textAlign:"center" }}>
                  <div style={{ fontSize:40, marginBottom:14 }}>📋</div>
                  <div style={{ fontWeight:800, fontSize:17, color:"#1E293B", marginBottom:6 }}>No tasks yet</div>
                  <div style={{ fontSize:14, color:"#94A3B8", marginBottom:20 }}>Assign tasks to your team to get started</div>
                  <button className="btn btn-blue" onClick={() => setModal("task")}>+ Assign First Task</button>
                </div>
              )}
            </div>
          )}

          {/* ── HISTORY ──────────────────────────── */}
          {view==="history" && (
            <div>
              {/* Per-member summary */}
              <div className="sec">Member Summary</div>
              <div className="g4" style={{ marginBottom:24 }}>
                {state.members.map((m, i) => {
                  const doneH = m.history.filter(h => h.type==="done");
                  return (
                    <div key={m.id} className="stat-card btn clickrow" onClick={() => goM(m.id)}>
                      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
                        <Av label={m.avatar} color={COLORS[i%COLORS.length]} light={LCOLORS[i%LCOLORS.length]} size={34} fs={12}/>
                        <div>
                          <div style={{ fontWeight:800, fontSize:14, color:"#1E293B" }}>{m.name}</div>
                          <div style={{ fontSize:11, color:"#94A3B8" }}>{m.role}</div>
                        </div>
                      </div>
                      <div style={{ fontWeight:800, fontSize:26, color:COLORS[i%COLORS.length] }}>
                        {m.points} <span style={{ fontSize:13, fontWeight:500, color:"#94A3B8" }}>pts</span>
                      </div>
                      <div style={{ fontSize:12, color:"#64748B", marginTop:4 }}>
                        {doneH.length} tasks completed · {doneH.reduce((a,h)=>a+h.earned,0)} pts earned
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Combined activity log */}
              <div className="sec">Activity Log</div>
              <div className="card" style={{ overflow:"hidden" }}>
                {state.members.every(m => m.history.length===0) && (
                  <div style={{ padding:44, textAlign:"center", color:"#94A3B8", fontSize:14, fontWeight:600 }}>
                    No activity yet. Complete tasks to see history here.
                  </div>
                )}
                {[...state.members.flatMap((m, mi) =>
                  m.history.map(h => ({ ...h, member:m, mi }))
                )].reverse().map((h, hi) => (
                  <div key={hi} className="trow" style={{ padding:"14px 20px", display:"flex", alignItems:"center", gap:14 }}>
                    <div style={{
                      width:36, height:36, borderRadius:"50%",
                      background: h.type==="done"?"#DCFCE7":h.type==="missed"?"#FEE2E2":"#EDE9FE",
                      display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, flexShrink:0,
                    }}>
                      {h.type==="done"?"✅":h.type==="missed"?"❌":"🤝"}
                    </div>
                    <Av label={h.member.avatar} color={COLORS[h.mi%COLORS.length]} light={LCOLORS[h.mi%LCOLORS.length]} size={34} fs={12}/>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontWeight:700, fontSize:14, color:"#1E293B" }}>{h.member.name}</div>
                      <div style={{ fontSize:13, color:"#64748B", marginTop:1 }}>
                        {h.type==="done"   && `Completed "${h.task}"`}
                        {h.type==="missed" && `Missed "${h.task}"`}
                        {h.type==="help"   && h.task}
                      </div>
                    </div>
                    <div style={{ textAlign:"right", flexShrink:0 }}>
                      {h.earned>0 && <div style={{ fontWeight:800, fontSize:16, color:"#2563EB" }}>+{h.earned} pts</div>}
                      {h.type==="missed" && <div style={{ fontWeight:600, fontSize:14, color:"#DC2626" }}>0 pts</div>}
                      <div style={{ fontSize:11, color:"#94A3B8", fontFamily:"Fira Code,monospace", marginTop:2 }}>{h.fullDate || h.date}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── LEADERBOARD ──────────────────────── */}
          {view==="leaderboard" && (
            <div>
              {/* Podium */}
              <div style={{ display:"flex", justifyContent:"center", alignItems:"flex-end", gap:12, marginBottom:28, padding:"10px 0 0" }}>
                {[sorted[1], sorted[0], sorted[2]].filter(Boolean).map((m, pi) => {
                  const heights  = [110, 150, 90];
                  const sizes    = [44,  58,  40];
                  const podRanks = ["🥈","🥇","🥉"];
                  const mi = state.members.findIndex(x => x.id===m.id);
                  const podBg = pi===1
                    ? "linear-gradient(160deg,#2563EB,#1E3A8A)"
                    : pi===0
                    ? "linear-gradient(160deg,#94A3B8,#64748B)"
                    : "linear-gradient(160deg,#D97706,#92400E)";
                  return (
                    <div key={m.id} onClick={() => goM(m.id)}
                      style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:8, cursor:"pointer" }}>
                      <Av label={m.avatar} color={COLORS[mi%COLORS.length]} light={LCOLORS[mi%LCOLORS.length]} size={sizes[pi]} fs={pi===1?17:13}/>
                      <div style={{ fontWeight:800, fontSize:pi===1?15:13, color:"#1E293B" }}>{m.name}</div>
                      <div style={{ width:pi===1?100:80, height:heights[pi], background:podBg, borderRadius:"10px 10px 0 0",
                        display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:4 }}>
                        <div style={{ fontSize:pi===1?24:18, fontWeight:800, color:"#fff" }}>{m.points}</div>
                        <div style={{ fontSize:11, color:"rgba(255,255,255,0.6)" }}>pts</div>
                        <div style={{ fontSize:pi===1?22:17 }}>{podRanks[pi]}</div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Full table */}
              <div className="card" style={{ overflow:"hidden" }}>
                {sorted.map((m, i) => {
                  const mi  = state.members.findIndex(x => x.id===m.id);
                  const dn  = m.tasks.filter(t=>t.status==="done").length;
                  const ms  = m.tasks.filter(t=>t.status==="missed").length;
                  return (
                    <div key={m.id} className="trow clickrow btn" onClick={() => goM(m.id)}
                      style={{ padding:"16px 20px", display:"flex", alignItems:"center", gap:16 }}>
                      <div style={{ width:28, fontSize:18, textAlign:"center", flexShrink:0 }}>{RANKS[i]}</div>
                      <Av label={m.avatar} color={COLORS[mi%COLORS.length]} light={LCOLORS[mi%LCOLORS.length]} size={40} fs={13}/>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:6 }}>
                          <span style={{ fontWeight:800, fontSize:15, color:"#1E293B" }}>{m.name}</span>
                          <span style={{ fontSize:12, color:"#94A3B8" }}>{m.role}</span>
                        </div>
                        <div className="pbar-bg">
                          <div className="pbar" style={{ width:`${(m.points/maxP)*100}%`, background:COLORS[mi%COLORS.length] }}/>
                        </div>
                      </div>
                      <div style={{ display:"flex", gap:18, alignItems:"center", flexShrink:0 }}>
                        <div style={{ textAlign:"center" }}>
                          <div style={{ fontWeight:800, fontSize:15, color:"#15803D" }}>{dn}</div>
                          <div style={{ fontSize:11, color:"#94A3B8" }}>done</div>
                        </div>
                        <div style={{ textAlign:"center" }}>
                          <div style={{ fontWeight:800, fontSize:15, color:"#B91C1C" }}>{ms}</div>
                          <div style={{ fontSize:11, color:"#94A3B8" }}>missed</div>
                        </div>
                        <div style={{ textAlign:"right", minWidth:64 }}>
                          <div style={{ fontWeight:800, fontSize:24, color:COLORS[mi%COLORS.length] }}>{m.points}</div>
                          <div style={{ fontSize:10, color:"#94A3B8" }}>points</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── MEMBER DETAIL ────────────────────── */}
          {view==="member" && sel && (() => {
            const m   = getM(sel); if (!m) return null;
            const mi  = state.members.findIndex(x => x.id===sel);
            const col = COLORS[mi % COLORS.length];
            const lit = LCOLORS[mi % LCOLORS.length];
            const dn  = m.tasks.filter(t=>t.status==="done");
            const pnd = m.tasks.filter(t=>t.status==="pending");
            const ms  = m.tasks.filter(t=>t.status==="missed");
            const hasChart = m.history.length > 1;
            return (
              <div>
                <button className="btn btn-ghost" style={{ marginBottom:20, fontSize:13, padding:"7px 14px", display:"inline-flex", alignItems:"center", gap:6 }}
                  onClick={() => { setView("leaderboard"); setSel(null); }}>
                  ← Back
                </button>

                {/* Profile card */}
                <div className="card-blue" style={{ padding:24, marginBottom:16 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:16, marginBottom:20 }}>
                    <div style={{ width:60, height:60, borderRadius:"50%", background:"rgba(255,255,255,0.2)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, fontWeight:800, color:"#fff", border:"2px solid rgba(255,255,255,0.3)", flexShrink:0, fontFamily:"Nunito,sans-serif" }}>
                      {m.avatar}
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:800, fontSize:22, color:"#fff" }}>{m.name}</div>
                      <div style={{ fontSize:13, color:"rgba(255,255,255,0.6)", marginTop:2 }}>{m.role}</div>
                    </div>
                    <div style={{ textAlign:"right" }}>
                      <div style={{ fontWeight:800, fontSize:36, color:"#fff" }}>{m.points}</div>
                      <div style={{ fontSize:12, color:"rgba(255,255,255,0.5)" }}>total pts</div>
                    </div>
                  </div>
                  <div style={{ display:"flex", gap:10 }}>
                    {[["✅ Done",dn.length],["⏳ Open",pnd.length],["❌ Missed",ms.length]].map(([l,v]) => (
                      <div key={l} style={{ flex:1, background:"rgba(255,255,255,0.12)", borderRadius:10, padding:"12px 8px", textAlign:"center", border:"1px solid rgba(255,255,255,0.1)" }}>
                        <div style={{ fontWeight:800, fontSize:24, color:"#fff" }}>{v}</div>
                        <div style={{ fontSize:11, color:"rgba(255,255,255,0.55)", marginTop:2 }}>{l}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Chart */}
                {hasChart && (
                  <>
                    <div className="sec" style={{ marginTop:20 }}>Progress Over Time</div>
                    <div className="card" style={{ padding:"20px 16px 12px", marginBottom:16 }}>
                      <ResponsiveContainer width="100%" height={150}>
                        <LineChart data={m.history}>
                          <XAxis dataKey="date" tick={{ fill:"#94A3B8", fontSize:11, fontFamily:"Nunito" }} axisLine={false} tickLine={false}/>
                          <YAxis hide/>
                          <Tooltip contentStyle={{ background:"#fff", border:"1px solid #E2E8F0", borderRadius:10, fontFamily:"Nunito", fontSize:13 }} labelStyle={{ color:"#1E293B" }} itemStyle={{ color:col }}/>
                          <Line type="monotone" dataKey="points" stroke={col} strokeWidth={2.5} dot={{ fill:col, r:4, strokeWidth:0 }} activeDot={{ r:6 }}/>
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </>
                )}

                {/* History */}
                {m.history.length>0 && (
                  <>
                    <div className="sec" style={{ marginTop:20 }}>Activity History</div>
                    <div className="card" style={{ overflow:"hidden", marginBottom:20 }}>
                      {[...m.history].reverse().map((h, hi) => (
                        <div key={hi} className="trow" style={{ padding:"13px 18px", display:"flex", alignItems:"center", gap:12 }}>
                          <div style={{ width:34, height:34, borderRadius:"50%", background:h.type==="done"?"#DCFCE7":h.type==="missed"?"#FEE2E2":"#EDE9FE", display:"flex", alignItems:"center", justifyContent:"center", fontSize:15, flexShrink:0 }}>
                            {h.type==="done"?"✅":h.type==="missed"?"❌":"🤝"}
                          </div>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontSize:14, color:"#1E293B", fontWeight:600 }}>{h.task}</div>
                            <div style={{ fontSize:11, color:"#94A3B8", fontFamily:"Fira Code,monospace", marginTop:2 }}>{h.fullDate || h.date}</div>
                          </div>
                          <div style={{ textAlign:"right", flexShrink:0 }}>
                            {h.earned>0 && <div style={{ fontWeight:800, fontSize:15, color:"#2563EB" }}>+{h.earned} pts</div>}
                            {h.type==="missed" && <div style={{ fontWeight:600, fontSize:14, color:"#DC2626" }}>—</div>}
                            <div style={{ fontSize:11, color:"#94A3B8", marginTop:1 }}>{h.points} total</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {/* Tasks */}
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
                  <div className="sec" style={{ marginBottom:0 }}>Tasks</div>
                  <div style={{ fontSize:12, fontWeight:700, color: pnd.length>=MAX_TASKS?"#DC2626":"#94A3B8" }}>
                    {pnd.length}/{MAX_TASKS} pending
                  </div>
                </div>
                <div className="card" style={{ overflow:"hidden" }}>
                  {m.tasks.length===0 && <div style={{ padding:32, textAlign:"center", color:"#94A3B8", fontSize:14, fontWeight:600 }}>No tasks assigned yet</div>}
                  {m.tasks.map(t => <TaskRow key={t.id} t={t} m={m}/>)}
                </div>
              </div>
            );
          })()}
        </main>
      </div>

      {/* MOBILE BOTTOM NAV */}
      <nav className="bnav">
        {NAV.map(n => {
          const on = view===n.id || (n.id==="leaderboard"&&view==="member");
          return (
            <button key={n.id} className="bni btn" onClick={() => goV(n.id)}>
              <div style={{ fontSize:19 }}>{n.ico}</div>
              <div style={{ fontSize:9, color: on?"#60A5FA":"rgba(255,255,255,0.35)", fontFamily:"Nunito,sans-serif", fontWeight: on?700:500 }}>{n.label}</div>
            </button>
          );
        })}
      </nav>

      {/* MODAL — ASSIGN TASK */}
      {modal==="task" && (
        <div className="overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:22 }}>
              <div style={{ fontWeight:800, fontSize:20, color:"#1E293B" }}>Assign Task</div>
              <button className="btn btn-ghost" style={{ borderRadius:"50%", width:34, height:34, padding:0, fontSize:16 }} onClick={() => setModal(null)}>✕</button>
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
                  {state.members.map(m => {
                    const pCount = m.tasks.filter(t=>t.status==="pending").length;
                    const full   = pCount >= MAX_TASKS;
                    return <option key={m.id} value={m.id} disabled={full}>{m.name}{full?" — limit reached":""}</option>;
                  })}
                </select>
                {tf.assignee && state.members.find(m=>m.id===Number(tf.assignee))?.tasks.filter(t=>t.status==="pending").length >= MAX_TASKS && (
                  <div style={{ fontSize:12, color:"#DC2626", fontWeight:700, marginTop:6 }}>⚠ This member has reached the {MAX_TASKS} task limit</div>
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
            <div style={{ display:"flex", gap:10, marginTop:22 }}>
              <button className="btn btn-ghost" style={{ flex:1 }} onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-blue"  style={{ flex:1 }} onClick={addTask}>Assign Task →</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL — LOG HELP */}
      {modal==="help" && (
        <div className="overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
              <div style={{ fontWeight:800, fontSize:20, color:"#1E293B" }}>Log Help</div>
              <button className="btn btn-ghost" style={{ borderRadius:"50%", width:34, height:34, padding:0, fontSize:16 }} onClick={() => setModal(null)}>✕</button>
            </div>
            <div style={{ fontSize:13, color:"#94A3B8", fontWeight:500, marginBottom:22 }}>Award +5 bonus points to a teammate who helped someone</div>
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
              <div>
                <div className="lbl">Who helped?</div>
                <select value={hf.from} onChange={e=>setHf(p=>({...p,from:e.target.value}))}>
                  <option value="">Select member</option>
                  {state.members.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
              <div>
                <div className="lbl">Who did they help?</div>
                <select value={hf.to} onChange={e=>setHf(p=>({...p,to:e.target.value}))}>
                  <option value="">Select member</option>
                  {state.members.filter(m=>m.id!==Number(hf.from)).map(m=><option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
              <div>
                <div className="lbl">Note (optional)</div>
                <input placeholder="What did they help with?" value={hf.note} onChange={e=>setHf(p=>({...p,note:e.target.value}))}/>
              </div>
            </div>
            <div style={{ display:"flex", gap:10, marginTop:22 }}>
              <button className="btn btn-ghost" style={{ flex:1 }} onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-blue"  style={{ flex:1, background:"#059669" }} onClick={addHelp}>+5 Points 🤝</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}