# O Caminho Perinatal

O teu negócio numa aplicação privada: o mapa da doença à saúde perinatal, a psicoeducação, A Aldeia, os produtos para as famílias e o plano de negócio. Instala-se no telemóvel ou no computador e funciona sem rede.

**Não é partilhável.** O Consultório Perinatal (casos, escalas, questionários) vive noutro repositório, `consultorioperinatal`.

- **Mapa** (`caminho.html`): da doença à saúde perinatal, no tempo e nos níveis de cuidado, com filtros por quem paga e as próximas criações.
- **Psicoeducação** (`psicoeducacao.html`): Florescer, Cuidar e a Roda da Saúde Perinatal, área a área, prontos a copiar.
- **A Aldeia** (`aldeia.html`): especialistas convidados, tema do mês e os modelos para conduzir a comunidade (guião do círculo, regras, protocolo de crise, encaminhamento para consulta).
- **Biblioteca** (`index.html`): Roda da Saúde Perinatal, Plano do 4.º Trimestre (caderno, página de vendas e kit de lançamento), Guia do Regresso ao Trabalho, Guião da Narrativa do Parto e Plano de Negócio 2027.

## Ligação ao Consultório

Alguns elementos do mapa (questionários, guias dos instrumentos, consultas) vivem no Consultório. Para abrirem diretamente, escreve o endereço do Consultório em `js/ligacoes.js`. Sem endereço, aparecem no mapa sem ligação.

## CRM da equipa

`crm.html` é o CRM partilhado pela equipa: clientes e subscritoras importadas da Shopify, membros da Aldeia, parceiras, convidadas, empresas e imprensa, com encomendas, histórico, tarefas e registo de quem fez o quê.

**Regra:** no CRM nunca entra informação clínica, nem quando a pessoa é também paciente. A página avisa quando uma nota parece ter informação de saúde. Isso fica só no Consultório, que é outra aplicação, só da psicóloga.

**Como funciona:**
- O servidor (`src/worker.js`) corre no mesmo Worker do Cloudflare que serve as páginas.
- Os dados ficam numa base de dados D1 criada com a jurisdição UE.
- Cada pedido ao CRM é verificado duas vezes: pelo Cloudflare Access e, no servidor, pela assinatura do Access, pela aplicação certa e, se `EQUIPA_EMAILS` estiver preenchido, pela lista da equipa.
- Sem configuração, o CRM fica fechado.
- Nada do CRM fica guardado nos aparelhos (o `sw.js` não guarda `/api/`).
- A Shopify é só lida, nunca alterada. A primeira importação traz tudo; depois, todos os dias às 4h17 (UTC), vem só o que mudou. Também se pode atualizar à mão na página.
- Contactos criados à mão juntam-se à cliente da Shopify com o mesmo email.
- Um contacto apagado no CRM não volta a ser importado. Apaga-o também na Shopify.

### Configurar (uma vez)

1. **Base de dados:** Cloudflare → *Storage & databases → D1 → Create*, nome `caminho-crm`, em *Location* escolher **Jurisdiction: EU**. Copiar o *Database ID* para `database_id` em `wrangler.jsonc`.
2. **Access:** em *Zero Trust → Access → Applications*, na aplicação do `caminhoperinatal`, a política *Allow* com os emails da equipa. Copiar o *Application Audience (AUD) Tag* para `ACCESS_AUD`, e o domínio da equipa (`<equipa>.cloudflareaccess.com`) para `ACCESS_TEAM_DOMAIN`. Opcional: os mesmos emails em `EQUIPA_EMAILS`.
3. **Shopify:** em <https://dev.shopify.com> → *Apps → Create app* («CRM Caminho»). Na versão da app:
   - permissões `read_customers`, `read_orders`, `read_all_orders` e `read_products`;
   - em *Protected customer data*, nome, email e telefone.

   Depois, *Release* e instalar na loja `palavraseoutrascoisas`.
4. **Segredos:** no Worker `caminhoperinatal` → *Settings → Variables and Secrets*, juntar como **Secret** o `SHOPIFY_CLIENT_ID` e o `SHOPIFY_CLIENT_SECRET` da app. Nunca os escrevas em ficheiros nem em conversas.
5. Abrir `crm.html` e carregar em *Atualizar da Shopify*.

## Dados

