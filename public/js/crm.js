/* CRM da equipa: fala com o servidor do Caminho (/api/...). Nada fica guardado no aparelho.
   Antes de guardar notas, avisa se o texto parece informação de saúde: essa nunca entra aqui. */
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const dataPT = iso => iso ? new Date(iso).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
const horaPT = iso => iso ? new Date(iso).toLocaleString('pt-PT', { dateStyle: 'short', timeStyle: 'short' }) : '';
const euros = v => (Number(v) || 0).toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' });
const ROTULO = { nota: 'Nota', email: 'Email', chamada: 'Chamada', reuniao: 'Reunião', tarefa: 'Tarefa' };
const MK = { sim: 'aceita marketing', nao: 'sem marketing', pendente: 'marketing por confirmar', desconhecido: '' };

/* Palavras que denunciam informação clínica. Não bloqueia: pede para confirmar e lembra a regra. */
const SAUDE = /\b(depress|ansied|p[aâ]nico|suic|autoles|medica[cç]|antidepress|psiquiatr|diagn[oó]st|sintoma|terapia|psicoterap|consulta de psicolog|paciente|perturba[cç]|trauma|luto|aborto|perda gestacional|morte fetal|infertil|pma\b|fiv\b|insónia|insonia|burn ?out)/i;
function semSaude(txt) {
  if (!SAUDE.test(txt)) return true;
  return confirm('Este texto parece ter informação de saúde. No CRM não se escreve nada clínico: isso fica só no Consultório.\n\nQueres guardar mesmo assim?');
}

let EU = null, atual = null;
async function api(caminho, opcoes = {}) {
  const r = await fetch('/api/' + caminho, {
    ...opcoes, credentials: 'same-origin',
    headers: { 'content-type': 'application/json', 'x-caminho': '1', ...(opcoes.headers || {}) },
    body: opcoes.body ? JSON.stringify(opcoes.body) : undefined
  });
  let d = null; try { d = await r.json(); } catch (e) { }
  if (!r.ok) throw Object.assign(new Error((d && d.erro) || `Erro ${r.status}`), { estado: r.status });
  return d;
}
function aviso(msg) { $('aviso').hidden = !msg; $('aviso').textContent = msg || ''; }

/* ---------- separadores ---------- */
const tabs = [...document.querySelectorAll('nav[role=tablist] button')];
function mostrar(id) {
  tabs.forEach(t => t.setAttribute('aria-selected', t.dataset.tab === id));
  document.querySelectorAll('[data-panel]').forEach(p => p.hidden = p.dataset.panel !== id);
  ['ficha', 'oEditor', 'tEditor'].forEach(x => $(x).hidden = true);
  if (id === 'tarefas') carregarTarefas();
  if (id === 'oportunidades') carregarOportunidades();
  if (id === 'registo') carregarRegisto();
}
tabs.forEach(t => t.addEventListener('click', () => mostrar(t.dataset.tab)));

