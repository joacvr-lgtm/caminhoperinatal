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
  $('ficha').hidden = true;
  if (id === 'tarefas') carregarTarefas();
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
    <span>${c.tipos.map(t => `<span class="pill">${esc(t)}</span>`).join(' ')} ${c.marcas.map(m => `<span class="pill ex">${esc(m)}</span>`).join(' ')}</span>
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
$('voltar').addEventListener('click', () => { atual = null; mostrar('contactos'); carregarLista(); });
$('fTipos').addEventListener('click', e => { const b = e.target.closest('[data-t]'); if (b) b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') !== 'true'); });
$('guardar').addEventListener('click', async () => {
  if (!semSaude($('fNotas').value)) return;
  const corpo = { nome: $('fNome').value, email: $('fEmail').value, telefone: $('fTel').value, notas: $('fNotas').value,
    tipos: [...$('fTipos').querySelectorAll('[aria-pressed=true]')].map(b => b.dataset.t) };
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

/* ---------- tarefas e registo ---------- */
async function carregarTarefas() {
  let t; try { t = await api('tarefas'); } catch (e) { aviso(e.message); return; }
  const hoje = new Date().toISOString().slice(0, 10);
  $('tarefas').innerHTML = t.length ? t.map(i => `<button class="case" data-id="${i.contacto_id}" style="text-align:left;cursor:pointer;font:inherit;border-left-color:${i.prazo && i.prazo < hoje ? 'var(--risk)' : 'var(--warn)'}">
    <strong>${esc(i.contacto_nome)}${i.prazo ? ' · até ' + dataPT(i.prazo) : ''}</strong><span style="white-space:pre-wrap">${esc(i.texto)}</span><span class="meta">${esc(i.autor)}</span></button>`).join('') : '<p class="small">Não há tarefas por fazer.</p>';
}
$('tarefas').addEventListener('click', e => { const b = e.target.closest('[data-id]'); if (b) abrir(b.dataset.id); });
const ACAO = { 'sincronizar-shopify': 'Importou da Shopify', 'criar-contacto': 'Criou um contacto', 'editar-contacto': 'Editou um contacto', 'apagar-contacto': 'Apagou um contacto', 'nova-interacao': 'Juntou um registo', 'apagar-interacao': 'Apagou um registo', 'concluir-tarefa': 'Mudou uma tarefa' };
async function carregarRegisto() {
  let r; try { r = await api('registo'); } catch (e) { aviso(e.message); return; }
  $('registo').innerHTML = r.map(x => `<tr><td>${horaPT(x.quando)}</td><td>${esc(x.quem)}</td><td>${esc(ACAO[x.acao] || x.acao)}${x.acao === 'sincronizar-shopify' ? ': ' + esc(x.alvo) : ''}</td></tr>`).join('');
}

iniciar();
