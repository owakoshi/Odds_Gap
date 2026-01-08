'use strict';

/* =========================
  DOM
========================= */
const winInput = document.getElementById("winInput");
const trifectaInput = document.getElementById("trifectaInput");
const analyzeBtn = document.getElementById("analyzeBtn");
const tableBody = document.getElementById("tableBody");

/* =========================
  Event
========================= */
analyzeBtn.addEventListener("click", () => {
  const winOdds = parseWinOdds();
  const winRank = calcWinRank(winOdds);
  const headMinOdds = calcHeadMinFromTrifecta(trifectaInput.value);
  const gapRank = calcGapRank(headMinOdds);
  const himoStars = normalizeHimoStars(calcHimoConcentration(trifectaInput.value));
  const distortions = calcDistortions(headMinOdds);

  renderTable(winOdds, winRank, gapRank, himoStars, distortions);
});

/* =========================
  単勝
========================= */
function parseWinOdds() {
  const odds = winInput.value.trim().split(/\n+/).map(v => {
    const n = parseFloat(v);
    return (isNaN(n) || v.trim() === "-" || v.trim() === "") ? null : n;
  });
  while (odds.length < 18) odds.push(null);
  return odds.slice(0, 18);
}

function calcWinRank(winOdds) {
  const valid = winOdds
    .map((o, i) => ({ o, i }))
    .filter(v => v.o !== null)
    .sort((a, b) => a.o - b.o);

  const rank = Array(18).fill(null);
  valid.forEach((v, i) => rank[v.i] = i + 1);
  return rank;
}

/* =========================
  三連単 → 頭最安
========================= */
function calcHeadMinFromTrifecta(text) {
  const result = {};
  text.trim().split("\n").forEach(line => {
    const [combo, oddsStr] = line.trim().split(/\s+/);
    if (!combo || !oddsStr) return;

    const odds = parseFloat(oddsStr);
    const head = parseInt(combo.split("-")[0], 10);
    if (isNaN(odds) || isNaN(head)) return;

    if (!result[head] || odds < result[head]) result[head] = odds;
  });
  return result;
}

function calcGapRank(headMinOdds) {
  const rank = {};
  Object.entries(headMinOdds)
    .sort((a, b) => a[1] - b[1])
    .forEach(([h], i) => rank[h] = i + 1);
  return rank;
}

/* =========================
  紐集中
========================= */
function calcHimoConcentration(text) {
  const score = {};
  text.trim().split("\n").forEach(line => {
    const [combo, oddsStr] = line.trim().split(/\s+/);
    if (!combo || !oddsStr) return;

    const odds = parseFloat(oddsStr);
    const c = combo.split("-");
    if (c.length !== 3 || isNaN(odds)) return;

    const w = 1 / Math.log(odds + 1);
    [c[1], c[2]].forEach((h, i) => {
      const n = parseInt(h, 10);
      if (n >= 1 && n <= 18) {
        score[n] = (score[n] || 0) + (i === 0 ? 1.0 : 0.7) * w;
      }
    });
  });
  return score;
}

function normalizeHimoStars(raw) {
  const vals = Object.values(raw);
  if (!vals.length) return {};

  const max = Math.max(...vals), min = Math.min(...vals);
  const stars = {};
  Object.entries(raw).forEach(([h, v]) => {
    const r = (v - min) / (max - min || 1);
    stars[h] = r >= .8 ? 5 : r >= .65 ? 4 : r >= .45 ? 3 : r >= .25 ? 2 : 1;
  });
  return stars;
}
function renderStars(count) {
  if (!count) return '<span class="stars s0">—</span>';

  return `
    <span class="stars s${count}">
      ${"★".repeat(count)}${"☆".repeat(5 - count)}
    </span>
  `;
}

/* =========================
  歪み
========================= */
function calcDistortions(headMinOdds) {
  const arr = Object.values(headMinOdds);
  if (arr.length < 3) return {};

  const logs = arr.map(o => Math.log(o));
  const avg = logs.reduce((a,b)=>a+b)/logs.length;
  const std = Math.sqrt(logs.reduce((s,l)=>s+(l-avg)**2,0)/logs.length);
  if (std < .15) return {};

  const d = {};
  Object.entries(headMinOdds).forEach(([h,o])=>{
    d[h] = (Math.log(o) - avg) / std;
  });
  return d;
}

function distortionToPercent(d) {
  const c = Math.max(-2.5, Math.min(2.5, d));
  return ((c + 2.5) / 5) * 100;
}

/* =========================
  描画
========================= */
function renderTable(winOdds, winRank, gapRank, himoStars, distortions) {
  tableBody.innerHTML = "";

  for (let i = 0; i < 18; i++) {
    const horse = i + 1;
    const odds = winOdds[i];
    if (odds === null) continue;

    const wRank = winRank[i];
    const gRank = gapRank[horse];
    const himo = himoStars[horse] || 0;
    const d = distortions[horse];

    const warnings = [];
    if (d <= -1.5 && himo >= 4) warnings.push("歪み×紐厚");
    if (wRank >= 8 && gRank <= 3) warnings.push("爆穴乖離");
    if (himo === 5) warnings.push("ヒモ集中");
    if (d >= 2.0) warnings.push("過小評価");

    const isHot = d <= -1.5 && himo >= 3;
    const isWarn = Math.abs(d) >= 2.2;

    const p = d !== undefined ? distortionToPercent(d) : 50;
    const left = p < 50 ? p : 50;
    const width = Math.abs(50 - p);

    tableBody.innerHTML += `
      <tr class="horse-row" data-note="${warnings.join(" / ")}">
        <td>${horse}</td>
        <td>
          ${isWarn ? "⚠️" : ""}${isHot ? "🔥" : ""}
          <div class="distort-wrap">
            <div class="center-line"></div>
            <div class="distort-bar ${d < 0 ? 'minus':'plus'}"
              style="left:${left}%;width:${width}%"></div>
          </div>
          <div class="himo-stars">${renderStars(himo)}</div>
        </td>
        <td>${odds.toFixed(1)}</td>
        <td>${wRank}</td>
      </tr>
    `;
  }
}