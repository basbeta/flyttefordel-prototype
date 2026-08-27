// CR-017: Speiler tsconfig.json sin "@/*" -> "./src/*"-alias for vitest.
// Manglet frem til nå fordi hver eneste test som traff et "@/..."-import
// også mocket det (vi.mock intercepter på ren spesifikator-tekst, uavhengig
// av reell modul-oppløsning). CR-017 sine integrasjonstester importerer et
// ekte, ikke-mocket "@/lib/benefits/displayStatus" — som avslørte at det
// aldri har vært reell alias-oppløsning konfigurert.
import path from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
})
