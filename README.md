# O Caminho Perinatal

O teu negócio numa aplicação privada: o mapa da doença à saúde perinatal, a psicoeducação, A Aldeia, os produtos para as famílias e o plano de negócio. Instala-se no telemóvel ou no computador e funciona sem rede.

**Não é partilhável.** O Consultório Perinatal (casos, escalas, questionários) vive noutro repositório, `consultorioperinatal`.

- **Mapa** (`caminho.html`): da doença à saúde perinatal, no tempo e nos níveis de cuidado, com filtros por quem paga e as próximas criações.
- **Psicoeducação** (`psicoeducacao.html`): Florescer, Cuidar e a Roda da Saúde Perinatal, área a área, prontos a copiar.
- **A Aldeia** (`aldeia.html`): especialistas convidados, tema do mês e os modelos para conduzir a comunidade (guião do círculo, regras, protocolo de crise, encaminhamento para consulta).
- **Biblioteca** (`index.html`): Roda da Saúde Perinatal, Plano do 4.º Trimestre (caderno, página de vendas e kit de lançamento), Guia do Regresso ao Trabalho, Guião da Narrativa do Parto e Plano de Negócio 2027.

## Ligação ao Consultório

Alguns elementos do mapa (questionários, guias dos instrumentos, consultas) vivem no Consultório. Para abrirem diretamente, escreve o endereço do Consultório em `js/ligacoes.js`. Sem endereço, aparecem no mapa sem ligação.

## Dados

O estado dos convidados da Aldeia e as listas de tarefas dos documentos ficam guardados só no aparelho. Não há servidor nem contas.

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
  js/app.js, sw.js           instalação e funcionamento offline
```
