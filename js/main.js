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

  const himoRaw = calcHimoConcentration(trifectaInput.value);
  const himoStars = normalizeHimoStars(himoRaw);

  renderTable(winOdds, winRank, gapRank, himoStars);
});

/* =========================
  単勝
========================= */
function parseWinOdds() {
  const lines = winInput.value.trim().split(/\n+/);
  const odds = lines.map(v => {
    if (v.trim() === "-" || v.trim() === "") return null;
    const n = parseFloat(v);
    return isNaN(n) ? null : n;
  });

  while (odds.length < 18) odds.push(null);
  return odds.slice(0, 18);
}

function calcWinRank(winOdds) {
  const valid = winOdds
    .map((odds, idx) => ({ odds, idx }))
    .filter(v => v.odds !== null)
    .sort((a, b) => a.odds - b.odds);

  const rank = Array(18).fill(null);
  valid.forEach((v, i) => {
    rank[v.idx] = i + 1;
  });
  return rank;
}

/* =========================
  集中度（1〜5）
========================= */
function calcConcentration(winOdds) {
  const valid = winOdds.filter(v => v !== null);
  const invSum = valid.reduce((sum, o) => sum + 1 / o, 0);

  // 正規化（だいたい 0.25〜0.6 に収まる）
  if (invSum >= 0.55) return 5; // 超集中
  if (invSum >= 0.45) return 4;
  if (invSum >= 0.38) return 3;
  if (invSum >= 0.32) return 2;
  return 1;                    // 割れ
}

/* =========================
  三連単 → ギャップ
========================= */
function calcHeadMinFromTrifecta(text) {
  const lines = text.trim().split("\n");
  const result = {};
  
  lines.forEach(line => {
    const parts = line.trim().split(/\s+/);
    if (parts.length < 2) return;
    
    const odds = parseFloat(parts[1]);
    if (isNaN(odds)) return;
    
    const head = parseInt(parts[0].split("-")[0], 10);
    if (head < 1 || head > 18) return;
    
    if (!result[head] || odds < result[head]) {
      result[head] = odds;
    }
  });
  
  return result;
}

function calcGapRank(headMinOdds) {
  const sorted = Object.entries(headMinOdds)
  .sort((a, b) => a[1] - b[1]);
  
  const rank = {};
  sorted.forEach(([horse], idx) => {
    rank[Number(horse)] = idx + 1;
  });
  
  return rank;
}

/* =========================
  紐集中
========================= */
function calcHimoConcentration(text) {
  const score = {};

  text.trim().split("\n").forEach(line => {
    const parts = line.trim().split(/\s+/);
    if (parts.length < 2) return;

    const combo = parts[0].split("-");
    const odds = parseFloat(parts[1]);
    if (combo.length !== 3 || isNaN(odds)) return;

    const weight = 1 / Math.log(odds + 1);

    const second = parseInt(combo[1], 10);
    const third  = parseInt(combo[2], 10);

    if (second >= 1 && second <= 18) {
      score[second] = (score[second] || 0) + 1.0 * weight;
    }
    if (third >= 1 && third <= 18) {
      score[third] = (score[third] || 0) + 0.7 * weight;
    }
  });

  return score;
}
function normalizeHimoStars(himoScore) {
  const values = Object.values(himoScore);
  if (values.length === 0) return {};

  const max = Math.max(...values);
  const min = Math.min(...values);

  const stars = {};
  Object.entries(himoScore).forEach(([horse, val]) => {
    const ratio = (val - min) / (max - min || 1);

    let s = 1;
    if (ratio >= 0.80) s = 5;
    else if (ratio >= 0.65) s = 4;
    else if (ratio >= 0.45) s = 3;
    else if (ratio >= 0.25) s = 2;

    stars[horse] = s;
  });

  return stars;
}

function renderStars(count) {
  if (!count) return "—";
  return "★".repeat(count) + "☆".repeat(5 - count);
}

