import { generateAuthToken } from "./routes/user";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import jwt from "jsonwebtoken";
import knex from "knex";
import pg from "pg";

dotenv.config();

const db = knex({
	client: "pg",
	connection: {
		host: process.env.POSTGRES_HOST,
		user: process.env.POSTGRES_USER,
		password: process.env.POSTGRES_PASSWORD,
		database: process.env.POSTGRES_DB
	},
	debug: true
});

const app = express();
const port = 4000;
app.use(
	cors({
		exposedHeaders: ["x-auth"]
	})
);

app.use(bodyParser.json());

app.get("/", (req: express.Request, res: express.Response) => {
	res.status(200).send("success!");
});

// USER routes

// login route
app.post("/signin", (req: express.Request, res: express.Response) => {
	let { email, password } = req.body;
	db.select("email", "hash")
		.from("login")
		.where("email", "=", email)
		.then(
			(data): any => {
				const isValid = bcrypt.compare(password, data[0].hash);
				if (isValid) {
					return db
						.transaction((trx) => {
							trx
								.select("*")
								.from("users")
								.where("email", "=", email)
								.then((user) => {
									const token = generateAuthToken(email);
									return trx("users")
										.returning("*")
										.whereNull("token")
										.insert({
											token: token
										})
										.then((user) => {
											res.json(user[0]);
										})
										.then(trx.commit)
										.catch(trx.rollback);
								});
						})

						.catch((err) =>
							res.status(400).json("Unable to retrieve user info")
						);
				} else {
					res.status(400).json("Unable to retrieve user info");
				}
			}
		)
		.catch((err: any) => res.status(400).json("Invalid Credentials"));
});

// register route
app.post("/register", async (req: express.Request, res: express.Response) => {
	const { email, name, password } = req.body;

	const hash = await bcrypt.hash(password, 10);
	db.transaction((trx) => {
		trx
			.insert({
				hash: hash,
				email: email
			})
			.into("login")
			.returning("email")
			.then((loginEmail) => {
				const token = generateAuthToken(email);

				return trx("users")
					.returning("*")
					.insert({
						email: loginEmail[0],
						name: name,
						token: token,
						joined: new Date()
					})
					.then((user) => {
						res.json(user[0]);
					})
					.then(trx.commit)
					.catch(trx.rollback);
			});
	}).catch((err) => res.status(400).send(err));
});

// if user.token === null user is logged out
// logout route
app.post("/logout", (req: express.Request, res: express.Response) => {
	const { email } = req.body;
	db.select("token")
		.from("users")
		.where("email", "=", email)
		.returning("*")
		.update({token: null})
		.then((data) => {
			console.log(data[0])
			res.status(200).send("logged out!");
		})
		.catch((err) => res.status(400).send(err));
});

app.listen(port, () => {
	console.log(`server started at http://localhost:${port}`);
});