/* ---------- arranque ---------- */
async function iniciar() {
  try {
    EU = await api('eu');
  } catch (e) {
    aviso(e.estado === 401 || e.estado === 403 ? `Sem acesso ao CRM: ${e.message}` : `O CRM ainda não está pronto: ${e.message}`);
    document.querySelectorAll('[data-panel], nav[role=tablist]').forEach(x => x.hidden = true);
    return;
  }
  $('quem').textContent = `Entraste como ${EU.email}`;
  $('fTipo').insertAdjacentHTML('beforeend', EU.tipos.map(t => `<option>${esc(t)}</option>`).join(''));
  const opcoes = (l, vazio) => (vazio !== undefined ? `<option value="">${esc(vazio)}</option>` : '') + l.map(x => `<option>${esc(x)}</option>`).join('');
  const L = EU.listas;
  $('fLead').innerHTML = opcoes(L.estados_lead, '—'); $('fFase').innerHTML = opcoes(L.fases_vida, '—');
  $('oFase').insertAdjacentHTML('beforeend', opcoes(L.fases_oportunidade)); $('oTipo').innerHTML = opcoes(L.tipos_oportunidade, '—'); $('oFaseE').innerHTML = opcoes(L.fases_oportunidade);
  $('tEstado').insertAdjacentHTML('beforeend', opcoes(L.estados_tarefa)); $('tArea').insertAdjacentHTML('beforeend', opcoes(L.areas)); $('tAreaE').innerHTML = opcoes(L.areas, '—'); $('tEstadoE').innerHTML = opcoes(L.estados_tarefa);
  $('fNaoContactarAj').textContent = EU.responsavel ? 'Só tu podes mudar isto. A equipa vê a marca, mas não o motivo: não escrevas o motivo em lado nenhum do CRM.' : 'Só a responsável pode mudar isto. Se estiver marcado, não envies emails, ofertas nem convites a esta pessoa.';
  $('sincCard').hidden = !EU.shopify;
  textoSinc(EU.sincronizacao);
  carregarLista();
}
function textoSinc(s) {
  $('sincTxt').textContent = s ? `Última atualização: ${horaPT(s.quando)}, por ${s.por}: ${s.clientes} clientes e ${s.encomendas} encomendas ${s.completa ? 'importados' : 'novos ou alterados'}. Atualiza sozinha todos os dias.` : 'Ainda não foi importado nada da loja.';
}
$('sincBtn').addEventListener('click', async () => {
  const b = $('sincBtn'); b.disabled = true; b.textContent = 'A importar…';
  try {
    let r = { passo: null };
    do {
      r = await api('sincronizar', { method: 'POST', body: { passo: r.passo } });
      if (!r.feito) b.textContent = `A importar… ${r.passo.clientes} clientes${r.passo.fase === 'encomendas' ? `, ${r.passo.encomendas} encomendas` : ''}`;
    } while (!r.feito);
    textoSinc(r.resumo); carregarLista(); aviso('');
  } catch (e) { aviso(`A importação falhou: ${e.message}`); }
  b.disabled = false; b.textContent = 'Atualizar da Shopify';
});

/* ---------- lista ---------- */
let espera = null;
['q', 'fTipo', 'fMarca'].forEach(id => $(id).addEventListener('input', () => { clearTimeout(espera); espera = setTimeout(carregarLista, 250); }));
async function carregarLista() {
  const p = new URLSearchParams({ q: $('q').value.trim(), tipo: $('fTipo').value, marca: $('fMarca').value });
  let d;
  try { d = await api('contactos?' + p); } catch (e) { aviso(e.message); return; }
  const cs = d.contactos;
  $('stats').innerHTML = [[d.total, 'contactos'], [cs.filter(c => c.n_encomendas > 0).length, 'compraram (nesta lista)'], [cs.filter(c => c.marketing === 'sim').length, 'aceitam marketing (nesta lista)']]
    .map(([n, l]) => `<div class="stat"><b>${n}</b><span>${l}</span></div>`).join('');
  $('contagem').textContent = cs.length === 300 ? 'A mostrar os 300 mais recentes. Procura para encontrar outros.' : `${cs.length} ${cs.length === 1 ? 'contacto' : 'contactos'}`;
  $('lista').innerHTML = cs.length ? cs.map(c => `<button class="case" data-id="${c.id}" style="text-align:left;cursor:pointer;font:inherit;border-left-color:${c.n_encomendas ? 'var(--ok)' : 'var(--line)'}">
    <strong>${esc(c.nome || c.email || 'Sem nome')}</strong>
    <span class="meta">${esc([c.email, c.telefone].filter(Boolean).join(' · '))}</span>
    <span>${c.nao_contactar ? '<span class="pill vermelho">não enviar ações comerciais</span> ' : ''}${c.estado_lead ? `<span class="pill amarelo">${esc(c.estado_lead)}</span> ` : ''}${c.tipos.map(t => `<span class="pill">${esc(t)}</span>`).join(' ')} ${c.marcas.map(m => `<span class="pill ex">${esc(m)}</span>`).join(' ')}</span>
    ${c.n_encomendas ? `<span class="meta">${c.n_encomendas} ${c.n_encomendas == 1 ? 'encomenda' : 'encomendas'} · ${euros(c.total_gasto)}${MK[c.marketing] ? ' · ' + MK[c.marketing] : ''}</span>` : (MK[c.marketing] ? `<span class="meta">${MK[c.marketing]}</span>` : '')}
  </button>`).join('') : '<p class="small">Nenhum contacto com estes filtros.</p>';
}
$('lista').addEventListener('click', e => { const b = e.target.closest('[data-id]'); if (b) abrir(b.dataset.id); });

