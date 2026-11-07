import { describe, expect, it } from "vitest"

import { DEFAULT_COOKIE_DOMAIN, normalizeCookies } from "../src/utils/cookie.util"

describe("normalizeCookies", () => {
    it("fills in the default domain and path", () => {
        expect(normalizeCookies([{ name: "AT", value: "1" }])).toEqual([
            { name: "AT", value: "1", domain: DEFAULT_COOKIE_DOMAIN, path: "/" },
        ])
    })

    it("keeps the domain and path that were provided", () => {
        expect(normalizeCookies([{ name: "AT", value: "1", domain: "m.shein.com", path: "/br" }])[0]).toMatchObject({
            domain: "m.shein.com",
            path: "/br",
        })
    })

    it("maps expirationDate to expires but never overrides an existing expires", () => {
        const [fromExpiration, withExpires, withoutExpiration] = normalizeCookies([
            { name: "a", value: "1", expirationDate: 1900000000 },
            { name: "b", value: "2", expires: 10, expirationDate: 1900000000 },
            { name: "c", value: "3" },
        ])

        expect(fromExpiration.expires).toBe(1900000000)
        expect(withExpires.expires).toBe(10)
        expect(withoutExpiration).not.toHaveProperty("expires")
        expect(fromExpiration).not.toHaveProperty("expirationDate")
    })

    it.each([
        ["strict", "Strict"],
        ["Lax", "Lax"],
        ["none", "None"],
        ["no_restriction", "None"],
    ])("normalizes sameSite %s to %s", (input, expected) => {
        expect(normalizeCookies([{ name: "a", value: "1", sameSite: input }])[0].sameSite).toBe(expected)
    })

    it("drops unknown sameSite values", () => {
        expect(normalizeCookies([{ name: "a", value: "1", sameSite: "unspecified" }])[0]).not.toHaveProperty("sameSite")
        expect(normalizeCookies([{ name: "a", value: "1" }])[0]).not.toHaveProperty("sameSite")
    })

    it("removes fields that only browser extensions add", () => {
        const [cookie] = normalizeCookies([{ name: "a", value: "1", hostOnly: true, storeId: "0", id: 7 } as any])

        expect(cookie).not.toHaveProperty("hostOnly")
        expect(cookie).not.toHaveProperty("storeId")
        expect(cookie).not.toHaveProperty("id")
    })
})
