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
function parseWinOdds(){
  const odds = winInput.value.trim().split(/\n+/).map(v=>{
    const n=parseFloat(v);
    return (isNaN(n)||v.trim()===""||v.trim()==="-")?null:n;
  });
  while(odds.length<18) odds.push(null);
  return odds.slice(0,18);
}

function calcWinRank(winOdds){
  const valid=winOdds.map((o,i)=>({o,i}))
    .filter(v=>v.o!==null)
    .sort((a,b)=>a.o-b.o);

  const rank=Array(18).fill(null);
  valid.forEach((v,i)=>rank[v.i]=i+1);
  return rank;
}

/* =========================
  三連単 → 頭最安
========================= */
function calcHeadMinFromTrifecta(text){
  const result={};
  text.trim().split("\n").forEach(line=>{
    const [combo,oddsStr]=line.trim().split(/\s+/);
    if(!combo||!oddsStr)return;

    const odds=parseFloat(oddsStr);
    const head=parseInt(combo.split("-")[0],10);
    if(isNaN(odds)||isNaN(head))return;

    if(!result[head]||odds<result[head]) result[head]=odds;
  });
  return result;
}

function calcGapRank(headMinOdds){
  const rank={};
  Object.entries(headMinOdds)
    .sort((a,b)=>a[1]-b[1])
    .forEach(([h],i)=>rank[h]=i+1);
  return rank;
}

/* =========================
  紐集中
========================= */
function calcHimoConcentration(text){
  const score={};
  text.trim().split("\n").forEach(line=>{
    const [combo,oddsStr]=line.trim().split(/\s+/);
    if(!combo||!oddsStr)return;

    const odds=parseFloat(oddsStr);
    const c=combo.split("-");
    if(c.length!==3||isNaN(odds))return;

    const w=1/Math.log(odds+1);

    [c[1],c[2]].forEach((h,i)=>{
      const n=parseInt(h,10);
      if(n>=1&&n<=18){
        score[n]=(score[n]||0)+(i===0?1.0:0.7)*w;
      }
    });
  });
  return score;
}

function normalizeHimoStars(raw){
  const vals=Object.values(raw);
  if(!vals.length) return {};

  const max=Math.max(...vals),min=Math.min(...vals);
  const stars={};

  Object.entries(raw).forEach(([h,v])=>{
    const r=(v-min)/(max-min||1);
    stars[h]=r>=.8?5:r>=.65?4:r>=.45?3:r>=.25?2:1;
  });
  return stars;
}

/* =========================
歪み
========================= */
function calcDistortions(headMinOdds){
  const arr=Object.values(headMinOdds);
  if(arr.length<3) return {};

  const logs=arr.map(o=>Math.log(o));
  const avg=logs.reduce((a,b)=>a+b)/logs.length;
  const std=Math.sqrt(logs.reduce((s,l)=>s+(l-avg)**2,0)/logs.length);

  if(std<.15) return {};

  const d={};
  Object.entries(headMinOdds).forEach(([h,o])=>{
    d[h]=(Math.log(o)-avg)/std;
  });
  return d;
}

/* =========================
正規化
========================= */
function normDist(d){
  if(d===undefined) return .5;
  const c=Math.max(-2.5,Math.min(2.5,d));
  return (c+2.5)/5;
}

function normGap(g){
  if(!g) return .5;
  const c=Math.max(-10,Math.min(10,g));
  return (c+10)/20;
}

/* =========================
描画
========================= */
function renderTable(winOdds,winRank,gapRank,himoStars,distortions){

  tableBody.innerHTML="";

  const rows=[];

  /* ---- まず全頭スコア算出 ---- */
  for(let i=0;i<18;i++){
    const horse=i+1;
    const odds=winOdds[i];
    if(odds===null) continue;

    const wRank=winRank[i];
    const himo=himoStars[horse]||0;
    const d=distortions[horse];

    const distNorm=normDist(d);
    const himoNorm=himo/5;

    const dRank=gapRank[horse];
    const gap=(dRank&&wRank)?(wRank-dRank):0;
    const gapNorm=normGap(gap);

    const renkaExpect=himoNorm-distNorm;
    const renkaNorm=Math.max(0,Math.min(1,(renkaExpect+1)/2));

    const finalScore=
      distNorm*0.4+
      himoNorm*0.4+
      renkaNorm*0.6+
      gapNorm*0.3;

    rows.push({
      horse,odds,wRank,himo,d,
      finalScore,
      renkaExpect
    });
  }

  /* ---- スコア順位 ---- */
  rows.sort((a,b)=>b.finalScore-a.finalScore);
  rows.forEach((r,i)=>r.scoreRank=i+1);

  /* ---- 表示順を馬番順に戻す ---- */
  rows.sort((a,b)=>a.horse-b.horse);

  /* ---- 描画 ---- */
  rows.forEach(r=>{

    const display=Math.round(r.finalScore*100);
    const gap=r.wRank-r.scoreRank;
    const barW=display;

    const isHot=r.d!==undefined&&r.d<=-1.5&&r.himo>=3;
    const isWarn=r.d!==undefined&&Math.abs(r.d)>=2.2;

    let barClass="bar-mid";

    const barOpacity=0.15 + (display/100)*0.85;

    

    tableBody.innerHTML+=`
      <tr class="horse-row">

        <td>${r.horse}</td>

        <td class="judge-cell">
          <div class="judge-row">

            <div class="fire">
              ${isWarn?"⚠️":""}${isHot?"🔥":""}
            </div>

            <div class="distort-wrap">
              <div class="distort-bar"
                style="
                  left:0;
                  width:${barW}%;
                  opacity:${barOpacity};
                ">
              </div>
            </div>

          </div>

          <div class="stars s${r.himo}">
            ${"★".repeat(r.himo)}${"☆".repeat(5-r.himo)}

            <span class="renka ${r.renkaExpect>=0.25?"renka-hot":""}">
              (${r.renkaExpect.toFixed(2)})
            </span>
          </div>
        </td>

        <td>
          ${display}
          <span class="gap">
            (${gap>=0?"+":""}${gap})
          </span>
        </td>

        <td>
          ${r.odds.toFixed(1)} (${r.wRank})
        </td>

      </tr>
    `;
  });
}