/* ---------- ficha ---------- */
async function abrir(id) {
  let c;
  try { c = await api('contactos/' + id); } catch (e) { aviso(e.message); return; }
  atual = c;
  document.querySelectorAll('[data-panel]').forEach(p => p.hidden = true);
  $('ficha').hidden = false; window.scrollTo({ top: 0 });
  $('fNomeT').textContent = c.nome || c.email || 'Sem nome';
  $('fOrigem').textContent = (c.origem === 'shopify' ? 'Veio da Shopify' : 'Criado à mão') + (c.atualizado_por ? ` · última alteração por ${c.atualizado_por}, ${horaPT(c.atualizado_em)}` : '');
  $('fNome').value = c.nome || ''; $('fEmail').value = c.email || ''; $('fTel').value = c.telefone || ''; $('fMk').value = c.marketing; $('fNotas').value = c.notas || '';
  $('fLead').value = c.estado_lead || ''; $('fInteresse').value = c.interesse || ''; $('fCanal').value = c.canal || ''; $('fCidade').value = c.cidade || '';
  $('fConsent').value = c.consent_fase || 'desconhecido'; $('fFase').value = c.fase || ''; faseAtiva();
  $('fNaoContactar').checked = !!c.nao_contactar; $('fNaoContactar').disabled = !EU.responsavel;
  $('fTipos').innerHTML = EU.tipos.map(t => `<button class="chip sel" data-t="${esc(t)}" aria-pressed="${c.tipos.includes(t)}">${esc(t)}</button>`).join('');
  $('fEnc').innerHTML = c.encomendas.length ? `<div class="hist"><table><thead><tr><th>Data</th><th>N.º</th><th>Produtos</th><th>Total</th></tr></thead><tbody>${c.encomendas.map(o => `<tr><td>${dataPT(o.data)}</td><td>${esc(o.numero)}${o.estado === 'CANCELADA' ? ' <span class="pill vermelho">cancelada</span>' : ''}</td><td>${o.itens.map(i => `${esc(i.titulo)}${i.qtd > 1 ? ' ×' + i.qtd : ''}`).join('<br>')}</td><td>${euros(o.total)}</td></tr>`).join('')}</tbody></table></div>` : '<p class="small">Sem encomendas.</p>';
  desenharInteracoes();
  $('fMsg').textContent = ''; $('iMsg').textContent = ''; $('rMsg').textContent = '';
}
function desenharInteracoes() {
  $('fInt').innerHTML = atual.interacoes.length ? atual.interacoes.map(i => `<div class="case" style="cursor:default;border-left-color:${i.tipo === 'tarefa' ? (i.feito ? 'var(--ok)' : 'var(--warn)') : 'var(--line)'}">
    <div class="row" style="justify-content:space-between"><strong>${ROTULO[i.tipo] || i.tipo}${i.prazo ? ' · até ' + dataPT(i.prazo) : ''}</strong>
      <span class="row" style="gap:6px">${i.tipo === 'tarefa' ? `<button class="btn quiet" data-feito="${i.id}" data-v="${i.feito ? 0 : 1}">${i.feito ? 'Reabrir' : 'Feita'}</button>` : ''}<button class="btn quiet" data-apagar-i="${i.id}" aria-label="Apagar registo">Apagar</button></span></div>
    <span style="white-space:pre-wrap">${esc(i.texto)}</span>
    <span class="meta">${esc(i.autor)} · ${horaPT(i.criado_em)}</span></div>`).join('') : '<p class="small">Ainda sem histórico.</p>';
}
function faseAtiva() { const ok = $('fConsent').value === 'sim'; $('fFase').disabled = !ok; if (!ok) $('fFase').value = ''; }
$('fConsent').addEventListener('change', faseAtiva);
$('voltar').addEventListener('click', () => { atual = null; mostrar('contactos'); carregarLista(); });
$('fTipos').addEventListener('click', e => { const b = e.target.closest('[data-t]'); if (b) b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') !== 'true'); });
$('guardar').addEventListener('click', async () => {
  if (!semSaude($('fNotas').value)) return;
  const corpo = { nome: $('fNome').value, email: $('fEmail').value, telefone: $('fTel').value, notas: $('fNotas').value,
    tipos: [...$('fTipos').querySelectorAll('[aria-pressed=true]')].map(b => b.dataset.t),
    estado_lead: $('fLead').value, interesse: $('fInteresse').value, canal: $('fCanal').value, cidade: $('fCidade').value,
    consent_fase: $('fConsent').value, fase: $('fFase').value };
  if (EU.responsavel) corpo.nao_contactar = $('fNaoContactar').checked;
  if ($('fMk').value !== 'pendente') corpo.marketing = $('fMk').value;
  try { await api('contactos/' + atual.id, { method: 'PATCH', body: corpo }); $('fMsg').textContent = 'Guardado.'; $('fNomeT').textContent = corpo.nome; }
  catch (e) { $('fMsg').textContent = e.message; }
});
$('iTipo').addEventListener('change', () => { $('iPrazo').hidden = $('iTipo').value !== 'tarefa'; });
$('iJuntar').addEventListener('click', async () => {
  const txt = $('iTexto').value.trim();
  if (!txt) { $('iMsg').textContent = 'Escreve alguma coisa.'; return; }
  if (!semSaude(txt)) return;
  try {
    await api(`contactos/${atual.id}/interacoes`, { method: 'POST', body: { tipo: $('iTipo').value, texto: txt, prazo: $('iTipo').value === 'tarefa' ? $('iPrazo').value : null } });
    $('iTexto').value = ''; $('iPrazo').value = '';
    atual = await api('contactos/' + atual.id); desenharInteracoes(); $('iMsg').textContent = 'Juntado.';
  } catch (e) { $('iMsg').textContent = e.message; }
});
$('fInt').addEventListener('click', async e => {
  const f = e.target.closest('[data-feito]'), a = e.target.closest('[data-apagar-i]');
  try {
    if (f) await api(`contactos/${atual.id}/interacoes/${f.dataset.feito}`, { method: 'PATCH', body: { feito: f.dataset.v === '1' } });
    else if (a) { if (!confirm('Apagar este registo?')) return; await api(`contactos/${atual.id}/interacoes/${a.dataset.apagarI}`, { method: 'DELETE' }); }
    else return;
    atual = await api('contactos/' + atual.id); desenharInteracoes();
  } catch (err) { $('iMsg').textContent = err.message; }
});
$('exportar').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(atual, null, 2)], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `dados-${(atual.nome || 'contacto').replace(/\W+/g, '-').toLowerCase()}.json`; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
});
$('apagar').addEventListener('click', async () => {
  if (!confirm(`Apagar ${atual.nome || 'este contacto'} e todo o histórico? Não dá para desfazer.`)) return;
  try {
    const r = await api('contactos/' + atual.id, { method: 'DELETE' });
    alert(r.shopify ? 'Apagado do CRM e não volta a ser importado. Falta apagar também na Shopify (Clientes → a cliente → Apagar).' : 'Apagado.');
    atual = null; mostrar('contactos'); carregarLista();
  } catch (e) { $('rMsg').textContent = e.message; }
});

