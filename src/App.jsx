import { useState, useMemo } from "react";

/* ── 상수 & 유틸 ── */
const WEEKS = 4.345;
const fmt = (n) => Math.round(n).toLocaleString("ko-KR");

const TIME_OPTIONS = [];
for (let h = 0; h < 24; h++) {
  for (let m = 0; m < 60; m += 30) {
    TIME_OPTIONS.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
  }
}
function timeToMin(t) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}
function calcEmployerIns(taxBase) {
  const npBase = Math.min(taxBase, 6370000);
  const np = Math.round(npBase * 0.0475);
  const hi = Math.round(taxBase * 0.03595);
  const lt = Math.round(hi * 0.1314);
  const ei = Math.round(taxBase * 0.0105);
  const wi = Math.round(taxBase * 0.0147);
  return { np, hi, lt, ei, wi, total: np + hi + lt + ei + wi };
}
function calcMonthlyHours(startTime, endTime, breakMin, daysPerWeek) {
  const sm = timeToMin(startTime);
  const em = timeToMin(endTime);
  const totalMin = em > sm ? em - sm : em + 1440 - sm;
  const actualMin = Math.max(0, totalMin - breakMin);
  const dailyH = actualMin / 60;
  const weeklyH = dailyH * daysPerWeek;
  const monthlyH = weeklyH * WEEKS;
  const hasWL = weeklyH >= 15;
  const wlHperWeek = hasWL ? weeklyH / daysPerWeek : 0;
  const monthlyWLH = wlHperWeek * WEEKS;
  const totalPaidH = monthlyH + monthlyWLH;
  return { dailyH, weeklyH, monthlyH, hasWL, monthlyWLH, totalPaidH };
}

/* ── ME.PARK 브랜드 컬러 ── */
const C = {
  navy: "#1428A0",
  gold: "#F5B731",
  dark: "#222222",
  gray: "#666666",
  lightGray: "#E8E8E8",
  white: "#FFFFFF",
  green: "#43A047",
  red: "#E53935",
  blue: "#156082",
  skyBlue: "#0F9ED5",
  orange: "#E97132",
};

/* 금액 입력 컴포넌트 - 포커스 시 숫자만, 블러 시 콤마 포맷 */
function MoneyInput({ value, onChange, style: s, inputStyle: baseStyle, goldColor, grayColor }) {
  const [editing, setEditing] = useState(false);
  const [raw, setRaw] = useState(String(value));

  const handleFocus = (e) => {
    setEditing(true);
    setRaw(value === 0 ? "" : String(value));
    e.target.style.borderColor = goldColor;
  };
  const handleBlur = (e) => {
    setEditing(false);
    const num = parseInt(raw.replace(/[^0-9]/g, "")) || 0;
    onChange(num);
    e.target.style.borderColor = grayColor;
  };
  const handleChange = (e) => {
    const v = e.target.value.replace(/[^0-9]/g, "");
    setRaw(v);
    const num = parseInt(v) || 0;
    onChange(num);
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      value={editing ? raw : value.toLocaleString("ko-KR")}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onChange={handleChange}
      style={{ ...baseStyle, ...s }}
    />
  );
}

