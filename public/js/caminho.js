const T=[['desejar','Desejar','pré-conceção, PMA, perdas'],['gravidez','Gravidez','os nove meses'],['parto','Parto','e primeiras semanas'],['pos','Pós-parto','primeiro ano'],['mil','Até aos 2 anos','os primeiros 1000 dias']];
const N=[['eu','Eu','a mãe, o pai'],['diade','A díade','eu e o bebé'],['familia','Casal e família','o casal, os irmãos, os avós'],['comunidade','Comunidade','a aldeia, os pares'],['sistema','Sistema','profissionais, saúde, políticas']];
const PAGA={cliente:'Famílias pagam',empresa:'Empresas',autarquia:'Autarquias e IPSS',profissionais:'Profissionais',gratuito:'Gratuito · porta de entrada',interno:'Uso interno'};
const C='consultorio.html';
// [nível, tempo, estado, título, modo, descrição, link, prioridade, quem paga (separado por espaço), quando, novo]
const I=[
['eu','desejar','criar','Guia "Antes de ser mãe"','Proteger','Desejo, ambivalência, infertilidade e PMA. Para quem está a decidir ou a tentar.','',0,'cliente'],
['eu','desejar','criar','Psicoeducação sobre perda gestacional','Reparar','Para a mulher, o parceiro e quem está à volta: o que sentir, o que dizer, quando pedir ajuda.','',0,'gratuito'],
['eu','gravidez','tem','Questionários EPDS, GAD-7 e PHQ-9','Ver','Versões portuguesas para preencher em sessão, com resultado só para a psicóloga.',C,0,'interno'],
['eu','gravidez','tem','Guias PASS e PDSS-7','Ver','Ansiedade específica do perinatal e depressão perinatal com cortes portugueses.',C,0,'interno','',1],
['eu','gravidez','criar','Guião para o medo do parto','Reparar','Tocofobia: avaliação, plano de 6 a 8 sessões, preparação do plano de parto com a equipa obstétrica e trabalho com partos anteriores difíceis. Um dos motivos de consulta mais frequentes na gravidez.','',2,'cliente','jan 2027',1],
['eu','gravidez','criar','Ser pai: guia e grupo para pais e parceiros','Proteger','O pai e o parceiro como público próprio: transição, depressão paterna, o lugar no parto e no pós-parto, e um grupo só para eles.','',0,'cliente','',1],
['eu','gravidez','tem','Roda da Saúde Perinatal','Florescer','Autoavaliação em oito áreas, adaptada da Wheel of Health da Duke, com um passo por semana.','roda.html',0,'gratuito'],
['eu','parto','tem','Guião da narrativa do parto','Reparar','Contar o parto por ordem, com as emoções e o que ficou por perceber. Base para trabalhar trauma de parto.','narrativa-parto.html',0,'cliente'],
['eu','parto','tem','Guia da City Birth Trauma Scale','Ver','Critérios DSM-5 de stress pós-traumático relacionado com o parto.','guia-city-bts.html',0,'interno'],
['eu','pos','tem','Psicoeducação Florescer e Cuidar','Florescer','Onze temas para florescer, a Roda área a área e os textos clínicos para quando é preciso mais.','psicoeducacao.html',0,'gratuito'],
['eu','pos','tem','Consultas e protocolo de risco','Ver','Acompanhamento individual, ficha de primeira consulta, escalas e encaminhamento.',C,0,'cliente'],
['eu','pos','tem','Guia Gotland para pais','Ver','Depressão com expressão "masculina": irritabilidade, consumos, exaustão.','guia-gotland.html',0,'interno','',1],
['eu','pos','criar','Medir o florescer (MHC-SF)','Florescer','O eixo da saúde ainda não tem medida: todas as escalas medem doença. A escala breve de Keyes mede bem-estar emocional, psicológico e social. Aplicar no início e no fim de consultas, Raízes e Aldeia, ao lado da EPDS. Há versão portuguesa validada no pós-parto (Monteiro, Fonseca, Pereira e Canavarro, 2020, 882 mulheres, total fiável) e em adultos (Fonte et al., 2020). 14 itens, último mês, cerca de 5 minutos. Gratuita; pedir a folha e autorização à equipa de Coimbra antes de a usar em programas pagos.','',3,'interno','fev 2027',1],
['eu','pos','criar','O corpo depois do parto','Florescer','Pavimento pélvico, amamentação e sono, onde corpo e saúde mental se cruzam. Começa pelas sessões da Aldeia com a Ana Marques (junho) e a Luísa Matos.','',0,'cliente','jun 2027',1],
['eu','mil','tem','Guia do regresso ao trabalho','Proteger','A segunda transição: rotinas, identidade, divisão de tarefas. Também pode ser vendido a empresas.','regresso-trabalho.html',0,'cliente empresa'],
['eu','mil','criar','Diário da matrescência','Florescer','Trinta dias de escrita guiada sobre quem estou a tornar-me.','',0,'cliente'],
['diade','desejar','criar','Gravidez depois de uma perda','Reparar','A gravidez arco-íris: medo, luto que continua, e a ligação ao novo bebé sem apagar o que se perdeu.','',0,'cliente','',1],
['diade','gravidez','criar','Conversar com o bebé que vem','Florescer','Vinculação pré-natal: o bebé imaginado, rituais de ligação durante a gravidez.','',0,'cliente'],
['diade','parto','criar','Prematuridade e neonatologia','Reparar','Apoio quando o bebé fica internado e a ligação começa à distância.','',0,'cliente'],
['diade','pos','tem','Guia da PBQ (versão portuguesa)','Ver','Avaliar dificuldades na ligação ao bebé, em sessão individual.','guia-pbq.html',0,'interno'],
['diade','pos','tem','"Brincar no chão"','Florescer','Psicoeducação sobre as trocas de servir e devolver.','psicoeducacao.html',0,'gratuito'],
['diade','pos','criar','Playgroups 0–12 meses','Pertencer','Grupos pequenos por idade, em espaço fechado, com as mães a conversar enquanto os bebés exploram.','',0,'cliente','abr 2027'],
['diade','mil','criar','Oficinas em família 1–2 anos','Florescer','Criar com as mãos, natureza e música, com os bebés que já andam.','',0,'cliente'],
['familia','desejar','criar','Conversa a dois "Vamos ter um filho?"','Proteger','Cartas de conversa para o casal antes da decisão ou durante a PMA.','',0,'cliente'],
['familia','gravidez','tem','Plano do 4.º Trimestre','Proteger','Três conversas a dois para preparar rede, tarefas, noites, visitas e sinais de alerta. Lançamento a 11 de janeiro, com página de vendas e kit.','plano-4-trimestre.html',0,'cliente','jan 2027'],
['familia','parto','criar','Guia para o acompanhante no parto','Proteger','O que fazer, o que dizer e como cuidar de si quem acompanha.','',0,'cliente'],
['familia','parto','criar','Sinais de alarme para a família','Proteger','Psicose pós-parto e doença bipolar: o que a família deve saber reconhecer nas primeiras semanas e para onde ligar. Gratuito e partilhável.','',0,'gratuito','',1],
['familia','pos','tem','Check-in de casal e "o casal nos pequenos gestos"','Florescer','Dez minutos por semana e os convites do dia a dia.','plano-4-trimestre.html',0,'cliente'],
['familia','pos','criar','Caminho do 4.º Trimestre','Proteger','Pacote de cerca de 520 €: consultas, Plano do 4.º Trimestre e grupo, do fim da gravidez aos três meses do bebé.','',0,'cliente','fev 2027',1],
['familia','pos','criar','Kit para os irmãos','Proteger','Preparar e acompanhar a chegada do bebé com histórias e atividades.','',0,'cliente'],
['familia','pos','criar','Cartas de conversa "Nós, agora com bebé"','Florescer','Produto físico, combina com as velas numa caixa de oferta.','',0,'cliente'],
['familia','mil','criar','Workshop "O casal depois do bebé"','Florescer','Gravado, como produto de entrada.','',0,'cliente'],
['familia','mil','criar','Guia para avós','Pertencer','Como ajudar sem invadir.','',0,'cliente'],
['comunidade','desejar','criar','Círculo de perda gestacional e PMA','Pertencer','Um espaço de grupo para quem está a tentar ou perdeu um bebé. 80 € por ciclo. Preparado pela sessão da Aldeia com a Ana Correia.','',0,'cliente','set 2027'],
['comunidade','gravidez','criar','Círculo de grávidas','Pertencer','Encontros mensais para preparar o 4.º trimestre em grupo. Alimenta o Plano do 4.º Trimestre e o Raízes.','',0,'cliente','abr 2027'],
['comunidade','parto','criar','Círculo depois de um parto difícil','Reparar','Partilha em grupo para quem viveu um parto difícil ou uma cesariana urgente, depois do trabalho individual com a narrativa do parto.','',0,'cliente','',1],
['comunidade','pos','tem','Caminhadas Perinatais','Pertencer','Caminhadas com mães e bebés, com rastreio breve a dois quando faz sentido.','',0,'gratuito','jan 2027'],
['comunidade','pos','tem','Raízes que Sustentam','Pertencer','O programa de grupo: caminhada, oficina, playgroup e círculo. Primeiro ciclo em fevereiro e março.','',0,'cliente','fev 2027'],
['comunidade','pos','criar','A Aldeia','Pertencer','Comunidade online por subscrição (9 €/mês): um especialista convidado por mês, círculo mensal e tema do mês. Guião, regras e protocolo de crise já no Consultório.','aldeia.html',0,'cliente','mar 2027',1],
['comunidade','mil','criar','Mães mentoras','Dar','Mães que já fizeram o caminho acompanham as que chegam, com formação e supervisão.','',0,'autarquia'],
['sistema','desejar','criar','Advocacia: licenças e saúde mental perinatal','Dar','Artigos, palestras e diálogo com a OPP sobre o lugar da saúde perinatal no sistema.','',0,'gratuito'],
['sistema','gravidez','tem','Consultório Perinatal e guias','Cuidar de quem cuida','Ferramentas clínicas organizadas, escalas, modelos e protocolos.',C,0,'interno'],
['sistema','gravidez','tem','Rastreio em Saúde Mental Perinatal','Ver','O que triar, instrumentos, aplicação nos grupos e protocolo de risco.','rastreio.html',0,'interno','',1],
['sistema','parto','criar','Formação para profissionais','Dar','Para psicólogas, enfermeiras especialistas, doulas: rastreio, linguagem, cuidar de si. 150 € por pessoa online, 400 a 600 € por sessão numa instituição. Estreia no Dia Mundial da Saúde Mental Materna.','',0,'profissionais','mai 2027'],
['sistema','pos','tem','Tempo de Olhar','Cuidar de quem cuida','Chegada, pausas, Nutrir o corpo, reflexão de caso e fecho do dia para psicólogas.','tempo-de-olhar.html',0,'profissionais'],
['sistema','pos','tem','Modelos da Aldeia','Cuidar de quem cuida','Guião do círculo mensal, regras do grupo, protocolo de crise na comunidade e encaminhamento para consulta.',C,0,'interno','',1],
['sistema','pos','criar','Plano de segurança e rede de encaminhamento','Proteger','O modelo de plano de segurança que o protocolo de risco pede, e a rede local para onde encaminhar: psiquiatria perinatal (Raquel S. Correia), urgências, médico de família, APAV, e os convidados da Aldeia como rede de confiança (Ana Marques, Luísa Matos, Ana Correia).','',1,'interno','dez 2026',1],
['sistema','pos','criar','Raízes contratado','Pertencer','O Raízes vendido a autarquias, IPSS e CLDS (2.400 a 3.500 € por ciclo), com candidatura de uma IPSS parceira ao Prémio BPI Fundação "la Caixa" Infância.','',0,'autarquia','jun 2027',1],
['sistema','mil','criar','Parentalidade no trabalho','Proteger','Programa para empresas (1.800 a 2.500 € por empresa): guia do regresso, sessões para colaboradores e chefias, e a Aldeia como benefício.','',0,'empresa','abr 2027',1],
['sistema','mil','criar','Investigação: os dois contínuos no perinatal','Ver','Doutoramento com a comunidade das caminhadas, na Universidade do Minho. A medida do florescer e os resultados anónimos dos grupos são a base.','',0,'interno']
];
/* O que vive no Consultório Perinatal abre lá, se o endereço estiver em js/ligacoes.js; senão, fica sem ligação. */
const LOCAIS=new Set(['caminho.html','psicoeducacao.html','aldeia.html','roda.html','narrativa-parto.html','plano-4-trimestre.html','plano-4-trimestre-venda.html','kit-lancamento.html','regresso-trabalho.html','plano-negocio-2027.html']);
I.forEach(x=>{if(!x[6]||/^https?:/.test(x[6])||LOCAIS.has(x[6]))return;const b=window.CONSULTORIO_URL;x[6]=b?b.replace(/\/?$/,'/')+x[6]:''});
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const $=id=>document.getElementById(id);
$('nTem').textContent=I.filter(x=>x[2]==='tem').length;$('nCriar').textContent=I.filter(x=>x[2]==='criar').length;
$('mapa').innerHTML=`<thead><tr><th scope="col">Nível \\ Tempo</th>${T.map(([,n,s])=>`<th scope="col">${n}<small>${s}</small></th>`).join('')}</tr></thead><tbody>${N.map(([nk,nn,ns])=>`<tr><th scope="row"><b>${nn}</b><small>${ns}</small></th>${T.map(([tk])=>{const its=I.map((x,i)=>[x,i]).filter(([x])=>x[0]===nk&&x[1]===tk);return `<td><div class="cell">${its.length?its.map(([x,i])=>`<button class="it ${x[2]}${x[7]?' prio':''}${x[10]?' novo':''}" data-i="${i}" aria-pressed="false">${x[7]?`<span class="n">${x[7]}</span>`:''}${esc(x[3])}${x[9]?`<span class="q">${esc(x[9])}</span>`:''}</button>`).join(''):'<span class="vazio">espaço livre</span>'}</div></td>`}).join('')}</tr>`).join('')}</tbody>`;
$('prox').innerHTML=I.map((x,i)=>[x,i]).filter(([x])=>x[7]).sort((a,b)=>a[0][7]-b[0][7]).map(([x,i])=>`<button class="pcard" data-i="${i}"><span class="n">${x[7]}</span><b>${esc(x[3])}</b><p>${esc(x[9]||'')} · ${esc(N.find(n=>n[0]===x[0])[1])} · ${esc(T.find(t=>t[0]===x[1])[1])}</p></button>`).join('');
let filtro='todos';
$('filtros').innerHTML='<span>Quem paga:</span>'+[['todos','Todos'],...Object.entries(PAGA)].map(([k,v])=>`<button class="chip" data-f="${k}" aria-pressed="${k==='todos'}">${v}</button>`).join('');
$('filtros').addEventListener('click',e=>{const b=e.target.closest('[data-f]');if(!b)return;filtro=b.dataset.f;
  $('filtros').querySelectorAll('.chip').forEach(c=>c.setAttribute('aria-pressed',c.dataset.f===filtro));
  document.querySelectorAll('.it').forEach(el=>{const x=I.at(+el.dataset.i);el.classList.toggle('dim',filtro!=='todos'&&!x[8].split(' ').includes(filtro))});});