/* ---------- novo contacto ---------- */
$('novo').addEventListener('click', async () => {
  const nome = prompt('Nome do novo contacto');
  if (!nome || !nome.trim()) return;
  try { const r = await api('contactos', { method: 'POST', body: { nome } }); abrir(r.id); }
  catch (e) { aviso(e.message); }
});

/* ---------- oportunidades ---------- */
let oAtual = null;
const FECHADAS = ['Ganha', 'Perdida'];
async function carregarOportunidades() {
  const p = new URLSearchParams({ fase: $('oFase').value, responsavel: $('oResp').value });
  let l; try { l = await api('oportunidades?' + p); } catch (e) { aviso(e.message); return; }
  const abertas = l.filter(o => !FECHADAS.includes(o.fase)), hoje = new Date().toISOString().slice(0, 10);
  $('oStats').innerHTML = [[abertas.length, 'em aberto (nesta lista)'], [euros(abertas.reduce((a, o) => a + (o.valor || 0), 0)), 'valor em aberto'], [l.filter(o => o.fase === 'Ganha').length, 'ganhas']]
    .map(([n, t]) => `<div class="stat"><b style="font-size:1.6rem">${n}</b><span>${t}</span></div>`).join('');
  $('oLista').innerHTML = l.length ? l.map(o => `<button class="case" data-o="${o.id}" style="text-align:left;cursor:pointer;font:inherit;border-left-color:${o.fase === 'Ganha' ? 'var(--ok)' : o.fase === 'Perdida' ? 'var(--line)' : o.data_proxima && o.data_proxima < hoje ? 'var(--risk)' : 'var(--warn)'}">
    <strong>${esc(o.entidade)}</strong>
    <span class="meta">${esc([o.tipo, o.produto, o.valor != null ? euros(o.valor) : ''].filter(Boolean).join(' · '))}</span>
    <span><span class="pill">${esc(o.fase)}</span>${o.responsavel ? ` <span class="pill ex">${esc(o.responsavel)}</span>` : ''}</span>
    ${o.proxima_acao ? `<span class="meta">${esc(o.proxima_acao)}${o.data_proxima ? ' · até ' + dataPT(o.data_proxima) : ''}</span>` : ''}
  </button>`).join('') : '<p class="small">Nenhuma oportunidade com estes filtros.</p>';
  carregarResponsaveis();
}
['oFase', 'oResp'].forEach(id => $(id).addEventListener('change', carregarOportunidades));
$('oLista').addEventListener('click', async e => { const b = e.target.closest('[data-o]'); if (!b) return;
  const l = await api('oportunidades?fase='); editarOportunidade(l.find(o => o.id === b.dataset.o)); });
