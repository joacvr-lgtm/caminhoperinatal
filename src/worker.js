/* Servidor do Caminho Perinatal: serve as páginas e o CRM da equipa (/api/*).
   Segurança: o Cloudflare Access fica à frente de tudo. Aqui, cada pedido à API volta a ser verificado
   (assinatura do Access, aplicação certa e, se definido, email na lista da equipa). Sem configuração, a API fica fechada.
   Regra do CRM: nunca guarda informação clínica. Isso vive só no Consultório, no aparelho da psicóloga. */

const ESQUEMA = [
  `CREATE TABLE IF NOT EXISTS contactos (
    id TEXT PRIMARY KEY, nome TEXT NOT NULL DEFAULT '', email TEXT, telefone TEXT,
    tipos TEXT NOT NULL DEFAULT '[]', marcas TEXT NOT NULL DEFAULT '[]', origem TEXT NOT NULL DEFAULT 'manual',
    shopify_id TEXT UNIQUE, marketing TEXT NOT NULL DEFAULT 'desconhecido', notas TEXT NOT NULL DEFAULT '',
    n_encomendas INTEGER NOT NULL DEFAULT 0, total_gasto REAL NOT NULL DEFAULT 0,
    criado_em TEXT NOT NULL, atualizado_em TEXT NOT NULL, atualizado_por TEXT NOT NULL DEFAULT '')`,
  `CREATE INDEX IF NOT EXISTS contactos_email ON contactos(email)`,
  `CREATE TABLE IF NOT EXISTS encomendas (
    id TEXT PRIMARY KEY, contacto_id TEXT, numero TEXT, data TEXT, total REAL, moeda TEXT,
    estado TEXT, itens TEXT NOT NULL DEFAULT '[]')`,
  `CREATE INDEX IF NOT EXISTS encomendas_contacto ON encomendas(contacto_id)`,
  `CREATE TABLE IF NOT EXISTS interacoes (
    id TEXT PRIMARY KEY, contacto_id TEXT NOT NULL, tipo TEXT NOT NULL, texto TEXT NOT NULL DEFAULT '',
    prazo TEXT, feito INTEGER NOT NULL DEFAULT 0, autor TEXT NOT NULL, criado_em TEXT NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS interacoes_contacto ON interacoes(contacto_id)`,
  `CREATE TABLE IF NOT EXISTS registo (
    id INTEGER PRIMARY KEY AUTOINCREMENT, quando TEXT NOT NULL, quem TEXT NOT NULL, acao TEXT NOT NULL, alvo TEXT)`,
  `CREATE TABLE IF NOT EXISTS config (chave TEXT PRIMARY KEY, valor TEXT)`,
  /* Clientes da Shopify apagadas aqui: não voltam a ser importadas. */
  `CREATE TABLE IF NOT EXISTS apagados (shopify_id TEXT PRIMARY KEY, quando TEXT NOT NULL)`,
  /* Empresas, autarquias, IPSS, marcas e formação: uma linha por entidade, com a fase e a próxima ação. */
  `CREATE TABLE IF NOT EXISTS oportunidades (
    id TEXT PRIMARY KEY, entidade TEXT NOT NULL, tipo TEXT NOT NULL DEFAULT '', produto TEXT NOT NULL DEFAULT '', codigo TEXT NOT NULL DEFAULT '',
    valor REAL, fase TEXT NOT NULL DEFAULT 'Por contactar', proxima_acao TEXT NOT NULL DEFAULT '', data_proxima TEXT,
    responsavel TEXT NOT NULL DEFAULT '', notas TEXT NOT NULL DEFAULT '', criado_em TEXT NOT NULL, atualizado_em TEXT NOT NULL, atualizado_por TEXT NOT NULL DEFAULT '')`,
  /* Tarefas da equipa (as de um contacto continuam no histórico desse contacto). ref é o id da folha antiga. */
  `CREATE TABLE IF NOT EXISTS tarefas (
    id TEXT PRIMARY KEY, ref TEXT UNIQUE, tarefa TEXT NOT NULL, detalhe TEXT NOT NULL DEFAULT '', area TEXT NOT NULL DEFAULT '',
    responsavel TEXT NOT NULL DEFAULT '', prazo TEXT, estado TEXT NOT NULL DEFAULT 'Por fazer', origem TEXT NOT NULL DEFAULT '',
    criado_em TEXT NOT NULL, atualizado_em TEXT NOT NULL, atualizado_por TEXT NOT NULL DEFAULT '')`
];
/* Colunas acrescentadas depois da primeira versão: entram sozinhas nas bases que já existem. */
const COLUNAS_NOVAS = [
  ['contactos', 'canal', "TEXT NOT NULL DEFAULT ''"], ['contactos', 'cidade', "TEXT NOT NULL DEFAULT ''"],
  ['contactos', 'estado_lead', "TEXT NOT NULL DEFAULT ''"], ['contactos', 'interesse', "TEXT NOT NULL DEFAULT ''"],
  /* A fase da vida (gravidez, pós-parto...) é informação de saúde: só se guarda com consentimento explícito. */
  ['contactos', 'consent_fase', "TEXT NOT NULL DEFAULT 'desconhecido'"], ['contactos', 'fase', "TEXT NOT NULL DEFAULT ''"],
  /* Sem motivo à vista: só a responsável marca, e a equipa só sabe que não deve enviar ações comerciais. */
  ['contactos', 'nao_contactar', 'INTEGER NOT NULL DEFAULT 0']
];
const TIPOS = ['Cliente', 'Subscritora', 'Aldeia', 'Grupo', 'Parceira', 'Convidada', 'Empresa', 'Autarquia ou IPSS', 'Imprensa', 'Fornecedor', 'Outro'];
const TIPOS_INTERACAO = ['nota', 'email', 'chamada', 'reuniao', 'tarefa'];
const LISTAS = {
  fases_oportunidade: ['Por contactar', 'Contactado', 'Reunião marcada', 'Proposta enviada', 'Ganha', 'Perdida', 'Em pausa'],
  tipos_oportunidade: ['Empresa', 'Autarquia ou IPSS', 'Marca', 'Formação', 'Media', 'Outro'],
  estados_tarefa: ['Por fazer', 'Em curso', 'Feito', 'Em pausa'],
  areas: ['Negócio', 'Loja e produtos', 'Conteúdo', 'Consultório', 'Fiscal e legal', 'Aldeia', 'Grupos', 'Outro'],
  estados_lead: ['Novo', 'Contactado', 'Interessado', 'Cliente', 'Sem interesse'],
  fases_vida: ['A pensar ter filhos', 'Gravidez', 'Pós-parto', 'Até aos 2 anos', 'Outra']
};
const agora = () => new Date().toISOString();
const uid = () => crypto.randomUUID();

