/* Gráficos dos documentos, refeitos a partir dos widgets do Claude Docs.
   Cronogramas: toca numa linha para ver as datas. Faturação: toca numa barra para ver o detalhe do mês; toca na legenda para mostrar ou esconder uma linha. */
(function(){
const NS='http://www.w3.org/2000/svg';
const MESES=['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
const COR={verde:'#4E5C47',ferrugem:'#A14F1C',mostarda:'#D3A136',bege:'#DED8BD',ink:'#262B22',muted:'#62645A',grid:'#E7E2CC'};
const dia=d=>`${+d.slice(8)} ${MESES[+d.slice(5,7)-1]}`;
const t=d=>Date.parse(d)/864e5;
const eur=v=>`${Math.round(v).toLocaleString('pt-PT')} €`;
function el(tag,attrs,txt){const e=document.createElementNS(NS,tag);for(const k in attrs)e.setAttribute(k,attrs[k]);if(txt!=null)e.textContent=txt;return e}

const DADOS={
  'lancamentos-2027':{tipo:'cronograma',titulo:'Três ciclos do Raízes e dois produtos lançados até maio',sub:'Calendário de lançamentos, outubro de 2026 a dezembro de 2027',destaque:'guia',
    linhas:[['licj','Licença: preparar','2026-10-01','2026-12-28'],['licjoao','Licença do João','2027-01-01','2027-03-31'],['caminhada','1.ª caminhada aberta','2027-01-09','2027-01-09'],['plano4','Plano do 4.º Trimestre','2027-01-11','2027-01-11'],['r1','Raízes 1','2027-02-01','2027-03-26'],['creche','Mateus na creche','2027-04-01','2027-04-01'],['maes','Dia da Mãe com marcas','2027-05-02','2027-05-02'],['guia','Lançamento do guia','2027-05-04','2027-05-04'],['r2','Raízes 2','2027-05-03','2027-06-25'],['ferias','Férias','2027-07-01','2027-08-31'],['r3','Raízes 3','2027-09-13','2027-11-05'],['bf','Black Friday','2027-11-26','2027-11-26'],['natal','Natal: oficina e marcas','2027-12-01','2027-12-18']],
    inicio:'2026-10-01',fim:'2027-12-31'},
  'lancamento-plano4':{tipo:'cronograma',titulo:'As vendas abrem a 11 de janeiro, com tudo preparado antes da pausa',sub:'Calendário do lançamento, novembro de 2026 a janeiro de 2027',destaque:'lanca',pausa:'pausa',
    linhas:[['rever','Rever o caderno','2026-11-02','2026-11-20'],['testar','Testar com 3 a 5 casais','2026-11-09','2026-11-30'],['design','Ajustar o design final','2026-11-23','2026-12-04'],['audios','Gravar os áudios','2026-12-01','2026-12-11'],['agendar','Gravar e agendar conteúdo','2026-12-01','2026-12-12'],['tecnica','Plataforma, faturação, emails','2026-12-07','2027-01-08'],['espera','Lista de espera aberta','2026-12-15','2027-01-11'],['pausa','Pausa de Natal','2026-12-14','2026-12-31'],['teste','Compra de teste','2027-01-08','2027-01-08'],['lanca','Abertura das vendas','2027-01-11','2027-01-11'],['preco','Preço de lançamento, 15 €','2027-01-11','2027-01-14']],
    inicio:'2026-11-01',fim:'2027-01-20'},
  'faturacao-2027':{tipo:'barras',titulo:'Cerca de 75 mil € em 2027 com os novos programas',
    series:[['cons','Consultas',COR.verde],['grup','Grupos e oficinas','#9AA58F'],['inf','Infoprodutos',COR.mostarda],['parc','Parcerias de marca','#D08A5C'],['prod','Velas e gessos','#B9AE84'],['novos','Novos programas',COR.ferrugem]],
    meses:MESES,
    valores:{cons:[1920,1440,1440,1920,1920,1920,0,0,1920,1920,960,960],grup:[0,720,720,160,1060,1060,0,0,1060,1060,160,250],inf:[760,285,285,285,1460,661,425,425,661,661,1180,661],parc:[0,500,500,750,1500,750,500,500,750,750,1000,1500],prod:[0,0,0,0,0,0,0,0,0,0,300,600],novos:[0,480,90,1660,5150,6560,360,360,4840,6240,7560,1860]}}
};

function pôr(box,svg){
  const sc=document.createElement('div');sc.className='g-scroll';sc.append(svg);box.prepend(sc);
  const dica=document.createElement('p');dica.className='g-dica';dica.textContent='Desliza para o lado para ver o gráfico todo.';
  sc.after(dica);const ver=()=>{dica.hidden=sc.scrollWidth<=sc.clientWidth+2};requestAnimationFrame(ver);addEventListener('resize',ver);
}

function cronograma(box,D){
  const W=760,L=210,R=730,top=96,row=30,H=top+D.linhas.length*row+16;
  const lo=t(D.inicio),hi=t(D.fim),X=d=>L+(t(d)-lo)/(hi-lo)*(R-L);
  const svg=el('svg',{viewBox:`0 0 ${W} ${H}`,role:'img','aria-label':D.titulo,'font-size':'12.5','font-family':'Poppins, system-ui, sans-serif'});
  svg.append(el('text',{x:16,y:26,'font-size':15,'font-weight':600,fill:COR.ink,'font-family':'Lora, Georgia, serif'},D.titulo));
  svg.append(el('text',{x:16,y:46,'font-size':11.5,fill:COR.muted},D.sub));
  // meses
  const d0=new Date(D.inicio+'T00:00');
  for(let d=new Date(d0.getFullYear(),d0.getMonth(),1);t(d.toISOString().slice(0,10))<=hi;d.setMonth(d.getMonth()+1)){
    const iso=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`;if(t(iso)<lo)continue;const x=X(iso);
    svg.append(el('line',{x1:x,x2:x,y1:top-12,y2:H-8,stroke:COR.grid}));
    svg.append(el('text',{x:x+3,y:top-18,'font-size':11,fill:COR.muted},MESES[d.getMonth()]));
    if(d.getMonth()===0||iso===D.inicio.slice(0,8)+'01')svg.append(el('text',{x:x+3,y:top-32,'font-size':11,'font-weight':600,fill:COR.muted},String(d.getFullYear())));
  }
  const destaque=D.linhas.find(l=>l[0]===D.destaque);
  if(destaque){const x=X(destaque[2]);svg.append(el('line',{x1:x,x2:x,y1:top-12,y2:H-8,stroke:COR.ferrugem,'stroke-dasharray':'4 4','stroke-width':1.25}))}
  const info=box.querySelector('.g-info');
  D.linhas.forEach(([k,nome,a,b],i)=>{
    const y=top+i*row,um=a===b,c=k===D.destaque?COR.ferrugem:k===D.pausa?COR.mostarda:COR.verde;
    const g=el('g',{class:'g-linha',tabindex:0,role:'button','aria-label':`${nome}: ${um?dia(a):dia(a)+' a '+dia(b)}`});
    g.append(el('rect',{x:0,y:y-row/2,width:W,height:row,fill:'transparent'}));
    g.append(el('line',{x1:L,x2:X(a),y1:y,y2:y,stroke:COR.grid}));
    if(um)g.append(el('path',{d:`M${X(a)} ${y-7}l7 7l-7 7l-7 -7z`,fill:c}));
    else g.append(el('rect',{x:X(a),y:y-6,width:Math.max(X(b)-X(a),4),height:12,rx:6,fill:c,'fill-opacity':.2,stroke:c,'stroke-width':1.25}));
    const tarde=X(b)>R-80;
    g.append(el('text',{x:tarde?X(a)-12:X(b)+12,y:y+4,'text-anchor':tarde?'end':'start','font-size':11,fill:k===D.destaque?COR.ink:COR.muted,'font-weight':k===D.destaque?600:400},um?dia(a):`${dia(a)} a ${dia(b)}`));
    g.append(el('text',{x:16,y:y+4,fill:COR.ink,'font-weight':k===D.destaque?600:400},nome));
    const mostrar=()=>{svg.querySelectorAll('.g-linha').forEach(x=>x.classList.toggle('ativo',x===g));
      const dias=Math.round(t(b)-t(a))+1;info.textContent=um?`${nome}: ${dia(a)} de ${a.slice(0,4)}.`:`${nome}: de ${dia(a)} a ${dia(b)} de ${b.slice(0,4)} (${dias} dias).`};
    g.addEventListener('click',mostrar);g.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();mostrar()}});
    svg.append(g);
  });
  pôr(box,svg);
}

function barras(box,D){
  const W=760,x0=64,x1=740,base=400,y0=150,band=(x1-x0)/12,bw=34;
  const ativos=new Set(D.series.map(s=>s[0]));
  const info=box.querySelector('.g-info');
  const svg=el('svg',{viewBox:`0 0 ${W} 440`,role:'img','aria-label':D.titulo,'font-size':12,'font-family':'Poppins, system-ui, sans-serif'});
  pôr(box,svg);
  let mesAtivo=null;
  function desenhar(){
    svg.replaceChildren();
    const tot=i=>D.series.filter(s=>ativos.has(s[0])).reduce((a,s)=>a+D.valores[s[0]][i],0);
    const ano=D.meses.reduce((a,_,i)=>a+tot(i),0);
    const maxY=Math.max(2000,Math.ceil(Math.max(...D.meses.map((_,i)=>tot(i)))/2000)*2000),Y=v=>base-v/maxY*(base-y0);
    svg.append(el('text',{x:16,y:28,'font-size':16,'font-weight':600,fill:COR.ink,'font-family':'Lora, Georgia, serif'},D.titulo));
    svg.append(el('text',{x:16,y:50,fill:COR.muted},`${eur(ano)} no ano · média de ${eur(ano/12)} por mês · sem IVA${ativos.size<D.series.length?' · só as linhas selecionadas':''}`));
    D.series.forEach(([k,nome,c],i)=>{
      const lx=16+(i%3)*245,ly=68+Math.floor(i/3)*36,on=ativos.has(k);
      const g=el('g',{class:'g-leg',tabindex:0,role:'switch','aria-checked':on,'aria-label':`${nome}: ${on?'visível':'escondida'}`,opacity:on?1:.35});
      g.append(el('rect',{x:lx-4,y:ly-4,width:230,height:34,fill:'transparent'}));
      g.append(el('rect',{x:lx,y:ly,width:10,height:10,rx:2,fill:c}));
      g.append(el('text',{x:lx+16,y:ly+9,fill:COR.ink},nome));
      g.append(el('text',{x:lx+16,y:ly+25,'font-size':11,fill:COR.muted},eur(D.valores[k].reduce((a,b)=>a+b,0))));
      const tog=()=>{if(on&&ativos.size===1)return;on?ativos.delete(k):ativos.add(k);desenhar()};
      g.addEventListener('click',tog);g.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();tog()}});
      svg.append(g);
    });
    [0,maxY/2,maxY].forEach(v=>{svg.append(el('line',{x1:x0,x2:x1,y1:Y(v),y2:Y(v),stroke:COR.grid}));svg.append(el('text',{x:x0-8,y:Y(v)+4,'text-anchor':'end','font-size':11,fill:COR.muted},v.toLocaleString('pt-PT')))});
    D.meses.forEach((m,i)=>{
      const cx=x0+band*i+band/2;let acc=0;
      const g=el('g',{class:'g-mes',tabindex:0,role:'button','aria-label':`${m}: ${eur(tot(i))}`});
      g.append(el('rect',{x:cx-band/2,y:y0-20,width:band,height:base-y0+40,fill:i===mesAtivo?'#F6EACB':'transparent'}));
      D.series.forEach(([k,,c])=>{if(!ativos.has(k))return;const v=D.valores[k][i];if(!v)return;
        g.append(el('rect',{x:cx-bw/2,y:Y(acc+v),width:bw,height:Y(acc)-Y(acc+v),fill:c}));acc+=v});
      g.append(el('text',{x:cx,y:Y(tot(i))-6,'text-anchor':'middle','font-size':11,'font-weight':600,fill:COR.ink},(tot(i)/1000).toLocaleString('pt-PT',{maximumFractionDigits:1})));
      g.append(el('text',{x:cx,y:base+18,'text-anchor':'middle',fill:COR.muted},m));
      const ver=()=>{mesAtivo=i;desenhar();
        info.innerHTML=`<strong>${m}: ${eur(tot(i))}</strong><br>`+D.series.filter(s=>ativos.has(s[0])&&D.valores[s[0]][i]).map(([k,nome])=>`${nome}: ${eur(D.valores[k][i])}`).join(' · ')};
      g.addEventListener('click',ver);g.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();ver()}});
      svg.append(g);
    });
    svg.append(el('line',{x1:x0,x2:x1,y1:base,y2:base,stroke:COR.muted}));
    svg.append(el('text',{x:x1,y:base+34,'text-anchor':'end','font-size':11,fill:COR.muted},'valores no topo em milhares de euros'));
    if(mesAtivo===null)info.textContent='Toca num mês para ver o detalhe. Toca na legenda para mostrar ou esconder uma linha.';
  }
  desenhar();
}

document.querySelectorAll('[data-grafico]').forEach(box=>{
  const D=DADOS[box.dataset.grafico];if(!D)return;
  if(!box.querySelector('.g-info')){const p=document.createElement('p');p.className='g-info';p.setAttribute('aria-live','polite');box.append(p)}
  (D.tipo==='barras'?barras:cronograma)(box,D);
  if(D.tipo==='cronograma')box.querySelector('.g-info').textContent='Toca numa linha para ver as datas.';
});
})();
