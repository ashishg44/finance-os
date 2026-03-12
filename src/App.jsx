import { useState, useRef, useEffect } from "react";

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

const STORAGE_KEY = "financeos_transactions_v1";
const CLAUDE_PROMPT = `Extract all transactions from this screenshot and return ONLY a valid JSON array, nothing else — no explanation, no markdown, no backticks.

Each object must have exactly these fields:
- "date": "YYYY-MM-DD" (use current year if unclear, use "01" for unknown day)
- "description": short merchant or purpose string
- "amount": positive number (INR, digits only)
- "type": "income" or "expense" (credits/received/salary = income, debits/paid/sent = expense)
- "category": exactly one of these: Food & Dining, Transport, Shopping, Entertainment, Health, Bills & Utilities, Groceries, Salary, Freelance, Investment, Transfer, Recharge, Other

Return [] if no transactions found. Return ONLY the JSON array.`;

function genId() { return `${Date.now()}-${Math.random().toString(36).slice(2,7)}`; }
function fmtINR(n) { return "₹" + Math.abs(n).toLocaleString("en-IN", {maximumFractionDigits:0}); }

function loadTxs() {
  try { const r = localStorage.getItem(STORAGE_KEY); return r ? JSON.parse(r) : []; } catch { return []; }
}
function saveTxs(txs) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(txs)); } catch {}
}

function isDuplicate(existing, candidate) {
  return existing.some(t => {
    if (t.date !== candidate.date) return false;
    if (Math.abs(t.amount - candidate.amount) > 0.5) return false;
    const a = t.description.toLowerCase().replace(/\s+/g," ").trim();
    const b = candidate.description.toLowerCase().replace(/\s+/g," ").trim();
    if (a === b) return true;
    const minLen = Math.min(a.length, b.length, 8);
    if (minLen > 3 && a.slice(0,minLen) === b.slice(0,minLen)) return true;
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
  const w = 90, pad = 3;
  const pts = data.map((v,i) => {
    const x = pad + (i/(data.length-1))*(w-pad*2);
    const y = h - pad - (v/max)*(h-pad*2);
    return `${x},${y}`;
  }).join(" ");
  const last = pts.split(" ").pop()?.split(",");
  return (
    <svg width={w} height={h} style={{overflow:"visible",flexShrink:0}}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" opacity="0.7"/>
      {last && <circle cx={last[0]} cy={last[1]} r="3" fill={color}/>}
    </svg>
  );
}

function Donut({ data, size=140 }) {
  const r=(size/2)-14, cx=size/2, cy=size/2, sw=12, circ=2*Math.PI*r;
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
    <div style={{display:"flex",alignItems:"flex-end",gap:4,height:64}}>
      {data.map((d,i)=>{
        const h=Math.max(3,(d.value/max)*100), active=i===activeIdx;
        return (
          <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:3,height:"100%"}}>
            <div title={`${d.label}: ${fmtINR(d.value)}`} style={{
              width:"100%", borderRadius:active?"4px 4px 2px 2px":"3px 3px 1px 1px",
              height:`${h}%`, alignSelf:"flex-end",
              background:active?"linear-gradient(180deg,#a78bfa,#7c3aed)":"rgba(167,139,250,0.18)",
              transition:"height 0.7s cubic-bezier(.34,1.56,.64,1)"
            }}/>
            <span style={{fontSize:8,color:active?"#a78bfa":"#334155",fontWeight:active?600:400}}>{d.label}</span>
          </div>
        );
      })}
    </div>
  );
}

function MobileNav({ page, setPage }) {
  return (
    <div style={{position:"fixed",bottom:0,left:0,right:0,zIndex:300,background:"rgba(6,10,18,0.96)",backdropFilter:"blur(20px)",borderTop:"1px solid rgba(255,255,255,0.07)",display:"flex",padding:"8px 0 calc(8px + env(safe-area-inset-bottom))"}}>
      {[["dashboard","⬡","Dashboard"],["transactions","≡","Transactions"],["upload","⊕","Import"]].map(([v,ic,lb])=>(
        <button key={v} onClick={()=>setPage(v)} style={{
          flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:3,
          background:"none",border:"none",cursor:"pointer",padding:"6px 0",
          color:page===v?"#a78bfa":"#475569",transition:"color 0.2s"
        }}>
          <span style={{fontSize:18}}>{ic}</span>
          <span style={{fontSize:10,fontWeight:page===v?600:400}}>{lb}</span>
        </button>
      ))}
    </div>
  );
}

