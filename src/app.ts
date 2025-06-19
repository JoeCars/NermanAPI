import express, { NextFunction, Request, Response } from "express";
import mongoose from "mongoose";
import "dotenv/config";
import cors from "cors";

import { router as indexRouter } from "./routes/index";
import { router as pollRouter } from "./routes/poll";
import { router as nounsRouter } from "./routes/nouns";

const app = express();

app.use(cors());

app.use("/nouns", nounsRouter);
app.use("/poll", pollRouter);
app.use("/", indexRouter);

app.use((req: Request, res: Response) => {
	res.status(404).json({
		statusCode: 404,
		error: "page does not exist"
	});
});

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
	console.error("received an error", err);
	return res.status(500).json({
		statusCode: 500,
		error: new Error("Server error.")
	});
});

app.listen(process.env.PORT, () => {
	console.log(`app running on port ${process.env.PORT}`);
	mongoose
		.connect(process.env.MONGODB_URL!)
		.then(async () => {
			console.log("connected to mongoose");
		})
		.catch((error: any) => {
			console.error("failed to connect to mongoose", error);
		});
});
