/* Psicoeducação (Florescer, Cuidar, a Roda área a área) e A Aldeia (convidados, tema do mês e modelos).
   Cada página só mostra a parte que tem; os textos são partilhados porque o tema do mês da Aldeia usa a psicoeducação. */
const KEY='caminho-perinatal';
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
async function copiar(txt,msgEl,fallbackEl){
  try{await navigator.clipboard.writeText(txt);msgEl.textContent='Copiado.'}
  catch(e){if(fallbackEl){fallbackEl.value=txt;fallbackEl.select()}msgEl.textContent='Não consegui copiar automaticamente. O texto ficou selecionado: copia-o à mão.'}
}

/* ---------- PSICOEDUCAÇÃO · CUIDAR ---------- */
const PSICO=[
  ['Baby blues ou depressão pós-parto?',`Nos primeiros dias depois do parto, muitas mães sentem-se chorosas, sensíveis e cansadas. Chama-se baby blues, é muito comum e costuma passar sozinho até às duas semanas.

Pode ser mais do que isso se:
• a tristeza, o vazio ou a irritação duram mais de duas semanas;
• deixaste de sentir prazer em quase tudo;
• sentes muita culpa ou que não és boa mãe;
• não consegues dormir mesmo quando o bebé dorme;
• a ansiedade não te larga.

A depressão pós-parto é frequente, não é culpa tua e tem tratamento. Falar cedo faz diferença.`],
  ['Pensamentos intrusivos: o que são',`Muitas mães têm imagens ou pensamentos súbitos e assustadores, como deixar cair o bebé ou magoá-lo sem querer. Estes pensamentos aparecem precisamente porque te importas e causam-te angústia.

Ter um pensamento destes não significa que o queiras fazer nem que o vás fazer. É uma forma de o cérebro, em alerta máximo, tentar proteger o bebé.

Fala com a tua psicóloga se os pensamentos são muito frequentes, se te levam a evitar estar com o bebé ou a verificar tudo vezes sem conta.

Procura ajuda no mesmo dia se deixares de sentir que o pensamento é estranho ou errado, ou se te parecer que faz sentido.`],
  ['Sono no pós-parto',`Dormir pouco é esperado com um bebé. Dormir quase nada durante semanas afeta o humor, a paciência e a capacidade de pensar.

Algumas ideias:
• Protege um bloco de 4 a 5 horas seguidas, com alguém a assegurar o bebé.
• Divide a noite em turnos com quem vive contigo.
• Deita-te cedo pelo menos duas noites por semana.
• Reduz visitas e tarefas que não são essenciais.

Se não consegues dormir mesmo quando tens oportunidade, fala com a tua psicóloga ou com o médico de família.`],
  ['Matrescência',`Tornar-se mãe é uma transição tão grande como a adolescência. Mudam o corpo, as hormonas, a identidade, as relações e o lugar no trabalho.

É normal sentires ao mesmo tempo amor e saudade da vida de antes, alegria e luto, vontade de estar com o bebé e vontade de estar sozinha.

Estas emoções misturadas não dizem nada de mau sobre ti como mãe. Dizem que estás a atravessar uma mudança profunda, e que precisas de tempo e de colo também.`],
  ['Para o pai ou parceiro/a',`Os pais e parceiros/as também podem ter depressão e ansiedade no período perinatal. Nos homens aparece muitas vezes como irritabilidade, afastamento, mais horas a trabalhar ou mais consumos.

Como ajudar:
• Assume tarefas inteiras, não apenas "ajudar quando te pedem".
• Garante que ela dorme um bloco seguido.
• Pergunta como ela está, e escuta sem tentar resolver.
• Repara também em ti e pede ajuda se precisares.

Cuidar de quem cuida é cuidar do bebé.`],
  ['Quando pedir ajuda já',`Procura ajuda no mesmo dia se:
• pensas em morrer, em desaparecer ou em magoar-te;
• tens pensamentos de fazer mal ao bebé que já não te parecem estranhos;
• estás confusa, a ouvir ou ver coisas que os outros não veem, ou quase sem dormir há dias;
• sentes que não consegues manter-te ou ao bebé em segurança.

Em Portugal:
• Emergência: 112
• SNS 24 (aconselhamento, 24h): 808 24 24 24
• Urgência hospitalar mais próxima

Não precisas de ter a certeza de que é grave para pedir ajuda.`]
];