/* =========================
  判定スコア（5段階）
========================= */
function calcJudgeScore(wRank, gRank, validCount, concentration) {
  if (!wRank || !gRank) return 0;

  // ギャップ×人気
  const composite =
    (validCount + 1 - wRank) +
    (validCount + 1 - gRank);

  const ratio = composite / (validCount * 2);

  let base;
  if (ratio >= 0.85) base = 4;
  else if (ratio >= 0.7) base = 3;
  else if (ratio >= 0.55) base = 2;
  else if (ratio >= 0.4) base = 1;
  else base = 0;

  // 集中度補正（最大 ±1）
  if (concentration >= 4) base += 1;
  if (concentration <= 2) base -= 1;

  return Math.max(0, Math.min(4, base));
}

function getFireMark(score, himoStar) {
  if (score >= 3 && himoStar >= 4) {
    return "🔥";
  }
  return "";
}
// 判定↓ × 紐↑
if (judgeScore <= 1 && himoStar >= 4) {
  warnings.push("判定低×紐高");
}

// 人気と三連単ギャップ大
if (wRank >= 8 && gRank <= 3) {
  warnings.push("人気×三連単乖離");
}

// 1頭被り
if (gRank === 1 && himoStar <= 2) {
  warnings.push("1頭被り");
}

// ヒモ集中
if (himoStar === 5) {
  warnings.push("ヒモ集中");
}

// 抜け番
if (judgeScore === 2 && wRank >= 8) {
  warnings.push("抜け番");
}

// 押さえ必須
if (himoStar >= 4 && judgeScore <= 2) {
  warnings.push("押さえ必須");
}
/* =========================
  描画
========================= */
function renderTable(winOdds, winRank, gapRank, himoStars) {
  tableBody.innerHTML = "";

  const validCount = winOdds.filter(v => v !== null).length;
  const concentration = calcConcentration(winOdds);

  for (let i = 0; i < 18; i++) {
    const horse = i + 1;
    const odds = winOdds[i];
    if (odds === null) continue;

    const wRank = winRank[i];
    const gRank = gapRank[horse];
    const himoStar = himoStars[horse] || 0;

    const judgeScore = calcJudgeScore(
      wRank,
      gRank,
      validCount,
      concentration
    );

    const warnings = [];

    // 判定スコア
    let score = 0;
    if (wRank && gRank) {
      const diff = wRank - gRank;
      if (diff <= -3) score = 0;
      else if (diff === -2) score = 1;
      else if (diff === -1) score = 2;
      else if (diff === 0) score = 3;
      else score = 4;
    }

    const percentMap = [15, 35, 55, 75, 100];
    const percent = percentMap[judgeScore];
    const fire = getFireMark(judgeScore, himoStar);
    const noteText = warnings.join(" / ");

    tableBody.innerHTML += `
      <tr class="horse-row" data-note="${noteText}">
        <td>${horse}</td>

        <td class="judge-cell">
          <div class="judge-row">
            ${warnings.length ? `<span class="warn">⚠️</span>` : ""}
            <span class="fire">${fire}</span>
            <div class="judge-wrap">
              <div class="judge-bar judge-${judgeScore}" style="width:${percent}%"></div>
            </div>
          </div>
          <div class="himo-stars">${renderStars(himoStar)}</div>
        </td>

        <td class="odds">${odds.toFixed(1)}</td>
        <td class="muted">${wRank}</td>
      </tr>
    `;
  }
}

    // ここに既存のJSロジックをそのまま貼り付けてOK
    // 例: analyzeBtn / renderTable など

    // モバイル用：クリップボードから自動ペースト
const pasteBtn = document.getElementById('pasteBtn');
if (pasteBtn) {
  pasteBtn.addEventListener('click', async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text.includes('-')) trifectaInput.value = text;
      else winInput.value = text;
    } catch (e) {
      alert('ペーストできんかった😭');
    }
  });
}