/* ==========================================================================
   THE ACCOUNTABILITY LEDGER renderer.
   Case records live in ../data/cases.json and are loaded as read-only content.
   ========================================================================== */
let DATA = [];
let READER_SOURCES = {};
const { classify, tierMeta } = window.SourceUtils ?? { classify: () => 2, tierMeta: () => ({ short: "T2", name: "Reporting", hint: "" }) };
/** Falls back to the key's English when i18n has not loaded. */
const t = (key, vars) => window.LedgerI18n?.t(key, vars) ?? "";
/** Case title/stamp/category in the active language, English if untranslated. */
const caseField = (caseFile, field) => window.LedgerI18n?.caseField(caseFile, field) ?? caseFile?.[field] ?? "";
const category = (name) => window.LedgerI18n?.category(name) ?? name;

function sourceChip(source, { reader = false } = {}) {
  if (source.todo) {
    return `<span class="src todo">${escapeHTML(source.label)} &middot; ${escapeHTML(t("src_needed"))}</span>`;
  }
  const tier = source.tier ?? classify(source.url) ?? 2;
  const meta = tierMeta(tier);
  const archive = source.archiveUrl
    ? `<a class="src-archive" href="${safeURL(source.archiveUrl)}" target="_blank" rel="nofollow noopener noreferrer" title="Archived copy">${escapeHTML(t("src_archive"))}</a>`
    : "";
  const readerNote = reader ? `<small>${escapeHTML(t("src_reader"))}</small>` : "";
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

/**
 * Sort orders. Date is always answerable; cost and death toll are not, because
 * only the cases carrying an explicit estimate have a number to sort on. Those
 * without one are never allowed to win "lowest" by default — an unmeasured case
 * is not a cheap case — so they sink to the bottom of every figure-based order
 * and the date decides between them.
 */
const figure=(d,field)=>{const v=Number(d.estimates?.[field]);return Number.isFinite(v)&&v>0?v:null;};
function byFigure(field,direction){
  return (a,b)=>{
    const x=figure(a,field), y=figure(b,field);
    if(x===null&&y===null) return b.sk-a.sk;
    if(x===null) return 1;
    if(y===null) return -1;
    return x===y ? b.sk-a.sk : (direction==="desc" ? y-x : x-y);
  };
}
/**
 * Dates are not unique — two cases carry "Jun 2026" — so a bare sk comparison
 * leaves ties in whatever order the file happens to hold. Every chronological
 * sort on the site uses this one comparator so the numbering, the ledger order
 * and the build all agree. Mirrors generate_pages.mjs.
 */
const caseKey=(d)=>text(d.id??`case-${d.no}`);
const byDateThenId=(a,b)=>(a.sk-b.sk)||caseKey(a).localeCompare(caseKey(b));

const SORTS={
  desc:(a,b)=>-byDateThenId(a,b),
  asc:byDateThenId,
  "cost-desc":byFigure("costInrCrore","desc"),
  "cost-asc":byFigure("costInrCrore","asc"),
  "deaths-desc":byFigure("deaths","desc"),
  "deaths-asc":byFigure("deaths","asc"),
};
const FIGURE_SORTS=new Map([
  ["cost-desc","costInrCrore"],["cost-asc","costInrCrore"],
  ["deaths-desc","deaths"],["deaths-asc","deaths"],
]);
const $=s=>document.querySelector(s);
const timeline=$("#timeline"), emptyEl=$("#empty"), catchips=$("#catchips");
const richTextTags=new Set(["B","EM"]);
const text=value=>String(value??"");
const escapeHTML=value=>text(value).replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));

function readUrlState(){
  const params=new URLSearchParams(location.search);
  state.q=params.get("q")??"";
  state.cats=new Set((params.get("categories")??"").split(",").filter(Boolean));
  state.sort=SORTS[params.get("sort")]?params.get("sort"):"desc";
  const year=Number(params.get("year"));
  state.year=Number.isInteger(year)&&year>0?year:null;
  $("#search").value=state.q;
  $("#sort").value=state.sort;
}

