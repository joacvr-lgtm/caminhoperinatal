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
  `CREATE TABLE IF NOT EXISTS apagados (shopify_id TEXT PRIMARY KEY, quando TEXT NOT NULL)`
];
const TIPOS = ['Cliente', 'Subscritora', 'Aldeia', 'Grupo', 'Parceira', 'Convidada', 'Empresa', 'Autarquia ou IPSS', 'Imprensa', 'Fornecedor', 'Outro'];
const TIPOS_INTERACAO = ['nota', 'email', 'chamada', 'reuniao', 'tarefa'];
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
    return json({ email: quem, tipos: TIPOS, tipos_interacao: TIPOS_INTERACAO, sincronizacao: JSON.parse((await lerConfig(env, 'ultima_sincronizacao')) || 'null'), shopify: !!(env.SHOPIFY_LOJA && env.SHOPIFY_CLIENT_ID && env.SHOPIFY_CLIENT_SECRET) });
  }
  if (partes[0] === 'sincronizar' && m === 'POST') {
    try { return json(await passoSincronizacao(env, quem, corpo.passo)); } catch (e) { return erro(e.message, 502); }
  }
  if (partes[0] === 'tarefas' && m === 'GET') {
    const r = await env.DB.prepare(`SELECT i.*, c.nome AS contacto_nome FROM interacoes i JOIN contactos c ON c.id = i.contacto_id
      WHERE i.tipo = 'tarefa' AND i.feito = 0 ORDER BY COALESCE(i.prazo, '9999') LIMIT 200`).all();
    return json(r.results);
  }
  if (partes[0] === 'contactos') {
    const cid = partes[1];
    if (!cid && m === 'GET') {
      const q = texto(url.searchParams.get('q'), 100).toLowerCase(), tipo = texto(url.searchParams.get('tipo'), 40), marca = texto(url.searchParams.get('marca'), 40);
      const where = [], args = [];
      if (q) { where.push('(lower(nome) LIKE ? OR lower(email) LIKE ? OR telefone LIKE ?)'); args.push(`%${q}%`, `%${q}%`, `%${q}%`); }
      if (tipo) { where.push('EXISTS (SELECT 1 FROM json_each(contactos.tipos) WHERE value = ?)'); args.push(tipo); }
      if (marca) { where.push('EXISTS (SELECT 1 FROM json_each(contactos.marcas) WHERE value = ?)'); args.push(marca); }
      const sql = `SELECT id, nome, email, telefone, tipos, marcas, marketing, n_encomendas, total_gasto, origem, atualizado_em FROM contactos
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
