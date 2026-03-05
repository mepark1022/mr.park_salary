import { useState, useMemo } from "react";

const MIN_WAGE = 10320;
const WEEKS = 4.345;

function timeToMin(t) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}
function fmt(n) {
  return Math.round(n).toLocaleString("ko-KR");
}
function parseNum(s) {
  if (typeof s === "number") return s;
  const n = parseInt(String(s).replace(/[^0-9]/g, ""));
  return isNaN(n) ? 0 : n;
}

function NumberInput({ value, onChange, placeholder = "", className = "" }) {
  const num = parseNum(value);
  const display = num === 0 ? "" : num.toLocaleString("ko-KR");
  return (
    <input
      type="text"
      inputMode="numeric"
      value={display}
      placeholder={placeholder}
      onChange={e => onChange(e.target.value.replace(/[^0-9]/g, ""))}
      className={className}
    />
  );
}

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

function buildSched(days, start, end, brk) {
  const sm = timeToMin(start), em = timeToMin(end);
  const workH = Math.max(0, em - sm - brk) / 60;
  const e2 = em < sm ? em + 1440 : em;
  const ns = Math.max(sm, 22 * 60), ne = Math.min(e2, 30 * 60);
  const nightH = ns < ne ? (ne - ns) / 60 : 0;
  const weeklyH = workH * days;
  const hasWL = weeklyH >= 15;
  const monthlyBasicH = weeklyH * WEEKS;
  const monthlyWLH = hasWL && days > 0 ? (weeklyH / days) * WEEKS : 0;
  const monthlyNightH = nightH * days * WEEKS;
  const dailyOT = Math.max(0, workH - 8);
  const weeklyOT = Math.max(0, weeklyH - 40);
  const monthlyOTH = Math.max(dailyOT * days, weeklyOT) * WEEKS;
  return { workH, weeklyH, monthlyBasicH, monthlyWLH, monthlyNightH, monthlyOTH, hasWL };
}

function calcForRate(hrRate, sched, meal, dep) {
  if (hrRate <= 0) return null;
  const { monthlyBasicH, monthlyWLH, monthlyOTH, monthlyNightH } = sched;
  const mealNT = Math.min(meal, 200000);
  const basicPay = hrRate * monthlyBasicH;
  const wlPay = hrRate * monthlyWLH;
  const otPay = hrRate * 0.5 * monthlyOTH;
  const ntPay = hrRate * 0.5 * monthlyNightH;
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
  return { hrRate, gross, net, totDed, insE, insR, totCost, npR, hiR, ltR, eiR, wiR, npE, hiE, ltE, eiE, itax, ltax };
}

function reverseCalcHr(grossTarget, sched, meal) {
  const mealNT = Math.min(meal, 200000);
  const { monthlyBasicH, monthlyWLH, monthlyOTH, monthlyNightH } = sched;
  const div = monthlyBasicH + monthlyWLH + 0.5 * monthlyOTH + 0.5 * monthlyNightH;
  return div > 0 ? Math.max(0, (grossTarget - mealNT) / div) : 0;
}

