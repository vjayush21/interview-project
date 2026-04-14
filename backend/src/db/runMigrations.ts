import { umzug } from "./migrator";
import { sequelize } from "./sequelize";

async function run() {
  await sequelize.authenticate();
  await umzug.up();
  await sequelize.close();
}

run().catch((err) => {
  process.stderr.write(`${err instanceof Error ? err.stack ?? err.message : String(err)}\n`);
  process.exit(1);
});

