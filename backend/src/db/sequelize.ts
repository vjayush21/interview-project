import { Sequelize } from "sequelize";
import { env } from "../config/env.js";

export const sequelize = new Sequelize(env.MYSQL_DATABASE, env.MYSQL_USER, env.MYSQL_PASSWORD, {
  host: env.MYSQL_HOST,
  port: env.MYSQL_PORT,
  dialect: "mysql",
  logging: false
});

