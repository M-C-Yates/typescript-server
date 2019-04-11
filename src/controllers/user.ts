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

	// Generate a user and stores their name, email,
	// hashed password, genned auth token and current timestamp
	static registerUser = async (req: express.Request, res: express.Response) => {
		const { name, email, password } = req.body;
		const joined = new Date();
		const hash = await bcrypt.hash(password, 10);
		const token = await User.generateAuthToken(email);

		pool.query(
			// create a row and insert the users info
			"INSERT INTO users (name, email, hash, token, joined) VALUES ($1,$2,$3,$4,$5)",
			[name, email, hash, token, joined],
			(error: Error, results: QueryResult) => {
				if (error) {
					throw error;
				}
				// console.log(results)
				res.header("x-auth", token).send(results.rows[0])
				res.status(200).send(results);
			}
		);
	};
	// log user in
	static signInUser = async (req: express.Request, res: express.Response) => {
		const { email, password } = req.body;

		const token = await User.generateAuthToken(email);

		//SELECT email, hash FROM users where email=emailAddr
		pool.query(
			"SELECT email, hash, token FROM users WHERE email= $1",
			[email],
			(error: Error, results: QueryResult) => {
				// console.log(results.rows);
				let row = results.rows[0];
				const isValid = bcrypt.compare(password, row.hash);
				if (isValid) {
					pool.query(
						"SELECT * FROM users WHERE email= $1 ",
						[email],
						(error: Error, results: QueryResult) => {
							pool.query("UPDATE users SET token= $2 WHERE email= $1",
							[email, token],
							(error: Error, results: QueryResult) => {
								res.header("x-auth", token).send(results);
							})
						}
					);
				}
			}
		);
	};

	// sign user out
	static signOutUser = async (req: express.Request, res: express.Response) => {
		const { email } = req.body;
		// find user by token and remove token
		console.log(email);
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

export default User;
