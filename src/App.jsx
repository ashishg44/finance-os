import { useState, useRef, useEffect, useCallback } from "react";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const SHORT_MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const CATS = {
  "Food & Dining":    { icon:"🍜", color:"#FF6B6B", bg:"rgba(255,107,107,0.12)" },
  "Transport":        { icon:"🚌", color:"#4FC3F7", bg:"rgba(79,195,247,0.12)" },
  "Shopping":         { icon:"🛍️", color:"#FFB74D", bg:"rgba(255,183,77,0.12)" },
  "Entertainment":    { icon:"🎮", color:"#CE93D8", bg:"rgba(206,147,216,0.12)" },
  "Health":           { icon:"🏥", color:"#80CBC4", bg:"rgba(128,203,196,0.12)" },
  "Bills & Utilities":{ icon:"⚡", color:"#F48FB1", bg:"rgba(244,143,177,0.12)" },
  "Groceries":        { icon:"🥦", color:"#A5D6A7", bg:"rgba(165,214,167,0.12)" },
  "Salary":           { icon:"💰", color:"#69F0AE", bg:"rgba(105,240,174,0.12)" },
  "Freelance":        { icon:"💻", color:"#40C4FF", bg:"rgba(64,196,255,0.12)" },
  "Investment":       { icon:"📈", color:"#FFD740", bg:"rgba(255,215,64,0.12)" },
  "Transfer":         { icon:"🔄", color:"#90A4AE", bg:"rgba(144,164,174,0.12)" },
  "Recharge":         { icon:"📱", color:"#B39DDB", bg:"rgba(179,157,219,0.12)" },
  "Other":            { icon:"📦", color:"#78909C", bg:"rgba(120,144,156,0.12)" },
};

function genId() { return `${Date.now()}-${Math.random().toString(36).slice(2,7)}`; }
function fmtINR(n) { return "₹" + Math.abs(n).toLocaleString("en-IN", {maximumFractionDigits:0}); }

function isDuplicate(existing, candidate) {
  return existing.some(t => {
    if (t.date !== candidate.date) return false;
    if (Math.abs(t.amount - candidate.amount) > 0.5) return false;
    const a = t.description.toLowerCase().replace(/\s+/g," ").trim();
    const b = candidate.description.toLowerCase().replace(/\s+/g," ").trim();
    if (a === b) return true;
    const minLen = Math.min(a.length, b.length, 8);
    if (minLen > 3 && (a.slice(0,minLen) === b.slice(0,minLen))) return true;
    return false;
  });
}

function Counter({ value }) {
  const [disp, setDisp] = useState(0);
  const prev = useRef(0);
  useEffect(() => {
    const from = prev.current, to = value, dur = 900, t0 = performance.now();
    const tick = (now) => {
      const p = Math.min((now - t0) / dur, 1);
      const e = 1 - Math.pow(1 - p, 4);
      setDisp(Math.round(from + (to - from) * e));
      if (p < 1) requestAnimationFrame(tick); else prev.current = to;
    };
    requestAnimationFrame(tick);
  }, [value]);
  return <>{Math.abs(disp).toLocaleString("en-IN")}</>;
}

function Sparkline({ data, color, h=44 }) {
  const max = Math.max(...data, 1);
  const w = 110, pad = 3;
  const pts = data.map((v,i) => {
    const x = pad + (i/(data.length-1))*(w-pad*2);
    const y = h - pad - (v/max)*(h-pad*2);
    return `${x},${y}`;
  }).join(" ");
  const last = pts.split(" ").pop()?.split(",");
  const id = `sg${color.replace(/[^a-z0-9]/gi,"")}`;
  return (
    <svg width={w} height={h} style={{overflow:"visible"}}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" opacity="0.7"/>
      {last && <circle cx={last[0]} cy={last[1]} r="3" fill={color}/>}
    </svg>
  );
}

function Donut({ data, size=155 }) {
  const r=(size/2)-16, cx=size/2, cy=size/2, sw=13, circ=2*Math.PI*r;
  const total = data.reduce((s,d)=>s+d.value,0)||1;
  let off=0;
  return (
    <svg width={size} height={size}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={sw}/>
      {data.map((d,i)=>{
        const dash=(d.value/total)*circ, gap=circ-dash;
        const el=(<circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={d.color} strokeWidth={sw-1}
          strokeDasharray={`${dash} ${gap}`} strokeDashoffset={-off+circ*0.25} strokeLinecap="round"
          style={{transition:"stroke-dasharray 0.8s cubic-bezier(.4,0,.2,1)"}}/>);
        off+=dash; return el;
      })}
    </svg>
  );
}