O estado dos convidados da Aldeia e as listas de tarefas dos documentos ficam guardados só no aparelho. O CRM é a exceção: fica na base de dados do Caminho, partilhado pela equipa.

## Experimentar no computador

Não é preciso instalar nada nem compilar. Basta servir a pasta `public`:

```sh
python3 -m http.server 8000 --directory public
```

Depois abre <http://localhost:8000>. O modo offline só funciona através de `http://localhost` ou `https://`; abrir o ficheiro diretamente não chega.

## Publicar para instalar no telemóvel

Para instalar no telemóvel, a aplicação tem de estar num endereço `https://`. O caminho recomendado é o **Cloudflare Workers com Cloudflare Access**, ambos gratuitos.

O Shopify (acarlabairro.com) não serve para isto, por três razões. Não deixa servir o `sw.js` no mesmo endereço das páginas, por isso a aplicação perdia a instalação e o modo offline. Não tem palavra-passe para uma página só. E misturava o clínico com a loja.

1. **Criar conta** em <https://dash.cloudflare.com/sign-up>.
2. **Ligar o repositório:** *Workers & Pages → Create → Import a repository* → escolher `caminhoperinatal`. O ficheiro `wrangler.jsonc` já diz ao Cloudflare para publicar a pasta `public`: deixa o comando de build vazio e o de deploy como `npx wrangler deploy`. O endereço fica `https://caminhoperinatal.<a-tua-conta>.workers.dev`. Cada alteração enviada para `main` é publicada sozinha.
3. **Proteger com Cloudflare Access:** no Worker, *Settings → Domains & Routes*, no endereço `workers.dev`, ativa o *Cloudflare Access* (⋯ → *Enable Cloudflare Access*). Depois, em *Zero Trust → Access → Applications*, abre a aplicação criada e, na política, escolhe *Allow* com *Emails* = o teu email. Para entrar, recebes um código por email. O plano Zero Trust gratuito chega para até 50 pessoas e pode pedir um cartão, mas não cobra nada.
4. **Instalar:** **Android/Chrome** → menu ⋮ → *Instalar aplicação*. **iPhone/iPad** → Safari → Partilhar → *Adicionar ao ecrã principal*.

O ficheiro `_headers` impede os motores de busca de indexar o site e evita que a aplicação seja aberta dentro de outros sites. O `robots.txt` também afasta os motores de busca.

**Subdomínio próprio (opcional, mais tarde).** Para usar `app.acarlabairro.com` com o Access, o domínio inteiro teria de passar a ser gerido pelo Cloudflare. Os registos do Shopify e do email mudam-se para lá. É possível, mas tem de ser feito com cuidado para a loja e o email não irem abaixo.

**Alternativa:** GitHub Pages (publica a pasta `public`), com o workflow manual em *Actions → Publicar no GitHub Pages*. Não tem palavra-passe, e em repositórios privados exige plano pago.

## Atualizar

Depois de alterar qualquer ficheiro, sobe a `VERSAO` em `sw.js` (por exemplo `caminho-v2`). Assim, os aparelhos onde a aplicação está instalada recebem a nova versão.

## Estrutura

```
wrangler.jsonc               configuração do Cloudflare (publica a pasta public)
public/
  index.html                 ecrã inicial e Biblioteca
  caminho.html               o mapa
  psicoeducacao.html         Florescer, Cuidar e a Roda área a área
  aldeia.html                A Aldeia
  roda.html                  Roda da Saúde Perinatal
  plano-4-trimestre*.html    caderno e página de vendas
  kit-lancamento.html        kit de lançamento do Plano do 4.º Trimestre
  regresso-trabalho.html     Guia do Regresso ao Trabalho
  narrativa-parto.html       Guião da Narrativa do Parto
  plano-negocio-2027.html    Plano de Negócio 2027
  ficheiros/                 caderno em PDF e capa
  css/                       paleta Aproximar (base), mapa, páginas e documentos
  js/caminho.js              dados e lógica do mapa
  js/ligacoes.js             endereço do Consultório
  js/conteudos.js            textos e lógica da Psicoeducação e da Aldeia
  js/graficos.js             gráficos interativos dos documentos
  js/docs.js                 listas de tarefas que ficam marcadas
  crm.html, js/crm.js        CRM da equipa
  js/app.js, sw.js           instalação e funcionamento offline
src/worker.js                servidor do CRM (verificação do Access, base de dados, Shopify)
```
