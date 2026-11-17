const CACHE="oyv-trening-v1";
const SHELL=["./","index.html","manifest.json","icon.svg"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()))});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener("fetch",e=>{
const u=new URL(e.request.url);
if(e.request.method!=="GET")return;
if(u.origin===location.origin&&(u.pathname.endsWith("workouts.json")||u.pathname.endsWith("/")||u.pathname.endsWith("index.html"))){
e.respondWith(fetch(e.request).then(r=>{const c=r.clone();caches.open(CACHE).then(x=>x.put(e.request,c));return r}).catch(()=>caches.match(e.request)));return;
}
e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).then(res=>{if(u.origin===location.origin||u.host.includes("fonts.")){const c=res.clone();caches.open(CACHE).then(x=>x.put(e.request,c))}return res})));
});
