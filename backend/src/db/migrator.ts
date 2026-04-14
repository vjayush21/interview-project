import { Umzug, SequelizeStorage } from "umzug";
import { sequelize } from "./sequelize.js";

export const umzug = new Umzug({
  migrations: {
    glob: ["migrations/*.ts", { cwd: new URL(".", import.meta.url).pathname }]
  },
  context: sequelize.getQueryInterface(),
  storage: new SequelizeStorage({ sequelize }),
  logger: undefined
});