function InsuranceCard({ r, count, label, isOrange }) {
  if (!r) return null;
  const accent = isOrange ? {
    border: "border-orange-300", bg: "bg-orange-50", header: "bg-orange-500",
    titleC: "text-orange-900", rateC: "text-orange-600", tagBg: "bg-orange-100 text-orange-700",
    sumBg: "bg-orange-500", rowHover: "hover:bg-orange-50",
  } : {
    border: "border-blue-300", bg: "bg-blue-50", header: "bg-blue-600",
    titleC: "text-blue-900", rateC: "text-blue-600", tagBg: "bg-blue-100 text-blue-700",
    sumBg: "bg-blue-600", rowHover: "hover:bg-blue-50",
  };

  return (
    <div className={`rounded-2xl border-2 overflow-hidden ${accent.border} ${accent.bg} flex flex-col`}>
      {/* 헤더 */}
      <div className={`${accent.header} text-white px-4 py-3 flex justify-between items-center`}>
        <div>
          <div className="text-sm font-black">{label}</div>
          <div className="text-xs opacity-75 mt-0.5">{count}명 재직 · 1인 기준</div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-black font-mono">{fmt(r.hrRate)}<span className="text-xs font-bold opacity-80">원/h</span></div>
          <div className="text-xs opacity-60">역산 시급</div>
        </div>
      </div>

      <div className="p-3 flex flex-col gap-2 flex-1">
        {/* 핵심 수치 2×2 */}
        <div className="grid grid-cols-2 gap-1.5">
          {[
            ["세전 월급", r.gross, isOrange ? "text-orange-700" : "text-blue-700"],
            ["💚 실수령액", r.net, "text-emerald-700"],
            ["🏢 사업주 보험", r.insR, "text-red-600"],
            ["1인 총 인건비", r.totCost, "text-purple-700"],
          ].map(([l, v, c]) => (
            <div key={l} className="bg-white rounded-xl p-2.5 text-center shadow-sm">
              <div className={`text-sm font-black font-mono leading-tight ${c}`}>{fmt(v)}<span className="text-xs">원</span></div>
              <div className="text-xs text-gray-400 mt-0.5 leading-tight">{l}</div>
            </div>
          ))}
        </div>

        {/* 사업주 4대보험 */}
        <div className="bg-white rounded-xl p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <span className="text-xs font-black text-gray-700">🏢 사업주 4대보험 명세</span>
          </div>
          <div className="space-y-1">
            {[
              ["국민연금", "4.75%", r.npR],
              ["건강보험", "3.595%", r.hiR],
              ["장기요양", "×13.14%", r.ltR],
              ["고용보험", "1.05%", r.eiR],
              ["산재보험", "1.47%", r.wiR],
            ].map(([name, rate, v]) => (
              <div key={name} className={`flex items-center justify-between text-xs px-1 py-0.5 rounded ${accent.rowHover}`}>
                <span className="text-gray-500 w-16 flex-shrink-0">{name}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-mono flex-shrink-0 ${accent.tagBg}`}>{rate}</span>
                <span className="font-mono font-bold text-red-500 text-right">{fmt(v)}원</span>
              </div>
            ))}
          </div>
          <div className="flex justify-between items-center text-xs font-black pt-2 mt-1.5 border-t-2 border-gray-100">
            <span className="text-gray-700">사업주 부담 합계</span>
            <span className="font-mono text-red-600">{fmt(r.insR)}원</span>
          </div>
        </div>

        {/* 근로자 공제 */}
        <div className="bg-white rounded-xl p-3">
          <div className="text-xs font-black text-gray-700 mb-1.5">👤 근로자 공제</div>
          <div className="space-y-1">
            {[["4대보험(근로자)", r.insE], ["소득세+지방세", r.itax + r.ltax]].map(([l, v]) => (
              <div key={l} className="flex justify-between text-xs">
                <span className="text-gray-400">{l}</span>
                <span className="font-mono font-bold text-gray-500">-{fmt(v)}원</span>
              </div>
            ))}
            <div className="flex justify-between text-xs font-bold pt-1 border-t border-gray-100">
              <span className="text-gray-600">공제 합계</span>
              <span className="font-mono text-gray-600">-{fmt(r.totDed)}원</span>
            </div>
          </div>
        </div>

        {/* N명 합산 */}
        {count > 1 && (
          <div className={`rounded-xl p-3 text-white text-center ${accent.sumBg}`}>
            <div className="text-xs opacity-80">{count}명 합산 월 총 인건비</div>
            <div className="text-lg font-black font-mono mt-0.5">{fmt(r.totCost * count)}원</div>
            <div className="text-xs opacity-70">사업주 보험 {fmt(r.insR * count)}원 포함</div>
          </div>
        )}
      </div>
    </div>
  );
}

function Counter({ value, onChange }) {
  const n = parseNum(value);
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => onChange(String(Math.max(1, n - 1)))}
        className="w-9 h-9 rounded-xl border-2 border-gray-200 text-xl font-bold text-gray-400 hover:border-blue-400 hover:text-blue-600 flex items-center justify-center bg-white transition-all">
        −
      </button>
      <NumberInput
        value={value}
        onChange={onChange}
        className="w-20 text-center py-2 border-2 border-gray-200 rounded-xl text-lg font-black font-mono bg-gray-50 focus:outline-none focus:border-blue-500"
      />
      <button
        onClick={() => onChange(String(n + 1))}
        className="w-9 h-9 rounded-xl border-2 border-gray-200 text-xl font-bold text-gray-400 hover:border-blue-400 hover:text-blue-600 flex items-center justify-center bg-white transition-all">
        +
      </button>
      <span className="text-sm font-bold text-gray-500">명</span>
    </div>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState("input");

  // Weekday
  const [wdDays, setWdDays] = useState(5);
  const [wdStart, setWdStart] = useState("09:00");
  const [wdEnd, setWdEnd] = useState("18:00");
  const [wdBreak, setWdBreak] = useState(60);
  const [wdCount, setWdCount] = useState("1");

  // Weekend
  const [hasWe, setHasWe] = useState(false);
  const [weDays, setWeDays] = useState(1);
  const [weSame, setWeSame] = useState(true);
  const [weStart, setWeStart] = useState("09:00");
  const [weEnd, setWeEnd] = useState("18:00");
  const [weBreak, setWeBreak] = useState(60);
  const [weCount, setWeCount] = useState("1");

  // Salary
  const [mode, setMode] = useState("monthly");
  const [hrStr, setHrStr] = useState("13000");
  const [moStr, setMoStr] = useState("2500000");

  // Other
  const [dep, setDep] = useState(1);
  const [mealStr, setMealStr] = useState("200000");

  const c = useMemo(() => {
    const meal = parseNum(mealStr);
    const wdN = Math.max(1, parseNum(wdCount));
    const weN = Math.max(1, parseNum(weCount));

    const wdS = buildSched(wdDays, wdStart, wdEnd, wdBreak);

    const hr = mode === "hourly"
      ? parseNum(hrStr)
      : reverseCalcHr(parseNum(moStr), wdS, meal);

    const wdR = calcForRate(hr, wdS, meal, dep);

    let weS = null, weR = null;
    if (hasWe && weDays > 0) {
      const s = weSame ? wdStart : weStart;
      const e = weSame ? wdEnd : weEnd;
      const b = weSame ? wdBreak : weBreak;
      weS = buildSched(weDays, s, e, b);
      weR = calcForRate(hr, weS, meal, dep);
    }

    const total = {
      gross: (wdR?.gross || 0) * wdN + (weR?.gross || 0) * weN,
      insR: (wdR?.insR || 0) * wdN + (weR?.insR || 0) * weN,
      net: (wdR?.net || 0) * wdN + (weR?.net || 0) * weN,
      totCost: (wdR?.totCost || 0) * wdN + (weR?.totCost || 0) * weN,
    };

    return { hr, wdS, wdR, wdN, weS, weR, weN, total, meal };
  }, [wdDays, wdStart, wdEnd, wdBreak, wdCount, hasWe, weDays, weSame, weStart, weEnd, weBreak, weCount, mode, hrStr, moStr, dep, mealStr]);

  const ic = "w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-blue-500 focus:bg-white transition-all";
  const timeC = "w-full px-2 py-2 border-2 border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-blue-500";
  const timeOC = "w-full px-2 py-2 border-2 border-orange-200 rounded-xl text-sm bg-orange-50 focus:outline-none focus:border-orange-500";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-blue-50 pb-10">

      {/* 헤더 */}
      <div className="bg-gradient-to-r from-blue-700 to-indigo-900 text-white px-5 py-5 shadow-xl">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-xl font-black tracking-tight">💼 2026 인건비 견적 계산기</h1>
          <p className="text-blue-200 text-xs mt-1">월급 입력 → 시급 역산 · 사업주 4대보험 · 평일/주말 직원 구분 · 최저임금 10,320원</p>
        </div>
      </div>

      {/* 탭 */}
      <div className="flex border-b border-gray-200 bg-white shadow-sm sticky top-0 z-20">
        {[["input", "⏰ 근무 입력"], ["result", "💰 견적 결과"]].map(([k, v]) => (
          <button key={k} onClick={() => setActiveTab(k)}
            className={`flex-1 py-3.5 text-sm font-bold transition-all ${activeTab === k ? "text-blue-700 bg-blue-50" : "text-gray-400 bg-white"}`}
            style={activeTab === k ? { borderBottom: "3px solid #1d4ed8" } : { borderBottom: "3px solid transparent" }}>
            {v}
          </button>
        ))}
      </div>

      <div className="max-w-7xl mx-auto px-4 pt-5 grid grid-cols-1 lg:grid-cols-[390px,1fr] gap-5 items-start">

        {/* ─── 입력 패널 ─── */}
        <div className={activeTab === "input" ? "block" : "hidden lg:block"}>

          {/* 급여 설정 */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-4">
            <h3 className="text-sm font-black text-blue-900 pb-2 mb-3 border-b-2 border-blue-500">💰 급여 설정</h3>
            <div className="flex gap-2 bg-gray-100 p-1 rounded-xl mb-3">
              {[["monthly", "💵 월급 입력 (역산)"], ["hourly", "⏱ 시급 직접 입력"]].map(([k, v]) => (
                <button key={k} onClick={() => setMode(k)}
                  className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all ${mode === k ? "bg-white text-blue-700 shadow-md" : "text-gray-500"}`}>
                  {v}
                </button>
              ))}
            </div>
            {mode === "monthly" ? (
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1.5">1인 월 기대급여 (세전)</label>
                <NumberInput value={moStr} onChange={setMoStr} placeholder="2,500,000"
                  className={`${ic} font-mono text-xl font-black text-right pr-10`} />
                <span className="block text-right text-xs text-gray-400 -mt-7 pr-3 pointer-events-none">원</span>
                <div className="mt-3">
                  {c.hr > 0 && c.hr < MIN_WAGE && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-600 font-bold">
                      ❌ 역산 시급 {fmt(c.hr)}원 — 2026 최저임금(10,320원) 위반!
                    </div>
                  )}
                  {c.hr > 0 && c.hr >= MIN_WAGE && (
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex justify-between items-center">
                      <span className="text-xs text-blue-600 font-bold">✅ 역산 시급</span>
                      <span className="text-lg font-black font-mono text-blue-700">{fmt(c.hr)}원/h</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1.5">시급 (원)</label>
                <NumberInput value={hrStr} onChange={setHrStr} placeholder="13,000"
                  className={`${ic} font-mono text-xl font-black text-right pr-10`} />
                <span className="block text-right text-xs text-gray-400 -mt-7 pr-3 pointer-events-none">원/h</span>
                {parseNum(hrStr) > 0 && parseNum(hrStr) < MIN_WAGE && (
                  <p className="text-xs text-red-500 mt-2 font-bold">❌ 2026 최저임금(10,320원) 위반!</p>
                )}
              </div>
            )}
          </div>

          {/* 평일 근무 */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-4">
            <h3 className="text-sm font-black text-blue-900 pb-2 mb-3 border-b-2 border-blue-500">
              📅 평일 근무 <span className="text-blue-400 text-xs font-normal">월~금</span>
            </h3>

            <div className="mb-3">
              <label className="block text-xs font-bold text-gray-400 mb-2">주 근무일수</label>
              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5].map(n => (
                  <button key={n} onClick={() => setWdDays(n)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-bold border-2 transition-all ${wdDays === n ? "bg-blue-600 border-blue-600 text-white shadow-md" : "bg-white border-gray-200 text-gray-500 hover:border-blue-300"}`}>
                    {n}일
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-3">
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1">출근</label>
                <input type="time" value={wdStart} onChange={e => setWdStart(e.target.value)} className={timeC} />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1">퇴근</label>
                <input type="time" value={wdEnd} onChange={e => setWdEnd(e.target.value)} className={timeC} />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1">휴게(분)</label>
                <input type="number" value={wdBreak} min={0} max={480} step={30}
                  onChange={e => setWdBreak(parseInt(e.target.value) || 0)} className={timeC} />
              </div>
            </div>

            <div className="mb-3">
              <label className="block text-xs font-bold text-gray-400 mb-2">평일 직원 수</label>
              <Counter value={wdCount} onChange={setWdCount} />
            </div>

            <div className="bg-blue-50 rounded-xl p-3 text-xs flex flex-wrap gap-x-3 gap-y-1">
              <span className="text-blue-700 font-bold">일 {c.wdS.workH.toFixed(1)}h</span>
              <span className="text-blue-500">주 {c.wdS.weeklyH.toFixed(1)}h</span>
              <span className="text-blue-500">월 기본 {c.wdS.monthlyBasicH.toFixed(1)}h</span>
              {c.wdS.hasWL && <span className="text-emerald-600 font-bold">주휴 {c.wdS.monthlyWLH.toFixed(1)}h</span>}
              {c.wdS.monthlyOTH > 0 && <span className="text-orange-600 font-bold">연장 {c.wdS.monthlyOTH.toFixed(1)}h</span>}
            </div>
          </div>

          {/* 주말 근무 */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-4">
            <div className="flex items-center justify-between pb-2 mb-3 border-b-2 border-orange-400">
              <h3 className="text-sm font-black text-orange-700">
                🌅 주말 근무 <span className="text-orange-400 text-xs font-normal">토·일</span>
              </h3>
              <button onClick={() => setHasWe(!hasWe)}
                className={`w-12 h-6 rounded-full transition-all relative flex-shrink-0 ${hasWe ? "bg-orange-500" : "bg-gray-300"}`}>
                <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all shadow ${hasWe ? "left-7" : "left-1"}`} />
              </button>
            </div>

            {!hasWe ? (
              <p className="text-xs text-gray-400 text-center py-3">주말 근무 없음 — 토글로 활성화</p>
            ) : (
              <>
                <div className="flex gap-2 mb-3">
                  {[["토요일 (1일)", 1], ["토+일 (2일)", 2]].map(([l, n]) => (
                    <button key={n} onClick={() => setWeDays(n)}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-bold border-2 transition-all ${weDays === n ? "bg-orange-500 border-orange-500 text-white shadow-md" : "bg-white border-gray-200 text-gray-500 hover:border-orange-300"}`}>
                      {l}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-3 bg-orange-50 rounded-xl p-3 mb-3">
                  <button onClick={() => setWeSame(!weSame)}
                    className={`w-10 h-5 rounded-full transition-all relative flex-shrink-0 ${weSame ? "bg-orange-500" : "bg-gray-300"}`}>
                    <div className={`w-3.5 h-3.5 bg-white rounded-full absolute top-0.5 transition-all shadow ${weSame ? "left-5" : "left-0.5"}`} />
                  </button>
                  <span className="text-xs font-bold text-orange-700">평일과 동일한 근무시간 적용</span>
                </div>

                {!weSame && (
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-400 mb-1">출근</label>
                      <input type="time" value={weStart} onChange={e => setWeStart(e.target.value)} className={timeOC} />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-400 mb-1">퇴근</label>
                      <input type="time" value={weEnd} onChange={e => setWeEnd(e.target.value)} className={timeOC} />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-400 mb-1">휴게(분)</label>
                      <input type="number" value={weBreak} min={0} max={480} step={30}
                        onChange={e => setWeBreak(parseInt(e.target.value) || 0)} className={timeOC} />
                    </div>
                  </div>
                )}

                <div className="mb-3">
                  <label className="block text-xs font-bold text-gray-400 mb-2">주말 직원 수</label>
                  <Counter value={weCount} onChange={setWeCount} />
                </div>

                {c.weS && (
                  <div className="bg-orange-50 rounded-xl p-3 text-xs flex flex-wrap gap-x-3 gap-y-1">
                    <span className="text-orange-700 font-bold">일 {c.weS.workH.toFixed(1)}h</span>
                    <span className="text-orange-500">주 {c.weS.weeklyH.toFixed(1)}h</span>
                    <span className="text-orange-500">월 기본 {c.weS.monthlyBasicH.toFixed(1)}h</span>
                    {c.weS.hasWL && <span className="text-emerald-600 font-bold">주휴 {c.weS.monthlyWLH.toFixed(1)}h</span>}
                  </div>
                )}
              </>
            )}
          </div>

          {/* 기타 */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-4">
            <h3 className="text-sm font-black text-blue-900 pb-2 mb-3 border-b-2 border-blue-500">⚙️ 기타</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1">식대 비과세</label>
                <NumberInput value={mealStr} onChange={setMealStr} className={ic} />
                <p className="text-xs text-gray-400 mt-1">최대 200,000원</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1">부양가족</label>
                <select value={dep} onChange={e => setDep(parseInt(e.target.value))} className={ic}>
                  {[1, 2, 3, 4, 5, 6, 7].map(n => (
                    <option key={n} value={n}>{n}명{n === 1 ? " (본인만)" : ""}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* ─── 결과 패널 ─── */}
        <div className={activeTab === "result" ? "block" : "hidden lg:block"}>

          {/* 카드 가로 배치 */}
          <div className={`grid gap-4 mb-4 ${hasWe && c.weR ? "grid-cols-1 xl:grid-cols-2" : "grid-cols-1"}`}>
            <InsuranceCard
              r={c.wdR}
              count={c.wdN}
              label={`📅 평일 직원 · 주 ${wdDays}일`}
              isOrange={false}
            />
            {hasWe && c.weR && (
              <InsuranceCard
                r={c.weR}
                count={c.weN}
                label={`🌅 주말 직원 · 주 ${weDays}일`}
                isOrange={true}
              />
            )}
          </div>

          {/* 전체 합산 (주말 있을 때) */}
          {hasWe && c.weR && (
            <div className="bg-gradient-to-br from-slate-700 to-slate-900 text-white rounded-2xl p-4 mb-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-sm font-black">📊 전체 합산</h3>
                  <p className="text-xs text-slate-400 mt-0.5">평일 {c.wdN}명 + 주말 {c.weN}명 = 총 {c.wdN + c.weN}명</p>
                </div>
              </div>
              <div className="grid grid-cols-2 xl:grid-cols-4 gap-2">
                {[
                  ["💼 월 총 인건비", c.total.totCost, "text-yellow-300"],
                  ["🏢 사업주 보험", c.total.insR, "text-red-300"],
                  ["💚 총 실수령액", c.total.net, "text-green-300"],
                  ["📋 총 지급(세전)", c.total.gross, "text-blue-300"],
                ].map(([l, v, col]) => (
                  <div key={l} className="bg-white bg-opacity-10 rounded-xl p-3 text-center">
                    <div className={`text-sm font-black font-mono ${col}`}>{fmt(v)}<span className="text-xs">원</span></div>
                    <div className="text-slate-300 text-xs mt-0.5">{l}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 법적 기준 */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs text-gray-400 leading-loose">
            <p className="font-bold text-gray-600 mb-1">📌 2026년 법적 기준</p>
            <p>• 최저임금 <strong className="text-gray-700">10,320원</strong> / 최저월급 2,156,880원 (209h)</p>
            <p>• 국민연금 9.5% (각 4.75%) · 건강보험 7.19% · 장기요양 13.14%</p>
            <p>• 연장(1일 8h·주 40h 초과) ×1.5 / 야간(22~06시) ×0.5 가산</p>
            <p>• 소득세는 간이세액표 기준 추정치 · 정확한 처리는 노무사 확인 권장</p>
          </div>
        </div>

      </div>
    </div>
  );
}
