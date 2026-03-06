import { useState, useMemo } from "react";

const DAYS = ["월","화","수","목","금","토","일"];
const MIN_WAGE = 10320;
const WEEKS = 4.345;

function timeToMin(t) { const [h,m]=t.split(":").map(Number); return h*60+m; }
function fmt(n) { if(!n&&n!==0) return ""; return Math.round(n).toLocaleString("ko-KR"); }
function today() { return new Date().toISOString().slice(0,10).replace(/-/g,"."); }
function getIncomeTax(taxable,dep){
  let tax=0;
  if(taxable<=1060000)tax=0;
  else if(taxable<=1500000)tax=(taxable-1060000)*0.06;
  else if(taxable<=3000000)tax=26400+(taxable-1500000)*0.15;
  else if(taxable<=4500000)tax=251400+(taxable-3000000)*0.24;
  else if(taxable<=8000000)tax=611400+(taxable-4500000)*0.35;
  else tax=1836400+(taxable-8000000)*0.38;
  const dd=[0,0,14000,21000,28000,35000,42000,49000];
  return Math.max(0,Math.round(tax-dd[Math.min(dep,7)]));
}
const defaultDay=(work)=>({work,start:"09:00",end:"18:00",breakMin:60});

function calcMonthlyHours(start,end,breakMin,daysPerWeek){
  const sm=timeToMin(start),em=timeToMin(end);
  const dailyH=Math.max(0,em-sm-breakMin)/60;
  const weeklyH=dailyH*daysPerWeek;
  const hasWL=weeklyH>=15;
  const wlH=hasWL?(daysPerWeek>0?weeklyH/daysPerWeek:0):0;
  const totalPaid=(weeklyH+wlH)*WEEKS;
  return {dailyH,weeklyH,totalPaid,hasWL};
}
function calcEmployerIns(salary){
  const npBase=Math.min(salary,6370000);
  const np=Math.round(npBase*0.0475);
  const hi=Math.round(salary*0.03595);
  const lt=Math.round(hi*0.1314);
  const ei=Math.round(salary*0.0105);
  const wi=Math.round(salary*0.0147);
  return {np,hi,lt,ei,wi,total:np+hi+lt+ei+wi};
}
function calcForRate(hrRate,monthlyBasicH,monthlyWLH,monthlyOTH,monthlyNightH,meal,dep){
  const basicPay=hrRate*monthlyBasicH,wlPay=hrRate*monthlyWLH,otPay=hrRate*0.5*monthlyOTH,ntPay=hrRate*0.5*monthlyNightH;
  const mealNT=Math.min(meal,200000),gross=basicPay+wlPay+otPay+ntPay+mealNT,taxBase=basicPay+wlPay+otPay+ntPay;
  const npBase=Math.min(taxBase,6370000),npE=Math.round(npBase*0.0475),hiE=Math.round(taxBase*0.03595),ltE=Math.round(hiE*0.1314),eiE=Math.round(taxBase*0.009);
  const insE=npE+hiE+ltE+eiE,itax=getIncomeTax(taxBase-insE,dep),ltax=Math.round(itax*0.1),totDed=insE+itax+ltax,net=gross-totDed;
  const npR=Math.round(npBase*0.0475),hiR=Math.round(taxBase*0.03595),ltR=Math.round(hiR*0.1314),eiR=Math.round(taxBase*0.0105),wiR=Math.round(taxBase*0.0147),insR=npR+hiR+ltR+eiR+wiR,totCost=gross+insR;
  const totalPaidH=monthlyBasicH+monthlyWLH,hrCost=totalPaidH>0?totCost/totalPaidH:0;
  return {hrRate,basicPay,wlPay,otPay,ntPay,mealNT,gross,npE,hiE,ltE,eiE,insE,itax,ltax,totDed,net,npR,hiR,ltR,eiR,wiR,insR,totCost,hrCost};
}

/* ── 공통 컴포넌트 ── */
const Card=({title,accent="blue",children})=>{
  const bar={blue:"border-l-blue-500",green:"border-l-emerald-500",amber:"border-l-amber-500",slate:"border-l-slate-400",rose:"border-l-rose-500"}[accent];
  return(<div className={`bg-white rounded-xl border border-gray-100 shadow-sm border-l-4 ${bar} mb-3`}>{title&&<div className="px-4 py-2.5 border-b border-gray-50"><span className="text-xs font-black text-gray-500 tracking-widest uppercase">{title}</span></div>}<div className="px-4 py-3">{children}</div></div>);
};
const ColHeader=({icon,title,sub})=>(<div className="mb-3 pb-2.5 border-b-2 border-gray-800 flex items-center gap-2"><span className="text-base">{icon}</span><div><h2 className="text-sm font-black text-gray-900">{title}</h2>{sub&&<p className="text-xs text-gray-400">{sub}</p>}</div></div>);
const RowItem=({label,value,color="text-gray-600",bold=false})=>(<div className="flex justify-between items-center py-1 border-b border-gray-50 last:border-0"><span className="text-xs text-gray-400">{label}</span><span className={`text-xs font-mono ${bold?"font-black":"font-semibold"} ${color}`}>{value}</span></div>);
const ResultBlock=({r,label,scheme})=>{
  const g=scheme==="green";
  const hdr=g?"bg-emerald-600":"bg-blue-600",net=g?"bg-emerald-500":"bg-blue-500",tag=g?"bg-emerald-50 border-emerald-100 text-emerald-700":"bg-blue-50 border-blue-100 text-blue-700",bdr=g?"border-emerald-200":"border-blue-200";
  return(<div className={`rounded-xl border ${bdr} mb-3 overflow-hidden`}><div className={`${hdr} px-3 py-2 flex justify-between items-center`}><span className="text-white text-xs font-black">{label}</span><span className="text-white text-sm font-black font-mono">{fmt(r.hrRate)}원<span className="text-xs opacity-70 font-normal">/h</span></span></div><div className="grid grid-cols-2 gap-2 p-3"><div className="bg-gray-50 rounded-lg p-2.5 text-center"><p className="text-xs text-gray-400 mb-1">총 지급액(세전)</p><p className="text-sm font-black font-mono text-gray-800">{fmt(r.gross)}<span className="text-xs font-normal text-gray-400">원</span></p></div><div className={`${net} rounded-lg p-2.5 text-center`}><p className="text-xs text-white opacity-80 mb-1">실수령액</p><p className="text-sm font-black font-mono text-white">{fmt(r.net)}<span className="text-xs font-normal opacity-80">원</span></p></div><div className="bg-gray-50 rounded-lg p-2.5 text-center"><p className="text-xs text-gray-400 mb-1">공제액 합계</p><p className="text-sm font-black font-mono text-red-500">{fmt(r.totDed)}<span className="text-xs font-normal text-gray-400">원</span></p></div><div className="bg-orange-500 rounded-lg p-2.5 text-center"><p className="text-xs text-white opacity-80 mb-1">사업주 총비용</p><p className="text-sm font-black font-mono text-white">{fmt(r.totCost)}<span className="text-xs font-normal opacity-80">원</span></p></div></div><div className="px-3 pb-2"><div className="bg-gray-50 rounded-lg px-3 py-2"><p className="text-xs font-bold text-gray-400 mb-1.5">근로자 공제 명세</p>{[["국민연금 4.75%",`-${fmt(r.npE)}원`,"text-red-400"],["건강보험 3.595%",`-${fmt(r.hiE)}원`,"text-red-400"],["장기요양 ×13.14%",`-${fmt(r.ltE)}원`,"text-red-400"],["고용보험 0.9%",`-${fmt(r.eiE)}원`,"text-red-400"],["소득세+지방세",`-${fmt(r.itax+r.ltax)}원`,"text-red-400"],["사업주 부담 보험",`+${fmt(r.insR)}원`,"text-orange-500"]].map(([l,v,c])=><RowItem key={l} label={l} value={v} color={c}/>)}</div></div><div className={`mx-3 mb-3 border ${tag} rounded-lg px-3 py-2 flex justify-between items-center`}><span className="text-xs font-bold">시간당 실질 인건비</span><span className="text-sm font-black font-mono">{fmt(r.hrCost)}원/h</span></div></div>);
};