$('oNova').addEventListener('click', () => editarOportunidade(null));
function editarOportunidade(o) {
  oAtual = o;
  document.querySelectorAll('[data-panel]').forEach(p => p.hidden = true); $('oEditor').hidden = false; window.scrollTo({ top: 0 });
  $('oTitulo').textContent = o ? o.entidade : 'Nova oportunidade';
  $('oEntidade').value = o?.entidade || ''; $('oTipo').value = o?.tipo || ''; $('oProduto').value = o?.produto || ''; $('oCodigo').value = o?.codigo || '';
  $('oValor').value = o?.valor ?? ''; $('oFaseE').value = o?.fase || 'Por contactar'; $('oAcao').value = o?.proxima_acao || ''; $('oData').value = o?.data_proxima || '';
  $('oRespE').value = o?.responsavel || ''; $('oNotas').value = o?.notas || ''; $('oMsg').textContent = ''; $('oApagar').hidden = !o;
}
$('oVoltar').addEventListener('click', () => mostrar('oportunidades'));
$('oGuardar').addEventListener('click', async () => {
  if (!semSaude($('oNotas').value)) return;
  const corpo = { entidade: $('oEntidade').value, tipo: $('oTipo').value, produto: $('oProduto').value, codigo: $('oCodigo').value, valor: $('oValor').value,
    fase: $('oFaseE').value, proxima_acao: $('oAcao').value, data_proxima: $('oData').value, responsavel: $('oRespE').value, notas: $('oNotas').value };
  try {
    if (oAtual) await api('oportunidades/' + oAtual.id, { method: 'PATCH', body: corpo });
    else oAtual = { id: (await api('oportunidades', { method: 'POST', body: corpo })).id };
    $('oMsg').textContent = 'Guardado.'; $('oTitulo').textContent = corpo.entidade; $('oApagar').hidden = false;
  } catch (e) { $('oMsg').textContent = e.message; }
});
$('oApagar').addEventListener('click', async () => {
  if (!oAtual || !confirm('Apagar esta oportunidade?')) return;
  try { await api('oportunidades/' + oAtual.id, { method: 'DELETE' }); mostrar('oportunidades'); } catch (e) { $('oMsg').textContent = e.message; }
});

