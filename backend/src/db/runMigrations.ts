import { umzug } from "./migrator.js";
import { sequelize } from "./sequelize.js";

async function run() {
  await sequelize.authenticate();
  await umzug.up();
  await sequelize.close();
}

run().catch((err) => {
  process.stderr.write(`${err instanceof Error ? err.stack ?? err.message : String(err)}\n`);
  process.exit(1);
});

