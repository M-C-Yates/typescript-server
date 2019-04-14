import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import express = require("express");
import jwt from "jsonwebtoken";
import { QueryResult, Pool } from "pg";
import { promises } from "fs";

dotenv.config();
const pass = process.env.POSTGRES_PASSWORD;

export const pool = new Pool({
	user: process.env.POSTGRES_USER,
	password: pass,
	// password: "docker",
	host: process.env.POSTGRES_HOST,
	database: process.env.POSTGRES_DB,
	port: 5432
});

export class User {
	// generates a json web token to be used for authentication
	static generateAuthToken = (email: string) => {
		const access = "auth";
		const token = jwt.sign({ id: email }, "wooasasdzxc").toString();

		return token;
	};

	static findByToken = async (token: string) => {
		let decoded;
		try {
			decoded = jwt.verify(token, "wooasasdzxc");
		} catch (e) {
			return Promise.reject();
		}
		try {
			const res = await pool.query("SELECT id FROM users WHERE token= $1", [token])
			return res.rows[0].id;
		} catch (e) {
			throw e
		}

	};

	// Generate a user and stores their name, email,
	// hashed password, genned auth token and current timestamp
	static registerUser = async (req: express.Request, res: express.Response) => {
		const { name, email, password } = req.body;
		const joined = new Date();
		const hash = await bcrypt.hash(password, 10);
		const token = await User.generateAuthToken(email);
		(async () => {
			const client = await pool.connect();
			try {
				await client.query("BEGIN");
				const registered = await client.query(
					"INSERT INTO users (name, email, hash, token, joined) VALUES ($1,$2,$3,$4,$5)",
					[name, email, hash, token, joined]
				);
				const results = await client.query(
					"SELECT * FROM users WHERE token= $1",
					[token]
				);
				let rows = results.rows;
				await client.query("COMMIT");
				res
					.status(200)
					.header("x-auth", token)
					.send(`Succes!`);
			} catch (e) {
				await client.query("ROLLBACK");
				throw e;
			} finally {
				client.release();
			}
		})().catch((e) => console.error(e.stack));
	};
	// log user in
	static signInUser = async (req: express.Request, res: express.Response) => {
		const { email, password } = req.body;

		const token = await User.generateAuthToken(email);

		//SELECT email, hash FROM users where email=emailAddr
		(async () => {
			const client = await pool.connect();
			try {
				client.query("BEGIN");
				let { rows } = await client.query(
					"SELECT * FROM users WHERE email= $1",
					[email]
				);

				const isValid = await bcrypt.compare(password, rows[0].hash);
				if (isValid) {
					client.query("UPDATE users SET token= $1 WHERE email= $2", [
						token,
						email
					]);
					res
						.status(200)
						.header("x-auth", token)
						.send(rows[0]);
				} else {
					res.status(400).send("unable to login");
				}

				await client.query("COMMIT");
			} catch (e) {
				await client.query("ROLLBACK");
				throw e;
			} finally {
				client.release();
			}
		})().catch((e) => console.log(e.stack));
	};

	// sign user out
	static signOutUser = async (req: express.Request, res: express.Response) => {
		const { email } = req.body;
		// find user by token and remove token
		pool.query(
			"UPDATE users SET token= null WHERE email= $1",
			[email],
			(error: Error, results: QueryResult) => {
				if (error) {
					throw error;
				}
				res.status(200).send("Logged out!");
			}
		);
	};
}

export const authenticate = async (req: any, res: any, next: any) => {
	const token = req.header('x-auth');
	let user = await User.findByToken(token);
	if (user == null) {
		return Promise.reject();
	}
		req.user = user;
		req.token = token
		next()
};

export default User;
