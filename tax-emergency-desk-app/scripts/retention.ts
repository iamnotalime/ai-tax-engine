import { sql } from '../src/lib/db';
import { runRetentionSweep } from '../src/server/privacy/retention';

async function main() {
  const result = await runRetentionSweep();
  console.log(JSON.stringify(result));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sql.end();
  });