/* ---------- tarefas ---------- */
let tAtual = null, tCache = [];
async function carregarResponsaveis(lista) {
  const atuais = lista || (await api('tarefas?estado=Nenhum').catch(() => ({ responsaveis: [] }))).responsaveis;
  const nomes = [...new Set(['Joana', ...atuais])].sort();
  $('listaResp').innerHTML = nomes.map(n => `<option value="${esc(n)}">`).join('');
  for (const id of ['tResp', 'oResp']) { const v = $(id).value; $(id).innerHTML = '<option value="">Todos os responsáveis</option>' + nomes.map(n => `<option>${esc(n)}</option>`).join(''); $(id).value = v; }
}
async function carregarTarefas() {
  const p = new URLSearchParams({ estado: $('tEstado').value, responsavel: $('tResp').value, area: $('tArea').value });
  let r; try { r = await api('tarefas?' + p); } catch (e) { aviso(e.message); return; }
  tCache = r.gerais; carregarResponsaveis(r.responsaveis);
  const hoje = new Date().toISOString().slice(0, 10);
  const atrasadas = r.gerais.filter(t => t.prazo && t.prazo < hoje && !['Feito', 'Em pausa'].includes(t.estado)).length;
  $('tContagem').textContent = `${r.gerais.length} ${r.gerais.length === 1 ? 'tarefa' : 'tarefas'}${atrasadas ? ` · ${atrasadas} em atraso` : ''}`;
  $('tLista').innerHTML = r.gerais.length ? r.gerais.map(t => `<div class="case" style="cursor:default;border-left-color:${t.estado === 'Feito' ? 'var(--ok)' : t.estado === 'Em pausa' ? 'var(--line)' : t.prazo && t.prazo < hoje ? 'var(--risk)' : 'var(--warn)'}">
    <div class="row" style="justify-content:space-between;gap:8px;flex-wrap:nowrap">
      <label style="display:flex;gap:10px;align-items:flex-start;flex:1;min-width:0"><input type="checkbox" data-feito="${t.id}" ${t.estado === 'Feito' ? 'checked' : ''} style="width:auto;margin-top:.3em" aria-label="Feita"> <strong style="${t.estado === 'Feito' ? 'text-decoration:line-through;opacity:.7' : ''}">${esc(t.tarefa)}</strong></label>
      <button class="btn quiet" data-editar="${t.id}">Abrir</button>
    </div>
    ${t.detalhe ? `<span class="meta" style="white-space:pre-wrap">${esc(t.detalhe)}</span>` : ''}
    <span>${t.area ? `<span class="pill">${esc(t.area)}</span> ` : ''}${t.responsavel ? `<span class="pill ex">${esc(t.responsavel)}</span> ` : ''}${t.estado !== 'Por fazer' ? `<span class="pill amarelo">${esc(t.estado)}</span> ` : ''}${t.prazo ? `<span class="meta">até ${dataPT(t.prazo)}</span>` : ''}</span>
  </div>`).join('') : '<p class="small">Não há tarefas com estes filtros.</p>';
  $('tarefas').innerHTML = r.contactos.length ? r.contactos.map(i => `<button class="case" data-id="${i.contacto_id}" style="text-align:left;cursor:pointer;font:inherit;border-left-color:${i.prazo && i.prazo < hoje ? 'var(--risk)' : 'var(--warn)'}">
    <strong>${esc(i.contacto_nome)}${i.prazo ? ' · até ' + dataPT(i.prazo) : ''}</strong><span style="white-space:pre-wrap">${esc(i.texto)}</span><span class="meta">${esc(i.autor)}</span></button>`).join('') : '<p class="small">Nenhuma.</p>';
}
['tEstado', 'tResp', 'tArea'].forEach(id => $(id).addEventListener('change', carregarTarefas));
$('tarefas').addEventListener('click', e => { const b = e.target.closest('[data-id]'); if (b) abrir(b.dataset.id); });
$('tLista').addEventListener('change', async e => { const c = e.target.closest('[data-feito]'); if (!c) return;
  try { await api('tarefas/' + c.dataset.feito, { method: 'PATCH', body: { estado: c.checked ? 'Feito' : 'Por fazer' } }); carregarTarefas(); } catch (err) { aviso(err.message); } });
