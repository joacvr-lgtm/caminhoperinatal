/* Funcionamento offline: guarda a aplicação no aparelho na primeira visita.
   Ao mudar qualquer ficheiro, sobe a VERSAO para os aparelhos receberem a atualização. */
const VERSAO='caminho-v3';
const FICHEIROS=[
  './',
  'aldeia.html',
  'crm.html',
  'caminho.html',
  'index.html',
  'kit-lancamento.html',
  'manifest.webmanifest',
  'narrativa-parto.html',
  'plano-4-trimestre-venda.html',
  'plano-4-trimestre.html',
  'plano-negocio-2027.html',
  'psicoeducacao.html',
  'regresso-trabalho.html',
  'roda.html',
  'css/base.css',
  'css/caminho.css',
  'css/docs.css',
  'css/paginas.css',
  'ficheiros/plano-4-trimestre-caderno.pdf',
  'ficheiros/plano-4-trimestre-capa.jpg',
  'icons/apple-touch-icon.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
  'icons/icon.svg',
  'js/app.js',
  'js/caminho.js',
  'js/crm.js',
  'js/conteudos.js',
  'js/docs.js',
  'js/graficos.js',
  'js/ligacoes.js'
];
const FONTES=/^https:\/\/fonts\.(googleapis|gstatic)\.com\//;

self.addEventListener('install',e=>{
  e.waitUntil(caches.open(VERSAO).then(c=>c.addAll(FICHEIROS)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==VERSAO).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',e=>{
  const req=e.request;if(req.method!=='GET')return;
  const url=new URL(req.url);
  /* O CRM tem dados pessoais: nunca fica guardado no aparelho, vai sempre à rede. */
  if(url.origin===location.origin&&url.pathname.startsWith('/api/'))return;
  if(url.origin===location.origin){
    /* Rede primeiro, para apanhar atualizações; sem rede, a cópia guardada. */
    e.respondWith(fetch(req).then(r=>{if(r.ok){const c=r.clone();caches.open(VERSAO).then(x=>x.put(req,c))}return r})
      .catch(()=>caches.match(req,{ignoreSearch:true}).then(r=>r||(req.mode==='navigate'?caches.match('index.html'):undefined))));
  }else if(FONTES.test(req.url)){
    e.respondWith(caches.match(req).then(r=>r||fetch(req).then(res=>{const c=res.clone();caches.open(VERSAO).then(x=>x.put(req,c));return res})));
  }
});
