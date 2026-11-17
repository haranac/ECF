import { execSync, spawnSync } from 'node:child_process';

// Fixed local command; do not accept a connection URL or remote flags as input.
const command = process.platform === 'win32'
  ? 'node_modules\\.bin\\supabase.cmd status --output json'
  : './node_modules/.bin/supabase status --output json';
let status;
try {
  status = JSON.parse(execSync(command, { encoding:'utf8', stdio:['ignore','pipe','pipe'] }));
} catch {
  console.error('No se pudo consultar Supabase local. Abre Docker Desktop y ejecuta npx.cmd supabase status.');
  process.exit(1);
}
if (status.API_URL !== 'http://127.0.0.1:54321' || !status.SERVICE_ROLE_KEY) {
  console.error('Las pruebas solo admiten la instancia local esperada.');
  process.exit(1);
}
const result = spawnSync(process.execPath, ['supabase/tests/appointments.mjs'], {
  stdio:'inherit', env:{...process.env,CANWASH_TEST_SERVICE_KEY:status.SERVICE_ROLE_KEY},
});
process.exit(result.status ?? 1);