export default function App() {
  const [wdSalary, setWdSalary] = useState(2200000);
  const [wdStart, setWdStart] = useState("09:00");
  const [wdEnd, setWdEnd] = useState("18:00");
  const [wdBreak, setWdBreak] = useState(60);
  const [wdCount, setWdCount] = useState(1);

  const [weSat, setWeSat] = useState(true);
  const [weSun, setWeSun] = useState(true);
  const [weDailyWage, setWeDailyWage] = useState(120000);
  const [weStart, setWeStart] = useState("09:00");
  const [weEnd, setWeEnd] = useState("18:00");
  const [weBreak, setWeBreak] = useState(60);
  const [weCount, setWeCount] = useState(1);

  const [opFund, setOpFund] = useState(2000000);
  const [insurance, setInsurance] = useState(500000);

  const result = useMemo(() => {
    const wdH = calcMonthlyHours(wdStart, wdEnd, wdBreak, 5);
    const wdIns = calcEmployerIns(wdSalary);
    const wdRetire = Math.round(wdSalary / 12);
    const wdPerPerson = wdSalary + wdIns.total + wdRetire;
    const wdHourlyRate = wdH.totalPaidH > 0 ? Math.round(wdSalary / wdH.totalPaidH) : 0;
    const wdTotal = wdPerPerson * wdCount;

    const weDays = (weSat ? 1 : 0) + (weSun ? 1 : 0);
    let weData = null;
    let weTotal = 0;
    if (weDays > 0) {
      const weH = calcMonthlyHours(weStart, weEnd, weBreak, weDays);
      const weMonthlySalary = Math.round(weDailyWage * weDays * 5);
      const weIns = calcEmployerIns(weMonthlySalary);
      const weRetire = Math.round(weMonthlySalary / 12);
      const wePerPerson = weMonthlySalary + weIns.total + weRetire;
      const weHourlyRate = weH.dailyH > 0 ? Math.round(weDailyWage / weH.dailyH) : 0;
      weData = { dailyWage: weDailyWage, monthlySalary: weMonthlySalary, hours: weH, ins: weIns, retire: weRetire, perPerson: wePerPerson, hourlyRate: weHourlyRate };
      weTotal = wePerPerson * weCount;
    }
    const laborTotal = wdTotal + weTotal;
    const grandTotal = laborTotal + opFund + insurance;
    return {
      wd: { salary: wdSalary, hours: wdH, ins: wdIns, retire: wdRetire, perPerson: wdPerPerson, hourlyRate: wdHourlyRate },
      wdTotal, we: weData, weDays, weTotal, laborTotal, grandTotal,
    };
  }, [wdSalary, wdStart, wdEnd, wdBreak, wdCount, weSat, weSun, weDailyWage, weStart, weEnd, weBreak, weCount, opFund, insurance]);

  /* ── 스타일 ── */
  const inputStyle = {
    width: "100%", padding: "10px 12px", border: `2px solid ${C.lightGray}`, borderRadius: 8,
    fontSize: 15, fontFamily: "monospace", textAlign: "right", color: C.dark, fontWeight: 700,
    outline: "none", background: C.white, transition: "border-color 0.2s",
  };
  const selectStyle = {
    ...inputStyle, textAlign: "center", fontWeight: 600, fontSize: 14, padding: "10px 4px",
    appearance: "none", WebkitAppearance: "none",
  };
  const labelStyle = { display: "block", fontSize: 12, fontWeight: 700, color: C.gray, marginBottom: 4, letterSpacing: 0.3 };

  const TimeSelect = ({ value, onChange }) => (
    <select value={value} onChange={(e) => onChange(e.target.value)} style={selectStyle}
      onFocus={(e) => e.target.style.borderColor = C.gold}
      onBlur={(e) => e.target.style.borderColor = C.lightGray}>
      {TIME_OPTIONS.map((t) => (<option key={t} value={t}>{t}</option>))}
    </select>
  );

  const Input = ({ value, onChange, style: s, ...props }) => (
    <input {...props} value={value} onChange={onChange} style={{ ...inputStyle, ...s }}
      onFocus={(e) => e.target.style.borderColor = C.gold}
      onBlur={(e) => e.target.style.borderColor = C.lightGray} />
  );

  /* 결과행 */
  const Row = ({ label, value, bold, highlight }) => (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: bold ? "10px 0 4px" : "5px 0",
      borderTop: bold ? `2px solid ${C.lightGray}` : "none",
      marginTop: bold ? 6 : 0,
    }}>
      <span style={{ fontSize: bold ? 14 : 13, fontWeight: bold ? 900 : 600, color: bold ? C.dark : C.gray }}>{label}</span>
      <span style={{
        fontFamily: "monospace", fontSize: bold ? 16 : 13, fontWeight: 800,
        color: highlight ? C.gold : bold ? C.navy : C.dark,
      }}>{fmt(value)}원</span>
    </div>
  );

  /* 섹션 헤더 바 */
  const SectionBar = ({ num, title, sub }) => (
    <div style={{
      background: C.navy, padding: "14px 20px", display: "flex", alignItems: "center", gap: 10,
      borderRadius: "12px 12px 0 0",
    }}>
      <span style={{
        background: C.gold, color: C.navy, fontSize: 13, fontWeight: 900,
        width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
      }}>{num}</span>
      <span style={{ color: C.white, fontSize: 15, fontWeight: 900, letterSpacing: -0.3 }}>{title}</span>
      {sub && <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, fontWeight: 600 }}>{sub}</span>}
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#F0F2F8", fontFamily: "'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif" }}>

      {/* ══ 헤더 ══ */}
      <div style={{ background: C.navy, padding: "20px 24px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", left: 0, top: 0, width: 6, height: "100%", background: C.gold }} />
        <div style={{ maxWidth: 960, margin: "0 auto", display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 10, background: C.gold,
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22,
          }}>🚗</div>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: C.white, letterSpacing: -0.5 }}>
              (주)미스터팍 발렛맨 서비스
            </h1>
            <p style={{ margin: "2px 0 0", fontSize: 13, fontWeight: 700, color: C.gold, letterSpacing: 1 }}>
              월간 서비스 견적표 · 2026
            </p>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 960, margin: "0 auto", padding: "20px 16px" }}>

        {/* ═══ 1. 인건비 ═══ */}
        <div style={{ background: C.white, borderRadius: 12, overflow: "hidden", marginBottom: 16, boxShadow: "0 2px 12px rgba(20,40,160,0.07)" }}>
          <SectionBar num="1" title="인건비" sub="급여 + 사업주 4대보험 + 퇴직충당금" />

          {/* 평일 */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", minHeight: 0 }}>
            <div style={{ padding: 20, borderRight: `1px solid ${C.lightGray}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                <span style={{ background: C.navy, color: C.white, fontSize: 12, fontWeight: 900, padding: "4px 14px", borderRadius: 20 }}>평일</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: C.gray }}>월 ~ 금 (주 5일)</span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 100px", gap: 10, marginBottom: 12 }}>
                <div>
                  <label style={labelStyle}>급여 (월급 총액)</label>
                  <MoneyInput value={wdSalary} onChange={setWdSalary}
                    inputStyle={inputStyle} goldColor={C.gold} grayColor={C.lightGray}
                    style={{ fontSize: 17 }} />
                </div>
                <div>
                  <label style={labelStyle}>인원 (명)</label>
                  <Input type="number" value={wdCount} min={0} max={50}
                    onChange={(e) => setWdCount(parseInt(e.target.value) || 0)} />
                </div>
              </div>

              <label style={labelStyle}>근무시간</label>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                <div style={{ flex: 1 }}><TimeSelect value={wdStart} onChange={setWdStart} /></div>
                <span style={{ color: C.gray, fontWeight: 900, fontSize: 14 }}>~</span>
                <div style={{ flex: 1 }}><TimeSelect value={wdEnd} onChange={setWdEnd} /></div>
                <div style={{ width: 70 }}>
                  <Input type="number" value={wdBreak} min={0} max={480} step={10}
                    onChange={(e) => setWdBreak(parseInt(e.target.value) || 0)}
                    style={{ textAlign: "center" }} />
                </div>
                <span style={{ fontSize: 12, color: C.gray, fontWeight: 700, whiteSpace: "nowrap" }}>분 휴게</span>
              </div>

              <div style={{ display: "flex", gap: 16, fontSize: 13, color: C.gray, fontWeight: 600 }}>
                <span>실근무 <strong style={{ color: C.dark }}>{result.wd.hours.dailyH.toFixed(1)}h/일</strong></span>
                <span>주 <strong style={{ color: C.dark }}>{result.wd.hours.weeklyH.toFixed(1)}h</strong></span>
                {result.wd.hours.hasWL && <span style={{ color: C.green, fontWeight: 800 }}>✓ 주휴포함</span>}
              </div>
            </div>

            {/* 평일 결과 */}
            <div style={{ padding: 20, background: "#F7F8FC", display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: C.navy, marginBottom: 10, letterSpacing: 1, textTransform: "uppercase" }}>1인 산출내역</div>
              <Row label="급여" value={result.wd.salary} />
              <Row label="사업주 4대보험" value={result.wd.ins.total} />
              <Row label="퇴직충당금 (÷12)" value={result.wd.retire} />
              <Row label="1인 합계" value={result.wd.perPerson} bold />
              {wdCount > 1 && <Row label={`${wdCount}명 합계`} value={result.wdTotal} highlight />}
              <div style={{
                marginTop: 12, textAlign: "center", background: C.navy, color: C.gold,
                borderRadius: 8, padding: "10px 0", fontSize: 14, fontWeight: 900, letterSpacing: 0.5,
              }}>
                환산시급 {fmt(result.wd.hourlyRate)}원/h
              </div>
            </div>
          </div>

          {/* 구분선 */}
          <div style={{ height: 3, background: `repeating-linear-gradient(90deg, ${C.lightGray} 0, ${C.lightGray} 8px, transparent 8px, transparent 14px)` }} />

          {/* 주말 */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", minHeight: 0 }}>
            <div style={{ padding: 20, borderRight: `1px solid ${C.lightGray}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                <span style={{ background: C.red, color: C.white, fontSize: 12, fontWeight: 900, padding: "4px 14px", borderRadius: 20 }}>주말</span>
                <div style={{ display: "flex", gap: 6 }}>
                  {[["토", weSat, setWeSat], ["일", weSun, setWeSun]].map(([label, val, set]) => (
                    <button key={label} onClick={() => set((p) => !p)} style={{
                      width: 36, height: 36, borderRadius: 8, border: `2px solid ${val ? C.red : C.lightGray}`,
                      background: val ? C.red : C.white, color: val ? C.white : "#aaa",
                      fontSize: 13, fontWeight: 900, cursor: "pointer", transition: "all 0.2s",
                    }}>{label}</button>
                  ))}
                </div>
                {result.weDays > 0 && <span style={{ fontSize: 12, color: C.gray, fontWeight: 600, marginLeft: "auto" }}>주 {result.weDays}일</span>}
              </div>

              {result.weDays > 0 ? (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 100px", gap: 10, marginBottom: 12 }}>
                    <div>
                      <label style={labelStyle}>일당 (1일 금액)</label>
                      <MoneyInput value={weDailyWage} onChange={setWeDailyWage}
                        inputStyle={inputStyle} goldColor={C.gold} grayColor={C.lightGray}
                        style={{ fontSize: 17 }} />
                    </div>
                    <div>
                      <label style={labelStyle}>인원 (명)</label>
                      <Input type="number" value={weCount} min={0} max={50}
                        onChange={(e) => setWeCount(parseInt(e.target.value) || 0)} />
                    </div>
                  </div>

                  <label style={labelStyle}>근무시간</label>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                    <div style={{ flex: 1 }}><TimeSelect value={weStart} onChange={setWeStart} /></div>
                    <span style={{ color: C.gray, fontWeight: 900, fontSize: 14 }}>~</span>
                    <div style={{ flex: 1 }}><TimeSelect value={weEnd} onChange={setWeEnd} /></div>
                    <div style={{ width: 70 }}>
                      <Input type="number" value={weBreak} min={0} max={480} step={10}
                        onChange={(e) => setWeBreak(parseInt(e.target.value) || 0)}
                        style={{ textAlign: "center" }} />
                    </div>
                    <span style={{ fontSize: 12, color: C.gray, fontWeight: 700, whiteSpace: "nowrap" }}>분 휴게</span>
                  </div>
                  <div style={{ fontSize: 13, color: C.gray, fontWeight: 600 }}>
                    실근무 <strong style={{ color: C.dark }}>{result.we?.hours.dailyH.toFixed(1)}h/일</strong>
                  </div>
                </>
              ) : (
                <div style={{ textAlign: "center", padding: "30px 0", fontSize: 13, color: "#bbb" }}>토 또는 일을 선택하세요</div>
              )}
            </div>

            {/* 주말 결과 */}
            <div style={{ padding: 20, background: "#F7F8FC", display: "flex", flexDirection: "column", justifyContent: "center" }}>
              {result.weDays > 0 && result.we ? (
                <>
                  <div style={{ fontSize: 11, fontWeight: 800, color: C.navy, marginBottom: 10, letterSpacing: 1, textTransform: "uppercase" }}>1인 산출내역</div>
                  <Row label={`일당 × ${result.weDays}일 × 5주`} value={result.we.monthlySalary} />
                  <Row label="사업주 4대보험" value={result.we.ins.total} />
                  <Row label="퇴직충당금 (÷12)" value={result.we.retire} />
                  <Row label="1인 합계" value={result.we.perPerson} bold />
                  {weCount > 1 && <Row label={`${weCount}명 합계`} value={result.weTotal} highlight />}
                  <div style={{
                    marginTop: 12, textAlign: "center", background: C.navy, color: C.gold,
                    borderRadius: 8, padding: "10px 0", fontSize: 14, fontWeight: 900, letterSpacing: 0.5,
                  }}>
                    환산시급 {fmt(result.we.hourlyRate)}원/h
                  </div>
                </>
              ) : (
                <div style={{ textAlign: "center", fontSize: 24, color: "#ddd" }}>—</div>
              )}
            </div>
          </div>
        </div>

        {/* ═══ 2. 운영지원금 ═══ */}
        <div style={{ background: C.white, borderRadius: 12, overflow: "hidden", marginBottom: 16, boxShadow: "0 2px 12px rgba(20,40,160,0.07)" }}>
          <SectionBar num="2" title="운영지원금" sub="운영관리 + 사고 리스크 대비금" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
            <div style={{ padding: 20, borderRight: `1px solid ${C.lightGray}` }}>
              <input type="range" min={1000000} max={5000000} step={100000} value={opFund}
                onChange={(e) => setOpFund(parseInt(e.target.value))}
                style={{ width: "100%", accentColor: C.gold, marginBottom: 10 }} />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 6 }}>
                {[1000000, 2000000, 3000000, 4000000].map((v) => (
                  <button key={v} onClick={() => setOpFund(v)} style={{
                    padding: "8px 0", borderRadius: 8, fontSize: 13, fontWeight: 800, cursor: "pointer",
                    border: `2px solid ${opFund === v ? C.navy : C.lightGray}`,
                    background: opFund === v ? C.navy : C.white,
                    color: opFund === v ? C.gold : C.gray, transition: "all 0.2s",
                  }}>{v / 10000}만</button>
                ))}
                <MoneyInput value={opFund} onChange={setOpFund}
                  inputStyle={{ ...inputStyle, fontSize: 13, fontWeight: 800, textAlign: "center", padding: "8px 4px", borderRadius: 8 }}
                  goldColor={C.gold} grayColor={C.lightGray} />
              </div>
            </div>
            <div style={{ padding: 20, background: "#F7F8FC", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 28, fontWeight: 900, fontFamily: "monospace", color: C.navy }}>{fmt(opFund)}원</div>
                <div style={{ fontSize: 12, color: C.gray, fontWeight: 700, marginTop: 4 }}>월 운영지원금</div>
              </div>
            </div>
          </div>
        </div>

        {/* ═══ 3. 발렛보험비 ═══ */}
        <div style={{ background: C.white, borderRadius: 12, overflow: "hidden", marginBottom: 16, boxShadow: "0 2px 12px rgba(20,40,160,0.07)" }}>
          <SectionBar num="3" title="발렛보험비" sub="50만 ~ 200만원 (10만 단위)" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
            <div style={{ padding: 20, borderRight: `1px solid ${C.lightGray}` }}>
              <input type="range" min={500000} max={2000000} step={100000} value={insurance}
                onChange={(e) => setInsurance(parseInt(e.target.value))}
                style={{ width: "100%", accentColor: C.gold, marginBottom: 10 }} />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
                {[500000, 1000000, 1500000].map((v) => (
                  <button key={v} onClick={() => setInsurance(v)} style={{
                    padding: "8px 0", borderRadius: 8, fontSize: 13, fontWeight: 800, cursor: "pointer",
                    border: `2px solid ${insurance === v ? C.navy : C.lightGray}`,
                    background: insurance === v ? C.navy : C.white,
                    color: insurance === v ? C.gold : C.gray, transition: "all 0.2s",
                  }}>{v / 10000}만</button>
                ))}
                <MoneyInput value={insurance} onChange={setInsurance}
                  inputStyle={{ ...inputStyle, fontSize: 13, fontWeight: 800, textAlign: "center", padding: "8px 4px", borderRadius: 8 }}
                  goldColor={C.gold} grayColor={C.lightGray} />
              </div>
            </div>
            <div style={{ padding: 20, background: "#F7F8FC", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 28, fontWeight: 900, fontFamily: "monospace", color: C.navy }}>{fmt(insurance)}원</div>
                <div style={{ fontSize: 12, color: C.gray, fontWeight: 700, marginTop: 4 }}>월 발렛보험비</div>
              </div>
            </div>
          </div>
        </div>

        {/* ═══ 총 견적 ═══ */}
        <div style={{ background: C.navy, borderRadius: 12, overflow: "hidden", boxShadow: "0 4px 20px rgba(20,40,160,0.25)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
            {/* 좌: 항목별 소계 */}
            <div style={{ padding: "24px 24px", borderRight: "1px solid rgba(255,255,255,0.1)" }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,0.4)", marginBottom: 14, letterSpacing: 1.5, textTransform: "uppercase" }}>항목별 소계</div>
              {[
                ["1. 인건비 (평일)", result.wdTotal],
                result.weDays > 0 && ["1. 인건비 (주말)", result.weTotal],
                ["2. 운영지원금", opFund],
                ["3. 발렛보험비", insurance],
              ].filter(Boolean).map(([l, v]) => (
                <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", fontSize: 14 }}>
                  <span style={{ color: "rgba(255,255,255,0.55)", fontWeight: 600 }}>{l}</span>
                  <span style={{ fontFamily: "monospace", fontWeight: 800, color: C.white, fontSize: 15 }}>{fmt(v)}원</span>
                </div>
              ))}
            </div>
            {/* 우: 총액 */}
            <div style={{
              background: C.gold, padding: "20px 24px",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: C.navy, marginBottom: 4, letterSpacing: 0.5 }}>월간 총 견적금액 (부가세 별도)</div>
              <div style={{ fontSize: 32, fontWeight: 900, fontFamily: "monospace", color: C.navy, letterSpacing: -1 }}>
                {fmt(result.grandTotal)}<span style={{ fontSize: 16 }}>원</span>
              </div>

              <div style={{
                marginTop: 12, width: "100%", background: C.navy, borderRadius: 10, padding: "12px 16px",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", fontWeight: 600 }}>견적금액</span>
                  <span style={{ fontSize: 13, fontFamily: "monospace", fontWeight: 700, color: C.white }}>{fmt(result.grandTotal)}원</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", fontWeight: 600 }}>+ 부가세 (10%)</span>
                  <span style={{ fontSize: 13, fontFamily: "monospace", fontWeight: 700, color: C.white }}>{fmt(Math.round(result.grandTotal * 0.1))}원</span>
                </div>
                <div style={{ borderTop: "1px solid rgba(255,255,255,0.2)", paddingTop: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13, fontWeight: 900, color: C.gold }}>합계 (VAT 포함)</span>
                  <span style={{ fontSize: 18, fontFamily: "monospace", fontWeight: 900, color: C.gold }}>{fmt(Math.round(result.grandTotal * 1.1))}원</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 푸터 */}
        <div style={{ textAlign: "center", padding: "16px 0", fontSize: 12, color: "#999", lineHeight: 1.8 }}>
          <p style={{ margin: 0 }}>• 4대보험·퇴직충당금 2026년 기준 자동 산출</p>
          <p style={{ margin: 0 }}>• 실제 금액은 근무조건 및 보험요율 변동에 따라 차이가 있을 수 있습니다</p>
          <p style={{ margin: "6px 0 0", fontWeight: 700, color: C.gray }}>주식회사 미스터팍</p>
        </div>
      </div>
    </div>
  );
}
