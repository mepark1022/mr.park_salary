import { useState, useMemo } from "react";

const DAYS = ["월", "화", "수", "목", "금", "토", "일"];
const MIN_WAGE = 10320;
const WEEKS = 4.345;

function timeToMin(t) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}
function fmt(n) { return Math.round(n).toLocaleString("ko-KR"); }
function getIncomeTax(taxable, dep) {
  let tax = 0;
  if (taxable <= 1060000) tax = 0;
  else if (taxable <= 1500000) tax = (taxable - 1060000) * 0.06;
  else if (taxable <= 3000000) tax = 26400 + (taxable - 1500000) * 0.15;
  else if (taxable <= 4500000) tax = 251400 + (taxable - 3000000) * 0.24;
  else if (taxable <= 8000000) tax = 611400 + (taxable - 4500000) * 0.35;
  else tax = 1836400 + (taxable - 8000000) * 0.38;
  const dd = [0, 0, 14000, 21000, 28000, 35000, 42000, 49000];
  return Math.max(0, Math.round(tax - dd[Math.min(dep, 7)]));
}
const defaultDay = (work) => ({ work, start: "09:00", end: "18:00", breakMin: 60 });

function calcForRate(hrRate, monthlyBasicH, monthlyWLH, monthlyOTH, monthlyNightH, meal, dep) {
  const basicPay = hrRate * monthlyBasicH;
  const wlPay = hrRate * monthlyWLH;
  const otPay = hrRate * 0.5 * monthlyOTH;
  const ntPay = hrRate * 0.5 * monthlyNightH;
  const mealNT = Math.min(meal, 200000);
  const gross = basicPay + wlPay + otPay + ntPay + mealNT;
  const taxBase = basicPay + wlPay + otPay + ntPay;
  const npBase = Math.min(taxBase, 6370000);
  const npE = Math.round(npBase * 0.0475);
  const hiE = Math.round(taxBase * 0.03595);
  const ltE = Math.round(hiE * 0.1314);
  const eiE = Math.round(taxBase * 0.009);
  const insE = npE + hiE + ltE + eiE;
  const itax = getIncomeTax(taxBase - insE, dep);
  const ltax = Math.round(itax * 0.1);
  const totDed = insE + itax + ltax;
  const net = gross - totDed;
  const npR = Math.round(npBase * 0.0475);
  const hiR = Math.round(taxBase * 0.03595);
  const ltR = Math.round(hiR * 0.1314);
  const eiR = Math.round(taxBase * 0.0105);
  const wiR = Math.round(taxBase * 0.0147);
  const insR = npR + hiR + ltR + eiR + wiR;
  const totCost = gross + insR;
  const totalPaidH = monthlyBasicH + monthlyWLH;
  const hrCost = totalPaidH > 0 ? totCost / totalPaidH : 0;
  return { hrRate, basicPay, wlPay, otPay, ntPay, mealNT, gross, npE, hiE, ltE, eiE, insE, itax, ltax, totDed, net, npR, hiR, ltR, eiR, wiR, insR, totCost, hrCost };
}

const Card = ({ title, accent = "blue", children }) => {
  const bar = { blue: "border-l-blue-500", green: "border-l-emerald-500", amber: "border-l-amber-500", slate: "border-l-slate-400" }[accent];
  return (
    <div className={`bg-white rounded-xl border border-gray-100 shadow-sm border-l-4 ${bar} mb-3`}>
      {title && <div className="px-4 py-2.5 border-b border-gray-50"><span className="text-xs font-black text-gray-500 tracking-widest uppercase">{title}</span></div>}
      <div className="px-4 py-3">{children}</div>
    </div>
  );
};

const ColHeader = ({ icon, title, sub }) => (
  <div className="mb-3 pb-2.5 border-b-2 border-gray-800 flex items-center gap-2">
    <span className="text-base">{icon}</span>
    <div>
      <h2 className="text-sm font-black text-gray-900">{title}</h2>
      {sub && <p className="text-xs text-gray-400">{sub}</p>}
    </div>
  </div>
);

