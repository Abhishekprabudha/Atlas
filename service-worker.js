const CACHE='mab-atlas-operations-v3';
const ASSETS=['./','index.html','assets/css/app.css','assets/js/app.js','assets/favicon.svg','data/requirements.json','data/scenarios.json','data/seed-data.json','data/atlas-workbook-raw.json','manifest.webmanifest'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS))));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))));
self.addEventListener('fetch',e=>e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request))));