$('tLista').addEventListener('click', e => { const b = e.target.closest('[data-editar]'); if (b) editarTarefa(tCache.find(t => t.id === b.dataset.editar)); });
$('tNova').addEventListener('click', () => editarTarefa(null));
function editarTarefa(t) {
  tAtual = t;
  document.querySelectorAll('[data-panel]').forEach(p => p.hidden = true); $('tEditor').hidden = false; window.scrollTo({ top: 0 });
  $('tTitulo').textContent = t ? 'Tarefa' : 'Nova tarefa';
  $('tTarefa').value = t?.tarefa || ''; $('tDetalhe').value = t?.detalhe || ''; $('tAreaE').value = t?.area || ''; $('tRespE').value = t?.responsavel || '';
  $('tPrazo').value = t?.prazo || ''; $('tEstadoE').value = t?.estado || 'Por fazer'; $('tMsg').textContent = ''; $('tApagar').hidden = !t;
}
$('tVoltar').addEventListener('click', () => mostrar('tarefas'));
$('tGuardar').addEventListener('click', async () => {
  if (!semSaude($('tTarefa').value + ' ' + $('tDetalhe').value)) return;
  const corpo = { tarefa: $('tTarefa').value, detalhe: $('tDetalhe').value, area: $('tAreaE').value, responsavel: $('tRespE').value, prazo: $('tPrazo').value, estado: $('tEstadoE').value };
  try {
    if (tAtual) await api('tarefas/' + tAtual.id, { method: 'PATCH', body: corpo });
    else tAtual = { id: (await api('tarefas', { method: 'POST', body: corpo })).id };
    $('tMsg').textContent = 'Guardado.'; $('tApagar').hidden = false;
  } catch (e) { $('tMsg').textContent = e.message; }
});
$('tApagar').addEventListener('click', async () => {
  if (!tAtual || !confirm('Apagar esta tarefa?')) return;
  try { await api('tarefas/' + tAtual.id, { method: 'DELETE' }); mostrar('tarefas'); } catch (e) { $('tMsg').textContent = e.message; }
});

