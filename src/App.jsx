import { useState, useMemo, useRef } from "react";

const DAYS = ["월","화","수","목","금","토","일"];
const MIN_WAGE = 10320;
const WEEKS = 4.345;

// ── 공통 유틸 ──────────────────────────────────────────
function timeToMin(t) { const [h,m]=t.split(":").map(Number); return h*60+m; }
function fmt(n) { return Math.round(n).toLocaleString("ko-KR"); }
function today() { return new Date().toISOString().slice(0,10).replace(/-/g,"."); }

function getIncomeTax(taxable, dep) {
  let tax=0;
  if(taxable<=1060000) tax=0;
  else if(taxable<=1500000) tax=(taxable-1060000)*0.06;
  else if(taxable<=3000000) tax=26400+(taxable-1500000)*0.15;
  else if(taxable<=4500000) tax=251400+(taxable-3000000)*0.24;
  else if(taxable<=8000000) tax=611400+(taxable-4500000)*0.35;
  else tax=1836400+(taxable-8000000)*0.38;
  const dd=[0,0,14000,21000,28000,35000,42000,49000];
  return Math.max(0,Math.round(tax-dd[Math.min(dep,7)]));
}
const defaultDay=(work)=>({work,start:"09:00",end:"18:00",breakMin:60});

// 주 유급시간 계산 (기본 + 주휴)
function calcMonthlyHours(start, end, breakMin, daysPerWeek) {
  const sm=timeToMin(start), em=timeToMin(end);
  const dailyH=Math.max(0,em-sm-breakMin)/60;
  const weeklyH=dailyH*daysPerWeek;
  const hasWL=weeklyH>=15;
  const wlH=hasWL ? (daysPerWeek>0 ? weeklyH/daysPerWeek : 0) : 0;
  const monthlyBasic=weeklyH*WEEKS;
  const monthlyWL=wlH*WEEKS;
  const dailyOT=Math.max(0,dailyH-8);
  const weeklyOT=Math.max(0,weeklyH-40);
  const monthlyOT=Math.max(dailyOT*daysPerWeek,weeklyOT)*WEEKS;
  const e2=em<sm?em+1440:em;
  const ns=Math.max(sm,22*60), ne=Math.min(e2,30*60);
  const nightH=(ns<ne?(ne-ns)/60:0)*daysPerWeek*WEEKS;
  return { dailyH, weeklyH, monthlyBasic, monthlyWL, monthlyOT, nightH, totalPaid:monthlyBasic+monthlyWL };
}

// 사업주 4대보험 계산
function calcEmployerIns(salary) {
  const npBase=Math.min(salary,6370000);
  const np=Math.round(npBase*0.0475);
  const hi=Math.round(salary*0.03595);
  const lt=Math.round(hi*0.1314);
  const ei=Math.round(salary*0.0105);
  const wi=Math.round(salary*0.0147);
  return { np, hi, lt, ei, wi, total: np+hi+lt+ei+wi };
}

// ── 공통 컴포넌트 ──────────────────────────────────────
const Card=({title,accent="blue",children})=>{
  const bar={blue:"border-l-blue-500",green:"border-l-emerald-500",amber:"border-l-amber-500",slate:"border-l-slate-400",rose:"border-l-rose-500"}[accent];
  return(
    <div className={`bg-white rounded-xl border border-gray-100 shadow-sm border-l-4 ${bar} mb-3`}>
      {title&&<div className="px-4 py-2.5 border-b border-gray-50"><span className="text-xs font-black text-gray-500 tracking-widest uppercase">{title}</span></div>}
      <div className="px-4 py-3">{children}</div>
    </div>
  );
};
const ColHeader=({icon,title,sub})=>(
  <div className="mb-3 pb-2.5 border-b-2 border-gray-800 flex items-center gap-2">
    <span className="text-base">{icon}</span>
    <div>
      <h2 className="text-sm font-black text-gray-900">{title}</h2>
      {sub&&<p className="text-xs text-gray-400">{sub}</p>}
    </div>
  </div>
);
const Row=({label,value,color="text-gray-600",bold=false})=>(
  <div className="flex justify-between items-center py-1 border-b border-gray-50 last:border-0">
    <span className="text-xs text-gray-400">{label}</span>
    <span className={`text-xs font-mono ${bold?"font-black":"font-semibold"} ${color}`}>{value}</span>
  </div>
);
const ResultBlock=({r,label,scheme})=>{
  const g=scheme==="green";
  const hdr=g?"bg-emerald-600":"bg-blue-600";
  const net=g?"bg-emerald-500":"bg-blue-500";
  const tag=g?"bg-emerald-50 border-emerald-100 text-emerald-700":"bg-blue-50 border-blue-100 text-blue-700";
  const bdr=g?"border-emerald-200":"border-blue-200";
  return(
    <div className={`rounded-xl border ${bdr} mb-3 overflow-hidden`}>
      <div className={`${hdr} px-3 py-2 flex justify-between items-center`}>
        <span className="text-white text-xs font-black">{label}</span>
        <span className="text-white text-sm font-black font-mono">{fmt(r.hrRate)}원<span className="text-xs opacity-70 font-normal">/h</span></span>
      </div>
      <div className="grid grid-cols-2 gap-2 p-3">
        <div className="bg-gray-50 rounded-lg p-2.5 text-center"><p className="text-xs text-gray-400 mb-1">총 지급액(세전)</p><p className="text-sm font-black font-mono text-gray-800">{fmt(r.gross)}<span className="text-xs font-normal text-gray-400">원</span></p></div>
        <div className={`${net} rounded-lg p-2.5 text-center`}><p className="text-xs text-white opacity-80 mb-1">실수령액</p><p className="text-sm font-black font-mono text-white">{fmt(r.net)}<span className="text-xs font-normal opacity-80">원</span></p></div>
        <div className="bg-gray-50 rounded-lg p-2.5 text-center"><p className="text-xs text-gray-400 mb-1">공제액 합계</p><p className="text-sm font-black font-mono text-red-500">{fmt(r.totDed)}<span className="text-xs font-normal text-gray-400">원</span></p></div>
        <div className="bg-orange-500 rounded-lg p-2.5 text-center"><p className="text-xs text-white opacity-80 mb-1">사업주 총비용</p><p className="text-sm font-black font-mono text-white">{fmt(r.totCost)}<span className="text-xs font-normal opacity-80">원</span></p></div>
      </div>
      <div className="px-3 pb-2">
        <div className="bg-gray-50 rounded-lg px-3 py-2">
          <p className="text-xs font-bold text-gray-400 mb-1.5">근로자 공제 명세</p>
          {[["국민연금 4.75%",`-${fmt(r.npE)}원`,"text-red-400"],["건강보험 3.595%",`-${fmt(r.hiE)}원`,"text-red-400"],["장기요양 ×13.14%",`-${fmt(r.ltE)}원`,"text-red-400"],["고용보험 0.9%",`-${fmt(r.eiE)}원`,"text-red-400"],["소득세+지방세",`-${fmt(r.itax+r.ltax)}원`,"text-red-400"],["사업주 부담 보험",`+${fmt(r.insR)}원`,"text-orange-500"]].map(([l,v,c])=><Row key={l} label={l} value={v} color={c}/>)}
        </div>
      </div>
      <div className={`mx-3 mb-3 border ${tag} rounded-lg px-3 py-2 flex justify-between items-center`}>
        <span className="text-xs font-bold">시간당 실질 인건비</span>
        <span className="text-sm font-black font-mono">{fmt(r.hrCost)}원/h</span>
      </div>
    </div>
  );
};

