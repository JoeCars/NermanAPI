import express, { NextFunction, Request, Response } from "express";
import mongoose from "mongoose";
import "dotenv/config";

import { router as indexRouter, router } from "./routes/index";

const app = express();

app.use(indexRouter);

app.use(() => {
	console.log("error 404");
});

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
	console.error("received an error", err);
	return res.status(500).json({
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
