import { useState, useMemo } from "react";

const DAYS = ["월", "화", "수", "목", "금", "토", "일"];
const MIN_WAGE = 10320;
const WEEKS = 4.345;

function timeToMin(t) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}
function fmt(n) {
  return Math.round(n).toLocaleString("ko-KR");
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
  return {
    hrRate, basicPay, wlPay, otPay, ntPay, mealNT, gross,
    npE, hiE, ltE, eiE, insE, itax, ltax, totDed, net,
    npR, hiR, ltR, eiR, wiR, insR, totCost, hrCost,
  };
}

export default function App() {
  const [scheduleMode, setScheduleMode] = useState("simple");
  const [simple, setSimple] = useState({ start: "09:00", end: "18:00", breakMin: 60, daysPerWeek: 5 });
  const [weekly, setWeekly] = useState(DAYS.map((_, i) => defaultDay(i < 5)));
  const [hrMode, setHrMode] = useState("both");
  const [customHr, setCustomHr] = useState(13000);
  const [dep, setDep] = useState(1);
  const [meal, setMeal] = useState(200000);
  const [activeTab, setActiveTab] = useState("input");

  // 페이백 시뮬레이션 상태
  const [pb, setPb] = useState({
    baseCost: 6266667,       // 기본 견적 총계
    valetFee: 2000,          // 발렛비/대
    workDays: 10,            // 월 운영일수
    vatIncluded: true,       // 매출에 부가세 포함 여부
    scenarioA: 50,           // 시나리오A: 일 입차대수
    scenarioB: 70,           // 시나리오B: 일 입차대수
  });

  const pbCalc = useMemo(() => {
    const calc = (dailyCars) => {
      const grossRevenue = pb.valetFee * dailyCars * pb.workDays;
      const netRevenue = pb.vatIncluded ? Math.round(grossRevenue / 1.1) : grossRevenue;
      const vatAmount = grossRevenue - netRevenue;
      const actualBurden = Math.max(0, pb.baseCost - netRevenue);
      const reductionRate = pb.baseCost > 0 ? (netRevenue / pb.baseCost) * 100 : 0;
      return { dailyCars, grossRevenue, netRevenue, vatAmount, actualBurden, reductionRate };
    };
    return {
      A: calc(pb.scenarioA),
      B: calc(pb.scenarioB),
    };
  }, [pb]);

  const calc = useMemo(() => {
    let dailyWorkH = 0, weeklyWorkH = 0, nightHperWeek = 0, workingDays = 0;

    if (scheduleMode === "simple") {
      const sm = timeToMin(simple.start);
      const em = timeToMin(simple.end);
      const actualM = Math.max(0, em - sm - simple.breakMin);
      dailyWorkH = actualM / 60;
      workingDays = simple.daysPerWeek;
      weeklyWorkH = dailyWorkH * workingDays;
      const e2 = em < sm ? em + 1440 : em;
      const ns = Math.max(sm, 22 * 60), ne = Math.min(e2, 30 * 60);
      const nightPerDay = ns < ne ? (ne - ns) / 60 : 0;
      nightHperWeek = nightPerDay * workingDays;
    } else {
      weekly.forEach((d) => {
        if (!d.work) return;
        const sm = timeToMin(d.start), em = timeToMin(d.end);
        const actual = Math.max(0, em - sm - d.breakMin) / 60;
        weeklyWorkH += actual;
        workingDays++;
        const e2 = em < sm ? em + 1440 : em;
        const ns = Math.max(sm, 22 * 60), ne = Math.min(e2, 30 * 60);
        nightHperWeek += ns < ne ? (ne - ns) / 60 : 0;
      });
      dailyWorkH = workingDays > 0 ? weeklyWorkH / workingDays : 0;
    }

    const hasWL = weeklyWorkH >= 15;
    const wlHperWeek = hasWL ? (workingDays > 0 ? weeklyWorkH / workingDays : 0) : 0;

    const monthlyBasicH = weeklyWorkH * WEEKS;
    const monthlyWLH = wlHperWeek * WEEKS;
    const monthlyNightH = nightHperWeek * WEEKS;

    // 연장근무: 일 8h 초과 or 주 40h 초과
    const dailyOT = Math.max(0, dailyWorkH - 8);
    const weeklyOT = Math.max(0, weeklyWorkH - 40);
    const monthlyOTH = Math.max(dailyOT * workingDays, weeklyOT) * WEEKS;

    const minResult = calcForRate(MIN_WAGE, monthlyBasicH, monthlyWLH, monthlyOTH, monthlyNightH, meal, dep);
    const customResult = calcForRate(customHr, monthlyBasicH, monthlyWLH, monthlyOTH, monthlyNightH, meal, dep);

    return {
      dailyWorkH, weeklyWorkH, monthlyBasicH, monthlyWLH, monthlyOTH, monthlyNightH,
      hasWL, workingDays, minResult, customResult,
    };
  }, [scheduleMode, simple, weekly, customHr, dep, meal]);

  const TimeInput = ({ label, value, onChange }) => (
    <div>
      <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">{label}</label>
      <input type="time" value={value} onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-blue-500 focus:bg-white transition-all" />
    </div>
  );

  const ResultBlock = ({ r, label, accent }) => {
    const isMW = accent === "green";
    return (
      <div className={`rounded-2xl border-2 p-4 mb-4 ${isMW ? "border-emerald-300 bg-emerald-50" : "border-blue-300 bg-blue-50"}`}>
        {/* 타이틀 + 시급 */}
        <div className="flex justify-between items-center mb-3">
          <span className={`text-sm font-black ${isMW ? "text-emerald-800" : "text-blue-800"}`}>{label}</span>
          <div className={`text-right`}>
            <div className={`text-xl font-black font-mono ${isMW ? "text-emerald-700" : "text-blue-700"}`}>
              {fmt(r.hrRate)}<span className="text-sm font-bold">원/h</span>
            </div>
            <div className="text-xs text-gray-400">시급</div>
          </div>
        </div>

        {/* 핵심 4박스 */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          {[
            ["총 지급액(세전)", r.gross, isMW ? "text-emerald-700" : "text-blue-700"],
            ["💚 실수령액", r.net, "text-green-700"],
            ["공제액 합계", r.totDed, "text-red-600"],
            ["사업주 총비용", r.totCost, "text-orange-600"],
          ].map(([l, v, color]) => (
            <div key={l} className="bg-white rounded-xl p-3 text-center shadow-sm">
              <div className={`text-base font-black font-mono ${color}`}>{fmt(v)}<span className="text-xs">원</span></div>
              <div className="text-xs text-gray-400 mt-0.5">{l}</div>
            </div>
          ))}
        </div>

        {/* 공제 상세 */}
        <div className="bg-white rounded-xl p-3 mb-2">
          <div className="text-xs font-bold text-gray-500 mb-2">근로자 공제 상세</div>
          <div className="space-y-1.5">
            {[
              ["국민연금(4.75%)", r.npE],
              ["건강보험(3.595%)", r.hiE],
              ["장기요양(×13.14%)", r.ltE],
              ["고용보험(0.9%)", r.eiE],
              ["소득세+지방세", r.itax + r.ltax],
            ].map(([l, v]) => (
              <div key={l} className="flex justify-between text-xs">
                <span className="text-gray-400">{l}</span>
                <span className="font-mono font-bold text-red-500">-{fmt(v)}원</span>
              </div>
            ))}
            <div className="border-t pt-1.5 flex justify-between text-xs font-bold">
              <span className="text-gray-600">사업주 부담 보험</span>
              <span className="font-mono text-orange-500">+{fmt(r.insR)}원</span>
            </div>
          </div>
        </div>

        {/* 시간당 인건비 */}
        <div className={`text-center py-2.5 rounded-xl text-sm font-black ${isMW ? "bg-emerald-100 text-emerald-800" : "bg-blue-100 text-blue-800"}`}>
          💼 시간당 실질 인건비 <span className="font-mono">{fmt(r.hrCost)}원/h</span>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-blue-50 pb-8">
      {/* 헤더 */}
      <div className="bg-gradient-to-r from-blue-700 to-indigo-900 text-white px-5 py-5 shadow-xl">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-xl font-black tracking-tight">💼 2026 인건비 견적 계산기</h1>
          <p className="text-blue-200 text-xs mt-1">근무시간 입력 → 시급·월급 자동 계산 · 최저임금 10,320원 기준</p>
        </div>
      </div>

      {/* 모바일 탭 */}
      <div className="flex border-b border-gray-200 bg-white shadow-sm sticky top-0 z-20">
        {[["input", "⏰ 근무 입력"], ["result", "💰 견적 결과"], ["payback", "🅿️ 페이백 시뮬"]].map(([k, v]) => (
          <button key={k} onClick={() => setActiveTab(k)}
            className={`flex-1 py-3.5 text-xs font-bold transition-all ${activeTab === k ? "text-blue-700 bg-blue-50" : "text-gray-400 bg-white"}`}
            style={activeTab === k ? { borderBottom: "3px solid #1d4ed8" } : { borderBottom: "3px solid transparent" }}>
            {v}
          </button>
        ))}
      </div>

      {/* ── 페이백 시뮬레이션 패널 (전체 너비) ── */}
      {activeTab === "payback" && (
        <div className="max-w-4xl mx-auto px-4 pt-5">

          {/* 페이백 개념 설명 */}
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-2xl p-4 mb-4 shadow-lg">
            <div className="flex items-start gap-3">
              <div className="text-3xl">💡</div>
              <div>
                <h2 className="font-black text-base mb-1">페이백(Payback) 제도란?</h2>
                <p className="text-amber-100 text-xs leading-relaxed">
                  발렛파킹 서비스 운영 시 고객에게 받은 <strong className="text-white">발렛비(주차요금)를 운영비에서 차감</strong>하여
                  실질 부담을 낮추는 구조입니다. 단, 부가세(10%)는 자감 후 정산됩니다.
                </p>
              </div>
            </div>
          </div>

          {/* 공통 설정 */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-4">
            <h3 className="text-sm font-black text-blue-900 pb-2 mb-3 border-b-2 border-amber-400">⚙️ 페이백 기준 설정</h3>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">기본 견적 총계 (원)</label>
                <input type="number" value={pb.baseCost} step={10000}
                  onChange={e => setPb(p => ({ ...p, baseCost: parseInt(e.target.value) || 0 }))}
                  className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-amber-400 font-mono font-bold" />
                <p className="text-xs text-gray-400 mt-1">인건비+운영지원금+보험료 합계</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">발렛비 / 대 (원)</label>
                <input type="number" value={pb.valetFee} step={500} min={0}
                  onChange={e => setPb(p => ({ ...p, valetFee: parseInt(e.target.value) || 0 }))}
                  className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-amber-400 font-mono font-bold" />
                <p className="text-xs text-gray-400 mt-1">고객 1대당 청구 금액</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">월 운영일수 (일)</label>
                <input type="number" value={pb.workDays} min={1} max={31} step={1}
                  onChange={e => setPb(p => ({ ...p, workDays: parseInt(e.target.value) || 1 }))}
                  className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-amber-400 font-mono font-bold" />
                <p className="text-xs text-gray-400 mt-1">예: 주말만 운영 = 8~10일</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">부가세 처리</label>
                <button onClick={() => setPb(p => ({ ...p, vatIncluded: !p.vatIncluded }))}
                  className={`w-full py-2.5 rounded-xl text-sm font-bold border-2 transition-all ${pb.vatIncluded ? "bg-amber-50 border-amber-400 text-amber-700" : "bg-gray-50 border-gray-200 text-gray-500"}`}>
                  {pb.vatIncluded ? "✅ 부가세 자감 적용" : "❌ 부가세 자감 미적용"}
                </button>
                <p className="text-xs text-gray-400 mt-1">발렛매출 ÷ 1.1 후 차감</p>
              </div>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
              💡 <strong>기준 월 부담</strong>: 페이백 없을 때 <span className="font-mono font-black text-amber-900">{fmt(pb.baseCost)}원</span>
            </div>
          </div>

          {/* 시나리오 2개 사이드바 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {[
              { key: "A", label: "시나리오 A", color: "violet", cars: pb.scenarioA, setCars: v => setPb(p => ({ ...p, scenarioA: v })), result: pbCalc.A },
              { key: "B", label: "시나리오 B", color: "teal", cars: pb.scenarioB, setCars: v => setPb(p => ({ ...p, scenarioB: v })), result: pbCalc.B },
            ].map(({ key, label, color, cars, setCars, result }) => {
              const isViolet = color === "violet";
              const bg = isViolet ? "bg-violet-50" : "bg-teal-50";
              const border = isViolet ? "border-violet-300" : "border-teal-300";
              const titleColor = isViolet ? "text-violet-800" : "text-teal-800";
              const accentBg = isViolet ? "bg-violet-600" : "bg-teal-600";
              const accentText = isViolet ? "text-violet-700" : "text-teal-700";
              const summaryBg = isViolet ? "bg-violet-100" : "bg-teal-100";
              const barColor = isViolet ? "bg-violet-400" : "bg-teal-400";
              return (
                <div key={key} className={`rounded-2xl border-2 ${border} ${bg} p-4`}>
                  {/* 헤더 */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className={`${accentBg} text-white text-xs font-black px-2.5 py-1 rounded-lg`}>{label}</div>
                      <span className={`text-sm font-black ${titleColor}`}>일 입차 {cars}대</span>
                    </div>
                    <div className={`text-xs ${accentText} font-bold bg-white rounded-lg px-2 py-1 border`}>
                      월 {fmt(pb.workDays)}일 운영
                    </div>
                  </div>

                  {/* 일 입차대수 입력 */}
                  <div className="bg-white rounded-xl p-3 mb-3 border border-gray-100">
                    <label className="block text-xs font-bold text-gray-400 mb-2">📦 일 예상 입차대수 (대)</label>
                    <input type="number" value={cars} min={1} step={5}
                      onChange={e => setCars(parseInt(e.target.value) || 1)}
                      className={`w-full px-3 py-2.5 border-2 rounded-xl text-xl font-black font-mono text-center focus:outline-none ${isViolet ? "border-violet-200 focus:border-violet-400" : "border-teal-200 focus:border-teal-400"}`} />
                    <div className="flex gap-2 mt-2">
                      {[30, 50, 70, 100].map(n => (
                        <button key={n} onClick={() => setCars(n)}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all ${cars === n ? `${accentBg} text-white border-transparent` : "bg-white border-gray-200 text-gray-500"}`}>
                          {n}대
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 계산 흐름 */}
                  <div className="space-y-2 mb-3">
                    {[
                      ["발렛 총 매출", `${fmt(result.grossRevenue)}원`, false],
                      pb.vatIncluded ? ["부가세 차감 (÷1.1)", `-${fmt(result.vatAmount)}원`, true] : null,
                      ["순 페이백 금액", `${fmt(result.netRevenue)}원`, false],
                    ].filter(Boolean).map(([l, v, red]) => (
                      <div key={l} className="flex justify-between items-center bg-white rounded-xl px-3 py-2 text-xs border border-gray-100">
                        <span className="text-gray-500 font-medium">{l}</span>
                        <span className={`font-mono font-black ${red ? "text-red-500" : accentText}`}>{v}</span>
                      </div>
                    ))}
                  </div>

                  {/* 절감율 바 */}
                  <div className="bg-white rounded-xl p-3 mb-3 border border-gray-100">
                    <div className="flex justify-between text-xs text-gray-400 mb-1.5">
                      <span className="font-bold">비용 절감율</span>
                      <span className="font-mono font-black text-green-600">{result.reductionRate.toFixed(1)}%</span>
                    </div>
                    <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full ${barColor} rounded-full transition-all`}
                        style={{ width: `${Math.min(100, result.reductionRate)}%` }} />
                    </div>
                  </div>

                  {/* 실질 월 부담 */}
                  <div className={`${summaryBg} rounded-xl p-3 text-center`}>
                    <div className="text-xs text-gray-500 mb-1">💼 실질 월 부담 예상 운영비용</div>
                    <div className={`text-2xl font-black font-mono ${titleColor}`}>
                      {fmt(Math.round(result.actualBurden / 10000))}만원
                    </div>
                    <div className="text-xs text-gray-400 mt-1 font-mono">{fmt(result.actualBurden)}원</div>
                    <div className="text-xs text-green-600 font-bold mt-1.5">
                      ↓ {fmt(pb.baseCost - result.actualBurden)}원 절감
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 시나리오 비교 요약 */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-4">
            <h3 className="text-sm font-black text-blue-900 pb-2 mb-3 border-b-2 border-amber-400">📊 두 시나리오 비교</h3>
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50">
                  <td className="p-2.5 font-bold text-gray-400 rounded-l-xl">항목</td>
                  <td className="p-2.5 font-bold text-violet-700 text-right">시나리오 A ({pb.scenarioA}대/일)</td>
                  <td className="p-2.5 font-bold text-teal-700 text-right rounded-r-xl">시나리오 B ({pb.scenarioB}대/일)</td>
                </tr>
              </thead>
              <tbody>
                {[
                  ["발렛 총 매출", fmt(pbCalc.A.grossRevenue) + "원", fmt(pbCalc.B.grossRevenue) + "원"],
                  pb.vatIncluded ? ["부가세 차감", `-${fmt(pbCalc.A.vatAmount)}원`, `-${fmt(pbCalc.B.vatAmount)}원`] : null,
                  ["순 페이백", fmt(pbCalc.A.netRevenue) + "원", fmt(pbCalc.B.netRevenue) + "원"],
                  ["절감율", pbCalc.A.reductionRate.toFixed(1) + "%", pbCalc.B.reductionRate.toFixed(1) + "%"],
                  ["실질 월 부담", fmt(pbCalc.A.actualBurden) + "원", fmt(pbCalc.B.actualBurden) + "원"],
                ].filter(Boolean).map(([l, a, b]) => (
                  <tr key={l} className="border-t border-gray-50">
                    <td className="p-2.5 text-gray-400">{l}</td>
                    <td className="p-2.5 font-mono font-bold text-violet-700 text-right">{a}</td>
                    <td className="p-2.5 font-mono font-bold text-teal-700 text-right">{b}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-3 bg-green-50 border border-green-200 rounded-xl p-3 text-xs text-green-800 font-medium">
              📈 두 시나리오 차이:&nbsp;
              <span className="font-black text-green-900">
                {fmt(Math.abs(pbCalc.A.actualBurden - pbCalc.B.actualBurden))}원
                {pbCalc.B.actualBurden < pbCalc.A.actualBurden ? " (B가 더 절감)" : " (A가 더 절감)"}
              </span>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs text-gray-400 leading-loose">
            <p className="font-bold text-gray-600 mb-1">📌 페이백 계산 기준</p>
            <p>• 발렛 매출 = 발렛비 × 일 입차대수 × 월 운영일수</p>
            <p>• 부가세 자감 적용 시: 매출 ÷ 1.1 (부가세 10% 제외 후 정산)</p>
            <p>• 실질 부담 = 기본 견적금액 − 순 페이백 금액</p>
            <p>• 카드결제 진행 시 부가세는 당사 자감이유로 처리</p>
          </div>
        </div>
      )}

      {activeTab !== "payback" && <div className="max-w-4xl mx-auto px-4 pt-5 grid grid-cols-1 md:grid-cols-2 gap-4 items-start">

        {/* ── 입력 패널 ── */}
        <div className={activeTab === "input" ? "block" : "hidden md:block"}>

          {/* 스케줄 모드 */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-4">
            <h3 className="text-sm font-black text-blue-900 pb-2 mb-3 border-b-2 border-blue-500">⏰ 실제 근무 시간 입력</h3>
            <div className="flex gap-2 bg-gray-100 p-1 rounded-xl mb-4">
              {[["simple", "📅 일괄(전 요일 동일)"], ["weekly", "🗓 요일별 개별 설정"]].map(([k, v]) => (
                <button key={k} onClick={() => setScheduleMode(k)}
                  className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all ${scheduleMode === k ? "bg-white text-blue-700 shadow-md" : "text-gray-500"}`}>
                  {v}
                </button>
              ))}
            </div>

            {scheduleMode === "simple" ? (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <TimeInput label="출근" value={simple.start} onChange={v => setSimple(p => ({ ...p, start: v }))} />
                  <TimeInput label="퇴근" value={simple.end} onChange={v => setSimple(p => ({ ...p, end: v }))} />
                  <div>
                    <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">휴게(분)</label>
                    <input type="number" value={simple.breakMin} min={0} max={480} step={30}
                      onChange={e => setSimple(p => ({ ...p, breakMin: parseInt(e.target.value) || 0 }))}
                      className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-blue-500" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">주 근무일수</label>
                  <div className="grid grid-cols-4 gap-2">
                    {[5, 6, 7].map(n => (
                      <button key={n} onClick={() => setSimple(p => ({ ...p, daysPerWeek: n }))}
                        className={`py-2.5 rounded-xl text-sm font-bold border-2 transition-all ${simple.daysPerWeek === n ? "bg-blue-600 border-blue-600 text-white shadow-md" : "bg-white border-gray-200 text-gray-500 hover:border-blue-300"}`}>
                        주 {n}일
                      </button>
                    ))}
                    <div className="relative">
                      <input type="number" value={simple.daysPerWeek} min={1} max={7}
                        onChange={e => setSimple(p => ({ ...p, daysPerWeek: parseInt(e.target.value) || 5 }))}
                        className="w-full py-2.5 border-2 border-gray-200 rounded-xl text-sm text-center bg-gray-50 focus:outline-none focus:border-blue-500" />
                      <span className="absolute right-2 top-2.5 text-xs text-gray-400">일</span>
                    </div>
                  </div>
                </div>

                {/* 실시간 미리보기 */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-blue-600 font-bold">⚡ 일 실근무시간</span>
                    <span className="text-blue-900 font-black font-mono text-lg">
                      {Math.max(0, (timeToMin(simple.end) - timeToMin(simple.start) - simple.breakMin) / 60).toFixed(1)}시간
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {DAYS.map((day, i) => (
                  <div key={day} className={`rounded-xl border-2 p-3 transition-all ${weekly[i].work ? "border-blue-200 bg-blue-50" : "border-gray-100 bg-gray-50"}`}>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setWeekly(w => w.map((d, j) => j === i ? { ...d, work: !d.work } : d))}
                        className={`w-11 h-6 rounded-full transition-all relative flex-shrink-0 ${weekly[i].work ? "bg-blue-600" : "bg-gray-300"}`}>
                        <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all shadow ${weekly[i].work ? "left-6" : "left-1"}`} />
                      </button>
                      <span className={`w-5 text-sm font-black flex-shrink-0 ${i >= 5 ? "text-red-500" : "text-gray-700"}`}>{day}</span>
                      {weekly[i].work ? (
                        <div className="flex gap-1.5 flex-1 items-center">
                          <input type="time" value={weekly[i].start}
                            onChange={e => setWeekly(w => w.map((d, j) => j === i ? { ...d, start: e.target.value } : d))}
                            className="flex-1 px-2 py-1.5 border border-blue-200 rounded-lg text-xs bg-white focus:outline-none focus:border-blue-500" />
                          <span className="text-gray-300 text-xs">~</span>
                          <input type="time" value={weekly[i].end}
                            onChange={e => setWeekly(w => w.map((d, j) => j === i ? { ...d, end: e.target.value } : d))}
                            className="flex-1 px-2 py-1.5 border border-blue-200 rounded-lg text-xs bg-white focus:outline-none focus:border-blue-500" />
                          <input type="number" value={weekly[i].breakMin} min={0} step={30}
                            onChange={e => setWeekly(w => w.map((d, j) => j === i ? { ...d, breakMin: parseInt(e.target.value) || 0 } : d))}
                            className="w-14 px-1.5 py-1.5 border border-blue-200 rounded-lg text-xs text-center bg-white focus:outline-none focus:border-blue-500" />
                          <span className="text-xs text-gray-400 flex-shrink-0">분</span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 ml-1">휴무</span>
                      )}
                    </div>
                    {weekly[i].work && (
                      <div className="mt-1.5 ml-14 text-xs text-blue-500 font-semibold">
                        실근무 {Math.max(0, (timeToMin(weekly[i].end) - timeToMin(weekly[i].start) - weekly[i].breakMin) / 60).toFixed(1)}시간
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 시급 기준 */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-4">
            <h3 className="text-sm font-black text-blue-900 pb-2 mb-3 border-b-2 border-blue-500">💰 시급 기준 설정</h3>
            <div className="flex gap-2 bg-gray-100 p-1 rounded-xl mb-3">
              {[["min", "최저임금만"], ["custom", "직접 입력"], ["both", "둘 다 비교"]].map(([k, v]) => (
                <button key={k} onClick={() => setHrMode(k)}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${hrMode === k ? "bg-white text-blue-700 shadow-md" : "text-gray-500"}`}>
                  {v}
                </button>
              ))}
            </div>
            {(hrMode === "custom" || hrMode === "both") && (
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">설정 시급 (원)</label>
                <input type="number" value={customHr} min={MIN_WAGE} step={100}
                  onChange={e => setCustomHr(parseInt(e.target.value) || MIN_WAGE)}
                  className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-blue-500 font-mono text-lg font-bold" />
                {customHr < MIN_WAGE && <p className="text-xs text-red-500 mt-1 font-bold">❌ 2026 최저임금(10,320원) 위반!</p>}
              </div>
            )}
          </div>

          {/* 기타 설정 */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-4">
            <h3 className="text-sm font-black text-blue-900 pb-2 mb-3 border-b-2 border-blue-500">⚙️ 기타</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">식대 비과세</label>
                <input type="number" value={meal} step={10000} max={200000}
                  onChange={e => setMeal(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-blue-500" />
                <p className="text-xs text-gray-400 mt-1">최대 200,000원</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">부양가족</label>
                <select value={dep} onChange={e => setDep(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-blue-500">
                  {[1, 2, 3, 4, 5, 6, 7].map(n => <option key={n} value={n}>{n}명{n === 1 ? " (본인만)" : ""}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* 근무시간 분석 요약 */}
          <div className="bg-gradient-to-br from-slate-700 to-slate-900 text-white rounded-2xl p-4">
            <h3 className="text-sm font-black mb-3 flex items-center gap-2">📊 근무시간 분석 <span className="text-xs text-slate-400 font-normal">(자동 계산)</span></h3>
            <div className="grid grid-cols-3 gap-2 text-xs">
              {[
                ["일 실근무", `${calc.dailyWorkH.toFixed(1)}h`],
                ["주 실근무", `${calc.weeklyWorkH.toFixed(1)}h`],
                ["월 기본시간", `${calc.monthlyBasicH.toFixed(1)}h`],
                ["월 주휴시간", calc.hasWL ? `${calc.monthlyWLH.toFixed(1)}h` : "미해당"],
                ["월 연장시간", `${calc.monthlyOTH.toFixed(1)}h`],
                ["월 야간시간", `${calc.monthlyNightH.toFixed(1)}h`],
              ].map(([l, v]) => (
                <div key={l} className="bg-white bg-opacity-10 rounded-xl p-2 text-center">
                  <div className="font-black text-base">{v}</div>
                  <div className="text-slate-300 mt-0.5 text-xs">{l}</div>
                </div>
              ))}
            </div>
            <div className="mt-3 space-y-1 text-xs">
              {!calc.hasWL && <p className="text-yellow-300">⚠️ 주 15시간 미만 — 주휴수당 미발생</p>}
              {calc.monthlyOTH > 0 && <p className="text-orange-300">⚡ 연장근무 가산수당(×1.5) 자동 적용</p>}
              {calc.monthlyNightH > 0 && <p className="text-purple-300">🌙 야간가산수당(×0.5) 자동 적용</p>}
            </div>
          </div>
        </div>

        {/* ── 결과 패널 ── */}
        <div className={activeTab === "result" ? "block" : "hidden md:block"}>
          {(hrMode === "min" || hrMode === "both") && (
            <ResultBlock r={calc.minResult} label="✅ 최저임금 기준" accent="green" />
          )}
          {(hrMode === "custom" || hrMode === "both") && (
            <ResultBlock r={calc.customResult} label="⭐ 설정 시급 기준" accent="blue" />
          )}

          {/* 비교표 */}
          {hrMode === "both" && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-4">
              <h3 className="text-sm font-black text-blue-900 pb-2 mb-3 border-b-2 border-blue-500">📊 최저임금 vs 설정시급 비교</h3>
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 rounded-xl">
                    <td className="p-2.5 font-bold text-gray-400 rounded-l-xl">항목</td>
                    <td className="p-2.5 font-bold text-emerald-700 text-right">최저임금</td>
                    <td className="p-2.5 font-bold text-blue-700 text-right rounded-r-xl">설정시급</td>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["시급", fmt(calc.minResult.hrRate) + "원", fmt(calc.customResult.hrRate) + "원"],
                    ["총 지급액", fmt(calc.minResult.gross) + "원", fmt(calc.customResult.gross) + "원"],
                    ["실수령액", fmt(calc.minResult.net) + "원", fmt(calc.customResult.net) + "원"],
                    ["총 공제액", fmt(calc.minResult.totDed) + "원", fmt(calc.customResult.totDed) + "원"],
                    ["사업주 보험", fmt(calc.minResult.insR) + "원", fmt(calc.customResult.insR) + "원"],
                    ["사업주 총비용", fmt(calc.minResult.totCost) + "원", fmt(calc.customResult.totCost) + "원"],
                    ["시간당 인건비", fmt(calc.minResult.hrCost) + "원", fmt(calc.customResult.hrCost) + "원"],
                  ].map(([l, a, b]) => (
                    <tr key={l} className="border-t border-gray-50">
                      <td className="p-2.5 text-gray-400">{l}</td>
                      <td className="p-2.5 font-mono font-bold text-emerald-700 text-right">{a}</td>
                      <td className="p-2.5 font-mono font-bold text-blue-700 text-right">{b}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 font-medium">
                💡 월 차액 (사업주 기준):&nbsp;
                <span className="font-black text-amber-900">
                  {fmt(Math.abs(calc.customResult.totCost - calc.minResult.totCost))}원
                  {calc.customResult.totCost > calc.minResult.totCost ? " 추가 부담" : " 절감"}
                </span>
              </div>
            </div>
          )}

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs text-gray-400 leading-loose">
            <p className="font-bold text-gray-600 mb-1">📌 2026년 법적 기준</p>
            <p>• 최저임금 <strong className="text-gray-700">10,320원</strong> / 최저월급 2,156,880원 (209h)</p>
            <p>• 국민연금 9.5% (각 4.75%) · 건강보험 7.19% · 장기요양 13.14%</p>
            <p>• 연장(1일 8h·주 40h 초과) ×1.5 / 야간(22~06시) ×0.5 가산</p>
            <p>• 소득세는 간이세액표 기준 추정치 · 정확한 처리는 노무사 확인 권장</p>
          </div>
        </div>

      </div>}
    </div>
  );
}
