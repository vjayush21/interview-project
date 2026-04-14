import { env } from "../config/env";
import { sequelize } from "../db/sequelize";
import "../db/models";
import { umzug } from "../db/migrator";

export async function initDb() {
  await sequelize.authenticate();
  if (env.MIGRATE_ON_START) {
    await umzug.up();
  }
}