/* ---------- FLORESCER ---------- */
const FLORESCER=[["Matrescência: tornar-se mãe é crescer", "Sabias que a palavra matrescência foi criada em 1973 pela antropóloga Dana Raphael, e recuperada nos últimos anos pela psicóloga Aurélie Athan? Junta maternidade e adolescência, porque as duas são grandes transições: mudam o corpo, as hormonas, a identidade e as relações. Nos pais chama-se patrescência.\n\nOlhar para esta fase como desenvolvimento, e não só como perda, muda a pergunta. Em vez de \"quando volto a ser quem era?\", passa a ser \"quem estou a tornar-me?\".", "Escreve três coisas que descobriste em ti desde que és mãe ou pai: uma força, um limite e uma surpresa.", "Que parte de ti está a nascer com este bebé?"], ["A mãe suficientemente boa", "Nos anos 50, o pediatra e psicanalista Donald Winnicott reparou que os bebés não precisam de mães perfeitas. Precisam de mães \"suficientemente boas\": que respondem muitas vezes, falham algumas e reparam. É nessas pequenas falhas reparadas que o bebé aprende que o mundo é tolerável e que as relações aguentam.\n\nA investigação em vinculação diz o mesmo: o que conta não é acertar sempre, é voltar e reparar.", "Da próxima vez que te irritares ou não conseguires acalmar o bebé, troca a culpa pela reparação: um colo, um olhar, um \"estou aqui\".", "O que seria \"suficientemente bom\" para ti esta semana?"], ["Saborear os bons momentos", "Os psicólogos Fred Bryant e Joseph Veroff chamaram saborear à capacidade de reparar nos bons momentos, prolongá-los e guardá-los. Com um bebé, os dias passam a correr e o que é bom fica escondido debaixo do cansaço. A boa notícia é que saborear se treina, e é das práticas com mais efeito no bem-estar.", "Regra dos 20 segundos: quando o bebé sorrir, quando sentires o cheiro da cabeça dele ou o sol numa caminhada, para 20 segundos. Repara nos pormenores e, à noite, conta a alguém ou escreve.", "Qual foi o melhor minuto do teu dia de hoje?"], ["Brincar no chão", "No Center on the Developing Child, da Universidade de Harvard, chamam \"servir e devolver\" às pequenas trocas entre o bebé e o adulto: ele olha e tu respondes, ele palra e tu imitas. São estas trocas, e não os brinquedos caros, que constroem o cérebro do bebé.\n\nHá um bónus: brincar sem objetivo também acalma os adultos.", "Dez minutos por dia no chão, ao nível do bebé, sem telemóvel. Segue o que ele faz, imita e descreve em voz alta.", "Quando foi a última vez que brincaste só por brincar?"], ["Natureza e movimento", "Um estudo de 2019 com quase 20 mil pessoas em Inglaterra, liderado por Mathew White, concluiu que quem passava pelo menos 120 minutos por semana na natureza relatava mais saúde e mais bem-estar. Não precisa de ser de uma vez: os passeios curtos somam.\n\nCaminhar ao lado de outras pessoas acrescenta conversa e companhia, que também ajudam a acalmar.", "Soma os teus minutos ao ar livre esta semana. Um passeio com o carrinho conta, um banco de jardim também.", "Que sítio perto de casa te faz respirar melhor?"], ["Autocompaixão", "A psicóloga Kristin Neff estuda a autocompaixão há duas décadas: tratarmo-nos com a bondade com que trataríamos uma amiga. Tem três partes: reparar no que dói, lembrar que outras pessoas passam pelo mesmo e falar connosco com gentileza.\n\nAo contrário do que muitas vezes se teme, não nos torna acomodados. Ajuda a recuperar mais depressa dos erros.", "Num momento difícil, mão no peito e três frases: \"Isto é difícil. Muitas mães sentem isto. Que eu seja gentil comigo agora.\"", "O que dirias a uma amiga que estivesse no teu lugar?"], ["Tempo para ti, sem culpa", "Muitas mães sentem que cuidar de si é tirar alguma coisa ao bebé. Mas um adulto descansado e com algo só seu tem mais paciência, mais presença e mais vontade de brincar. Cuidar de quem cuida é também cuidar do bebé.", "Escolhe uma coisa só tua, 30 minutos por semana: desporto, ler, um café sozinha, criar com as mãos. Marca-a no calendário como se fosse uma consulta e combina quem fica com o bebé.", "O que te faz sentir tu mesma?"], ["A tua aldeia", "Ao longo da história, ninguém criou um bebé sozinho: avós, vizinhas e irmãs mais velhas partilhavam o cuidado. A antropóloga Sarah Blaffer Hrdy chama-lhe cuidado cooperativo e defende que faz parte da natureza humana.\n\nHoje muitas famílias vivem longe dessa aldeia. Por isso, é preciso construí-la de propósito.", "Escreve o nome de três pessoas a quem podias pedir uma coisa pequena esta semana. Pede a uma delas.", "Quem faz parte da tua aldeia, e quem podia passar a fazer?"], ["Que família queremos ser?", "Na terapia de aceitação e compromisso, os valores são direções e não metas: nunca se chega lá, escolhem-se todos os dias. A chegada de um bebé é uma boa altura para perguntar o que é importante para vocês. Muitas decisões pequenas ficam mais fáceis quando se sabe para onde se vai.", "Cada um escolhe três palavras para a família que quer ser (por exemplo: calma, curiosidade, natureza). Comparem e guardem as que coincidem.", "Que pequeno gesto desta semana mostra um desses valores?"], ["O casal nos pequenos gestos", "O psicólogo John Gottman observou casais durante décadas. O que distingue os que se mantêm ligados são as pequenas respostas do dia a dia: quando um faz um convite (um comentário, um olhar, um suspiro), o outro vira-se para ele em vez de o ignorar. Com um bebé em casa, estes convites ficam mais raros e mais preciosos.", "Esta semana, repara nos pequenos convites do teu parceiro ou parceira e responde: levanta os olhos, pergunta, toca-lhe no ombro.", "Quando é que te sentes visto(a) pelo outro?"], ["Criar com as mãos", "A investigação de Daisy Fancourt e colegas, na University College London, associa as atividades artísticas e criativas a menos stress e mais bem-estar. Os trabalhos manuais têm uma vantagem: ocupam as mãos e acalmam a cabeça, sem exigir talento. E são das poucas coisas que se podem fazer com um bebé a dormir ao lado.", "Dez minutos com as mãos: desenhar, barro, tricot, colagem, uma vela. Sem o objetivo de ficar bonito.", "O que gostavas de fazer com as mãos quando eras criança?"]];
const RODAPSI=[["A roda: saúde é mais do que não estar doente", "Em 1948, a Organização Mundial da Saúde definiu saúde como um estado de completo bem-estar físico, mental e social, e não apenas a ausência de doença. A Wheel of Health, criada na Duke Integrative Medicine, põe esta ideia em prática: no centro está a pessoa, com atenção ao que sente; à volta, as áreas que cada um pode cuidar; e por fora, os cuidados profissionais.\n\nNa gravidez e no pós-parto, todas as áreas mexem ao mesmo tempo. A roda ajuda a ver o conjunto e a escolher por onde começar, sem querer mudar tudo de uma vez.", "Avalia as oito áreas de 1 a 10 e escolhe uma, a que te dá mais vontade, para cuidar esta semana.", "Se a tua vida fosse uma roda, onde é que ela estaria a raspar no chão?"], ["Quando a roda pesa: isto não é mais uma tarefa", "Uma ferramenta de bem-estar pode, sem querer, virar mais uma lista de deveres para quem já carrega a carga mental da casa e do bebé. A psicologia chama positividade tóxica à pressão para estar sempre bem e sempre a melhorar. Na roda, uma pontuação baixa é informação, não uma falha: há fases em que sobreviver bem já é muito.\n\nSinais de que a roda está a pesar: sentir culpa por não cumprir o passo, comparar a tua roda com a de outras mães, querer melhorar várias áreas ao mesmo tempo, ou ser só a mãe a preenchê-la enquanto o resto da família continua igual.\n\nE um alerta importante: se várias áreas estão muito em baixo há mais de duas semanas, se há tristeza persistente, ansiedade que não larga ou pensamentos de que não vale a pena, a roda não é o primeiro passo. O primeiro passo é falar com um profissional.", "Escolhe no máximo uma área por semana, ou nenhuma. \"Esta semana não mudo nada e descanso\" também é um plano válido. Façam a roda a dois: metade dos passos podem ser do pai ou do parceiro(a).", "O que posso tirar da minha lista, em vez de acrescentar?"], ["Mexer e descansar", "As orientações da Organização Mundial da Saúde de 2020 recomendam a grávidas e mães no pós-parto sem contraindicações pelo menos 150 minutos por semana de atividade moderada, como caminhar a passo rápido. A atividade física está associada a menos sintomas depressivos no pós-parto.\n\nO descanso é a outra metade da mesma área. Com um bebé, o sono vem aos bocados, e por isso cada bocado conta.", "Uma caminhada de 15 minutos com o carrinho conta. Junta duas por semana e uma sesta sem culpa enquanto o bebé dorme.", "Esta semana, o meu corpo precisa mais de movimento ou mais de descanso?"], ["Alimentar-me, e não só ao bebé", "A amamentação aumenta as necessidades de energia e de água da mãe. Depois do parto, o ferro baixo é frequente e causa cansaço que se confunde facilmente com tristeza ou desânimo. Falar disso com o médico é cuidar também do humor.\n\nNas primeiras semanas, quase todas as mães comem de pé, à pressa ou a meio da noite. Não é falta de disciplina: é falta de condições, e as condições preparam-se.", "Deixa ao lado do sítio onde alimentas o bebé uma garrafa de água e um lanche nutritivo. Uma vez por semana, cozinha a dobrar e congela metade.", "O que comi hoje que me deu energia de verdade?"], ["Crescer como pessoa", "Muitas mães descrevem o regresso ao trabalho como uma segunda transição, quase tão grande como o próprio parto. Muda a rotina do bebé, a identidade profissional e a divisão de tarefas em casa, tudo ao mesmo tempo.\n\nCrescer nesta fase também é dar espaço às partes de ti que ficaram em pausa: um interesse, um projeto, uma forma de criar. Não para voltar a ser quem eras, mas para levar contigo quem és agora.", "Escreve uma coisa que queres retomar e uma coisa nova que aprendeste sobre ti desde que és mãe ou pai. Reserva 30 minutos por semana para a primeira.", "Que parte de mim quero levar para a próxima fase?"], ["A casa que me cuida", "A luz da manhã ajuda a acertar o relógio biológico, o da mãe e o do bebé: num estudo inglês, os bebés que apanhavam mais luz natural durante o dia dormiam melhor à noite. E num estudo norte-americano, as mulheres que descreviam a casa como desarrumada e cheia de tarefas por acabar tinham padrões de cortisol associados a mais stress ao longo do dia.\n\nNão se trata de ter a casa perfeita. Trata-se de ter um canto que te faça bem e uma casa que não te cobre mais do que podes dar.", "Abre as janelas de manhã. Escolhe uma única zona da casa para manter arrumada e um canto bonito para alimentar o bebé. O resto pode esperar.", "Onde é que, na minha casa, consigo respirar?"], ["Casal, família e aldeia", "O apoio social é um dos fatores que mais consistentemente protegem a saúde mental no período perinatal. E o casal precisa de cuidado: um estudo de John Gottman e colegas mostrou que cerca de dois terços das mulheres sentiam uma descida na satisfação com a relação nos três anos a seguir ao nascimento do primeiro filho.\n\nA boa notícia é que pequenos rituais de ligação, e pedir ajuda cedo, fazem diferença.", "Marca dez minutos por semana a dois, sem telemóveis. Pede uma coisa concreta a uma pessoa da tua rede.", "De quem preciso de estar mais perto nesta fase?"], ["Sentido e valores", "Viktor Frankl, psiquiatra e sobrevivente dos campos de concentração, escreveu que quem tem um porquê suporta quase qualquer como. A investigação sobre parentalidade encontra um paradoxo: os pais relatam ao mesmo tempo mais stress no dia a dia e mais sentido na vida.\n\nLembrar o porquê não apaga o cansaço, mas muda a forma como o carregamos.", "À noite, nomeia em voz alta um momento do dia que valeu a pena. Escolhe com o teu parceiro três palavras para a família que querem ser.", "Para que é que tudo isto vale a pena, para mim?"], ["Corpo e emoções", "Respirar devagar, com a expiração mais longa do que a inspiração, ativa o sistema nervoso parassimpático, o que nos ajuda a abrandar. Reparar nas sensações do corpo, a que se chama interoceção, é a porta de entrada para reconhecer emoções antes de elas transbordarem.\n\nNo pós-parto, o corpo muda depressa e é tocado o dia inteiro pelo bebé. Voltar a habitá-lo, com gentileza, faz parte da recuperação.", "Três vezes por dia, para e faz três respirações: inspira em quatro tempos, expira em seis. Repara onde sentes o cansaço e põe lá a mão.", "O que é que o meu corpo me está a tentar dizer?"], ["Cuidados de saúde", "Em França, a reabilitação do pavimento pélvico depois do parto faz parte dos cuidados de rotina. Em muitos países, incluindo Portugal, ainda depende de cada mulher pedir. A consulta de revisão do puerpério, nas primeiras semanas depois do parto, é o momento para falar do corpo, do sono, do humor e da contraceção.\n\nPedir ajuda profissional não é sinal de que algo correu mal. É uma das áreas da roda, tão normal como comer ou dormir.", "Marca a consulta que andas a adiar e guarda no telemóvel o contacto do centro de saúde e do SNS 24 (808 24 24 24).", "Que cuidado de saúde tenho adiado por estar a cuidar dos outros?"]];
const SEGTXT={florescer:'Para famílias que estão bem e querem estar melhor: práticas, rituais e curiosidade, com base na investigação.',cuidar:'Para quando é preciso mais: reconhecer sinais, pedir ajuda e proteger a saúde mental.'};