function calcForRate(hrRate,monthlyBasicH,monthlyWLH,monthlyOTH,monthlyNightH,meal,dep) {
  const basicPay=hrRate*monthlyBasicH,wlPay=hrRate*monthlyWLH,otPay=hrRate*0.5*monthlyOTH,ntPay=hrRate*0.5*monthlyNightH;
  const mealNT=Math.min(meal,200000),gross=basicPay+wlPay+otPay+ntPay+mealNT,taxBase=basicPay+wlPay+otPay+ntPay;
  const npBase=Math.min(taxBase,6370000),npE=Math.round(npBase*0.0475),hiE=Math.round(taxBase*0.03595),ltE=Math.round(hiE*0.1314),eiE=Math.round(taxBase*0.009);
  const insE=npE+hiE+ltE+eiE,itax=getIncomeTax(taxBase-insE,dep),ltax=Math.round(itax*0.1),totDed=insE+itax+ltax,net=gross-totDed;
  const npR=Math.round(npBase*0.0475),hiR=Math.round(taxBase*0.03595),ltR=Math.round(hiR*0.1314),eiR=Math.round(taxBase*0.0105),wiR=Math.round(taxBase*0.0147),insR=npR+hiR+ltR+eiR+wiR,totCost=gross+insR;
  const totalPaidH=monthlyBasicH+monthlyWLH,hrCost=totalPaidH>0?totCost/totalPaidH:0;
  return {hrRate,basicPay,wlPay,otPay,ntPay,mealNT,gross,npE,hiE,ltE,eiE,insE,itax,ltax,totDed,net,npR,hiR,ltR,eiR,wiR,insR,totCost,hrCost};
}

// ── 견적서 탭 컴포넌트 ─────────────────────────────────
let groupIdCounter=1;
const newGroup=()=>({
  id: groupIdCounter++,
  label:"주5일(평일)",
  daysPerWeek:5,
  start:"09:00", end:"18:00", breakMin:60,
  headcount:1,
  monthlySalary:2000000,
  useAutoIns:true,
});

