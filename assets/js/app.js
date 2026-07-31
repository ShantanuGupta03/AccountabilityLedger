/* ==========================================================================
   THE ACCOUNTABILITY LEDGER renderer.
   Case records live in ../data/cases.json and are loaded as read-only content.
   ========================================================================== */
let DATA = [];
let READER_SOURCES = {};
const { classify, tierMeta } = window.SourceUtils ?? { classify: () => 2, tierMeta: () => ({ short: "T2", name: "Reporting", hint: "" }) };

function sourceChip(source, { reader = false } = {}) {
  if (source.todo) {
    return `<span class="src todo">${escapeHTML(source.label)} &middot; source needed</span>`;
  }
  const tier = source.tier ?? classify(source.url) ?? 2;
  const meta = tierMeta(tier);
  const archive = source.archiveUrl
    ? `<a class="src-archive" href="${safeURL(source.archiveUrl)}" target="_blank" rel="nofollow noopener noreferrer" title="Archived copy">Archive</a>`
    : "";
  const readerNote = reader ? `<small>added by a reader</small>` : "";
  const rel = reader ? "nofollow ugc noopener noreferrer" : "noopener noreferrer";
  return `<span class="source-wrap tier-${tier}${reader ? " reader" : ""}">
    <a class="src" href="${safeURL(source.url)}" target="_blank" rel="${rel}" title="${escapeHTML(meta.hint)}">
      <span class="tier-badge" aria-label="${escapeHTML(meta.name)}">${escapeHTML(meta.short)}</span>
      ${escapeHTML(source.label)} &#8599;${readerNote}
    </a>${archive}
  </span>`;
}

/* ---------- render ---------- */
let CATS=[];
const state={q:"",cats:new Set(),sort:"desc",year:null};
const $=s=>document.querySelector(s);
const timeline=$("#timeline"), emptyEl=$("#empty"), catchips=$("#catchips");
const richTextTags=new Set(["B","EM"]);
const text=value=>String(value??"");
const escapeHTML=value=>text(value).replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));

function readUrlState(){
  const params=new URLSearchParams(location.search);
  state.q=params.get("q")??"";
  state.cats=new Set((params.get("categories")??"").split(",").filter(Boolean));
  state.sort=params.get("sort")==="asc"?"asc":"desc";
  const year=Number(params.get("year"));
  state.year=Number.isInteger(year)&&year>0?year:null;
  $("#search").value=state.q;
  $("#sort").value=state.sort;
}

function syncUrl({caseId}={}){
  const url=new URL(location.href);
  state.q?url.searchParams.set("q",state.q):url.searchParams.delete("q");
  state.cats.size?url.searchParams.set("categories",[...state.cats].sort().join(",")):url.searchParams.delete("categories");
  state.sort==="asc"?url.searchParams.set("sort","asc"):url.searchParams.delete("sort");
  state.year?url.searchParams.set("year",state.year):url.searchParams.delete("year");
  if(caseId===null) url.searchParams.delete("case");
  if(caseId) url.searchParams.set("case",caseId);
  history.replaceState({}, "", url);
}

function safeRichText(value){
  const template=document.createElement("template");
  template.innerHTML=text(value);
  template.content.querySelectorAll("*").forEach(element=>{
    if(!richTextTags.has(element.tagName)){
      element.replaceWith(document.createTextNode(element.textContent??""));
      return;
    }
    [...element.attributes].forEach(attribute=>element.removeAttribute(attribute.name));
  });
  return template.innerHTML;
}

function safeURL(value){
  try{
    const url=new URL(text(value),window.location.origin);
    return ["http:","https:"].includes(url.protocol) ? escapeHTML(url.href) : "#";
  }catch{
    return "#";
  }
}

function totalEstimates(){
  return DATA.reduce((totals,caseFile)=>{
    const estimates=caseFile.estimates??{};
    const costInrCrore=Number(estimates.costInrCrore);
    const deaths=Number(estimates.deaths);
    if(Number.isFinite(costInrCrore)&&costInrCrore>0) totals.costInrCrore+=costInrCrore;
    if(Number.isFinite(deaths)&&deaths>0) totals.deaths+=deaths;
    return totals;
  },{costInrCrore:0,deaths:0});
}

function formatCostEstimate(costInrCrore){
  if(!costInrCrore) return "--";
  return costInrCrore>=100000
    ? `≈₹${(costInrCrore/100000).toFixed(2)}L cr`
    : `≈₹${Math.round(costInrCrore).toLocaleString("en-IN")} cr`;
}

function formatHumanToll(deaths){
  if(!deaths) return "--";
  return deaths>=1000000
    ? `≈${(deaths/1000000).toFixed(2)}M`
    : `≈${Math.round(deaths).toLocaleString("en-IN")}`;
}

