# @afilimax/shein-provider

[![npm version](https://img.shields.io/npm/v/@afilimax/shein-provider.svg)](https://www.npmjs.com/package/@afilimax/shein-provider)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Este pacote é um provedor de afiliação para o ecossistema **Afilimax**, implementando a interface `AffiliateProvider` do pacote [`@afilimax/core`](https://www.npmjs.com/package/@afilimax/core). Ele é especializado em gerar links de afiliados da **SHEIN** através de automação de navegador (Puppeteer).

A SHEIN não possui API pública de afiliados. Por isso, este provedor automatiza a página de conversão do próprio programa de afiliados ([`m.shein.com/br/affiliate/convert-link`](https://m.shein.com/br/affiliate/convert-link)): cola o link do produto e captura o `oneLink` oficial retornado por `POST /api/share/link/from/url`.

## 🚀 Principais Recursos

- 🤖 **Automação com Puppeteer**: Navega como um usuário real (modo mobile) pela página de conversão de links.
- 🔗 **Links onelink oficiais**: Gera links `onelink.shein.com`, rastreáveis pelo programa de afiliados.
- 🛡️ **Stealth Mode**: Utiliza `puppeteer-extra-plugin-stealth` para evitar detecção de bots.
- 🍪 **Gestão de Sessão**: Usa os cookies de uma sessão logada no programa de afiliados.
- 🧹 **Cookies de extensões**: Aceita cookies exportados por extensões (_Cookie-Editor_, _EditThisCookie_) sem ajustes.
- 🇧🇷 **Focado no Brasil**: Otimizado para `br.shein.com`.

## 📦 Instalação

```bash
npm install @afilimax/shein-provider @afilimax/core
```

### Peer Dependencies

Este pacote requer que o `@afilimax/core` esteja instalado em seu projeto:

```bash
npm install @afilimax/core
```

## 🛠️ Como Usar

Para que o provedor consiga converter o link, você **precisa** fornecer cookies de uma sessão válida (logada) no programa de afiliados da SHEIN.

```typescript
import fs from "node:fs";
import { SheinProvider } from "@afilimax/shein-provider";

const provider = new SheinProvider({
  cookies: JSON.parse(fs.readFileSync("cookies.json", "utf-8")),
  puppeteer: {
    headless: true, // Defina como false para debugar visualmente
  },
});

const productUrl = "https://br.shein.com/Vestido-p-39484516.html";

async function generate() {
  try {
    const affiliateUrl = await provider.createAffiliateUrl(productUrl);
    console.log("Link de Afiliado:", affiliateUrl); // Ex: https://onelink.shein.com/59/abc123
  } catch (error) {
    console.error("Erro ao gerar link:", error);
  }
}

generate();
```

### Uso com o `AffiliateManager`

O provedor pode ser registrado no `AffiliateManager` do `@afilimax/core`, que escolhe o provedor certo a partir do domínio da URL (`supportsUrl`).

### Como obter os cookies

1. Faça login em <https://m.shein.com/br/affiliate> com a conta que participa do programa de afiliados.
2. Confirme que <https://m.shein.com/br/affiliate/convert-link> abre sem redirecionar para o login.
3. Exporte os cookies do domínio `shein.com` com uma extensão como _Cookie-Editor_ ou _EditThisCookie_ (formato JSON) e salve em `cookies.json`.

O provedor define `domain` e `path` quando faltam, converte `expirationDate` em `expires` e normaliza `sameSite`.

> ⚠️ **Nunca** versione o `cookies.json`: ele dá acesso à sua conta de afiliado.

## ⚙️ Configurações (`SheinProviderOptions`)

| Opção | Tipo | Descrição |
|-------|------|-----------|
| `cookies` | `SheinCookie[]` | **Obrigatório.** Cookies da sessão logada no programa de afiliados da SHEIN. |
| `puppeteer` | `LaunchOptions` | Configurações opcionais para o lançamento do Puppeteer. |
| `timeout` | `number` | Tempo máximo, em ms, de cada etapa da conversão. Padrão: `30000`. |

## 🔍 Domínios Suportados

O provedor identifica e processa automaticamente URLs dos seguintes domínios:
- `shein.com`
- `shein.com.br`
- `shein.top`
- `shein.onelink.me`
- `onelink.shein.com`
- `api-shein.shein.com`

## ❗ Erros Comuns

| Erro | Causa |
|------|-------|
| `Shein session is invalid or expired` | Os cookies expiraram. Exporte novos. |
| `Shein rejected the link as invalid` | A SHEIN não aceitou a URL informada (código `80002`). |
| `Shein convert-link failed: <code> - <msg>` | Qualquer outra falha da API. Ex.: `100105 Forbidden` quando a sessão é bloqueada pelo anti-bot. |

## 🏗️ Arquitetura e Contrato

Este provedor segue rigorosamente o contrato definido em `affiliate-provider.interface.ts` do `@afilimax/core`. Ele estende a classe base abstrata `AffiliateProvider`, garantindo compatibilidade com o `AffiliateManager` para uso em cadeias de provedores.

## 🧪 Desenvolvimento

Para rodar os testes (cobertura de 100% obrigatória):

```bash
npm run test:cov
```

O teste `__tests__/practical.spec.ts` faz uma conversão real e só roda localmente, com um `__tests__/cookies.json` válido:

```bash
npm run test:practical
```

Para gerar a build:

```bash
npm run build
```

---

Feito com ❤️ por **Afilimax**.