const Row = ({ label, value, color = "text-gray-600", bold = false }) => (
  <div className="flex justify-between items-center py-1 border-b border-gray-50 last:border-0">
    <span className="text-xs text-gray-400">{label}</span>
    <span className={`text-xs font-mono ${bold ? "font-black" : "font-semibold"} ${color}`}>{value}</span>
  </div>
);

const ResultBlock = ({ r, label, scheme }) => {
  const g = scheme === "green";
  const hdr = g ? "bg-emerald-600" : "bg-blue-600";
  const net = g ? "bg-emerald-500" : "bg-blue-500";
  const cost = "bg-orange-500";
  const tag = g ? "bg-emerald-50 border-emerald-100 text-emerald-700" : "bg-blue-50 border-blue-100 text-blue-700";
  const border = g ? "border-emerald-200" : "border-blue-200";
  return (
    <div className={`rounded-xl border ${border} mb-3 overflow-hidden`}>
      <div className={`${hdr} px-3 py-2 flex justify-between items-center`}>
        <span className="text-white text-xs font-black">{label}</span>
        <span className="text-white text-sm font-black font-mono">{fmt(r.hrRate)}원<span className="text-xs opacity-70 font-normal">/h</span></span>
      </div>
      <div className="grid grid-cols-2 gap-2 p-3">
        <div className="bg-gray-50 rounded-lg p-2.5 text-center">
          <p className="text-xs text-gray-400 mb-1">총 지급액(세전)</p>
          <p className="text-sm font-black font-mono text-gray-800">{fmt(r.gross)}<span className="text-xs font-normal text-gray-400">원</span></p>
        </div>
        <div className={`${net} rounded-lg p-2.5 text-center`}>
          <p className="text-xs text-white opacity-80 mb-1">실수령액</p>
          <p className="text-sm font-black font-mono text-white">{fmt(r.net)}<span className="text-xs font-normal opacity-80">원</span></p>
        </div>
        <div className="bg-gray-50 rounded-lg p-2.5 text-center">
          <p className="text-xs text-gray-400 mb-1">공제액 합계</p>
          <p className="text-sm font-black font-mono text-red-500">{fmt(r.totDed)}<span className="text-xs font-normal text-gray-400">원</span></p>
        </div>
        <div className={`${cost} rounded-lg p-2.5 text-center`}>
          <p className="text-xs text-white opacity-80 mb-1">사업주 총비용</p>
          <p className="text-sm font-black font-mono text-white">{fmt(r.totCost)}<span className="text-xs font-normal opacity-80">원</span></p>
        </div>
      </div>
      <div className="px-3 pb-2">
        <div className="bg-gray-50 rounded-lg px-3 py-2">
          <p className="text-xs font-bold text-gray-400 mb-1.5">근로자 공제 명세</p>
          {[
            ["국민연금 4.75%",   `-${fmt(r.npE)}원`,        "text-red-400"],
            ["건강보험 3.595%",  `-${fmt(r.hiE)}원`,        "text-red-400"],
            ["장기요양 ×13.14%", `-${fmt(r.ltE)}원`,        "text-red-400"],
            ["고용보험 0.9%",    `-${fmt(r.eiE)}원`,        "text-red-400"],
            ["소득세 + 지방세",  `-${fmt(r.itax+r.ltax)}원`,"text-red-400"],
            ["사업주 부담 보험", `+${fmt(r.insR)}원`,       "text-orange-500"],
          ].map(([l,v,c]) => <Row key={l} label={l} value={v} color={c} />)}
        </div>
      </div>
      <div className={`mx-3 mb-3 border ${tag} rounded-lg px-3 py-2 flex justify-between items-center`}>
        <span className="text-xs font-bold">시간당 실질 인건비</span>
        <span className="text-sm font-black font-mono">{fmt(r.hrCost)}원/h</span>
      </div>
    </div>
  );
};