function syncUrl({caseId}={}){
  const url=new URL(location.href);
  state.q?url.searchParams.set("q",state.q):url.searchParams.delete("q");
  state.cats.size?url.searchParams.set("categories",[...state.cats].sort().join(",")):url.searchParams.delete("categories");
  state.sort==="desc"?url.searchParams.delete("sort"):url.searchParams.set("sort",state.sort);
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

const SU=window.SourceUtils;

/** Indian units lead; the dollar/million reading is the one you hover or tap for. */
function docketFigure(primary,alternate){
  if(!primary) return "--";
  return SU?.figure ? SU.figure(`≈${primary}`,alternate) : `≈${primary}`;
}

/**
 * Who actually left office over something on this ledger, counted from the
 * record rather than asserted. A person is counted once however many cases
 * name them. The split at 2014 is the whole point of publishing the number:
 * it is only damning because it is arrived at honestly.
 */
function resignationTally(){
  const union=new Map();
  DATA.forEach(d=>(d.resignations??[]).forEach(r=>{
    if(r&&r.level==="union"&&r.n) union.set(r.n,Number(r.year)||0);
  }));
  const years=[...union.values()];
  return {total:union.size,since2014:years.filter(y=>y>=2014).length,before:years.filter(y=>y<2014).length};
}

function renderResignationRecord(){
  const node=$("#record-resigned");
  if(!node) return;
  const {total,since2014,before}=resignationTally();
  if(total===0){ node.hidden=true; return; }
  node.hidden=false;
  node.innerHTML=`<span class="standing-record-num">${since2014}</span>`
    +`<span>${escapeHTML(t(since2014===1?"standing_resigned_one":"standing_resigned",{since:since2014,before}))}</span>`
    +`<a href="./dashboard/">${escapeHTML(t("standing_resigned_cta"))}</a>`;
}

function setupControls(){
  computeRanks();
  CATS=[...new Set(DATA.map(d=>d.cat))].sort();
  const estimates=totalEstimates();
  $("#stat-total").textContent=DATA.length;
  $("#stat-resigned").textContent=resignationTally().total;
  renderResignationRecord();
  $("#stat-cost").innerHTML=docketFigure(SU?.formatCrore(estimates.costInrCrore),SU?.croreToUsd(estimates.costInrCrore));
  $("#stat-toll").innerHTML=docketFigure(SU?.formatPeople(estimates.deaths),SU?.peopleToInternational(estimates.deaths));
  catchips.replaceChildren();
  CATS.forEach(c=>{
    const b=document.createElement("button");
    // Label is translated; the filter value stays the English category so URLs
    // and shared links keep working across a language switch.
    b.className="chip cat"; b.textContent=category(c); b.setAttribute("aria-pressed",state.cats.has(c));
    b.onclick=()=>{ state.cats.has(c)?state.cats.delete(c):state.cats.add(c);
      b.setAttribute("aria-pressed",state.cats.has(c)); syncUrl({caseId:null}); render(); };
    catchips.appendChild(b);
  });
}
$("#search").addEventListener("input",e=>{state.q=e.target.value.toLowerCase().trim();syncUrl({caseId:null});render();});
$("#sort").addEventListener("change",e=>{state.sort=e.target.value;syncUrl({caseId:null});render();});

const estTag=()=>`<span class="est">${escapeHTML(t("est"))}</span>`;
function metric(k,o){return `<div class="metric"><div class="mk">${escapeHTML(k)}${o.est?estTag():""}</div><div class="mv">${safeRichText(o.v)}</div></div>`;}

/**
 * Display numbers, oldest first, derived from the date on every render. The `no`
 * field is the order cases were added to the file, not their place in time — the
 * oldest case on the ledger carries no=63 — so it is not shown anywhere.
 * Identity stays with `id`, which never moves. Mirrors displayNumbers() in
 * scripts/generate_pages.mjs.
 */
let RANKS=new Map();
function computeRanks(){
  RANKS=new Map();
  [...DATA].sort(byDateThenId).forEach((d,i)=>RANKS.set(text(d.id??`case-${d.no}`),i+1));
}

function card(d){
  const severity=d.sev==="amber"?"amber":"red";
  const caseId=text(d.id??`case-${d.no}`).replace(/[^a-zA-Z0-9_-]/g,"");
  const number=RANKS.get(caseId)??0;
  const bodyId=`details-${caseId}`;
  const props=d.ministers.map(m=>`<div class="prop"><small>${escapeHTML(m.r)}</small><b>${escapeHTML(m.n)}</b></div>`).join("");
  const reader=READER_SOURCES[caseId]??[];
  const srcs = d.sources.map((s) => sourceChip(s))
    .concat(reader.map((s) => sourceChip(s, { reader: true })))
    .join("");
  // The English title goes to the suggest form: the review queue works in English.
  const suggestHref=`./corrections/?case=${encodeURIComponent(caseId)}&title=${encodeURIComponent(d.title)}#sources`;
  const readerNote=reader.length?` &middot; ${reader.length} ${escapeHTML(t("sources_reader_note"))}`:"";
  const alleg=d.alleg?`<div class="field alleg"><div class="k">${escapeHTML(t("field_alleged"))}</div><div class="v">${safeRichText(d.alleg)}</div></div>`:"";
  // The government's own answer, set against what followed. Both columns carry
  // equal weight so a reader can side with the left one if the record allows it.
  const h2h=d.pos?`<div class="field"><div class="k">${escapeHTML(t("h2h_heading"))}</div><div class="v"><div class="h2h-grid">
        <div class="h2h-side h2h-said"><p class="h2h-label">${escapeHTML(t("h2h_said"))}</p><p class="h2h-body">${safeRichText(d.pos)}</p></div>
        <div class="h2h-side h2h-record"><p class="h2h-label">${escapeHTML(t("h2h_record"))}</p><p class="h2h-verdict">${escapeHTML(caseField(d,"stamp"))}</p><p class="h2h-body">${safeRichText(d.dodge)}</p></div>
      </div></div></div>`:"";
  return `
  <article class="file sev-${severity}" id="case-${caseId}" data-case-id="${escapeHTML(caseId)}" data-cat="${escapeHTML(d.cat)}">
    <div class="filehead" role="button" tabindex="0" aria-controls="${bodyId}" aria-expanded="false">
      <div class="caseno">No.<span class="n">${escapeHTML(String(number).padStart(2,"0"))}</span></div>
      <div class="headmid"><div class="cat">${escapeHTML(category(d.cat))}</div><h3>${escapeHTML(caseField(d,"title"))}</h3><div class="date">${escapeHTML(d.date)}</div></div>
      <div class="stamp ${severity==="amber"?"amber":""}">${escapeHTML(caseField(d,"stamp"))}</div>
    </div>
    <div class="metrics">
      ${metric(t("card_human"),d.human)}
      ${metric(t("card_cost"),d.cost)}
      <div class="metric"><div class="mk">${escapeHTML(t("card_ministers"))}</div><div class="mv">${escapeHTML(d.ministers.map(m=>m.n).join(" · "))}</div></div>
    </div>
    <div class="case-actions">
      <button class="expandbar" type="button" aria-controls="${bodyId}" aria-expanded="false">${escapeHTML(t("card_open"))}</button>
      <button class="case-share" type="button" data-share-case="${escapeHTML(caseId)}" data-share-title="${escapeHTML(caseField(d,"title"))}">${escapeHTML(t("card_share"))}</button>
      <a class="case-share act" href="./rti/?case=${encodeURIComponent(caseId)}">${escapeHTML(t("card_rti"))}</a>
    </div>
    <div class="filebody" id="${bodyId}" aria-hidden="true"><div class="filebody-inner">
      <div class="field"><div class="k">${escapeHTML(t("field_what"))}</div><div class="v">${safeRichText(d.what)}</div></div>
      ${h2h}
      <div class="field"><div class="k">${escapeHTML(t("field_ministers"))}</div><div class="v"><div class="propchips">${props}</div></div></div>
      ${alleg}
      <div class="field alt"><div class="k">${escapeHTML(t("field_alt"))}</div><div class="v">${safeRichText(d.alt)}</div></div>
      <div class="field"><div class="k">${escapeHTML(t("field_sources"))}${readerNote}</div><div class="v"><p class="source-legend"><span class="tier-badge tier-1">T1</span> ${escapeHTML(t("tier_legend_1"))} · <span class="tier-badge tier-2">T2</span> ${escapeHTML(t("tier_legend_2"))} · <span class="tier-badge tier-3">T3</span> ${escapeHTML(t("tier_legend_3"))}</p><div class="sources">${srcs}</div>
        <a class="suggest-source" href="${suggestHref}">${escapeHTML(t("suggest_source_cta"))}</a>
      </div></div>
      <p class="case-permalink"><a href="./case/${encodeURIComponent(caseId)}/">${escapeHTML(t("card_permalink"))}</a></p>
    </div></div>
  </article>`;
}

function render(){
  let rows=DATA.filter(d=>{
    if(state.cats.size && !state.cats.has(d.cat)) return false;
    if(state.year && d.year!==state.year) return false;
    if(state.q){
      // Both languages are searchable, so a Hindi reader can search what they see.
      const hay=(d.title+" "+d.cat+" "+d.what+" "+d.dodge+" "+d.ministers.map(m=>m.n).join(" ")
        +" "+caseField(d,"title")+" "+caseField(d,"stamp")+" "+category(d.cat)).toLowerCase();
      if(!hay.includes(state.q)) return false;
    }
    return true;
  });
  rows.sort(SORTS[state.sort]??SORTS.desc);
  const base = rows.length===DATA.length
    ? t("count_all",{n:DATA.length})
    : t("count_some",{n:rows.length,total:DATA.length});
  const field = FIGURE_SORTS.get(state.sort);
  const ranked = field ? rows.filter(d=>figure(d,field)!==null).length : 0;
  $("#count").textContent = field
    ? `${base}. ${t(field==="deaths"?"count_ranked_deaths":"count_ranked_cost",{n:ranked,total:rows.length-ranked})}`
    : base;
  emptyEl.hidden = rows.length>0;
  emptyEl.textContent = t("empty_msg");

  // Year dividers are only honest for a chronological sort. Bucketing a cost
  // ranking by year silently re-orders it — the second most expensive case in
  // the country ends up below every other case that shares a year with the
  // first — so a figure sort renders one flat list instead.
  if(FIGURE_SORTS.has(state.sort)){
    timeline.innerHTML=`<section>${rows.map(card).join("")}</section>`;
  }else{
    const seen=new Map(); const order=[];
    rows.forEach(d=>{ if(!seen.has(d.year)){seen.set(d.year,[]);order.push(d.year);} seen.get(d.year).push(d); });
    timeline.innerHTML=order.map(y=>{
      const items=seen.get(y).map(card).join("");
      const n=seen.get(y).length;
      const logged=n===1?t("cases_logged_one"):t("cases_logged_many",{n});
      return `<section id="year-${y}"><div class="yearmark"><a class="y year-link" href="?year=${y}" aria-label="Show cases from ${y}">${y}</a><span class="r"></span><span class="c">${escapeHTML(logged)}</span></div>${items}</section>`;
    }).join("");
  }

  timeline.querySelectorAll(".file").forEach(f=>{
    const head=f.querySelector(".filehead"), bar=f.querySelector(".expandbar");
    const body=f.querySelector(".filebody");
    const toggle=()=>{ const open=f.classList.toggle("open"); head.setAttribute("aria-expanded",open); bar.setAttribute("aria-expanded",open); body.setAttribute("aria-hidden",!open); bar.textContent= open ? t("card_close") : t("card_open"); syncUrl({caseId:open?f.dataset.caseId:null}); };
    head.addEventListener("click",toggle);
    head.addEventListener("keydown",e=>{ if(e.key==="Enter"||e.key===" "){e.preventDefault();toggle();} });
    bar.addEventListener("click",toggle);
  });
  // Share used to open the raw OG SVG in a tab. On a phone that renders at its
  // intrinsic 1200px with no scaling, so the reader got the top-left corner of
  // the card blown up. The SVG is a crawler asset; it was never a destination.
  // What people actually want is to send the case to someone, so hand the link
  // to the OS share sheet and fall back to the clipboard where there is none.
  timeline.querySelectorAll(".case-share[data-share-case]").forEach(button=>button.addEventListener("click",async()=>{
    const shareUrl=new URL(`./case/${encodeURIComponent(button.dataset.shareCase)}/`,location.href);
    const title=button.dataset.shareTitle||"";
    if(navigator.share){
      try{
        await navigator.share({title,text:title,url:shareUrl.href});
        return;
      }catch(error){
        // AbortError is the reader dismissing the sheet, not a failure.
        if(error?.name==="AbortError") return;
      }
    }
    try{
      await navigator.clipboard.writeText(shareUrl.href);
      button.textContent=t("card_copied");
      setTimeout(()=>{button.textContent=t("card_share");},2500);
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

window.LedgerI18n?.setCaseStringsBase("./");

async function loadCases(){
  timeline.setAttribute("aria-busy","true");
  try{
    const response=await fetch("./assets/data/cases.json",{cache:"no-cache"});
    if(!response.ok) throw new Error(`Could not load cases: ${response.status}`);
    const cases=await response.json();
    if(!Array.isArray(cases)) throw new TypeError("Case data must be an array");
    const [published,readerSources]=await Promise.all([
      loadPublishedCases(),loadReaderSources(),window.LedgerI18n?.ensureCaseStrings(),
    ]);
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

// Case cards are built in JS, so a language switch has to redraw them.
// setupControls too, so the category chips and docket figures re-translate.
document.addEventListener("ledger:langchange",()=>{ if(DATA.length){ setupControls(); render(); } });

loadCases();