/* ---------- MODELOS DA ALDEIA ---------- */
const MODELOS=[
  ['A Aldeia · guião do círculo mensal (60 min)',`ANTES
• Rever o tema do mês e o texto do página A Aldeia.
• Ver quem é nova no grupo e quem esteve ausente nos últimos círculos.
• Ter à mão o protocolo de crise na comunidade.

1. ABERTURA (5 min)
Boas-vindas, sobretudo a quem chega pela primeira vez.
Relembrar os acordos: o que se diz aqui fica aqui; falamos de nós e não damos conselhos médicos; ninguém é obrigada a falar; câmara ligada ou desligada, como preferir.
"Isto é um espaço de partilha e psicoeducação, não é consulta. Se precisares de mais, falamos em privado no fim."

2. RONDA (15 min)
"Numa palavra ou numa frase: como chegas hoje?"
Só escutar e agradecer. Não aprofundar nesta fase.

3. TEMA DO MÊS (25 min)
Ligar ao convidado do mês: o que ficou da sessão, o que ainda faz pensar.
Partilhar a pergunta para o grupo e abrir a conversa.
Devolver ao grupo em vez de responder: "Alguém já sentiu algo parecido?"

4. PRÁTICA (10 min)
O exercício do mês, feito ali: uma respiração, uma escrita curta, um compromisso para a semana.

5. FECHO (5 min)
"O que levas daqui?" Uma frase cada.
Lembrar a data do próximo círculo e do próximo convidado.
"Se alguma coisa de hoje mexeu contigo, escreve-me em privado."

SE ALGUÉM SE DESORGANIZA NO GRUPO
• Acolher sem aprofundar: "Obrigada por partilhares isto. É importante e merece mais tempo do que temos aqui."
• Não explorar trauma, perda ou ideação em grupo.
• Combinar falar logo a seguir, em privado.
• Se houver sinais de risco, segue o protocolo de crise na comunidade.

DEPOIS
• Escrever duas linhas: o que surgiu, quem precisa de contacto individual.
• Contactos privados no próprio dia.
• Levar à supervisão o que te deixou em dúvida.`],
  ['A Aldeia · regras do grupo (para partilhar com as membros)',`BEM-VINDA À ALDEIA

A Aldeia é um espaço para mães e pais no primeiro ano com o bebé. Para que seja seguro para todas, combinamos o seguinte:

1. O que se partilha aqui fica aqui. Não faças capturas de ecrã nem partilhes histórias de outras pessoas fora do grupo.
2. Falamos da nossa experiência. Não damos conselhos médicos, nem sobre medicação, nem diagnósticos a ninguém.
3. Cada família faz o melhor que pode. Aqui não se julga a forma de alimentar, adormecer, trabalhar ou criar.
4. Não há publicidade nem venda sem combinar antes com a equipa.
5. As sessões são gravadas só para as membros. Podes participar com a câmara desligada e com o nome que preferires.
6. A Aldeia é um espaço de partilha e psicoeducação. Não substitui consulta de psicologia, nem médica.
7. A Aldeia não é um serviço de urgência e não está a ser acompanhada 24 horas por dia. A equipa lê as mensagens [nos dias e horas].

SE PRECISARES DE AJUDA URGENTE
Se pensas em morrer, em magoar-te ou em fazer mal ao bebé, ou se sentes que não consegues manter-te em segurança:
• Emergência: 112
• SNS 24 (24 horas): 808 24 24 24
• Urgência hospitalar mais próxima
Não precisas de ter a certeza de que é grave.

Quem não respeitar estas regras pode ser removida do grupo, depois de uma conversa com a equipa.

Obrigada por fazeres parte desta aldeia.`],
  ['A Aldeia · protocolo de crise na comunidade',`QUANDO ACIONAR
Uma mensagem, comentário ou partilha em sessão que fale de:
• vontade de morrer, desaparecer ou de se magoar;
• pensamentos de fazer mal ao bebé que não parecem estranhos à pessoa;
• confusão, ideias estranhas, ver ou ouvir coisas, dias quase sem dormir;
• violência em casa ou sentir-se em perigo.

1. RESPONDER EM PRIVADO, NO PRÓPRIO DIA
Não discutir no grupo. Mensagem privada:
"Olá [nome], li a tua mensagem e fiquei preocupada contigo. Obrigada por teres escrito. Posso ligar-te agora, ou dizes-me um número para falarmos? Se estiveres em perigo neste momento, liga 112."

2. AVALIAR
Ao telefone ou videochamada: perguntar diretamente sobre ideias, plano, meios e proteção. Perguntar quem está em casa.

3. AGIR SEGUNDO O RISCO
• Risco elevado ou sinais de psicose pós-parto: não a deixar sozinha. 112 ou urgência hospitalar, envolvendo quem está com ela.
• Risco sem perigo imediato: plano de segurança, contacto com o médico de família no próprio dia ou no seguinte, consulta individual.
• Sem risco: acolher e propor acompanhamento individual (ver encaminhamento).

4. NO GRUPO
Se a mensagem foi pública: ocultar com cuidado e deixar uma nota curta ao grupo, sem detalhes: "Estamos em contacto com a [nome]. Se alguma de vocês ficou mexida, escreve-me."
Nunca deixar uma mensagem destas sem resposta visível da equipa.

5. REGISTAR E SUPERVISIONAR
Registar o que aconteceu, com hora e medidas tomadas. Discutir na supervisão seguinte, ou antes, se houver dúvidas.

LEMBRA-TE
A Aldeia não é vigiada 24 horas. As regras do grupo dizem isso e dão os números de urgência. Não és a única rede desta pessoa: o objetivo é ligá-la ao cuidado certo.`],
  ['A Aldeia · da comunidade para a consulta',`PRINCÍPIOS
• Encaminhar quando há sofrimento que o grupo não chega para conter, e não para vender consultas.
• Dar sempre mais do que uma opção: tu, uma colega, o médico de família, a consulta do SNS. A escolha é dela.
• Fazer o convite em privado, nunca no grupo.
• Ficar na Aldeia não depende de ir à consulta, e ir à consulta não depende de ficar na Aldeia.
• Em caso de dúvida sobre conflito de interesses, falar em supervisão.

QUANDO PROPOR
• Sinais que se repetem há mais de duas semanas (tristeza, ansiedade, não conseguir dormir).
• Pontuação alta num rastreio da comunidade.
• Uma partilha sobre parto difícil, perda ou trauma que precisa de mais tempo.
• Pedido da própria pessoa.

MENSAGEM PRIVADA
"Olá [nome], fiquei a pensar no que partilhaste [no círculo / na mensagem]. Parece-me que estás a carregar muita coisa, e mereces um espaço só teu para isso.

Se fizer sentido, há várias formas:
• falar com o teu médico de família, que pode encaminhar para psicologia no SNS;
• marcar consulta com uma psicóloga perinatal. Posso indicar-te colegas, ou podes marcar comigo [link de agendamento];
• se for mais urgente, SNS 24 (808 24 24 24).

Não há pressa nem obrigação. Continuas sempre bem-vinda na Aldeia. Se quiseres, falamos dez minutos para perceberes o que te faz mais sentido."

DEPOIS
• Se ela marcar contigo: a partir daí aplica-se o consentimento informado e o processo clínico, separado da comunidade.
• Não falar no grupo do acompanhamento individual de ninguém.`]
];
document.addEventListener('click',e=>{const b=e.target.closest('[data-copy]');if(!b)return;const id=b.dataset.copy;const el=document.getElementById(id);
  const txt=(b.dataset.title?b.dataset.title+'\n\n':'')+el.textContent;
  navigator.clipboard.writeText(txt).then(()=>document.getElementById(id+'m').textContent='Copiado.').catch(()=>{const r=document.createRange();r.selectNodeContents(el);const s=getSelection();s.removeAllRanges();s.addRange(r);document.getElementById(id+'m').textContent='Texto selecionado: copia-o à mão.'})});

