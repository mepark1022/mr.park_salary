import { useState, useMemo } from "react";

const MIN_WAGE = 10320;
const WEEKS = 4.345;

function timeToMin(t) { const [h,m]=t.split(":").map(Number); return h*60+m; }
function fmt(n) { return Math.round(n).toLocaleString("ko-KR"); }
function parseNum(s) {
  if (typeof s==="number") return s;
  const n=parseInt(String(s).replace(/[^0-9]/g,""));
  return isNaN(n)?0:n;
}

function NInput({ value, onChange, placeholder="", className="", suffix="" }) {
  const num=parseNum(value);
  const display=num===0?"":num.toLocaleString("ko-KR");
  return (
    <div className="relative">
      <input type="text" inputMode="numeric" value={display} placeholder={placeholder}
        onChange={e=>onChange(e.target.value.replace(/[^0-9]/g,""))} className={className}/>
      {suffix&&<span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">{suffix}</span>}
    </div>
  );
}

function Toggle({ on, onToggle, colorOn="bg-blue-500" }) {
  return (
    <button onClick={onToggle}
      className={`w-10 h-5 rounded-full transition-all relative flex-shrink-0 ${on?colorOn:"bg-gray-300"}`}>
      <div className={`w-3.5 h-3.5 bg-white rounded-full absolute top-0.5 transition-all shadow ${on?"left-5":"left-0.5"}`}/>
    </button>
  );
}

function Counter({ value, onChange }) {
  const n=parseNum(value);
  return (
    <div className="flex items-center gap-1.5">
      <button onClick={()=>onChange(String(Math.max(1,n-1)))}
        className="w-8 h-8 rounded-lg border-2 border-gray-200 text-lg font-bold text-gray-400 hover:border-blue-400 hover:text-blue-600 flex items-center justify-center bg-white transition-all">−</button>
      <NInput value={value} onChange={onChange}
        className="w-14 text-center py-1.5 border-2 border-gray-200 rounded-lg text-base font-black font-mono bg-gray-50 focus:outline-none focus:border-blue-500"/>
      <button onClick={()=>onChange(String(n+1))}
        className="w-8 h-8 rounded-lg border-2 border-gray-200 text-lg font-bold text-gray-400 hover:border-blue-400 hover:text-blue-600 flex items-center justify-center bg-white transition-all">+</button>
      <span className="text-xs font-bold text-gray-500">명</span>
    </div>
  );
}

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

function buildSched(days, start, end, brk) {
  const sm=timeToMin(start), em=timeToMin(end);
  const workH=Math.max(0,em-sm-brk)/60;
  const e2=em<sm?em+1440:em;
  const ns=Math.max(sm,22*60), ne=Math.min(e2,30*60);
  const nightH=ns<ne?(ne-ns)/60:0;
  const weeklyH=workH*days;
  const hasWL=weeklyH>=15;
  const monthlyBasicH=weeklyH*WEEKS;
  const monthlyWLH=hasWL&&days>0?(weeklyH/days)*WEEKS:0;
  const monthlyNightH=nightH*days*WEEKS;
  const dailyOT=Math.max(0,workH-8);
  const weeklyOT=Math.max(0,weeklyH-40);
  const monthlyOTH=Math.max(dailyOT*days,weeklyOT)*WEEKS;
  return {workH,weeklyH,monthlyBasicH,monthlyWLH,monthlyNightH,monthlyOTH,hasWL};
}

function calcForRate(hrRate, sched, meal, dep) {
  if(hrRate<=0) return null;
  const {monthlyBasicH,monthlyWLH,monthlyOTH,monthlyNightH}=sched;
  const mealNT=Math.min(meal,200000);
  const basicPay=hrRate*monthlyBasicH, wlPay=hrRate*monthlyWLH;
  const otPay=hrRate*0.5*monthlyOTH, ntPay=hrRate*0.5*monthlyNightH;
  const gross=basicPay+wlPay+otPay+ntPay+mealNT;
  const taxBase=basicPay+wlPay+otPay+ntPay;
  const npBase=Math.min(taxBase,6370000);
  const npE=Math.round(npBase*0.0475), hiE=Math.round(taxBase*0.03595);
  const ltE=Math.round(hiE*0.1314), eiE=Math.round(taxBase*0.009);
  const insE=npE+hiE+ltE+eiE;
  const itax=getIncomeTax(taxBase-insE,dep), ltax=Math.round(itax*0.1);
  const totDed=insE+itax+ltax, net=gross-totDed;
  const npR=Math.round(npBase*0.0475), hiR=Math.round(taxBase*0.03595);
  const ltR=Math.round(hiR*0.1314), eiR=Math.round(taxBase*0.0105), wiR=Math.round(taxBase*0.0147);
  const insR=npR+hiR+ltR+eiR+wiR, totCost=gross+insR;
  return {hrRate,gross,net,totDed,insE,insR,totCost,npR,hiR,ltR,eiR,wiR,npE,hiE,ltE,eiE,itax,ltax};
}

function reverseCalcHr(grossTarget, sched, meal) {
  const mealNT=Math.min(meal,200000);
  const {monthlyBasicH,monthlyWLH,monthlyOTH,monthlyNightH}=sched;
  const div=monthlyBasicH+monthlyWLH+0.5*monthlyOTH+0.5*monthlyNightH;
  return div>0?Math.max(0,(grossTarget-mealNT)/div):0;
}

/* ── 결과 카드 ── */
function ResultCard({ r, count, label, isOrange, retirePer }) {
  if(!r) return null;
  const a=isOrange?{
    border:"border-orange-300",bg:"bg-orange-50",
    hdr:"bg-gradient-to-r from-orange-500 to-amber-500",
    tag:"bg-orange-100 text-orange-700",row:"hover:bg-orange-50",sum:"bg-orange-500",
  }:{
    border:"border-blue-300",bg:"bg-blue-50",
    hdr:"bg-gradient-to-r from-blue-600 to-indigo-600",
    tag:"bg-blue-100 text-blue-700",row:"hover:bg-blue-50",sum:"bg-blue-600",
  };
  return (
    <div className={`rounded-xl border-2 overflow-hidden ${a.border} ${a.bg} flex flex-col`}>
      {/* 헤더 */}
      <div className={`${a.hdr} text-white px-3 py-2.5 flex justify-between items-center`}>
        <div>
          <div className="text-xs font-black">{label}</div>
          <div className="text-xs opacity-70">{count}명 재직 · 1인 기준</div>
        </div>
        <div className="text-right">
          <div className="text-xl font-black font-mono leading-tight">{fmt(r.hrRate)}<span className="text-xs opacity-80">원/h</span></div>
          {retirePer>0&&<div className="text-xs opacity-80 font-semibold">퇴직금 {fmt(retirePer)}원/월</div>}
        </div>
      </div>

      <div className="p-2.5 space-y-2 flex-1">
        {/* 핵심 4박스 */}
        <div className="grid grid-cols-2 gap-1.5">
          {[
            ["세전 월급", r.gross, isOrange?"text-orange-700":"text-blue-700"],
            ["💚 실수령액", r.net, "text-emerald-700"],
            ["사업주 보험", r.insR, "text-red-600"],
            ["1인 총인건비", r.totCost, "text-purple-700"],
          ].map(([l,v,c])=>(
            <div key={l} className="bg-white rounded-lg p-2 text-center shadow-sm">
              <div className={`text-sm font-black font-mono ${c}`}>{fmt(v)}<span className="text-xs">원</span></div>
              <div className="text-xs text-gray-400 leading-tight">{l}</div>
            </div>
          ))}
        </div>

        {/* 사업주 4대보험 */}
        <div className="bg-white rounded-lg p-2.5">
          <div className="text-xs font-black text-gray-600 mb-1.5">🏢 사업주 4대보험 명세</div>
          <div className="space-y-0.5">
            {[["국민연금","4.75%",r.npR],["건강보험","3.595%",r.hiR],["장기요양","×13.14%",r.ltR],["고용보험","1.05%",r.eiR],["산재보험","1.47%",r.wiR]].map(([name,rate,v])=>(
              <div key={name} className={`flex items-center justify-between text-xs px-1 py-0.5 rounded ${a.row}`}>
                <span className="text-gray-400 w-12 flex-shrink-0">{name}</span>
                <span className={`text-xs px-1 py-0.5 rounded font-mono flex-shrink-0 ${a.tag}`}>{rate}</span>
                <span className="font-mono font-bold text-red-500">{fmt(v)}원</span>
              </div>
            ))}
          </div>
          <div className="flex justify-between text-xs font-black pt-1.5 mt-1 border-t border-gray-100">
            <span className="text-gray-700">부담 합계</span>
            <span className="font-mono text-red-600">{fmt(r.insR)}원</span>
          </div>
        </div>

        {/* 근로자 공제 */}
        <div className="bg-white rounded-lg p-2.5">
          <div className="text-xs font-black text-gray-600 mb-1">👤 근로자 공제</div>
          {[["4대보험(근로자)",r.insE],["소득세+지방세",r.itax+r.ltax]].map(([l,v])=>(
            <div key={l} className="flex justify-between text-xs py-0.5">
              <span className="text-gray-400">{l}</span>
              <span className="font-mono font-semibold text-gray-500">-{fmt(v)}원</span>
            </div>
          ))}
          <div className="flex justify-between text-xs font-bold pt-1 mt-0.5 border-t border-gray-100">
            <span className="text-gray-600">공제 합계</span>
            <span className="font-mono text-gray-600">-{fmt(r.totDed)}원</span>
          </div>
        </div>

        {/* N명 합산 */}
        {count>1&&(
          <div className={`rounded-lg p-2.5 text-white text-center ${a.sum}`}>
            <div className="text-xs opacity-80">{count}명 합산 월 총인건비</div>
            <div className="text-base font-black font-mono">{fmt(r.totCost*count)}원</div>
            <div className="text-xs opacity-70">사업주보험 {fmt(r.insR*count)}원 포함</div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── 섹션 헤더 ── */
function SH({ color="blue", children }) {
  const bc={blue:"border-blue-500 text-blue-900",orange:"border-orange-500 text-orange-800",slate:"border-slate-400 text-slate-800"};
  return <h3 className={`text-xs font-black pb-1.5 mb-2.5 border-b-2 ${bc[color]}`}>{children}</h3>;
}

/* ── 라벨 ── */
const LB = ({children})=><label className="block text-xs font-semibold text-gray-400 mb-1">{children}</label>;

export default function App() {
  const [wdDays,setWdDays]=useState(5);
  const [wdStart,setWdStart]=useState("09:00");
  const [wdEnd,setWdEnd]=useState("18:00");
  const [wdBreak,setWdBreak]=useState(60);
  const [wdCount,setWdCount]=useState("1");
  const [wdMode,setWdMode]=useState("monthly");
  const [wdMoStr,setWdMoStr]=useState("3000000");
  const [wdHrStr,setWdHrStr]=useState("13000");

  const [hasWe,setHasWe]=useState(false);
  const [weDays,setWeDays]=useState(1);
  const [weTimeSame,setWeTimeSame]=useState(true);
  const [weStart,setWeStart]=useState("09:00");
  const [weEnd,setWeEnd]=useState("18:00");
  const [weBreak,setWeBreak]=useState(60);
  const [weCount,setWeCount]=useState("1");
  const [weWageMode,setWeWageMode]=useState("daily");
  const [weDailyStr,setWeDailyStr]=useState("150000");

  const [dep,setDep]=useState(1);
  const [mealStr,setMealStr]=useState("200000");
  const [clientInsStr,setClientInsStr]=useState("");
  const [supportStr,setSupportStr]=useState("");

  // input base styles
  const ic ="w-full px-2.5 py-2 border-2 border-gray-200 rounded-lg text-sm bg-gray-50 focus:outline-none focus:border-blue-500 transition-all";
  const ioc="w-full px-2.5 py-2 border-2 border-orange-200 rounded-lg text-sm bg-orange-50 focus:outline-none focus:border-orange-500";
  const timeC="w-full px-2 py-1.5 border-2 border-gray-200 rounded-lg text-sm bg-gray-50 focus:outline-none focus:border-blue-500";
  const timeOC="w-full px-2 py-1.5 border-2 border-orange-200 rounded-lg text-sm bg-orange-50 focus:outline-none focus:border-orange-500";

  const c=useMemo(()=>{
    const meal=parseNum(mealStr), wdN=Math.max(1,parseNum(wdCount)), weN=Math.max(1,parseNum(weCount));
    const clientIns=parseNum(clientInsStr), support=parseNum(supportStr);
    const wdS=buildSched(wdDays,wdStart,wdEnd,wdBreak);
    const wdHr=wdMode==="monthly"?reverseCalcHr(parseNum(wdMoStr),wdS,meal):parseNum(wdHrStr);
    const wdR=calcForRate(wdHr,wdS,meal,dep);
    let weS=null,weR=null,weHr=0;
    if(hasWe&&weDays>0){
      const s=weTimeSame?wdStart:weStart, e=weTimeSame?wdEnd:weEnd, b=weTimeSame?wdBreak:weBreak;
      weS=buildSched(weDays,s,e,b);
      weHr=weWageMode==="sameAsWd"?wdHr:(weS.workH>0?parseNum(weDailyStr)/weS.workH:0);
      weR=calcForRate(weHr,weS,meal,dep);
    }
    const totalGross=(wdR?.gross||0)*wdN+(weR?.gross||0)*weN;
    const totalInsR=(wdR?.insR||0)*wdN+(weR?.insR||0)*weN;
    const totalNet=(wdR?.net||0)*wdN+(weR?.net||0)*weN;
    const totalCost=(wdR?.totCost||0)*wdN+(weR?.totCost||0)*weN;
    const totalRetire=Math.round(totalGross/12);
    const wdRetire1=wdR?Math.round(wdR.gross/12):0;
    const weRetire1=weR?Math.round(weR.gross/12):0;
    const estimate=totalGross+totalInsR+totalRetire+clientIns+support;
    return {wdS,wdR,wdN,wdHr,weS,weR,weN,weHr,totalGross,totalInsR,totalNet,totalCost,totalRetire,wdRetire1,weRetire1,clientIns,support,estimate};
  },[wdDays,wdStart,wdEnd,wdBreak,wdCount,wdMode,wdMoStr,wdHrStr,hasWe,weDays,weTimeSame,weStart,weEnd,weBreak,weCount,weWageMode,weDailyStr,dep,mealStr,clientInsStr,supportStr]);

  const totalPeople=c.wdN+(hasWe&&c.weR?c.weN:0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-blue-50 pb-10">

      {/* 헤더 */}
      <div className="bg-gradient-to-r from-blue-700 to-indigo-900 text-white px-4 py-3 shadow-xl">
        <div className="max-w-screen-2xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-base font-black tracking-tight">💼 2026 인건비 견적 계산기</h1>
            <p className="text-blue-200 text-xs mt-0.5">월급·일당 → 시급 역산 · 4대보험 · 퇴직금 · 고객사보험료 · 운영지원금 → 월 견적금액</p>
          </div>
          <div className="text-right text-xs text-blue-300 hidden md:block">
            <div>최저임금 <strong className="text-white">10,320원</strong></div>
            <div className="opacity-70">2026년 기준</div>
          </div>
        </div>
      </div>

      {/* 본문 */}
      <div className="max-w-screen-2xl mx-auto px-3 pt-3 flex gap-3 items-start">

        {/* ══ 왼쪽 입력 ══ */}
        <div className="w-80 flex-shrink-0 space-y-2.5">

          {/* ① 평일 급여 설정 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3">
            <SH color="blue">💰 평일 급여 설정</SH>
            <div className="flex gap-1 bg-gray-100 p-0.5 rounded-lg mb-2.5">
              {[["monthly","💵 월급 (역산)"],["hourly","⏱ 시급 직접"]].map(([k,v])=>(
                <button key={k} onClick={()=>setWdMode(k)}
                  className={`flex-1 py-1.5 rounded-md text-xs font-bold transition-all ${wdMode===k?"bg-white text-blue-700 shadow":"text-gray-500"}`}>{v}</button>
              ))}
            </div>
            {wdMode==="monthly"?(
              <div className="space-y-1.5">
                <LB>1인 월 기대급여 (세전)</LB>
                <NInput value={wdMoStr} onChange={setWdMoStr} placeholder="3,000,000" suffix="원"
                  className={`${ic} font-mono text-lg font-black text-right pr-9`}/>
                {c.wdHr>0&&(
                  <div className={`rounded-lg p-2 flex justify-between items-center text-xs font-bold ${c.wdHr>=MIN_WAGE?"bg-blue-50 border border-blue-200 text-blue-700":"bg-red-50 border border-red-200 text-red-600"}`}>
                    <span>{c.wdHr>=MIN_WAGE?"✅ 역산 시급":"❌ 최저임금 위반"}</span>
                    <span className="font-mono text-sm">{fmt(c.wdHr)}원/h</span>
                  </div>
                )}
                {c.wdRetire1>0&&(
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 flex justify-between text-xs font-bold text-amber-700">
                    <span>📦 월 퇴직금</span><span className="font-mono">{fmt(c.wdRetire1)}원</span>
                  </div>
                )}
              </div>
            ):(
              <div className="space-y-1.5">
                <LB>시급</LB>
                <NInput value={wdHrStr} onChange={setWdHrStr} placeholder="13,000" suffix="원/h"
                  className={`${ic} font-mono text-lg font-black text-right pr-12`}/>
                {parseNum(wdHrStr)>0&&parseNum(wdHrStr)<MIN_WAGE&&<p className="text-xs text-red-500 font-bold">❌ 최저임금(10,320원) 위반!</p>}
                {c.wdRetire1>0&&(
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 flex justify-between text-xs font-bold text-amber-700">
                    <span>📦 월 퇴직금</span><span className="font-mono">{fmt(c.wdRetire1)}원</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ② 평일 근무 설정 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3">
            <SH color="blue">📅 평일 근무 <span className="text-blue-400 font-normal">월~금</span></SH>
            <div className="mb-2">
              <LB>주 근무일수</LB>
              <div className="flex gap-1">
                {[1,2,3,4,5].map(n=>(
                  <button key={n} onClick={()=>setWdDays(n)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold border-2 transition-all ${wdDays===n?"bg-blue-600 border-blue-600 text-white shadow":"bg-white border-gray-200 text-gray-500 hover:border-blue-300"}`}>{n}일</button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-1.5 mb-2">
              <div><LB>출근</LB><input type="time" value={wdStart} onChange={e=>setWdStart(e.target.value)} className={timeC}/></div>
              <div><LB>퇴근</LB><input type="time" value={wdEnd} onChange={e=>setWdEnd(e.target.value)} className={timeC}/></div>
              <div><LB>휴게(분)</LB><input type="number" value={wdBreak} min={0} max={480} step={30} onChange={e=>setWdBreak(parseInt(e.target.value)||0)} className={timeC}/></div>
            </div>
            <div className="mb-2">
              <LB>직원 수</LB>
              <Counter value={wdCount} onChange={setWdCount}/>
            </div>
            <div className="bg-blue-50 rounded-lg px-2.5 py-1.5 text-xs flex flex-wrap gap-x-2 gap-y-0.5">
              <span className="text-blue-700 font-bold">일 {c.wdS.workH.toFixed(1)}h</span>
              <span className="text-blue-500">주 {c.wdS.weeklyH.toFixed(1)}h</span>
              <span className="text-blue-500">월기본 {c.wdS.monthlyBasicH.toFixed(1)}h</span>
              {c.wdS.hasWL&&<span className="text-emerald-600 font-bold">주휴 {c.wdS.monthlyWLH.toFixed(1)}h</span>}
              {c.wdS.monthlyOTH>0&&<span className="text-orange-600 font-bold">연장 {c.wdS.monthlyOTH.toFixed(1)}h</span>}
            </div>
          </div>

          {/* ③ 주말 근무 설정 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3">
            <div className="flex items-center justify-between pb-1.5 mb-2.5 border-b-2 border-orange-400">
              <h3 className="text-xs font-black text-orange-800">🌅 주말 근무 <span className="text-orange-400 font-normal">토·일</span></h3>
              <Toggle on={hasWe} onToggle={()=>setHasWe(!hasWe)} colorOn="bg-orange-500"/>
            </div>
            {!hasWe?(
              <p className="text-xs text-gray-400 text-center py-1">주말 근무 없음 — 토글 활성화</p>
            ):(
              <div className="space-y-2.5">
                {/* 주말 일수 */}
                <div>
                  <LB>주말 근무일수</LB>
                  <div className="flex gap-1.5">
                    {[["토요일 (1일)",1],["토+일 (2일)",2]].map(([l,n])=>(
                      <button key={n} onClick={()=>setWeDays(n)}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-bold border-2 transition-all ${weDays===n?"bg-orange-500 border-orange-500 text-white shadow":"bg-white border-gray-200 text-gray-500 hover:border-orange-300"}`}>{l}</button>
                    ))}
                  </div>
                </div>

                {/* 근무시간 */}
                <div>
                  <div className="flex items-center gap-2 bg-orange-50 rounded-lg px-2.5 py-1.5 mb-1.5">
                    <Toggle on={weTimeSame} onToggle={()=>setWeTimeSame(!weTimeSame)} colorOn="bg-orange-500"/>
                    <span className="text-xs font-semibold text-orange-700">평일 근무시간 동일</span>
                  </div>
                  {!weTimeSame&&(
                    <div className="grid grid-cols-3 gap-1.5">
                      <div><LB>출근</LB><input type="time" value={weStart} onChange={e=>setWeStart(e.target.value)} className={timeOC}/></div>
                      <div><LB>퇴근</LB><input type="time" value={weEnd} onChange={e=>setWeEnd(e.target.value)} className={timeOC}/></div>
                      <div><LB>휴게(분)</LB><input type="number" value={weBreak} min={0} max={480} step={30} onChange={e=>setWeBreak(parseInt(e.target.value)||0)} className={timeOC}/></div>
                    </div>
                  )}
                  {c.weS&&(
                    <div className="bg-orange-50 rounded-lg px-2.5 py-1.5 mt-1.5 text-xs flex flex-wrap gap-x-2">
                      <span className="text-orange-700 font-bold">일 {c.weS.workH.toFixed(1)}h</span>
                      <span className="text-orange-500">주 {c.weS.weeklyH.toFixed(1)}h</span>
                      {c.weS.hasWL&&<span className="text-emerald-600 font-bold">주휴 {c.weS.monthlyWLH.toFixed(1)}h</span>}
                    </div>
                  )}
                </div>

                {/* 주말 급여 */}
                <div>
                  <LB>주말 급여 기준</LB>
                  <div className="flex gap-1 bg-gray-100 p-0.5 rounded-lg mb-1.5">
                    {[["daily","💵 일당 (역산)"],["sameAsWd","평일 동일"]].map(([k,v])=>(
                      <button key={k} onClick={()=>setWeWageMode(k)}
                        className={`flex-1 py-1.5 rounded-md text-xs font-bold transition-all ${weWageMode===k?"bg-white text-orange-700 shadow":"text-gray-500"}`}>{v}</button>
                    ))}
                  </div>
                  {weWageMode==="daily"?(
                    <div className="space-y-1">
                      <NInput value={weDailyStr} onChange={setWeDailyStr} placeholder="150,000" suffix="원/일"
                        className={`${ioc} font-mono text-base font-black text-right pr-12`}/>
                      {c.weHr>0&&c.weS&&(
                        <div className={`rounded-lg p-2 flex justify-between text-xs font-bold ${c.weHr>=MIN_WAGE?"bg-orange-50 border border-orange-200 text-orange-700":"bg-red-50 border border-red-200 text-red-600"}`}>
                          <span>{c.weHr>=MIN_WAGE?"✅ 역산 시급":"❌ 최저임금 위반"}</span>
                          <span className="font-mono">{fmt(c.weHr)}원/h</span>
                        </div>
                      )}
                    </div>
                  ):(
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-2 text-xs text-orange-700 font-bold text-center">
                      평일 시급 <span className="font-mono">{fmt(c.wdHr)}원/h</span> 동일 적용
                    </div>
                  )}
                  {c.weRetire1>0&&(
                    <div className="mt-1 bg-amber-50 border border-amber-200 rounded-lg p-2 flex justify-between text-xs font-bold text-amber-700">
                      <span>📦 월 퇴직금</span><span className="font-mono">{fmt(c.weRetire1)}원</span>
                    </div>
                  )}
                </div>

                <div>
                  <LB>직원 수</LB>
                  <Counter value={weCount} onChange={setWeCount}/>
                </div>
              </div>
            )}
          </div>

          {/* ④ 기타 설정 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3">
            <SH color="slate">⚙️ 기타 설정</SH>
            <div className="grid grid-cols-2 gap-2 mb-2.5">
              <div>
                <LB>식대 비과세</LB>
                <NInput value={mealStr} onChange={setMealStr} suffix="원" className={`${ic} pr-8`}/>
                <p className="text-xs text-gray-400 mt-0.5">최대 200,000원</p>
              </div>
              <div>
                <LB>부양가족</LB>
                <select value={dep} onChange={e=>setDep(parseInt(e.target.value))} className={ic}>
                  {[1,2,3,4,5,6,7].map(n=><option key={n} value={n}>{n}명{n===1?" (본인만)":""}</option>)}
                </select>
              </div>
            </div>
            <div className="border-t border-dashed border-gray-200 pt-2.5 space-y-2">
              <p className="text-xs font-bold text-gray-500">견적 추가 항목 (수기 입력)</p>
              <div>
                <LB>🏢 고객사 보험료</LB>
                <NInput value={clientInsStr} onChange={setClientInsStr} placeholder="0" suffix="원" className={`${ic} pr-8`}/>
              </div>
              <div>
                <LB>💡 운영지원금</LB>
                <NInput value={supportStr} onChange={setSupportStr} placeholder="0" suffix="원" className={`${ic} pr-8`}/>
              </div>
            </div>
          </div>
        </div>

        {/* ══ 오른쪽 결과 ══ */}
        <div className="flex-1 min-w-0 space-y-2.5">

          {/* 결과 카드 가로 배치 */}
          <div className={`grid gap-2.5 ${hasWe&&c.weR?"grid-cols-2":"grid-cols-1 max-w-md"}`}>
            <ResultCard r={c.wdR} count={c.wdN} label={`📅 평일 직원 · 주 ${wdDays}일`} isOrange={false} retirePer={c.wdRetire1}/>
            {hasWe&&c.weR&&(
              <ResultCard r={c.weR} count={c.weN} label={`🌅 주말 직원 · 주 ${weDays}일`} isOrange={true} retirePer={c.weRetire1}/>
            )}
          </div>

          {/* 견적금액 합산 */}
          <div className="bg-gradient-to-br from-slate-800 to-indigo-950 text-white rounded-xl overflow-hidden shadow-xl">
            {/* 합산 헤더 */}
            <div className="px-4 py-2.5 bg-white bg-opacity-10 border-b border-white border-opacity-10 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black">📋 월 견적금액 합산</h3>
                <p className="text-xs text-slate-400">급여 + 4대보험 + 퇴직금 + 고객사보험료 + 운영지원금</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-black font-mono text-yellow-300">{fmt(c.estimate)}<span className="text-xs">원</span></div>
                <div className="text-xs text-slate-400">월 총 견적</div>
              </div>
            </div>

            <div className="p-3">
              {/* 항목 내역 — 2열 그리드 */}
              <div className="grid grid-cols-2 gap-1.5 mb-3">
                {[
                  ["💵 급여 합계(세전)", c.totalGross, "text-blue-300"],
                  ["🏢 사업주 4대보험", c.totalInsR, "text-red-300"],
                  ["📦 월 퇴직금(÷12)", c.totalRetire, "text-amber-300"],
                  ["👥 총 인건비", c.totalCost, "text-purple-300"],
                  ...(c.clientIns>0?[["🏢 고객사 보험료", c.clientIns, "text-fuchsia-300"]]:[] ),
                  ...(c.support>0  ?[["💡 운영지원금",   c.support,   "text-green-300"]]:[] ),
                ].map(([l,v,col])=>(
                  <div key={l} className="flex items-center justify-between bg-white bg-opacity-10 rounded-lg px-3 py-2">
                    <span className="text-xs text-slate-300">{l}</span>
                    <span className={`font-mono font-black text-sm ${col}`}>{fmt(v)}<span className="text-xs">원</span></span>
                  </div>
                ))}
              </div>

              {/* 합계 + 3개 요약 */}
              <div className="border-t border-white border-opacity-20 pt-2.5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-black text-slate-200">🧾 월 견적금액 합계</span>
                  <span className="text-xl font-black font-mono text-yellow-300">{fmt(c.estimate)}원</span>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    ["연간 견적(×12)", fmt(c.estimate*12)+"원"],
                    ["1인 평균", fmt(c.estimate/Math.max(1,totalPeople))+"원"],
                    ["총 사업주 부담", fmt(c.totalInsR+c.totalRetire+c.clientIns+c.support)+"원"],
                  ].map(([l,v])=>(
                    <div key={l} className="bg-white bg-opacity-10 rounded-lg p-2 text-center">
                      <div className="text-xs text-slate-400 leading-tight">{l}</div>
                      <div className="text-xs font-black font-mono text-yellow-200 mt-0.5">{v}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 법적 기준 */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-gray-400 leading-relaxed">
            <p className="font-bold text-gray-600 mb-1">📌 2026년 법적 기준</p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-0.5">
              <p>• 최저임금 <strong className="text-gray-700">10,320원</strong> (209h → 2,156,880원)</p>
              <p>• 국민연금 9.5% (사업주·근로자 각 4.75%)</p>
              <p>• 건강보험 7.19% + 장기요양 ×13.14%</p>
              <p>• 연장(일 8h·주 40h 초과) ×1.5 / 야간 ×0.5</p>
              <p>• 퇴직금 = 세전월급 ÷ 12 (1년 이상 근무 기준)</p>
              <p>• 소득세는 간이세액표 기준 추정치</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
