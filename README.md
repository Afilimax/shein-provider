# @afilimax/shein-provider

Provedor de links de afiliado da **SHEIN** para o ecossistema `@afilimax`.

Não existe API pública de afiliados da SHEIN. O provedor automatiza (via Puppeteer) a página de
conversão do próprio programa de afiliados — <https://m.shein.com/br/affiliate/convert-link> —,
cola o link do produto e captura o `oneLink` retornado por `POST /api/share/link/from/url`.
Por isso ele precisa dos **cookies de uma sessão logada** no programa de afiliados.

## Uso

```ts
import { SheinProvider } from "@afilimax/shein-provider"

const provider = new SheinProvider({
    cookies: JSON.parse(fs.readFileSync("cookies.json", "utf-8")),
})

const link = await provider.createAffiliateUrl("https://br.shein.com/Vestido-p-39484516.html")
// https://shein.onelink.me/...
```

Também funciona com o `AffiliateManager` do `@afilimax/core` (`supportsUrl` reconhece
`shein.com`, `shein.com.br`, `shein.top`, `shein.onelink.me` e `onelink.shein.com`).

### Opções

| Opção       | Descrição                                                         |
| ----------- | ----------------------------------------------------------------- |
| `cookies`   | Cookies da sessão logada (veja abaixo). **Obrigatório.**          |
| `puppeteer` | Opções repassadas ao `puppeteer.launch` (ex.: `{ headless: false }`). |
| `timeout`   | Tempo máximo, em ms, de cada etapa. Padrão: `30000`.              |

## Como obter os cookies

1. Faça login em <https://m.shein.com/br/affiliate> com a conta que participa do programa de afiliados.
2. Confirme que a página <https://m.shein.com/br/affiliate/convert-link> abre (sem redirecionar para o login).
3. Exporte os cookies do domínio `shein.com` com uma extensão como _Cookie-Editor_ ou _EditThisCookie_
   (formato JSON) e salve em `cookies.json`.

Os cookies exportados por extensões são aceitos como estão: o provedor define `domain`/`path` quando
faltam, converte `expirationDate` em `expires` e normaliza `sameSite`.

> **Nunca** versione o `cookies.json`: ele dá acesso à sua conta. O arquivo já está no `.gitignore`.

## Erros comuns

- `Shein session is invalid or expired` — os cookies expiraram; exporte novos.
- `Shein rejected the link as invalid` — a SHEIN não aceitou a URL informada (código `80002`).
- `Shein convert-link failed: <code> - <msg>` — qualquer outra falha retornada pela API
  (ex.: `100105 Forbidden` quando a sessão é bloqueada pelo anti-bot).

## Desenvolvimento

```bash
npm run test:cov   # testes com 100% de cobertura obrigatória
npm run lint
npm run format
```

O teste `__tests__/practical.spec.ts` faz uma conversão real e só roda localmente, com um
`__tests__/cookies.json` válido (`npm run test:practical`).
