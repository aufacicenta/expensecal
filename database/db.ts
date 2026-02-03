import { Sequelize, Options } from "sequelize";
import configs from "./config/index.js";
import pg from "pg";

const env = process.env.NEXT_PUBLIC_VERCEL_ENV || "development";
const config = (configs as { [key: string]: Options })[env];
const debug = process.env.DEBUG === "true";

const db: Sequelize = new Sequelize({
  ...config,
  dialectModule: pg,
  define: {
    underscored: true,
  },
  logging: debug ? console.log : false,
});

export default db;
