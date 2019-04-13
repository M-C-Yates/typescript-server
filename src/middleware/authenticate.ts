import * as User from '../controllers/user';

import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import express = require("express");
import jwt from "jsonwebtoken";
import { QueryResult, Pool } from "pg";

dotenv.config();
const pass = process.env.POSTGRES_PASSWORD;

export const pool = new Pool({
	user: process.env.POSTGRES_USER,
	password: pass,
	host: process.env.POSTGRES_HOST,
	database: process.env.POSTGRES_DB,
	port: 5432
});

