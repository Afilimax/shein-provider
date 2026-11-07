import { AffiliateProvider } from "@afilimax/core"
import { PuppeteerExtra } from "puppeteer-extra"
import StealthPlugin from "puppeteer-extra-plugin-stealth"

import { getBrowserPath, normalizeCookies, requireVanillaPuppeteer, SheinCookie } from "./utils"

export * from "./utils/cookie.util"

export const SHEIN_CONVERT_LINK_URL = "https://m.shein.com/br/affiliate/convert-link"

const CONVERT_LINK_API_PATH = "/api/share/link/from/url"
const INVALID_LINK_CODE = "80002"
const MOBILE_USER_AGENT =
    "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"

export type SheinProviderOptions = {
    /**
     * Cookies de uma sessão logada no programa de afiliados da SHEIN
     * (exportados do navegador após fazer login em https://m.shein.com/br/affiliate).
     */
    cookies: SheinCookie[]
    /** Opções repassadas ao `puppeteer.launch`. */
    puppeteer?: any
    /** Tempo máximo (ms) para cada etapa da conversão. Padrão: 30000. */
    timeout?: number
}

type ConvertLinkResponse = {
    code: string
    msg?: string
    info?: { oneLink?: string } | null
}

export class SheinProvider extends AffiliateProvider<SheinProviderOptions> {
    readonly name = "Shein"

    readonly domains = [
        "shein.com",
        "shein.com.br",
        "shein.top",
        "shein.onelink.me",
        "onelink.shein.com",
        "api-shein.shein.com",
    ]

    private readonly puppeteer: PuppeteerExtra

    constructor(options: SheinProviderOptions) {
        super(options)
        this.puppeteer = new PuppeteerExtra(...requireVanillaPuppeteer())
        this.puppeteer.use(StealthPlugin())
    }

    async createAffiliateUrl(url: string): Promise<string> {
        const timeout = this.options.timeout ?? 30000

        const browser = await this.puppeteer.launch({
            headless: true,
            args: [
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-dev-shm-usage",
                "--disable-accelerated-2d-canvas",
                "--no-first-run",
                "--no-zygote",
                "--disable-gpu",
            ],
            defaultViewport: null,
            executablePath: getBrowserPath(),
            ...this.options.puppeteer,
        })

        try {
            const page = await browser.newPage()

            await page.setUserAgent(MOBILE_USER_AGENT)
            await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true })

            if (this.options.cookies && this.options.cookies.length > 0) {
                await page.setCookie(...normalizeCookies(this.options.cookies))
            }

            await page.goto(SHEIN_CONVERT_LINK_URL, { waitUntil: "domcontentloaded", timeout })

            const textareaSelector = "textarea"

            try {
                await page.waitForSelector(textareaSelector, { timeout, visible: true })
            } catch (error) {
                if (page.url().includes("/user/login")) {
                    throw new Error("Shein session is invalid or expired: login required. Provide fresh cookies.")
                }

                throw error
            }

            await page.type(textareaSelector, url)

            const [response] = await Promise.all([
                page.waitForResponse(
                    (res) => res.url().includes(CONVERT_LINK_API_PATH) && res.request().method() === "POST",
                    { timeout },
                ),
                page.click("[class*='convert-link_confirmButton']"),
            ])

            const data = (await response.json()) as ConvertLinkResponse

            if (data.code === INVALID_LINK_CODE) {
                throw new Error(`Shein rejected the link as invalid: ${url}`)
            }

            const affiliateUrl = data.code === "0" ? data.info?.oneLink : undefined

            if (!affiliateUrl) {
                throw new Error(`Shein convert-link failed: ${data.code} - ${data.msg ?? "unknown error"}`)
            }

            return affiliateUrl
        } finally {
            await browser.close()
        }
    }
}
