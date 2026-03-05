// src/pages/TeamTracker.jsx
import { useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from "recharts";
import { db } from "../firebaseConfig";
import { doc, setDoc, onSnapshot } from "firebase/firestore";

const FIRESTORE_DOC = "tracker/state";
const INITIAL_MEMBERS = [
  { id: 1, name: "Sanjeev",  role: "Lead / Hardware", avatar: "SJ" },
  { id: 2, name: "Member 2", role: "Frontend",        avatar: "M2" },
  { id: 3, name: "Member 3", role: "Backend",         avatar: "M3" },
  { id: 4, name: "Member 4", role: "ML / EEG",        avatar: "M4" },
  { id: 5, name: "Member 5", role: "Speech",          avatar: "M5" },
];
const defaultState = () => ({ members: INITIAL_MEMBERS.map(m=>({...m,points:0,history:[],tasks:[]})), taskIdCounter:1 });
const now    = () => new Date().toISOString();
const fmt    = (iso) => new Date(iso).toLocaleDateString("en-IN",{day:"2-digit",month:"short"});
const isPast = (d) => new Date(d) < new Date();

// Professional palette — no gaming colors
const COLORS = ["#C9A84C","#6B8CAE","#7E6B9E","#4A8C6E","#9E5A5A"];
const RANKS  = ["👑","②","③","④","⑤"];
const getRef = () => { const [c,d]=FIRESTORE_DOC.split("/"); return doc(db,c,d); };

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500&family=IBM+Plex+Sans:wght@300;400;500;600;700&display=swap');
html,body,#root{background:#0F0F0F !important;margin:0;padding:0;width:100%}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{-webkit-text-size-adjust:100%}
::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:#161616}::-webkit-scrollbar-thumb{background:#555;border-radius:2px}

.btn{cursor:pointer;border:none;outline:none;transition:all 0.15s ease}
.btn:active{transform:scale(0.97);opacity:0.8}

/* Cards — slightly lighter than bg with visible border */
.card{background:#161616;border:1px solid #252525;border-radius:10px;width:100%}

/* Tags — muted, professional */
.tag{padding:3px 8px;border-radius:4px;font-size:11px;font-weight:500;white-space:nowrap;font-family:'IBM Plex Mono',monospace}
.tag-done   {background:#0F1F16;color:#6DBF8A;border:1px solid #1E4030}
.tag-missed {background:#1F0F0F;color:#C97A7A;border:1px solid #3D1F1F}
.tag-pending{background:#1A180E;color:#C4A84A;border:1px solid #3A3020}
.tag-late   {background:#1F160E;color:#C49060;border:1px solid #3A2A18}

/* Inputs */
input,textarea,select{
  background:#111;border:1px solid #2A2A2A;color:#E2E2E2;
  border-radius:8px;padding:11px 16px;
  font-family:'IBM Plex Mono',monospace;font-size:16px;
  width:100%;outline:none;transition:border 0.2s;
  -webkit-appearance:none;appearance:none
}
input:focus,textarea:focus,select:focus{border-color:#C9A84C}
select option{background:#161616}
input[type="date"]::-webkit-calendar-picker-indicator{filter:invert(0.5)}

/* Modal overlay */
.overlay{position:fixed;inset:0;background:rgba(0,0,0,0.88);display:flex;align-items:flex-end;justify-content:center;z-index:200}
@media(min-width:640px){.overlay{align-items:center;padding:20px}}
.modal{background:#161616;border:1px solid #252525;border-radius:16px 16px 0 0;padding:22px 20px 36px;width:100%;max-height:92vh;overflow-y:auto}
@media(min-width:640px){.modal{border-radius:16px;max-width:480px;padding:28px}}

/* Nav pills */
.npill{padding:8px 16px;border-radius:8px;font-family:'IBM Plex Sans',sans-serif;font-size:16px;font-weight:500;letter-spacing:.02em;white-space:nowrap}
.non {background:#C9A84C;color:#0F0F0F}
.noff{background:transparent;color:#666;border:1px solid #252525}
.noff:hover{color:#999;border-color:#555}

/* Action buttons */
.abtn{padding:6px 16px;border-radius:6px;font-size:16px;font-family:'IBM Plex Mono',monospace;font-weight:500;white-space:nowrap}

/* Row hover */
.rh{transition:background 0.1s}.rh:hover{background:#1A1A1A;cursor:pointer}

.pulse{animation:pulse 2s infinite}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
@keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
.fi{animation:fadeUp 0.2s ease forwards}
@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
.su{animation:slideUp 0.2s ease forwards}

/* Bottom nav */
.bnav{position:fixed;bottom:0;left:0;right:0;background:#111;border-top:1px solid #1E1E1E;display:flex;z-index:100;padding-bottom:env(safe-area-inset-bottom,0px)}
.bni{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:10px 4px 8px;gap:3px;cursor:pointer;border:none;background:none;outline:none;transition:background .1s}
.bni:active{background:#1A1A1A}

/* Responsive nav */
.dnav{display:none}
.mbnav{display:flex}
@media(min-width:768px){.bnav{display:none}.dnav{display:flex}.mbnav{display:none}.pg{padding:28px 32px 32px;width:100%;box-sizing:border-box}}
@media(max-width:767px){.pg{padding:16px 16px 84px;width:100%;box-sizing:border-box}}

.g2{display:grid;grid-template-columns:1fr 1fr;gap:10px}

/* Live badge */
.sync{display:inline-flex;align-items:center;gap:5px;font-size:11px;color:#6DBF8A;background:#0F1F16;border:1px solid #1E4030;border-radius:4px;padding:3px 8px;font-family:'IBM Plex Mono',monospace}
.sdot{width:5px;height:5px;border-radius:50%;background:#6DBF8A;animation:pulse 2s infinite}

/* Loading dots */
.ldot{width:7px;height:7px;border-radius:50%;background:#C9A84C;animation:ld 1.2s ease-in-out infinite}
.ldot:nth-child(2){animation-delay:.2s}.ldot:nth-child(3){animation-delay:.4s}
@keyframes ld{0%,80%,100%{transform:scale(.6);opacity:.3}40%{transform:scale(1);opacity:1}}

/* Divider */
.hdivider{width:1px;height:18px;background:#252525;margin:0 6px}
`;

// ── Small components ────────────────────────────────────────
function Av({label,color,size=38,fs=16}){
  return(
    <div style={{width:size,height:size,borderRadius:"50%",background:color+"18",border:`1.5px solid ${color}50`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:fs,fontWeight:600,color,flexShrink:0,fontFamily:"'IBM Plex Sans',sans-serif"}}>
      {label}
    </div>
  );
}
function SL({children}){
  return <div style={{fontSize:11,color:"#444",letterSpacing:".08em",textTransform:"uppercase",marginBottom:10,fontFamily:"'IBM Plex Mono',monospace"}}>{children}</div>;
}
function Empty({t}){
  return <div style={{textAlign:"center",padding:"52px 20px",color:"#555",fontSize:16,fontFamily:"'IBM Plex Sans',sans-serif"}}>{t}</div>;
}

// ── Firebase ────────────────────────────────────────────────
export default function TeamTracker(){
  const [state,setState]   = useState(null);
  const [loading,setLoading]= useState(true);
  const [saving,setSaving]  = useState(false);
  const [view,setView]      = useState("dashboard");
  const [sel,setSel]        = useState(null);
  const [modal,setModal]    = useState(null);
  const [skip,setSkip]      = useState(false);
  const [tf,setTf]          = useState({title:"",desc:"",assignee:"",deadline:"",points:10});
  const [hf,setHf]          = useState({from:"",to:"",note:""});

  useEffect(()=>{
    const ref=getRef();
    const unsub=onSnapshot(ref,(snap)=>{
      if(snap.exists()){setSkip(true);setState(snap.data());}
      else{const i=defaultState();setDoc(ref,i);setState(i);}
      setLoading(false);
    },(e)=>{console.error(e);setState(defaultState());setLoading(false);});
    return()=>unsub();
  },[]);

  useEffect(()=>{
    if(!state||loading)return;
    if(skip){setSkip(false);return;}
    setSaving(true);
    const t=setTimeout(async()=>{try{await setDoc(getRef(),state);}catch(e){console.error(e);}setSaving(false);},700);
    return()=>clearTimeout(t);
  },[state]);

  const upd=(fn)=>setState(prev=>{const n=JSON.parse(JSON.stringify(prev));fn(n);return n;});
  const getM=(id)=>state?.members.find(m=>m.id===id);

  const addTask=()=>{
    if(!tf.title||!tf.assignee||!tf.deadline)return;
    upd(s=>{const m=s.members.find(m=>m.id===Number(tf.assignee));m.tasks.push({id:s.taskIdCounter++,title:tf.title,desc:tf.desc,deadline:tf.deadline,points:Number(tf.points),status:"pending",createdAt:now()});});
    setTf({title:"",desc:"",assignee:"",deadline:"",points:10});setModal(null);
  };
  const doneTask=(mid,tid)=>upd(s=>{
    const m=s.members.find(m=>m.id===mid);const t=m.tasks.find(t=>t.id===tid);
    if(t.status!=="pending")return;
    t.status="done";t.completedAt=now();m.points+=t.points;
    m.history.push({date:fmt(now()),points:m.points,event:`✅ "${t.title}" +${t.points}pts`});
  });
  const missTask=(mid,tid)=>upd(s=>{
    const m=s.members.find(m=>m.id===mid);const t=m.tasks.find(t=>t.id===tid);
    if(t.status!=="pending")return;
    t.status="missed";t.missedAt=now();
    m.history.push({date:fmt(now()),points:m.points,event:`⚠️ Missed "${t.title}"`});
  });
  const addHelp=()=>{
    if(!hf.from||!hf.to||hf.from===hf.to)return;
    upd(s=>{const m=s.members.find(m=>m.id===Number(hf.from));m.points+=5;m.history.push({date:fmt(now()),points:m.points,event:`🤝 Helped ${getM(Number(hf.to))?.name} +5pts`});});
    setHf({from:"",to:"",note:""});setModal(null);
  };
  const goM=(id)=>{setSel(id);setView("member");};
  const goV=(v)=>{setView(v);if(v!=="member")setSel(null);};

  // Loading screen
  if(loading||!state)return(
    <div style={{background:"#0F0F0F",minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:22}}>
      <style>{CSS}</style>
      <div style={{fontFamily:"'IBM Plex Sans',sans-serif",fontWeight:700,fontSize:20,color:"#E2E2E2",letterSpacing:"-0.01em"}}>
        INORA <span style={{color:"#C9A84C"}}>·</span> Team
      </div>
      <div style={{display:"flex",gap:7}}><div className="ldot"/><div className="ldot"/><div className="ldot"/></div>
      <div style={{fontSize:11,color:"#555",fontFamily:"IBM Plex Mono,monospace"}}>connecting to firebase...</div>
    </div>
  );

  const sorted=[...state.members].sort((a,b)=>b.points-a.points);
  const maxP=Math.max(...state.members.map(m=>m.points),1);
  const NAV=[{id:"dashboard",label:"Board",icon:"▦"},{id:"tasks",label:"Tasks",icon:"≡"},{id:"history",label:"History",icon:"◴"}];

  // Task row component
  const TaskRow=({t,m})=>{
    const ov=isPast(t.deadline)&&t.status==="pending";
    return(
      <div style={{padding:"16px 18px",borderBottom:"1px solid #1E1E1E"}}>
        <div style={{display:"flex",alignItems:"flex-start",gap:16}}>
          <div style={{flex:1,minWidth:0}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:5,flexWrap:"wrap"}}>
              <span style={{fontSize:16,fontWeight:500,color:"#E2E2E2",fontFamily:"'IBM Plex Sans',sans-serif"}}>{t.title}</span>
              {t.status==="done"   &&<span className="tag tag-done">done</span>}
              {t.status==="missed" &&<span className="tag tag-missed">missed</span>}
              {t.status==="pending"&&!ov&&<span className="tag tag-pending">pending</span>}
              {t.status==="pending"&&ov &&<span className="tag tag-late">overdue</span>}
            </div>
            {t.desc&&<div style={{fontSize:16,color:"#666",marginBottom:5,fontFamily:"'IBM Plex Sans',sans-serif"}}>{t.desc}</div>}
            <div style={{fontSize:16,color:"#555",fontFamily:"'IBM Plex Mono',monospace"}}>
              Due <span style={{color:ov&&t.status==="pending"?"#C97A7A":"#777"}}>{fmt(t.deadline)}</span>
              <span style={{marginLeft:10,color:"#C9A84C"}}>+{t.points} pts</span>
            </div>
          </div>
          {t.status==="pending"&&(
            <div style={{display:"flex",gap:6,flexShrink:0}}>
              <button className="btn abtn" style={{background:"#0F1F16",color:"#6DBF8A",border:"1px solid #1E4030"}} onClick={()=>doneTask(m.id,t.id)}>✓ Done</button>
              <button className="btn abtn" style={{background:"#1F0F0F",color:"#C97A7A",border:"1px solid #3D1F1F"}} onClick={()=>missTask(m.id,t.id)}>✗ Miss</button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return(
    <div style={{fontFamily:"'IBM Plex Sans',sans-serif",background:"#0F0F0F",minHeight:"100vh",width:"100%",color:"#E2E2E2"}}>
      <style>{CSS}</style>

      {/* HEADER */}
      <div style={{borderBottom:"1px solid #1E1E1E",padding:"16px 24px",display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,background:"#0F0F0F",zIndex:50}}>
        <div style={{display:"flex",alignItems:"center",gap:16}}>
          <div>
            <div style={{fontFamily:"'IBM Plex Sans',sans-serif",fontWeight:700,fontSize:16,letterSpacing:"-0.01em",color:"#F0F0F0"}}>
              INORA <span style={{color:"#C9A84C"}}>·</span> Team
            </div>
            <div style={{fontSize:14,color:"#3A3A3A",marginTop:1,fontFamily:"'IBM Plex Mono',monospace"}}>accountability tracker</div>
          </div>
          {saving
            ?<div style={{fontSize:10,color:"#444",fontFamily:"IBM Plex Mono,monospace"}}>syncing…</div>
            :<div className="sync"><div className="sdot"/>live</div>
          }
        </div>

        {/* Desktop nav */}
        <div className="dnav" style={{gap:6,alignItems:"center"}}>
          {NAV.map(n=>(
            <button key={n.id} className={`btn npill ${view===n.id||(view==="member"&&n.id==="dashboard")?"non":"noff"}`} onClick={()=>goV(n.id)}>
              {n.label}
            </button>
          ))}
          <div className="hdivider"/>
          <button className="btn npill noff" onClick={()=>setModal("task")}>+ Assign Task</button>
          <button className="btn npill" style={{background:"#0F1F16",color:"#6DBF8A",border:"1px solid #1E4030",fontSize:16}} onClick={()=>setModal("help")}>🤝 Log Help</button>
        </div>

        {/* Mobile buttons */}
        <div className="mbnav" style={{gap:8}}>
          <button className="btn" style={{padding:"8px 16px",background:"#1A1A1A",color:"#C9A84C",border:"1px solid #2A2A2A",borderRadius:8,fontSize:16,fontFamily:"IBM Plex Sans,sans-serif",fontWeight:500}} onClick={()=>setModal("task")}>+ Task</button>
          <button className="btn" style={{padding:"8px 11px",background:"#0F1F16",color:"#6DBF8A",border:"1px solid #1E4030",borderRadius:8,fontSize:16}} onClick={()=>setModal("help")}>🤝</button>
        </div>
      </div>

      {/* PAGE */}
      <div className="pg" style={{maxWidth:"100%",margin:"0",width:"100%"}}>

        {/* ── DASHBOARD ── */}
        {view==="dashboard"&&(
          <div className="fi">
            <SL>Leaderboard</SL>
            <div className="card" style={{marginBottom:24,overflow:"hidden"}}>
              {sorted.map((m,i)=>(
                <div key={m.id} className="rh" onClick={()=>goM(m.id)}
                  style={{display:"flex",alignItems:"center",padding:"16px 20px",borderBottom:i<sorted.length-1?"1px solid #1E1E1E":"none",gap:16}}>
                  <div style={{width:24,fontSize:16,textAlign:"center",flexShrink:0}}>{RANKS[i]}</div>
                  <Av label={m.avatar} color={COLORS[i%COLORS.length]} size={38}/>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6,flexWrap:"wrap"}}>
                      <span style={{fontFamily:"'IBM Plex Sans',sans-serif",fontWeight:600,fontSize:15,color:"#F0F0F0"}}>{m.name}</span>
                      <span style={{fontSize:16,color:"#555",fontFamily:"'IBM Plex Mono',monospace"}}>{m.role}</span>
                    </div>
                    <div style={{background:"#1A1A1A",borderRadius:3,height:3,overflow:"hidden"}}>
                      <div style={{height:"100%",width:`${(m.points/maxP)*100}%`,background:COLORS[i%COLORS.length],borderRadius:3,transition:"width 0.8s ease"}}/>
                    </div>
                  </div>
                  <div style={{textAlign:"right",flexShrink:0,minWidth:60}}>
                    <div style={{fontFamily:"'IBM Plex Sans',sans-serif",fontWeight:700,fontSize:22,color:COLORS[i%COLORS.length]}}>{m.points}</div>
                    <div style={{fontSize:10,color:"#444",fontFamily:"IBM Plex Mono,monospace"}}>pts</div>
                  </div>
                </div>
              ))}
            </div>

            <SL>Points Overview</SL>
            <div className="card" style={{padding:"18px 10px 10px",marginBottom:24}}>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={sorted} barSize={32}>
                  <XAxis dataKey="name" tick={{fill:"#555",fontSize:11,fontFamily:"IBM Plex Mono"}} axisLine={false} tickLine={false}/>
                  <YAxis hide/>
                  <Tooltip contentStyle={{background:"#161616",border:"1px solid #252525",borderRadius:8,fontFamily:"IBM Plex Mono",fontSize:11}} labelStyle={{color:"#E2E2E2"}} itemStyle={{color:"#C9A84C"}}/>
                  <Bar dataKey="points" radius={[5,5,0,0]}>
                    {sorted.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]} fillOpacity={0.9}/>)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <SL>Members</SL>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill, minmax(160px, 1fr))",gap:16}}>
              {state.members.map((m,i)=>{
                const pend=m.tasks.filter(t=>t.status==="pending");
                const ovd=pend.filter(t=>isPast(t.deadline));
                const dn=m.tasks.filter(t=>t.status==="done");
                return(
                  <div key={m.id} className="card rh" onClick={()=>goM(m.id)}
                    style={{padding:16,cursor:"pointer",borderColor:ovd.length>0?"#3D1F1F":"#252525",transition:"border-color 0.2s"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
                      <Av label={m.avatar} color={COLORS[i%COLORS.length]} size={34}/>
                      {ovd.length>0&&<div className="pulse tag tag-missed" style={{fontSize:10}}>⚠ {ovd.length} late</div>}
                    </div>
                    <div style={{fontFamily:"'IBM Plex Sans',sans-serif",fontWeight:600,fontSize:16,color:"#F0F0F0",marginBottom:3}}>{m.name}</div>
                    <div style={{fontSize:11,color:"#555",marginBottom:10,fontFamily:"'IBM Plex Mono',monospace"}}>{m.role}</div>
                    <div style={{display:"flex",gap:6,fontSize:16,fontFamily:"'IBM Plex Mono',monospace"}}>
                      <span style={{color:"#6DBF8A"}}>{dn.length} done</span>
                      <span style={{color:"#555"}}>·</span>
                      <span style={{color:"#C4A84A"}}>{pend.length} open</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── TASKS ── */}
        {view==="tasks"&&(
          <div className="fi">
            {state.members.map((m,mi)=>{
              if(m.tasks.length===0)return null;
              return(
                <div key={m.id} style={{marginBottom:24}}>
                  <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
                    <Av label={m.avatar} color={COLORS[mi%COLORS.length]} size={28}/>
                    <span style={{fontFamily:"'IBM Plex Sans',sans-serif",fontWeight:600,fontSize:15,color:"#F0F0F0"}}>{m.name}</span>
                    <span style={{fontSize:16,color:"#555",fontFamily:"'IBM Plex Mono',monospace"}}>
                      {m.tasks.filter(t=>t.status==="pending").length} pending · {m.tasks.filter(t=>t.status==="done").length} done
                    </span>
                  </div>
                  <div className="card" style={{overflow:"hidden"}}>
                    {m.tasks.map(t=><TaskRow key={t.id} t={t} m={m}/>)}
                  </div>
                </div>
              );
            })}
            {state.members.every(m=>m.tasks.length===0)&&<Empty t="No tasks yet. Click + Assign Task to get started."/>}
          </div>
        )}

        {/* ── HISTORY ── */}
        {view==="history"&&(
          <div className="fi">
            {state.members.map((m,mi)=>{
              if(m.history.length===0)return null;
              return(
                <div key={m.id} style={{marginBottom:24}}>
                  <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
                    <Av label={m.avatar} color={COLORS[mi%COLORS.length]} size={28}/>
                    <span style={{fontFamily:"'IBM Plex Sans',sans-serif",fontWeight:600,fontSize:15,color:"#F0F0F0"}}>{m.name}</span>
                  </div>
                  <div className="card" style={{overflow:"hidden"}}>
                    {[...m.history].reverse().map((h,hi)=>(
                      <div key={hi} style={{padding:"16px 18px",borderBottom:hi<m.history.length-1?"1px solid #1E1E1E":"none",display:"flex",alignItems:"center",gap:16}}>
                        <div style={{fontSize:11,color:"#444",minWidth:50,fontFamily:"'IBM Plex Mono',monospace"}}>{h.date}</div>
                        <div style={{flex:1,fontSize:16,color:"#C0C0C0",fontFamily:"'IBM Plex Sans',sans-serif"}}>{h.event}</div>
                        <div style={{fontSize:16,fontWeight:600,fontFamily:"'IBM Plex Sans',sans-serif",color:COLORS[mi%COLORS.length]}}>{h.points} pts</div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
            {state.members.every(m=>m.history.length===0)&&<Empty t="No activity yet."/>}
          </div>
        )}

        {/* ── MEMBER DETAIL ── */}
        {view==="member"&&sel&&(()=>{
          const m=getM(sel);if(!m)return null;
          const mi=state.members.findIndex(x=>x.id===sel);
          const col=COLORS[mi%COLORS.length];
          const dn=m.tasks.filter(t=>t.status==="done");
          const pnd=m.tasks.filter(t=>t.status==="pending");
          const ms=m.tasks.filter(t=>t.status==="missed");
          const ch=m.history.length>1?m.history:null;
          return(
            <div className="fi">
              <button className="btn" style={{fontSize:16,color:"#555",marginBottom:16,background:"none",padding:0,fontFamily:"IBM Plex Sans,sans-serif",display:"flex",alignItems:"center",gap:6}} onClick={()=>{setView("dashboard");setSel(null);}}>
                ← Back
              </button>
              <div className="card" style={{padding:20,marginBottom:16}}>
                <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:18}}>
                  <Av label={m.avatar} color={col} size={52} fs={16}/>
                  <div style={{flex:1}}>
                    <div style={{fontFamily:"'IBM Plex Sans',sans-serif",fontWeight:700,fontSize:20,color:"#F0F0F0"}}>{m.name}</div>
                    <div style={{fontSize:16,color:"#555",fontFamily:"'IBM Plex Mono',monospace"}}>{m.role}</div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontFamily:"'IBM Plex Sans',sans-serif",fontWeight:700,fontSize:30,color:col}}>{m.points}</div>
                    <div style={{fontSize:11,color:"#444",fontFamily:"IBM Plex Mono,monospace"}}>total pts</div>
                  </div>
                </div>
                <div style={{display:"flex",gap:10}}>
                  {[["Done",dn.length,"#6DBF8A"],["Pending",pnd.length,"#C4A84A"],["Missed",ms.length,"#C97A7A"]].map(([l,v,c])=>(
                    <div key={l} style={{flex:1,background:"#111",borderRadius:8,padding:"16px 8px",textAlign:"center",border:"1px solid #1E1E1E"}}>
                      <div style={{fontFamily:"'IBM Plex Sans',sans-serif",fontWeight:700,fontSize:22,color:c}}>{v}</div>
                      <div style={{fontSize:11,color:"#555",marginTop:2}}>{l}</div>
                    </div>
                  ))}
                </div>
              </div>

              <SL>Progress</SL>
              <div className="card" style={{padding:"18px 10px 10px",marginBottom:16}}>
                {ch?(
                  <ResponsiveContainer width="100%" height={160}>
                    <LineChart data={ch}>
                      <XAxis dataKey="date" tick={{fill:"#444",fontSize:10,fontFamily:"IBM Plex Mono"}} axisLine={false} tickLine={false}/>
                      <YAxis hide/>
                      <Tooltip contentStyle={{background:"#161616",border:"1px solid #252525",borderRadius:8,fontFamily:"IBM Plex Mono",fontSize:11}} labelStyle={{color:"#999"}} itemStyle={{color:col}}/>
                      <Line type="monotone" dataKey="points" stroke={col} strokeWidth={2} dot={{fill:col,r:3}} activeDot={{r:5}}/>
                    </LineChart>
                  </ResponsiveContainer>
                ):(
                  <div style={{textAlign:"center",padding:"32px 0",color:"#555",fontSize:16,fontFamily:"IBM Plex Mono,monospace"}}>Complete tasks to see progress chart</div>
                )}
              </div>

              <SL>Tasks</SL>
              <div className="card" style={{overflow:"hidden"}}>
                {m.tasks.length===0&&<div style={{padding:22,textAlign:"center",color:"#555",fontSize:16}}>No tasks assigned yet</div>}
                {m.tasks.map(t=><TaskRow key={t.id} t={t} m={m}/>)}
              </div>
            </div>
          );
        })()}
      </div>

      {/* BOTTOM NAV */}
      <div className="bnav">
        {NAV.map(n=>{
          const on=view===n.id||(n.id==="dashboard"&&view==="member");
          return(
            <button key={n.id} className="bni btn" onClick={()=>goV(n.id)}>
              <div style={{fontSize:18,color:on?"#C9A84C":"#383838"}}>{n.icon}</div>
              <div style={{fontSize:10,color:on?"#C9A84C":"#3A3A3A",fontFamily:"IBM Plex Mono,monospace"}}>{n.label}</div>
            </button>
          );
        })}
      </div>

      {/* MODAL — TASK */}
      {modal==="task"&&(
        <div className="overlay" onClick={()=>setModal(null)}>
          <div className="modal su" onClick={e=>e.stopPropagation()}>
            <div style={{width:36,height:3,background:"#2A2A2A",borderRadius:2,margin:"0 auto 20px"}}/>
            <div style={{fontFamily:"'IBM Plex Sans',sans-serif",fontWeight:700,fontSize:17,marginBottom:16,color:"#F0F0F0"}}>Assign Task</div>
            <div style={{display:"flex",flexDirection:"column",gap:11}}>
              <input placeholder="Task title *" value={tf.title} onChange={e=>setTf(p=>({...p,title:e.target.value}))}/>
              <textarea placeholder="Description (optional)" rows={2} value={tf.desc} onChange={e=>setTf(p=>({...p,desc:e.target.value}))} style={{resize:"none"}}/>
              <select value={tf.assignee} onChange={e=>setTf(p=>({...p,assignee:e.target.value}))}>
                <option value="">Assign to *</option>
                {state.members.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
              <div className="g2">
                <div>
                  <div style={{fontSize:11,color:"#555",marginBottom:6,fontFamily:"IBM Plex Mono,monospace"}}>Deadline *</div>
                  <input type="date" value={tf.deadline} onChange={e=>setTf(p=>({...p,deadline:e.target.value}))}/>
                </div>
                <div>
                  <div style={{fontSize:11,color:"#555",marginBottom:6,fontFamily:"IBM Plex Mono,monospace"}}>Points</div>
                  <input type="number" min={1} value={tf.points} onChange={e=>setTf(p=>({...p,points:e.target.value}))}/>
                </div>
              </div>
            </div>
            <div style={{display:"flex",gap:10,marginTop:18}}>
              <button className="btn" style={{flex:1,padding:"16px",background:"#111",color:"#666",borderRadius:8,border:"1px solid #252525",fontSize:16,fontFamily:"IBM Plex Sans,sans-serif"}} onClick={()=>setModal(null)}>Cancel</button>
              <button className="btn" style={{flex:1,padding:"16px",background:"#C9A84C",color:"#0F0F0F",borderRadius:8,fontSize:16,fontFamily:"IBM Plex Sans,sans-serif",fontWeight:600}} onClick={addTask}>Assign →</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL — HELP */}
      {modal==="help"&&(
        <div className="overlay" onClick={()=>setModal(null)}>
          <div className="modal su" onClick={e=>e.stopPropagation()}>
            <div style={{width:36,height:3,background:"#2A2A2A",borderRadius:2,margin:"0 auto 20px"}}/>
            <div style={{fontFamily:"'IBM Plex Sans',sans-serif",fontWeight:700,fontSize:17,marginBottom:4,color:"#F0F0F0"}}>Log Help</div>
            <div style={{fontSize:16,color:"#555",marginBottom:16,fontFamily:"IBM Plex Mono,monospace"}}>+5 bonus points awarded to the helper</div>
            <div style={{display:"flex",flexDirection:"column",gap:11}}>
              <select value={hf.from} onChange={e=>setHf(p=>({...p,from:e.target.value}))}>
                <option value="">Who helped? *</option>
                {state.members.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
              <select value={hf.to} onChange={e=>setHf(p=>({...p,to:e.target.value}))}>
                <option value="">Helped whom? *</option>
                {state.members.filter(m=>m.id!==Number(hf.from)).map(m=><option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
              <input placeholder="Note (optional)" value={hf.note} onChange={e=>setHf(p=>({...p,note:e.target.value}))}/>
            </div>
            <div style={{display:"flex",gap:10,marginTop:18}}>
              <button className="btn" style={{flex:1,padding:"16px",background:"#111",color:"#666",borderRadius:8,border:"1px solid #252525",fontSize:16,fontFamily:"IBM Plex Sans,sans-serif"}} onClick={()=>setModal(null)}>Cancel</button>
              <button className="btn" style={{flex:1,padding:"16px",background:"#0F1F16",color:"#6DBF8A",border:"1px solid #1E4030",borderRadius:8,fontSize:16,fontFamily:"IBM Plex Sans,sans-serif",fontWeight:600}} onClick={addHelp}>+5 Points 🤝</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