function QuoteTab() {
  const inp="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:outline-none focus:border-blue-400 focus:bg-white transition-all";

  // 현장 정보
  const [site, setSite]=useState({
    name:"", date:today(), contractType:"월~금", contractPeriod:"기본 1년",
    hours:"09:00~18:00", staffCount:"1명",
    workType:"전일제", note:"",
  });

  // 인건비 그룹 (여러 구분 가능)
  const [groups, setGroups]=useState([newGroup()]);

  // 운영지원금 / 보험료 / 기타
  const [extras, setExtras]=useState({
    supportAmt:2000000, supportDesc:"리스크대비 및 운영 관리비용",
    insAmt:0, insDesc:"(보험 종류 입력)",
    extras:[],
  });

  // 에누리
  const [discount, setDiscount]=useState({ type:"none", amt:0, rate:0 });

  // 그룹별 계산
  const groupCalcs=useMemo(()=>groups.map(g=>{
    const h=calcMonthlyHours(g.start,g.end,g.breakMin,g.daysPerWeek);
    const hrRate=h.totalPaid>0?Math.round(g.monthlySalary/h.totalPaid):0;
    const ins=calcEmployerIns(g.monthlySalary);
    const retire=Math.round(g.monthlySalary/12);
    const perPersonCost=g.monthlySalary+ins.total+retire;
    const totalCost=perPersonCost*g.headcount;
    return { ...h, hrRate, ins, retire, perPersonCost, totalCost };
  }),[groups]);

  // 합계 계산
  const summary=useMemo(()=>{
    const totalLabor=groupCalcs.reduce((s,c)=>s+c.totalCost,0);
    const support=extras.supportAmt||0;
    const insAmt=extras.insAmt||0;
    const extSum=extras.extras.reduce((s,e)=>s+(parseInt(e.amt)||0),0);
    const rawTotal=totalLabor+support+insAmt+extSum;
    let discounted=rawTotal;
    if(discount.type==="amt") discounted=Math.max(0,rawTotal-(parseInt(discount.amt)||0));
    if(discount.type==="rate") discounted=Math.round(rawTotal*(1-(parseFloat(discount.rate)||0)/100));
    const discountAmt=rawTotal-discounted;
    // 표시용: 에누리 없는 인건비만 = salary sum (견적서에는 salary 기준 표시)
    const salaryOnlyTotal=groups.reduce((s,g,i)=>s+g.monthlySalary*g.headcount,0);
    const ins4Total=groupCalcs.reduce((s,c,i)=>s+c.ins.total*groups[i].headcount,0);
    const retireTotal=groupCalcs.reduce((s,c,i)=>s+c.retire*groups[i].headcount,0);
    return { totalLabor, support, insAmt, extSum, rawTotal, discounted, discountAmt, salaryOnlyTotal, ins4Total, retireTotal };
  },[groupCalcs,groups,extras,discount]);

  const updateGroup=(id,patch)=>setGroups(gs=>gs.map(g=>g.id===id?{...g,...patch}:g));
  const addGroup=()=>setGroups(gs=>[...gs,newGroup()]);
  const removeGroup=(id)=>setGroups(gs=>gs.filter(g=>g.id!==id));

  const addExtra=()=>setExtras(e=>({...e,extras:[...e.extras,{id:Date.now(),desc:"",amt:0}]}));
  const removeExtra=(id)=>setExtras(e=>({...e,extras:e.extras.filter(x=>x.id!==id)}));
  const updateExtra=(id,patch)=>setExtras(e=>({...e,extras:e.extras.map(x=>x.id===id?{...x,...patch}:x)}));

  const [showPreview,setShowPreview]=useState(false);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
      {/* ── 입력 영역 ── */}
      <div>
        <ColHeader icon="📋" title="견적서 작성" sub="현장 정보 → 인건비 → 부대비용 → 견적금액" />

        {/* STEP 1: 현장 정보 */}
        <Card title="STEP 1 · 현장 기본 정보" accent="blue">
          <div className="grid grid-cols-2 gap-2.5">
            {[["현장명", "name","text"],["견적일","date","text"],["계약형태","contractType","text"],["계약기간","contractPeriod","text"],["운영시간","hours","text"],["필요인원","staffCount","text"]].map(([l,k,t])=>(
              <div key={k}>
                <p className="text-xs text-gray-400 mb-1">{l}</p>
                <input type={t} value={site[k]} onChange={e=>setSite(p=>({...p,[k]:e.target.value}))} placeholder={l} className={inp} />
              </div>
            ))}
            <div>
              <p className="text-xs text-gray-400 mb-1">근무형태</p>
              <select value={site.workType} onChange={e=>setSite(p=>({...p,workType:e.target.value}))} className={inp}>
                {["전일제","시간제","교대제"].map(v=><option key={v}>{v}</option>)}
              </select>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">비고</p>
              <input value={site.note} onChange={e=>setSite(p=>({...p,note:e.target.value}))} placeholder="특이사항" className={inp} />
            </div>
          </div>
        </Card>

        {/* STEP 2: 인건비 그룹 */}
        <Card title="STEP 2 · 인건비 계산" accent="blue">
          <div className="space-y-4">
            {groups.map((g,gi)=>{
              const c=groupCalcs[gi];
              return(
                <div key={g.id} className="border border-gray-100 rounded-xl overflow-hidden">
                  {/* 그룹 헤더 */}
                  <div className="bg-gray-800 px-3 py-2 flex items-center justify-between">
                    <input value={g.label} onChange={e=>updateGroup(g.id,{label:e.target.value})}
                      className="bg-transparent text-white text-xs font-black w-40 focus:outline-none placeholder-gray-500"
                      placeholder="구분명 (예: 주5일 평일)" />
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 text-xs font-mono">시급 {fmt(c.hrRate)}원</span>
                      {groups.length>1&&<button onClick={()=>removeGroup(g.id)} className="text-gray-500 hover:text-red-400 text-xs">✕</button>}
                    </div>
                  </div>
                  <div className="p-3 space-y-3">
                    {/* 2-1. 근무시간 선택 */}
                    <div>
                      <p className="text-xs font-bold text-gray-500 mb-2">① 근무시간 설정</p>
                      <div className="grid grid-cols-4 gap-2">
                        <div className="col-span-1">
                          <p className="text-xs text-gray-400 mb-1">주 근무일</p>
                          <select value={g.daysPerWeek} onChange={e=>updateGroup(g.id,{daysPerWeek:parseInt(e.target.value)})} className={inp}>
                            {[1,2,3,4,5,6,7].map(n=><option key={n} value={n}>주{n}일</option>)}
                          </select>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400 mb-1">출근</p>
                          <input type="time" value={g.start} onChange={e=>updateGroup(g.id,{start:e.target.value})} className={inp} />
                        </div>
                        <div>
                          <p className="text-xs text-gray-400 mb-1">퇴근</p>
                          <input type="time" value={g.end} onChange={e=>updateGroup(g.id,{end:e.target.value})} className={inp} />
                        </div>
                        <div>
                          <p className="text-xs text-gray-400 mb-1">휴게(분)</p>
                          <input type="number" value={g.breakMin} min={0} step={30} onChange={e=>updateGroup(g.id,{breakMin:parseInt(e.target.value)||0})} className={inp} />
                        </div>
                      </div>
                      {/* 시간 미리보기 */}
                      <div className="mt-2 bg-gray-50 rounded-lg px-3 py-2 grid grid-cols-3 gap-2 text-center">
                        {[["일 실근무",`${c.dailyH.toFixed(1)}h`],["주 실근무",`${c.weeklyH.toFixed(1)}h`],["월 유급",`${c.totalPaid.toFixed(1)}h`]].map(([l,v])=>(
                          <div key={l}><p className="text-xs text-gray-400">{l}</p><p className="text-xs font-black font-mono text-blue-700">{v}</p></div>
                        ))}
                      </div>
                    </div>

                    {/* 2-2. 월 급여 입력 → 시급 역산 */}
                    <div>
                      <p className="text-xs font-bold text-gray-500 mb-2">② 월 급여 입력 → 시급 자동 역산</p>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <p className="text-xs text-gray-400 mb-1">월 급여 (원)</p>
                          <input type="number" value={g.monthlySalary} step={50000} min={0}
                            onChange={e=>updateGroup(g.id,{monthlySalary:parseInt(e.target.value)||0})}
                            className={`${inp} font-mono font-bold text-base`} />
                        </div>
                        <div className="bg-blue-50 rounded-lg p-2.5 border border-blue-100">
                          <p className="text-xs text-blue-500 mb-1">역산 시급</p>
                          <p className="text-xl font-black font-mono text-blue-700">{fmt(c.hrRate)}<span className="text-xs font-normal text-blue-400">원/h</span></p>
                          {c.hrRate < MIN_WAGE && <p className="text-xs text-red-500 font-bold mt-1">⚠ 최저임금 미달</p>}
                        </div>
                      </div>
                    </div>

                    {/* 2-3. 4대보험 (사업주 부담) */}
                    <div>
                      <p className="text-xs font-bold text-gray-500 mb-2">③ 4대보험 (사업주 부담 · 2026년 기준 자동)</p>
                      <div className="bg-gray-50 rounded-lg px-3 py-2">
                        {[["국민연금 4.75%",c.ins.np],["건강보험 3.595%",c.ins.hi],["장기요양 ×13.14%",c.ins.lt],["고용보험 1.05%",c.ins.ei],["산재보험 1.47%",c.ins.wi]].map(([l,v])=>(
                          <div key={l} className="flex justify-between py-1 border-b border-gray-100 last:border-0">
                            <span className="text-xs text-gray-400">{l}</span>
                            <span className="text-xs font-mono font-bold text-orange-500">{fmt(v)}원</span>
                          </div>
                        ))}
                        <div className="flex justify-between pt-1.5 mt-1 border-t-2 border-gray-200">
                          <span className="text-xs font-black text-gray-600">4대보험 합계</span>
                          <span className="text-sm font-black font-mono text-orange-600">{fmt(c.ins.total)}원</span>
                        </div>
                      </div>
                    </div>

                    {/* 2-4. 퇴직충당금 */}
                    <div>
                      <p className="text-xs font-bold text-gray-500 mb-2">④ 퇴직충당금 (월급 ÷ 12 자동계산)</p>
                      <div className="flex items-center justify-between bg-amber-50 border border-amber-100 rounded-lg px-3 py-2.5">
                        <span className="text-xs text-amber-700 font-bold">퇴직충당금 (1인)</span>
                        <span className="text-base font-black font-mono text-amber-700">{fmt(c.retire)}원</span>
                      </div>
                    </div>

                    {/* 2-5. 인원수 */}
                    <div>
                      <p className="text-xs font-bold text-gray-500 mb-2">⑤ 투입 인원</p>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <button onClick={()=>updateGroup(g.id,{headcount:Math.max(1,g.headcount-1)})}
                            className="w-8 h-8 rounded-lg border border-gray-200 bg-white text-gray-600 font-bold text-base hover:border-blue-400">−</button>
                          <span className="w-12 text-center text-lg font-black text-gray-900">{g.headcount}명</span>
                          <button onClick={()=>updateGroup(g.id,{headcount:g.headcount+1})}
                            className="w-8 h-8 rounded-lg border border-gray-200 bg-white text-gray-600 font-bold text-base hover:border-blue-400">+</button>
                        </div>
                        <div className="flex-1 bg-blue-600 rounded-lg px-3 py-2 text-center">
                          <p className="text-blue-200 text-xs">이 구분 인건비 소계</p>
                          <p className="text-white text-base font-black font-mono">{fmt(c.totalCost)}원</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            <button onClick={addGroup}
              className="w-full py-2.5 border-2 border-dashed border-gray-200 rounded-xl text-xs font-bold text-gray-400 hover:border-blue-300 hover:text-blue-500 transition-all">
              + 인건비 구분 추가 (평일/주말/시간대 구분 등)
            </button>
          </div>
        </Card>

        {/* STEP 3: 운영지원금/보험료/기타 */}
        <Card title="STEP 3 · 부대비용" accent="amber">
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-xs text-gray-400 mb-1">운영지원금 (원)</p>
                <input type="number" value={extras.supportAmt} step={100000}
                  onChange={e=>setExtras(p=>({...p,supportAmt:parseInt(e.target.value)||0}))} className={`${inp} font-mono font-bold`} />
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">항목명</p>
                <input value={extras.supportDesc} onChange={e=>setExtras(p=>({...p,supportDesc:e.target.value}))} className={inp} />
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">보험료 (원)</p>
                <input type="number" value={extras.insAmt} step={100000}
                  onChange={e=>setExtras(p=>({...p,insAmt:parseInt(e.target.value)||0}))} className={`${inp} font-mono font-bold`} />
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">보험 종류</p>
                <input value={extras.insDesc} onChange={e=>setExtras(p=>({...p,insDesc:e.target.value}))} className={inp} placeholder="주차장+이면도로 보험 등" />
              </div>
            </div>
            {extras.extras.map(ex=>(
              <div key={ex.id} className="grid grid-cols-2 gap-2 items-end">
                <div>
                  <p className="text-xs text-gray-400 mb-1">항목명</p>
                  <input value={ex.desc} onChange={e=>updateExtra(ex.id,{desc:e.target.value})} placeholder="예: 부스 인테리어" className={inp} />
                </div>
                <div className="flex gap-1.5">
                  <div className="flex-1">
                    <p className="text-xs text-gray-400 mb-1">금액 (원)</p>
                    <input type="number" value={ex.amt} step={100000}
                      onChange={e=>updateExtra(ex.id,{amt:parseInt(e.target.value)||0})} className={`${inp} font-mono`} />
                  </div>
                  <button onClick={()=>removeExtra(ex.id)} className="mt-5 px-2 py-2 text-red-400 hover:text-red-600 text-xs">✕</button>
                </div>
              </div>
            ))}
            <button onClick={addExtra} className="w-full py-2 border-2 border-dashed border-gray-200 rounded-xl text-xs font-bold text-gray-400 hover:border-amber-300 hover:text-amber-500 transition-all">
              + 항목 추가 (부스 인테리어 등)
            </button>
          </div>
        </Card>

        {/* STEP 4: 에누리 */}
        <Card title="STEP 4 · 에누리 (최종 견적 조정)" accent="rose">
          <div className="mb-3">
            <div className="flex bg-gray-100 p-1 rounded-lg mb-3">
              {[["none","에누리 없음"],["amt","금액 차감"],["rate","비율 할인"]].map(([k,v])=>(
                <button key={k} onClick={()=>setDiscount(d=>({...d,type:k}))}
                  className={`flex-1 py-1.5 rounded-md text-xs font-bold transition-all ${discount.type===k?"bg-white text-rose-600 shadow-sm":"text-gray-500"}`}>
                  {v}
                </button>
              ))}
            </div>
            {discount.type==="amt"&&(
              <div>
                <p className="text-xs text-gray-400 mb-1">차감 금액 (원)</p>
                <input type="number" value={discount.amt} step={10000}
                  onChange={e=>setDiscount(d=>({...d,amt:e.target.value}))} className={`${inp} font-mono font-bold`} />
              </div>
            )}
            {discount.type==="rate"&&(
              <div>
                <p className="text-xs text-gray-400 mb-1">할인율 (%)</p>
                <input type="number" value={discount.rate} step={0.5} min={0} max={100}
                  onChange={e=>setDiscount(d=>({...d,rate:e.target.value}))} className={`${inp} font-mono font-bold`} />
              </div>
            )}
          </div>

          {/* 최종 합계 미리보기 */}
          <div className="bg-gray-900 rounded-xl p-3">
            <p className="text-xs text-gray-400 uppercase tracking-widest mb-2.5 font-bold">견적 합계</p>
            <div className="space-y-1.5">
              <div className="flex justify-between"><span className="text-xs text-gray-400">인건비 합계</span><span className="text-xs font-mono text-gray-200">{fmt(summary.totalLabor)}원</span></div>
              <div className="flex justify-between"><span className="text-xs text-gray-400">운영지원금</span><span className="text-xs font-mono text-gray-200">{fmt(summary.support)}원</span></div>
              {summary.insAmt>0&&<div className="flex justify-between"><span className="text-xs text-gray-400">보험료</span><span className="text-xs font-mono text-gray-200">{fmt(summary.insAmt)}원</span></div>}
              {summary.extSum>0&&<div className="flex justify-between"><span className="text-xs text-gray-400">기타</span><span className="text-xs font-mono text-gray-200">{fmt(summary.extSum)}원</span></div>}
              <div className="flex justify-between border-t border-gray-700 pt-1.5"><span className="text-xs text-gray-300 font-bold">소계</span><span className="text-xs font-mono font-bold text-gray-100">{fmt(summary.rawTotal)}원</span></div>
              {summary.discountAmt>0&&<div className="flex justify-between"><span className="text-xs text-red-400 font-bold">에누리</span><span className="text-xs font-mono text-red-400">-{fmt(summary.discountAmt)}원</span></div>}
              <div className="flex justify-between bg-blue-600 rounded-lg px-3 py-2 mt-1">
                <span className="text-sm text-white font-black">월 견적금액</span>
                <span className="text-lg text-white font-black font-mono">{fmt(summary.discounted)}원</span>
              </div>
            </div>
          </div>
        </Card>

        <button onClick={()=>setShowPreview(v=>!v)}
          className="w-full py-3 bg-gray-900 hover:bg-gray-800 text-white font-black text-sm rounded-xl transition-all">
          {showPreview?"▲ 미리보기 닫기":"📄 견적서 미리보기 →"}
        </button>
      </div>

      {/* ── 견적서 미리보기 ── */}
      <div>
        <ColHeader icon="📄" title="견적서 미리보기" sub="실제 견적서 포맷으로 확인" />
        {showPreview ? (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-lg">
            {/* 견적서 헤더 */}
            <div className="border-b-4 border-gray-900 px-5 py-4">
              <h1 className="text-2xl font-black text-gray-900 tracking-tight mb-0.5">주차관리 서비스 견적서</h1>
              <p className="text-xs text-gray-400">최고의 고객 감동으로 사업체의 발전을 최우선하는 발렛맨입니다.</p>
            </div>

            {/* 현장/회사 정보 */}
            <div className="px-5 py-3">
              <table className="w-full text-xs border border-gray-200 rounded-lg overflow-hidden">
                <tbody>
                  <tr>
                    <td className="bg-gray-50 px-3 py-2 font-bold text-gray-500 w-20 border-b border-r border-gray-200">현장명</td>
                    <td className="px-3 py-2 font-bold text-gray-800 border-b border-gray-200">{site.name||"—"}</td>
                    <td className="bg-gray-50 px-3 py-2 font-bold text-gray-500 w-20 border-b border-r border-gray-200">상호명</td>
                    <td className="px-3 py-2 border-b border-gray-200">㈜미스터팍</td>
                  </tr>
                  <tr>
                    <td className="bg-gray-50 px-3 py-2 font-bold text-gray-500 border-b border-r border-gray-200">견적일</td>
                    <td className="px-3 py-2 border-b border-gray-200">{site.date}</td>
                    <td className="bg-gray-50 px-3 py-2 font-bold text-gray-500 border-b border-r border-gray-200">대표</td>
                    <td className="px-3 py-2 border-b border-gray-200">이지섭</td>
                  </tr>
                  <tr>
                    <td className="bg-gray-50 px-3 py-2 font-bold text-gray-500 border-b border-r border-gray-200">계약형태</td>
                    <td className="px-3 py-2 border-b border-gray-200">{site.contractType}</td>
                    <td className="bg-gray-50 px-3 py-2 font-bold text-gray-500 border-b border-r border-gray-200">등록번호</td>
                    <td className="px-3 py-2 border-b border-gray-200">102-88-01109</td>
                  </tr>
                  <tr>
                    <td className="bg-gray-50 px-3 py-2 font-bold text-gray-500 border-b border-r border-gray-200">계약기간</td>
                    <td className="px-3 py-2 border-b border-gray-200">{site.contractPeriod}</td>
                    <td className="bg-gray-50 px-3 py-2 font-bold text-gray-500 border-b border-r border-gray-200">주소</td>
                    <td className="px-3 py-2 text-gray-500 border-b border-gray-200 text-xs">인천광역시 연수구 갯벌로 12</td>
                  </tr>
                  <tr>
                    <td className="bg-gray-50 px-3 py-2 font-bold text-gray-500 border-r border-gray-200">운영시간</td>
                    <td className="px-3 py-2">{site.hours}</td>
                    <td className="bg-gray-50 px-3 py-2 font-bold text-gray-500 border-r border-gray-200">전화</td>
                    <td className="px-3 py-2">1899-1871</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* 발렛요원 운영방안 */}
            <div className="px-5 py-2">
              <p className="text-xs font-black text-gray-700 mb-2">· 발렛요원 운영방안</p>
              <table className="w-full text-xs border border-gray-200 rounded-lg overflow-hidden">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="px-3 py-2 text-left font-bold text-gray-600 border-r border-gray-200">필요인원</th>
                    <th className="px-3 py-2 text-left font-bold text-gray-600 border-r border-gray-200">근무기준</th>
                    <th className="px-3 py-2 text-left font-bold text-gray-600 border-r border-gray-200">근무형태</th>
                    <th className="px-3 py-2 text-left font-bold text-gray-600">비고</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="px-3 py-2 border-t border-r border-gray-200">{site.staffCount}</td>
                    <td className="px-3 py-2 border-t border-r border-gray-200">전일제</td>
                    <td className="px-3 py-2 border-t border-r border-gray-200">{site.contractType}</td>
                    <td className="px-3 py-2 border-t border-gray-200 text-gray-500">{site.note||"—"}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* 월 견적비용 */}
            <div className="px-5 py-2">
              <div className="flex justify-between items-center mb-2">
                <p className="text-xs font-black text-gray-700">· 월 견적비용 <span className="text-gray-400 font-normal">(vat별도)</span></p>
                <p className="text-xs text-gray-400">(원)</p>
              </div>
              <table className="w-full text-xs border border-gray-200 rounded-lg overflow-hidden">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="px-3 py-2 text-left font-bold text-gray-600 border-r border-gray-200 w-20">항목</th>
                    <th className="px-3 py-2 text-left font-bold text-gray-600 border-r border-gray-200 w-24">구분</th>
                    <th className="px-3 py-2 text-right font-bold text-gray-600 border-r border-gray-200">견적금액</th>
                    <th className="px-3 py-2 text-right font-bold text-gray-600 border-r border-gray-200">4대보험</th>
                    <th className="px-3 py-2 text-right font-bold text-gray-600 border-r border-gray-200">퇴직충당금</th>
                    <th className="px-3 py-2 text-right font-bold text-gray-600">금액</th>
                  </tr>
                </thead>
                <tbody>
                  {/* 인건비 각 그룹 */}
                  {groups.map((g,gi)=>{
                    const c=groupCalcs[gi];
                    return(
                      <tr key={g.id} className="border-t border-gray-200">
                        <td className="px-3 py-2 font-bold text-gray-700 border-r border-gray-200" rowSpan={gi===0?groups.length:undefined}>
                          {gi===0?"인건비":""}
                        </td>
                        <td className="px-3 py-2 border-r border-gray-200 text-gray-500">{g.label}</td>
                        <td className="px-3 py-2 text-right font-mono border-r border-gray-200">{fmt(g.monthlySalary)}</td>
                        <td className="px-3 py-2 text-right font-mono border-r border-gray-200 text-orange-500">{fmt(c.ins.total)}</td>
                        <td className="px-3 py-2 text-right font-mono border-r border-gray-200 text-amber-600">{fmt(c.retire)}</td>
                        <td className="px-3 py-2 text-right font-mono font-bold">{fmt(c.totalCost)}</td>
                      </tr>
                    );
                  })}
                  {/* 운영지원금 */}
                  <tr className="border-t border-gray-200">
                    <td className="px-3 py-2 font-bold text-gray-700 border-r border-gray-200">운영지원금</td>
                    <td className="px-3 py-2 text-gray-500 border-r border-gray-200" colSpan={4}>{extras.supportDesc}</td>
                    <td className="px-3 py-2 text-right font-mono font-bold">{fmt(extras.supportAmt)}</td>
                  </tr>
                  {/* 보험료 */}
                  {extras.insAmt>0&&(
                    <tr className="border-t border-gray-200">
                      <td className="px-3 py-2 font-bold text-gray-700 border-r border-gray-200"></td>
                      <td className="px-3 py-2 text-gray-500 border-r border-gray-200 font-bold">보험료</td>
                      <td className="px-3 py-2 text-gray-500 border-r border-gray-200" colSpan={3}>{extras.insDesc}</td>
                      <td className="px-3 py-2 text-right font-mono font-bold">{fmt(extras.insAmt)}</td>
                    </tr>
                  )}
                  {/* 기타 항목 */}
                  {extras.extras.map(ex=>(
                    <tr key={ex.id} className="border-t border-gray-200">
                      <td className="px-3 py-2 font-bold text-gray-700 border-r border-gray-200">{ex.desc}</td>
                      <td className="px-3 py-2 border-r border-gray-200" colSpan={4}></td>
                      <td className="px-3 py-2 text-right font-mono font-bold">{fmt(parseInt(ex.amt)||0)}</td>
                    </tr>
                  ))}
                  {/* 에누리 */}
                  {summary.discountAmt>0&&(
                    <tr className="border-t border-gray-200">
                      <td className="px-3 py-2 font-bold text-red-500 border-r border-gray-200">에누리</td>
                      <td className="px-3 py-2 text-gray-400 border-r border-gray-200" colSpan={4}>할인 적용</td>
                      <td className="px-3 py-2 text-right font-mono font-bold text-red-500">-{fmt(summary.discountAmt)}</td>
                    </tr>
                  )}
                  {/* 월 견적금액 합계 */}
                  <tr className="border-t-2 border-gray-800 bg-yellow-50">
                    <td className="px-3 py-2.5 font-black text-gray-900 border-r border-gray-200" colSpan={2}>월 견적금액</td>
                    <td className="px-3 py-2.5 text-right font-mono font-black text-gray-500 border-r border-gray-200">{fmt(summary.salaryOnlyTotal)}</td>
                    <td className="px-3 py-2.5 text-right font-mono font-black text-orange-500 border-r border-gray-200" colSpan={2}>{fmt(summary.ins4Total+summary.retireTotal)}</td>
                    <td className="px-3 py-2.5 text-right font-black font-mono text-lg text-gray-900">{fmt(summary.discounted)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* 인건비 상세 (시급 역산 근거) */}
            <div className="px-5 py-3 border-t border-gray-100">
              <p className="text-xs font-black text-gray-500 mb-2">· 시급 역산 근거</p>
              <div className="space-y-1">
                {groups.map((g,gi)=>{
                  const c=groupCalcs[gi];
                  return(
                    <div key={g.id} className="flex gap-3 text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-1.5">
                      <span className="font-bold text-gray-700 w-28">{g.label}</span>
                      <span>월 {fmt(g.monthlySalary)}원</span>
                      <span>÷ {c.totalPaid.toFixed(1)}h</span>
                      <span className="font-bold text-blue-600">= {fmt(c.hrRate)}원/h</span>
                      <span className="text-gray-400">({g.headcount}명 × {fmt(c.perPersonCost)}원 = {fmt(c.totalCost)}원)</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 인쇄 버튼 */}
            <div className="px-5 py-3 border-t border-gray-100">
              <button onClick={()=>window.print()} className="w-full py-2.5 bg-gray-900 text-white font-bold text-sm rounded-xl hover:bg-gray-700 transition-all">
                🖨️ 인쇄 / PDF 저장
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl p-12 text-center">
            <p className="text-4xl mb-3">📄</p>
            <p className="text-sm font-bold text-gray-400">좌측 항목을 입력 후</p>
            <p className="text-sm text-gray-400">"견적서 미리보기" 버튼을 클릭하세요</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── 메인 앱 ───────────────────────────────────────────
export default function App() {
  const [scheduleMode,setScheduleMode]=useState("simple");
  const [simple,setSimple]=useState({start:"09:00",end:"18:00",breakMin:60,daysPerWeek:5});
  const [weekly,setWeekly]=useState(DAYS.map((_,i)=>defaultDay(i<5)));
  const [hrMode,setHrMode]=useState("both");
  const [customHr,setCustomHr]=useState(13000);
  const [dep,setDep]=useState(1);
  const [meal,setMeal]=useState(200000);
  const [activeTab,setActiveTab]=useState("input");
  const [pb,setPb]=useState({baseCost:6266667,valetFee:2000,workDays:10,vatIncluded:true,scenarioA:50,scenarioB:70});

  const pbCalc=useMemo(()=>{
    const calc=(dc)=>{
      const grossRev=pb.valetFee*dc*pb.workDays;
      const netRev=pb.vatIncluded?Math.round(grossRev/1.1):grossRev;
      const vatAmt=grossRev-netRev;
      const burden=Math.max(0,pb.baseCost-netRev);
      const rate=pb.baseCost>0?(netRev/pb.baseCost)*100:0;
      return {dc,grossRev,netRev,vatAmt,burden,rate};
    };
    return {A:calc(pb.scenarioA),B:calc(pb.scenarioB)};
  },[pb]);

  const calc=useMemo(()=>{
    let dailyWorkH=0,weeklyWorkH=0,nightHperWeek=0,workingDays=0;
    if(scheduleMode==="simple"){
      const sm=timeToMin(simple.start),em=timeToMin(simple.end);
      dailyWorkH=Math.max(0,em-sm-simple.breakMin)/60;
      workingDays=simple.daysPerWeek;
      weeklyWorkH=dailyWorkH*workingDays;
      const e2=em<sm?em+1440:em;
      const ns=Math.max(sm,22*60),ne=Math.min(e2,30*60);
      nightHperWeek=(ns<ne?(ne-ns)/60:0)*workingDays;
    } else {
      weekly.forEach(d=>{
        if(!d.work)return;
        const sm=timeToMin(d.start),em=timeToMin(d.end);
        weeklyWorkH+=Math.max(0,em-sm-d.breakMin)/60;
        workingDays++;
        const e2=em<sm?em+1440:em;
        const ns=Math.max(sm,22*60),ne=Math.min(e2,30*60);
        nightHperWeek+=ns<ne?(ne-ns)/60:0;
      });
      dailyWorkH=workingDays>0?weeklyWorkH/workingDays:0;
    }
    const hasWL=weeklyWorkH>=15;
    const wlHperWeek=hasWL?(workingDays>0?weeklyWorkH/workingDays:0):0;
    const monthlyBasicH=weeklyWorkH*WEEKS;
    const monthlyWLH=wlHperWeek*WEEKS;
    const monthlyNightH=nightHperWeek*WEEKS;
    const dailyOT=Math.max(0,dailyWorkH-8);
    const weeklyOT=Math.max(0,weeklyWorkH-40);
    const monthlyOTH=Math.max(dailyOT*workingDays,weeklyOT)*WEEKS;
    return {
      dailyWorkH,weeklyWorkH,monthlyBasicH,monthlyWLH,monthlyOTH,monthlyNightH,hasWL,workingDays,
      minResult:calcForRate(MIN_WAGE,monthlyBasicH,monthlyWLH,monthlyOTH,monthlyNightH,meal,dep),
      customResult:calcForRate(customHr,monthlyBasicH,monthlyWLH,monthlyOTH,monthlyNightH,meal,dep),
    };
  },[scheduleMode,simple,weekly,customHr,dep,meal]);

  const inp="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:outline-none focus:border-blue-400 focus:bg-white transition-all";
  const TABS=[["input","근무 입력"],["result","견적 결과"],["payback","페이백 시뮬"],["quote","견적서 생성"]];

  return(
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-gray-900 text-white px-5 py-3.5 shadow-lg">
        <div className="max-w-screen-xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-sm font-black tracking-tight">2026 인건비 견적 계산기</h1>
            <p className="text-gray-400 text-xs mt-0.5">최저임금 10,320원 · 4대보험 자동 산출 · 견적서 생성</p>
          </div>
          <span className="text-xs text-gray-600 font-mono bg-gray-800 px-2 py-1 rounded">v2026</span>
        </div>
      </div>

      {/* 탭 */}
      <div className="flex bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
        {TABS.map(([k,v])=>(
          <button key={k} onClick={()=>setActiveTab(k)}
            className={`flex-1 py-3 text-xs font-bold transition-all ${activeTab===k?"text-blue-600 border-b-2 border-blue-600 bg-blue-50/40":"text-gray-400 hover:text-gray-600"}`}>
            {k==="quote"?"📋 "+v:v}
          </button>
        ))}
      </div>

      <div className="max-w-screen-xl mx-auto px-4 py-5">
        {/* 견적서 탭 - 전체 너비 */}
        {activeTab==="quote" && <QuoteTab />}

        {/* 3컬럼 탭 */}
        {activeTab!=="quote" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">

            {/* ══ COL 1: 근무 입력 ══ */}
            <div className={activeTab==="input"?"block":"hidden lg:block"}>
              <ColHeader icon="⏱" title="근무 입력" sub="시간 · 시급 · 기타 설정" />
              <Card title="근무 시간" accent="blue">
                <div className="flex bg-gray-100 p-1 rounded-lg mb-3">
                  {[["simple","일괄 설정"],["weekly","요일별 설정"]].map(([k,v])=>(
                    <button key={k} onClick={()=>setScheduleMode(k)}
                      className={`flex-1 py-1.5 rounded-md text-xs font-bold transition-all ${scheduleMode===k?"bg-white text-blue-600 shadow-sm":"text-gray-500"}`}>{v}</button>
                  ))}
                </div>
                {scheduleMode==="simple"?(
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-2">
                      {[["출근",simple.start,v=>setSimple(p=>({...p,start:v}))],["퇴근",simple.end,v=>setSimple(p=>({...p,end:v}))]].map(([l,val,fn])=>(
                        <div key={l}><p className="text-xs text-gray-400 mb-1">{l}</p><input type="time" value={val} onChange={e=>fn(e.target.value)} className={inp}/></div>
                      ))}
                      <div><p className="text-xs text-gray-400 mb-1">휴게(분)</p><input type="number" value={simple.breakMin} min={0} step={30} onChange={e=>setSimple(p=>({...p,breakMin:parseInt(e.target.value)||0}))} className={inp}/></div>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-2">주 근무일수</p>
                      <div className="flex gap-1.5">
                        {[5,6,7].map(n=>(
                          <button key={n} onClick={()=>setSimple(p=>({...p,daysPerWeek:n}))}
                            className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all ${simple.daysPerWeek===n?"bg-blue-600 border-blue-600 text-white":"bg-white border-gray-200 text-gray-500"}`}>주{n}일</button>
                        ))}
                        <input type="number" value={simple.daysPerWeek} min={1} max={7} onChange={e=>setSimple(p=>({...p,daysPerWeek:parseInt(e.target.value)||5}))}
                          className="w-14 py-2 border border-gray-200 rounded-lg text-xs text-center bg-white focus:outline-none focus:border-blue-400"/>
                      </div>
                    </div>
                    <div className="flex justify-between items-center bg-blue-50 rounded-lg px-3 py-2">
                      <span className="text-xs text-blue-600 font-bold">일 실근무시간</span>
                      <span className="text-sm font-black font-mono text-blue-900">{Math.max(0,(timeToMin(simple.end)-timeToMin(simple.start)-simple.breakMin)/60).toFixed(1)}h</span>
                    </div>
                  </div>
                ):(
                  <div className="space-y-1.5">
                    {DAYS.map((day,i)=>(
                      <div key={day} className={`rounded-lg border p-2 transition-all ${weekly[i].work?"border-blue-100 bg-blue-50/40":"border-gray-100 bg-gray-50"}`}>
                        <div className="flex items-center gap-2">
                          <button onClick={()=>setWeekly(w=>w.map((d,j)=>j===i?{...d,work:!d.work}:d))}
                            className={`w-9 h-5 rounded-full relative flex-shrink-0 transition-all ${weekly[i].work?"bg-blue-600":"bg-gray-300"}`}>
                            <div className={`w-3.5 h-3.5 bg-white rounded-full absolute top-0.5 shadow transition-all ${weekly[i].work?"left-5":"left-0.5"}`}/>
                          </button>
                          <span className={`w-4 text-xs font-black ${i>=5?"text-red-500":"text-gray-700"}`}>{day}</span>
                          {weekly[i].work?(
                            <div className="flex gap-1 flex-1 items-center">
                              <input type="time" value={weekly[i].start} onChange={e=>setWeekly(w=>w.map((d,j)=>j===i?{...d,start:e.target.value}:d))} className="flex-1 px-1.5 py-1 border border-blue-100 rounded text-xs bg-white focus:outline-none"/>
                              <span className="text-gray-300">~</span>
                              <input type="time" value={weekly[i].end} onChange={e=>setWeekly(w=>w.map((d,j)=>j===i?{...d,end:e.target.value}:d))} className="flex-1 px-1.5 py-1 border border-blue-100 rounded text-xs bg-white focus:outline-none"/>
                              <input type="number" value={weekly[i].breakMin} min={0} step={30} onChange={e=>setWeekly(w=>w.map((d,j)=>j===i?{...d,breakMin:parseInt(e.target.value)||0}:d))} className="w-12 px-1 py-1 border border-blue-100 rounded text-xs text-center bg-white focus:outline-none"/>
                              <span className="text-xs text-gray-400">분</span>
                              <span className="text-xs text-blue-500 font-bold">{Math.max(0,(timeToMin(weekly[i].end)-timeToMin(weekly[i].start)-weekly[i].breakMin)/60).toFixed(1)}h</span>
                            </div>
                          ):<span className="text-xs text-gray-400">휴무</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
              <Card title="시급 기준" accent="blue">
                <div className="flex bg-gray-100 p-1 rounded-lg mb-3">
                  {[["min","최저임금"],["custom","직접 입력"],["both","둘 다 비교"]].map(([k,v])=>(
                    <button key={k} onClick={()=>setHrMode(k)} className={`flex-1 py-1.5 rounded-md text-xs font-bold transition-all ${hrMode===k?"bg-white text-blue-600 shadow-sm":"text-gray-500"}`}>{v}</button>
                  ))}
                </div>
                {(hrMode==="custom"||hrMode==="both")&&(
                  <div><p className="text-xs text-gray-400 mb-1">설정 시급 (원)</p>
                    <input type="number" value={customHr} min={MIN_WAGE} step={100} onChange={e=>setCustomHr(parseInt(e.target.value)||MIN_WAGE)} className={`${inp} font-mono text-base font-bold`}/>
                    {customHr<MIN_WAGE&&<p className="text-xs text-red-500 mt-1 font-bold">최저임금(10,320원) 미달</p>}
                  </div>
                )}
              </Card>
              <Card title="기타 설정" accent="slate">
                <div className="grid grid-cols-2 gap-3">
                  <div><p className="text-xs text-gray-400 mb-1">식대 비과세 (원)</p><input type="number" value={meal} step={10000} max={200000} onChange={e=>setMeal(parseInt(e.target.value)||0)} className={inp}/><p className="text-xs text-gray-300 mt-1">최대 200,000원</p></div>
                  <div><p className="text-xs text-gray-400 mb-1">부양가족</p><select value={dep} onChange={e=>setDep(parseInt(e.target.value))} className={inp}>{[1,2,3,4,5,6,7].map(n=><option key={n} value={n}>{n}명{n===1?" (본인)":""}</option>)}</select></div>
                </div>
              </Card>
              <div className="bg-gray-900 rounded-xl p-3">
                <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-2">근무시간 분석</p>
                <div className="grid grid-cols-3 gap-1.5">
                  {[["일 실근무",`${calc.dailyWorkH.toFixed(1)}h`],["주 실근무",`${calc.weeklyWorkH.toFixed(1)}h`],["월 기본",`${calc.monthlyBasicH.toFixed(1)}h`],["월 주휴",calc.hasWL?`${calc.monthlyWLH.toFixed(1)}h`:"–"],["월 연장",`${calc.monthlyOTH.toFixed(1)}h`],["월 야간",`${calc.monthlyNightH.toFixed(1)}h`]].map(([l,v])=>(
                    <div key={l} className="bg-white/5 rounded-lg p-2 text-center"><div className="text-white font-black text-sm font-mono">{v}</div><div className="text-gray-500 text-xs mt-0.5">{l}</div></div>
                  ))}
                </div>
                <div className="mt-2 space-y-0.5">
                  {!calc.hasWL&&<p className="text-yellow-400 text-xs">⚠ 주 15h 미만 — 주휴수당 미발생</p>}
                  {calc.monthlyOTH>0&&<p className="text-orange-400 text-xs">⚡ 연장 가산수당 ×1.5 적용</p>}
                  {calc.monthlyNightH>0&&<p className="text-purple-400 text-xs">🌙 야간 가산수당 ×0.5 적용</p>}
                </div>
              </div>
            </div>

            {/* ══ COL 2: 견적 결과 ══ */}
            <div className={activeTab==="result"?"block":"hidden lg:block"}>
              <ColHeader icon="💰" title="견적 결과" sub="세전 · 실수령 · 사업주 비용"/>
              {(hrMode==="min"||hrMode==="both")&&<ResultBlock r={calc.minResult} label="최저임금 기준" scheme="green"/>}
              {(hrMode==="custom"||hrMode==="both")&&<ResultBlock r={calc.customResult} label="설정 시급 기준" scheme="blue"/>}
              {hrMode==="both"&&(
                <Card title="최저임금 vs 설정시급 비교" accent="slate">
                  <table className="w-full text-xs"><thead><tr className="border-b border-gray-100"><th className="text-left font-bold text-gray-400 pb-2">항목</th><th className="text-right font-bold text-emerald-600 pb-2">최저임금</th><th className="text-right font-bold text-blue-600 pb-2">설정시급</th></tr></thead>
                    <tbody>{[["시급",fmt(calc.minResult.hrRate)+"원",fmt(calc.customResult.hrRate)+"원"],["총 지급",fmt(calc.minResult.gross)+"원",fmt(calc.customResult.gross)+"원"],["실수령",fmt(calc.minResult.net)+"원",fmt(calc.customResult.net)+"원"],["공제 합계",fmt(calc.minResult.totDed)+"원",fmt(calc.customResult.totDed)+"원"],["사업주 보험",fmt(calc.minResult.insR)+"원",fmt(calc.customResult.insR)+"원"],["사업주 총비용",fmt(calc.minResult.totCost)+"원",fmt(calc.customResult.totCost)+"원"],["시간당 인건비",fmt(calc.minResult.hrCost)+"원",fmt(calc.customResult.hrCost)+"원"]].map(([l,a,b])=>(
                      <tr key={l} className="border-b border-gray-50 last:border-0"><td className="py-1.5 text-gray-400">{l}</td><td className="py-1.5 text-right font-mono font-bold text-emerald-600">{a}</td><td className="py-1.5 text-right font-mono font-bold text-blue-600">{b}</td></tr>
                    ))}</tbody>
                  </table>
                  <div className="mt-2.5 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 flex justify-between items-center">
                    <span className="text-xs text-amber-700 font-bold">월 차액 (사업주)</span>
                    <span className="text-xs font-black font-mono text-amber-900">{fmt(Math.abs(calc.customResult.totCost-calc.minResult.totCost))}원{calc.customResult.totCost>calc.minResult.totCost?" 추가 부담":" 절감"}</span>
                  </div>
                </Card>
              )}
              <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 text-xs text-gray-400 leading-relaxed">
                <p className="font-bold text-gray-500 mb-1">2026년 법적 기준</p>
                <p>• 최저임금 10,320원 / 최저월급 2,156,880원(209h)</p>
                <p>• 국민연금 9.5%(각 4.75%) · 건강보험 7.19% · 장기요양 13.14%</p>
                <p>• 연장(일 8h·주 40h 초과) ×1.5 / 야간(22~06시) ×0.5</p>
                <p>• 소득세는 간이세액표 추정치 · 정확한 처리는 노무사 확인</p>
              </div>
            </div>

            {/* ══ COL 3: 페이백 시뮬 ══ */}
            <div className={activeTab==="payback"?"block":"hidden lg:block"}>
              <ColHeader icon="🅿️" title="페이백 시뮬레이션" sub="발렛비 매출로 실질 부담 산출"/>
              <div className="bg-amber-500 text-white rounded-xl px-3 py-2.5 mb-3 text-xs leading-relaxed">
                <span className="font-black">페이백이란?</span> 발렛비(주차요금)를 고객에게 받아 운영비에서 차감, 실질 부담을 낮추는 구조입니다. 카드결제 시 부가세(10%)는 자감 후 정산됩니다.
              </div>
              <Card title="기준 설정" accent="amber">
                <div className="grid grid-cols-2 gap-3 mb-3">
                  {[["기본 견적 총계 (원)",pb.baseCost,10000,v=>setPb(p=>({...p,baseCost:v}))],["발렛비 / 대 (원)",pb.valetFee,500,v=>setPb(p=>({...p,valetFee:v}))],["월 운영일수 (일)",pb.workDays,1,v=>setPb(p=>({...p,workDays:v}))]].map(([l,val,step,fn])=>(
                    <div key={l}><p className="text-xs text-gray-400 mb-1">{l}</p><input type="number" value={val} step={step} min={0} onChange={e=>fn(parseInt(e.target.value)||0)} className={`${inp} font-mono font-bold`}/></div>
                  ))}
                  <div><p className="text-xs text-gray-400 mb-1">부가세 처리</p>
                    <button onClick={()=>setPb(p=>({...p,vatIncluded:!p.vatIncluded}))} className={`w-full py-2 rounded-lg text-xs font-bold border transition-all ${pb.vatIncluded?"bg-amber-50 border-amber-300 text-amber-700":"bg-gray-50 border-gray-200 text-gray-500"}`}>
                      {pb.vatIncluded?"✓ 부가세 자감 적용":"부가세 자감 미적용"}
                    </button>
                  </div>
                </div>
                <div className="flex justify-between items-center bg-gray-50 rounded-lg px-3 py-2">
                  <span className="text-xs text-gray-500 font-bold">기준 월 부담</span>
                  <span className="text-sm font-black font-mono text-gray-800">{fmt(pb.baseCost)}원</span>
                </div>
              </Card>
              {[{key:"A",label:"시나리오 A",cars:pb.scenarioA,setCars:v=>setPb(p=>({...p,scenarioA:v})),result:pbCalc.A,isV:true},{key:"B",label:"시나리오 B",cars:pb.scenarioB,setCars:v=>setPb(p=>({...p,scenarioB:v})),result:pbCalc.B,isV:false}].map(({key,label,cars,setCars,result,isV})=>{
                const hdr=isV?"bg-violet-600":"bg-teal-600";
                const tag=isV?"bg-violet-50 border-violet-100 text-violet-700":"bg-teal-50 border-teal-100 text-teal-700";
                const bar=isV?"bg-violet-400":"bg-teal-400";
                const num=isV?"text-violet-700":"text-teal-700";
                const bdr=isV?"border-violet-200":"border-teal-200";
                return(
                  <div key={key} className={`rounded-xl border ${bdr} mb-3 overflow-hidden`}>
                    <div className={`${hdr} px-3 py-2 flex justify-between items-center`}>
                      <span className="text-white text-xs font-black">{label}</span>
                      <span className="text-white text-xs opacity-80">일 {cars}대 · 월 {pb.workDays}일</span>
                    </div>
                    <div className="p-3">
                      <div className="flex gap-2 mb-3 items-center">
                        <input type="number" value={cars} min={1} step={5} onChange={e=>setCars(parseInt(e.target.value)||1)}
                          className={`w-20 px-2 py-2 border rounded-lg text-lg font-black font-mono text-center focus:outline-none ${isV?"border-violet-200 focus:border-violet-400":"border-teal-200 focus:border-teal-400"}`}/>
                        <span className="text-xs text-gray-400 font-bold">대/일</span>
                        <div className="flex gap-1 flex-1">{[30,50,70,100].map(n=>(
                          <button key={n} onClick={()=>setCars(n)} className={`flex-1 py-1.5 rounded text-xs font-bold border transition-all ${cars===n?`${hdr} text-white border-transparent`:"bg-white border-gray-200 text-gray-400"}`}>{n}</button>
                        ))}</div>
                      </div>
                      <div className="bg-gray-50 rounded-lg px-3 py-2 mb-3">
                        <Row label="발렛 총 매출" value={`${fmt(result.grossRev)}원`} color={num}/>
                        {pb.vatIncluded&&<Row label="부가세 차감 (÷1.1)" value={`-${fmt(result.vatAmt)}원`} color="text-red-400"/>}
                        <Row label="순 페이백 금액" value={`${fmt(result.netRev)}원`} color={num} bold/>
                      </div>
                      <div className="mb-3">
                        <div className="flex justify-between text-xs mb-1"><span className="text-gray-400">비용 절감율</span><span className="font-black text-green-600 font-mono">{result.rate.toFixed(1)}%</span></div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden"><div className={`h-full ${bar} rounded-full`} style={{width:`${Math.min(100,result.rate)}%`}}/></div>
                      </div>
                      <div className={`${tag} border rounded-lg px-3 py-2.5 flex justify-between items-center`}>
                        <div><p className="text-xs opacity-70 font-bold">실질 월 부담</p><p className="text-xs text-green-600 font-bold mt-0.5">↓ {fmt(pb.baseCost-result.burden)}원 절감</p></div>
                        <div className="text-right"><p className={`text-2xl font-black font-mono ${num}`}>{fmt(Math.round(result.burden/10000))}<span className="text-sm font-bold">만원</span></p><p className="text-xs opacity-50 font-mono">{fmt(result.burden)}원</p></div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
