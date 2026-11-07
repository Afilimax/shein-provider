import type { Cookie } from "puppeteer-core"

/**
 * Cookie como exportado por extensões de navegador (EditThisCookie, Cookie-Editor etc.)
 * ou como retornado pelo próprio Puppeteer.
 */
export type SheinCookie = Partial<Omit<Cookie, "sameSite">> & {
    name: string
    value: string
    expirationDate?: number
    sameSite?: string
}

const SAME_SITE: Record<string, "Strict" | "Lax" | "None"> = {
    strict: "Strict",
    lax: "Lax",
    none: "None",
    no_restriction: "None",
}

export const DEFAULT_COOKIE_DOMAIN = ".shein.com"

/**
 * Converte cookies exportados pelo navegador para o formato aceito por `page.setCookie`:
 * garante domínio/path, traduz `expirationDate` para `expires` e normaliza `sameSite`.
 */
export function normalizeCookies(cookies: SheinCookie[]): any[] {
    return cookies.map((cookie) => {
        const { expirationDate, sameSite, hostOnly: _hostOnly, storeId: _storeId, id: _id, ...rest } = cookie as any

        const normalized: Record<string, unknown> = {
            ...rest,
            domain: rest.domain || DEFAULT_COOKIE_DOMAIN,
            path: rest.path || "/",
        }

        if (rest.expires === undefined && typeof expirationDate === "number") {
            normalized.expires = expirationDate
        }

        const mappedSameSite = typeof sameSite === "string" ? SAME_SITE[sameSite.toLowerCase()] : undefined

        if (mappedSameSite) {
            normalized.sameSite = mappedSameSite
        }

        return normalized
    })
}