const json = (dados, estado = 200) => new Response(JSON.stringify(dados), {
  status: estado,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex' }
});
const erro = (msg, estado) => json({ erro: msg }, estado);

/* ---------- Verificação do Cloudflare Access ---------- */
const b64url = s => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)), c => c.charCodeAt(0));
let certsCache = { ate: 0, keys: null };
async function chavesAccess(env) {
  if (env.ACCESS_JWKS) return JSON.parse(env.ACCESS_JWKS).keys; // só para testes locais
  if (certsCache.keys && certsCache.ate > Date.now()) return certsCache.keys;
  const r = await fetch(`https://${env.ACCESS_TEAM_DOMAIN}/cdn-cgi/access/certs`);
  if (!r.ok) throw new Error('certs');
  certsCache = { ate: Date.now() + 3600e3, keys: (await r.json()).keys };
  return certsCache.keys;
}
async function quemE(request, env) {
  if (!env.ACCESS_TEAM_DOMAIN) return { falha: 'O acesso ainda não está configurado (ACCESS_TEAM_DOMAIN).' };
  const token = request.headers.get('cf-access-jwt-assertion');
  if (!token) return { falha: 'Sem sessão do Cloudflare Access.' };
  const [h, p, s] = token.split('.');
  if (!h || !p || !s) return { falha: 'Sessão inválida.' };
  try {
    const cab = JSON.parse(new TextDecoder().decode(b64url(h)));
    const dados = JSON.parse(new TextDecoder().decode(b64url(p)));
    if (cab.alg !== 'RS256') return { falha: 'Sessão inválida.' };
    const jwk = (await chavesAccess(env)).find(k => k.kid === cab.kid);
    if (!jwk) return { falha: 'Sessão inválida.' };
    const chave = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
    const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', chave, b64url(s), new TextEncoder().encode(`${h}.${p}`));
    const aud = Array.isArray(dados.aud) ? dados.aud : [dados.aud];
    if (!ok || dados.iss !== `https://${env.ACCESS_TEAM_DOMAIN}` || dados.exp * 1000 < Date.now()) return { falha: 'Sessão inválida ou expirada.' };
    /* Sem AUD configurado, a API não dá dados: só mostra, a quem já passou pelo Access, o AUD desta aplicação para o copiar. */
    if (!env.ACCESS_AUD) return { falha: `Falta configurar o ACCESS_AUD. O desta aplicação é: ${aud.join(', ')}`, estado: 503 };
    if (!aud.includes(env.ACCESS_AUD)) return { falha: 'Sessão inválida ou expirada.' };
    const email = String(dados.email || '').toLowerCase();
    const equipa = String(env.EQUIPA_EMAILS || '').toLowerCase().split(/[\s,;]+/).filter(Boolean);
    if (!email || (equipa.length && !equipa.includes(email))) return { falha: 'Este email não faz parte da equipa.', estado: 403 };
    return { email };
  } catch (e) {
    return { falha: 'Sessão inválida.' };
  }
}

/* ---------- Base de dados ---------- */
let esquemaPronto = false;
async function prepararBD(env) {
  if (esquemaPronto) return;
  await env.DB.batch(ESQUEMA.map(s => env.DB.prepare(s)));
  const existentes = {};
  for (const [tabela, coluna, tipo] of COLUNAS_NOVAS) {
    existentes[tabela] ??= new Set((await env.DB.prepare(`PRAGMA table_info(${tabela})`).all()).results.map(c => c.name));
    if (!existentes[tabela].has(coluna)) await env.DB.prepare(`ALTER TABLE ${tabela} ADD COLUMN ${coluna} ${tipo}`).run();
  }
  esquemaPronto = true;
}
const registar = (env, quem, acao, alvo = null) =>
  env.DB.prepare('INSERT INTO registo (quando, quem, acao, alvo) VALUES (?, ?, ?, ?)').bind(agora(), quem, acao, alvo).run();
async function lerConfig(env, chave) {
  const r = await env.DB.prepare('SELECT valor FROM config WHERE chave = ?').bind(chave).first();
  return r ? r.valor : null;
}
const gravarConfig = (env, chave, valor) =>
  env.DB.prepare('INSERT INTO config (chave, valor) VALUES (?, ?) ON CONFLICT(chave) DO UPDATE SET valor = excluded.valor').bind(chave, valor).run();

