/* Utvidelser: egen mølleøkt med startside, flytting av logg, Android-appen (Netflix-modus, pulsfelt, puls, tale) */
(()=>{
const AB=window.AndroidBridge||null;
window.NATIVE=!!AB;
const APK="https://github.com/isfjording/trening/releases/download/app-latest/trening.apk";
const APPS=[["com.netflix.mediaclient","Netflix"],["no.nrk.tv","NRK TV"],["no.tv2.sumo","TV 2 Play"],["com.google.android.youtube","YouTube"],["com.disney.disneyplus","Disney+"],["com.wbd.stream","Max"],["com.viaplay.android","Viaplay"]];
const info=()=>{try{return JSON.parse(AB.info())}catch(e){return {}}};
const appName=p=>(APPS.find(a=>a[0]===p)||[0,"strømmeappen"])[1];

/* ---------- Egen mølleøkt: åpnes med startside ---------- */
const freeW=()=>({id:"X-"+Date.now(),date:todayStr(),type:"X",title:"Egen økt på mølla",free:true,steps:[{kind:"run",label:"Egen økt",dur:4*3600,incline:1,speed:8}]});
const _rh=renderHome;
renderHome=function(){_rh.apply(this,arguments);const fb=$("#freebtn");if(fb)fb.onclick=()=>{S.cur=freeW();S.view="detail";render();window.scrollTo(0,0)}};

function relabelTv(){
  const l=app.querySelector('label[for="t-tv"]');if(!l)return;
  if(AB){l.querySelector("strong").textContent="Netflix-modus";l.querySelector(".muted").textContent="Netflix eller en annen strømmeapp spiller når skjermen dempes, med puls og tid i et lite felt. Den pauses og appen vises 10 sek før hvert stegbytte"}
  const i=$("#t-tv");if(i)i.addEventListener("change",()=>{if(S.view==="detail"&&!player)render()});
}
const _rd=renderDetail;
renderDetail=function(){
  _rd.apply(this,arguments);
  const w=S.cur;if(!w||S.view!=="detail")return;
  if(w.free){
    const st=app.querySelector(".steps");if(st)st.outerHTML=`<div class="banner">Tida teller oppover til du avslutter. Juster farten med + og − underveis. Økta logges som «Egen økt».</div>`;
    app.querySelectorAll(".wrap>.muted").forEach(m=>{if(/Totalt/.test(m.textContent))m.remove()});
    app.querySelectorAll(".wrap>.banner").forEach(b=>{if(/Trykk start på klokka/.test(b.textContent))b.textContent="Trykk start på klokka samtidig («Tredemølle»)."});
    const s=$("#start");if(s)s.textContent="Start økta";
  }
  relabelTv();
  if(AB&&w.type!=="B"&&S.settings.tvMode)tvCard();
};
function tvCard(){
  const card=app.querySelector(".wrap>.card");if(!card)return;
  const I=info();const apps=APPS.filter(a=>I.apps&&I.apps[a[0]]);
  if(!apps.some(a=>a[0]===S.settings.tvApp)&&apps.length){S.settings.tvApp=apps[0][0];saveSettings()}
  const nm=appName(S.settings.tvApp);
  let h=`<div class="card" id="tvcard"><strong>Netflix-modus</strong>`;
  if(!I.overlay)h+=`<div class="banner" style="color:var(--z4)">Gi appen lov til å vises over andre apper, ellers vises ikke pulsfeltet over ${esc(nm)}.</div><button class="btn primary" id="permov">Tillat visning over andre apper</button>`;
  if(!I.media)h+=`<div class="muted" style="font-size:14px">Anbefalt: gi appen varseltilgang, så pauser og starter den ${esc(nm)} mer pålitelig.</div><button class="btn" id="permmd">Gi tilgang til avspillingsstyring</button>`;
  if(apps.length){
    h+=(apps.length>1?`<label class="muted" for="tvapp" style="font-size:14px">Strømmeapp</label><select id="tvapp" class="btn">${apps.map(a=>`<option value="${a[0]}" ${a[0]===S.settings.tvApp?"selected":""}>${a[1]}</option>`).join("")}</select>`:"")
      +`<button class="btn wide" id="tvopen">Åpne ${esc(nm)} og velg hva du vil se</button><div class="muted" style="font-size:14px">Start det du vil se. Når det spiller, pauses det og du kommer tilbake hit av deg selv (eller trykk «Tilbake til økta»). Start så økta – når skjermen dempes etter 15 sek, fortsetter ${esc(nm)} med pulsstripen til høyre.</div>`;
  }else h+=`<div class="banner">Fant ingen strømmeapp (Netflix, NRK TV, YouTube …) på telefonen.</div>`;
  card.insertAdjacentHTML("afterend",h+`</div>`);
  const b1=$("#permov");if(b1)b1.onclick=()=>AB.requestOverlay();
  const b2=$("#permmd");if(b2)b2.onclick=()=>AB.requestMedia();
  const sel=$("#tvapp");if(sel)sel.onchange=()=>{S.settings.tvApp=sel.value;saveSettings();render()};
  const op=$("#tvopen");if(op)op.onclick=()=>AB.openApp(S.settings.tvApp);
}

/* ---------- Innstillinger: flytte loggen, lenke til Android-appen ---------- */
function importLogs(t){
  try{const arr=JSON.parse(t.slice(t.indexOf("\n")+1));let n=0;
    arr.forEach(o=>{if(o&&o.id&&!S.logs[o.id]){const l=Object.assign({},o);delete l.id;S.logs[o.id]=l;n++}});
    store.set(LS.logs,S.logs);toast(n+" økter er lagt inn i loggen.");return true}
  catch(e){toast("Fant ingen logg i teksten.");return false}
}
const _rs=renderSettings;
renderSettings=function(){
  _rs.apply(this,arguments);relabelTv();
  const imp=$("#imp");if(imp)imp.insertAdjacentHTML("beforebegin",`<div class="muted" style="font-size:14px">Du kan også lime inn en TRENINGSLOGG (fra «Kopier loggen») for å flytte loggen mellom nettleseren og appen.</div>`);
  const b=$("#impbtn");if(b)b.onclick=()=>{const v=$("#imp").value.trim();if(/^TRENINGSLOGG/.test(v)){if(importLogs(v)){S.view="home";render()}}else if(importWorkouts(v)){S.view="home";render()}};
  const c=[...app.querySelectorAll(".card")].find(x=>/Bluetooth og skjerm/.test(x.textContent));
  if(c){if(AB){const I=info();c.querySelector(".muted").textContent=`Android-appen ${I.v||""} · Pulsbelte, tale og «hold skjermen på» styres av appen.`}
    else c.insertAdjacentHTML("afterend",`<div class="card"><h2>Android-app</h2><div class="muted">Appen kan pause og starte Netflix automatisk og vise puls og tid i et lite felt over filmen. Last ned og installer filen på telefonen (tillat installasjon fra Chrome når telefonen spør).</div><a class="btn primary" href="${APK}">Last ned Android-appen</a></div>`)}
};

/* ---------- Apparatene på senteret (Life Fitness og Hammer Strength) ---------- */
Object.assign(EX,{
legext:{name:"Leg extension (Life Fitness)",en:"Leg Extension (Machine)",unit:"reps",rest:75,img:"Leg_Extensions",cues:["Kneleddet på linje med apparatets dreiepunkt","Rull opp til nesten strake bein, kort stopp","Senk sakte på 3 sek – det trener lårene for nedoverbakker","Hold rumpa i setet hele tiden"]},
legcurl:{name:"Leg curl (Life Fitness)",en:"Seated Leg Curl (Machine)",unit:"reps",rest:75,img:"Seated_Leg_Curl",cues:["Puten rett over hælene, lårputen godt ned","Bøy knærne så langt du kommer","Kort stopp, så rolig tilbake","Ikke løft hofta fra setet"]},
chin:{name:"Assisted chin (Life Fitness)",en:"Assisted Pull Up",unit:"reps",rest:90,img:"Chin-Up",cues:["Vekta du velger hjelper deg: mer vekt = lettere","Knærne på plattformen, grep litt bredere enn skuldrene","Trekk brystet opp mot håndtakene, skuldrene ned og bak","Senk kontrollert helt ned. Reduser hjelpen etter hvert"]},
mrow:{name:"Row (Hammer Strength)",en:"Iso-Lateral Row (Machine)",unit:"reps",rest:90,img:"Leverage_Iso_Row",cues:["Brystet mot puten, rak rygg","Trekk albuene bakover langs kroppen","Klem skulderbladene sammen et sekund","Strekk armene rolig ut igjen"]},
dip:{name:"Assisted dip (Life Fitness)",en:"Assisted Dip",unit:"reps",rest:90,img:"Parallel_Bar_Dip",cues:["Vekta du velger hjelper deg: mer vekt = lettere","Lett foroverlent, albuene bakover","Senk til ca. 90° i albuene – ikke dypere hvis skuldrene murrer","Press opp til nesten strake armer"]},
sideplank:{name:"Sideplanke",en:"Side Plank",unit:"sec",perSide:true,rest:45,img:"Side_Bridge",cues:["Albuen rett under skulderen","Rett linje fra hode til føtter","Løft hofta – ikke la den synke","Pust rolig. Lettere: knærne i gulvet"]}});
EX.legpress.name="Seated leg press (Life Fitness)";EX.stepup.name="Step-up på kasse (manualer)";
Object.assign(TEMPO,{legext:"1 sek opp, kort stopp, 3 sek ned",legcurl:"1 sek inn, kort stopp, 2 sek tilbake",chin:"1 sek opp, 2–3 sek ned",mrow:"1 sek inn, 1 sek stopp, 2 sek ut",dip:"2 sek ned, 1 sek opp",sideplank:"Hold hele tiden, bytt side"});
Object.assign(VQ,{legext:"leg extension machine proper form slow eccentric",legcurl:"seated leg curl machine form",chin:"assisted pull up machine form",mrow:"hammer strength iso lateral row form",dip:"assisted dip machine form",sideplank:"side plank proper form"});

/* ---------- Høydemeter på mølla: distanse × stigning ---------- */
const _tt=tickTread;tickTread=function(){const p=player,d0=p&&p.steps?p.dist:0;_tt.apply(this,arguments);if(p&&p.steps&&p.dist>d0)p.climb=(p.climb||0)+(p.dist-d0)*10*(p.inc!=null?p.inc:((p.step&&p.step.incline)||0))};
const _ut0=updTread;updTread=function(){_ut0.apply(this,arguments);const p=player;if(!p||!p.steps||!p.steps.some(s=>s.incline>0))return;const v=Math.round(p.climb||0)+"";
if(!$("#hm")){const t=app.querySelector(".player .tiles");if(t)t.insertAdjacentHTML("beforeend",`<div class="tile"><div class="k">Høydemeter ca.</div><div class="v tnum"><span id="hm">0</span><small>m</small></div></div>`)}
const h=$("#hm");if(h)h.textContent=v;
if(p.dim){if(!$("#dimhm")){const r=app.querySelector(".dimrow");if(r)r.insertAdjacentHTML("beforeend",`<div><div class="dimv tnum" id="dimhm"></div><div class="dimlbl">høydemeter</div></div>`)}const d=$("#dimhm");if(d)d.textContent=v}};
const _ft0=finishTread;finishTread=function(){const p=player;_ft0.apply(this,arguments);if(p&&p.steps&&S.pending&&p.climb>=1){S.pending.climbM=Math.round(p.climb);if(S.view==="summary")render()}};
const _rsum=renderSummary;renderSummary=function(){_rsum.apply(this,arguments);const l=S.pending;const t=app.querySelector(".tiles");if(l&&l.climbM&&t)t.insertAdjacentHTML("beforeend",`<div class="tile"><div class="k">Høydemeter ca.</div><div class="v" style="font-size:38px">${l.climbM}</div></div>`)};

/* ---------- Justerbar stigning og varsel 10 sek før slutt ---------- */
const _ss=setStep;setStep=function(i){const p=player;if(p&&p.steps&&p.steps[i])p.inc=p.steps[i].incline;_ss.apply(this,arguments)};
const _ut1=updTread;updTread=function(){_ut1.apply(this,arguments);const p=player;if(!p||!p.steps)return;
if(p.step.kind!=="hike"&&p.step.incline!=null){if(p.inc==null)p.inc=p.step.incline;let el=$("#inc");
if(!el){const tile=[...app.querySelectorAll(".player .tiles .tile")].find(t=>/Stigning/i.test((t.querySelector(".k")||{}).textContent||""));
if(tile){tile.querySelector(".v").innerHTML=`<span id="inc"></span><small>%</small>`;tile.insertAdjacentHTML("beforeend",`<div class="adj"><button id="im" aria-label="Senk stigningen 1 %">−</button><button id="ip" aria-label="Øk stigningen 1 %">+</button></div>`);
$("#im").onclick=()=>{p.inc=Math.max(0,Math.round(p.inc)-1);updTread()};$("#ip").onclick=()=>{p.inc=Math.min(15,Math.round(p.inc)+1);updTread()};el=$("#inc")}}
if(el)el.textContent=nb(p.inc)}
const left=p.step.dur-p.elapsedStep;
if(!p.w.free&&p.i===p.steps.length-1&&p.step.dur>=20&&!p.endWarn&&left<=10&&left>0){p.endWarn=1;beep(880,250);setTimeout(()=>beep(880,250),350);vib([150,80,150]);say("Ti sekunder igjen av økta");p.wakeUntil=Date.now()+60000;blinkEl($("#dim"));blinkEl($("#pl"),"flash");if(p.dim)setDim(false);setTimeout(()=>blinkEl($("#pl"),"flash"),700);setTimeout(()=>blinkEl($("#pl"),"flash"),1800)}};

/* ---------- Android-appen ---------- */
if(AB){
  say=function(t){if(!S.settings.speech)return;try{AB.speak(String(t))}catch(e){}};
  keepAwake=async function(on){try{AB.keepAwake(!!(on&&S.settings.awake))}catch(e){}};
  fsOn=function(){};fsOff=function(){};
  connectHR=function(){try{AB.hrConnect()}catch(e){toast("Fikk ikke startet Bluetooth.")}};
  copy=async function(t){try{AB.copy(String(t));toast("Kopiert. Lim det inn i chatten med Claude.");return true}catch(e){return false}};
  window.__hr=bpm=>{S.hr=bpm;if(!S.hrDev)S.hrDev={native:true};if(player&&!player.paused&&player.steps)S.hrSamples.push(bpm);updateHR()};
  window.__hrState=s=>{
    if(s==="connected"){S.hrDev={native:true};refreshChips();toast("HRM600 er koblet til.")}
    else if(s==="disconnected"){S.hrDev=null;S.hr=null;updateHR();refreshChips();toast("Pulsbeltet ble koblet fra. Appen prøver å koble til igjen.")}
    else if(s==="scanning")toast("Leter etter pulsbeltet … Fukt beltet og ta det på.");
    else if(s==="notfound")toast("Fant ikke pulsbeltet. Fukt beltet, ta det på og prøv igjen.");
    else if(s==="noperm")toast("Appen trenger tilgang til enheter i nærheten for å koble til pulsbeltet.");
    else if(s==="btoff")toast("Slå på Bluetooth og prøv igjen.");
  };
  const _st=startTread;startTread=function(){_st.apply(this,arguments);if(player){try{AB.sessionStart()}catch(e){}}};
  const _ft=finishTread;finishTread=function(){try{AB.tvEnd();AB.sessionEnd()}catch(e){}_ft.apply(this,arguments)};
  const _sd=setDim;
  setDim=function(on){
    const p=player,was=!!(p&&p.dim);_sd.apply(this,arguments);
    if(!p||!p.steps||!S.settings.tvMode)return;
    if(on&&!was){lastOv="";pushOv();try{AB.tvDim(S.settings.tvApp||"com.netflix.mediaclient")}catch(e){}}
    else if(!on&&was){try{AB.tvWake()}catch(e){}if(p.step.dur-p.elapsedStep<=11){setTimeout(()=>{blinkEl($("#pl"),"flash")},700);setTimeout(()=>{blinkEl($("#pl"),"flash")},1800)}}
  };
  let lastOv="";
  const css=v=>getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  function pushOv(){
    const p=player;if(!p||!p.steps||!p.dim||!S.settings.tvMode)return;
    const s=p.step,k=KIND[s.kind]||KIND.walk,nx=p.steps[p.i+1],left=s.dur-p.elapsedStep,z=S.hr!=null?zoneOf(S.hr):null;
    const o={s:s.label||k.l,hr:S.hr==null?"--":String(S.hr),hc:z?css(z.c):"#9aa4b2",l:fmt(p.w.free?p.elapsedStep:left),ll:p.w.free?"tid":"igjen",t:fmt(p.elapsedTotal),k:s.kind!=="hike"?km(p.dist):"",
      n:(nx&&left<=10)?"Neste: "+(nx.label||(KIND[nx.kind]||KIND.walk).l):""};
    const j=JSON.stringify(o);if(j!==lastOv){lastOv=j;try{AB.overlay(j)}catch(e){}}
  }
  const _ut=updTread;updTread=function(){_ut.apply(this,arguments);const p=player;if(p&&p.steps&&p.dim&&S.settings.tvMode&&p.i<p.steps.length-1&&p.step.dur>=20&&p.step.dur-p.elapsedStep<=10){p.wakeUntil=Date.now()+20000;setDim(false);return}pushOv()};
  const _uh=updateHR;updateHR=function(){_uh.apply(this,arguments);pushOv()};
  window.__nt=()=>{if(player&&player.t&&player.steps)tickTread()};
  window.__tvTap=()=>{if(player&&player.steps){player.lastTouch=Date.now();setDim(false)}};
  window.__resume=()=>{if(!player&&S.view==="detail")render()};
  window.__back=()=>{if(player||document.querySelector(".rest"))return "1";if(S.view!=="home"){S.view="home";render();return "1"}return ""};
}
if(!player)render();
})();