/* ══════════════════════════════════════════════════════
   견적서 탭 — 실제 폼 형태 그대로 + 하단 입력 패널
══════════════════════════════════════════════════════ */
let gid=1;
const newGroup=(preset={})=>({id:gid++,label:"주5일(평일)",daysPerWeek:5,start:"09:00",end:"18:00",breakMin:60,headcount:1,monthlySalary:2000000,...preset});
const newWeekendGroup=()=>newGroup({id:gid++,label:"주말(토·일)",daysPerWeek:2,start:"09:00",end:"18:00",breakMin:60,headcount:1,monthlySalary:1500000});

function QuoteTab(){
  const [site,setSite]=useState({name:"",date:today(),contractType:"월~금",contractPeriod:"기본 1년",hours:"09:00~18:00",staffCount:"1명",workType:"주5일",note:""});
  const [groups,setGroups]=useState([newGroup(), {id:gid++,label:"주말(토·일)",daysPerWeek:2,start:"09:00",end:"18:00",breakMin:60,headcount:1,monthlySalary:1500000}]);
  const [support,setSupport]=useState({amt:2000000,desc:"리스크대비 및 운영 관리비용"});
  // 주차대행보험료 — 항상 표시
  const [valetIns,setValetIns]=useState({amt:700000,desc:"본관 + 공도 주차장 및 공영 (공도보험필요)"});
  const [extras,setExtras]=useState([]);
  // 에누리 — 직접 입력 금액
  const [discAmt,setDiscAmt]=useState(0);
  const [ops,setOps]=useState(["주차부스 사용 조건 (중고부스 구입및 설치 / 당사기증 / 당사비용)","전기사용필요 (고객사 여건 제공)","",""]);

  const groupCalcs=useMemo(()=>groups.map(g=>{
    const h=calcMonthlyHours(g.start,g.end,g.breakMin,g.daysPerWeek);
    const hrRate=h.totalPaid>0?Math.round(g.monthlySalary/h.totalPaid):0;
    const ins=calcEmployerIns(g.monthlySalary);
    const retire=Math.round(g.monthlySalary/12);
    const rowTotal=(g.monthlySalary+ins.total+retire)*g.headcount;
    return {...h,hrRate,ins,retire,rowTotal};
  }),[groups]);

  const summary=useMemo(()=>{
    const laborTotal=groupCalcs.reduce((s,c)=>s+c.rowTotal,0);
    const supportAmt=parseInt(support.amt)||0;
    const insAmt=parseInt(valetIns.amt)||0;
    const extAmt=extras.reduce((s,e)=>s+(parseInt(e.amt)||0),0);
    const raw=laborTotal+supportAmt+insAmt+extAmt;
    const disc=parseInt(discAmt)||0;
    const final=Math.max(0,raw-disc);
    const salarySum=groups.reduce((s,g)=>s+g.monthlySalary*g.headcount,0);
    const ins4Sum=groupCalcs.reduce((s,c,i)=>s+c.ins.total*groups[i].headcount,0);
    const retireSum=groupCalcs.reduce((s,c,i)=>s+c.retire*groups[i].headcount,0);
    return {laborTotal,supportAmt,insAmt,extAmt,raw,final,disc,salarySum,ins4Sum,retireSum};
  },[groupCalcs,groups,support,valetIns,extras,discAmt]);

  const updateGroup=(id,p)=>setGroups(gs=>gs.map(g=>g.id===id?{...g,...p}:g));
  const addGroup=()=>setGroups(gs=>[...gs,newGroup()]);
  const addWeekend=()=>setGroups(gs=>[...gs,newWeekendGroup()]);
  const removeGroup=(id)=>setGroups(gs=>gs.filter(g=>g.id!==id));

  // 운영지원금 아래 서브행 수 (보험료 항상 + 기타들)
  const supportSubRows=1+extras.length; // 보험료 1행 항상 + 기타

  /* 셀 인풋 */
  const CI=({value,onChange,placeholder="",cls=""})=>(
    <input value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
      className={`w-full bg-transparent border-0 border-b border-dashed border-gray-300 focus:outline-none focus:border-blue-500 text-xs px-0 py-0.5 leading-tight ${cls}`}/>
  );
  const CN=({value,onChange,placeholder=""})=>(
    <input type="number" value={value||""} onChange={e=>onChange(parseInt(e.target.value)||0)} placeholder={placeholder}
      className="w-full bg-transparent border-0 border-b border-dashed border-gray-300 focus:outline-none focus:border-blue-500 text-xs text-right font-mono px-0 py-0.5"/>
  );

  return(
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-black text-gray-800">📋 견적서 작성 · 미리보기</h2>
        <button onClick={()=>window.print()} className="px-3 py-1.5 bg-gray-900 text-white text-xs font-bold rounded-lg hover:bg-gray-700 transition-all print:hidden">🖨️ 인쇄 / PDF</button>
      </div>

      {/* ══ 견적서 폼 ══ */}
      <div className="bg-white border border-gray-300 rounded-xl overflow-hidden shadow-lg print:shadow-none print:rounded-none" id="quote-form">

        {/* 헤더 */}
        <div className="px-6 pt-5 pb-3 border-b-2 border-gray-800 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">주차관리 서비스 견적서</h1>
            <p className="text-xs text-gray-400 mt-0.5">최고의 고객 감동으로 사업체의 발전을 최우선하는 발렛맨입니다. 언제나 한결같은 마음가짐과 늘 발전하는 모습으로 나아갈 것을 약속드립니다.</p>
          </div>
          <div className="border-2 border-gray-800 px-3 py-1.5 rounded ml-4 flex-shrink-0">
            <p className="text-xs font-black text-gray-700 tracking-wider text-center">VALETMAN</p>
            <p className="text-xs font-bold text-gray-500 tracking-widest text-center">MEMBERS</p>
          </div>
        </div>

        {/* 기본정보 */}
        <div className="px-6 py-2">
          <table className="w-full border border-gray-300" style={{fontSize:"11px"}}>
            <tbody>
              {[[["현장명","name"],["상호명",null,"㈜미스터팍"]],[["견적일","date"],["대표",null,"이지섭"]],[["계약형태","contractType"],["등록번호",null,"102-88-01109"]],[["계약기간","contractPeriod"],["주소",null,"인천광역시 연수구 갯벌로 12, 인천TP 갯벌타워 1501호"]],[["운영시간","hours"],["전화",null,"1899-1871"]]].map(([L,R],ri)=>(
                <tr key={ri} className="border-b border-gray-200 last:border-0">
                  <td className="bg-gray-50 px-2 py-1 font-bold text-gray-600 w-16 border-r border-gray-200 whitespace-nowrap">{L[0]}</td>
                  <td className="px-2 py-1 border-r border-gray-200 w-[38%]">{L[1]?<CI value={site[L[1]]} onChange={v=>setSite(p=>({...p,[L[1]]:v}))} placeholder={L[0]}/>:<span className="text-gray-700 font-bold">{L[2]}</span>}</td>
                  <td className="bg-gray-50 px-2 py-1 font-bold text-gray-600 w-16 border-r border-gray-200 whitespace-nowrap">{R[0]}</td>
                  <td className="px-2 py-1">{R[1]?<CI value={site[R[1]]} onChange={v=>setSite(p=>({...p,[R[1]]:v}))} placeholder={R[0]}/>:<span className="text-gray-500">{R[2]}</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 운영방안 */}
        <div className="px-6 py-1.5">
          <p style={{fontSize:"11px"}} className="font-black text-gray-700 mb-1">· 발렛요원 운영방안</p>
          <table className="w-full border border-gray-300" style={{fontSize:"11px"}}>
            <thead>
              <tr className="bg-gray-50">
                {["필요인원","근무기준","근무형태","비고"].map(h=>(
                  <th key={h} className="px-2 py-1.5 font-bold text-gray-600 border-r border-gray-200 last:border-0 text-center">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-gray-200">
                <td className="px-2 py-1.5 border-r border-gray-200 text-center"><CI value={site.staffCount} onChange={v=>setSite(p=>({...p,staffCount:v}))} placeholder="예: 평일2명" cls="text-center"/></td>
                <td className="px-2 py-1.5 border-r border-gray-200 text-center"><CI value={site.workType} onChange={v=>setSite(p=>({...p,workType:v}))} placeholder="전일제" cls="text-center"/></td>
                <td className="px-2 py-1.5 border-r border-gray-200 text-center"><CI value={site.contractType} onChange={v=>setSite(p=>({...p,contractType:v}))} placeholder="주5일" cls="text-center"/></td>
                <td className="px-2 py-1.5">{ops.map((op,i)=><CI key={i} value={op} onChange={v=>setOps(o=>o.map((x,j)=>j===i?v:x))} placeholder={`비고 ${i+1}`}/>)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 월 견적비용 */}
        <div className="px-6 py-1.5">
          <div className="flex justify-between items-baseline mb-1">
            <p style={{fontSize:"11px"}} className="font-black text-gray-700">· 월 견적비용 <span className="text-gray-400 font-normal">(vat별도)</span></p>
            <p style={{fontSize:"10px"}} className="text-gray-400">(원)</p>
          </div>
          <table className="w-full border border-gray-300" style={{fontSize:"11px"}}>
            <thead>
              <tr className="bg-gray-50">
                <th className="px-2 py-1.5 font-bold text-gray-600 border-r border-gray-200 w-16 text-center">항목</th>
                <th className="px-2 py-1.5 font-bold text-gray-600 border-r border-gray-200 text-center">구분</th>
                <th className="px-2 py-1.5 font-bold text-gray-600 border-r border-gray-200 w-28 text-right">견적금액</th>
                <th className="px-2 py-1.5 font-bold text-gray-600 border-r border-gray-200 w-22 text-right">4대보험</th>
                <th className="px-2 py-1.5 font-bold text-gray-600 border-r border-gray-200 w-22 text-right">퇴직충담금</th>
                <th className="px-2 py-1.5 font-bold text-gray-600 w-28 text-right">금액</th>
              </tr>
            </thead>
            <tbody>

              {/* ── 인건비 그룹들 ── */}
              {groups.map((g,gi)=>{
                const c=groupCalcs[gi];
                return(
                  <tr key={g.id} className="border-t border-gray-200">
                    {gi===0&&(
                      <td className="px-2 py-1.5 font-bold text-gray-800 border-r border-gray-200 text-center align-middle" rowSpan={groups.length}>인건비</td>
                    )}
                    {/* 구분: 구분명 + 시간설정 한 줄 */}
                    <td className="px-2 py-1.5 border-r border-gray-200">
                      <CI value={g.label} onChange={v=>updateGroup(g.id,{label:v})} placeholder="구분명"/>
                      {/* 시간설정 — 한 줄, print 숨김 */}
                      <div className="flex items-center gap-1 mt-0.5 print:hidden flex-wrap">
                        <select value={g.daysPerWeek} onChange={e=>updateGroup(g.id,{daysPerWeek:parseInt(e.target.value)})}
                          className="border border-gray-200 rounded px-1 py-0.5 bg-gray-50 focus:outline-none" style={{fontSize:"10px"}}>
                          {[1,2,3,4,5,6,7].map(n=><option key={n} value={n}>주{n}일</option>)}
                        </select>
                        <input type="time" value={g.start} onChange={e=>updateGroup(g.id,{start:e.target.value})} className="border border-gray-200 rounded px-1 py-0.5 bg-gray-50 focus:outline-none w-[72px]" style={{fontSize:"10px"}}/>
                        <span className="text-gray-300" style={{fontSize:"10px"}}>~</span>
                        <input type="time" value={g.end} onChange={e=>updateGroup(g.id,{end:e.target.value})} className="border border-gray-200 rounded px-1 py-0.5 bg-gray-50 focus:outline-none w-[72px]" style={{fontSize:"10px"}}/>
                        <span className="text-gray-400" style={{fontSize:"10px"}}>휴{g.breakMin}분</span>
                        <span className={`font-bold ml-1 ${c.hrRate<MIN_WAGE?"text-red-500":"text-blue-600"}`} style={{fontSize:"10px"}}>→ {fmt(c.hrRate)}원/h {c.hrRate<MIN_WAGE?"⚠최저임금미달":""}</span>
                        {groups.length>1&&<button onClick={()=>removeGroup(g.id)} className="text-red-300 hover:text-red-500 ml-auto" style={{fontSize:"10px"}}>✕</button>}
                      </div>
                    </td>
                    {/* 견적금액 (월급여) + 인원조정 */}
                    <td className="px-2 py-1.5 border-r border-gray-200 align-top">
                      <CN value={g.monthlySalary} onChange={v=>updateGroup(g.id,{monthlySalary:v})} placeholder="월급여"/>
                      <div className="flex items-center justify-end gap-1 mt-0.5 print:hidden">
                        <button onClick={()=>updateGroup(g.id,{headcount:Math.max(1,g.headcount-1)})} className="w-4 h-4 rounded border border-gray-300 text-gray-500 flex items-center justify-center hover:border-blue-400" style={{fontSize:"10px"}}>−</button>
                        <span className="font-bold text-gray-700 w-5 text-center" style={{fontSize:"10px"}}>{g.headcount}명</span>
                        <button onClick={()=>updateGroup(g.id,{headcount:g.headcount+1})} className="w-4 h-4 rounded border border-gray-300 text-gray-500 flex items-center justify-center hover:border-blue-400" style={{fontSize:"10px"}}>+</button>
                      </div>
                    </td>
                    {/* 4대보험 자동 */}
                    <td className="px-2 py-1.5 border-r border-gray-200 text-right align-top">
                      <span className="font-mono text-orange-500">{fmt(c.ins.total)}</span>
                      <div className="text-gray-300 print:hidden" style={{fontSize:"9px"}}>자동계산</div>
                    </td>
                    {/* 퇴직충당금 자동 */}
                    <td className="px-2 py-1.5 border-r border-gray-200 text-right align-top">
                      <span className="font-mono text-amber-600">{fmt(c.retire)}</span>
                      <div className="text-gray-300 print:hidden" style={{fontSize:"9px"}}>월급÷12</div>
                    </td>
                    {/* 금액 */}
                    <td className="px-2 py-1.5 text-right align-top">
                      <span className="font-mono font-bold text-gray-800">{fmt(c.rowTotal)}</span>
                      {g.headcount>1&&<div className="text-gray-400" style={{fontSize:"9px"}}>{g.headcount}인 합산</div>}
                    </td>
                  </tr>
                );
              })}

              {/* 인건비 추가 버튼들 */}
              <tr className="border-t border-dashed border-gray-200 print:hidden">
                <td colSpan={6} className="px-2 py-1 bg-gray-50">
                  <div className="flex gap-2">
                    <button onClick={addGroup} className="text-blue-500 font-bold hover:text-blue-700" style={{fontSize:"10px"}}>+ 평일 추가</button>
                    <button onClick={addWeekend} className="text-violet-500 font-bold hover:text-violet-700" style={{fontSize:"10px"}}>+ 주말(토·일) 추가</button>
                    <button onClick={()=>setGroups(gs=>[...gs,newGroup({id:gid++,label:"야간(22~06시)",start:"22:00",end:"06:00",breakMin:60,daysPerWeek:5,monthlySalary:2000000})])} className="text-gray-500 font-bold hover:text-gray-700" style={{fontSize:"10px"}}>+ 교대 추가</button>
                  </div>
                </td>
              </tr>

              {/* ── 운영지원금 (rowSpan: 1 리스크+운영 + 1 주차대행보험료 + extras) ── */}
              <tr className="border-t-2 border-gray-400">
                <td className="px-2 py-1.5 font-bold text-gray-800 border-r border-gray-200 text-center align-middle" rowSpan={1+supportSubRows}>운영지원금</td>
                <td className="px-2 py-1.5 border-r border-gray-200" colSpan={4}>
                  <CI value={support.desc} onChange={v=>setSupport(p=>({...p,desc:v}))} placeholder="운영지원금 내용"/>
                </td>
                <td className="px-2 py-1.5 text-right">
                  <CN value={support.amt} onChange={v=>setSupport(p=>({...p,amt:v}))} placeholder="0"/>
                </td>
              </tr>

              {/* 주차대행보험료 — 항상 표시 */}
              <tr className="border-t border-gray-200">
                <td className="px-2 py-1.5 border-r border-gray-200 font-bold text-gray-600">보험료</td>
                <td className="px-2 py-1.5 border-r border-gray-200" colSpan={3}>
                  <CI value={valetIns.desc} onChange={v=>setValetIns(p=>({...p,desc:v}))} placeholder="주차대행보험 내용"/>
                </td>
                <td className="px-2 py-1.5 text-right">
                  <CN value={valetIns.amt} onChange={v=>setValetIns(p=>({...p,amt:v}))} placeholder="0"/>
                </td>
              </tr>

              {/* 기타 항목 */}
              {extras.map(ex=>(
                <tr key={ex.id} className="border-t border-gray-200">
                  <td className="px-2 py-1.5 border-r border-gray-200">
                    <CI value={ex.label} onChange={v=>setExtras(es=>es.map(e=>e.id===ex.id?{...e,label:v}:e))} placeholder="항목명"/>
                  </td>
                  <td className="px-2 py-1.5 border-r border-gray-200" colSpan={3}>
                    <CI value={ex.desc} onChange={v=>setExtras(es=>es.map(e=>e.id===ex.id?{...e,desc:v}:e))} placeholder="내용"/>
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    <div className="flex items-center gap-1 justify-end">
                      <CN value={ex.amt} onChange={v=>setExtras(es=>es.map(e=>e.id===ex.id?{...e,amt:v}:e))} placeholder="0"/>
                      <button onClick={()=>setExtras(es=>es.filter(e=>e.id!==ex.id))} className="text-red-300 hover:text-red-500 print:hidden" style={{fontSize:"10px"}}>✕</button>
                    </div>
                  </td>
                </tr>
              ))}

              {/* 기타 추가 */}
              <tr className="border-t border-dashed border-gray-200 print:hidden">
                <td colSpan={6} className="px-2 py-1 bg-gray-50">
                  <button onClick={()=>setExtras(es=>[...es,{id:Date.now(),label:"부스 인테리어",desc:"부스 인테리어 비용 (1회 한)",amt:0}])} className="text-gray-500 font-bold hover:text-blue-500" style={{fontSize:"10px"}}>+ 기타 항목 추가</button>
                </td>
              </tr>

              {/* 에누리 행 (입력값이 있을 때만 표시) */}
              {summary.disc>0&&(
                <tr className="border-t border-gray-200 bg-red-50/40">
                  <td className="px-2 py-1.5 font-bold text-red-500 border-r border-gray-200 text-center">에누리</td>
                  <td className="px-2 py-1.5 text-red-400 border-r border-gray-200" colSpan={4}>할인 적용</td>
                  <td className="px-2 py-1.5 text-right font-mono font-bold text-red-500">-{fmt(summary.disc)}</td>
                </tr>
              )}

              {/* 월 견적금액 합계 */}
              <tr className="border-t-2 border-gray-800 bg-yellow-50">
                <td className="px-2 py-2.5 font-black text-gray-900 border-r border-gray-200 text-center whitespace-nowrap">월 견적금액</td>
                <td className="px-2 py-2.5 border-r border-gray-200 text-right font-mono font-bold text-gray-500" colSpan={1}>{fmt(summary.salarySum)}</td>
                <td className="px-2 py-2.5 border-r border-gray-200"></td>
                <td className="px-2 py-2.5 border-r border-gray-200 text-right font-mono font-bold text-orange-500" colSpan={2}>{fmt(summary.ins4Sum+summary.retireSum)}</td>
                <td className="px-2 py-2.5 text-right font-black font-mono text-gray-900" style={{fontSize:"16px"}}>{fmt(summary.final)}</td>
              </tr>
            </tbody>
          </table>

          {/* 에누리 직접 입력 (인쇄 숨김) */}
          <div className="mt-1.5 flex items-center gap-2 print:hidden">
            <span style={{fontSize:"11px"}} className="text-gray-500 font-bold">에누리:</span>
            <input type="number" value={discAmt||""} step={10000} min={0}
              onChange={e=>setDiscAmt(parseInt(e.target.value)||0)}
              placeholder="직접 입력 (원)"
              className="border border-red-200 rounded px-2 py-1 font-mono bg-white focus:outline-none focus:border-red-400 w-36 text-right" style={{fontSize:"11px"}}/>
            {summary.disc>0&&<span style={{fontSize:"11px"}} className="text-red-500 font-bold">-{fmt(summary.disc)}원 할인 적용</span>}
            {summary.disc>0&&<button onClick={()=>setDiscAmt(0)} className="text-gray-400 hover:text-gray-600" style={{fontSize:"10px"}}>✕ 초기화</button>}
          </div>
        </div>

        {/* 운영 중점 사항 */}
        <div className="px-6 py-3 border-t border-gray-200">
          <p style={{fontSize:"11px"}} className="font-black text-gray-700 mb-2">· 운영 중점 사항</p>
          <div className="grid grid-cols-2 gap-4" style={{fontSize:"11px"}}>
            <div>
              <p className="font-bold text-gray-700 mb-1">발렛요원 서비스 차별화</p>
              {["-전문 서비스 강사 교육 이수자 현장 투입","-고객 편의를 고려하는 감성 케어 서비스 제공","-매월 고객사 의견 수렴, 서비스 태도 부족 시 경고 및 교체 처리"].map((t,i)=><p key={i} className="text-gray-500 leading-relaxed">{t}</p>)}
            </div>
            <div>
              <p className="font-bold text-gray-700 mb-1">현장 불편 최소화</p>
              {["-국내 유일 발렛 전용(주차장 및 도로) 보험 소유 (DB손해보험, 현대해상)","-고객 차량 사고 시 보험 처리로 발생되는 자기 부담금 당사 전체 부담","-발렛비(주차 요금) 징수 방법 고객사 선택 가능 (현금, 카드 등)"].map((t,i)=><p key={i} className="text-gray-500 leading-relaxed">{t}</p>)}
            </div>
          </div>
        </div>
      </div>

      {/* ══ 하단 계산 요약 (인쇄 숨김) ══ */}
      <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 print:hidden">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 col-span-2">
          <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-2">인건비 상세</p>
          <table className="w-full" style={{fontSize:"11px"}}>
            <thead><tr className="border-b border-gray-100">{["구분","월급여","역산시급","4대보험","퇴직충당","인원","소계"].map(h=><th key={h} className="pb-1.5 font-bold text-gray-400 text-right first:text-left">{h}</th>)}</tr></thead>
            <tbody>
              {groups.map((g,gi)=>{
                const c=groupCalcs[gi];
                return(<tr key={g.id} className="border-b border-gray-50 last:border-0">
                  <td className="py-1.5 font-bold text-gray-700">{g.label}</td>
                  <td className="py-1.5 text-right font-mono">{fmt(g.monthlySalary)}</td>
                  <td className={`py-1.5 text-right font-mono font-bold ${c.hrRate<MIN_WAGE?"text-red-500":"text-blue-600"}`}>{fmt(c.hrRate)}원/h</td>
                  <td className="py-1.5 text-right font-mono text-orange-500">{fmt(c.ins.total)}</td>
                  <td className="py-1.5 text-right font-mono text-amber-600">{fmt(c.retire)}</td>
                  <td className="py-1.5 text-right font-mono">{g.headcount}명</td>
                  <td className="py-1.5 text-right font-mono font-bold text-gray-800">{fmt(c.rowTotal)}</td>
                </tr>);
              })}
            </tbody>
            <tfoot><tr className="border-t-2 border-gray-200">
              <td className="pt-1.5 font-black text-gray-700" colSpan={3}>합계</td>
              <td className="pt-1.5 text-right font-mono font-bold text-orange-500">{fmt(summary.ins4Sum)}</td>
              <td className="pt-1.5 text-right font-mono font-bold text-amber-600">{fmt(summary.retireSum)}</td>
              <td></td>
              <td className="pt-1.5 text-right font-mono font-black text-gray-900">{fmt(summary.laborTotal)}</td>
            </tr></tfoot>
          </table>
        </div>
        <div className="bg-gray-900 rounded-xl p-4">
          <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">견적 합계</p>
          <div className="space-y-1.5" style={{fontSize:"11px"}}>
            {[["인건비",fmt(summary.laborTotal)+"원","text-gray-200"],["운영지원금",fmt(summary.supportAmt)+"원","text-gray-200"],["주차대행보험료",fmt(summary.insAmt)+"원","text-gray-200"],...extras.map(e=>[e.label||"기타",fmt(parseInt(e.amt)||0)+"원","text-gray-200"])].map(([l,v,c])=>(
              <div key={l} className="flex justify-between"><span className="text-gray-500">{l}</span><span className={`font-mono ${c}`}>{v}</span></div>
            ))}
            <div className="flex justify-between border-t border-gray-700 pt-1.5"><span className="text-gray-400 font-bold">소계</span><span className="font-mono font-bold text-gray-100">{fmt(summary.raw)}원</span></div>
            {summary.disc>0&&<div className="flex justify-between"><span className="text-red-400 font-bold">에누리</span><span className="font-mono text-red-400">-{fmt(summary.disc)}원</span></div>}
            <div className="flex justify-between bg-blue-600 rounded-lg px-3 py-2 mt-1">
              <span className="text-white font-black">월 견적금액</span>
              <span className="text-white font-black font-mono text-base">{fmt(summary.final)}원</span>
            </div>
            <div className="bg-gray-800 rounded-lg px-3 py-2 text-center">
              <p className="text-gray-500 text-xs">VAT 포함 시</p>
              <p className="text-yellow-400 font-black font-mono">{fmt(Math.round(summary.final*1.1))}원</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   메인 앱
══════════════════════════════════════════════════════ */
export default function App() {
  const [scheduleMode,setScheduleMode]=useState("simple");
  const [simple,setSimple]=useState({start:"09:00",end:"18:00",breakMin:60,daysPerWeek:5});
  const [weekly,setWeekly]=useState(DAYS.map((_,i)=>defaultDay(i<5)));
  const [hrMode,setHrMode]=useState("both");
  const [customHr,setCustomHr]=useState(13000);
  const [dep,setDep]=useState(1);
  const [meal,setMeal]=useState(200000);
  const [activeTab,setActiveTab]=useState("quote");
  const [pb,setPb]=useState({baseCost:6266667,valetFee:2000,workDays:10,vatIncluded:true,scenarioA:50,scenarioB:70});

  const pbCalc=useMemo(()=>{
    const c=(dc)=>{const g=pb.valetFee*dc*pb.workDays,n=pb.vatIncluded?Math.round(g/1.1):g,v=g-n,b=Math.max(0,pb.baseCost-n),r=pb.baseCost>0?(n/pb.baseCost)*100:0;return{dc,grossRev:g,netRev:n,vatAmt:v,burden:b,rate:r};};
    return{A:c(pb.scenarioA),B:c(pb.scenarioB)};
  },[pb]);

  const calc=useMemo(()=>{
    let dH=0,wH=0,nH=0,wd=0;
    if(scheduleMode==="simple"){
      const sm=timeToMin(simple.start),em=timeToMin(simple.end);
      dH=Math.max(0,em-sm-simple.breakMin)/60; wd=simple.daysPerWeek; wH=dH*wd;
      const e2=em<sm?em+1440:em,ns=Math.max(sm,22*60),ne=Math.min(e2,30*60);
      nH=(ns<ne?(ne-ns)/60:0)*wd;
    } else {
      weekly.forEach(d=>{if(!d.work)return;const sm=timeToMin(d.start),em=timeToMin(d.end);wH+=Math.max(0,em-sm-d.breakMin)/60;wd++;const e2=em<sm?em+1440:em,ns=Math.max(sm,22*60),ne=Math.min(e2,30*60);nH+=ns<ne?(ne-ns)/60:0;});
      dH=wd>0?wH/wd:0;
    }
    const hasWL=wH>=15,wlH=hasWL?(wd>0?wH/wd:0):0;
    const mBH=wH*WEEKS,mWH=wlH*WEEKS,mNH=nH*WEEKS;
    const dOT=Math.max(0,dH-8),wOT=Math.max(0,wH-40),mOTH=Math.max(dOT*wd,wOT)*WEEKS;
    return{dH,wH,mBH,mWH,mOTH,mNH,hasWL,wd,
      minResult:calcForRate(MIN_WAGE,mBH,mWH,mOTH,mNH,meal,dep),
      customResult:calcForRate(customHr,mBH,mWH,mOTH,mNH,meal,dep)};
  },[scheduleMode,simple,weekly,customHr,dep,meal]);

  const inp="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:outline-none focus:border-blue-400 focus:bg-white transition-all";
  const TABS=[["quote","📋 견적서"],["input","⏱ 근무 입력"],["result","💰 견적 결과"],["payback","🅿️ 페이백"]];

  return(
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gray-900 text-white px-5 py-3.5 shadow-lg">
        <div className="max-w-screen-xl mx-auto flex items-center justify-between">
          <div><h1 className="text-sm font-black tracking-tight">2026 인건비 견적 계산기</h1><p className="text-gray-400 text-xs mt-0.5">최저임금 10,320원 · 견적서 자동 생성</p></div>
          <span className="text-xs text-gray-600 font-mono bg-gray-800 px-2 py-1 rounded">v2026</span>
        </div>
      </div>
      <div className="flex bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm print:hidden">
        {TABS.map(([k,v])=>(<button key={k} onClick={()=>setActiveTab(k)} className={`flex-1 py-3 text-xs font-bold transition-all ${activeTab===k?"text-blue-600 border-b-2 border-blue-600 bg-blue-50/40":"text-gray-400 hover:text-gray-600"}`}>{v}</button>))}
      </div>

      <div className="max-w-screen-xl mx-auto px-4 py-5">

        {/* 견적서 탭 */}
        {activeTab==="quote"&&<QuoteTab/>}

        {/* 나머지 탭 3컬럼 */}
        {activeTab!=="quote"&&(
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">

            {/* COL1 근무 입력 */}
            <div className={activeTab==="input"?"block":"hidden lg:block"}>
              <ColHeader icon="⏱" title="근무 입력" sub="시간 · 시급 · 기타 설정"/>
              <Card title="근무 시간" accent="blue">
                <div className="flex bg-gray-100 p-1 rounded-lg mb-3">
                  {[["simple","일괄 설정"],["weekly","요일별 설정"]].map(([k,v])=>(<button key={k} onClick={()=>setScheduleMode(k)} className={`flex-1 py-1.5 rounded-md text-xs font-bold transition-all ${scheduleMode===k?"bg-white text-blue-600 shadow-sm":"text-gray-500"}`}>{v}</button>))}
                </div>
                {scheduleMode==="simple"?(
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-2">
                      {[["출근",simple.start,v=>setSimple(p=>({...p,start:v}))],["퇴근",simple.end,v=>setSimple(p=>({...p,end:v}))]].map(([l,val,fn])=>(<div key={l}><p className="text-xs text-gray-400 mb-1">{l}</p><input type="time" value={val} onChange={e=>fn(e.target.value)} className={inp}/></div>))}
                      <div><p className="text-xs text-gray-400 mb-1">휴게(분)</p><input type="number" value={simple.breakMin} min={0} step={30} onChange={e=>setSimple(p=>({...p,breakMin:parseInt(e.target.value)||0}))} className={inp}/></div>
                    </div>
                    <div><p className="text-xs text-gray-400 mb-2">주 근무일수</p>
                      <div className="flex gap-1.5">
                        {[5,6,7].map(n=>(<button key={n} onClick={()=>setSimple(p=>({...p,daysPerWeek:n}))} className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all ${simple.daysPerWeek===n?"bg-blue-600 border-blue-600 text-white":"bg-white border-gray-200 text-gray-500"}`}>주{n}일</button>))}
                        <input type="number" value={simple.daysPerWeek} min={1} max={7} onChange={e=>setSimple(p=>({...p,daysPerWeek:parseInt(e.target.value)||5}))} className="w-14 py-2 border border-gray-200 rounded-lg text-xs text-center bg-white focus:outline-none focus:border-blue-400"/>
                      </div>
                    </div>
                    <div className="flex justify-between items-center bg-blue-50 rounded-lg px-3 py-2">
                      <span className="text-xs text-blue-600 font-bold">일 실근무시간</span>
                      <span className="text-sm font-black font-mono text-blue-900">{Math.max(0,(timeToMin(simple.end)-timeToMin(simple.start)-simple.breakMin)/60).toFixed(1)}h</span>
                    </div>
                  </div>
                ):(
                  <div className="space-y-1.5">
                    {DAYS.map((day,i)=>(<div key={day} className={`rounded-lg border p-2 transition-all ${weekly[i].work?"border-blue-100 bg-blue-50/40":"border-gray-100 bg-gray-50"}`}><div className="flex items-center gap-2"><button onClick={()=>setWeekly(w=>w.map((d,j)=>j===i?{...d,work:!d.work}:d))} className={`w-9 h-5 rounded-full relative flex-shrink-0 transition-all ${weekly[i].work?"bg-blue-600":"bg-gray-300"}`}><div className={`w-3.5 h-3.5 bg-white rounded-full absolute top-0.5 shadow transition-all ${weekly[i].work?"left-5":"left-0.5"}`}/></button><span className={`w-4 text-xs font-black ${i>=5?"text-red-500":"text-gray-700"}`}>{day}</span>{weekly[i].work?(<div className="flex gap-1 flex-1 items-center"><input type="time" value={weekly[i].start} onChange={e=>setWeekly(w=>w.map((d,j)=>j===i?{...d,start:e.target.value}:d))} className="flex-1 px-1.5 py-1 border border-blue-100 rounded text-xs bg-white focus:outline-none"/><span className="text-gray-300">~</span><input type="time" value={weekly[i].end} onChange={e=>setWeekly(w=>w.map((d,j)=>j===i?{...d,end:e.target.value}:d))} className="flex-1 px-1.5 py-1 border border-blue-100 rounded text-xs bg-white focus:outline-none"/><input type="number" value={weekly[i].breakMin} min={0} step={30} onChange={e=>setWeekly(w=>w.map((d,j)=>j===i?{...d,breakMin:parseInt(e.target.value)||0}:d))} className="w-12 px-1 py-1 border border-blue-100 rounded text-xs text-center bg-white focus:outline-none"/><span className="text-xs text-gray-400">분</span><span className="text-xs text-blue-500 font-bold">{Math.max(0,(timeToMin(weekly[i].end)-timeToMin(weekly[i].start)-weekly[i].breakMin)/60).toFixed(1)}h</span></div>):<span className="text-xs text-gray-400">휴무</span>}</div></div>))}
                  </div>
                )}
              </Card>
              <Card title="시급 기준" accent="blue">
                <div className="flex bg-gray-100 p-1 rounded-lg mb-3">{[["min","최저임금"],["custom","직접 입력"],["both","둘 다 비교"]].map(([k,v])=>(<button key={k} onClick={()=>setHrMode(k)} className={`flex-1 py-1.5 rounded-md text-xs font-bold transition-all ${hrMode===k?"bg-white text-blue-600 shadow-sm":"text-gray-500"}`}>{v}</button>))}</div>
                {(hrMode==="custom"||hrMode==="both")&&(<div><p className="text-xs text-gray-400 mb-1">설정 시급 (원)</p><input type="number" value={customHr} min={MIN_WAGE} step={100} onChange={e=>setCustomHr(parseInt(e.target.value)||MIN_WAGE)} className={`${inp} font-mono text-base font-bold`}/>{customHr<MIN_WAGE&&<p className="text-xs text-red-500 mt-1 font-bold">최저임금(10,320원) 미달</p>}</div>)}
              </Card>
              <Card title="기타 설정" accent="slate">
                <div className="grid grid-cols-2 gap-3">
                  <div><p className="text-xs text-gray-400 mb-1">식대 비과세 (원)</p><input type="number" value={meal} step={10000} max={200000} onChange={e=>setMeal(parseInt(e.target.value)||0)} className={inp}/><p className="text-xs text-gray-300 mt-1">최대 200,000원</p></div>
                  <div><p className="text-xs text-gray-400 mb-1">부양가족</p><select value={dep} onChange={e=>setDep(parseInt(e.target.value))} className={inp}>{[1,2,3,4,5,6,7].map(n=><option key={n} value={n}>{n}명{n===1?" (본인)":""}</option>)}</select></div>
                </div>
              </Card>
              <div className="bg-gray-900 rounded-xl p-3">
                <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-2">근무시간 분석</p>
                <div className="grid grid-cols-3 gap-1.5">{[["일 실근무",`${calc.dH.toFixed(1)}h`],["주 실근무",`${calc.wH.toFixed(1)}h`],["월 기본",`${calc.mBH.toFixed(1)}h`],["월 주휴",calc.hasWL?`${calc.mWH.toFixed(1)}h`:"–"],["월 연장",`${calc.mOTH.toFixed(1)}h`],["월 야간",`${calc.mNH.toFixed(1)}h`]].map(([l,v])=>(<div key={l} className="bg-white/5 rounded-lg p-2 text-center"><div className="text-white font-black text-sm font-mono">{v}</div><div className="text-gray-500 text-xs mt-0.5">{l}</div></div>))}</div>
                <div className="mt-2 space-y-0.5">{!calc.hasWL&&<p className="text-yellow-400 text-xs">⚠ 주 15h 미만 — 주휴수당 미발생</p>}{calc.mOTH>0&&<p className="text-orange-400 text-xs">⚡ 연장 가산수당 ×1.5 적용</p>}{calc.mNH>0&&<p className="text-purple-400 text-xs">🌙 야간 가산수당 ×0.5 적용</p>}</div>
              </div>
            </div>

            {/* COL2 견적 결과 */}
            <div className={activeTab==="result"?"block":"hidden lg:block"}>
              <ColHeader icon="💰" title="견적 결과" sub="세전 · 실수령 · 사업주 비용"/>
              {(hrMode==="min"||hrMode==="both")&&<ResultBlock r={calc.minResult} label="최저임금 기준" scheme="green"/>}
              {(hrMode==="custom"||hrMode==="both")&&<ResultBlock r={calc.customResult} label="설정 시급 기준" scheme="blue"/>}
              {hrMode==="both"&&(<Card title="최저임금 vs 설정시급 비교" accent="slate"><table className="w-full text-xs"><thead><tr className="border-b border-gray-100"><th className="text-left font-bold text-gray-400 pb-2">항목</th><th className="text-right font-bold text-emerald-600 pb-2">최저임금</th><th className="text-right font-bold text-blue-600 pb-2">설정시급</th></tr></thead><tbody>{[["시급",fmt(calc.minResult.hrRate)+"원",fmt(calc.customResult.hrRate)+"원"],["총 지급",fmt(calc.minResult.gross)+"원",fmt(calc.customResult.gross)+"원"],["실수령",fmt(calc.minResult.net)+"원",fmt(calc.customResult.net)+"원"],["공제합계",fmt(calc.minResult.totDed)+"원",fmt(calc.customResult.totDed)+"원"],["사업주보험",fmt(calc.minResult.insR)+"원",fmt(calc.customResult.insR)+"원"],["사업주총",fmt(calc.minResult.totCost)+"원",fmt(calc.customResult.totCost)+"원"],["시간당인건비",fmt(calc.minResult.hrCost)+"원",fmt(calc.customResult.hrCost)+"원"]].map(([l,a,b])=>(<tr key={l} className="border-b border-gray-50 last:border-0"><td className="py-1.5 text-gray-400">{l}</td><td className="py-1.5 text-right font-mono font-bold text-emerald-600">{a}</td><td className="py-1.5 text-right font-mono font-bold text-blue-600">{b}</td></tr>))}</tbody></table><div className="mt-2.5 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 flex justify-between items-center"><span className="text-xs text-amber-700 font-bold">월 차액 (사업주)</span><span className="text-xs font-black font-mono text-amber-900">{fmt(Math.abs(calc.customResult.totCost-calc.minResult.totCost))}원{calc.customResult.totCost>calc.minResult.totCost?" 추가":"절감"}</span></div></Card>)}
              <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 text-xs text-gray-400 leading-relaxed"><p className="font-bold text-gray-500 mb-1">2026년 법적 기준</p><p>• 최저임금 10,320원 / 최저월급 2,156,880원(209h)</p><p>• 국민연금 9.5%(각 4.75%) · 건강보험 7.19% · 장기요양 13.14%</p><p>• 연장(일 8h·주 40h 초과) ×1.5 / 야간(22~06시) ×0.5</p></div>
            </div>

            {/* COL3 페이백 */}
            <div className={activeTab==="payback"?"block":"hidden lg:block"}>
              <ColHeader icon="🅿️" title="페이백 시뮬레이션" sub="발렛비 매출로 실질 부담 산출"/>
              <div className="bg-amber-500 text-white rounded-xl px-3 py-2.5 mb-3 text-xs leading-relaxed"><span className="font-black">페이백이란?</span> 발렛비(주차요금)를 고객에게 받아 운영비에서 차감, 실질 부담을 낮추는 구조입니다.</div>
              <Card title="기준 설정" accent="amber">
                <div className="grid grid-cols-2 gap-3 mb-3">
                  {[["기본 견적 총계 (원)",pb.baseCost,10000,v=>setPb(p=>({...p,baseCost:v}))],["발렛비 / 대 (원)",pb.valetFee,500,v=>setPb(p=>({...p,valetFee:v}))],["월 운영일수 (일)",pb.workDays,1,v=>setPb(p=>({...p,workDays:v}))]].map(([l,val,step,fn])=>(<div key={l}><p className="text-xs text-gray-400 mb-1">{l}</p><input type="number" value={val} step={step} min={0} onChange={e=>fn(parseInt(e.target.value)||0)} className={`${inp} font-mono font-bold`}/></div>))}
                  <div><p className="text-xs text-gray-400 mb-1">부가세 처리</p><button onClick={()=>setPb(p=>({...p,vatIncluded:!p.vatIncluded}))} className={`w-full py-2 rounded-lg text-xs font-bold border transition-all ${pb.vatIncluded?"bg-amber-50 border-amber-300 text-amber-700":"bg-gray-50 border-gray-200 text-gray-500"}`}>{pb.vatIncluded?"✓ 부가세 자감 적용":"부가세 자감 미적용"}</button></div>
                </div>
                <div className="flex justify-between items-center bg-gray-50 rounded-lg px-3 py-2"><span className="text-xs text-gray-500 font-bold">기준 월 부담</span><span className="text-sm font-black font-mono text-gray-800">{fmt(pb.baseCost)}원</span></div>
              </Card>
              {[{key:"A",cars:pb.scenarioA,set:v=>setPb(p=>({...p,scenarioA:v})),r:pbCalc.A,isV:true},{key:"B",cars:pb.scenarioB,set:v=>setPb(p=>({...p,scenarioB:v})),r:pbCalc.B,isV:false}].map(({key,cars,set,r,isV})=>{
                const hdr=isV?"bg-violet-600":"bg-teal-600",tag=isV?"bg-violet-50 border-violet-100 text-violet-700":"bg-teal-50 border-teal-100 text-teal-700",bar=isV?"bg-violet-400":"bg-teal-400",num=isV?"text-violet-700":"text-teal-700",bdr=isV?"border-violet-200":"border-teal-200";
                return(<div key={key} className={`rounded-xl border ${bdr} mb-3 overflow-hidden`}><div className={`${hdr} px-3 py-2 flex justify-between items-center`}><span className="text-white text-xs font-black">시나리오 {key}</span><span className="text-white text-xs opacity-80">일 {cars}대 · 월 {pb.workDays}일</span></div><div className="p-3"><div className="flex gap-2 mb-3 items-center"><input type="number" value={cars} min={1} step={5} onChange={e=>set(parseInt(e.target.value)||1)} className={`w-20 px-2 py-2 border rounded-lg text-lg font-black font-mono text-center focus:outline-none ${isV?"border-violet-200":"border-teal-200"}`}/><span className="text-xs text-gray-400">대/일</span><div className="flex gap-1 flex-1">{[30,50,70,100].map(n=>(<button key={n} onClick={()=>set(n)} className={`flex-1 py-1.5 rounded text-xs font-bold border ${cars===n?`${hdr} text-white border-transparent`:"bg-white border-gray-200 text-gray-400"}`}>{n}</button>))}</div></div><div className="bg-gray-50 rounded-lg px-3 py-2 mb-3"><div className="flex justify-between py-1"><span className="text-xs text-gray-400">발렛 총 매출</span><span className={`text-xs font-mono font-bold ${num}`}>{fmt(r.grossRev)}원</span></div>{pb.vatIncluded&&<div className="flex justify-between py-1"><span className="text-xs text-gray-400">부가세 차감</span><span className="text-xs font-mono text-red-400">-{fmt(r.vatAmt)}원</span></div>}<div className="flex justify-between py-1 border-t border-gray-100"><span className="text-xs text-gray-400 font-bold">순 페이백</span><span className={`text-xs font-mono font-black ${num}`}>{fmt(r.netRev)}원</span></div></div><div className="mb-3"><div className="flex justify-between text-xs mb-1"><span className="text-gray-400">절감율</span><span className="font-black text-green-600 font-mono">{r.rate.toFixed(1)}%</span></div><div className="h-2 bg-gray-100 rounded-full overflow-hidden"><div className={`h-full ${bar} rounded-full`} style={{width:`${Math.min(100,r.rate)}%`}}/></div></div><div className={`${tag} border rounded-lg px-3 py-2.5 flex justify-between items-center`}><div><p className="text-xs font-bold opacity-70">실질 월 부담</p><p className="text-xs text-green-600 font-bold">↓ {fmt(pb.baseCost-r.burden)}원 절감</p></div><div className="text-right"><p className={`text-2xl font-black font-mono ${num}`}>{fmt(Math.round(r.burden/10000))}<span className="text-sm">만원</span></p></div></div></div></div>);
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
