// sw.js — cache leve do AppShell
const CACHE = 'dual-hub-v1';
const ASSETS = ['/', './', './index.html', './', './', './apps/apps.json'];
self.addEventListener('install', e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate', e=>{
  e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch', e=>{
  const url = new URL(e.request.url);
  if(e.request.method!=='GET') return;
  if(url.origin===location.origin){
    e.respondWith(caches.match(e.request).then(r=> r || fetch(e.request)));
  }else{
    e.respondWith(fetch(e.request).catch(()=>new Response('{"offline":true}',{headers:{'Content-Type':'application/json'}})));
  }
});
