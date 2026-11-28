<a href="https://afilimax.net"><img src="https://raw.githubusercontent.com/Afilimax/.github/main/assets/npm-banner.svg" alt="Afilimax — Encontre a oferta. Gere o link. Divulgue sozinho." width="100%" /></a>

[![npm version](https://img.shields.io/npm/v/%40afilimax%2Fshein-provider?logo=npm)](https://www.npmjs.com/package/@afilimax/shein-provider)
[![npm downloads](https://img.shields.io/npm/dm/%40afilimax%2Fshein-provider?logo=npm)](https://www.npmjs.com/package/@afilimax/shein-provider)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/Afilimax/shein-provider/blob/HEAD/LICENSE)
[![Website](https://img.shields.io/badge/website-afilimax.net-7857FF)](https://afilimax.net)

# @afilimax/shein-provider

Provedor de links de afiliado da Shein para o ecossistema Afilimax. O pacote automatiza a página de conversão do programa de afiliados com Puppeteer e uma sessão autenticada para gerar links `onelink` de divulgação.

## Recursos

- Conversão de URLs pela página oficial do programa de afiliados da Shein.
- Captura do `oneLink` retornado por `POST /api/share/link/from/url`.
- Automação mobile com Puppeteer e plugin stealth.
- Autenticação por cookies da sessão de afiliado.
- Normalização de cookies exportados por extensões de navegador.
- Tempo limite configurável para as etapas da conversão.
- Fechamento do navegador após cada chamada, inclusive em caso de erro.
- Compatibilidade com `AffiliateProvider` e `AffiliateManager`.

## Instalação

```bash
npm install @afilimax/shein-provider @afilimax/core
```

O `@afilimax/core` é uma dependência de par obrigatória, na versão `>=0.5.0`.

## Como usar

Carregue os cookies de uma sessão válida no programa de afiliados:

```typescript
import { readFileSync } from "node:fs"
import { SheinProvider } from "@afilimax/shein-provider"

const provider = new SheinProvider({
    cookies: JSON.parse(readFileSync("cookies.json", "utf8")),
    puppeteer: { headless: true },
})

async function main() {
    const productUrl = "https://br.shein.com/Vestido-p-39484516.html"

    try {
        const affiliateUrl = await provider.createAffiliateUrl(productUrl)
        console.log("Affiliate URL:", affiliateUrl)
    } catch (error) {
        console.error("Failed to create affiliate URL:", error)
    }
}

main()
```

Cada chamada abre uma instância do navegador, realiza a conversão e fecha o navegador automaticamente.

### Uso com AffiliateManager

```typescript
import { AffiliateManager } from "@afilimax/core"
import { SheinProvider } from "@afilimax/shein-provider"

const manager = new AffiliateManager([
    new SheinProvider({
        cookies: JSON.parse(readFileSync("cookies.json", "utf8")),
    }),
])

const affiliateUrl = await manager.createAffiliateUrl("https://br.shein.com/Vestido-p-39484516.html")

console.log("Affiliate URL:", affiliateUrl)
```

O gerenciador retorna `null` quando nenhum provedor registrado aceita a URL.

## Configuração

A interface `SheinProviderOptions` aceita:

| Opção | Tipo | Padrão | Descrição |
| :--- | :--- | :--- | :--- |
| `cookies` | `SheinCookie[]` | Obrigatório | Cookies da sessão autenticada no programa de afiliados. |
| `puppeteer` | `any` | `undefined` | Opções adicionais repassadas a `puppeteer.launch`. |
| `timeout` | `number` | `30000` | Tempo limite de cada etapa, em milissegundos. |

As opções de `puppeteer` são aplicadas sobre os valores padrão. O provedor procura uma instalação local de Chrome nos caminhos conhecidos e, quando não a encontra, usa a resolução padrão do Puppeteer.

A função exportada `normalizeCookies` preenche `domain` e `path`, converte `expirationDate` em `expires` e normaliza `sameSite`. A constante `SHEIN_CONVERT_LINK_URL` expõe o endereço da página de conversão.

### Como obter os cookies

1. Faça login em [m.shein.com/br/affiliate](https://m.shein.com/br/affiliate) com a conta participante do programa.
2. Confirme que a [página de conversão](https://m.shein.com/br/affiliate/convert-link) abre sem redirecionar para o login.
3. Exporte os cookies do domínio `shein.com` em JSON com uma extensão de navegador.
4. Salve o conteúdo em `cookies.json` e mantenha o arquivo fora do controle de versão.

Os cookies representam acesso à sua conta. Não os compartilhe nem os inclua no código.

## Referência da API

### `new SheinProvider(options)`

Cria o provedor e prepara a instância do Puppeteer com o plugin stealth.

### `createAffiliateUrl(url: string): Promise<string>`

Abre a página de conversão, envia a URL informada e retorna o `oneLink` gerado. O método lança um erro quando a sessão expirou, a URL foi rejeitada ou a API não retornou um link válido.

| Parâmetro | Tipo | Descrição |
| :--- | :--- | :--- |
| `url` | `string` | URL do produto ou página aceita pela conversão da Shein. |

### `supportsUrl(url: string): boolean`

Método herdado de `AffiliateProvider` que verifica o hostname e seus subdomínios.

### Domínios suportados

- `shein.com`
- `shein.com.br`
- `shein.top`
- `shein.onelink.me`
- `onelink.shein.com`
- `api-shein.shein.com`

### Erros comuns

| Erro | Causa provável |
| :--- | :--- |
| `Shein session is invalid or expired` | A sessão expirou ou a página redirecionou para o login; exporte novos cookies. |
| `Shein rejected the link as invalid` | A Shein rejeitou a URL com o código `80002`. |
| `Shein convert-link failed` | A API retornou outro código de erro; o código e a mensagem são incluídos no erro. |

## Desenvolvimento

Instale as dependências com `npm install`. Os scripts disponíveis são:

| Comando | Finalidade |
| :--- | :--- |
| `npm run dev` | Executa `src/index.ts` com `tsx`. |
| `npm run build` | Compila o TypeScript para `dist/`. |
| `npm test` | Executa os testes uma vez com Vitest. |
| `npm run test:watch` | Executa os testes em modo de observação. |
| `npm run test:cov` | Executa os testes com cobertura. |
| `npm run test:practical` | Executa a conversão real com o arquivo de cookies local. |
| `npm run lint` | Executa o ESLint com correção automática. |
| `npm run format` | Formata os arquivos de `src/` com Prettier. |

O teste prático lê `__tests__/cookies.json` e é ignorado quando o arquivo está ausente ou vazio. Ele acessa a Shein de verdade e deve ser executado somente com uma sessão autorizada. Não versione os cookies.

## Licença

Distribuído sob a licença [MIT](./LICENSE).

---

## Automatize sua operação de afiliados

> Use este pacote para automatizar sua operação de afiliados. Conheça a plataforma Afilimax e transforme ofertas em links e divulgação automática.

[Conheça a Afilimax](https://afilimax.net) · [Pacote no npm](https://www.npmjs.com/package/@afilimax/shein-provider) · [Repositório no GitHub](https://github.com/Afilimax/shein-provider)
