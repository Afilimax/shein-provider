import { beforeEach, describe, expect, it, vi } from "vitest"

import { SHEIN_CONVERT_LINK_URL, SheinProvider } from "../src/index"

const mocks = vi.hoisted(() => ({
    constructed: [] as unknown[][],
    use: vi.fn(),
    launch: vi.fn(),
}))

vi.mock("puppeteer-extra", () => ({
    PuppeteerExtra: class {
        constructor(...args: unknown[]) {
            mocks.constructed.push(args)
        }
        use = mocks.use
        launch = mocks.launch
    },
}))
vi.mock("puppeteer-extra-plugin-stealth", () => ({ default: () => "stealth-plugin" }))
vi.mock("../src/utils/require-vanilla-puppeteer.util", () => ({
    requireVanillaPuppeteer: () => ["vanilla", undefined],
}))
vi.mock("../src/utils/browser.util", () => ({ getBrowserPath: () => "/fake/chrome" }))

const PRODUCT_URL = "https://br.shein.com/Vestido-p-123456.html"
const ONE_LINK = "https://shein.onelink.me/abc123"
const CONFIRM_BUTTON = "[class*='convert-link_confirmButton']"
const COOKIES = [{ name: "AT", value: "token" }]

const apiResponse = (body: unknown) => ({ json: async () => body })

function makePage(response: unknown = apiResponse({ code: "0", info: { oneLink: ONE_LINK } })) {
    return {
        setUserAgent: vi.fn().mockResolvedValue(undefined),
        setViewport: vi.fn().mockResolvedValue(undefined),
        setCookie: vi.fn().mockResolvedValue(undefined),
        goto: vi.fn().mockResolvedValue(undefined),
        waitForSelector: vi.fn().mockResolvedValue(undefined),
        type: vi.fn().mockResolvedValue(undefined),
        click: vi.fn().mockResolvedValue(undefined),
        url: vi.fn(() => SHEIN_CONVERT_LINK_URL),
        waitForResponse: vi.fn().mockResolvedValue(response),
    }
}

function setup(options: Partial<ConstructorParameters<typeof SheinProvider>[0]> = {}, page = makePage()) {
    const browser = { newPage: vi.fn().mockResolvedValue(page), close: vi.fn() }
    mocks.launch.mockResolvedValue(browser)
    const provider = new SheinProvider({ cookies: COOKIES, ...options })
    return { provider, page, browser }
}

beforeEach(() => {
    mocks.constructed.length = 0
    mocks.use.mockReset()
    mocks.launch.mockReset()
})

describe("SheinProvider setup", () => {
    it("registers the stealth plugin", () => {
        setup()

        expect(mocks.constructed[0]).toEqual(["vanilla", undefined])
        expect(mocks.use).toHaveBeenCalledWith("stealth-plugin")
    })

    it("exposes its name and supports Shein domains", () => {
        const { provider } = setup()

        expect(provider.name).toBe("Shein")
        expect(provider.supportsUrl("https://br.shein.com/x-p-1.html")).toBe(true)
        expect(provider.supportsUrl("https://m.shein.com/br/x")).toBe(true)
        expect(provider.supportsUrl("https://shein.top/abc")).toBe(true)
        expect(provider.supportsUrl("https://shein.onelink.me/abc")).toBe(true)
        expect(provider.supportsUrl("https://onelink.shein.com/59/abc")).toBe(true)
        expect(provider.supportsUrl("https://example.com")).toBe(false)
    })
})

