import { createApp } from "./app";
import { env } from "./config/env";
import { initDb } from "./startup/initDb";

async function main() {
  await initDb();
  const app = createApp();
  app.listen(env.PORT, () => {
    process.stdout.write(`API listening on http://localhost:${env.PORT}\n`);
  });
}

main().catch((err) => {
  process.stderr.write(`${err instanceof Error ? err.stack ?? err.message : String(err)}\n`);
  process.exit(1);
});

