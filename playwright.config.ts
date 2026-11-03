import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir:"./e2e",fullyParallel:false,workers:1,timeout:60000,
  use:{baseURL:"http://127.0.0.1:3100",...devices["Desktop Edge"],channel:"msedge",trace:"retain-on-failure",screenshot:"only-on-failure"},
  webServer:{command:"npm run start -- --port 3100",url:"http://127.0.0.1:3100",reuseExistingServer:false,timeout:60000,env:{SUELORUTA_DB:`data/e2e-${Date.now()}.sqlite`,NEXT_TELEMETRY_DISABLED:"1"}},
});