describe("createAffiliateUrl", () => {
    it("types the url on the convert-link page and returns the generated link", async () => {
        const { provider, page, browser } = setup()

        await expect(provider.createAffiliateUrl(PRODUCT_URL)).resolves.toBe(ONE_LINK)

        expect(page.goto).toHaveBeenCalledWith(SHEIN_CONVERT_LINK_URL, {
            waitUntil: "domcontentloaded",
            timeout: 30000,
        })
        expect(page.waitForSelector).toHaveBeenCalledWith("textarea", { timeout: 30000, visible: true })
        expect(page.type).toHaveBeenCalledWith("textarea", PRODUCT_URL)
        expect(page.click).toHaveBeenCalledWith(CONFIRM_BUTTON)
        expect(page.setUserAgent).toHaveBeenCalledWith(expect.stringContaining("Mobile"))
        expect(browser.close).toHaveBeenCalled()
    })

    it("only reacts to the convert-link POST response", async () => {
        const { provider, page } = setup()
        await provider.createAffiliateUrl(PRODUCT_URL)

        const predicate = page.waitForResponse.mock.calls[0][0] as (r: unknown) => boolean
        const res = (url: string, method: string) => ({ url: () => url, request: () => ({ method: () => method }) })

        expect(predicate(res("https://m.shein.com/br/affiliate/api/share/link/from/url", "POST"))).toBe(true)
        expect(predicate(res("https://m.shein.com/br/affiliate/api/share/link/from/url", "GET"))).toBe(false)
        expect(predicate(res("https://m.shein.com/br/api/other", "POST"))).toBe(false)
    })

    it("merges the launch options and honors a custom timeout", async () => {
        const { provider, page } = setup({ puppeteer: { headless: false }, timeout: 5000 })

        await provider.createAffiliateUrl(PRODUCT_URL)

        expect(mocks.launch.mock.calls[0][0]).toMatchObject({
            headless: false,
            executablePath: "/fake/chrome",
            defaultViewport: null,
        })
        expect(page.goto).toHaveBeenCalledWith(SHEIN_CONVERT_LINK_URL, { waitUntil: "domcontentloaded", timeout: 5000 })
    })

    it("sets normalized cookies only when provided", async () => {
        const withCookies = setup()
        await withCookies.provider.createAffiliateUrl(PRODUCT_URL)
        expect(withCookies.page.setCookie).toHaveBeenCalledWith({
            name: "AT",
            value: "token",
            domain: ".shein.com",
            path: "/",
        })

        const empty = setup({ cookies: [] })
        await empty.provider.createAffiliateUrl(PRODUCT_URL)
        expect(empty.page.setCookie).not.toHaveBeenCalled()

        const missing = setup({ cookies: undefined as any })
        await missing.provider.createAffiliateUrl(PRODUCT_URL)
        expect(missing.page.setCookie).not.toHaveBeenCalled()
    })

    it("explains that the session expired when redirected to the login page", async () => {
        const { provider, page, browser } = setup()
        page.waitForSelector.mockRejectedValue(new Error("timeout"))
        page.url.mockReturnValue("https://m.shein.com/br/user/login?redirection=%2Faffiliate%2Fconvert-link")

        await expect(provider.createAffiliateUrl(PRODUCT_URL)).rejects.toThrow("session is invalid or expired")
        expect(browser.close).toHaveBeenCalled()
    })

    it("rethrows other selector errors", async () => {
        const { provider, page } = setup()
        page.waitForSelector.mockRejectedValue(new Error("timeout"))

        await expect(provider.createAffiliateUrl(PRODUCT_URL)).rejects.toThrow("timeout")
    })

    it("reports links rejected by Shein as invalid", async () => {
        const { provider } = setup({}, makePage(apiResponse({ code: "80002", msg: "invalid" })))

        await expect(provider.createAffiliateUrl(PRODUCT_URL)).rejects.toThrow(
            `Shein rejected the link as invalid: ${PRODUCT_URL}`,
        )
    })

    it.each([
        ["an error code with a message", { code: "100105", msg: "Forbidden", info: null }, "100105 - Forbidden"],
        ["an error code without a message", { code: "500" }, "500 - unknown error"],
        ["a success without a link", { code: "0", info: {} }, "0 - unknown error"],
        ["a success without info", { code: "0", info: null }, "0 - unknown error"],
    ])("fails on %s", async (_name, body, message) => {
        const { provider, browser } = setup({}, makePage(apiResponse(body)))

        await expect(provider.createAffiliateUrl(PRODUCT_URL)).rejects.toThrow(`Shein convert-link failed: ${message}`)
        expect(browser.close).toHaveBeenCalled()
    })
})
