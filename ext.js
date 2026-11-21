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
      +`<button class="btn wide" id="tvopen">Åpne ${esc(nm)} og velg hva du vil se</button><div class="muted" style="font-size:14px">Start avspillingen og gå tilbake hit, så starter du økta. Når skjermen dempes etter 15 sek, fortsetter ${esc(nm)} med pulsfeltet på siden.</div>`;
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
    else if(!on&&was){try{AB.tvWake()}catch(e){}if(p.step.dur-p.elapsedStep<=11)setTimeout(()=>{blinkEl($("#pl"),"flash")},500)}
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
  const _ut=updTread;updTread=function(){_ut.apply(this,arguments);pushOv()};
  const _uh=updateHR;updateHR=function(){_uh.apply(this,arguments);pushOv()};
  window.__nt=()=>{if(player&&player.t&&player.steps)tickTread()};
  window.__tvTap=()=>{if(player&&player.steps){player.lastTouch=Date.now();setDim(false)}};
  window.__resume=()=>{if(!player&&S.view==="detail")render()};
  window.__back=()=>{if(player||document.querySelector(".rest"))return "1";if(S.view!=="home"){S.view="home";render();return "1"}return ""};
}
if(!player)render();
})();