function mostrar(i){const x=I.at(i),nv=N.find(n=>n[0]===x[0]),tp=T.find(t=>t[0]===x[1]);
  document.querySelectorAll('.it').forEach(b=>b.setAttribute('aria-pressed',+b.dataset.i===i));
  $('det').innerHTML=`<div style="display:flex;gap:8px;flex-wrap:wrap"><span class="pill ${x[2]}">${x[2]==='tem'?'Já existe':'Por criar'}</span>${x[7]?`<span class="pill criar">Próxima criação n.º ${x[7]}</span>`:''}${x[9]?`<span class="pill criar">${esc(x[9])}</span>`:''}<span class="pill modo">${esc(x[4])}</span><span class="pill modo">${esc(nv[1])} · ${esc(tp[1])}</span>${x[8].split(' ').map(p=>`<span class="pill modo">${esc(PAGA[p])}</span>`).join('')}</div><h2>${esc(x[3])}</h2><p>${esc(x[5])}</p>${x[6]?`<p><a href="${x[6]}"${/^https?:/.test(x[6])?' target="_blank" rel="noopener"':''}>Abrir →</a></p>`:''}`;}
document.addEventListener('click',e=>{const b=e.target.closest('[data-i]');if(!b)return;mostrar(+b.dataset.i);if(b.classList.contains('pcard'))$('det').scrollIntoView({behavior:'smooth',block:'center'})});
mostrar(I.findIndex(x=>x[7]===1));