function BarChart({ data, activeIdx }) {
  const max = Math.max(...data.map(d=>d.value),1);
  return (
    <div style={{display:"flex",alignItems:"flex-end",gap:5,height:72}}>
      {data.map((d,i)=>{
        const h=Math.max(3,(d.value/max)*100), active=i===activeIdx;
        return (
          <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4,height:"100%"}}>
            <div title={`${d.label}: ${fmtINR(d.value)}`} style={{
              width:"100%", borderRadius:active?"5px 5px 2px 2px":"3px 3px 1px 1px",
              height:`${h}%`, alignSelf:"flex-end",
              background:active?"linear-gradient(180deg,#a78bfa,#7c3aed)":"rgba(167,139,250,0.18)",
              transition:"height 0.7s cubic-bezier(.34,1.56,.64,1)"
            }}/>
            <span style={{fontSize:9,color:active?"#a78bfa":"#334155",fontWeight:active?600:400}}>{d.label}</span>
          </div>
        );
      })}
    </div>
  );
}

function QueueItem({ item, onRemove }) {
  const S = {
    pending:    {label:"Queued",   color:"#64748b", bg:"rgba(100,116,139,0.1)"},
    processing: {label:"Analysing…",color:"#a78bfa",bg:"rgba(167,139,250,0.12)",pulse:true},
    done:       {label:"Done",     color:"#34d399", bg:"rgba(52,211,153,0.1)"},
    error:      {label:"Error",    color:"#f87171", bg:"rgba(248,113,113,0.1)"},
  };
  const s = S[item.status]||S.pending;
  return (
    <div style={{display:"flex",alignItems:"center",gap:12,padding:"11px 14px",background:"rgba(255,255,255,0.025)",borderRadius:14,border:"1px solid rgba(255,255,255,0.06)",transition:"all 0.3s"}}>
      <div style={{width:42,height:42,borderRadius:10,overflow:"hidden",flexShrink:0,background:"#1e293b",border:"1px solid rgba(255,255,255,0.06)"}}>
        {item.preview && <img src={item.preview} style={{width:"100%",height:"100%",objectFit:"cover"}}/>}
      </div>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:13,fontWeight:500,color:"#cbd5e1",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{item.name}</div>
        {item.status==="done" && (
          <div style={{fontSize:11,color:"#475569",marginTop:2}}>
            <span style={{color:"#34d399"}}>+{item.added??0} added</span>
            {(item.skipped??0)>0 && <span style={{color:"#64748b"}}> · {item.skipped} duplicates skipped</span>}
          </div>
        )}
        {item.error && <div style={{fontSize:11,color:"#f87171",marginTop:2}}>{item.error}</div>}
      </div>
      <div style={{display:"flex",alignItems:"center",gap:8}}>
        {s.pulse && <div style={{width:7,height:7,borderRadius:"50%",background:"#a78bfa",animation:"pulse 1s ease infinite"}}/>}
        <span style={{fontSize:11,fontWeight:600,padding:"3px 10px",borderRadius:99,color:s.color,background:s.bg}}>{s.label}</span>
        {item.status!=="processing" && (
          <button onClick={()=>onRemove(item.id)} style={{background:"rgba(248,113,113,0.1)",border:"none",color:"#f87171",borderRadius:7,padding:"4px 8px",cursor:"pointer",fontSize:12,transition:"all 0.2s"}}>✕</button>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const [txs, setTxs] = useState([]);
  const [page, setPage] = useState("dashboard");
  const today = new Date();
  const [selM, setSelM] = useState(today.getMonth());
  const [selY, setSelY] = useState(today.getFullYear());
  const [queue, setQueue] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [drag, setDrag] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({date:"",desc:"",amount:"",cat:"Other",type:"expense"});
  const [filterCat, setFilterCat] = useState("All");
  const fileRef = useRef();
  const processingRef = useRef(false);
  const txsRef = useRef(txs);
  useEffect(()=>{ txsRef.current = txs; },[txs]);

  const monthTxs = txs.filter(t=>{const d=new Date(t.date);return d.getMonth()===selM&&d.getFullYear()===selY;});
  const income  = monthTxs.filter(t=>t.type==="income").reduce((s,t)=>s+t.amount,0);
  const expense = monthTxs.filter(t=>t.type==="expense").reduce((s,t)=>s+t.amount,0);
  const savings = income - expense;

  const catBreakdown = Object.entries(
    monthTxs.reduce((acc,t)=>{acc[t.category]=(acc[t.category]||0)+t.amount;return acc;},{})
  ).sort((a,b)=>b[1]-a[1]).map(([cat,val])=>({cat,val,...(CATS[cat]||CATS.Other)}));

  const trend = Array.from({length:6},(_,i)=>{
    let m=selM-(5-i),y=selY; if(m<0){m+=12;y--;}
    const t2=txs.filter(t=>{const d=new Date(t.date);return d.getMonth()===m&&d.getFullYear()===y;});
    return {label:SHORT_MONTHS[m],value:t2.filter(t=>t.type==="expense").reduce((s,t)=>s+t.amount,0)};
  });

  const processNext = useCallback(async () => {
    if (processingRef.current) return;
    setQueue(q=>{
      const pending = q.filter(x=>x.status==="pending");
      if (pending.length===0) return q;
      const item = pending[0];
      processingRef.current = true;

      (async()=>{
        setQueue(qq=>qq.map(x=>x.id===item.id?{...x,status:"processing"}:x));
        try {
          const prompt = `Extract ALL transactions from this screenshot. Return ONLY a valid JSON array, no markdown.
Each object must have: "date" (YYYY-MM-DD, use ${selY} if unclear), "description" (string), "amount" (positive number, INR), "type" ("income" or "expense"), "category" (one of: ${Object.keys(CATS).join(", ")}).
Credits/received/salary = income. Debits/paid/sent = expense. Return [] if no transactions found.`;

          const resp = await fetch("https://api.anthropic.com/v1/messages",{
            method:"POST",headers:{"Content-Type":"application/json"},
            body:JSON.stringify({
              model:"claude-sonnet-4-20250514",max_tokens:1500,
              messages:[{role:"user",content:[
                {type:"image",source:{type:"base64",media_type:item.mimeType,data:item.b64}},
                {type:"text",text:prompt}
              ]}]
            })
          });
          const data = await resp.json();
          const raw = data.content?.find(b=>b.type==="text")?.text||"[]";
          const clean = raw.replace(/```[\w]*\n?/g,"").replace(/```/g,"").trim();
          const parsed = JSON.parse(clean);
          if (!Array.isArray(parsed)) throw new Error("Bad response");

          const candidates = parsed.map(t=>({
            id:genId(),
            date:String(t.date||`${selY}-${String(selM+1).padStart(2,"0")}-01`),
            description:String(t.description||"Unknown"),
            amount:Math.abs(Number(String(t.amount).replace(/[^\d.]/g,"")))||0,
            type:t.type==="income"?"income":"expense",
            category:CATS[t.category]?t.category:"Other",
          })).filter(t=>t.amount>0);

          let added=0, skipped=0;
          setTxs(prev=>{
            const next=[...prev];
            candidates.forEach(c=>{ if(isDuplicate(next,c)){skipped++;}else{next.push(c);added++;} });
            return next;
          });
          await new Promise(r=>setTimeout(r,80));
          setQueue(qq=>qq.map(x=>x.id===item.id?{...x,status:"done",added,skipped}:x));
        } catch(e) {
          setQueue(qq=>qq.map(x=>x.id===item.id?{...x,status:"error",error:e.message}:x));
        }
        processingRef.current = false;
        setTimeout(()=>processNext(),100);
      })();

      return q;
    });
  },[selM,selY]);

  useEffect(()=>{ processNext(); },[queue.length]);

  async function addFiles(files) {
    const items = await Promise.all(Array.from(files).map(async f=>{
      const b64 = await new Promise((res,rej)=>{
        const r=new FileReader(); r.onload=()=>res(r.result.split(",")[1]); r.onerror=rej; r.readAsDataURL(f);
      });
      return {id:genId(),name:f.name,b64,mimeType:f.type||"image/jpeg",preview:URL.createObjectURL(f),status:"pending",added:null,skipped:null};
    }));
    setQueue(q=>[...q,...items]);
  }

  function addManual() {
    if(!form.date||!form.desc||!form.amount) return;
    setTxs(p=>[...p,{id:genId(),date:form.date,description:form.desc,amount:Math.abs(parseFloat(form.amount)),type:form.type,category:form.cat}]);
    setForm({date:"",desc:"",amount:"",cat:"Other",type:"expense"});
    setShowForm(false);
  }

  const filtered = filterCat==="All"?monthTxs:monthTxs.filter(t=>t.category===filterCat);
  const sortedFiltered = [...filtered].sort((a,b)=>new Date(b.date)-new Date(a.date));
  const pendingCount = queue.filter(q=>q.status==="pending"||q.status==="processing").length;
  const totalAdded = queue.reduce((s,q)=>s+(q.added||0),0);
  const totalSkipped = queue.reduce((s,q)=>s+(q.skipped||0),0);

  return (
    <div style={{minHeight:"100vh",background:"#060a12",color:"#e2e8f0",fontFamily:"'Outfit','Segoe UI',sans-serif"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Lora:wght@600;700&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:3px}::-webkit-scrollbar-thumb{background:rgba(167,139,250,0.25);border-radius:3px}
        @keyframes fadeUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}
        @keyframes glowPulse{0%,100%{opacity:0.6}50%{opacity:1}}

        .glass{background:rgba(255,255,255,0.028);border:1px solid rgba(255,255,255,0.07);border-radius:20px;backdrop-filter:blur(16px)}
        .glass-lift{transition:transform 0.25s,border-color 0.25s,box-shadow 0.25s}
        .glass-lift:hover{transform:translateY(-2px);border-color:rgba(167,139,250,0.25);box-shadow:0 16px 40px rgba(0,0,0,0.3)}

        .nav-pill{display:flex;align-items:center;gap:7px;padding:9px 16px;border-radius:12px;border:1px solid transparent;background:none;color:#5a6a7a;cursor:pointer;font-size:13.5px;font-weight:500;font-family:'Outfit',sans-serif;transition:all 0.2s;letter-spacing:0.01em}
        .nav-pill:hover{color:#94a3b8;background:rgba(255,255,255,0.04)}
        .nav-pill.on{color:#a78bfa;background:rgba(167,139,250,0.1);border-color:rgba(167,139,250,0.2)}

        .chip{display:inline-flex;align-items:center;gap:5px;padding:4px 11px;border-radius:99px;font-size:12px;font-weight:500;cursor:pointer;border:1px solid transparent;transition:all 0.2s;white-space:nowrap}
        .chip:hover{filter:brightness(1.15)}

        .pbtn{display:inline-flex;align-items:center;gap:8px;padding:10px 22px;background:linear-gradient(135deg,#7c3aed,#a855f7);border:none;border-radius:13px;color:#fff;font-size:14px;font-weight:600;font-family:'Outfit',sans-serif;cursor:pointer;transition:all 0.25s;letter-spacing:0.01em}
        .pbtn:hover{transform:translateY(-2px);box-shadow:0 10px 28px rgba(124,58,237,0.4)}
        .sbtn{display:inline-flex;align-items:center;gap:7px;padding:8px 16px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.09);border-radius:11px;color:#7a8a9a;font-size:13px;font-weight:500;font-family:'Outfit',sans-serif;cursor:pointer;transition:all 0.2s}
        .sbtn:hover{background:rgba(255,255,255,0.09);color:#cbd5e1;border-color:rgba(255,255,255,0.16)}

        input,select{background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.09);border-radius:11px;color:#e2e8f0;padding:10px 14px;font-size:13.5px;font-family:'Outfit',sans-serif;outline:none;width:100%;transition:all 0.2s}
        input:focus,select:focus{border-color:rgba(167,139,250,0.5);background:rgba(167,139,250,0.04)}
        input::placeholder{color:#2d3a48}
        select option{background:#111827;color:#e2e8f0}

        .dz{border:2px dashed rgba(167,139,250,0.18);border-radius:20px;transition:all 0.3s;cursor:pointer}
        .dz:hover,.dz.on{border-color:rgba(167,139,250,0.55);background:rgba(167,139,250,0.03)}

        .tx{display:grid;align-items:center;padding:11px 14px;border-radius:13px;transition:background 0.2s;gap:12px}
        .tx:hover{background:rgba(255,255,255,0.03)}
        .tx:hover .dbtn{opacity:1!important}
        .dbtn{opacity:0!important;background:rgba(248,113,113,0.1);border:none;color:#f87171;border-radius:8px;padding:5px 9px;cursor:pointer;font-size:12px;transition:all 0.2s!important}
        .dbtn:hover{background:rgba(248,113,113,0.22)!important}

        .fade{animation:fadeUp 0.4s ease both}
      `}</style>

      {/* Ambient */}
      <div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:0,overflow:"hidden"}}>
        <div style={{position:"absolute",width:700,height:700,borderRadius:"50%",background:"radial-gradient(circle,rgba(124,58,237,0.06) 0%,transparent 65%)",top:"-25%",left:"-15%"}}/>
        <div style={{position:"absolute",width:500,height:500,borderRadius:"50%",background:"radial-gradient(circle,rgba(16,185,129,0.04) 0%,transparent 65%)",bottom:"-10%",right:"0%"}}/>
        <div style={{position:"absolute",width:300,height:300,borderRadius:"50%",background:"radial-gradient(circle,rgba(236,72,153,0.03) 0%,transparent 65%)",top:"40%",right:"20%"}}/>
      </div>

      {/* ── Header ── */}
      <header style={{position:"sticky",top:0,zIndex:300,borderBottom:"1px solid rgba(255,255,255,0.05)",background:"rgba(6,10,18,0.88)",backdropFilter:"blur(28px)"}}>
        <div style={{maxWidth:1300,margin:"0 auto",display:"flex",alignItems:"center",height:62,gap:6,padding:"0 24px"}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginRight:28,flexShrink:0}}>
            <div style={{width:32,height:32,borderRadius:9,background:"linear-gradient(135deg,#6d28d9,#a78bfa)",display:"grid",placeItems:"center",fontSize:15,animation:"glowPulse 3s ease infinite"}}>◈</div>
            <span style={{fontFamily:"'Lora',serif",fontWeight:700,fontSize:17,letterSpacing:"-0.2px",color:"#f1f5f9"}}>FinanceOS</span>
          </div>

          <nav style={{display:"flex",gap:3,flex:1}}>
            {[["dashboard","⬡","Dashboard"],["transactions","≡","Transactions"],["upload","⊕","Upload"]].map(([v,ic,lb])=>(
              <button key={v} className={`nav-pill${page===v?" on":""}`} onClick={()=>setPage(v)}>
                <span style={{fontSize:14}}>{ic}</span>{lb}
                {v==="upload"&&pendingCount>0&&<span style={{background:"#a78bfa",color:"#1e1048",borderRadius:99,padding:"1px 6px",fontSize:10,fontWeight:700,marginLeft:1}}>{pendingCount}</span>}
              </button>
            ))}
          </nav>

          <div style={{display:"flex",alignItems:"center",gap:5,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:13,padding:"4px 6px",flexShrink:0}}>
            <button className="sbtn" style={{padding:"5px 9px",borderRadius:8,background:"none",border:"none"}} onClick={()=>{let m=selM-1,y=selY;if(m<0){m=11;y--;}setSelM(m);setSelY(y);}}>‹</button>
            <span style={{fontSize:13,fontWeight:600,minWidth:96,textAlign:"center",color:"#cbd5e1"}}>{SHORT_MONTHS[selM]} {selY}</span>
            <button className="sbtn" style={{padding:"5px 9px",borderRadius:8,background:"none",border:"none"}} onClick={()=>{let m=selM+1,y=selY;if(m>11){m=0;y++;}setSelM(m);setSelY(y);}}>›</button>
          </div>
        </div>
      </header>

      <main style={{maxWidth:1300,margin:"0 auto",padding:"26px 24px 64px",position:"relative",zIndex:1}}>

        {/* ══════════════ DASHBOARD ══════════════ */}
        {page==="dashboard"&&(
          <div className="fade">
            {/* KPI */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14,marginBottom:18}}>
              {[
                {label:"Income",val:income,color:"#34d399",spark:trend.map(t=>t.value*0.9+200),pre:"+"},
                {label:"Expenses",val:expense,color:"#f87171",spark:trend.map(t=>t.value),pre:"-"},
                {label:"Net Savings",val:Math.abs(savings),color:savings>=0?"#a78bfa":"#fb923c",spark:trend.map(t=>Math.abs(t.value*0.25)),pre:savings>=0?"":"−"},
              ].map((k,i)=>(
                <div key={i} className="glass glass-lift" style={{padding:"22px 24px",animationDelay:`${i*0.07}s`}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                    <div>
                      <div style={{fontSize:11,color:"#3d4f62",fontWeight:600,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:10}}>{k.label}</div>
                      <div style={{fontSize:28,fontWeight:700,color:k.color,letterSpacing:"-0.8px",lineHeight:1}}>
                        {k.pre}₹<Counter value={k.val}/>
                      </div>
                      <div style={{fontSize:11.5,color:"#2d3a48",marginTop:7}}>
                        {i===0?"earned this month":i===1?"spent this month":savings>=0?"surplus":"deficit"}
                      </div>
                    </div>
                    <Sparkline data={k.spark} color={k.color}/>
                  </div>
                </div>
              ))}
            </div>

            <div style={{display:"grid",gridTemplateColumns:"1.2fr 1fr",gap:14,marginBottom:14}}>
              {/* Category bars */}
              <div className="glass" style={{padding:"22px 24px"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
                  <h3 style={{fontFamily:"'Lora',serif",fontSize:17,fontWeight:700,color:"#f1f5f9"}}>Where Your Money Goes</h3>
                  <span style={{fontSize:11,color:"#334155"}}>{MONTHS[selM]}</span>
                </div>
                {catBreakdown.length===0?(
                  <div style={{textAlign:"center",padding:"36px 0"}}>
                    <div style={{fontSize:42,marginBottom:12,animation:"float 3s ease infinite"}}>🪙</div>
                    <div style={{color:"#3d4f62",fontSize:14,marginBottom:16}}>No transactions yet</div>
                    <button className="pbtn" style={{fontSize:13}} onClick={()=>setPage("upload")}>📸 Upload Screenshots</button>
                  </div>
                ):(
                  catBreakdown.slice(0,7).map((c,i)=>{
                    const pct=expense>0?(c.val/expense)*100:0;
                    return (
                      <div key={i} style={{marginBottom:13}}>
                        <div style={{display:"flex",alignItems:"center",gap:9,marginBottom:5}}>
                          <div style={{width:30,height:30,borderRadius:9,background:c.bg,display:"grid",placeItems:"center",fontSize:14,flexShrink:0}}>{c.icon}</div>
                          <span style={{flex:1,fontSize:13,color:"#94a3b8"}}>{c.cat}</span>
                          <span style={{fontSize:13,fontWeight:600,color:"#e2e8f0"}}>{fmtINR(c.val)}</span>
                          <span style={{fontSize:11,color:"#334155",minWidth:28,textAlign:"right"}}>{pct.toFixed(0)}%</span>
                        </div>
                        <div style={{height:3,background:"rgba(255,255,255,0.05)",borderRadius:3,overflow:"hidden",marginLeft:39}}>
                          <div style={{height:"100%",width:`${pct}%`,background:c.color,borderRadius:3,transition:"width 0.9s cubic-bezier(.4,0,.2,1)"}}/>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Right column */}
              <div style={{display:"flex",flexDirection:"column",gap:14}}>
                {/* Donut */}
                <div className="glass" style={{padding:"20px 22px",display:"flex",flexDirection:"column",alignItems:"center"}}>
                  <h3 style={{fontFamily:"'Lora',serif",fontSize:15,fontWeight:700,color:"#f1f5f9",marginBottom:14,alignSelf:"flex-start"}}>Spending Mix</h3>
                  {catBreakdown.length>0?(
                    <>
                      <Donut data={catBreakdown.slice(0,6).map(c=>({value:c.val,color:c.color}))} size={145}/>
                      <div style={{display:"flex",flexWrap:"wrap",gap:"5px 12px",marginTop:12,justifyContent:"center"}}>
                        {catBreakdown.slice(0,6).map((c,i)=>(
                          <div key={i} style={{display:"flex",alignItems:"center",gap:5}}>
                            <div style={{width:6,height:6,borderRadius:"50%",background:c.color}}/>
                            <span style={{fontSize:10.5,color:"#475569"}}>{c.cat.split(" ")[0]}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  ):<div style={{color:"#334155",fontSize:13,padding:"28px 0"}}>No data</div>}
                </div>

                {/* Bar chart */}
                <div className="glass" style={{padding:"20px 22px"}}>
                  <h3 style={{fontFamily:"'Lora',serif",fontSize:15,fontWeight:700,color:"#f1f5f9",marginBottom:14}}>6-Month Trend</h3>
                  <BarChart data={trend} activeIdx={5}/>
                </div>
              </div>
            </div>

            {/* Recent */}
            <div className="glass" style={{padding:"22px 24px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
                <h3 style={{fontFamily:"'Lora',serif",fontSize:17,fontWeight:700,color:"#f1f5f9"}}>Recent Transactions</h3>
                <div style={{display:"flex",gap:8}}>
                  <button className="sbtn" onClick={()=>{setPage("transactions");setShowForm(true)}}>+ Add Entry</button>
                  <button className="sbtn" onClick={()=>setPage("transactions")}>View All →</button>
                </div>
              </div>
              {monthTxs.length===0?(
                <div style={{textAlign:"center",padding:"20px",color:"#334155",fontSize:14}}>
                  Upload a screenshot to see transactions here.
                </div>
              ):(
                [...monthTxs].sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,5).map(t=>{
                  const m=CATS[t.category]||CATS.Other;
                  return (
                    <div key={t.id} className="tx" style={{gridTemplateColumns:"38px 1fr auto"}}>
                      <div style={{width:38,height:38,borderRadius:11,background:m.bg,display:"grid",placeItems:"center",fontSize:17}}>{m.icon}</div>
                      <div>
                        <div style={{fontSize:13.5,fontWeight:500,color:"#e2e8f0"}}>{t.description}</div>
                        <div style={{fontSize:11.5,color:"#334155",marginTop:2}}>{t.date} · <span style={{color:m.color}}>{t.category}</span></div>
                      </div>
                      <span style={{fontWeight:700,fontSize:14,color:t.type==="income"?"#34d399":"#f87171"}}>
                        {t.type==="income"?"+":"-"}{fmtINR(t.amount)}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ══════════════ TRANSACTIONS ══════════════ */}
        {page==="transactions"&&(
          <div className="fade">
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:22}}>
              <div>
                <h2 style={{fontFamily:"'Lora',serif",fontSize:24,fontWeight:700,color:"#f1f5f9"}}>{MONTHS[selM]} {selY}</h2>
                <p style={{color:"#334155",fontSize:13.5,marginTop:5}}>
                  {monthTxs.length} transactions · <span style={{color:"#f87171"}}>{fmtINR(expense)} spent</span> · <span style={{color:"#34d399"}}>{fmtINR(income)} earned</span>
                </p>
              </div>
              <div style={{display:"flex",gap:8}}>
                <button className="sbtn" onClick={()=>setShowForm(v=>!v)}>{showForm?"✕ Cancel":"+ Add Manual"}</button>
                <button className="pbtn" onClick={()=>setPage("upload")}>📸 Upload More</button>
              </div>
            </div>

            {showForm&&(
              <div className="glass" style={{padding:18,marginBottom:16,animation:"fadeIn 0.2s ease"}}>
                <div style={{display:"grid",gridTemplateColumns:"130px 1fr 110px 160px 100px auto",gap:10,alignItems:"end"}}>
                  <div><div style={{fontSize:10,color:"#334155",marginBottom:5,letterSpacing:"0.07em"}}>DATE</div><input type="date" value={form.date} onChange={e=>setForm(p=>({...p,date:e.target.value}))}/></div>
                  <div><div style={{fontSize:10,color:"#334155",marginBottom:5,letterSpacing:"0.07em"}}>DESCRIPTION</div><input placeholder="e.g. Zomato order" value={form.desc} onChange={e=>setForm(p=>({...p,desc:e.target.value}))}/></div>
                  <div><div style={{fontSize:10,color:"#334155",marginBottom:5,letterSpacing:"0.07em"}}>AMOUNT ₹</div><input type="number" placeholder="0" value={form.amount} onChange={e=>setForm(p=>({...p,amount:e.target.value}))}/></div>
                  <div><div style={{fontSize:10,color:"#334155",marginBottom:5,letterSpacing:"0.07em"}}>CATEGORY</div>
                    <select value={form.cat} onChange={e=>setForm(p=>({...p,cat:e.target.value}))}>
                      {Object.keys(CATS).map(c=><option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div><div style={{fontSize:10,color:"#334155",marginBottom:5,letterSpacing:"0.07em"}}>TYPE</div>
                    <select value={form.type} onChange={e=>setForm(p=>({...p,type:e.target.value}))}>
                      <option value="expense">Expense</option>
                      <option value="income">Income</option>
                    </select>
                  </div>
                  <button className="pbtn" onClick={addManual} style={{padding:"10px 18px"}}>Add</button>
                </div>
              </div>
            )}

            {/* Filter chips */}
            <div style={{display:"flex",flexWrap:"wrap",gap:7,marginBottom:18}}>
              {["All",...Object.keys(CATS).filter(c=>monthTxs.some(t=>t.category===c))].map(cat=>{
                const active=filterCat===cat, m=CATS[cat];
                return (
                  <button key={cat} className="chip" onClick={()=>setFilterCat(cat)} style={{
                    background:active?(m?m.bg:"rgba(167,139,250,0.12)"):"rgba(255,255,255,0.04)",
                    color:active?(m?m.color:"#a78bfa"):"#475569",
                    borderColor:active?(m?m.color+"33":"rgba(167,139,250,0.25)"):"rgba(255,255,255,0.07)"
                  }}>
                    {m?m.icon:"◈"} {cat}
                    {active&&cat!=="All"&&<span style={{marginLeft:4,opacity:0.6,fontSize:11}}>{monthTxs.filter(t=>t.category===cat).length}</span>}
                  </button>
                );
              })}
            </div>

            <div className="glass" style={{overflow:"hidden"}}>
              {/* Header row */}
              <div style={{display:"grid",gridTemplateColumns:"95px 1fr 155px 90px 105px 34px",gap:12,padding:"10px 16px",borderBottom:"1px solid rgba(255,255,255,0.05)"}}>
                {["DATE","DESCRIPTION","CATEGORY","TYPE","AMOUNT",""].map((h,i)=>(
                  <span key={i} style={{fontSize:9.5,color:"#2d3a48",fontWeight:700,letterSpacing:"0.1em",textAlign:i>=4?"right":"left"}}>{h}</span>
                ))}
              </div>

              {sortedFiltered.length===0?(
                <div style={{textAlign:"center",padding:"52px",color:"#2d3a48"}}>
                  {monthTxs.length===0?"No transactions yet — upload a screenshot!":"No transactions in this category."}
                </div>
              ):sortedFiltered.map((t,i)=>{
                const m=CATS[t.category]||CATS.Other;
                return (
                  <div key={t.id} className="tx" style={{gridTemplateColumns:"95px 1fr 155px 90px 105px 34px",borderBottom:"1px solid rgba(255,255,255,0.028)"}}>
                    <span style={{fontSize:12,color:"#3d4f62"}}>{t.date.slice(5).replace("-","/")} {t.date.slice(2,4)}</span>
                    <span style={{fontSize:13.5,fontWeight:500,color:"#cbd5e1",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.description}</span>
                    <span><span className="chip" style={{background:m.bg,color:m.color,borderColor:m.color+"22",fontSize:11}}>{m.icon} {t.category}</span></span>
                    <span><span className="chip" style={{
                      background:t.type==="income"?"rgba(52,211,153,0.09)":"rgba(248,113,113,0.09)",
                      color:t.type==="income"?"#34d399":"#f87171",
                      borderColor:t.type==="income"?"rgba(52,211,153,0.18)":"rgba(248,113,113,0.18)",
                      fontSize:11
                    }}>{t.type}</span></span>
                    <span style={{fontWeight:700,fontSize:13.5,color:t.type==="income"?"#34d399":"#f87171",textAlign:"right"}}>
                      {t.type==="income"?"+":"-"}{fmtINR(t.amount)}
                    </span>
                    <button className="dbtn" onClick={()=>setTxs(p=>p.filter(x=>x.id!==t.id))}>✕</button>
                  </div>
                );
              })}

              {sortedFiltered.length>0&&(
                <div style={{display:"grid",gridTemplateColumns:"95px 1fr 155px 90px 105px 34px",gap:12,padding:"13px 16px",borderTop:"1px solid rgba(255,255,255,0.06)",background:"rgba(255,255,255,0.015)"}}>
                  <span/><span style={{fontSize:12,color:"#334155"}}>{sortedFiltered.length} transactions</span>
                  <span/><span/>
                  <span style={{fontWeight:700,fontSize:13.5,color:"#e2e8f0",textAlign:"right"}}>
                    {fmtINR(sortedFiltered.reduce((s,t)=>t.type==="income"?s+t.amount:s-t.amount,0))}
                  </span>
                  <span/>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══════════════ UPLOAD ══════════════ */}
        {page==="upload"&&(
          <div className="fade" style={{maxWidth:740,margin:"0 auto"}}>
            <div style={{marginBottom:22}}>
              <h2 style={{fontFamily:"'Lora',serif",fontSize:24,fontWeight:700,color:"#f1f5f9"}}>Upload Screenshots</h2>
              <p style={{color:"#334155",marginTop:6,fontSize:13.5}}>Select multiple screenshots at once. Transactions from every image are merged and deduplicated automatically.</p>
            </div>

            {/* Stats */}
            {queue.length>0&&(
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:18}}>
                {[
                  {label:"Files",val:queue.length,color:"#a78bfa"},
                  {label:"Processing",val:pendingCount,color:"#fbbf24"},
                  {label:"Added",val:totalAdded,color:"#34d399"},
                  {label:"Duplicates Skipped",val:totalSkipped,color:"#64748b"},
                ].map((s,i)=>(
                  <div key={i} className="glass" style={{padding:"14px 16px"}}>
                    <div style={{fontSize:22,fontWeight:700,color:s.color,letterSpacing:"-0.5px"}}>{s.val}</div>
                    <div style={{fontSize:10.5,color:"#334155",marginTop:3,letterSpacing:"0.04em"}}>{s.label}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Drop zone */}
            <input ref={fileRef} type="file" accept="image/*" multiple style={{display:"none"}}
              onChange={e=>e.target.files.length&&addFiles(e.target.files)}/>
            <div className={`dz${drag?" on":""}`} style={{padding:"44px 24px",textAlign:"center",marginBottom:16}}
              onClick={()=>fileRef.current.click()}
              onDragOver={e=>{e.preventDefault();setDrag(true);}}
              onDragLeave={()=>setDrag(false)}
              onDrop={e=>{e.preventDefault();setDrag(false);addFiles(e.dataTransfer.files);}}>
              <div style={{fontSize:48,marginBottom:12,animation:"float 3s ease infinite"}}>📸</div>
              <div style={{fontWeight:600,fontSize:17,color:"#cbd5e1",marginBottom:7}}>Drop screenshots here</div>
              <div style={{fontSize:13.5,color:"#2d3a48",marginBottom:18}}>or click to browse · Multiple files supported</div>
              <div style={{display:"flex",justifyContent:"center",gap:8,flexWrap:"wrap"}}>
                {["PhonePe","GPay","Paytm","Bank SMS","UPI History","Credit Card","BHIM"].map(s=>(
                  <span key={s} style={{background:"rgba(167,139,250,0.07)",color:"#6d28d9",border:"1px solid rgba(167,139,250,0.14)",padding:"3px 10px",borderRadius:99,fontSize:11.5}}>{s}</span>
                ))}
              </div>
            </div>

            {/* Dedup info card */}
            <div className="glass" style={{padding:"16px 20px",marginBottom:18,display:"flex",alignItems:"flex-start",gap:14}}>
              <div style={{fontSize:26,flexShrink:0}}>🧠</div>
              <div>
                <div style={{fontSize:13.5,fontWeight:600,color:"#a78bfa",marginBottom:4}}>Smart Deduplication</div>
                <div style={{fontSize:12.5,color:"#3d4f62",lineHeight:1.6}}>
                  If the same payment appears in multiple screenshots (e.g. your bank statement <em>and</em> GPay history), FinanceOS detects the duplicate using the date, amount, and merchant — and skips it automatically. You'll never double-count.
                </div>
              </div>
            </div>

            {/* Queue list */}
            {queue.length>0&&(
              <div>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                  <span style={{fontSize:12.5,color:"#334155",fontWeight:500}}>{queue.length} file{queue.length!==1?"s":""}</span>
                  <button className="sbtn" style={{fontSize:12,padding:"5px 12px"}} onClick={()=>setQueue(q=>q.filter(x=>x.status==="pending"||x.status==="processing"))}>Clear completed</button>
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:8}}>
                  {queue.map(item=><QueueItem key={item.id} item={item} onRemove={id=>setQueue(q=>q.filter(x=>x.id!==id))}/>)}
                </div>
              </div>
            )}

            {queue.filter(q=>q.status==="done").length>0&&(
              <button className="pbtn" style={{marginTop:22,width:"100%",justifyContent:"center",padding:"13px"}} onClick={()=>setPage("dashboard")}>
                ◈ View Dashboard →
              </button>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
