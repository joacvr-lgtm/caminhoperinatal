/* Camada de aplicação comum: funcionamento offline, aviso de falta de rede e botão de instalar. */
if('serviceWorker' in navigator){
  window.addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));
}

(function(){
  const el=document.querySelector('[data-offline]');
  if(!el)return;
  const atualizar=()=>{el.hidden=navigator.onLine};
  window.addEventListener('online',atualizar);window.addEventListener('offline',atualizar);atualizar();
})();

(function(){
  const btn=document.querySelector('[data-instalar]'),dica=document.querySelector('[data-instalar-dica]');
  if(!btn)return;
  const instalada=matchMedia('(display-mode: standalone)').matches||navigator.standalone;
  if(instalada){if(dica)dica.hidden=true;return}
  let pedido=null;
  window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();pedido=e;btn.hidden=false});
  btn.addEventListener('click',async()=>{if(!pedido)return;pedido.prompt();await pedido.userChoice;pedido=null;btn.hidden=true});
  window.addEventListener('appinstalled',()=>{btn.hidden=true;if(dica)dica.hidden=true});
})();
