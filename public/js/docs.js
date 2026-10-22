/* Listas de tarefas dos documentos: o que marcas fica guardado neste aparelho. */
(function(){
  const doc=document.querySelector('.doc[data-chave]');if(!doc)return;
  const chave='perinatal-tarefas-'+doc.dataset.chave;
  let feito={};try{feito=JSON.parse(localStorage.getItem(chave))||{}}catch(e){}
  doc.querySelectorAll('li.tarefa input[data-i]').forEach(c=>{
    if(feito[c.dataset.i])c.checked=true;
    c.addEventListener('change',()=>{feito[c.dataset.i]=c.checked;try{localStorage.setItem(chave,JSON.stringify(feito))}catch(e){}});
  });
})();