const lista = v => { try { const a = JSON.parse(v || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } };
const contactoPublico = c => ({ ...c, tipos: lista(c.tipos), marcas: lista(c.marcas) });
const texto = (v, max = 4000) => String(v ?? '').slice(0, max).trim();
const dataISO = v => { const d = String(v || '').trim(); if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return null; const t = new Date(d + 'T00:00:00Z'); return !isNaN(t) && t.toISOString().slice(0, 10) === d ? d : null; };
const numero = v => { const n = Number(String(v ?? '').replace(/\s|€/g, '').replace(/\.(?=\d{3}\b)/g, '').replace(',', '.')); return String(v ?? '').trim() === '' || !isFinite(n) ? null : n; };
const daLista = (v, l, padrao = '') => l.find(x => x.toLowerCase() === String(v || '').trim().toLowerCase()) || (String(v || '').trim() ? String(v).trim().slice(0, 60) : padrao);
const eResponsavel = (env, quem) => !!env.RESPONSAVEL_EMAIL && quem === String(env.RESPONSAVEL_EMAIL).toLowerCase();

function camposOportunidade(c) {
  const o = {};
  if ('entidade' in c) o.entidade = texto(c.entidade, 200);
  if ('tipo' in c) o.tipo = daLista(c.tipo, LISTAS.tipos_oportunidade);
  if ('produto' in c) o.produto = texto(c.produto, 200);
  if ('codigo' in c) o.codigo = texto(c.codigo, 40);
  if ('valor' in c) o.valor = numero(c.valor);
  if ('fase' in c) o.fase = daLista(c.fase, LISTAS.fases_oportunidade, 'Por contactar');
  if ('proxima_acao' in c) o.proxima_acao = texto(c.proxima_acao, 500);
  if ('data_proxima' in c) o.data_proxima = dataISO(c.data_proxima);
  if ('responsavel' in c) o.responsavel = texto(c.responsavel, 80);
  if ('notas' in c) o.notas = texto(c.notas);
  return o;
}
function camposTarefa(c) {
  const o = {};
  if ('tarefa' in c) o.tarefa = texto(c.tarefa, 300);
  if ('detalhe' in c) o.detalhe = texto(c.detalhe);
  if ('area' in c) o.area = daLista(c.area, LISTAS.areas);
  if ('responsavel' in c) o.responsavel = texto(c.responsavel, 80);
  if ('prazo' in c) o.prazo = dataISO(c.prazo);
  if ('estado' in c) o.estado = daLista(String(c.estado || '').replace(/^feita$/i, 'Feito'), LISTAS.estados_tarefa, 'Por fazer');
  if ('origem' in c) o.origem = texto(c.origem, 120);
  return o;
}
async function inserir(env, tabela, campos) {
  const k = Object.keys(campos);
  await env.DB.prepare(`INSERT INTO ${tabela} (${k.join(', ')}) VALUES (${k.map(() => '?').join(', ')})`).bind(...k.map(x => campos[x])).run();
}
async function atualizar(env, tabela, id, campos) {
  const k = Object.keys(campos);
  if (!k.length) return;
  await env.DB.prepare(`UPDATE ${tabela} SET ${k.map(x => x + ' = ?').join(', ')} WHERE id = ?`).bind(...k.map(x => campos[x]), id).run();
}

/* ---------- Shopify (só leitura) ---------- */
function lojaShopify(env) {
  const l = String(env.SHOPIFY_LOJA || '');
  return /^https?:\/\//.test(l) ? l.replace(/\/$/, '') : `https://${l}`;
}
async function tokenShopify(env) {
  const guardado = JSON.parse((await lerConfig(env, 'shopify_token')) || 'null');
  if (guardado && guardado.ate > Date.now() + 60e3) return guardado.t;
  const r = await fetch(`${lojaShopify(env)}/admin/oauth/access_token`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ client_id: env.SHOPIFY_CLIENT_ID, client_secret: env.SHOPIFY_CLIENT_SECRET, grant_type: 'client_credentials' })
  });
  if (!r.ok) throw new Error(`A Shopify recusou as credenciais (${r.status}).`);
  const d = await r.json();
  await gravarConfig(env, 'shopify_token', JSON.stringify({ t: d.access_token, ate: Date.now() + (d.expires_in || 86399) * 1000 }));
  return d.access_token;
}
async function gql(env, token, query, variables) {
  const r = await fetch(`${lojaShopify(env)}/admin/api/${env.SHOPIFY_API_VERSAO || '2026-07'}/graphql.json`, {
    method: 'POST', headers: { 'content-type': 'application/json', 'x-shopify-access-token': token },
    body: JSON.stringify({ query, variables })
  });
  if (!r.ok) throw new Error(`Erro da Shopify (${r.status}).`);
  const d = await r.json();
  if (d.errors) throw new Error('Erro da Shopify: ' + (d.errors[0]?.message || 'desconhecido'));
  return d.data;
}
const Q_CLIENTES = `query($after:String,$query:String){customers(first:250,after:$after,query:$query){pageInfo{hasNextPage endCursor}
  nodes{id firstName lastName defaultEmailAddress{emailAddress marketingState} defaultPhoneNumber{phoneNumber} createdAt numberOfOrders amountSpent{amount}}}}`;
const Q_ENCOMENDAS = `query($after:String,$query:String){orders(first:100,after:$after,query:$query,sortKey:CREATED_AT){pageInfo{hasNextPage endCursor}
  nodes{id name createdAt displayFinancialStatus cancelledAt currentTotalPriceSet{shopMoney{amount currencyCode}} customer{id}
  lineItems(first:30){nodes{title quantity originalUnitPriceSet{shopMoney{amount}} product{vendor tags}}}}}}`;
const MARKETING = { SUBSCRIBED: 'sim', UNSUBSCRIBED: 'nao', NOT_SUBSCRIBED: 'nao', PENDING: 'pendente', REDACTED: 'nao', INVALID: 'nao' };
/* Marca de cada produto: os do Caminho têm a etiqueta caminho-perinatal ou o fornecedor Joana Carvalho. */
const marcaDe = p => (p && ((p.tags || []).includes('caminho-perinatal') || p.vendor === 'Joana Carvalho')) ? 'Caminho Perinatal' : 'Palavras e outras coisas';

/* A importação faz uma página de cada vez (250 clientes ou 100 encomendas), para caber no limite de processador
   do plano gratuito do Cloudflare. A primeira traz tudo; as seguintes só o que mudou desde a última. */