// ── Step Card ─────────────────────────────────────────────────────────────────
function StepCard({ num, title, children }) {
  return (
    <div style={{display:"flex",gap:14,padding:"18px 20px",background:"rgba(255,255,255,0.025)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:16,marginBottom:12}}>
      <div style={{width:28,height:28,borderRadius:"50%",background:"linear-gradient(135deg,#7c3aed,#a855f7)",display:"grid",placeItems:"center",fontSize:13,fontWeight:700,color:"#fff",flexShrink:0}}>{num}</div>
      <div style={{flex:1}}>
        <div style={{fontSize:14,fontWeight:600,color:"#e2e8f0",marginBottom:8}}>{title}</div>
        {children}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [txs, setTxs] = useState(()=>loadTxs());
  const [page, setPage] = useState("dashboard");
  const today = new Date();
  const [selM, setSelM] = useState(today.getMonth());
  const [selY, setSelY] = useState(today.getFullYear());
  const [jsonInput, setJsonInput] = useState("");
  const [importStatus, setImportStatus] = useState(null); // {type: success|error, msg}
  const [copied, setCopied] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({date:"",desc:"",amount:"",cat:"Other",type:"expense"});
  const [filterCat, setFilterCat] = useState("All");
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(()=>{
    const h = ()=>setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize",h);
    return ()=>window.removeEventListener("resize",h);
  },[]);

  useEffect(()=>{ saveTxs(txs); },[txs]);

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

  // ── Copy prompt ────────────────────────────────────────────────────────────
  function copyPrompt() {
    navigator.clipboard.writeText(CLAUDE_PROMPT).then(()=>{
      setCopied(true);
      setTimeout(()=>setCopied(false), 2500);
    });
  }

  // ── Import JSON ────────────────────────────────────────────────────────────
  function importJSON() {
    if (!jsonInput.trim()) {
      setImportStatus({type:"error", msg:"Please paste the JSON from Claude first."});
      return;
    }
    try {
      const clean = jsonInput.replace(/```[\w]*\n?/g,"").replace(/```/g,"").trim();
      const parsed = JSON.parse(clean);
      if (!Array.isArray(parsed)) throw new Error("Expected a JSON array");

      const candidates = parsed.map(t=>({
        id: genId(),
        date: String(t.date || `${selY}-${String(selM+1).padStart(2,"0")}-01`),
        description: String(t.description || "Unknown"),
        amount: Math.abs(Number(String(t.amount).replace(/[^\d.]/g,"")))||0,
        type: t.type==="income" ? "income" : "expense",
        category: CATS[t.category] ? t.category : "Other",
      })).filter(t=>t.amount>0);

      if (candidates.length===0) {
        setImportStatus({type:"error", msg:"No valid transactions found in the JSON."});
        return;
      }

      let added=0, skipped=0;
      setTxs(prev=>{
        const next=[...prev];
        candidates.forEach(c=>{ if(isDuplicate(next,c)){skipped++;}else{next.push(c);added++;} });
        return next;
      });

      setJsonInput("");
      setImportStatus({
        type:"success",
        msg:`✅ ${added} transaction${added!==1?"s":""} added${skipped>0?`, ${skipped} duplicate${skipped!==1?"s":""} skipped`:""}!`
      });
      setTimeout(()=>{ setImportStatus(null); setPage("dashboard"); }, 2500);
    } catch(e) {
      setImportStatus({type:"error", msg:`Invalid JSON: ${e.message}`});
    }
  }

  // ── Manual add ─────────────────────────────────────────────────────────────
  function addManual() {
    if(!form.date||!form.desc||!form.amount) return;
    setTxs(p=>[...p,{id:genId(),date:form.date,description:form.desc,amount:Math.abs(parseFloat(form.amount)),type:form.type,category:form.cat}]);
    setForm({date:"",desc:"",amount:"",cat:"Other",type:"expense"});
    setShowForm(false);
  }

  const filtered = filterCat==="All"?monthTxs:monthTxs.filter(t=>t.category===filterCat);
  const sortedFiltered = [...filtered].sort((a,b)=>new Date(b.date)-new Date(a.date));
  const pb = isMobile ? "16px 16px calc(80px + env(safe-area-inset-bottom))" : "26px 24px 64px";

  return (
    <div style={{minHeight:"100vh",background:"#060a12",color:"#e2e8f0",fontFamily:"'Outfit','Segoe UI',sans-serif"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Lora:wght@600;700&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:3px}::-webkit-scrollbar-thumb{background:rgba(167,139,250,0.25);border-radius:3px}
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
        @keyframes glowPulse{0%,100%{opacity:0.6}50%{opacity:1}}
        @keyframes slideIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        .glass{background:rgba(255,255,255,0.028);border:1px solid rgba(255,255,255,0.07);border-radius:18px;backdrop-filter:blur(16px)}
        .glass-lift{transition:transform 0.25s,border-color 0.25s,box-shadow 0.25s}
        .glass-lift:hover{transform:translateY(-2px);border-color:rgba(167,139,250,0.25);box-shadow:0 16px 40px rgba(0,0,0,0.3)}
        .nav-pill{display:flex;align-items:center;gap:7px;padding:9px 16px;border-radius:12px;border:1px solid transparent;background:none;color:#5a6a7a;cursor:pointer;font-size:13.5px;font-weight:500;font-family:'Outfit',sans-serif;transition:all 0.2s}
        .nav-pill:hover{color:#94a3b8;background:rgba(255,255,255,0.04)}
        .nav-pill.on{color:#a78bfa;background:rgba(167,139,250,0.1);border-color:rgba(167,139,250,0.2)}
        .chip{display:inline-flex;align-items:center;gap:5px;padding:4px 10px;border-radius:99px;font-size:11.5px;font-weight:500;cursor:pointer;border:1px solid transparent;transition:all 0.2s;white-space:nowrap}
        .pbtn{display:inline-flex;align-items:center;gap:8px;padding:10px 20px;background:linear-gradient(135deg,#7c3aed,#a855f7);border:none;border-radius:13px;color:#fff;font-size:14px;font-weight:600;font-family:'Outfit',sans-serif;cursor:pointer;transition:all 0.25s}
        .pbtn:hover{transform:translateY(-2px);box-shadow:0 10px 28px rgba(124,58,237,0.4)}
        .pbtn:disabled{opacity:0.5;cursor:not-allowed;transform:none}
        .sbtn{display:inline-flex;align-items:center;gap:6px;padding:8px 14px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.09);border-radius:11px;color:#7a8a9a;font-size:13px;font-weight:500;font-family:'Outfit',sans-serif;cursor:pointer;transition:all 0.2s}
        .sbtn:hover{background:rgba(255,255,255,0.09);color:#cbd5e1}
        input,select{background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.09);border-radius:11px;color:#e2e8f0;padding:10px 12px;font-size:13.5px;font-family:'Outfit',sans-serif;outline:none;width:100%;transition:all 0.2s}
        input:focus,select:focus{border-color:rgba(167,139,250,0.5);background:rgba(167,139,250,0.04)}
        input::placeholder{color:#2d3a48}
        select option{background:#111827;color:#e2e8f0}
        textarea{background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.09);border-radius:14px;color:#e2e8f0;padding:14px;font-size:13px;font-family:'Outfit',monospace;outline:none;width:100%;resize:vertical;transition:all 0.2s;line-height:1.5}
        textarea:focus{border-color:rgba(167,139,250,0.5);background:rgba(167,139,250,0.04)}
        textarea::placeholder{color:#2d3a48}
        .tx{display:grid;align-items:center;padding:10px 12px;border-radius:12px;transition:background 0.2s;gap:10px}
        .tx:hover{background:rgba(255,255,255,0.03)}
        .tx:hover .dbtn{opacity:1!important}
        .dbtn{opacity:0!important;background:rgba(248,113,113,0.1);border:none;color:#f87171;border-radius:7px;padding:4px 8px;cursor:pointer;font-size:11px;transition:all 0.2s!important;flex-shrink:0}
        .fade{animation:fadeUp 0.4s ease both}
        .prompt-box{background:rgba(167,139,250,0.05);border:1px solid rgba(167,139,250,0.15);border-radius:14px;padding:14px 16px;font-size:12px;color:#94a3b8;line-height:1.7;font-family:monospace;white-space:pre-wrap;word-break:break-word}
        .copy-btn{display:inline-flex;align-items:center;gap:7px;padding:10px 20px;background:linear-gradient(135deg,#0f766e,#14b8a6);border:none;border-radius:12px;color:#fff;font-size:14px;font-weight:600;font-family:'Outfit',sans-serif;cursor:pointer;transition:all 0.25s;width:100%;justify-content:center;margin-top:10px}
        .copy-btn:hover{transform:translateY(-1px);box-shadow:0 8px 24px rgba(20,184,166,0.35)}
        .copy-btn.done{background:linear-gradient(135deg,#059669,#34d399)}
        .import-btn{display:inline-flex;align-items:center;gap:8px;padding:12px 20px;background:linear-gradient(135deg,#7c3aed,#a855f7);border:none;border-radius:13px;color:#fff;font-size:14px;font-weight:600;font-family:'Outfit',sans-serif;cursor:pointer;transition:all 0.25s;width:100%;justify-content:center;margin-top:10px}
        .import-btn:hover{transform:translateY(-1px);box-shadow:0 8px 24px rgba(124,58,237,0.4)}
        .status-box{padding:12px 16px;border-radius:12px;font-size:13.5px;font-weight:500;animation:slideIn 0.3s ease;margin-top:12px}
      `}</style>

      {/* Ambient */}
      <div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:0,overflow:"hidden"}}>
        <div style={{position:"absolute",width:600,height:600,borderRadius:"50%",background:"radial-gradient(circle,rgba(124,58,237,0.06) 0%,transparent 65%)",top:"-20%",left:"-10%"}}/>
        <div style={{position:"absolute",width:400,height:400,borderRadius:"50%",background:"radial-gradient(circle,rgba(16,185,129,0.04) 0%,transparent 65%)",bottom:"-5%",right:"0%"}}/>
      </div>

      {/* ── Desktop Header ── */}
      <header style={{position:"sticky",top:0,zIndex:300,borderBottom:"1px solid rgba(255,255,255,0.05)",background:"rgba(6,10,18,0.88)",backdropFilter:"blur(28px)",display:isMobile?"none":"block"}}>
        <div style={{maxWidth:1300,margin:"0 auto",display:"flex",alignItems:"center",height:60,gap:6,padding:"0 24px"}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginRight:24,flexShrink:0}}>
            <div style={{width:30,height:30,borderRadius:9,background:"linear-gradient(135deg,#6d28d9,#a78bfa)",display:"grid",placeItems:"center",fontSize:14,animation:"glowPulse 3s ease infinite"}}>◈</div>
            <span style={{fontFamily:"'Lora',serif",fontWeight:700,fontSize:17,color:"#f1f5f9"}}>FinanceOS</span>
          </div>
          <nav style={{display:"flex",gap:3,flex:1}}>
            {[["dashboard","⬡","Dashboard"],["transactions","≡","Transactions"],["upload","⊕","Import"]].map(([v,ic,lb])=>(
              <button key={v} className={`nav-pill${page===v?" on":""}`} onClick={()=>setPage(v)}>
                <span style={{fontSize:13}}>{ic}</span>{lb}
              </button>
            ))}
          </nav>
          <div style={{display:"flex",alignItems:"center",gap:5,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:13,padding:"4px 6px"}}>
            <button className="sbtn" style={{padding:"5px 9px",borderRadius:8,background:"none",border:"none"}} onClick={()=>{let m=selM-1,y=selY;if(m<0){m=11;y--;}setSelM(m);setSelY(y);}}>‹</button>
            <span style={{fontSize:13,fontWeight:600,minWidth:88,textAlign:"center",color:"#cbd5e1"}}>{SHORT_MONTHS[selM]} {selY}</span>
            <button className="sbtn" style={{padding:"5px 9px",borderRadius:8,background:"none",border:"none"}} onClick={()=>{let m=selM+1,y=selY;if(m>11){m=0;y++;}setSelM(m);setSelY(y);}}>›</button>
          </div>
        </div>
      </header>

      {/* ── Mobile Header ── */}
      {isMobile&&(
        <header style={{position:"sticky",top:0,zIndex:300,borderBottom:"1px solid rgba(255,255,255,0.05)",background:"rgba(6,10,18,0.92)",backdropFilter:"blur(28px)",padding:"12px 16px"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <div style={{width:28,height:28,borderRadius:8,background:"linear-gradient(135deg,#6d28d9,#a78bfa)",display:"grid",placeItems:"center",fontSize:13}}>◈</div>
              <span style={{fontFamily:"'Lora',serif",fontWeight:700,fontSize:16,color:"#f1f5f9"}}>FinanceOS</span>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:4,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:11,padding:"3px 5px"}}>
              <button style={{background:"none",border:"none",color:"#94a3b8",padding:"4px 8px",cursor:"pointer",fontSize:14}} onClick={()=>{let m=selM-1,y=selY;if(m<0){m=11;y--;}setSelM(m);setSelY(y);}}>‹</button>
              <span style={{fontSize:12,fontWeight:600,color:"#cbd5e1",minWidth:70,textAlign:"center"}}>{SHORT_MONTHS[selM]} {selY}</span>
              <button style={{background:"none",border:"none",color:"#94a3b8",padding:"4px 8px",cursor:"pointer",fontSize:14}} onClick={()=>{let m=selM+1,y=selY;if(m>11){m=0;y++;}setSelM(m);setSelY(y);}}>›</button>
            </div>
          </div>
        </header>
      )}

      {isMobile && <MobileNav page={page} setPage={setPage}/>}

      <main style={{maxWidth:1300,margin:"0 auto",padding:pb,position:"relative",zIndex:1}}>

        {/* ══ DASHBOARD ══ */}
        {page==="dashboard"&&(
          <div className="fade">
            <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(3,1fr)",gap:isMobile?10:14,marginBottom:isMobile?12:18}}>
              {[
                {label:"Income",val:income,color:"#34d399",spark:trend.map(t=>t.value*0.9+200),pre:"+"},
                {label:"Expenses",val:expense,color:"#f87171",spark:trend.map(t=>t.value),pre:"-"},
                {label:"Savings",val:Math.abs(savings),color:savings>=0?"#a78bfa":"#fb923c",spark:trend.map(t=>Math.abs(t.value*0.25)),pre:savings>=0?"":"−"},
              ].map((k,i)=>(
                <div key={i} className={`glass glass-lift${i===2&&isMobile?" ":""}` } style={{padding:isMobile?"14px 16px":"20px 22px",gridColumn:i===2&&isMobile?"1/-1":"auto"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                    <div>
                      <div style={{fontSize:10,color:"#3d4f62",fontWeight:600,letterSpacing:"0.07em",textTransform:"uppercase",marginBottom:8}}>{k.label}</div>
                      <div style={{fontSize:isMobile?20:26,fontWeight:700,color:k.color,letterSpacing:"-0.5px",lineHeight:1}}>
                        {k.pre}₹<Counter value={k.val}/>
                      </div>
                    </div>
                    {!isMobile && <Sparkline data={k.spark} color={k.color}/>}
                  </div>
                </div>
              ))}
            </div>

            <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1.2fr 1fr",gap:isMobile?10:14,marginBottom:isMobile?10:14}}>
              <div className="glass" style={{padding:isMobile?"14px 16px":"20px 22px"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
                  <h3 style={{fontFamily:"'Lora',serif",fontSize:isMobile?15:17,fontWeight:700,color:"#f1f5f9"}}>Where Your Money Goes</h3>
                  <span style={{fontSize:11,color:"#334155"}}>{SHORT_MONTHS[selM]}</span>
                </div>
                {catBreakdown.length===0?(
                  <div style={{textAlign:"center",padding:"28px 0"}}>
                    <div style={{fontSize:36,marginBottom:10,animation:"float 3s ease infinite"}}>🪙</div>
                    <div style={{color:"#3d4f62",fontSize:13,marginBottom:14}}>No transactions yet</div>
                    <button className="pbtn" style={{fontSize:13}} onClick={()=>setPage("upload")}>⊕ Import Transactions</button>
                  </div>
                ):(
                  catBreakdown.slice(0,isMobile?5:7).map((c,i)=>{
                    const pct=expense>0?(c.val/expense)*100:0;
                    return (
                      <div key={i} style={{marginBottom:11}}>
                        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                          <span style={{fontSize:14}}>{c.icon}</span>
                          <span style={{flex:1,fontSize:12.5,color:"#94a3b8"}}>{c.cat}</span>
                          <span style={{fontSize:12.5,fontWeight:600,color:"#e2e8f0"}}>{fmtINR(c.val)}</span>
                          <span style={{fontSize:10,color:"#334155",minWidth:26,textAlign:"right"}}>{pct.toFixed(0)}%</span>
                        </div>
                        <div style={{height:3,background:"rgba(255,255,255,0.05)",borderRadius:3,overflow:"hidden",marginLeft:22}}>
                          <div style={{height:"100%",width:`${pct}%`,background:c.color,borderRadius:3,transition:"width 0.9s cubic-bezier(.4,0,.2,1)"}}/>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div style={{display:"flex",flexDirection:isMobile?"row":"column",gap:isMobile?10:14}}>
                <div className="glass" style={{padding:isMobile?"14px":"20px 22px",flex:1,display:"flex",flexDirection:"column",alignItems:"center"}}>
                  <h3 style={{fontFamily:"'Lora',serif",fontSize:14,fontWeight:700,color:"#f1f5f9",marginBottom:12,alignSelf:"flex-start"}}>Mix</h3>
                  {catBreakdown.length>0?(
                    <>
                      <Donut data={catBreakdown.slice(0,6).map(c=>({value:c.val,color:c.color}))} size={isMobile?100:130}/>
                      {!isMobile&&<div style={{display:"flex",flexWrap:"wrap",gap:"4px 10px",marginTop:10,justifyContent:"center"}}>
                        {catBreakdown.slice(0,5).map((c,i)=>(
                          <div key={i} style={{display:"flex",alignItems:"center",gap:4}}>
                            <div style={{width:6,height:6,borderRadius:"50%",background:c.color}}/>
                            <span style={{fontSize:10,color:"#475569"}}>{c.cat.split(" ")[0]}</span>
                          </div>
                        ))}
                      </div>}
                    </>
                  ):<div style={{color:"#334155",fontSize:12,padding:"20px 0"}}>No data</div>}
                </div>
                <div className="glass" style={{padding:isMobile?"14px":"20px 22px",flex:1}}>
                  <h3 style={{fontFamily:"'Lora',serif",fontSize:14,fontWeight:700,color:"#f1f5f9",marginBottom:12}}>6-Month</h3>
                  <BarChart data={trend} activeIdx={5}/>
                </div>
              </div>
            </div>

            <div className="glass" style={{padding:isMobile?"14px 16px":"20px 22px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
                <h3 style={{fontFamily:"'Lora',serif",fontSize:isMobile?15:17,fontWeight:700,color:"#f1f5f9"}}>Recent</h3>
                <button className="sbtn" style={{fontSize:12,padding:"6px 12px"}} onClick={()=>setPage("transactions")}>View All →</button>
              </div>
              {monthTxs.length===0?(
                <div style={{textAlign:"center",padding:"20px",color:"#334155",fontSize:13}}>
                  No transactions yet. <span style={{color:"#a78bfa",cursor:"pointer"}} onClick={()=>setPage("upload")}>Import from Claude →</span>
                </div>
              ):(
                [...monthTxs].sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,5).map(t=>{
                  const m=CATS[t.category]||CATS.Other;
                  return (
                    <div key={t.id} className="tx" style={{gridTemplateColumns:"34px 1fr auto"}}>
                      <div style={{width:34,height:34,borderRadius:10,background:m.bg,display:"grid",placeItems:"center",fontSize:15}}>{m.icon}</div>
                      <div>
                        <div style={{fontSize:13,fontWeight:500,color:"#e2e8f0",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.description}</div>
                        <div style={{fontSize:11,color:"#334155",marginTop:1}}>{t.date} · <span style={{color:m.color}}>{t.category}</span></div>
                      </div>
                      <span style={{fontWeight:700,fontSize:13.5,color:t.type==="income"?"#34d399":"#f87171",flexShrink:0}}>
                        {t.type==="income"?"+":"-"}{fmtINR(t.amount)}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ══ TRANSACTIONS ══ */}
        {page==="transactions"&&(
          <div className="fade">
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:18,gap:12}}>
              <div>
                <h2 style={{fontFamily:"'Lora',serif",fontSize:isMobile?20:24,fontWeight:700,color:"#f1f5f9"}}>{isMobile?SHORT_MONTHS[selM]:MONTHS[selM]} {selY}</h2>
                <p style={{color:"#334155",fontSize:12.5,marginTop:4}}>{monthTxs.length} tx · <span style={{color:"#f87171"}}>{fmtINR(expense)}</span> · <span style={{color:"#34d399"}}>{fmtINR(income)}</span></p>
              </div>
              <div style={{display:"flex",gap:8,flexShrink:0}}>
                <button className="sbtn" style={{fontSize:12,padding:"7px 12px"}} onClick={()=>setShowForm(v=>!v)}>{showForm?"✕":"+ Add"}</button>
                <button className="pbtn" style={{fontSize:12,padding:"7px 14px"}} onClick={()=>setPage("upload")}>⊕ Import</button>
              </div>
            </div>

            {showForm&&(
              <div className="glass" style={{padding:16,marginBottom:14}}>
                <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"130px 1fr 110px 160px 100px auto",gap:10,alignItems:"end"}}>
                  <div><div style={{fontSize:10,color:"#334155",marginBottom:5}}>DATE</div><input type="date" value={form.date} onChange={e=>setForm(p=>({...p,date:e.target.value}))}/></div>
                  <div style={isMobile?{gridColumn:"1/-1"}:{}}><div style={{fontSize:10,color:"#334155",marginBottom:5}}>DESCRIPTION</div><input placeholder="e.g. Zomato order" value={form.desc} onChange={e=>setForm(p=>({...p,desc:e.target.value}))}/></div>
                  <div><div style={{fontSize:10,color:"#334155",marginBottom:5}}>AMOUNT ₹</div><input type="number" placeholder="0" value={form.amount} onChange={e=>setForm(p=>({...p,amount:e.target.value}))}/></div>
                  <div><div style={{fontSize:10,color:"#334155",marginBottom:5}}>CATEGORY</div>
                    <select value={form.cat} onChange={e=>setForm(p=>({...p,cat:e.target.value}))}>
                      {Object.keys(CATS).map(c=><option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div><div style={{fontSize:10,color:"#334155",marginBottom:5}}>TYPE</div>
                    <select value={form.type} onChange={e=>setForm(p=>({...p,type:e.target.value}))}>
                      <option value="expense">Expense</option>
                      <option value="income">Income</option>
                    </select>
                  </div>
                  <button className="pbtn" onClick={addManual} style={{padding:"10px 16px"}}>Add</button>
                </div>
              </div>
            )}

            <div style={{display:"flex",flexWrap:"nowrap",gap:6,marginBottom:14,overflowX:"auto",paddingBottom:4}}>
              {["All",...Object.keys(CATS).filter(c=>monthTxs.some(t=>t.category===c))].map(cat=>{
                const active=filterCat===cat, m=CATS[cat];
                return (
                  <button key={cat} className="chip" onClick={()=>setFilterCat(cat)} style={{
                    background:active?(m?m.bg:"rgba(167,139,250,0.12)"):"rgba(255,255,255,0.04)",
                    color:active?(m?m.color:"#a78bfa"):"#475569",
                    borderColor:active?(m?m.color+"33":"rgba(167,139,250,0.25)"):"rgba(255,255,255,0.07)",
                    flexShrink:0
                  }}>
                    {m?m.icon:"◈"} {cat}
                  </button>
                );
              })}
            </div>

            <div className="glass" style={{overflow:"hidden"}}>
              {sortedFiltered.length===0?(
                <div style={{textAlign:"center",padding:"48px",color:"#2d3a48"}}>
                  {monthTxs.length===0?"No transactions yet.":"No transactions in this category."}
                </div>
              ):sortedFiltered.map((t)=>{
                const m=CATS[t.category]||CATS.Other;
                return (
                  <div key={t.id} className="tx" style={{gridTemplateColumns:"34px 1fr auto auto",borderBottom:"1px solid rgba(255,255,255,0.028)"}}>
                    <div style={{width:34,height:34,borderRadius:10,background:m.bg,display:"grid",placeItems:"center",fontSize:15,flexShrink:0}}>{m.icon}</div>
                    <div style={{minWidth:0}}>
                      <div style={{fontSize:13,fontWeight:500,color:"#cbd5e1",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.description}</div>
                      <div style={{fontSize:11,color:"#334155",marginTop:2}}>{t.date.slice(5).replace("-","/")} · <span style={{color:m.color}}>{isMobile?t.category.split(" ")[0]:t.category}</span></div>
                    </div>
                    <span style={{fontWeight:700,fontSize:13.5,color:t.type==="income"?"#34d399":"#f87171",flexShrink:0}}>
                      {t.type==="income"?"+":"-"}{fmtINR(t.amount)}
                    </span>
                    <button className="dbtn" style={{opacity:1}} onClick={()=>setTxs(p=>p.filter(x=>x.id!==t.id))}>✕</button>
                  </div>
                );
              })}
              {sortedFiltered.length>0&&(
                <div style={{display:"flex",justifyContent:"space-between",padding:"12px 14px",borderTop:"1px solid rgba(255,255,255,0.06)",background:"rgba(255,255,255,0.015)"}}>
                  <span style={{fontSize:12,color:"#334155"}}>{sortedFiltered.length} transactions</span>
                  <span style={{fontWeight:700,fontSize:13.5,color:"#e2e8f0"}}>
                    {fmtINR(sortedFiltered.reduce((s,t)=>t.type==="income"?s+t.amount:s-t.amount,0))}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══ IMPORT ══ */}
        {page==="upload"&&(
          <div className="fade" style={{maxWidth:660,margin:"0 auto"}}>
            <div style={{marginBottom:20}}>
              <h2 style={{fontFamily:"'Lora',serif",fontSize:isMobile?20:24,fontWeight:700,color:"#f1f5f9"}}>Import Transactions</h2>
              <p style={{color:"#334155",marginTop:5,fontSize:13}}>Use Claude.ai (free) to extract transactions from your screenshots — then paste the result here.</p>
            </div>

            {/* Step 1 */}
            <StepCard num="1" title="Copy this prompt">
              <div className="prompt-box">{CLAUDE_PROMPT}</div>
              <button className={`copy-btn${copied?" done":""}`} onClick={copyPrompt}>
                {copied ? "✓ Copied!" : "📋 Copy Prompt"}
              </button>
            </StepCard>

            {/* Step 2 */}
            <StepCard num="2" title={<span>Go to <a href="https://claude.ai" target="_blank" rel="noopener noreferrer" style={{color:"#a78bfa",textDecoration:"none"}}>claude.ai</a> and send the prompt + your screenshot</span>}>
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                <div style={{display:"flex",alignItems:"flex-start",gap:10,padding:"10px 12px",background:"rgba(255,255,255,0.03)",borderRadius:10}}>
                  <span style={{fontSize:18,flexShrink:0}}>1️⃣</span>
                  <span style={{fontSize:13,color:"#94a3b8",lineHeight:1.6}}>Open claude.ai → start a new chat</span>
                </div>
                <div style={{display:"flex",alignItems:"flex-start",gap:10,padding:"10px 12px",background:"rgba(255,255,255,0.03)",borderRadius:10}}>
                  <span style={{fontSize:18,flexShrink:0}}>2️⃣</span>
                  <span style={{fontSize:13,color:"#94a3b8",lineHeight:1.6}}>Paste the copied prompt in the message box</span>
                </div>
                <div style={{display:"flex",alignItems:"flex-start",gap:10,padding:"10px 12px",background:"rgba(255,255,255,0.03)",borderRadius:10}}>
                  <span style={{fontSize:18,flexShrink:0}}>3️⃣</span>
                  <span style={{fontSize:13,color:"#94a3b8",lineHeight:1.6}}>Attach your screenshot(s) and send — Claude will reply with a JSON array</span>
                </div>
                <div style={{display:"flex",alignItems:"flex-start",gap:10,padding:"10px 12px",background:"rgba(255,255,255,0.03)",borderRadius:10}}>
                  <span style={{fontSize:18,flexShrink:0}}>4️⃣</span>
                  <span style={{fontSize:13,color:"#94a3b8",lineHeight:1.6}}>Copy the entire JSON response from Claude</span>
                </div>
              </div>
            </StepCard>

            {/* Step 3 */}
            <StepCard num="3" title="Paste the JSON here and import">
              <textarea
                rows={8}
                placeholder={`Paste Claude's JSON response here...\n\nExample:\n[\n  {"date":"2026-03-01","description":"Swiggy","amount":320,"type":"expense","category":"Food & Dining"},\n  ...\n]`}
                value={jsonInput}
                onChange={e=>{setJsonInput(e.target.value);setImportStatus(null);}}
              />
              {importStatus&&(
                <div className="status-box" style={{
                  background: importStatus.type==="success"?"rgba(52,211,153,0.08)":"rgba(248,113,113,0.08)",
                  border: `1px solid ${importStatus.type==="success"?"rgba(52,211,153,0.2)":"rgba(248,113,113,0.2)"}`,
                  color: importStatus.type==="success"?"#34d399":"#f87171"
                }}>
                  {importStatus.msg}
                </div>
              )}
              <button className="import-btn" onClick={importJSON} disabled={!jsonInput.trim()}>
                ⊕ Import Transactions
              </button>
            </StepCard>

            {/* Manual add */}
            <div style={{marginTop:8,textAlign:"center"}}>
              <span style={{fontSize:13,color:"#334155"}}>Want to add a single transaction manually? </span>
              <span style={{fontSize:13,color:"#a78bfa",cursor:"pointer"}} onClick={()=>{setPage("transactions");setShowForm(true);}}>Add manually →</span>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
