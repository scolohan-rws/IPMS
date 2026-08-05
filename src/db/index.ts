import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { Signer } from "@aws-sdk/rds-signer";
import * as schema from "./schema/index.js";
import {
  DEFAULT_AWS_REGION,
  POSTGRES_PORT,
} from "../constants/app.constants.js";

const HOST = process.env.DB_HOST as string;
const USER = process.env.DB_USER ?? "postgres";

const signer = new Signer({
  region: DEFAULT_AWS_REGION,
  hostname: HOST,
  port: POSTGRES_PORT,
  username: USER,
});

const pool = new Pool({
  host: HOST,
  port: POSTGRES_PORT,
  database: process.env.DB_NAME ?? "postgres",
  user: USER,
  ssl: {
    rejectUnauthorized: false,
  },
  password: () => signer.getAuthToken(),
  max: 1,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

export const db = drizzle(pool, { schema });
