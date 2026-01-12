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
function renderStars(count, gap = 0) {
  if (!count) return '<span class="stars s0">—</span>';

  const stars = "★".repeat(count) + "☆".repeat(5 - count);
  const gapText = gap >= 1 ? `<span class="gap">+${gap}</span>` : "";

  return `
    <span class="stars s${count}">
      ${stars}
      ${gapText}
    </span>
  `;
}
function expectedHimoStarsByRank(rank) {
  if (rank <= 2) return 5;
  if (rank <= 4) return 4;
  if (rank <= 7) return 3;
  if (rank <= 11) return 2;
  return 1;
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

  // --- 歪みRank作成 ---
  const distortionArr = Object.entries(distortions)
    .map(([h, d]) => ({ h: Number(h), d }))
    .sort((a, b) => a.d - b.d); // 売れすぎ順

  const distortionRank = {};
  distortionArr.forEach((v, i) => {
    distortionRank[v.h] = i + 1;
  });

  for (let i = 0; i < 18; i++) {
    const horse = i + 1;
    const odds  = winOdds[i];
    if (odds === null) continue;

    // --- 基本データ ---
    const wRank = winRank[i];
    const himo  = himoStars[horse] || 0;
    const d     = distortions[horse];

    const dRank = distortionRank[horse];
    const gap   = (dRank && wRank) ? (wRank - dRank) : 0;

    // --- 歪みスコア（-100〜100） ---
    let score = 0;
    if (d !== undefined) {
      score = Math.round(
        Math.max(-2.5, Math.min(2.5, d)) / 2.5 * 100
      );
    }

    // --- バー描画用 ---
    const p = d !== undefined ? distortionToPercent(d) : 50;
    const left  = p < 50 ? p : 50;
    const width = Math.abs(50 - p);

    // --- 警告判定 ---
    const warnings = [];
    if (d !== undefined && d <= -1.5 && himo >= 4) warnings.push("歪み×紐厚");
    if (wRank >= 8 && gap >= 6) warnings.push("人気薄ヒモ集中");
    if (himo === 5) warnings.push("ヒモ集中");
    if (d !== undefined && d >= 2.0) warnings.push("過小評価");

    const isHot  = d !== undefined && d <= -1.5 && himo >= 3;
    const isWarn = d !== undefined && Math.abs(d) >= 2.2;

    // --- 表示 ---
    tableBody.innerHTML += `
      <tr class="horse-row" data-note="${warnings.join(" / ")}">

        <!-- 馬番 -->
        <td class="horse-no">${horse}</td>

        <!-- 判定バー＋紐 -->
        <td class="judge-cell">
          ${isWarn ? "⚠️" : ""}${isHot ? "🔥" : ""}
          <div class="distort-wrap">
            <div class="center-line"></div>
            <div class="distort-bar ${d < 0 ? "minus" : "plus"}"
              style="left:${left}%;width:${width}%"></div>
          </div>
          <div class="himo-stars">
            ${renderStars(himo, gap >= 2 ? gap : 0)}
          </div>
        </td>

        <!-- 歪みスコア -->
          <td class="score-cell">
            <span class="score ${score <= -60 ? "score-hot" : score >= 40 ? "score-cold" : ""}">
              ${score}
            </span>
            ${gap !== 0
              ? `<span class="gap ${gap >= 5 ? "gap-strong" : ""}">
                  (${gap >= 0 ? "+" : ""}${gap})
                </span>`
              : ""
            }
          </td>

        <!-- 単勝 -->
        <td class="win-cell">
          ${odds.toFixed(1)}
          <span class="rank">(${wRank})</span>
        </td>

      </tr>
    `;
  }
}