export default function App() {
  const [scheduleMode, setScheduleMode] = useState("simple");
  const [simple, setSimple] = useState({ start: "09:00", end: "18:00", breakMin: 60, daysPerWeek: 5 });
  const [weekly, setWeekly] = useState(DAYS.map((_, i) => defaultDay(i < 5)));
  const [hrMode, setHrMode] = useState("both");
  const [customHr, setCustomHr] = useState(13000);
  const [dep, setDep] = useState(1);
  const [meal, setMeal] = useState(200000);
  const [activeTab, setActiveTab] = useState("input");
  const [pb, setPb] = useState({ baseCost: 6266667, valetFee: 2000, workDays: 10, vatIncluded: true, scenarioA: 50, scenarioB: 70 });

  const pbCalc = useMemo(() => {
    const calc = (dc) => {
      const grossRev = pb.valetFee * dc * pb.workDays;
      const netRev = pb.vatIncluded ? Math.round(grossRev / 1.1) : grossRev;
      const vatAmt = grossRev - netRev;
      const burden = Math.max(0, pb.baseCost - netRev);
      const rate = pb.baseCost > 0 ? (netRev / pb.baseCost) * 100 : 0;
      return { dc, grossRev, netRev, vatAmt, burden, rate };
    };
    return { A: calc(pb.scenarioA), B: calc(pb.scenarioB) };
  }, [pb]);

  const calc = useMemo(() => {
    let dailyWorkH = 0, weeklyWorkH = 0, nightHperWeek = 0, workingDays = 0;
    if (scheduleMode === "simple") {
      const sm = timeToMin(simple.start), em = timeToMin(simple.end);
      dailyWorkH = Math.max(0, em - sm - simple.breakMin) / 60;
      workingDays = simple.daysPerWeek;
      weeklyWorkH = dailyWorkH * workingDays;
      const e2 = em < sm ? em + 1440 : em;
      const ns = Math.max(sm, 22*60), ne = Math.min(e2, 30*60);
      nightHperWeek = (ns < ne ? (ne-ns)/60 : 0) * workingDays;
    } else {
      weekly.forEach(d => {
        if (!d.work) return;
        const sm = timeToMin(d.start), em = timeToMin(d.end);
        weeklyWorkH += Math.max(0, em - sm - d.breakMin) / 60;
        workingDays++;
        const e2 = em < sm ? em+1440 : em;
        const ns = Math.max(sm, 22*60), ne = Math.min(e2, 30*60);
        nightHperWeek += ns < ne ? (ne-ns)/60 : 0;
      });
      dailyWorkH = workingDays > 0 ? weeklyWorkH / workingDays : 0;
    }
    const hasWL = weeklyWorkH >= 15;
    const wlHperWeek = hasWL ? (workingDays > 0 ? weeklyWorkH / workingDays : 0) : 0;
    const monthlyBasicH = weeklyWorkH * WEEKS;
    const monthlyWLH = wlHperWeek * WEEKS;
    const monthlyNightH = nightHperWeek * WEEKS;
    const dailyOT = Math.max(0, dailyWorkH - 8);
    const weeklyOT = Math.max(0, weeklyWorkH - 40);
    const monthlyOTH = Math.max(dailyOT * workingDays, weeklyOT) * WEEKS;
    return {
      dailyWorkH, weeklyWorkH, monthlyBasicH, monthlyWLH, monthlyOTH, monthlyNightH, hasWL, workingDays,
      minResult: calcForRate(MIN_WAGE, monthlyBasicH, monthlyWLH, monthlyOTH, monthlyNightH, meal, dep),
      customResult: calcForRate(customHr, monthlyBasicH, monthlyWLH, monthlyOTH, monthlyNightH, meal, dep),
    };
  }, [scheduleMode, simple, weekly, customHr, dep, meal]);

  const inp = "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:outline-none focus:border-blue-400 focus:bg-white transition-all";
  const TABS = [["input","근무 입력"],["result","견적 결과"],["payback","페이백 시뮬"]];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-gray-900 text-white px-5 py-3.5 shadow-lg">
        <div className="max-w-screen-xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-sm font-black tracking-tight">2026 인건비 견적 계산기</h1>
            <p className="text-gray-400 text-xs mt-0.5">최저임금 10,320원 · 4대보험 자동 산출</p>
          </div>
          <span className="text-xs text-gray-600 font-mono bg-gray-800 px-2 py-1 rounded">v2026</span>
        </div>
      </div>

      {/* 모바일 탭 */}
      <div className="lg:hidden flex bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
        {TABS.map(([k,v]) => (
          <button key={k} onClick={() => setActiveTab(k)}
            className={`flex-1 py-3 text-xs font-bold transition-all ${activeTab===k ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50/50" : "text-gray-400"}`}>
            {v}
          </button>
        ))}
      </div>

      <div className="max-w-screen-xl mx-auto px-4 py-5">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">

          {/* ══ COL 1: 근무 입력 ══ */}
          <div className={activeTab==="input" ? "block" : "hidden lg:block"}>
            <ColHeader icon="⏱" title="근무 입력" sub="시간 · 시급 · 기타 설정" />

            <Card title="근무 시간" accent="blue">
              <div className="flex bg-gray-100 p-1 rounded-lg mb-3">
                {[["simple","일괄 설정"],["weekly","요일별 설정"]].map(([k,v]) => (
                  <button key={k} onClick={() => setScheduleMode(k)}
                    className={`flex-1 py-1.5 rounded-md text-xs font-bold transition-all ${scheduleMode===k ? "bg-white text-blue-600 shadow-sm" : "text-gray-500"}`}>
                    {v}
                  </button>
                ))}
              </div>
              {scheduleMode === "simple" ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-2">
                    {[["출근", simple.start, v => setSimple(p=>({...p, start:v}))],
                      ["퇴근", simple.end,   v => setSimple(p=>({...p, end:v}))]].map(([l,val,fn]) => (
                      <div key={l}>
                        <p className="text-xs text-gray-400 mb-1">{l}</p>
                        <input type="time" value={val} onChange={e=>fn(e.target.value)} className={inp} />
                      </div>
                    ))}
                    <div>
                      <p className="text-xs text-gray-400 mb-1">휴게(분)</p>
                      <input type="number" value={simple.breakMin} min={0} step={30}
                        onChange={e=>setSimple(p=>({...p,breakMin:parseInt(e.target.value)||0}))} className={inp} />
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-2">주 근무일수</p>
                    <div className="flex gap-1.5">
                      {[5,6,7].map(n => (
                        <button key={n} onClick={() => setSimple(p=>({...p,daysPerWeek:n}))}
                          className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all ${simple.daysPerWeek===n ? "bg-blue-600 border-blue-600 text-white" : "bg-white border-gray-200 text-gray-500 hover:border-blue-200"}`}>
                          주{n}일
                        </button>
                      ))}
                      <input type="number" value={simple.daysPerWeek} min={1} max={7}
                        onChange={e=>setSimple(p=>({...p,daysPerWeek:parseInt(e.target.value)||5}))}
                        className="w-14 py-2 border border-gray-200 rounded-lg text-xs text-center bg-white focus:outline-none focus:border-blue-400" />
                    </div>
                  </div>
                  <div className="flex justify-between items-center bg-blue-50 rounded-lg px-3 py-2">
                    <span className="text-xs text-blue-600 font-bold">일 실근무시간</span>
                    <span className="text-sm font-black font-mono text-blue-900">
                      {Math.max(0,(timeToMin(simple.end)-timeToMin(simple.start)-simple.breakMin)/60).toFixed(1)}h
                    </span>
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {DAYS.map((day,i) => (
                    <div key={day} className={`rounded-lg border p-2 transition-all ${weekly[i].work ? "border-blue-100 bg-blue-50/40" : "border-gray-100 bg-gray-50"}`}>
                      <div className="flex items-center gap-2">
                        <button onClick={() => setWeekly(w => w.map((d,j) => j===i ? {...d,work:!d.work} : d))}
                          className={`w-9 h-5 rounded-full relative flex-shrink-0 transition-all ${weekly[i].work ? "bg-blue-600" : "bg-gray-300"}`}>
                          <div className={`w-3.5 h-3.5 bg-white rounded-full absolute top-0.5 shadow transition-all ${weekly[i].work ? "left-5" : "left-0.5"}`} />
                        </button>
                        <span className={`w-4 text-xs font-black ${i>=5 ? "text-red-500":"text-gray-700"}`}>{day}</span>
                        {weekly[i].work ? (
                          <div className="flex gap-1 flex-1 items-center">
                            <input type="time" value={weekly[i].start}
                              onChange={e => setWeekly(w=>w.map((d,j)=>j===i?{...d,start:e.target.value}:d))}
                              className="flex-1 px-1.5 py-1 border border-blue-100 rounded text-xs bg-white focus:outline-none" />
                            <span className="text-gray-300">~</span>
                            <input type="time" value={weekly[i].end}
                              onChange={e => setWeekly(w=>w.map((d,j)=>j===i?{...d,end:e.target.value}:d))}
                              className="flex-1 px-1.5 py-1 border border-blue-100 rounded text-xs bg-white focus:outline-none" />
                            <input type="number" value={weekly[i].breakMin} min={0} step={30}
                              onChange={e => setWeekly(w=>w.map((d,j)=>j===i?{...d,breakMin:parseInt(e.target.value)||0}:d))}
                              className="w-12 px-1 py-1 border border-blue-100 rounded text-xs text-center bg-white focus:outline-none" />
                            <span className="text-xs text-gray-400">분</span>
                            <span className="text-xs text-blue-500 font-bold">
                              {Math.max(0,(timeToMin(weekly[i].end)-timeToMin(weekly[i].start)-weekly[i].breakMin)/60).toFixed(1)}h
                            </span>
                          </div>
                        ) : <span className="text-xs text-gray-400">휴무</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card title="시급 기준" accent="blue">
              <div className="flex bg-gray-100 p-1 rounded-lg mb-3">
                {[["min","최저임금"],["custom","직접 입력"],["both","둘 다 비교"]].map(([k,v]) => (
                  <button key={k} onClick={() => setHrMode(k)}
                    className={`flex-1 py-1.5 rounded-md text-xs font-bold transition-all ${hrMode===k ? "bg-white text-blue-600 shadow-sm" : "text-gray-500"}`}>
                    {v}
                  </button>
                ))}
              </div>
              {(hrMode==="custom"||hrMode==="both") && (
                <div>
                  <p className="text-xs text-gray-400 mb-1">설정 시급 (원)</p>
                  <input type="number" value={customHr} min={MIN_WAGE} step={100}
                    onChange={e=>setCustomHr(parseInt(e.target.value)||MIN_WAGE)}
                    className={`${inp} font-mono text-base font-bold`} />
                  {customHr < MIN_WAGE && <p className="text-xs text-red-500 mt-1 font-bold">최저임금(10,320원) 미달</p>}
                </div>
              )}
            </Card>

            <Card title="기타 설정" accent="slate">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-gray-400 mb-1">식대 비과세 (원)</p>
                  <input type="number" value={meal} step={10000} max={200000}
                    onChange={e=>setMeal(parseInt(e.target.value)||0)} className={inp} />
                  <p className="text-xs text-gray-300 mt-1">최대 200,000원</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">부양가족</p>
                  <select value={dep} onChange={e=>setDep(parseInt(e.target.value))} className={inp}>
                    {[1,2,3,4,5,6,7].map(n=><option key={n} value={n}>{n}명{n===1?" (본인)":""}</option>)}
                  </select>
                </div>
              </div>
            </Card>

            <div className="bg-gray-900 rounded-xl p-3">
              <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-2">근무시간 분석</p>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  ["일 실근무",`${calc.dailyWorkH.toFixed(1)}h`],
                  ["주 실근무",`${calc.weeklyWorkH.toFixed(1)}h`],
                  ["월 기본",`${calc.monthlyBasicH.toFixed(1)}h`],
                  ["월 주휴", calc.hasWL ? `${calc.monthlyWLH.toFixed(1)}h` : "–"],
                  ["월 연장",`${calc.monthlyOTH.toFixed(1)}h`],
                  ["월 야간",`${calc.monthlyNightH.toFixed(1)}h`],
                ].map(([l,v]) => (
                  <div key={l} className="bg-white/5 rounded-lg p-2 text-center">
                    <div className="text-white font-black text-sm font-mono">{v}</div>
                    <div className="text-gray-500 text-xs mt-0.5">{l}</div>
                  </div>
                ))}
              </div>
              <div className="mt-2 space-y-0.5">
                {!calc.hasWL && <p className="text-yellow-400 text-xs">⚠ 주 15h 미만 — 주휴수당 미발생</p>}
                {calc.monthlyOTH > 0 && <p className="text-orange-400 text-xs">⚡ 연장 가산수당 ×1.5 적용</p>}
                {calc.monthlyNightH > 0 && <p className="text-purple-400 text-xs">🌙 야간 가산수당 ×0.5 적용</p>}
              </div>
            </div>
          </div>

          {/* ══ COL 2: 견적 결과 ══ */}
          <div className={activeTab==="result" ? "block" : "hidden lg:block"}>
            <ColHeader icon="💰" title="견적 결과" sub="세전 · 실수령 · 사업주 비용" />

            {(hrMode==="min"||hrMode==="both") && <ResultBlock r={calc.minResult} label="최저임금 기준" scheme="green" />}
            {(hrMode==="custom"||hrMode==="both") && <ResultBlock r={calc.customResult} label="설정 시급 기준" scheme="blue" />}

            {hrMode==="both" && (
              <Card title="최저임금 vs 설정시급 비교" accent="slate">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left font-bold text-gray-400 pb-2">항목</th>
                      <th className="text-right font-bold text-emerald-600 pb-2">최저임금</th>
                      <th className="text-right font-bold text-blue-600 pb-2">설정시급</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ["시급",      fmt(calc.minResult.hrRate)+"원",  fmt(calc.customResult.hrRate)+"원"],
                      ["총 지급",   fmt(calc.minResult.gross)+"원",   fmt(calc.customResult.gross)+"원"],
                      ["실수령",    fmt(calc.minResult.net)+"원",     fmt(calc.customResult.net)+"원"],
                      ["공제 합계", fmt(calc.minResult.totDed)+"원",  fmt(calc.customResult.totDed)+"원"],
                      ["사업주 보험",fmt(calc.minResult.insR)+"원",   fmt(calc.customResult.insR)+"원"],
                      ["사업주 총비용",fmt(calc.minResult.totCost)+"원",fmt(calc.customResult.totCost)+"원"],
                      ["시간당 인건비",fmt(calc.minResult.hrCost)+"원",fmt(calc.customResult.hrCost)+"원"],
                    ].map(([l,a,b]) => (
                      <tr key={l} className="border-b border-gray-50 last:border-0">
                        <td className="py-1.5 text-gray-400">{l}</td>
                        <td className="py-1.5 text-right font-mono font-bold text-emerald-600">{a}</td>
                        <td className="py-1.5 text-right font-mono font-bold text-blue-600">{b}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="mt-2.5 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 flex justify-between items-center">
                  <span className="text-xs text-amber-700 font-bold">월 차액 (사업주)</span>
                  <span className="text-xs font-black font-mono text-amber-900">
                    {fmt(Math.abs(calc.customResult.totCost-calc.minResult.totCost))}원
                    {calc.customResult.totCost > calc.minResult.totCost ? " 추가 부담" : " 절감"}
                  </span>
                </div>
              </Card>
            )}

            <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 text-xs text-gray-400 leading-relaxed">
              <p className="font-bold text-gray-500 mb-1.5">2026년 법적 기준</p>
              <p>• 최저임금 10,320원 / 최저월급 2,156,880원(209h)</p>
              <p>• 국민연금 9.5%(각 4.75%) · 건강보험 7.19% · 장기요양 13.14%</p>
              <p>• 연장(일 8h·주 40h 초과) ×1.5 / 야간(22~06시) ×0.5</p>
              <p>• 소득세는 간이세액표 추정치 · 정확한 처리는 노무사 확인</p>
            </div>
          </div>

          {/* ══ COL 3: 페이백 시뮬 ══ */}
          <div className={activeTab==="payback" ? "block" : "hidden lg:block"}>
            <ColHeader icon="🅿️" title="페이백 시뮬레이션" sub="발렛비 매출로 실질 부담 산출" />

            <div className="bg-amber-500 text-white rounded-xl px-3 py-2.5 mb-3 text-xs leading-relaxed">
              <span className="font-black">페이백이란?</span> 발렛비(주차요금)를 고객에게 받아 운영비에서 차감, 실질 부담을 낮추는 구조입니다.
              카드결제 시 부가세(10%)는 자감 후 정산됩니다.
            </div>

            <Card title="기준 설정" accent="amber">
              <div className="grid grid-cols-2 gap-3 mb-3">
                {[
                  ["기본 견적 총계 (원)", pb.baseCost, 10000, v=>setPb(p=>({...p,baseCost:v}))],
                  ["발렛비 / 대 (원)",    pb.valetFee, 500,   v=>setPb(p=>({...p,valetFee:v}))],
                  ["월 운영일수 (일)",     pb.workDays, 1,     v=>setPb(p=>({...p,workDays:v}))],
                ].map(([l,val,step,fn],idx) => idx < 3 && (
                  <div key={l} className={idx===2 ? "" : ""}>
                    <p className="text-xs text-gray-400 mb-1">{l}</p>
                    <input type="number" value={val} step={step} min={0}
                      onChange={e=>fn(parseInt(e.target.value)||0)}
                      className={`${inp} font-mono font-bold`} />
                  </div>
                ))}
                <div>
                  <p className="text-xs text-gray-400 mb-1">부가세 처리</p>
                  <button onClick={() => setPb(p=>({...p,vatIncluded:!p.vatIncluded}))}
                    className={`w-full py-2 rounded-lg text-xs font-bold border transition-all ${pb.vatIncluded ? "bg-amber-50 border-amber-300 text-amber-700" : "bg-gray-50 border-gray-200 text-gray-500"}`}>
                    {pb.vatIncluded ? "✓ 부가세 자감 적용" : "부가세 자감 미적용"}
                  </button>
                </div>
              </div>
              <div className="flex justify-between items-center bg-gray-50 rounded-lg px-3 py-2">
                <span className="text-xs text-gray-500 font-bold">기준 월 부담</span>
                <span className="text-sm font-black font-mono text-gray-800">{fmt(pb.baseCost)}원</span>
              </div>
            </Card>

            {[
              { key:"A", label:"시나리오 A", cars:pb.scenarioA, setCars:v=>setPb(p=>({...p,scenarioA:v})), result:pbCalc.A, isV:true  },
              { key:"B", label:"시나리오 B", cars:pb.scenarioB, setCars:v=>setPb(p=>({...p,scenarioB:v})), result:pbCalc.B, isV:false },
            ].map(({ key,label,cars,setCars,result,isV }) => {
              const hdr = isV ? "bg-violet-600" : "bg-teal-600";
              const tag = isV ? "bg-violet-50 border-violet-100 text-violet-700" : "bg-teal-50 border-teal-100 text-teal-700";
              const bar = isV ? "bg-violet-400" : "bg-teal-400";
              const num = isV ? "text-violet-700" : "text-teal-700";
              const bdr = isV ? "border-violet-200" : "border-teal-200";
              return (
                <div key={key} className={`rounded-xl border ${bdr} mb-3 overflow-hidden`}>
                  <div className={`${hdr} px-3 py-2 flex justify-between items-center`}>
                    <span className="text-white text-xs font-black">{label}</span>
                    <span className="text-white text-xs opacity-80">일 {cars}대 · 월 {pb.workDays}일</span>
                  </div>
                  <div className="p-3">
                    <div className="flex gap-2 mb-3 items-center">
                      <input type="number" value={cars} min={1} step={5}
                        onChange={e=>setCars(parseInt(e.target.value)||1)}
                        className={`w-20 px-2 py-2 border rounded-lg text-lg font-black font-mono text-center focus:outline-none ${isV?"border-violet-200 focus:border-violet-400":"border-teal-200 focus:border-teal-400"}`} />
                      <span className="text-xs text-gray-400 font-bold">대/일</span>
                      <div className="flex gap-1 flex-1">
                        {[30,50,70,100].map(n => (
                          <button key={n} onClick={()=>setCars(n)}
                            className={`flex-1 py-1.5 rounded text-xs font-bold border transition-all ${cars===n ? `${hdr} text-white border-transparent` : "bg-white border-gray-200 text-gray-400 hover:border-gray-300"}`}>
                            {n}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded-lg px-3 py-2 mb-3">
                      <Row label="발렛 총 매출"  value={`${fmt(result.grossRev)}원`} color={num} />
                      {pb.vatIncluded && <Row label="부가세 차감 (÷1.1)" value={`-${fmt(result.vatAmt)}원`} color="text-red-400" />}
                      <Row label="순 페이백 금액" value={`${fmt(result.netRev)}원`} color={num} bold />
                    </div>
                    <div className="mb-3">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-400">비용 절감율</span>
                        <span className="font-black text-green-600 font-mono">{result.rate.toFixed(1)}%</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full ${bar} rounded-full transition-all`} style={{width:`${Math.min(100,result.rate)}%`}} />
                      </div>
                    </div>
                    <div className={`${tag} border rounded-lg px-3 py-2.5 flex justify-between items-center`}>
                      <div>
                        <p className="text-xs opacity-70 font-bold">실질 월 부담</p>
                        <p className="text-xs text-green-600 font-bold mt-0.5">↓ {fmt(pb.baseCost-result.burden)}원 절감</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-2xl font-black font-mono ${num}`}>{fmt(Math.round(result.burden/10000))}<span className="text-sm font-bold">만원</span></p>
                        <p className="text-xs opacity-50 font-mono">{fmt(result.burden)}원</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            <Card title="시나리오 A vs B 비교" accent="slate">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left font-bold text-gray-400 pb-2">항목</th>
                    <th className="text-right font-bold text-violet-600 pb-2">A ({pb.scenarioA}대)</th>
                    <th className="text-right font-bold text-teal-600 pb-2">B ({pb.scenarioB}대)</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["발렛 총 매출", fmt(pbCalc.A.grossRev)+"원", fmt(pbCalc.B.grossRev)+"원"],
                    pb.vatIncluded ? ["부가세 차감", `-${fmt(pbCalc.A.vatAmt)}원`, `-${fmt(pbCalc.B.vatAmt)}원`] : null,
                    ["순 페이백",   fmt(pbCalc.A.netRev)+"원",   fmt(pbCalc.B.netRev)+"원"],
                    ["절감율",      pbCalc.A.rate.toFixed(1)+"%", pbCalc.B.rate.toFixed(1)+"%"],
                    ["실질 부담",   fmt(pbCalc.A.burden)+"원",   fmt(pbCalc.B.burden)+"원"],
                  ].filter(Boolean).map(([l,a,b]) => (
                    <tr key={l} className="border-b border-gray-50 last:border-0">
                      <td className="py-1.5 text-gray-400">{l}</td>
                      <td className="py-1.5 text-right font-mono font-bold text-violet-600">{a}</td>
                      <td className="py-1.5 text-right font-mono font-bold text-teal-600">{b}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-2 bg-green-50 border border-green-100 rounded-lg px-3 py-2 flex justify-between items-center">
                <span className="text-xs text-green-700 font-bold">두 시나리오 차이</span>
                <span className="text-xs font-black font-mono text-green-800">
                  {fmt(Math.abs(pbCalc.A.burden-pbCalc.B.burden))}원
                  {pbCalc.B.burden < pbCalc.A.burden ? " (B 유리)" : " (A 유리)"}
                </span>
              </div>
            </Card>

            <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 text-xs text-gray-400 leading-relaxed">
              <p className="font-bold text-gray-500 mb-1">페이백 계산 기준</p>
              <p>• 발렛 매출 = 발렛비 × 일 입차대수 × 월 운영일수</p>
              <p>• 부가세 자감 시: 매출 ÷ 1.1 (부가세 10% 제외)</p>
              <p>• 실질 부담 = 기본 견적금액 − 순 페이백 금액</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
