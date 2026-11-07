import fs from "node:fs"
import path from "node:path"

import { describe, expect, it } from "vitest"

import { SheinProvider } from "../src/index"

// Teste de integração real (não roda no CI): precisa do arquivo __tests__/cookies.json
// com os cookies de uma sessão logada em https://m.shein.com/br/affiliate
const COOKIES_PATH = path.join(__dirname, "cookies.json")

let REAL_COOKIES: any[] = []

if (fs.existsSync(COOKIES_PATH)) {
    try {
        REAL_COOKIES = JSON.parse(fs.readFileSync(COOKIES_PATH, "utf-8"))
    } catch (error: any) {
        console.error("❌ Erro ao ler cookies.json:", error.message)
    }
}

describe("SheinProvider Practical Test", () => {
    it("should create a real affiliate URL (integration)", async () => {
        if (REAL_COOKIES.length === 0) {
            console.warn(`⚠️ Pulando teste prático: cookies.json não encontrado ou vazio em: ${COOKIES_PATH}`)
            return
        }

        const provider = new SheinProvider({
            cookies: REAL_COOKIES,
            puppeteer: { headless: false },
        })

        const url = await provider.createAffiliateUrl("https://br.shein.com/Men-s-Japan-Heron-T-Shirt-Stylish-Elegant-Casual-Everyday-100-Cotton-Unisex-p-560450555.html?imgRatio=3-4&detailBusinessFrom=0-1_560450555%7C0-2&src_identifier=st%3D2%60sc%3Dcamisa%60sr%3D0%60ps%3D1&src_module=search&src_tab_page_id=page_home1794026936197&mallCode=2&pageListType=4")

        console.log("Link de afiliado:", url)
        expect(url).toMatch(/^https?:\/\//)
    }, 120000)
})