function setupControls(){
  CATS=[...new Set(DATA.map(d=>d.cat))].sort();
  const estimates=totalEstimates();
  $("#stat-total").textContent=DATA.length;
  $("#stat-cost").textContent=formatCostEstimate(estimates.costInrCrore);
  $("#stat-toll").textContent=formatHumanToll(estimates.deaths);
  catchips.replaceChildren();
  CATS.forEach(c=>{
    const b=document.createElement("button");
    b.className="chip cat"; b.textContent=c; b.setAttribute("aria-pressed",state.cats.has(c));
    b.onclick=()=>{ state.cats.has(c)?state.cats.delete(c):state.cats.add(c);
      b.setAttribute("aria-pressed",state.cats.has(c)); syncUrl({caseId:null}); render(); };
    catchips.appendChild(b);
  });
}
$("#search").addEventListener("input",e=>{state.q=e.target.value.toLowerCase().trim();syncUrl({caseId:null});render();});
$("#sort").addEventListener("change",e=>{state.sort=e.target.value;syncUrl({caseId:null});render();});

const estTag=`<span class="est">Est</span>`;
function metric(k,o){return `<div class="metric"><div class="mk">${escapeHTML(k)}${o.est?estTag:""}</div><div class="mv">${safeRichText(o.v)}</div></div>`;}

function card(d){
  const severity=d.sev==="amber"?"amber":"red";
  const caseId=text(d.id??`case-${d.no}`).replace(/[^a-zA-Z0-9_-]/g,"");
  const bodyId=`details-${caseId}`;
  const props=d.ministers.map(m=>`<div class="prop"><small>${escapeHTML(m.r)}</small><b>${escapeHTML(m.n)}</b></div>`).join("");
  const reader=READER_SOURCES[caseId]??[];
  const srcs = d.sources.map((s) => sourceChip(s))
    .concat(reader.map((s) => sourceChip(s, { reader: true })))
    .join("");
  const sharePath = `./case/${encodeURIComponent(caseId)}/`;
  const suggestHref=`./suggest/?case=${encodeURIComponent(caseId)}&title=${encodeURIComponent(d.title)}`;
  const readerNote=reader.length?` &middot; ${reader.length} added by readers`:"";
  const alleg=d.alleg?`<div class="field alleg"><div class="k">Contested / alleged</div><div class="v">${safeRichText(d.alleg)}</div></div>`:"";
  const pos=d.pos?`<div class="field pos"><div class="k">The government's position</div><div class="v">${safeRichText(d.pos)}</div></div>`:"";
  return `
  <article class="file sev-${severity}" id="case-${caseId}" data-case-id="${escapeHTML(caseId)}" data-cat="${escapeHTML(d.cat)}">
    <div class="filehead" role="button" tabindex="0" aria-controls="${bodyId}" aria-expanded="false">
      <div class="caseno">No.<span class="n">${escapeHTML(String(d.no).padStart(2,"0"))}</span></div>
      <div class="headmid"><div class="cat">${escapeHTML(d.cat)}</div><h3>${escapeHTML(d.title)}</h3><div class="date">${escapeHTML(d.date)}</div></div>
      <div class="stamp ${severity==="amber"?"amber":""}">${escapeHTML(d.stamp)}</div>
    </div>
    <div class="metrics">
      ${metric("Human cost",d.human)}
      ${metric("Financial cost",d.cost)}
      <div class="metric"><div class="mk">Ministers responsible</div><div class="mv">${escapeHTML(d.ministers.map(m=>m.n).join(" · "))}</div></div>
    </div>
    <div class="case-actions">
      <button class="expandbar" type="button" aria-controls="${bodyId}" aria-expanded="false">Open the file  +</button>
      <button class="case-share" type="button" data-share-case="${escapeHTML(caseId)}">Copy link</button>
      <a class="case-share" href="${sharePath}">Share card</a>
    </div>
    <div class="filebody" id="${bodyId}" aria-hidden="true"><div class="filebody-inner">
      <div class="field"><div class="k">What happened</div><div class="v">${safeRichText(d.what)}</div></div>
      <div class="field dodge"><div class="k">The accountability failure</div><div class="v">${safeRichText(d.dodge)}</div></div>
      <div class="field"><div class="k">Ministers and office-holders responsible</div><div class="v"><div class="propchips">${props}</div></div></div>
      ${alleg}${pos}
      <div class="field alt"><div class="k">What accountability should have looked like</div><div class="v">${safeRichText(d.alt)}</div></div>
      <div class="field"><div class="k">Sources${readerNote}</div><div class="v"><p class="source-legend"><span class="tier-badge tier-1">T1</span> primary record · <span class="tier-badge tier-2">T2</span> reporting · <span class="tier-badge tier-3">T3</span> partisan</p><div class="sources">${srcs}</div>
        <a class="suggest-source" href="${suggestHref}">Know a source for this case? Add one &#8594;</a>
      </div></div>
    </div></div>
  </article>`;
}