/* ---------- importar ---------- */
/* Lê o que vem do Google Sheets (separado por tabulações) ou um CSV (vírgulas ou ponto e vírgula), com aspas e quebras de linha. */
function lerTabela(txt) {
  txt = txt.replace(/\r\n?/g, '\n').replace(/\n+$/, '');
  const primeira = txt.split('\n')[0];
  const sep = primeira.includes('\t') ? '\t' : (primeira.split(';').length > primeira.split(',').length ? ';' : ',');
  const linhas = []; let campo = '', linha = [], aspas = false;
  for (let i = 0; i < txt.length; i++) {
    const ch = txt[i];
    if (aspas) { if (ch === '"' && txt[i + 1] === '"') { campo += '"'; i++; } else if (ch === '"') aspas = false; else campo += ch; }
    else if (ch === '"' && campo === '') aspas = true;
    else if (ch === sep) { linha.push(campo); campo = ''; }
    else if (ch === '\n') { linha.push(campo); linhas.push(linha); linha = []; campo = ''; }
    else campo += ch;
  }
  linha.push(campo); linhas.push(linha);
  const [cab, ...resto] = linhas;
  return resto.filter(l => l.some(c => c.trim())).map(l => Object.fromEntries(cab.map((k, i) => [k.trim(), (l[i] || '').trim()]).filter(([k]) => k)));
}
let impLinhas = [];
function previa() {
  const t = $('impTexto').value.trim();
  impLinhas = t ? lerTabela(t) : [];
  const cols = impLinhas.length ? Object.keys(impLinhas[0]) : [];
  $('impPrevia').textContent = impLinhas.length ? `${impLinhas.length} ${impLinhas.length === 1 ? 'linha' : 'linhas'} · colunas: ${cols.join(', ')}` : '';
  $('impBtn').disabled = !impLinhas.length;
}
['impTexto', 'impTipo'].forEach(id => $(id).addEventListener('input', previa));
$('impBtn').addEventListener('click', async () => {
  const tudo = impLinhas.map(l => Object.entries(l).filter(([k]) => !/^(em_consulta|chave|email|nome|telefone)$/i.test(k)).map(([, v]) => v).join(' ')).join('\n');
  if (!semSaude(tudo)) return;
  const b = $('impBtn'); b.disabled = true; $('impMsg').textContent = 'A importar…';
  try {
    const r = await api('importar', { method: 'POST', body: { tipo: $('impTipo').value, linhas: impLinhas } });
    $('impMsg').textContent = `Feito: ${r.criados} novos, ${r.atualizados} atualizados${r.ignorados ? `, ${r.ignorados} ignorados (vazios ou de exemplo)` : ''}.${r.avisos.length ? ' ' + r.avisos.join(' ') : ''}`;
    $('impTexto').value = ''; previa();
  } catch (e) { $('impMsg').textContent = e.message; }
  b.disabled = !impLinhas.length;
});

/* ---------- registo ---------- */
const ACAO = { 'sincronizar-shopify': 'Importou da Shopify', 'criar-contacto': 'Criou um contacto', 'editar-contacto': 'Editou um contacto', 'apagar-contacto': 'Apagou um contacto', 'nova-interacao': 'Juntou um registo', 'apagar-interacao': 'Apagou um registo', 'concluir-tarefa': 'Mudou uma tarefa', 'criar-tarefa': 'Criou uma tarefa', 'editar-tarefa': 'Editou uma tarefa', 'apagar-tarefa': 'Apagou uma tarefa',
  'criar-oportunidade': 'Criou uma oportunidade', 'editar-oportunidade': 'Editou uma oportunidade', 'apagar-oportunidade': 'Apagou uma oportunidade', 'importar-folha': 'Importou uma folha' };
async function carregarRegisto() {
  let r; try { r = await api('registo'); } catch (e) { aviso(e.message); return; }
  $('registo').innerHTML = r.map(x => `<tr><td>${horaPT(x.quando)}</td><td>${esc(x.quem)}</td><td>${esc(ACAO[x.acao] || x.acao)}${['sincronizar-shopify', 'importar-folha'].includes(x.acao) ? ': ' + esc(x.alvo) : ''}</td></tr>`).join('');
}

iniciar();
