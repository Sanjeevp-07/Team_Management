// src/pages/TeamTracker.jsx
// npm install firebase recharts

import { useState, useEffect } from "react";
import { BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { db } from "../firebaseConfig";
import { doc, setDoc, onSnapshot } from "firebase/firestore";

/* ─── Constants ─────────────────────────────────────────── */
const FIRESTORE_DOC = "tracker/v2";
const MAX_TASKS     = 10;
const FOUNDER_PIN   = "2914";

const DEPARTMENTS = [
  { id:"frontend",  label:"Frontend",        color:"#2563EB", light:"#EFF6FF", icon:"🖥️"  },
  { id:"backend",   label:"Backend",          color:"#0891B2", light:"#ECFEFF", icon:"⚙️"  },
  { id:"ml",        label:"Machine Learning", color:"#7C3AED", light:"#F5F3FF", icon:"🧠"  },
  { id:"docs",      label:"Documentation",    color:"#D97706", light:"#FFFBEB", icon:"📝"  },
  { id:"hardware",  label:"Hardware",         color:"#059669", light:"#ECFDF5", icon:"🔧"  },
  { id:"field",     label:"Field / Data",     color:"#DC2626", light:"#FEF2F2", icon:"🌍"  },
];

const INITIAL_MEMBERS = [
  // Founders
  { id:1,  name:"Sanjeev",        dept:"founders", role:"Founder",    isFounder:true,  isLead:false, avatar:"SJ" },
  { id:2,  name:"Annu Tiwari",    dept:"founders", role:"Co-Founder", isFounder:true,  isLead:false, avatar:"AT" },
  // Frontend
  { id:3,  name:"FE Lead",        dept:"frontend", role:"Lead",       isFounder:false, isLead:true,  avatar:"FL" },
  { id:4,  name:"FE Member 1",    dept:"frontend", role:"Developer",  isFounder:false, isLead:false, avatar:"F1" },
  { id:5,  name:"FE Member 2",    dept:"frontend", role:"Developer",  isFounder:false, isLead:false, avatar:"F2" },
  // Backend
  { id:6,  name:"BE Lead",        dept:"backend",  role:"Lead",       isFounder:false, isLead:true,  avatar:"BL" },
  { id:7,  name:"BE Member 1",    dept:"backend",  role:"Developer",  isFounder:false, isLead:false, avatar:"B1" },
  { id:8,  name:"BE Member 2",    dept:"backend",  role:"Developer",  isFounder:false, isLead:false, avatar:"B2" },
  // ML
  { id:9,  name:"ML Lead",        dept:"ml",       role:"Lead",       isFounder:false, isLead:true,  avatar:"ML" },
  { id:10, name:"ML Member 1",    dept:"ml",       role:"Engineer",   isFounder:false, isLead:false, avatar:"M1" },
  { id:11, name:"ML Member 2",    dept:"ml",       role:"Engineer",   isFounder:false, isLead:false, avatar:"M2" },
  // Docs
  { id:12, name:"Docs Lead",      dept:"docs",     role:"Lead",       isFounder:false, isLead:true,  avatar:"DL" },
  { id:13, name:"Docs Member 1",  dept:"docs",     role:"Writer",     isFounder:false, isLead:false, avatar:"D1" },
  { id:14, name:"Docs Member 2",  dept:"docs",     role:"Writer",     isFounder:false, isLead:false, avatar:"D2" },
  // Hardware
  { id:15, name:"HW Lead",        dept:"hardware", role:"Lead",       isFounder:false, isLead:true,  avatar:"HL" },
  { id:16, name:"HW Member 1",    dept:"hardware", role:"Engineer",   isFounder:false, isLead:false, avatar:"H1" },
  { id:17, name:"HW Member 2",    dept:"hardware", role:"Engineer",   isFounder:false, isLead:false, avatar:"H2" },
  // Field
  { id:18, name:"Field Lead",     dept:"field",    role:"Lead",       isFounder:false, isLead:true,  avatar:"GL" },
  { id:19, name:"Field Member 1", dept:"field",    role:"Collector",  isFounder:false, isLead:false, avatar:"G1" },
  { id:20, name:"Field Member 2", dept:"field",    role:"Collector",  isFounder:false, isLead:false, avatar:"G2" },
];

const defaultState = () => ({
  members: INITIAL_MEMBERS.map(m => ({ ...m, points:0, history:[], tasks:[] })),
  taskIdCounter: 1,
});

const now     = () => new Date().toISOString();
const fmt     = (iso) => new Date(iso).toLocaleDateString("en-IN",{day:"2-digit",month:"short"});
const fmtFull = (iso) => new Date(iso).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"});
const isPast  = (d)   => new Date(d) < new Date();
const getRef  = ()    => { const [c,d]=FIRESTORE_DOC.split("/"); return doc(db,c,d); };
const getDept = (id)  => DEPARTMENTS.find(d=>d.id===id);

/* ─── CSS ───────────────────────────────────────────────── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800;900&family=Fira+Code:wght@400;500&display=swap');

*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{-webkit-text-size-adjust:100%}
html,body,#root{background:#F0F4FA !important;width:100%;min-height:100vh;font-family:'Nunito',sans-serif}
::-webkit-scrollbar{width:5px}
::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:#CBD5E1;border-radius:99px}

.btn{cursor:pointer;border:none;outline:none;transition:all .15s ease;font-family:'Nunito',sans-serif}
.btn:active{transform:scale(0.97)}

/* Shell */
.shell{display:flex;min-height:100vh;width:100%}

/* Sidebar */
.sidebar{
  width:256px;flex-shrink:0;background:#0F172A;
  position:fixed;top:0;left:0;bottom:0;
  display:flex;flex-direction:column;
  z-index:60;transition:transform .3s ease;
  box-shadow:4px 0 32px rgba(0,0,0,0.25);
}
.sb-logo{padding:20px 20px 16px;border-bottom:1px solid rgba(255,255,255,0.06)}
.sb-scroll{flex:1;overflow-y:auto;padding:10px 10px}
.sb-section{font-size:10px;color:rgba(255,255,255,0.25);letter-spacing:.12em;
  text-transform:uppercase;padding:14px 12px 5px;font-family:'Fira Code',monospace}
.nb{display:flex;align-items:center;gap:10px;width:100%;padding:9px 12px;border-radius:9px;
  font-size:13.5px;font-weight:600;color:rgba(255,255,255,0.5);background:none;
  border:none;cursor:pointer;text-align:left;transition:all .15s;margin-bottom:1px}
.nb:hover{background:rgba(255,255,255,0.07);color:rgba(255,255,255,0.85)}
.nb.on{background:rgba(255,255,255,0.12);color:#fff}
.nb .ico{font-size:15px;width:20px;text-align:center;flex-shrink:0}
.sb-foot{padding:12px 18px;border-top:1px solid rgba(255,255,255,0.06)}

/* Backdrop */
.backdrop{display:none;position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:55}
.backdrop.on{display:block}

/* Main */
.main{margin-left:256px;flex:1;min-height:100vh;display:flex;flex-direction:column}
.topbar{background:#fff;border-bottom:1px solid #E2E8F0;padding:0 24px;height:60px;
  display:flex;align-items:center;justify-content:space-between;
  position:sticky;top:0;z-index:40}
.page{padding:24px;flex:1}

/* Cards */
.card{background:#fff;border:1px solid #E2E8F0;border-radius:14px;width:100%}
.stat{background:#fff;border:1px solid #E2E8F0;border-radius:12px;padding:18px 20px}
.dept-card{background:#fff;border:1px solid #E2E8F0;border-radius:12px;padding:16px;cursor:pointer;transition:all .18s}
.dept-card:hover{box-shadow:0 4px 20px rgba(0,0,0,0.08);transform:translateY(-1px)}

/* Tags */
.tag{padding:2px 8px;border-radius:20px;font-size:11px;font-weight:700;white-space:nowrap;font-family:'Fira Code',monospace}
.tag-done  {background:#DCFCE7;color:#15803D}
.tag-miss  {background:#FEE2E2;color:#B91C1C}
.tag-pend  {background:#FEF9C3;color:#A16207}
.tag-late  {background:#FFEDD5;color:#C2410C}
.tag-collab{background:#EDE9FE;color:#6D28D9}
.tag-lead  {background:#FEF3C7;color:#92400E;border:1px solid #FCD34D}
.tag-founder{background:#1E293B;color:#F8FAFC;border:1px solid #334155}

/* Inputs */
input,textarea,select{
  background:#F8FAFC;border:1.5px solid #E2E8F0;color:#1E293B;
  border-radius:10px;padding:10px 13px;font-family:'Nunito',sans-serif;
  font-size:14px;font-weight:500;width:100%;outline:none;
  transition:border .2s,box-shadow .2s;-webkit-appearance:none;appearance:none}
input:focus,textarea:focus,select:focus{
  border-color:#2563EB;background:#fff;box-shadow:0 0 0 3px rgba(37,99,235,.1)}
select option{background:#fff;color:#1E293B}
input[type="date"]::-webkit-calendar-picker-indicator{opacity:.5}

/* Modal */
.overlay{position:fixed;inset:0;background:rgba(15,23,42,.6);backdrop-filter:blur(4px);
  display:flex;align-items:flex-end;justify-content:center;z-index:200;padding:0}
.modal{background:#fff;border-radius:20px 20px 0 0;padding:22px 20px 36px;width:100%;
  max-height:90vh;overflow-y:auto;box-shadow:0 -8px 40px rgba(0,0,0,.15);
  animation:sUp .25s ease}
@keyframes sUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
@media(min-width:600px){
  .overlay{align-items:center;padding:20px}
  .modal{border-radius:16px;max-width:520px;padding:28px;animation:fIn .2s ease}}
@keyframes fIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
.mhandle{width:40px;height:4px;background:#E2E8F0;border-radius:99px;margin:0 auto 18px}

/* PIN modal */
.pin-box{display:flex;gap:10px;justify-content:center;margin:20px 0}
.pin-digit{width:52px;height:60px;border:2px solid #E2E8F0;border-radius:12px;
  font-size:24px;font-weight:800;text-align:center;font-family:'Nunito';
  background:#F8FAFC;color:#1E293B;outline:none;transition:border .2s}
.pin-digit:focus{border-color:#2563EB;background:#fff}

/* Buttons */
.bblu{background:#2563EB;color:#fff;border-radius:10px;padding:11px 18px;
  font-size:14px;font-weight:700;border:none;cursor:pointer;transition:all .18s}
.bblu:hover{background:#1D4ED8}
.bgho{background:#F1F5F9;color:#64748B;border-radius:10px;padding:11px 18px;
  font-size:14px;font-weight:600;border:none;cursor:pointer;transition:all .18s}
.bgho:hover{background:#E2E8F0}
.bgrn{background:#DCFCE7;color:#15803D;border:1px solid #BBF7D0;border-radius:8px;
  padding:5px 11px;font-size:13px;font-weight:700;cursor:pointer;transition:all .15s}
.bgrn:hover{background:#BBF7D0}
.bred{background:#FEE2E2;color:#B91C1C;border:1px solid #FECACA;border-radius:8px;
  padding:5px 11px;font-size:13px;font-weight:700;cursor:pointer;transition:all .15s}
.bred:hover{background:#FECACA}
.ibtn{background:none;border:none;cursor:pointer;padding:6px;border-radius:8px;
  color:#94A3B8;transition:all .15s}
.ibtn:hover{background:#F1F5F9;color:#475569}

/* Table */
.tr{border-bottom:1px solid #F1F5F9;transition:background .1s}
.tr:hover{background:#FAFBFC}
.tr:last-child{border-bottom:none}
.cptr{cursor:pointer}

/* Progress bar */
.pb-bg{background:#F1F5F9;border-radius:99px;height:5px;overflow:hidden}
.pb{height:100%;border-radius:99px;transition:width .8s ease}

/* Live */
.live{display:inline-flex;align-items:center;gap:5px;background:#DCFCE7;color:#15803D;
  border-radius:20px;padding:3px 10px;font-size:12px;font-weight:700}
.ldot2{width:6px;height:6px;border-radius:50%;background:#22C55E;animation:lp 2s infinite}
@keyframes lp{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(.7)}}

/* Loading */
.ldot{width:9px;height:9px;border-radius:50%;background:#2563EB;animation:ld 1.2s ease-in-out infinite}
.ldot:nth-child(2){animation-delay:.2s}.ldot:nth-child(3){animation-delay:.4s}
@keyframes ld{0%,80%,100%{transform:scale(.55);opacity:.25}40%{transform:scale(1);opacity:1}}

@keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
.fi{animation:fadeUp .22s ease forwards}

/* Grids */
.g2{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.g3{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
.g4{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}

/* Typography helpers */
.sec{font-weight:800;font-size:15px;color:#1E293B;margin-bottom:14px}
.lbl{font-size:13px;color:#64748B;font-weight:600;margin-bottom:6px}

/* Alert strip */
.alert{background:#FEF2F2;border:1px solid #FECACA;border-radius:10px;padding:12px 14px;
  display:flex;align-items:center;gap:10px}

/* Dept badge */
.dbadge{display:inline-flex;align-items:center;gap:5px;border-radius:20px;
  padding:3px 9px;font-size:11px;font-weight:700}

/* Bottom nav */
.bnav{display:none;position:fixed;bottom:0;left:0;right:0;background:#0F172A;z-index:50;
  border-top:1px solid rgba(255,255,255,0.06);padding-bottom:env(safe-area-inset-bottom,0px)}
.bni{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;
  padding:9px 4px 7px;gap:2px;cursor:pointer;border:none;background:none;outline:none}

/* ══ RESPONSIVE ══ */
@media(max-width:960px){
  .sidebar{transform:translateX(-100%)}
  .sidebar.open{transform:translateX(0)}
  .main{margin-left:0}
  .page{padding:14px 14px 82px}
  .topbar{padding:0 14px;height:54px}
  .bnav{display:flex}
  .donly{display:none !important}
  .g4{grid-template-columns:1fr 1fr}
  .g3{grid-template-columns:1fr 1fr}
}
@media(max-width:500px){
  .g4{grid-template-columns:1fr 1fr}
  .g3{grid-template-columns:1fr 1fr}
  .g2{grid-template-columns:1fr}
}
@media(min-width:961px){
  .monly{display:none !important}
  .sidebar{transform:translateX(0) !important}
}
`;

/* ─── Avatar ─────────────────────────────────────────────── */
function Av({label,color,light,size=36,fs=12}){
  return(
    <div style={{width:size,height:size,borderRadius:"50%",background:light||color+"22",
      border:`2px solid ${color}33`,display:"flex",alignItems:"center",justifyContent:"center",
      fontSize:fs,fontWeight:800,color,flexShrink:0}}>
      {label}
    </div>
  );
}

/* ─── Dept Badge ─────────────────────────────────────────── */
function DeptBadge({deptId}){
  const d=getDept(deptId);
  if(!d)return null;
  return(
    <span className="dbadge" style={{background:d.light,color:d.color,border:`1px solid ${d.color}33`}}>
      {d.icon} {d.label}
    </span>
  );
}

/* ══════════════════════════════════════════════════════════ */
/*                     MAIN COMPONENT                         */
/* ══════════════════════════════════════════════════════════ */
export default function TeamTracker(){
  const [state,   setState]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [view,    setView]    = useState("dashboard");
  const [selId,   setSelId]   = useState(null);   // selected member id
  const [selDept, setSelDept] = useState(null);   // selected dept id
  const [modal,   setModal]   = useState(null);   // "task"|"help"|"pin"|"member_edit"
  const [skip,    setSkip]    = useState(false);
  const [sideOpen,setSideOpen]= useState(false);
  const [founderUnlocked, setFounderUnlocked] = useState(false);

  // Forms
  const [tf, setTf] = useState({title:"",desc:"",assignee:"",deadline:"",points:10});
  const [hf, setHf] = useState({helper:"",needer:""});
  const [pin, setPin] = useState(["","","",""]);
  const [pinError, setPinError] = useState(false);

  /* Firebase */
  useEffect(()=>{
    const ref=getRef();
    const unsub=onSnapshot(ref,snap=>{
      if(snap.exists()){setSkip(true);setState(snap.data());}
      else{const i=defaultState();setDoc(ref,i);setState(i);}
      setLoading(false);
    },e=>{console.error(e);setState(defaultState());setLoading(false);});
    return()=>unsub();
  },[]);

  useEffect(()=>{
    if(!state||loading)return;
    if(skip){setSkip(false);return;}
    setSaving(true);
    const t=setTimeout(async()=>{
      try{await setDoc(getRef(),state);}catch(e){console.error(e);}
      setSaving(false);
    },700);
    return()=>clearTimeout(t);
  },[state]);

  const upd  = fn=>setState(prev=>{const n=JSON.parse(JSON.stringify(prev));fn(n);return n;});
  const getM = id=>state?.members.find(m=>m.id===id);

  /* PIN */
  const handlePin=(idx,val)=>{
    if(!/^\d?$/.test(val))return;
    const next=[...pin];next[idx]=val;setPin(next);setPinError(false);
    if(val&&idx<3)document.getElementById(`pin-${idx+1}`)?.focus();
  };
  const checkPin=()=>{
    if(pin.join("")===FOUNDER_PIN){setFounderUnlocked(true);setModal(null);setPin(["","","",""]);setView("founder");}
    else{setPinError(true);setPin(["","","",""]);}
  };
  const lockFounder=()=>{setFounderUnlocked(false);setView("dashboard");};

  /* Task actions */
  const addTask=()=>{
    if(!tf.title||!tf.assignee||!tf.deadline)return;
    const member=state.members.find(m=>m.id===Number(tf.assignee));
    if(member?.tasks.filter(t=>t.status==="pending").length>=MAX_TASKS)return;
    upd(s=>{
      const m=s.members.find(m=>m.id===Number(tf.assignee));
      m.tasks.push({id:s.taskIdCounter++,title:tf.title,desc:tf.desc,
        deadline:tf.deadline,points:Number(tf.points),status:"pending",createdAt:now()});
    });
    setTf({title:"",desc:"",assignee:"",deadline:"",points:10});setModal(null);
  };

  const doneTask=(mid,tid)=>upd(s=>{
    const m=s.members.find(m=>m.id===mid);const t=m.tasks.find(t=>t.id===tid);
    if(t.status!=="pending")return;
    t.status="done";t.completedAt=now();m.points+=t.points;
    m.history.push({date:fmt(now()),fullDate:fmtFull(now()),points:m.points,
      earned:t.points,task:t.title,type:"done"});
  });

  const missTask=(mid,tid)=>upd(s=>{
    const m=s.members.find(m=>m.id===mid);const t=m.tasks.find(t=>t.id===tid);
    if(t.status!=="pending")return;
    t.status="missed";t.missedAt=now();
    m.history.push({date:fmt(now()),fullDate:fmtFull(now()),points:m.points,
      earned:0,task:t.title,type:"missed"});
  });

  const addHelp=()=>{
    const helperId=Number(hf.helper),neederId=Number(hf.needer);
    if(!helperId||!neederId||helperId===neederId)return;
    upd(s=>{
      const helper=s.members.find(m=>m.id===helperId);
      const needer=s.members.find(m=>m.id===neederId);
      const pending=needer.tasks.filter(t=>t.status==="pending");
      if(!pending.length)return;
      const task=pending[pending.length-1];
      const half=Math.floor(task.points/2);
      const d=fmt(now()),fd=fmtFull(now());
      task.status="done";task.completedAt=now();task.collab=true;task.helperId=helperId;
      needer.points+=half;
      needer.history.push({date:d,fullDate:fd,points:needer.points,earned:half,
        task:task.title,type:"collab",with:helper.name,
        note:`🤝 "${task.title}" done with ${helper.name} (+${half}pts)`});
      helper.points+=half;
      helper.history.push({date:d,fullDate:fd,points:helper.points,earned:half,
        task:task.title,type:"collab",with:needer.name,
        note:`🤝 Helped ${needer.name} with "${task.title}" (+${half}pts)`});
    });
    setHf({helper:"",needer:""});setModal(null);
  };

  const goV=v=>{setView(v);setSelId(null);setSelDept(null);setSideOpen(false);};
  const goMember=id=>{setSelId(id);setView("member");setSideOpen(false);};
  const goDept=id=>{setSelDept(id);setView("dept");setSideOpen(false);};

  /* Loading */
  if(loading||!state)return(
    <div style={{background:"#F0F4FA",minHeight:"100vh",display:"flex",flexDirection:"column",
      alignItems:"center",justifyContent:"center",gap:20}}>
      <style>{CSS}</style>
      <div style={{fontWeight:900,fontSize:26,color:"#0F172A"}}>
        INORA <span style={{color:"#2563EB"}}>Team</span>
      </div>
      <div style={{display:"flex",gap:8}}><div className="ldot"/><div className="ldot"/><div className="ldot"/></div>
      <div style={{fontSize:13,color:"#94A3B8",fontWeight:600}}>Loading workspace…</div>
    </div>
  );

  /* Derived data */
  const allMembers  = state.members;
  const nonFounders = allMembers.filter(m=>!m.isFounder);
  const sorted      = [...nonFounders].sort((a,b)=>b.points-a.points);
  const maxP        = Math.max(...allMembers.map(m=>m.points),1);
  const overdue     = nonFounders.filter(m=>m.tasks.some(t=>t.status==="pending"&&isPast(t.deadline)));
  const totalDone   = nonFounders.reduce((a,m)=>a+m.tasks.filter(t=>t.status==="done").length,0);
  const totalTask   = nonFounders.reduce((a,m)=>a+m.tasks.length,0);

  // Dept-wise stats
  const deptStats = DEPARTMENTS.map(d=>{
    const members=nonFounders.filter(m=>m.dept===d.id);
    const done=members.reduce((a,m)=>a+m.tasks.filter(t=>t.status==="done").length,0);
    const total=members.reduce((a,m)=>a+m.tasks.length,0);
    const pts=members.reduce((a,m)=>a+m.points,0);
    const pct=total>0?Math.round((done/total)*100):0;
    return{...d,members,done,total,pts,pct};
  });

  // What tasks can this "lead" assign — their dept only
  // For simplicity: task form restricts based on selectedLead context
  const NAV=[
    {id:"dashboard",  label:"Dashboard",    ico:"📊"},
    {id:"leaderboard",label:"Leaderboard",  ico:"🏆"},
    {id:"tasks",      label:"Tasks",         ico:"✅"},
    {id:"history",    label:"History",       ico:"📋"},
  ];

  const pageTitle={
    dashboard:"Dashboard",leaderboard:"Leaderboard",
    tasks:"Tasks",history:"History",
    dept: selDept?getDept(selDept)?.label+" Department":"Department",
    member: selId?getM(selId)?.name:"Member",
    founder:"Founders Panel",
  }[view]||"Dashboard";

  /* help modal vars */
  const helperM     = hf.helper?getM(Number(hf.helper)):null;
  const neederM     = hf.needer?getM(Number(hf.needer)):null;
  const neederPend  = neederM?.tasks.filter(t=>t.status==="pending")||[];
  const autoTask    = neederPend.length?neederPend[neederPend.length-1]:null;
  const halfPts     = autoTask?Math.floor(autoTask.points/2):0;
  const canHelp     = helperM&&neederM&&autoTask;

  /* ── Task Row ── */
  const TaskRow=({t,m,showMember=false})=>{
    const ov=isPast(t.deadline)&&t.status==="pending";
    const dpt=getDept(m.dept);
    return(
      <div className="tr" style={{padding:"13px 16px"}}>
        <div style={{display:"flex",alignItems:"flex-start",gap:10}}>
          {showMember&&<Av label={m.avatar} color={dpt?.color||"#64748B"} light={dpt?.light} size={28} fs={10}/>}
          <div style={{flex:1,minWidth:0}}>
            <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3,flexWrap:"wrap"}}>
              <span style={{fontSize:14,fontWeight:700,color:"#1E293B"}}>{t.title}</span>
              {t.status==="done"&&!t.collab&&<span className="tag tag-done">✓ Done</span>}
              {t.status==="done"&&t.collab &&<span className="tag tag-collab">🤝 Collab</span>}
              {t.status==="missed"          &&<span className="tag tag-miss">✗ Missed</span>}
              {t.status==="pending"&&!ov    &&<span className="tag tag-pend">Pending</span>}
              {t.status==="pending"&&ov     &&<span className="tag tag-late">Overdue</span>}
            </div>
            {showMember&&<div style={{fontSize:11,color:"#94A3B8",marginBottom:3}}>{m.name} · {dpt?.label}</div>}
            {t.desc&&<div style={{fontSize:12,color:"#64748B",marginBottom:3}}>{t.desc}</div>}
            <div style={{fontSize:11,color:"#94A3B8",fontFamily:"Fira Code,monospace"}}>
              Due <span style={{color:ov&&t.status==="pending"?"#DC2626":"#64748B",fontWeight:500}}>{fmt(t.deadline)}</span>
              <span style={{marginLeft:8,color:"#2563EB",fontWeight:600}}>+{t.points}pts</span>
              {t.collab&&<span style={{marginLeft:6,color:"#7C3AED",fontWeight:600}}>({Math.floor(t.points/2)} each)</span>}
            </div>
          </div>
          {t.status==="pending"&&(
            <div style={{display:"flex",gap:6,flexShrink:0}}>
              <button className="bgrn btn" onClick={()=>doneTask(m.id,t.id)}>✓</button>
              <button className="bred btn" onClick={()=>missTask(m.id,t.id)}>✗</button>
            </div>
          )}
        </div>
      </div>
    );
  };

  /* ── Member Row (leaderboard style) ── */
  const MemberRow=({m,rank,showDept=true})=>{
    const dpt=getDept(m.dept);
    const dn=m.tasks.filter(t=>t.status==="done").length;
    const pnd=m.tasks.filter(t=>t.status==="pending");
    const ov=pnd.filter(t=>isPast(t.deadline)).length;
    const RANKICONS=["🥇","🥈","🥉"];
    return(
      <div className="tr cptr" onClick={()=>goMember(m.id)}
        style={{padding:"12px 16px",display:"flex",alignItems:"center",gap:12}}>
        <div style={{width:24,fontSize:16,textAlign:"center",flexShrink:0}}>{rank<=3?RANKICONS[rank-1]:rank}</div>
        <Av label={m.avatar} color={dpt?.color||"#64748B"} light={dpt?.light} size={36} fs={12}/>
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4,flexWrap:"wrap"}}>
            <span style={{fontWeight:800,fontSize:14,color:"#1E293B"}}>{m.name}</span>
            {m.isLead&&<span className="tag tag-lead">Lead</span>}
            {showDept&&<DeptBadge deptId={m.dept}/>}
          </div>
          <div className="pb-bg"><div className="pb" style={{width:`${(m.points/maxP)*100}%`,background:dpt?.color||"#2563EB"}}/></div>
        </div>
        <div style={{display:"flex",gap:14,alignItems:"center",flexShrink:0}}>
          <div style={{textAlign:"center"}}>
            <div style={{fontWeight:800,fontSize:13,color:"#15803D"}}>{dn}</div>
            <div style={{fontSize:10,color:"#94A3B8"}}>done</div>
          </div>
          {ov>0&&<div style={{textAlign:"center"}}>
            <div style={{fontWeight:800,fontSize:13,color:"#DC2626"}}>{ov}</div>
            <div style={{fontSize:10,color:"#94A3B8"}}>late</div>
          </div>}
          <div style={{textAlign:"right",minWidth:52}}>
            <div style={{fontWeight:900,fontSize:20,color:dpt?.color||"#2563EB"}}>{m.points}</div>
            <div style={{fontSize:10,color:"#94A3B8"}}>pts</div>
          </div>
        </div>
      </div>
    );
  };

  return(
    <div className="shell">
      <style>{CSS}</style>

      {/* Backdrop */}
      <div className={`backdrop${sideOpen?" on":""}`} onClick={()=>setSideOpen(false)}/>

      {/* ════════ SIDEBAR ════════ */}
      <aside className={`sidebar${sideOpen?" open":""}`}>
        <div className="sb-logo">
          <div style={{fontWeight:900,fontSize:18,color:"#fff",letterSpacing:"-0.02em"}}>
            INORA <span style={{color:"#3B82F6"}}>·</span> Team
          </div>
          <div style={{fontSize:10,color:"rgba(255,255,255,0.25)",marginTop:2,fontFamily:"Fira Code,monospace"}}>
            workspace manager
          </div>
        </div>

        <div className="sb-scroll">
          <div className="sb-section">Main</div>
          {NAV.map(n=>(
            <button key={n.id} className={`nb${view===n.id?" on":""}`} onClick={()=>goV(n.id)}>
              <span className="ico">{n.ico}</span>{n.label}
            </button>
          ))}

          <div className="sb-section" style={{marginTop:8}}>Departments</div>
          {DEPARTMENTS.map(d=>(
            <button key={d.id} className={`nb${view==="dept"&&selDept===d.id?" on":""}`} onClick={()=>goDept(d.id)}>
              <span className="ico">{d.icon}</span>
              <span style={{flex:1}}>{d.label}</span>
              <span style={{fontSize:11,fontFamily:"Fira Code,monospace",
                color:"rgba(255,255,255,0.3)",fontWeight:400}}>
                {nonFounders.filter(m=>m.dept===d.id).length}
              </span>
            </button>
          ))}

          <div className="sb-section" style={{marginTop:8}}>Actions</div>
          <button className="nb" onClick={()=>setModal("task")}>
            <span className="ico">➕</span>Assign Task
          </button>
          <button className="nb" onClick={()=>setModal("help")}>
            <span className="ico">🤝</span>Log Help
          </button>
          <button className={`nb${view==="founder"?" on":""}`}
            onClick={()=>founderUnlocked?goV("founder"):setModal("pin")}>
            <span className="ico">🔐</span>
            <span style={{flex:1}}>Founders Panel</span>
            {founderUnlocked&&<span style={{fontSize:10,color:"#22C55E",fontWeight:700}}>●</span>}
          </button>
        </div>

        <div className="sb-foot">
          {saving
            ?<div style={{fontSize:11,color:"rgba(255,255,255,0.25)",fontFamily:"Fira Code,monospace"}}>syncing…</div>
            :<div className="live"><div className="ldot2"/>Live</div>
          }
        </div>
      </aside>

      {/* ════════ MAIN ════════ */}
      <div className="main">
        <header className="topbar">
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <button className="monly ibtn btn" onClick={()=>setSideOpen(v=>!v)} style={{fontSize:20,padding:"6px 8px"}}>☰</button>
            <div>
              <div style={{fontWeight:800,fontSize:16,color:"#1E293B"}}>{pageTitle}</div>
              <div style={{fontSize:11,color:"#94A3B8",fontFamily:"Fira Code,monospace"}}>
                {new Date().toLocaleDateString("en-IN",{weekday:"short",day:"numeric",month:"short",year:"numeric"})}
              </div>
            </div>
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <button className="btn bgho donly" onClick={()=>setModal("task")} style={{fontSize:13,padding:"7px 14px"}}>+ Task</button>
            <button className="btn bblu donly" onClick={()=>setModal("help")} style={{fontSize:13,padding:"7px 14px"}}>🤝 Help</button>
            {founderUnlocked&&(
              <button className="btn" onClick={lockFounder}
                style={{fontSize:12,padding:"6px 12px",background:"#FEF3C7",color:"#92400E",borderRadius:8,border:"1px solid #FCD34D",fontWeight:700}}>
                🔓 Lock
              </button>
            )}
          </div>
        </header>

        <main className="page fi" key={view+selId+selDept}>

          {/* ══ DASHBOARD ══ */}
          {view==="dashboard"&&(
            <div>
              {/* Stats */}
              <div className="g4" style={{marginBottom:20}}>
                {[
                  ["Team Size","20 members","#2563EB"],
                  ["Tasks Done",totalDone,"#059669"],
                  ["Total Tasks",totalTask,"#0891B2"],
                  ["Overdue",overdue.length,"#DC2626"],
                ].map(([l,v,c])=>(
                  <div key={l} className="stat">
                    <div style={{fontSize:10,color:"#94A3B8",fontFamily:"Fira Code,monospace",marginBottom:6,textTransform:"uppercase",letterSpacing:".06em"}}>{l}</div>
                    <div style={{fontSize:26,fontWeight:900,color:c}}>{v}</div>
                  </div>
                ))}
              </div>

              {/* Overdue alert */}
              {overdue.length>0&&(
                <div className="alert" style={{marginBottom:20}}>
                  <span style={{fontSize:20}}>⚠️</span>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:800,fontSize:14,color:"#991B1B",marginBottom:4}}>
                      {overdue.length} member{overdue.length>1?"s":""} with overdue tasks
                    </div>
                    <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                      {overdue.map(m=>{
                        const dpt=getDept(m.dept);
                        return(
                          <span key={m.id} onClick={()=>goMember(m.id)}
                            style={{fontSize:12,color:dpt?.color||"#DC2626",fontWeight:700,
                              cursor:"pointer",background:dpt?.light||"#FEF2F2",
                              borderRadius:6,padding:"2px 8px"}}>
                            {m.name}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Department progress */}
              <div className="sec">Department Progress</div>
              <div className="g3" style={{marginBottom:24}}>
                {deptStats.map(d=>(
                  <div key={d.id} className="dept-card" onClick={()=>goDept(d.id)}>
                    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
                      <div style={{width:36,height:36,borderRadius:10,background:d.light,
                        display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>
                        {d.icon}
                      </div>
                      <div style={{flex:1}}>
                        <div style={{fontWeight:800,fontSize:14,color:"#1E293B"}}>{d.label}</div>
                        <div style={{fontSize:11,color:"#94A3B8"}}>{d.members.length} members</div>
                      </div>
                      <div style={{fontWeight:900,fontSize:18,color:d.color}}>{d.pct}%</div>
                    </div>
                    <div className="pb-bg"><div className="pb" style={{width:`${d.pct}%`,background:d.color}}/></div>
                    <div style={{display:"flex",justifyContent:"space-between",marginTop:8,fontSize:12,color:"#94A3B8"}}>
                      <span>{d.done}/{d.total} tasks</span>
                      <span style={{color:d.color,fontWeight:700}}>{d.pts} pts</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Top 5 */}
              <div className="sec">Top Performers</div>
              <div className="card" style={{overflow:"hidden"}}>
                {sorted.slice(0,5).map((m,i)=><MemberRow key={m.id} m={m} rank={i+1}/>)}
                <div className="tr cptr" style={{padding:"11px 16px",textAlign:"center",
                  fontSize:13,color:"#2563EB",fontWeight:700}}
                  onClick={()=>goV("leaderboard")}>
                  View full leaderboard →
                </div>
              </div>
            </div>
          )}

          {/* ══ LEADERBOARD ══ */}
          {view==="leaderboard"&&(
            <div>
              {/* Podium */}
              {sorted.length>=3&&(
                <div style={{display:"flex",justifyContent:"center",alignItems:"flex-end",
                  gap:10,marginBottom:24,padding:"8px 0 0"}}>
                  {[sorted[1],sorted[0],sorted[2]].map((m,pi)=>{
                    const dpt=getDept(m.dept);
                    const H=[110,150,90],S=[42,56,38];
                    const podRanks=["🥈","🥇","🥉"];
                    const bg=pi===1?`linear-gradient(160deg,${dpt?.color||"#2563EB"},#1E3A8A)`:
                      pi===0?"linear-gradient(160deg,#94A3B8,#64748B)":
                      "linear-gradient(160deg,#D97706,#92400E)";
                    return(
                      <div key={m.id} onClick={()=>goMember(m.id)}
                        style={{display:"flex",flexDirection:"column",alignItems:"center",gap:6,cursor:"pointer"}}>
                        <Av label={m.avatar} color={dpt?.color||"#2563EB"} light={dpt?.light} size={S[pi]} fs={pi===1?16:12}/>
                        <div style={{fontWeight:800,fontSize:pi===1?14:12,color:"#1E293B",textAlign:"center",maxWidth:80}}>{m.name}</div>
                        <div style={{width:pi===1?90:72,height:H[pi],background:bg,borderRadius:"8px 8px 0 0",
                          display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:2}}>
                          <div style={{fontSize:pi===1?22:16,fontWeight:900,color:"#fff"}}>{m.points}</div>
                          <div style={{fontSize:10,color:"rgba(255,255,255,0.6)"}}>pts</div>
                          <div style={{fontSize:pi===1?20:14}}>{podRanks[pi]}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Filter by dept */}
              <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:16}}>
                <button className="btn" onClick={()=>setSelDept(null)}
                  style={{padding:"5px 12px",borderRadius:20,fontSize:12,fontWeight:700,
                    background:!selDept?"#1E293B":"#F1F5F9",color:!selDept?"#fff":"#64748B"}}>
                  All
                </button>
                {DEPARTMENTS.map(d=>(
                  <button key={d.id} className="btn" onClick={()=>setSelDept(selDept===d.id?null:d.id)}
                    style={{padding:"5px 12px",borderRadius:20,fontSize:12,fontWeight:700,
                      background:selDept===d.id?d.color:d.light,color:selDept===d.id?"#fff":d.color}}>
                    {d.icon} {d.label}
                  </button>
                ))}
              </div>

              <div className="card" style={{overflow:"hidden"}}>
                {sorted
                  .filter(m=>!selDept||m.dept===selDept)
                  .map((m,i)=><MemberRow key={m.id} m={m} rank={i+1} showDept={!selDept}/>)}
              </div>
            </div>
          )}

          {/* ══ TASKS ══ */}
          {view==="tasks"&&(
            <div>
              {/* Dept filter */}
              <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:16}}>
                <button className="btn" onClick={()=>setSelDept(null)}
                  style={{padding:"5px 12px",borderRadius:20,fontSize:12,fontWeight:700,
                    background:!selDept?"#1E293B":"#F1F5F9",color:!selDept?"#fff":"#64748B"}}>All</button>
                {DEPARTMENTS.map(d=>(
                  <button key={d.id} className="btn" onClick={()=>setSelDept(selDept===d.id?null:d.id)}
                    style={{padding:"5px 12px",borderRadius:20,fontSize:12,fontWeight:700,
                      background:selDept===d.id?d.color:d.light,color:selDept===d.id?"#fff":d.color}}>
                    {d.icon} {d.label}
                  </button>
                ))}
              </div>

              {nonFounders
                .filter(m=>!selDept||m.dept===selDept)
                .filter(m=>m.tasks.length>0)
                .map(m=>{
                  const dpt=getDept(m.dept);
                  const pend=m.tasks.filter(t=>t.status==="pending");
                  return(
                    <div key={m.id} style={{marginBottom:18}}>
                      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                        <Av label={m.avatar} color={dpt?.color||"#64748B"} light={dpt?.light} size={30} fs={10}/>
                        <div style={{flex:1}}>
                          <div style={{fontWeight:800,fontSize:14,color:"#1E293B"}}>{m.name}</div>
                          <DeptBadge deptId={m.dept}/>
                        </div>
                        <div style={{fontSize:11,fontWeight:700,color:pend.length>=MAX_TASKS?"#DC2626":"#94A3B8"}}>
                          {pend.length}/{MAX_TASKS}
                        </div>
                      </div>
                      <div className="card" style={{overflow:"hidden"}}>
                        {m.tasks.map(t=><TaskRow key={t.id} t={t} m={m}/>)}
                      </div>
                    </div>
                  );
                })}

              {nonFounders.filter(m=>!selDept||m.dept===selDept).every(m=>m.tasks.length===0)&&(
                <div className="card" style={{padding:52,textAlign:"center"}}>
                  <div style={{fontSize:38,marginBottom:12}}>📋</div>
                  <div style={{fontWeight:800,fontSize:16,color:"#1E293B",marginBottom:6}}>No tasks yet</div>
                  <div style={{fontSize:14,color:"#94A3B8",marginBottom:20}}>Assign tasks to get started</div>
                  <button className="btn bblu" onClick={()=>setModal("task")}>+ Assign First Task</button>
                </div>
              )}
            </div>
          )}

          {/* ══ HISTORY ══ */}
          {view==="history"&&(
            <div>
              <div className="sec">Activity Log</div>
              {/* Dept filter */}
              <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:16}}>
                <button className="btn" onClick={()=>setSelDept(null)}
                  style={{padding:"5px 12px",borderRadius:20,fontSize:12,fontWeight:700,
                    background:!selDept?"#1E293B":"#F1F5F9",color:!selDept?"#fff":"#64748B"}}>All</button>
                {DEPARTMENTS.map(d=>(
                  <button key={d.id} className="btn" onClick={()=>setSelDept(selDept===d.id?null:d.id)}
                    style={{padding:"5px 12px",borderRadius:20,fontSize:12,fontWeight:700,
                      background:selDept===d.id?d.color:d.light,color:selDept===d.id?"#fff":d.color}}>
                    {d.icon} {d.label}
                  </button>
                ))}
              </div>

              <div className="card" style={{overflow:"hidden"}}>
                {[...allMembers
                  .filter(m=>!selDept||(m.dept===selDept))
                  .flatMap(m=>m.history.map(h=>({...h,member:m})))
                ].reverse().length===0&&(
                  <div style={{padding:44,textAlign:"center",color:"#94A3B8",fontSize:14,fontWeight:600}}>
                    No activity yet.
                  </div>
                )}
                {[...allMembers
                  .filter(m=>!selDept||m.dept===selDept)
                  .flatMap(m=>m.history.map(h=>({...h,member:m})))
                ].reverse().map((h,hi)=>{
                  const dpt=getDept(h.member.dept);
                  return(
                    <div key={hi} className="tr" style={{padding:"12px 16px",display:"flex",alignItems:"center",gap:10}}>
                      <div style={{width:34,height:34,borderRadius:"50%",flexShrink:0,
                        background:h.type==="done"?"#DCFCE7":h.type==="missed"?"#FEE2E2":"#EDE9FE",
                        display:"flex",alignItems:"center",justifyContent:"center",fontSize:15}}>
                        {h.type==="done"?"✅":h.type==="missed"?"❌":"🤝"}
                      </div>
                      <Av label={h.member.avatar} color={dpt?.color||"#64748B"} light={dpt?.light} size={30} fs={10}/>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontWeight:700,fontSize:13,color:"#1E293B"}}>{h.member.name}</div>
                        <div style={{fontSize:12,color:"#64748B",marginTop:1}}>
                          {h.type==="done"&&`Completed "${h.task}"`}
                          {h.type==="missed"&&`Missed "${h.task}"`}
                          {h.type==="collab"&&(h.note||`Collab: ${h.task}`)}
                        </div>
                      </div>
                      <div style={{textAlign:"right",flexShrink:0}}>
                        {h.earned>0&&<div style={{fontWeight:800,fontSize:14,color:"#2563EB"}}>+{h.earned}</div>}
                        {h.type==="missed"&&<div style={{fontWeight:600,fontSize:13,color:"#DC2626"}}>—</div>}
                        <div style={{fontSize:10,color:"#94A3B8",fontFamily:"Fira Code,monospace",marginTop:1}}>{h.fullDate||h.date}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ══ DEPARTMENT VIEW ══ */}
          {view==="dept"&&selDept&&(()=>{
            const d=getDept(selDept);
            const members=nonFounders.filter(m=>m.dept===selDept);
            const lead=members.find(m=>m.isLead);
            const ds=deptStats.find(x=>x.id===selDept);
            const dSorted=[...members].sort((a,b)=>b.points-a.points);
            return(
              <div>
                {/* Dept header */}
                <div className="card" style={{padding:22,marginBottom:18,
                  background:`linear-gradient(135deg,${d.color}15,${d.color}05)`,
                  borderColor:d.color+"33"}}>
                  <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:16}}>
                    <div style={{width:52,height:52,borderRadius:14,background:d.light,
                      display:"flex",alignItems:"center",justifyContent:"center",fontSize:26}}>
                      {d.icon}
                    </div>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:900,fontSize:22,color:"#1E293B"}}>{d.label}</div>
                      <div style={{fontSize:13,color:"#64748B"}}>{members.length} members · Lead: {lead?.name||"—"}</div>
                    </div>
                    <div style={{textAlign:"right"}}>
                      <div style={{fontWeight:900,fontSize:30,color:d.color}}>{ds?.pct}%</div>
                      <div style={{fontSize:11,color:"#94A3B8"}}>completion</div>
                    </div>
                  </div>
                  <div className="pb-bg" style={{height:8}}>
                    <div className="pb" style={{width:`${ds?.pct||0}%`,background:d.color,height:"100%"}}/>
                  </div>
                  <div style={{display:"flex",gap:16,marginTop:12}}>
                    {[["Tasks Done",ds?.done],["Total Tasks",ds?.total],["Total Points",ds?.pts]].map(([l,v])=>(
                      <div key={l}>
                        <div style={{fontWeight:800,fontSize:18,color:d.color}}>{v}</div>
                        <div style={{fontSize:11,color:"#94A3B8"}}>{l}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Members */}
                <div className="sec">Members</div>
                <div className="card" style={{overflow:"hidden",marginBottom:18}}>
                  {dSorted.map((m,i)=><MemberRow key={m.id} m={m} rank={i+1} showDept={false}/>)}
                </div>

                {/* Dept tasks */}
                <div className="sec">Active Tasks</div>
                {members.filter(m=>m.tasks.some(t=>t.status==="pending")).map(m=>(
                  <div key={m.id} style={{marginBottom:14}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                      <Av label={m.avatar} color={d.color} light={d.light} size={28} fs={10}/>
                      <span style={{fontWeight:700,fontSize:13,color:"#1E293B"}}>{m.name}</span>
                      {m.isLead&&<span className="tag tag-lead">Lead</span>}
                    </div>
                    <div className="card" style={{overflow:"hidden"}}>
                      {m.tasks.filter(t=>t.status==="pending").map(t=><TaskRow key={t.id} t={t} m={m}/>)}
                    </div>
                  </div>
                ))}
                {members.every(m=>!m.tasks.some(t=>t.status==="pending"))&&(
                  <div className="card" style={{padding:32,textAlign:"center",color:"#94A3B8",fontSize:14,fontWeight:600}}>
                    No active tasks in this department
                  </div>
                )}
              </div>
            );
          })()}

          {/* ══ MEMBER DETAIL ══ */}
          {view==="member"&&selId&&(()=>{
            const m=getM(selId);if(!m)return null;
            const dpt=getDept(m.dept);
            const dn=m.tasks.filter(t=>t.status==="done");
            const pnd=m.tasks.filter(t=>t.status==="pending");
            const ms=m.tasks.filter(t=>t.status==="missed");
            return(
              <div>
                <button className="btn bgho" style={{marginBottom:16,fontSize:13,padding:"7px 12px",
                  display:"inline-flex",alignItems:"center",gap:5}}
                  onClick={()=>{
                    if(selDept){setView("dept");}
                    else setView("leaderboard");
                  }}>← Back</button>

                {/* Profile card */}
                <div className="card" style={{padding:22,marginBottom:16,
                  background:`linear-gradient(135deg,${dpt?.color||"#2563EB"},#1E3A8A)`,border:"none"}}>
                  <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:18}}>
                    <div style={{width:58,height:58,borderRadius:"50%",background:"rgba(255,255,255,0.2)",
                      display:"flex",alignItems:"center",justifyContent:"center",
                      fontSize:18,fontWeight:900,color:"#fff",border:"2px solid rgba(255,255,255,0.3)",flexShrink:0}}>
                      {m.avatar}
                    </div>
                    <div style={{flex:1}}>
                      <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                        <div style={{fontWeight:900,fontSize:22,color:"#fff"}}>{m.name}</div>
                        {m.isFounder&&<span style={{fontSize:11,background:"rgba(255,255,255,0.2)",
                          color:"#fff",borderRadius:20,padding:"2px 8px",fontWeight:700}}>Founder</span>}
                        {m.isLead&&<span style={{fontSize:11,background:"rgba(255,255,255,0.2)",
                          color:"#fff",borderRadius:20,padding:"2px 8px",fontWeight:700}}>Lead</span>}
                      </div>
                      <div style={{fontSize:13,color:"rgba(255,255,255,0.6)",marginTop:2}}>{m.role}</div>
                      {dpt&&<div style={{fontSize:12,color:"rgba(255,255,255,0.5)",marginTop:2}}>{dpt.icon} {dpt.label}</div>}
                    </div>
                    <div style={{textAlign:"right"}}>
                      <div style={{fontWeight:900,fontSize:36,color:"#fff"}}>{m.points}</div>
                      <div style={{fontSize:11,color:"rgba(255,255,255,0.5)"}}>total pts</div>
                    </div>
                  </div>
                  <div style={{display:"flex",gap:8}}>
                    {[["✅ Done",dn.length],["⏳ Open",pnd.length],["❌ Missed",ms.length]].map(([l,v])=>(
                      <div key={l} style={{flex:1,background:"rgba(255,255,255,0.12)",borderRadius:10,
                        padding:"10px 6px",textAlign:"center",border:"1px solid rgba(255,255,255,0.1)"}}>
                        <div style={{fontWeight:900,fontSize:22,color:"#fff"}}>{v}</div>
                        <div style={{fontSize:11,color:"rgba(255,255,255,0.55)",marginTop:2}}>{l}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Progress chart */}
                {m.history.length>1&&(
                  <>
                    <div className="sec" style={{marginTop:18}}>Progress</div>
                    <div className="card" style={{padding:"18px 12px 10px",marginBottom:16}}>
                      <ResponsiveContainer width="100%" height={140}>
                        <LineChart data={m.history}>
                          <XAxis dataKey="date" tick={{fill:"#94A3B8",fontSize:10}} axisLine={false} tickLine={false}/>
                          <YAxis hide/>
                          <Tooltip contentStyle={{background:"#fff",border:"1px solid #E2E8F0",
                            borderRadius:10,fontFamily:"Nunito",fontSize:13}}
                            labelStyle={{color:"#1E293B"}} itemStyle={{color:dpt?.color||"#2563EB"}}/>
                          <Line type="monotone" dataKey="points" stroke={dpt?.color||"#2563EB"}
                            strokeWidth={2.5} dot={{fill:dpt?.color||"#2563EB",r:4,strokeWidth:0}} activeDot={{r:6}}/>
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </>
                )}

                {/* History */}
                {m.history.length>0&&(
                  <>
                    <div className="sec" style={{marginTop:16}}>Activity</div>
                    <div className="card" style={{overflow:"hidden",marginBottom:16}}>
                      {[...m.history].reverse().map((h,hi)=>(
                        <div key={hi} className="tr" style={{padding:"11px 16px",display:"flex",alignItems:"center",gap:10}}>
                          <div style={{width:30,height:30,borderRadius:"50%",flexShrink:0,
                            background:h.type==="done"?"#DCFCE7":h.type==="missed"?"#FEE2E2":"#EDE9FE",
                            display:"flex",alignItems:"center",justifyContent:"center",fontSize:13}}>
                            {h.type==="done"?"✅":h.type==="missed"?"❌":"🤝"}
                          </div>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{fontSize:13,color:"#1E293B",fontWeight:600}}>
                              {h.type==="collab"?h.note||h.task:h.task}
                            </div>
                            <div style={{fontSize:10,color:"#94A3B8",fontFamily:"Fira Code,monospace",marginTop:1}}>{h.fullDate||h.date}</div>
                          </div>
                          <div style={{textAlign:"right",flexShrink:0}}>
                            {h.earned>0&&<div style={{fontWeight:800,fontSize:14,color:"#2563EB"}}>+{h.earned}</div>}
                            {h.type==="missed"&&<div style={{fontWeight:600,color:"#DC2626"}}>—</div>}
                            <div style={{fontSize:10,color:"#94A3B8",marginTop:1}}>{h.points}pts</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {/* Tasks */}
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                  <div className="sec" style={{marginBottom:0}}>Tasks</div>
                  <div style={{fontSize:12,fontWeight:700,color:pnd.length>=MAX_TASKS?"#DC2626":"#94A3B8"}}>
                    {pnd.length}/{MAX_TASKS} pending
                  </div>
                </div>
                <div className="card" style={{overflow:"hidden"}}>
                  {m.tasks.length===0&&<div style={{padding:28,textAlign:"center",color:"#94A3B8",fontSize:14,fontWeight:600}}>No tasks yet</div>}
                  {m.tasks.map(t=><TaskRow key={t.id} t={t} m={m}/>)}
                </div>
              </div>
            );
          })()}

          {/* ══ FOUNDERS PANEL ══ */}
          {view==="founder"&&founderUnlocked&&(
            <div>
              <div style={{background:"linear-gradient(135deg,#0F172A,#1E3A8A)",borderRadius:14,
                padding:22,marginBottom:20,color:"#fff"}}>
                <div style={{fontWeight:900,fontSize:20,marginBottom:4}}>🔐 Founders Panel</div>
                <div style={{fontSize:13,color:"rgba(255,255,255,0.6)"}}>
                  Full visibility across all 20 members and 6 departments.
                </div>
              </div>

              {/* Dept summaries */}
              <div className="sec">Department Overview</div>
              <div className="g3" style={{marginBottom:24}}>
                {deptStats.map(d=>(
                  <div key={d.id} className="dept-card" onClick={()=>goDept(d.id)}>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                      <div style={{fontSize:22}}>{d.icon}</div>
                      <div style={{flex:1}}>
                        <div style={{fontWeight:800,fontSize:14,color:"#1E293B"}}>{d.label}</div>
                        <div style={{fontSize:11,color:"#94A3B8"}}>{d.members.length} members</div>
                      </div>
                      <div style={{fontWeight:900,color:d.color,fontSize:17}}>{d.pct}%</div>
                    </div>
                    <div className="pb-bg"><div className="pb" style={{width:`${d.pct}%`,background:d.color}}/></div>
                    <div style={{display:"flex",justifyContent:"space-between",marginTop:8,fontSize:12,fontWeight:600}}>
                      <span style={{color:"#64748B"}}>{d.done}/{d.total} tasks</span>
                      <span style={{color:d.color}}>{d.pts} pts</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* All members table */}
              <div className="sec">All Members</div>
              <div className="card" style={{overflow:"hidden"}}>
                {sorted.map((m,i)=><MemberRow key={m.id} m={m} rank={i+1}/>)}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ════════ BOTTOM NAV ════════ */}
      <nav className="bnav">
        {[...NAV,{id:"founder",label:"Founders",ico:"🔐"}].map(n=>{
          const on=view===n.id||(view==="member"&&n.id==="leaderboard")||(view==="dept"&&n.id==="dashboard");
          return(
            <button key={n.id} className="bni btn" onClick={()=>{
              if(n.id==="founder")founderUnlocked?goV("founder"):setModal("pin");
              else goV(n.id);
            }}>
              <div style={{fontSize:18}}>{n.ico}</div>
              <div style={{fontSize:9,fontWeight:on?700:500,fontFamily:"Nunito,sans-serif",
                color:on?"#60A5FA":"rgba(255,255,255,0.35)"}}>{n.label}</div>
            </button>
          );
        })}
      </nav>

      {/* ════════ MODAL — ASSIGN TASK ════════ */}
      {modal==="task"&&(
        <div className="overlay" onClick={()=>setModal(null)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div className="mhandle monly"/>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
              <div style={{fontWeight:800,fontSize:19,color:"#1E293B"}}>Assign Task</div>
              <button className="btn ibtn" onClick={()=>setModal(null)} style={{fontSize:18}}>✕</button>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:13}}>
              <div>
                <div className="lbl">Task Title *</div>
                <input placeholder="What needs to be done?" value={tf.title} onChange={e=>setTf(p=>({...p,title:e.target.value}))}/>
              </div>
              <div>
                <div className="lbl">Description</div>
                <textarea placeholder="Optional details…" rows={2} value={tf.desc}
                  onChange={e=>setTf(p=>({...p,desc:e.target.value}))} style={{resize:"none"}}/>
              </div>
              <div>
                <div className="lbl">Department</div>
                <select value={tf.dept||""} onChange={e=>setTf(p=>({...p,dept:e.target.value,assignee:""}))}>
                  <option value="">All departments</option>
                  {DEPARTMENTS.map(d=><option key={d.id} value={d.id}>{d.icon} {d.label}</option>)}
                </select>
              </div>
              <div>
                <div className="lbl">Assign To *</div>
                <select value={tf.assignee} onChange={e=>setTf(p=>({...p,assignee:e.target.value}))}>
                  <option value="">Select member</option>
                  {nonFounders
                    .filter(m=>!tf.dept||m.dept===tf.dept)
                    .map(m=>{
                      const pCount=m.tasks.filter(t=>t.status==="pending").length;
                      const full=pCount>=MAX_TASKS;
                      const dpt=getDept(m.dept);
                      return(
                        <option key={m.id} value={m.id} disabled={full}>
                          {m.name} ({dpt?.label}){m.isLead?" ★":""}{full?" — FULL":""}
                        </option>
                      );
                    })}
                </select>
              </div>
              <div className="g2">
                <div>
                  <div className="lbl">Deadline *</div>
                  <input type="date" value={tf.deadline} onChange={e=>setTf(p=>({...p,deadline:e.target.value}))}/>
                </div>
                <div>
                  <div className="lbl">Points</div>
                  <input type="number" min={1} max={100} value={tf.points}
                    onChange={e=>setTf(p=>({...p,points:e.target.value}))}/>
                </div>
              </div>
            </div>
            <div style={{display:"flex",gap:10,marginTop:20}}>
              <button className="btn bgho" style={{flex:1}} onClick={()=>setModal(null)}>Cancel</button>
              <button className="btn bblu" style={{flex:1}} onClick={addTask}>Assign →</button>
            </div>
          </div>
        </div>
      )}

      {/* ════════ MODAL — LOG HELP ════════ */}
      {modal==="help"&&(
        <div className="overlay" onClick={()=>setModal(null)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div className="mhandle monly"/>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
              <div style={{fontWeight:800,fontSize:19,color:"#1E293B"}}>Log Help</div>
              <button className="btn ibtn" onClick={()=>setModal(null)} style={{fontSize:18}}>✕</button>
            </div>
            <div style={{fontSize:13,color:"#94A3B8",fontWeight:500,marginBottom:18}}>
              Current task points split 50/50 between both members.
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:13}}>
              <div>
                <div className="lbl">Who helped? 🙋</div>
                <select value={hf.helper} onChange={e=>setHf({helper:e.target.value,needer:""})}>
                  <option value="">Select helper</option>
                  {allMembers.map(m=>{
                    const dpt=getDept(m.dept);
                    return <option key={m.id} value={m.id}>{m.name} — {dpt?.label||"Founders"}</option>;
                  })}
                </select>
              </div>
              <div>
                <div className="lbl">Who asked for help? 🙏</div>
                <select value={hf.needer} onChange={e=>setHf(p=>({...p,needer:e.target.value}))} disabled={!hf.helper}>
                  <option value="">Select member</option>
                  {allMembers.filter(m=>m.id!==Number(hf.helper)).map(m=>{
                    const dpt=getDept(m.dept);
                    return <option key={m.id} value={m.id}>{m.name} — {dpt?.label||"Founders"}</option>;
                  })}
                </select>
              </div>
              {neederM&&(
                neederPend.length===0
                  ?<div style={{background:"#FEF2F2",border:"1px solid #FECACA",borderRadius:10,
                    padding:"12px 14px",fontSize:13,color:"#B91C1C",fontWeight:600}}>
                    ⚠ {neederM.name} has no pending tasks
                  </div>
                  :<div style={{background:"#F8FAFC",border:"1.5px solid #E2E8F0",borderRadius:10,padding:"12px 14px"}}>
                    <div style={{fontSize:10,color:"#94A3B8",fontWeight:600,marginBottom:5,
                      textTransform:"uppercase",letterSpacing:".06em"}}>Current task (auto-selected)</div>
                    <div style={{fontWeight:800,fontSize:15,color:"#1E293B",marginBottom:3}}>"{autoTask.title}"</div>
                    <div style={{fontSize:12,color:"#94A3B8",fontFamily:"Fira Code,monospace"}}>
                      <span style={{color:"#2563EB",fontWeight:700}}>{autoTask.points} pts total</span>
                      <span style={{marginLeft:10}}>Due {fmt(autoTask.deadline)}</span>
                    </div>
                  </div>
              )}
              {canHelp&&(
                <div style={{background:"#EDE9FE",border:"1px solid #C4B5FD",borderRadius:10,padding:"14px"}}>
                  <div style={{fontWeight:800,fontSize:13,color:"#5B21B6",marginBottom:10}}>🤝 Points Split</div>
                  <div style={{display:"flex",gap:10}}>
                    {[{m:neederM,role:"asked"},{m:helperM,role:"helped"}].map(({m:mm,role})=>{
                      const dpt=getDept(mm.dept);
                      return(
                        <div key={mm.id} style={{flex:1,background:"#fff",borderRadius:8,padding:"10px",
                          textAlign:"center",border:"1px solid #C4B5FD"}}>
                          <Av label={mm.avatar} color={dpt?.color||"#7C3AED"} light={dpt?.light} size={28} fs={10}/>
                          <div style={{fontWeight:700,fontSize:12,color:"#1E293B",marginTop:5}}>{mm.name}</div>
                          <div style={{fontSize:10,color:"#94A3B8",marginBottom:4}}>{role}</div>
                          <div style={{fontWeight:900,fontSize:22,color:"#7C3AED"}}>+{halfPts}</div>
                          <div style={{fontSize:10,color:"#94A3B8"}}>pts</div>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{fontSize:11,color:"#6D28D9",fontWeight:600,textAlign:"center",marginTop:10}}>
                    {autoTask.points} pts → {halfPts} + {halfPts}
                    {autoTask.points%2!==0&&<span style={{color:"#94A3B8"}}> (1 remainder dropped)</span>}
                  </div>
                </div>
              )}
            </div>
            <div style={{display:"flex",gap:10,marginTop:20}}>
              <button className="btn bgho" style={{flex:1}} onClick={()=>setModal(null)}>Cancel</button>
              <button className="btn bblu"
                style={{flex:1,background:canHelp?"#7C3AED":"#CBD5E1",cursor:canHelp?"pointer":"not-allowed"}}
                disabled={!canHelp} onClick={addHelp}>Log Help →</button>
            </div>
          </div>
        </div>
      )}

      {/* ════════ MODAL — PIN ════════ */}
      {modal==="pin"&&(
        <div className="overlay" onClick={()=>setModal(null)}>
          <div className="modal" onClick={e=>e.stopPropagation()} style={{maxWidth:380}}>
            <div className="mhandle monly"/>
            <div style={{textAlign:"center",marginBottom:6}}>
              <div style={{fontSize:36,marginBottom:8}}>🔐</div>
              <div style={{fontWeight:900,fontSize:20,color:"#1E293B"}}>Founders Panel</div>
              <div style={{fontSize:13,color:"#94A3B8",marginTop:4}}>Enter your 4-digit PIN to continue</div>
            </div>
            <div className="pin-box">
              {pin.map((v,i)=>(
                <input key={i} id={`pin-${i}`} className="pin-digit" type="password"
                  maxLength={1} value={v} onChange={e=>handlePin(i,e.target.value)}
                  onKeyDown={e=>{
                    if(e.key==="Backspace"&&!v&&i>0)document.getElementById(`pin-${i-1}`)?.focus();
                    if(e.key==="Enter")checkPin();
                  }}
                  style={{borderColor:pinError?"#DC2626":"#E2E8F0"}}/>
              ))}
            </div>
            {pinError&&(
              <div style={{textAlign:"center",fontSize:13,color:"#DC2626",fontWeight:700,marginBottom:8}}>
                ❌ Incorrect PIN. Try again.
              </div>
            )}
            <div style={{display:"flex",gap:10,marginTop:8}}>
              <button className="btn bgho" style={{flex:1}} onClick={()=>{setModal(null);setPin(["","","",""]);}}>Cancel</button>
              <button className="btn bblu" style={{flex:1}} onClick={checkPin}>Unlock →</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}