function render(){
  let rows=DATA.filter(d=>{
    if(state.cats.size && !state.cats.has(d.cat)) return false;
    if(state.year && d.year!==state.year) return false;
    if(state.q){
      const hay=(d.title+" "+d.cat+" "+d.what+" "+d.dodge+" "+d.ministers.map(m=>m.n).join(" ")).toLowerCase();
      if(!hay.includes(state.q)) return false;
    }
    return true;
  });
  rows.sort((a,b)=> state.sort==="asc" ? a.sk-b.sk : b.sk-a.sk);
  $("#count").textContent = rows.length===DATA.length ? `Showing all ${DATA.length} logged cases` : `Showing ${rows.length} of ${DATA.length} cases`;
  emptyEl.hidden = rows.length>0;

  const seen=new Map(); const order=[];
  rows.forEach(d=>{ if(!seen.has(d.year)){seen.set(d.year,[]);order.push(d.year);} seen.get(d.year).push(d); });
  timeline.innerHTML=order.map(y=>{
    const items=seen.get(y).map(card).join("");
    const n=seen.get(y).length;
    return `<section id="year-${y}"><div class="yearmark"><a class="y year-link" href="?year=${y}" aria-label="Show cases from ${y}">${y}</a><span class="r"></span><span class="c">${n} case${n>1?"s":""} logged</span></div>${items}</section>`;
  }).join("");

  timeline.querySelectorAll(".file").forEach(f=>{
    const head=f.querySelector(".filehead"), bar=f.querySelector(".expandbar");
    const body=f.querySelector(".filebody");
    const toggle=()=>{ const open=f.classList.toggle("open"); head.setAttribute("aria-expanded",open); bar.setAttribute("aria-expanded",open); body.setAttribute("aria-hidden",!open); bar.textContent= open ? "Close the file  -" : "Open the file  +"; syncUrl({caseId:open?f.dataset.caseId:null}); };
    head.addEventListener("click",toggle);
    head.addEventListener("keydown",e=>{ if(e.key==="Enter"||e.key===" "){e.preventDefault();toggle();} });
    bar.addEventListener("click",toggle);
  });
  timeline.querySelectorAll(".case-share[data-share-case]").forEach(button=>button.addEventListener("click",async()=>{
    const shareUrl=new URL(`./case/${encodeURIComponent(button.dataset.shareCase)}/`,location.href);
    try{
      await navigator.clipboard.writeText(shareUrl.href);
      button.textContent="Link copied";
    }catch{
      window.prompt("Copy this case link:",shareUrl.href);
    }
  }));
  const linkedCase=new URLSearchParams(location.search).get("case");
  if(linkedCase){
    const target=[...timeline.querySelectorAll(".file")].find(file=>file.dataset.caseId===linkedCase);
    if(target&&!target.classList.contains("open")){
      target.querySelector(".filehead").click();
      target.scrollIntoView({block:"start"});
    }
  }
  observe();
}

let io;
function observe(){
  if(io) io.disconnect();
  if(!("IntersectionObserver" in window)||window.matchMedia("(prefers-reduced-motion: reduce)").matches){
    timeline.querySelectorAll(".file").forEach(f=>f.classList.add("in")); return;
  }
  io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add("in");io.unobserve(e.target);}}),{threshold:.1});
  timeline.querySelectorAll(".file").forEach(f=>io.observe(f));
}

function normalizeCases(staticCases,publishedCases){
  const base=staticCases.map(caseFile=>({...caseFile,id:caseFile.id??`case-${caseFile.no}`}));
  let nextNo=Math.max(0,...base.map(caseFile=>Number(caseFile.no)||0));
  const published=publishedCases
    .filter(caseFile=>caseFile&&typeof caseFile==="object")
    .map(caseFile=>({...caseFile,id:caseFile.id??crypto.randomUUID(),no:caseFile.no??++nextNo}));
  return [...base,...published];
}

async function loadPublishedCases(){
  try{
    const response=await fetch("./api/cases",{cache:"no-cache"});
    if(!response.ok) return [];
    const payload=await response.json();
    return Array.isArray(payload.cases)?payload.cases:[];
  }catch{
    return [];
  }
}

async function loadReaderSources(){
  try{
    const response=await fetch("./api/case-sources",{cache:"no-cache"});
    if(!response.ok) return {};
    const payload=await response.json();
    return payload.sources&&typeof payload.sources==="object"?payload.sources:{};
  }catch{
    return {};
  }
}

async function loadCases(){
  timeline.setAttribute("aria-busy","true");
  try{
    const response=await fetch("./assets/data/cases.json",{cache:"no-cache"});
    if(!response.ok) throw new Error(`Could not load cases: ${response.status}`);
    const cases=await response.json();
    if(!Array.isArray(cases)) throw new TypeError("Case data must be an array");
    const [published,readerSources]=await Promise.all([loadPublishedCases(),loadReaderSources()]);
    READER_SOURCES=readerSources;
    DATA=normalizeCases(cases,published);
    readUrlState();
    setupControls();
    render();
  }catch(error){
    console.error("Unable to load case data",error);
    timeline.replaceChildren();
    emptyEl.hidden=false;
    emptyEl.textContent="The case file could not be loaded. Please try again later.";
    $("#count").textContent="Case records unavailable";
  }finally{
    timeline.removeAttribute("aria-busy");
  }
}
loadCases();