const SQL_CLIENTE_LIGAR = `UPDATE contactos SET shopify_id = ?1,
  tipos = CASE WHEN EXISTS (SELECT 1 FROM json_each(tipos) WHERE value = ?2) THEN tipos ELSE json_insert(tipos, '$[#]', ?2) END
  WHERE shopify_id IS NULL AND email = ?3 AND ?3 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM contactos WHERE shopify_id = ?1)`;
const SQL_CLIENTE = `INSERT INTO contactos (id, nome, email, telefone, tipos, origem, shopify_id, marketing, n_encomendas, total_gasto, criado_em, atualizado_em, atualizado_por)
  SELECT ?1, ?2, ?3, ?4, json_array(?5), 'shopify', ?6, ?7, ?8, ?9, ?10, ?11, 'shopify'
  WHERE NOT EXISTS (SELECT 1 FROM apagados WHERE shopify_id = ?6)
  ON CONFLICT(shopify_id) DO UPDATE SET
    nome = CASE WHEN excluded.nome <> '' THEN excluded.nome ELSE contactos.nome END,
    email = COALESCE(excluded.email, contactos.email), telefone = COALESCE(excluded.telefone, contactos.telefone),
    marketing = excluded.marketing, n_encomendas = excluded.n_encomendas, total_gasto = excluded.total_gasto, atualizado_em = excluded.atualizado_em,
    tipos = CASE WHEN excluded.n_encomendas > 0 AND NOT EXISTS (SELECT 1 FROM json_each(contactos.tipos) WHERE value = 'Cliente')
      THEN json_insert((SELECT json_group_array(value) FROM json_each(contactos.tipos) WHERE value <> 'Subscritora'), '$[#]', 'Cliente')
      ELSE contactos.tipos END`;
const SQL_ENCOMENDA = `INSERT INTO encomendas (id, contacto_id, numero, data, total, moeda, estado, itens)
  VALUES (?1, (SELECT id FROM contactos WHERE shopify_id = ?2), ?3, ?4, ?5, ?6, ?7, ?8)
  ON CONFLICT(id) DO UPDATE SET contacto_id = excluded.contacto_id, total = excluded.total, estado = excluded.estado, itens = excluded.itens`;
/* Marcas de cada contacto, tiradas das encomendas não canceladas. */
const SQL_MARCAS = `UPDATE contactos SET marcas = COALESCE((SELECT json_group_array(DISTINCT json_extract(j.value, '$.marca'))
  FROM encomendas e, json_each(e.itens) j WHERE e.contacto_id = contactos.id AND e.estado <> 'CANCELADA'), '[]')
  WHERE id IN (SELECT DISTINCT contacto_id FROM encomendas WHERE contacto_id IS NOT NULL)`;

async function passoSincronizacao(env, quem, passo) {
  if (!env.SHOPIFY_LOJA || !env.SHOPIFY_CLIENT_ID || !env.SHOPIFY_CLIENT_SECRET) throw new Error('A ligação à Shopify ainda não está configurada.');
  if (!passo || !passo.fase) {
    const ultima = JSON.parse((await lerConfig(env, 'ultima_sincronizacao')) || 'null');
    /* Um dia de margem, para não perder nada que mude durante uma importação. */
    const desde = ultima ? new Date(new Date(ultima.quando).getTime() - 864e5).toISOString().slice(0, 19) + 'Z' : null;
    passo = { fase: 'clientes', after: null, desde, inicio: agora(), clientes: 0, encomendas: 0 };
  }
  const token = await tokenShopify(env), t = agora();
  const filtro = passo.desde ? `updated_at:>='${passo.desde}'` : null;
  if (passo.fase === 'clientes') {
    const d = (await gql(env, token, Q_CLIENTES, { after: passo.after, query: filtro })).customers;
    const ops = [];
    for (const c of d.nodes) {
      const nome = [c.firstName, c.lastName].filter(Boolean).join(' ');
      const email = c.defaultEmailAddress?.emailAddress?.toLowerCase() || null;
      const n = Number(c.numberOfOrders) || 0, tipoBase = n > 0 ? 'Cliente' : 'Subscritora';
      ops.push(env.DB.prepare(SQL_CLIENTE_LIGAR).bind(c.id, tipoBase, email));
      ops.push(env.DB.prepare(SQL_CLIENTE).bind(uid(), nome, email, c.defaultPhoneNumber?.phoneNumber || null, tipoBase, c.id,
        MARKETING[c.defaultEmailAddress?.marketingState] || 'desconhecido', n, Number(c.amountSpent?.amount) || 0, c.createdAt || t, t));
    }
    if (ops.length) await env.DB.batch(ops);
    passo.clientes += d.nodes.length;
    passo = d.pageInfo.hasNextPage ? { ...passo, after: d.pageInfo.endCursor } : { ...passo, fase: 'encomendas', after: null };
    return { feito: false, passo };
  }
  const d = (await gql(env, token, Q_ENCOMENDAS, { after: passo.after, query: filtro })).orders;
  const ops = d.nodes.map(o => env.DB.prepare(SQL_ENCOMENDA).bind(o.id, o.customer?.id || null, o.name, o.createdAt,
    Number(o.currentTotalPriceSet?.shopMoney?.amount) || 0, o.currentTotalPriceSet?.shopMoney?.currencyCode || 'EUR',
    o.cancelledAt ? 'CANCELADA' : o.displayFinancialStatus,
    JSON.stringify(o.lineItems.nodes.map(i => ({ titulo: i.title, qtd: i.quantity, preco: Number(i.originalUnitPriceSet?.shopMoney?.amount) || 0, marca: marcaDe(i.product) })))));
  ops.push(env.DB.prepare(SQL_MARCAS));
  await env.DB.batch(ops);
  passo.encomendas += d.nodes.length;
  if (d.pageInfo.hasNextPage) return { feito: false, passo: { ...passo, after: d.pageInfo.endCursor } };
  const resumo = { quando: passo.inicio, clientes: passo.clientes, encomendas: passo.encomendas, por: quem, completa: !passo.desde };
  await gravarConfig(env, 'ultima_sincronizacao', JSON.stringify(resumo));
  await registar(env, quem, 'sincronizar-shopify', `${passo.clientes} clientes, ${passo.encomendas} encomendas${passo.desde ? ' alterados' : ''}`);
  return { feito: true, resumo };
}

