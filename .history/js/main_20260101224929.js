const tableBody = document.getElementById("tableBody");
const trifectaInput = document.getElementById("trifectaInput");
const winInput = document.getElementById("winInput");
const analyzeBtn = document.getElementById("analyzeBtn");

// 表の初期生成
for (let i = 1; i <= 18; i++) {
  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td>${i}</td>
    <td class="gap"></td>
    <td class="judge"></td>
  `;
  tableBody.appendChild(tr);
}

analyzeBtn.addEventListener("click", analyze);

function analyze() {
  /* ========= 三連単 ========= */
  const trifectaLines = trifectaInput.value.split("\n");
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

  /* ========= 単勝 ========= */
  const winLines = winInput.value.split("\n");
  const winOdds = [];

  winLines.forEach((line, index) => {
    const odds = Number(line.trim());
    if (odds > 0) {
      winOdds.push({
        horse: index + 1,
        odds
      });
    }
  });

  /* ========= ランキング ========= */
  const winRank = [...winOdds]
    .sort((a,b) => a.odds - b.odds)
    .map((v,i) => ({ ...v, rank: i + 1 }));

  const triRank = Object.entries(minTrifecta)
    .map(([horse, odds]) => ({ horse: Number(horse), odds }))
    .sort((a,b) => a.odds - b.odds)
    .map((v,i) => ({ ...v, rank: i + 1 }));

  /* ========= 表反映 ========= */
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
