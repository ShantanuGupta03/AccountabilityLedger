/* ==========================================================================
   THE ACCOUNTABILITY LEDGER renderer.
   Case records live in ../data/cases.json and are loaded as read-only content.
   ========================================================================== */
let DATA = [];

/* ---------- render ---------- */
let CATS=[];
const state={q:"",cats:new Set(),sort:"desc"};
const $=s=>document.querySelector(s);
const timeline=$("#timeline"), emptyEl=$("#empty"), catchips=$("#catchips");
const richTextTags=new Set(["B","EM"]);
const text=value=>String(value??"");
const escapeHTML=value=>text(value).replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));

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

function setupControls(){
  CATS=[...new Set(DATA.map(d=>d.cat))].sort();
  state.cats.clear();
  $("#stat-total").textContent=DATA.length;
  $("#stat-cats").textContent=CATS.length;
  catchips.replaceChildren();
  CATS.forEach(c=>{
    const b=document.createElement("button");
    b.className="chip cat"; b.textContent=c; b.setAttribute("aria-pressed","false");
    b.onclick=()=>{ state.cats.has(c)?state.cats.delete(c):state.cats.add(c);
      b.setAttribute("aria-pressed",state.cats.has(c)); render(); };
    catchips.appendChild(b);
  });
}
$("#search").addEventListener("input",e=>{state.q=e.target.value.toLowerCase().trim();render();});
$("#sort").addEventListener("change",e=>{state.sort=e.target.value;render();});

const estTag=`<span class="est">Est</span>`;
function metric(k,o){return `<div class="metric"><div class="mk">${escapeHTML(k)}${o.est?estTag:""}</div><div class="mv">${safeRichText(o.v)}</div></div>`;}

function card(d){
  const severity=d.sev==="amber"?"amber":"red";
  const bodyId=`case-${text(d.no).replace(/[^a-zA-Z0-9_-]/g,"")}`;
  const props=d.ministers.map(m=>`<div class="prop"><small>${escapeHTML(m.r)}</small><b>${escapeHTML(m.n)}</b></div>`).join("");
  const srcs=d.sources.map(s=>s.todo
    ? `<span class="src todo">${escapeHTML(s.label)}, add link</span>`
    : `<a class="src" href="${safeURL(s.url)}" target="_blank" rel="noopener noreferrer">${escapeHTML(s.label)} &#8599;</a>`).join("");
  const alleg=d.alleg?`<div class="field alleg"><div class="k">Contested / alleged</div><div class="v">${safeRichText(d.alleg)}</div></div>`:"";
  const pos=d.pos?`<div class="field pos"><div class="k">The government's position</div><div class="v">${safeRichText(d.pos)}</div></div>`:"";
  return `
  <article class="file sev-${severity}" data-cat="${escapeHTML(d.cat)}">
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
    <button class="expandbar" type="button" aria-controls="${bodyId}" aria-expanded="false">Open the file  +</button>
    <div class="filebody" id="${bodyId}" aria-hidden="true"><div class="filebody-inner">
      <div class="field"><div class="k">What happened</div><div class="v">${safeRichText(d.what)}</div></div>
      <div class="field dodge"><div class="k">The accountability failure</div><div class="v">${safeRichText(d.dodge)}</div></div>
      <div class="field"><div class="k">Ministers and office-holders responsible</div><div class="v"><div class="propchips">${props}</div></div></div>
      ${alleg}${pos}
      <div class="field alt"><div class="k">What accountability should have looked like</div><div class="v">${safeRichText(d.alt)}</div></div>
      <div class="field"><div class="k">Sources, verify before publishing</div><div class="v"><div class="sources">${srcs}</div></div></div>
    </div></div>
  </article>`;
}

function render(){
  let rows=DATA.filter(d=>{
    if(state.cats.size && !state.cats.has(d.cat)) return false;
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
    return `<section><div class="yearmark"><span class="y">${y}</span><span class="r"></span><span class="c">${n} case${n>1?"s":""} logged</span></div>${items}</section>`;
  }).join("");

  timeline.querySelectorAll(".file").forEach(f=>{
    const head=f.querySelector(".filehead"), bar=f.querySelector(".expandbar");
    const body=f.querySelector(".filebody");
    const toggle=()=>{ const open=f.classList.toggle("open"); head.setAttribute("aria-expanded",open); bar.setAttribute("aria-expanded",open); body.setAttribute("aria-hidden",!open); bar.textContent= open ? "Close the file  -" : "Open the file  +"; };
    head.addEventListener("click",toggle);
    head.addEventListener("keydown",e=>{ if(e.key==="Enter"||e.key===" "){e.preventDefault();toggle();} });
    bar.addEventListener("click",toggle);
  });
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
async function loadCases(){
  timeline.setAttribute("aria-busy","true");
  try{
    const response=await fetch("./assets/data/cases.json",{cache:"no-cache"});
    if(!response.ok) throw new Error(`Could not load cases: ${response.status}`);
    const cases=await response.json();
    if(!Array.isArray(cases)) throw new TypeError("Case data must be an array");
    DATA=cases;
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
