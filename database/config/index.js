/* eslint-disable no-undef */
module.exports = {
  development: {
    dialect: "postgres",
    database: process.env.PGDATABASE || "promptwars_xyz",
    username: process.env.PGUSER || "postgres",
    password: process.env.PGPASSWORD || "postgres",
    host: process.env.PGHOST || "localhost",
    port: parseInt(process.env.PGPORT || "5432"),
  },
  test: {
    dialect: "postgres",
    database: process.env.PGDATABASE || "promptwars_xyz",
    username: process.env.PGUSER || "postgres",
    password: process.env.PGPASSWORD || "postgres",
    host: process.env.PGHOST || "localhost",
    port: parseInt(process.env.PGPORT || "5432"),
  },
  preview: {
    dialect: "postgres",
    database: process.env.PGDATABASE || "promptwars_xyz",
    username: process.env.PGUSER || "postgres",
    password: process.env.PGPASSWORD || "postgres",
    host: process.env.PGHOST || "localhost",
    port: parseInt(process.env.PGPORT || "5432"),
  },
  production: {
    dialect: "postgres",
    logging: false,
    database: process.env.PGDATABASE,
    username: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    host: process.env.PGHOST,
    port: parseInt(process.env.PGPORT || "5432"),
  },
};
