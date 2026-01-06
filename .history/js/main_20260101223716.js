const tableBody = document.getElementById("tableBody");
const trifectaInput = document.getElementById("trifectaInput");
const analyzeBtn = document.getElementById("analyzeBtn");

// 初期テーブル生成（1〜18）
for (let i = 1; i <= 18; i++) {
  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td>${i}</td>
    <td><input type="number" step="0.1" data-horse="${i}" /></td>
    <td class="gap"></td>
    <td class="judge"></td>
  `;
  tableBody.appendChild(tr);
}

analyzeBtn.addEventListener("click", analyze);

function analyze() {
  const trifectaLines = trifectaInput.value.split("\n");

  // 馬番ごとの三連単頭最安
  const minTrifecta = {};

  trifectaLines.forEach(line => {
    const match = line.match(/^(\d+)-\d+-\d+\s+(\d+)/);
    if (!match) return;

    const horse = Number(match[1]);
    const odds = Number(match[2]);

    if (!minTrifecta[horse] || odds < minTrifecta[horse]) {
      minTrifecta[horse] = odds;
    }
  });

  // 単勝取得
  const winOdds = [];
  document.querySelectorAll("input[type='number']").forEach(input => {
    const horse = Number(input.dataset.horse);
    const value = Number(input.value);
    if (value > 0) {
      winOdds.push({ horse, odds: value });
    }
  });

  // 順位付け
  const winRank = [...winOdds]
    .sort((a,b) => a.odds - b.odds)
    .map((v,i) => ({ ...v, rank: i + 1 }));

  const triRank = Object.entries(minTrifecta)
    .map(([horse, odds]) => ({ horse: Number(horse), odds }))
    .sort((a,b) => a.odds - b.odds)
    .map((v,i) => ({ ...v, rank: i + 1 }));

  // 表に反映
  document.querySelectorAll("#tableBody tr").forEach(tr => {
    const horse = Number(tr.children[0].textContent);
    const gapCell = tr.querySelector(".gap");
    const judgeCell = tr.querySelector(".judge");

    const w = winRank.find(v => v.horse === horse);
    const t = triRank.find(v => v.horse === horse);

    if (!w || !t) {
      gapCell.textContent = "";
      judgeCell.textContent = "";
      return;
    }

    const gap = w.rank - t.rank;
    gapCell.textContent = gap > 0 ? `+${gap}` : gap;

    let label = "通常";
    let cls = "gray";

    if (gap >= 3) { label = "情報馬"; cls = "red"; }
    else if (gap === 2) { label = "注意"; cls = "orange"; }
    else if (gap === 1) { label = "様子見"; cls = "yellow"; }

    judgeCell.innerHTML = `<span class="badge ${cls}">${label}</span>`;
  });
}
