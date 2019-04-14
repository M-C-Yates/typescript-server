import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import rateLimit from "express-rate-limit";

import User from "./controllers/user";

const app = express();
const port = 4000;

//for nginx reverse proxy
// app.enable("trust proxy");

const limiter = new rateLimit({
	windowMs: 10 * 60 * 1000,
	max: 100
});

app.use(
	cors({
		exposedHeaders: ["x-auth"]
	})
);
app.use(bodyParser.json());
app.use('/users/', limiter);

// API ROUTES

app.get("/", (req: express.Request, res: express.Response) => {
	res.status(200).send("success!");
});

// USER routes
// Create a user
app.post("/users/register", User.registerUser);

// Sign in and generate a auth token
app.post("/users/signin", User.signInUser);
// sign out user
app.post("/users/signout", User.signOutUser);


app.listen(port, () => {
	console.log(`server started at http://localhost:${port}`);
});