if(window.psicoLista){
psicoLista.innerHTML=PSICO.map(([t,txt],i)=>`<details${i===0?' open':''}><summary>${t}</summary><div class="panel" style="gap:10px"><div class="doc" id="ps${i}">${esc(txt)}</div><div class="row"><button class="btn ghost" data-copy="ps${i}" data-title="${esc(t)}">Copiar texto</button><span class="status" id="ps${i}m"></span></div></div></details>`).join('');
florescerLista.innerHTML=FLORESCER.map(([t,txt,exp,q],i)=>`<details${i===0?' open':''}><summary>${esc(t)}</summary><div class="panel" style="gap:12px"><div class="doc" style="white-space:pre-wrap">${esc(txt)}</div><div class="fl-part"><b>Experimenta esta semana</b><span>${esc(exp)}</span></div><div class="fl-part"><b>Para levar contigo</b><span class="fl-q">${esc(q)}</span></div><div class="row"><button class="btn ghost" data-flcopy="${i}">Copiar texto</button><span class="status" id="fl${i}m"></span></div></div></details>`).join('');
florescerLista.addEventListener('click',e=>{const b=e.target.closest('[data-flcopy]');if(!b)return;const i=+b.dataset.flcopy,[t,txt,exp,q]=FLORESCER.at(i);
  const out=`${t}\n\n${txt}\n\nExperimenta esta semana: ${exp}\n\nPara levar contigo: ${q}`;
  navigator.clipboard.writeText(out).then(()=>document.getElementById('fl'+i+'m').textContent='Copiado.').catch(()=>{const ta=document.createElement('textarea');ta.value=out;b.after(ta);ta.select();document.getElementById('fl'+i+'m').textContent='Texto selecionado: copia-o à mão.'})});
rodaLista.innerHTML=RODAPSI.map(([t,txt,exp,q],i)=>`<details${i===1?' open':''}${i===1?' style="border-color:var(--accent)"':''}><summary>${esc(t)}</summary><div class="panel" style="gap:12px"><div class="doc" style="white-space:pre-wrap">${esc(txt)}</div><div class="fl-part"><b>Experimenta esta semana</b><span>${esc(exp)}</span></div><div class="fl-part"><b>Para levar contigo</b><span class="fl-q">${esc(q)}</span></div><div class="row"><button class="btn ghost" data-rdcopy="${i}">Copiar texto</button><span class="status" id="rd${i}m"></span></div></div></details>`).join('');
rodaLista.addEventListener('click',e=>{const b=e.target.closest('[data-rdcopy]');if(!b)return;const i=+b.dataset.rdcopy,[t,txt,exp,q]=RODAPSI.at(i);
  const out=`${t}\n\n${txt}\n\nExperimenta esta semana: ${exp}\n\nPara levar contigo: ${q}`;
  navigator.clipboard.writeText(out).then(()=>document.getElementById('rd'+i+'m').textContent='Copiado.').catch(()=>{const ta=document.createElement('textarea');ta.value=out;b.after(ta);ta.select();document.getElementById('rd'+i+'m').textContent='Texto selecionado: copia-o à mão.'})});
function psicoVer(v){psicoSeg.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.v===v));florescerLista.hidden=v!=='florescer';rodaCard.hidden=v!=='florescer';rodaGrupo.hidden=v!=='florescer';florescerTit.hidden=v!=='florescer';psicoLista.hidden=v!=='cuidar';psicoSegTxt.textContent=SEGTXT[v]}
psicoSeg.addEventListener('click',e=>{const b=e.target.closest('[data-v]');if(b)psicoVer(b.dataset.v)});
psicoVer('florescer');
}
if(window.modelosLista){
modelosLista.innerHTML=MODELOS.map(([t,txt],i)=>`<details${i===0?' open':''}><summary>${t}</summary><div class="panel" style="gap:10px"><div class="doc" id="md${i}">${esc(txt)}</div><div class="row"><button class="btn ghost" data-copy="md${i}">Copiar texto</button><span class="status" id="md${i}m"></span></div></div></details>`).join('');
}
if(document.querySelector('[data-panel="aldeia"]')){
const CONVIDADOS=[
  {id:'g1',mes:'Março',nome:'Bárbara Figueiredo',papel:'Professora e investigadora em psicologia perinatal, Escola de Psicologia da Universidade do Minho',tema:'O que a investigação nos diz sobre a saúde mental da mãe e do bebé',porque:'A referência no Norte. Abre a Aldeia com peso e aproxima-te da UMinho.',link:'https://cipsi.uminho.pt/en/user/1003'},
  {id:'g2',mes:'Abril',nome:'Patrícia Fernandes · Slow.mãe',papel:'Psicóloga clínica em Lisboa (mestrado no ISPA), aconselhamento parental, mindfulness e autocompaixão; marca de slow parenting',tema:'Maternidade sem pressa: presença, autocompaixão e os muitos papéis da mãe',porque:'Abril é o mês do regresso ao trabalho e da creche, quando os papéis se acumulam. Ela trabalha a gestão de múltiplos papéis e o stress, e encaixa com o tema Autocompaixão do Florescer.',link:'https://patriciafernandespsicologia.com/slowmae'},
  {id:'g3',mes:'Maio',nome:'Ana Fonseca',papel:'Investigadora da Universidade de Coimbra, coautora do programa Be a Mom',tema:'Baby blues ou algo mais? Prevenir a depressão pós-parto',porque:'Coincide com o Dia Mundial da Saúde Mental Materna e com o lançamento do guia.',link:'https://saude.fpce.uc.pt/ana_fonseca.html'},
  {id:'g4',mes:'Junho',nome:'Ana Marques',papel:'Fisioterapeuta de pavimento pélvico',tema:'O corpo depois do parto: recuperar, mexer, voltar a ti',porque:'Liga às caminhadas e à Roda da Saúde Perinatal.'},
  {id:'g5',mes:'Setembro',nome:'Ana Correia',papel:'Luto perinatal',tema:'Falar de perda: o que dizer, o que não dizer',porque:'Prepara o Círculo de perda gestacional e PMA, que abre em setembro.'},
  {id:'g6',mes:'Outubro',nome:'Raquel S. Correia',papel:'Psiquiatra, Hospital CUF Trindade, com diferenciação em saúde mental perinatal',tema:'Medicação na gravidez e na amamentação: perguntas sem medo',porque:'A dúvida que mais aparece e a que só uma psiquiatra pode responder com segurança.',link:'https://www.cuf.pt/medicos/raquel-s-correia'},
  {id:'g7',mes:'Novembro',nome:'Filipa Castanhinha',papel:'Psicóloga, autora de O Colo (Não) Vicia',tema:'Colo, vinculação e culpa',porque:'Já trabalhas com ela; a sessão serve a Aldeia e a divulgação do livro.'},
  {id:'g8',mes:'Dezembro',nome:'Catarina Canela Martins',papel:'Psicóloga clínica perinatal, tua orientadora de estágio',tema:'Festas, família e limites no primeiro Natal com o bebé',porque:'Sessão a duas que reforça a ligação clínica da Aldeia.'}
];
const RESERVA=[
  {id:'r5',nome:'Luísa Matos',papel:'Osteopatia e fisioterapia pediátrica',tema:'O corpo do bebé: cólicas, torcicolo, posições e desenvolvimento motor'},
  {id:'r6',nome:'A escolher · sono infantil',papel:'Especialista em sono do bebé com abordagem respeitosa',tema:'Noites possíveis: sono do bebé e sono da mãe'},
  {id:'r1',nome:'Raquel Costa',papel:'Investigadora no HEI-Lab, Universidade Lusófona',tema:'Pedir ajuda: porque tantas mães ficam sem resposta',link:'https://hei-lab.ulusofona.pt/about/team/raquel-costa'},
  {id:'r2',nome:'A escolher · amamentação',papel:'Consultora de lactação IBCLC',tema:'Amamentar sem dor e regressar ao trabalho a amamentar'},
  {id:'r3',nome:'A escolher · casal',papel:'Terapeuta de casal',tema:'O casal depois do bebé: carga mental e divisão de tarefas'},
  {id:'r4',nome:'A escolher · direitos',papel:'Jurista ou técnica da Segurança Social',tema:'Licenças, subsídios e direitos no regresso ao trabalho'}
];
/* Tema do mês: texto já escrito na Psicoeducação + exercício e pergunta para o grupo */
const KITS={
  g1:{src:'RD',i:0,ex:'Cada membro preenche a Roda da Saúde Perinatal e escolhe uma área para março (sem partilhar as pontuações no grupo).',q:'Que área da tua roda tem pedido mais atenção desde que o bebé nasceu?'},
  g2:{src:'FL',i:5,ex:'Três vezes esta semana: mão no peito e as três frases da autocompaixão, num momento difícil.',q:'Que papel estás a tentar cumprir na perfeição, e o que acontecia se fosse só suficientemente bom?'},
  g3:{src:'PS',i:0,ex:'Partilhar com alguém de confiança uma frase verdadeira sobre como te tens sentido.',q:'O que te ajudaria a pedir ajuda mais cedo, se um dia precisasses?'},
  g4:{src:'RD',i:9,ex:'Marcar a consulta de saúde que andas a adiar, ou uma avaliação do pavimento pélvico.',q:'Como está a tua relação com o teu corpo desde o parto?'},
  g5:{src:'TX',t:'Falar de perda',txt:'Muitas famílias passam por uma perda gestacional ou perinatal, antes ou depois deste bebé, e quase sempre em silêncio. O luto perinatal é um luto verdadeiro, mesmo quando os outros não o reconhecem.\n\nNem todas no grupo terão vivido uma perda, mas todas conhecem alguém. Saber o que dizer, e o que não dizer, é uma forma de cuidar.',ex:'Se fizer sentido para ti, escreve o nome ou uma palavra para alguém que perdeste. Se não, pensa numa pessoa que precisava de ouvir "lembro-me".',q:'O que gostavas que te tivessem dito, ou que tivessem dito a alguém perto de ti?'},
  g6:{src:'PS',i:5,ex:'Guardar no telemóvel o SNS 24 (808 24 24 24) e o contacto do médico de família, e anotar as dúvidas para a próxima consulta.',q:'Que medo ou dúvida sobre tratamento nunca te atreveste a perguntar?'},
  g7:{src:'FL',i:1,ex:'Depois de um momento difícil com o bebé, trocar a culpa pela reparação: um colo, um olhar, um "estou aqui".',q:'O que seria "suficientemente bom" para ti esta semana?'},
  g8:{src:'RD',i:6,ex:'Combinar com o parceiro ou parceira um limite para as festas (horas, visitas, viagens) e dizê-lo antes, não durante.',q:'Que tradição queres manter, e qual podes deixar ir este ano?'}
};
function kitDe(id){const k=KITS[id];if(!k)return null;
  if(k.src==='TX')return {t:k.t,txt:k.txt,ex:k.ex,q:k.q,orig:'Texto novo'};
  const arr=k.src==='FL'?FLORESCER:k.src==='RD'?RODAPSI:PSICO;const it=arr[k.i];
  return {t:it[0],txt:it[1],ex:k.ex,q:k.q,orig:k.src==='FL'?'Florescer':k.src==='RD'?'Roda':'Cuidar'};
}
function kitTexto(g){const k=kitDe(g.id);return `A ALDEIA · ${g.mes.toUpperCase()}\nConvidada: ${g.nome} · ${g.tema}\n\n${k.t}\n\n${k.txt}\n\nExperimenta este mês: ${k.ex}\n\nPara conversarmos no grupo: ${k.q}`}
const AL_EST=['Por contactar','Contactado','Confirmado','Feito'];
const AL_KEY=KEY+'-aldeia';
let alEstado={};
try{alEstado=JSON.parse(localStorage.getItem(AL_KEY))||{}}catch(e){alEstado={}}
function alGuardar(){try{localStorage.setItem(AL_KEY,JSON.stringify(alEstado))}catch(e){}}
function alCard(g){
  const st=(alEstado[g.id]||{}).e||0,nota=(alEstado[g.id]||{}).n||'';
  const cor=st===0?'':st===3?'verde':st===2?'verde':'amarelo';
  return `<div class="case ${st>=2?'':st===1?'amarelo':''}" style="cursor:default;border-left-color:${st>=2?'var(--ok)':st===1?'var(--warn)':'var(--line)'}">
    <div class="row" style="justify-content:space-between;gap:8px"><strong>${g.mes?esc(g.mes)+' · ':''}${esc(g.nome)}</strong><span class="pill ${cor}">${AL_EST[st]}</span></div>
    <span class="meta">${esc(g.papel)}${g.link?` · <a href="${g.link}" target="_blank" rel="noopener">perfil</a>`:''}</span>
    <span><em>${esc(g.tema)}</em></span>
    ${g.porque?`<span class="meta">${esc(g.porque)}</span>`:''}
    ${KITS[g.id]?(()=>{const k=kitDe(g.id);return `<details style="background:var(--paper);margin-top:6px;padding:10px 12px"><summary style="font-size:.9rem">Tema do mês · ${esc(k.t)} <span class="pill">${k.orig}</span></summary><div class="panel" style="gap:10px"><div class="doc" style="font-size:.88rem">${esc(k.txt)}</div><div class="fl-part"><b>Experimenta este mês</b><span>${esc(k.ex)}</span></div><div class="fl-part"><b>Para conversarmos no grupo</b><span class="fl-q">${esc(k.q)}</span></div><div class="row"><button class="btn ghost" data-kit="${g.id}">Copiar o tema do mês</button><span class="status" id="kit-${g.id}m"></span></div></div></details>`})():''}
    <div class="grid2" style="gap:8px;margin-top:4px">
      <div class="field"><label for="ale-${g.id}" class="small">Estado</label><select id="ale-${g.id}" data-al="${g.id}">${AL_EST.map((s,i)=>`<option value="${i}"${i===st?' selected':''}>${s}</option>`).join('')}</select></div>
      <div class="field"><label for="aln-${g.id}" class="small">Notas (data, contacto, cachet)</label><input id="aln-${g.id}" data-aln="${g.id}" value="${esc(nota)}"></div>
    </div>
  </div>`;
}
function renderAldeia(){
  alLista.innerHTML=CONVIDADOS.map(alCard).join('');
  alReserva.innerHTML=RESERVA.map(alCard).join('');
  const est=CONVIDADOS.map(g=>(alEstado[g.id]||{}).e||0);
  alStats.innerHTML=[[CONVIDADOS.length,'sessões em 2027'],[est.filter(s=>s>=2).length,'confirmadas'],[est.filter(s=>s===1).length,'à espera de resposta'],[est.filter(s=>s===0).length,'por contactar']].map(([n,l])=>`<div class="stat"><b>${n}</b><span>${l}</span></div>`).join('');
}
document.querySelector('[data-panel="aldeia"]').addEventListener('change',e=>{
  const s=e.target.closest('[data-al]'),n=e.target.closest('[data-aln]');
  if(s){alEstado[s.dataset.al]={...(alEstado[s.dataset.al]||{}),e:+s.value};alGuardar();renderAldeia()}
  if(n){alEstado[n.dataset.aln]={...(alEstado[n.dataset.aln]||{}),n:n.value};alGuardar()}
});
document.querySelector('[data-panel="aldeia"]').addEventListener('click',e=>{const go=e.target.closest('[data-goto]');if(go){e.preventDefault();show(go.dataset.goto);window.scrollTo({top:0,behavior:'smooth'});return}
  const b=e.target.closest('[data-kit]');if(!b)return;const g=CONVIDADOS.find(x=>x.id===b.dataset.kit);
  copiar(kitTexto(g),document.getElementById('kit-'+g.id+'m'),null)});
alConvite.textContent=`Olá [nome],

Sou a Joana, psicóloga perinatal em Braga e Porto, e acompanho famílias na gravidez e no pós-parto. Também falo com mais de 48 mil mães e pais no Instagram, em @acarlabairro.

Em 2027 vou abrir A Aldeia, uma comunidade online para mães e pais no primeiro ano com o bebé. Todos os meses convido uma especialista para uma conversa em direto com o grupo, e gostava muito que fosse uma delas.

O que proponho:
• Tema: [tema]
• Data: [mês de 2027], em dia e hora à sua escolha
• Formato: 45 minutos de conversa comigo e 15 de perguntas, online, gravado para os membros
• Cachet de [valor] € e divulgação da sessão e do seu trabalho no Instagram e na lista de emails

É psicoeducação em grupo, sem casos individuais, e quem precisar de mais acompanhamento é encaminhado.

Teria disponibilidade para falarmos 15 minutos nas próximas semanas?

Obrigada,
Joana [apelido profissional]
Psicóloga · [cédula OPP] · [contacto]`;
renderAldeia();
}
