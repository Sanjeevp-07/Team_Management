// src/pages/TeamTracker.jsx
// Install: npm install firebase recharts

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
const COLORS = ["#E8C547","#A8B8D8","#C8A8D8","#A8D8B8","#D8A8A8"];
const RANKS  = ["👑","②","③","④","⑤"];
const getRef = () => { const [c,d]=FIRESTORE_DOC.split("/"); return doc(db,c,d); };

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Sora:wght@300;400;600;700&display=swap');
html,body,#root{background:#0A0A0A !important;margin:0;padding:0;width:100%}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{-webkit-text-size-adjust:100%}
::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:#111}::-webkit-scrollbar-thumb{background:#2A2A2A;border-radius:2px}
.btn{cursor:pointer;border:none;outline:none;transition:all 0.15s ease}.btn:active{transform:scale(0.96);opacity:0.85}
.card{background:#111;border:1px solid #1E1E1E;border-radius:12px;width:100%}
.tag{padding:2px 7px;border-radius:4px;font-size:10px;font-weight:500;white-space:nowrap}
.tag-done{background:#0D2B1A;color:#4ADE80;border:1px solid #166534}
.tag-missed{background:#2B0D0D;color:#F87171;border:1px solid #991B1B}
.tag-pending{background:#1A1A0D;color:#FACC15;border:1px solid #713F12}
.tag-late{background:#2B1A0D;color:#FB923C;border:1px solid #9A3412}
input,textarea,select{background:#0D0D0D;border:1px solid #2A2A2A;color:#E8E8E8;border-radius:8px;padding:10px 13px;font-family:'DM Mono',monospace;font-size:13px;width:100%;outline:none;transition:border 0.2s;-webkit-appearance:none;appearance:none}
input:focus,textarea:focus,select:focus{border-color:#E8C547}
select option{background:#111}
input[type="date"]::-webkit-calendar-picker-indicator{filter:invert(0.4)}
.overlay{position:fixed;inset:0;background:rgba(0,0,0,0.92);display:flex;align-items:flex-end;justify-content:center;z-index:200}
@media(min-width:640px){.overlay{align-items:center;padding:20px}}
.modal{background:#111;border:1px solid #222;border-radius:20px 20px 0 0;padding:20px 18px 36px;width:100%;max-height:92vh;overflow-y:auto}
@media(min-width:640px){.modal{border-radius:16px;max-width:460px;padding:26px}}
.npill{padding:7px 14px;border-radius:8px;font-family:'DM Mono',monospace;font-size:11px;font-weight:500;letter-spacing:.04em;white-space:nowrap}
.non{background:#E8C547;color:#0A0A0A}.noff{background:transparent;color:#555;border:1px solid #222}
.abtn{padding:5px 11px;border-radius:6px;font-size:11px;font-family:'DM Mono',monospace;font-weight:500;white-space:nowrap}
.rh{transition:background 0.12s}.rh:hover{background:#141414}
.pulse{animation:pulse 2s infinite}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
@keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
.fi{animation:fadeUp 0.22s ease forwards}
@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
.su{animation:slideUp 0.22s ease forwards}
.bnav{position:fixed;bottom:0;left:0;right:0;background:#0C0C0C;border-top:1px solid #181818;display:flex;z-index:100;padding-bottom:env(safe-area-inset-bottom,0px)}
.bni{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:10px 4px 8px;gap:3px;cursor:pointer;border:none;background:none;outline:none;transition:background .12s}
.bni:active{background:#161616}
.dnav{display:none}
.mbnav{display:flex}
@media(min-width:768px){.bnav{display:none}.dnav{display:flex}.mbnav{display:none}.pg{padding:26px 28px 28px;width:100%;box-sizing:border-box}}
@media(max-width:767px){.pg{padding:14px 13px 82px;width:100%;box-sizing:border-box}}
.g2{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.sync{display:inline-flex;align-items:center;gap:4px;font-size:10px;color:#4ADE80;background:#0D2B1A;border:1px solid #166534;border-radius:4px;padding:2px 7px}
.sdot{width:5px;height:5px;border-radius:50%;background:#4ADE80;animation:pulse 2s infinite}
.ldot{width:6px;height:6px;border-radius:50%;background:#E8C547;animation:ld 1.2s ease-in-out infinite}
.ldot:nth-child(2){animation-delay:.2s}.ldot:nth-child(3){animation-delay:.4s}
@keyframes ld{0%,80%,100%{transform:scale(.6);opacity:.35}40%{transform:scale(1);opacity:1}}
`;

function Av({label,color,size=36,fs=11}){return(<div style={{width:size,height:size,borderRadius:"50%",background:color+"1A",border:`1.5px solid ${color}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:fs,fontWeight:600,color,flexShrink:0}}>{label}</div>);}
function SL({children}){return<div style={{fontSize:10,color:"#3A3A3A",letterSpacing:".1em",textTransform:"uppercase",marginBottom:8}}>{children}</div>;}
function Empty({t}){return<div style={{textAlign:"center",padding:"50px 20px",color:"#272727",fontSize:12}}>{t}</div>;}

export default function TeamTracker(){
  const [state,setState]=useState(null);
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [view,setView]=useState("dashboard");
  const [sel,setSel]=useState(null);
  const [modal,setModal]=useState(null);
  const [skip,setSkip]=useState(false);
  const [tf,setTf]=useState({title:"",desc:"",assignee:"",deadline:"",points:10});
  const [hf,setHf]=useState({from:"",to:"",note:""});

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
  const doneTask=(mid,tid)=>upd(s=>{const m=s.members.find(m=>m.id===mid);const t=m.tasks.find(t=>t.id===tid);if(t.status!=="pending")return;t.status="done";t.completedAt=now();m.points+=t.points;m.history.push({date:fmt(now()),points:m.points,event:`✅ "${t.title}" +${t.points}pts`});});
  const missTask=(mid,tid)=>upd(s=>{const m=s.members.find(m=>m.id===mid);const t=m.tasks.find(t=>t.id===tid);if(t.status!=="pending")return;t.status="missed";t.missedAt=now();m.history.push({date:fmt(now()),points:m.points,event:`⚠️ Missed "${t.title}"`});});
  const addHelp=()=>{
    if(!hf.from||!hf.to||hf.from===hf.to)return;
    upd(s=>{const m=s.members.find(m=>m.id===Number(hf.from));m.points+=5;m.history.push({date:fmt(now()),points:m.points,event:`🤝 Helped ${getM(Number(hf.to))?.name} +5pts`});});
    setHf({from:"",to:"",note:""});setModal(null);
  };
  const goM=(id)=>{setSel(id);setView("member");};
  const goV=(v)=>{setView(v);if(v!=="member")setSel(null);};

  if(loading||!state)return(
    <div style={{background:"#0A0A0A",minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:20}}>
      <style>{CSS}</style>
      <div style={{fontFamily:"'Sora',sans-serif",fontWeight:700,fontSize:18,color:"#E8E8E8",letterSpacing:"-0.02em"}}>INORA <span style={{color:"#E8C547"}}>·</span> Team</div>
      <div style={{display:"flex",gap:6}}><div className="ldot"/><div className="ldot"/><div className="ldot"/></div>
      <div style={{fontSize:10,color:"#2A2A2A",fontFamily:"DM Mono,monospace"}}>connecting to firebase...</div>
    </div>
  );

  const sorted=[...state.members].sort((a,b)=>b.points-a.points);
  const maxP=Math.max(...state.members.map(m=>m.points),1);
  const NAV=[{id:"dashboard",label:"Board",icon:"⬡"},{id:"tasks",label:"Tasks",icon:"◈"},{id:"history",label:"History",icon:"◷"}];

  const TaskRow=({t,m})=>{
    const ov=isPast(t.deadline)&&t.status==="pending";
    return(
      <div style={{padding:"12px 14px",borderBottom:"1px solid #161616"}}>
        <div style={{display:"flex",alignItems:"flex-start",gap:10}}>
          <div style={{flex:1,minWidth:0}}>
            <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4,flexWrap:"wrap"}}>
              <span style={{fontSize:12,fontWeight:500}}>{t.title}</span>
              {t.status==="done"&&<span className="tag tag-done">done</span>}
              {t.status==="missed"&&<span className="tag tag-missed">missed</span>}
              {t.status==="pending"&&!ov&&<span className="tag tag-pending">pending</span>}
              {t.status==="pending"&&ov&&<span className="tag tag-late">overdue</span>}
            </div>
            {t.desc&&<div style={{fontSize:10,color:"#555",marginBottom:3}}>{t.desc}</div>}
            <div style={{fontSize:10,color:"#444"}}>Due <span style={{color:ov&&t.status==="pending"?"#F87171":"#555"}}>{fmt(t.deadline)}</span><span style={{marginLeft:8,color:"#E8C547"}}>+{t.points}pts</span></div>
          </div>
          {t.status==="pending"&&(
            <div style={{display:"flex",gap:5,flexShrink:0}}>
              <button className="btn abtn" style={{background:"#0D2B1A",color:"#4ADE80",border:"1px solid #166534"}} onClick={()=>doneTask(m.id,t.id)}>✓</button>
              <button className="btn abtn" style={{background:"#2B0D0D",color:"#F87171",border:"1px solid #991B1B"}} onClick={()=>missTask(m.id,t.id)}>✗</button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return(
    <div style={{fontFamily:"'DM Mono',monospace",background:"#0A0A0A",minHeight:"100vh",width:"100%",color:"#E8E8E8"}}>
      <style>{CSS}</style>

      {/* HEADER */}
      <div style={{borderBottom:"1px solid #161616",padding:"13px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,background:"#0A0A0A",zIndex:50}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div>
            <div style={{fontFamily:"'Sora',sans-serif",fontWeight:700,fontSize:15,letterSpacing:"-0.02em"}}>INORA <span style={{color:"#E8C547"}}>·</span> Team</div>
            <div style={{fontSize:9,color:"#2E2E2E",marginTop:1}}>accountability tracker</div>
          </div>
          {saving?<div style={{fontSize:9,color:"#444"}}>syncing…</div>:<div className="sync"><div className="sdot"/>live</div>}
        </div>
        {/* Desktop nav — hidden on mobile via CSS */}
        <div className="dnav" style={{gap:6,alignItems:"center"}}>
          {NAV.map(n=><button key={n.id} className={`btn npill ${view===n.id||(view==="member"&&n.id==="dashboard")?"non":"noff"}`} onClick={()=>goV(n.id)}>{n.label}</button>)}
          <div style={{width:1,height:16,background:"#222",margin:"0 4px"}}/>
          <button className="btn npill noff" onClick={()=>setModal("task")}>+ Task</button>
          <button className="btn npill" style={{background:"#0D2B1A",color:"#4ADE80",border:"1px solid #166534",fontSize:11}} onClick={()=>setModal("help")}>🤝 Help</button>
        </div>
        {/* Mobile buttons — hidden on desktop via CSS */}
        <div className="mbnav" style={{gap:6}}>
          <button className="btn" style={{padding:"7px 11px",background:"#161616",color:"#E8C547",border:"1px solid #222",borderRadius:8,fontSize:11,fontFamily:"DM Mono,monospace"}} onClick={()=>setModal("task")}>+ Task</button>
          <button className="btn" style={{padding:"7px 10px",background:"#0D2B1A",color:"#4ADE80",border:"1px solid #166634",borderRadius:8,fontSize:13}} onClick={()=>setModal("help")}>🤝</button>
        </div>
      </div>

      <div className="pg" style={{maxWidth:"100%",margin:"0",width:"100%"}}>

        {/* DASHBOARD */}
        {view==="dashboard"&&(
          <div className="fi">
            <SL>Leaderboard</SL>
            <div className="card" style={{marginBottom:20,overflow:"hidden"}}>
              {sorted.map((m,i)=>(
                <div key={m.id} className="rh btn" onClick={()=>goM(m.id)} style={{display:"flex",alignItems:"center",padding:"13px 15px",borderBottom:i<sorted.length-1?"1px solid #161616":"none",gap:11,cursor:"pointer"}}>
                  <div style={{width:20,fontSize:15,textAlign:"center",flexShrink:0}}>{RANKS[i]}</div>
                  <Av label={m.avatar} color={COLORS[i%COLORS.length]} size={34}/>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:5,flexWrap:"wrap"}}>
                      <span style={{fontFamily:"'Sora',sans-serif",fontWeight:600,fontSize:13}}>{m.name}</span>
                      <span style={{fontSize:10,color:"#3A3A3A"}}>{m.role}</span>
                    </div>
                    <div style={{background:"#181818",borderRadius:3,height:3,overflow:"hidden"}}>
                      <div style={{height:"100%",width:`${(m.points/maxP)*100}%`,background:COLORS[i%COLORS.length],borderRadius:3,transition:"width 0.7s ease"}}/>
                    </div>
                  </div>
                  <div style={{textAlign:"right",flexShrink:0}}>
                    <div style={{fontFamily:"'Sora',sans-serif",fontWeight:700,fontSize:20,color:COLORS[i%COLORS.length]}}>{m.points}</div>
                    <div style={{fontSize:9,color:"#444"}}>pts</div>
                  </div>
                </div>
              ))}
            </div>
            <SL>Points Overview</SL>
            <div className="card" style={{padding:"14px 6px 6px",marginBottom:20}}>
              <ResponsiveContainer width="100%" height={150}>
                <BarChart data={sorted} barSize={26}>
                  <XAxis dataKey="name" tick={{fill:"#444",fontSize:10,fontFamily:"DM Mono"}} axisLine={false} tickLine={false}/>
                  <YAxis hide/>
                  <Tooltip contentStyle={{background:"#111",border:"1px solid #2A2A2A",borderRadius:8,fontFamily:"DM Mono",fontSize:10}} labelStyle={{color:"#E8E8E8"}} itemStyle={{color:"#E8C547"}}/>
                  <Bar dataKey="points" radius={[5,5,0,0]}>{sorted.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]} fillOpacity={0.85}/>)}</Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <SL>Members</SL>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill, minmax(150px, 1fr))",gap:10}}>
              {state.members.map((m,i)=>{
                const pend=m.tasks.filter(t=>t.status==="pending");
                const ovd=pend.filter(t=>isPast(t.deadline));
                const dn=m.tasks.filter(t=>t.status==="done");
                return(
                  <div key={m.id} className="card btn" onClick={()=>goM(m.id)} style={{padding:13,cursor:"pointer",borderColor:ovd.length>0?"#3A1A1A":"#1E1E1E",transition:"border-color 0.2s"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                      <Av label={m.avatar} color={COLORS[i%COLORS.length]} size={30}/>
                      {ovd.length>0&&<div className="pulse tag tag-missed" style={{fontSize:9}}>⚠ {ovd.length}</div>}
                    </div>
                    <div style={{fontFamily:"'Sora',sans-serif",fontWeight:600,fontSize:12,marginBottom:2}}>{m.name}</div>
                    <div style={{fontSize:10,color:"#3A3A3A",marginBottom:8}}>{m.role}</div>
                    <div style={{display:"flex",gap:5,fontSize:10}}>
                      <span style={{color:"#4ADE80"}}>{dn.length}✓</span>
                      <span style={{color:"#333"}}>·</span>
                      <span style={{color:"#FACC15"}}>{pend.length} open</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TASKS */}
        {view==="tasks"&&(
          <div className="fi">
            {state.members.map((m,mi)=>{
              if(m.tasks.length===0)return null;
              return(
                <div key={m.id} style={{marginBottom:20}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:9}}>
                    <Av label={m.avatar} color={COLORS[mi%COLORS.length]} size={24}/>
                    <span style={{fontFamily:"'Sora',sans-serif",fontWeight:600,fontSize:13}}>{m.name}</span>
                    <span style={{fontSize:10,color:"#3A3A3A"}}>{m.tasks.filter(t=>t.status==="pending").length} pending · {m.tasks.filter(t=>t.status==="done").length} done</span>
                  </div>
                  <div className="card" style={{overflow:"hidden"}}>
                    {m.tasks.map((t)=><TaskRow key={t.id} t={t} m={m}/>)}
                  </div>
                </div>
              );
            })}
            {state.members.every(m=>m.tasks.length===0)&&<Empty t="No tasks yet. Tap + Task to assign one."/>}
          </div>
        )}

        {/* HISTORY */}
        {view==="history"&&(
          <div className="fi">
            {state.members.map((m,mi)=>{
              if(m.history.length===0)return null;
              return(
                <div key={m.id} style={{marginBottom:20}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:9}}>
                    <Av label={m.avatar} color={COLORS[mi%COLORS.length]} size={24}/>
                    <span style={{fontFamily:"'Sora',sans-serif",fontWeight:600,fontSize:13}}>{m.name}</span>
                  </div>
                  <div className="card" style={{overflow:"hidden"}}>
                    {[...m.history].reverse().map((h,hi)=>(
                      <div key={hi} style={{padding:"11px 14px",borderBottom:hi<m.history.length-1?"1px solid #161616":"none",display:"flex",alignItems:"center",gap:10}}>
                        <div style={{fontSize:10,color:"#3A3A3A",minWidth:44}}>{h.date}</div>
                        <div style={{flex:1,fontSize:11,color:"#BEBEBE"}}>{h.event}</div>
                        <div style={{fontSize:12,fontWeight:600,fontFamily:"'Sora',sans-serif",color:COLORS[mi%COLORS.length]}}>{h.points}</div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
            {state.members.every(m=>m.history.length===0)&&<Empty t="No activity yet."/>}
          </div>
        )}

        {/* MEMBER */}
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
              <button className="btn" style={{fontSize:11,color:"#555",marginBottom:14,background:"none",padding:0}} onClick={()=>{setView("dashboard");setSel(null);}}>← Back</button>
              <div className="card" style={{padding:16,marginBottom:14}}>
                <div style={{display:"flex",alignItems:"center",gap:13,marginBottom:14}}>
                  <Av label={m.avatar} color={col} size={46} fs={14}/>
                  <div style={{flex:1}}>
                    <div style={{fontFamily:"'Sora',sans-serif",fontWeight:700,fontSize:17}}>{m.name}</div>
                    <div style={{fontSize:11,color:"#555"}}>{m.role}</div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontFamily:"'Sora',sans-serif",fontWeight:700,fontSize:26,color:col}}>{m.points}</div>
                    <div style={{fontSize:9,color:"#444"}}>pts</div>
                  </div>
                </div>
                <div style={{display:"flex",gap:8}}>
                  {[["Done",dn.length,"#4ADE80"],["Pending",pnd.length,"#FACC15"],["Missed",ms.length,"#F87171"]].map(([l,v,c])=>(
                    <div key={l} style={{flex:1,background:"#0D0D0D",borderRadius:8,padding:"10px 6px",textAlign:"center"}}>
                      <div style={{fontFamily:"'Sora',sans-serif",fontWeight:700,fontSize:18,color:c}}>{v}</div>
                      <div style={{fontSize:9,color:"#444"}}>{l}</div>
                    </div>
                  ))}
                </div>
              </div>
              <SL>Progress</SL>
              <div className="card" style={{padding:"14px 6px 6px",marginBottom:14}}>
                {ch?(
                  <ResponsiveContainer width="100%" height={130}>
                    <LineChart data={ch}>
                      <XAxis dataKey="date" tick={{fill:"#444",fontSize:9,fontFamily:"DM Mono"}} axisLine={false} tickLine={false}/>
                      <YAxis hide/>
                      <Tooltip contentStyle={{background:"#111",border:"1px solid #2A2A2A",borderRadius:8,fontFamily:"DM Mono",fontSize:10}} labelStyle={{color:"#999"}} itemStyle={{color:col}}/>
                      <Line type="monotone" dataKey="points" stroke={col} strokeWidth={2} dot={{fill:col,r:3}} activeDot={{r:5}}/>
                    </LineChart>
                  </ResponsiveContainer>
                ):(
                  <div style={{textAlign:"center",padding:"28px 0",color:"#2A2A2A",fontSize:11}}>Complete tasks to see chart</div>
                )}
              </div>
              <SL>Tasks</SL>
              <div className="card" style={{overflow:"hidden"}}>
                {m.tasks.length===0&&<div style={{padding:18,textAlign:"center",color:"#2A2A2A",fontSize:11}}>No tasks assigned</div>}
                {m.tasks.map((t)=><TaskRow key={t.id} t={t} m={m}/>)}
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
              <div style={{fontSize:17,color:on?"#E8C547":"#383838"}}>{n.icon}</div>
              <div style={{fontSize:9,color:on?"#E8C547":"#383838",fontFamily:"DM Mono,monospace",letterSpacing:".03em"}}>{n.label}</div>
            </button>
          );
        })}
      </div>

      {/* MODAL TASK */}
      {modal==="task"&&(
        <div className="overlay" onClick={()=>setModal(null)}>
          <div className="modal su" onClick={e=>e.stopPropagation()}>
            <div style={{width:32,height:3,background:"#2A2A2A",borderRadius:2,margin:"0 auto 18px"}}/>
            <div style={{fontFamily:"'Sora',sans-serif",fontWeight:700,fontSize:15,marginBottom:14}}>Assign Task</div>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              <input placeholder="Task title *" value={tf.title} onChange={e=>setTf(p=>({...p,title:e.target.value}))}/>
              <textarea placeholder="Description (optional)" rows={2} value={tf.desc} onChange={e=>setTf(p=>({...p,desc:e.target.value}))} style={{resize:"none"}}/>
              <select value={tf.assignee} onChange={e=>setTf(p=>({...p,assignee:e.target.value}))}>
                <option value="">Assign to *</option>
                {state.members.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
              <div className="g2">
                <div><div style={{fontSize:10,color:"#555",marginBottom:5}}>Deadline *</div><input type="date" value={tf.deadline} onChange={e=>setTf(p=>({...p,deadline:e.target.value}))}/></div>
                <div><div style={{fontSize:10,color:"#555",marginBottom:5}}>Points</div><input type="number" min={1} value={tf.points} onChange={e=>setTf(p=>({...p,points:e.target.value}))}/></div>
              </div>
            </div>
            <div style={{display:"flex",gap:8,marginTop:16}}>
              <button className="btn" style={{flex:1,padding:"11px",background:"#161616",color:"#555",borderRadius:8,border:"1px solid #222",fontSize:12,fontFamily:"DM Mono"}} onClick={()=>setModal(null)}>Cancel</button>
              <button className="btn" style={{flex:1,padding:"11px",background:"#E8C547",color:"#0A0A0A",borderRadius:8,fontSize:12,fontFamily:"DM Mono",fontWeight:600}} onClick={addTask}>Assign →</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL HELP */}
      {modal==="help"&&(
        <div className="overlay" onClick={()=>setModal(null)}>
          <div className="modal su" onClick={e=>e.stopPropagation()}>
            <div style={{width:32,height:3,background:"#2A2A2A",borderRadius:2,margin:"0 auto 18px"}}/>
            <div style={{fontFamily:"'Sora',sans-serif",fontWeight:700,fontSize:15,marginBottom:3}}>Log Help</div>
            <div style={{fontSize:11,color:"#555",marginBottom:14}}>+5 bonus points for helping a teammate</div>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
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
            <div style={{display:"flex",gap:8,marginTop:16}}>
              <button className="btn" style={{flex:1,padding:"11px",background:"#161616",color:"#555",borderRadius:8,border:"1px solid #222",fontSize:12,fontFamily:"DM Mono"}} onClick={()=>setModal(null)}>Cancel</button>
              <button className="btn" style={{flex:1,padding:"11px",background:"#0D2B1A",color:"#4ADE80",border:"1px solid #166534",borderRadius:8,fontSize:12,fontFamily:"DM Mono",fontWeight:600}} onClick={addHelp}>+5 Points 🤝</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