/* ---------- Importação de uma folha (colada do Google Sheets ou de um CSV) ---------- */
const chaveLinha = o => Object.fromEntries(Object.entries(o || {}).map(([k, v]) => [String(k).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '_'), String(v ?? '').trim()]));
const sim = v => /^(s|sim|yes|y|x|1|true|verdadeiro)$/i.test(String(v || '').trim());
async function importar(env, quem, tipo, linhasCruas) {
  const linhas = linhasCruas.map(chaveLinha), t = agora();
  const r = { criados: 0, atualizados: 0, ignorados: 0, avisos: [] };
  const ops = [];
  if (tipo === 'contactos') {
    const todos = (await env.DB.prepare('SELECT id, nome, email, notas, consent_fase FROM contactos').all()).results;
    const porEmail = new Map(todos.filter(c => c.email).map(c => [c.email, c]));
    const porNome = new Map(todos.filter(c => !c.email).map(c => [c.nome.toLowerCase(), c]));
    let fasesSemConsentimento = 0, marcasConsulta = 0, consultaIgnorada = 0;
    for (const l of linhas) {
      const chave = l.email || l.chave || '';
      const email = chave.includes('@') ? chave.toLowerCase() : null;
      const nome = texto(l.nome || (!email ? chave : ''), 200);
      if ((!nome && !email) || /\(exemplo/i.test(nome)) { r.ignorados++; continue; }
      const consent = sim(l.consentimento_fase || l.consent_fase) ? 'sim' : null;
      if (l.fase && !consent) fasesSemConsentimento++;
      const nc = sim(l.em_consulta) || sim(l.nao_contactar);
      if (nc && !eResponsavel(env, quem)) consultaIgnorada++;
      const campos = {};
      for (const k of ['canal', 'cidade', 'interesse']) if (l[k]) campos[k] = texto(l[k], 120);
      if (l.estado_lead) campos.estado_lead = daLista(l.estado_lead, LISTAS.estados_lead);
      if (l.telefone) campos.telefone = texto(l.telefone, 40);
      if (consent) { campos.consent_fase = 'sim'; if (l.fase) campos.fase = daLista(l.fase, LISTAS.fases_vida); }
      if (nc && eResponsavel(env, quem)) { campos.nao_contactar = 1; marcasConsulta++; }
      const existente = (email && porEmail.get(email)) || (!email && porNome.get(nome.toLowerCase()));
      if (existente) {
        if (l.notas && !(existente.notas || '').includes(l.notas)) campos.notas = [existente.notas, texto(l.notas)].filter(Boolean).join('\n');
        if (nome && !existente.nome) campos.nome = nome;
        const k = Object.keys(campos);
        if (k.length) ops.push(env.DB.prepare(`UPDATE contactos SET ${k.map(x => x + ' = ?').join(', ')}, atualizado_em = ?, atualizado_por = ? WHERE id = ?`).bind(...k.map(x => campos[x]), t, quem, existente.id));
        r.atualizados++;
      } else {
        const novo = { id: uid(), nome: nome || email, email, tipos: '[]', origem: 'folha', notas: texto(l.notas), criado_em: t, atualizado_em: t, atualizado_por: quem, ...campos };
        const k = Object.keys(novo);
        ops.push(env.DB.prepare(`INSERT INTO contactos (${k.join(', ')}) VALUES (${k.map(() => '?').join(', ')})`).bind(...k.map(x => novo[x])));
        if (email) porEmail.set(email, novo); else porNome.set(novo.nome.toLowerCase(), novo);
        r.criados++;
      }
    }
    if (fasesSemConsentimento) r.avisos.push(`${fasesSemConsentimento} ${fasesSemConsentimento === 1 ? 'fase não foi importada' : 'fases não foram importadas'}: a fase da vida é informação de saúde e só entra com uma coluna «consentimento_fase» a dizer Sim.`);
    if (marcasConsulta) r.avisos.push(`${marcasConsulta} ${marcasConsulta === 1 ? 'pessoa ficou' : 'pessoas ficaram'} com «Não enviar ações comerciais». O motivo não foi guardado.`);
    if (consultaIgnorada) r.avisos.push(`${consultaIgnorada} ${consultaIgnorada === 1 ? 'marca' : 'marcas'} de «em consulta» não ${consultaIgnorada === 1 ? 'foi importada' : 'foram importadas'}: só a responsável pode fazer esta importação.`);
  } else if (tipo === 'oportunidades') {
    const todas = (await env.DB.prepare('SELECT id, entidade, produto FROM oportunidades').all()).results;
    const chave = (e, p) => `${String(e).toLowerCase()}|${String(p || '').toLowerCase()}`;
    const mapa = new Map(todas.map(o => [chave(o.entidade, o.produto), o.id]));
    for (const l of linhas) {
      const c = camposOportunidade(l);
      if (!c.entidade) { r.ignorados++; continue; }
      const id = mapa.get(chave(c.entidade, c.produto));
      if (id) {
        const k = Object.keys(c);
        ops.push(env.DB.prepare(`UPDATE oportunidades SET ${k.map(x => x + ' = ?').join(', ')}, atualizado_em = ?, atualizado_por = ? WHERE id = ?`).bind(...k.map(x => c[x]), t, quem, id));
        r.atualizados++;
      } else {
        const novo = { id: uid(), fase: 'Por contactar', ...c, criado_em: t, atualizado_em: t, atualizado_por: quem };
        const k = Object.keys(novo);
        ops.push(env.DB.prepare(`INSERT INTO oportunidades (${k.join(', ')}) VALUES (${k.map(() => '?').join(', ')})`).bind(...k.map(x => novo[x])));
        mapa.set(chave(c.entidade, c.produto), novo.id);
        r.criados++;
      }
    }
  } else if (tipo === 'tarefas') {
    const refs = new Map((await env.DB.prepare('SELECT id, ref FROM tarefas WHERE ref IS NOT NULL').all()).results.map(x => [x.ref, x.id]));
    for (const l of linhas) {
      const c = camposTarefa(l), ref = texto(l.id || l.ref, 40) || null;
      if (!c.tarefa) { r.ignorados++; continue; }
      const id = ref && refs.get(ref);
      if (id) {
        const k = Object.keys(c);
        ops.push(env.DB.prepare(`UPDATE tarefas SET ${k.map(x => x + ' = ?').join(', ')}, atualizado_em = ?, atualizado_por = ? WHERE id = ?`).bind(...k.map(x => c[x]), t, quem, id));
        r.atualizados++;
      } else {
        const novo = { id: uid(), ref, estado: 'Por fazer', ...c, criado_em: t, atualizado_em: t, atualizado_por: quem };
        const k = Object.keys(novo);
        ops.push(env.DB.prepare(`INSERT INTO tarefas (${k.join(', ')}) VALUES (${k.map(() => '?').join(', ')})`).bind(...k.map(x => novo[x])));
        if (ref) refs.set(ref, novo.id);
        r.criados++;
      }
    }
  } else return { erro: 'Tipo de importação desconhecido.' };
  for (let i = 0; i < ops.length; i += 100) await env.DB.batch(ops.slice(i, i + 100));
  return r;
}

/* ---------- API ---------- */
async function api(request, env, url) {
  const id = await quemE(request, env);
  if (id.falha) return erro(id.falha, id.estado || 401);
  if (!env.DB) return erro('A base de dados ainda não está ligada (DB).', 503);
  /* Escritas só com o cabeçalho próprio da aplicação: um site de fora não o consegue enviar sem autorização. */
  if (request.method !== 'GET' && request.headers.get('x-caminho') !== '1') return erro('Pedido recusado.', 403);
  await prepararBD(env);
  const quem = id.email, partes = url.pathname.split('/').filter(Boolean).slice(1), m = request.method;
  const corpo = m === 'GET' || m === 'DELETE' ? {} : await request.json().catch(() => ({}));

  if (partes[0] === 'eu' && m === 'GET') {
    return json({ email: quem, responsavel: eResponsavel(env, quem), tipos: TIPOS, tipos_interacao: TIPOS_INTERACAO, listas: LISTAS, sincronizacao: JSON.parse((await lerConfig(env, 'ultima_sincronizacao')) || 'null'), shopify: !!(env.SHOPIFY_LOJA && env.SHOPIFY_CLIENT_ID && env.SHOPIFY_CLIENT_SECRET) });
  }
  if (partes[0] === 'sincronizar' && m === 'POST') {
    try { return json(await passoSincronizacao(env, quem, corpo.passo)); } catch (e) { return erro(e.message, 502); }
  }
  if (partes[0] === 'tarefas') {
    const tid = partes[1];
    if (!tid && m === 'GET') {
      const estado = url.searchParams.get('estado') || 'abertas', resp = texto(url.searchParams.get('responsavel'), 80), area = texto(url.searchParams.get('area'), 60);
      const where = [], args = [];
      if (estado === 'abertas') where.push("estado IN ('Por fazer', 'Em curso')");
      else if (estado !== 'todas') { where.push('estado = ?'); args.push(estado); }
      if (resp) { where.push('responsavel = ?'); args.push(resp); }
      if (area) { where.push('area = ?'); args.push(area); }
      const gerais = await env.DB.prepare(`SELECT * FROM tarefas ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY COALESCE(prazo, '9999'), criado_em LIMIT 500`).bind(...args).all();
      const contactos = await env.DB.prepare(`SELECT i.*, c.nome AS contacto_nome FROM interacoes i JOIN contactos c ON c.id = i.contacto_id
        WHERE i.tipo = 'tarefa' AND i.feito = 0 ORDER BY COALESCE(i.prazo, '9999') LIMIT 200`).all();
      const responsaveis = (await env.DB.prepare(`SELECT DISTINCT responsavel FROM tarefas WHERE responsavel <> '' UNION SELECT DISTINCT responsavel FROM oportunidades WHERE responsavel <> ''`).all()).results.map(r => r.responsavel).sort();
      return json({ gerais: gerais.results, contactos: contactos.results, responsaveis });
    }
    if (!tid && m === 'POST') {
      const c = camposTarefa(corpo);
      if (!c.tarefa) return erro('Escreve a tarefa.', 400);
      const t = agora(), id = uid();
      await inserir(env, 'tarefas', { id, ...c, criado_em: t, atualizado_em: t, atualizado_por: quem });
      await registar(env, quem, 'criar-tarefa', id);
      return json({ id }, 201);
    }
    if (tid) {
      const x = await env.DB.prepare('SELECT id FROM tarefas WHERE id = ?').bind(tid).first();
      if (!x) return erro('Tarefa não encontrada.', 404);
      if (m === 'PATCH') {
        const c = camposTarefa(corpo);
        if ('tarefa' in c && !c.tarefa) return erro('A tarefa não pode ficar vazia.', 400);
        await atualizar(env, 'tarefas', tid, { ...c, atualizado_em: agora(), atualizado_por: quem });
        await registar(env, quem, 'editar-tarefa', tid);
        return json({ ok: true });
      }
      if (m === 'DELETE') {
        await env.DB.prepare('DELETE FROM tarefas WHERE id = ?').bind(tid).run();
        await registar(env, quem, 'apagar-tarefa', tid);
        return json({ ok: true });
      }
    }
  }
  if (partes[0] === 'oportunidades') {
    const oid = partes[1];
    if (!oid && m === 'GET') {
      const fase = texto(url.searchParams.get('fase'), 60), resp = texto(url.searchParams.get('responsavel'), 80);
      const where = [], args = [];
      if (fase === 'abertas') where.push("fase NOT IN ('Ganha', 'Perdida')");
      else if (fase) { where.push('fase = ?'); args.push(fase); }
      if (resp) { where.push('responsavel = ?'); args.push(resp); }
      const r = await env.DB.prepare(`SELECT * FROM oportunidades ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY COALESCE(data_proxima, '9999'), entidade LIMIT 500`).bind(...args).all();
      return json(r.results);
    }
    if (!oid && m === 'POST') {
      const c = camposOportunidade(corpo);
      if (!c.entidade) return erro('Falta a entidade.', 400);
      const t = agora(), id = uid();
      await inserir(env, 'oportunidades', { id, fase: 'Por contactar', ...c, criado_em: t, atualizado_em: t, atualizado_por: quem });
      await registar(env, quem, 'criar-oportunidade', id);
      return json({ id }, 201);
    }
    if (oid) {
      const x = await env.DB.prepare('SELECT id FROM oportunidades WHERE id = ?').bind(oid).first();
      if (!x) return erro('Oportunidade não encontrada.', 404);
      if (m === 'PATCH') {
        const c = camposOportunidade(corpo);
        if ('entidade' in c && !c.entidade) return erro('A entidade não pode ficar vazia.', 400);
        await atualizar(env, 'oportunidades', oid, { ...c, atualizado_em: agora(), atualizado_por: quem });
        await registar(env, quem, 'editar-oportunidade', oid);
        return json({ ok: true });
      }
      if (m === 'DELETE') {
        await env.DB.prepare('DELETE FROM oportunidades WHERE id = ?').bind(oid).run();
        await registar(env, quem, 'apagar-oportunidade', oid);
        return json({ ok: true });
      }
    }
  }
  if (partes[0] === 'importar' && m === 'POST') {
    const linhas = Array.isArray(corpo.linhas) ? corpo.linhas.slice(0, 1000) : [];
    if (!linhas.length) return erro('Não há linhas para importar.', 400);
    const r = await importar(env, quem, corpo.tipo, linhas);
    if (r.erro) return erro(r.erro, 400);
    await registar(env, quem, 'importar-folha', `${corpo.tipo}: ${r.criados} novos, ${r.atualizados} atualizados`);
    return json(r);
  }
  if (partes[0] === 'contactos') {
    const cid = partes[1];
    if (!cid && m === 'GET') {
      const q = texto(url.searchParams.get('q'), 100).toLowerCase(), tipo = texto(url.searchParams.get('tipo'), 40), marca = texto(url.searchParams.get('marca'), 40);
      const where = [], args = [];
      if (q) { where.push('(lower(nome) LIKE ? OR lower(email) LIKE ? OR telefone LIKE ?)'); args.push(`%${q}%`, `%${q}%`, `%${q}%`); }
      if (tipo) { where.push('EXISTS (SELECT 1 FROM json_each(contactos.tipos) WHERE value = ?)'); args.push(tipo); }
      if (marca) { where.push('EXISTS (SELECT 1 FROM json_each(contactos.marcas) WHERE value = ?)'); args.push(marca); }
      const sql = `SELECT id, nome, email, telefone, tipos, marcas, marketing, n_encomendas, total_gasto, origem, estado_lead, nao_contactar, atualizado_em FROM contactos
        ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY atualizado_em DESC LIMIT 300`;
      const r = await env.DB.prepare(sql).bind(...args).all();
      const total = await env.DB.prepare('SELECT COUNT(*) AS n FROM contactos').first();
      return json({ total: total.n, contactos: r.results.map(contactoPublico) });
    }
    if (!cid && m === 'POST') {
      const nome = texto(corpo.nome, 200);
      if (!nome) return erro('Falta o nome.', 400);
      const nid = uid(), t = agora();
      const tipos = (Array.isArray(corpo.tipos) ? corpo.tipos : []).filter(x => TIPOS.includes(x));
      await env.DB.prepare(`INSERT INTO contactos (id, nome, email, telefone, tipos, origem, marketing, notas, criado_em, atualizado_em, atualizado_por)
        VALUES (?, ?, ?, ?, ?, 'manual', ?, ?, ?, ?, ?)`)
        .bind(nid, nome, texto(corpo.email, 200).toLowerCase() || null, texto(corpo.telefone, 40) || null, JSON.stringify(tipos), ['sim', 'nao'].includes(corpo.marketing) ? corpo.marketing : 'desconhecido', texto(corpo.notas), t, t, quem).run();
      await registar(env, quem, 'criar-contacto', nid);
      return json({ id: nid }, 201);
    }
    if (cid) {
      const c = await env.DB.prepare('SELECT * FROM contactos WHERE id = ?').bind(cid).first();
      if (!c) return erro('Contacto não encontrado.', 404);
      if (!partes[2] && m === 'GET') {
        const enc = await env.DB.prepare('SELECT * FROM encomendas WHERE contacto_id = ? ORDER BY data DESC').bind(cid).all();
        const int = await env.DB.prepare('SELECT * FROM interacoes WHERE contacto_id = ? ORDER BY criado_em DESC').bind(cid).all();
        return json({ ...contactoPublico(c), encomendas: enc.results.map(e => ({ ...e, itens: lista(e.itens) })), interacoes: int.results });
      }
      if (!partes[2] && m === 'PATCH') {
        const campos = [], args = [];
        if ('nome' in corpo) { const n = texto(corpo.nome, 200); if (!n) return erro('O nome não pode ficar vazio.', 400); campos.push('nome = ?'); args.push(n); }
        if ('email' in corpo) { campos.push('email = ?'); args.push(texto(corpo.email, 200).toLowerCase() || null); }
        if ('telefone' in corpo) { campos.push('telefone = ?'); args.push(texto(corpo.telefone, 40) || null); }
        if ('tipos' in corpo) { campos.push('tipos = ?'); args.push(JSON.stringify((Array.isArray(corpo.tipos) ? corpo.tipos : []).filter(x => TIPOS.includes(x)))); }
        if ('marketing' in corpo && ['sim', 'nao', 'desconhecido'].includes(corpo.marketing)) { campos.push('marketing = ?'); args.push(corpo.marketing); }
        if ('notas' in corpo) { campos.push('notas = ?'); args.push(texto(corpo.notas)); }
        for (const k of ['canal', 'cidade', 'interesse']) if (k in corpo) { campos.push(`${k} = ?`); args.push(texto(corpo[k], 120)); }
        if ('estado_lead' in corpo) { campos.push('estado_lead = ?'); args.push(daLista(corpo.estado_lead, LISTAS.estados_lead)); }
        /* A fase só fica guardada com consentimento explícito; sem ele, apaga-se. */
        const consent = ['sim', 'nao', 'desconhecido'].includes(corpo.consent_fase) ? corpo.consent_fase : c.consent_fase;
        if ('consent_fase' in corpo) { campos.push('consent_fase = ?'); args.push(consent); }
        if ('fase' in corpo || consent !== 'sim') { campos.push('fase = ?'); args.push(consent === 'sim' ? daLista(corpo.fase ?? c.fase, LISTAS.fases_vida) : ''); }
        if ('nao_contactar' in corpo) {
          if (!eResponsavel(env, quem)) return erro('Só a responsável pode mudar «Não enviar ações comerciais».', 403);
          campos.push('nao_contactar = ?'); args.push(corpo.nao_contactar ? 1 : 0);
        }
        if (!campos.length) return erro('Nada para alterar.', 400);
        campos.push('atualizado_em = ?', 'atualizado_por = ?'); args.push(agora(), quem);
        await env.DB.prepare(`UPDATE contactos SET ${campos.join(', ')} WHERE id = ?`).bind(...args, cid).run();
        await registar(env, quem, 'editar-contacto', cid);
        return json({ ok: true });
      }
      if (!partes[2] && m === 'DELETE') {
        /* Direito ao apagamento (RGPD): apaga o contacto e as interações e desliga as encomendas. Se veio da Shopify, não volta a ser importado; na Shopify apaga-se à parte. */
        const apagar = [
          env.DB.prepare('DELETE FROM interacoes WHERE contacto_id = ?').bind(cid),
          env.DB.prepare('UPDATE encomendas SET contacto_id = NULL WHERE contacto_id = ?').bind(cid),
          env.DB.prepare('DELETE FROM contactos WHERE id = ?').bind(cid)
        ];
        if (c.shopify_id) apagar.push(env.DB.prepare('INSERT OR IGNORE INTO apagados (shopify_id, quando) VALUES (?, ?)').bind(c.shopify_id, agora()));
        await env.DB.batch(apagar);
        await registar(env, quem, 'apagar-contacto', cid);
        return json({ ok: true, shopify: !!c.shopify_id });
      }
      if (partes[2] === 'interacoes' && m === 'POST') {
        const tipo = TIPOS_INTERACAO.includes(corpo.tipo) ? corpo.tipo : 'nota';
        const txt = texto(corpo.texto);
        if (!txt) return erro('Escreve alguma coisa.', 400);
        const prazo = /^\d{4}-\d{2}-\d{2}$/.test(corpo.prazo || '') ? corpo.prazo : null;
        const iid = uid();
        await env.DB.prepare('INSERT INTO interacoes (id, contacto_id, tipo, texto, prazo, feito, autor, criado_em) VALUES (?, ?, ?, ?, ?, 0, ?, ?)')
          .bind(iid, cid, tipo, txt, prazo, quem, agora()).run();
        await env.DB.prepare('UPDATE contactos SET atualizado_em = ?, atualizado_por = ? WHERE id = ?').bind(agora(), quem, cid).run();
        await registar(env, quem, 'nova-interacao', cid);
        return json({ id: iid }, 201);
      }
      if (partes[2] === 'interacoes' && partes[3] && (m === 'PATCH' || m === 'DELETE')) {
        const i = await env.DB.prepare('SELECT id FROM interacoes WHERE id = ? AND contacto_id = ?').bind(partes[3], cid).first();
        if (!i) return erro('Registo não encontrado.', 404);
        if (m === 'DELETE') await env.DB.prepare('DELETE FROM interacoes WHERE id = ?').bind(i.id).run();
        else await env.DB.prepare('UPDATE interacoes SET feito = ? WHERE id = ?').bind(corpo.feito ? 1 : 0, i.id).run();
        await registar(env, quem, m === 'DELETE' ? 'apagar-interacao' : 'concluir-tarefa', cid);
        return json({ ok: true });
      }
    }
  }
  if (partes[0] === 'registo' && m === 'GET') {
    const r = await env.DB.prepare('SELECT * FROM registo ORDER BY id DESC LIMIT 200').all();
    return json(r.results);
  }
  return erro('Não encontrado.', 404);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) {
      try { return await api(request, env, url); } catch (e) { return erro('Erro no servidor.', 500); }
    }
    return env.ASSETS.fetch(request);
  },
  /* Todos os dias, de madrugada, traz da Shopify o que mudou desde a última importação. */
  async scheduled(evento, env, ctx) {
    if (!env.DB || !env.SHOPIFY_CLIENT_ID) return;
    ctx.waitUntil((async () => {
      await prepararBD(env);
      let r = { passo: null };
      for (let i = 0; i < 40; i++) { r = await passoSincronizacao(env, 'automático', r.passo); if (r.feito) break; }
    })().catch(() => {}));
  }
};
