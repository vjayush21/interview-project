import { env } from "../config/env.js";
import { sequelize } from "../db/sequelize.js";
import "../db/models/index.js";
import { umzug } from "../db/migrator.js";

export async function initDb() {
  await sequelize.authenticate();
  if (env.MIGRATE_ON_START) {
    await umzug.up();
  }
}

