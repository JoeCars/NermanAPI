import express from "express";
import "dotenv/config";
import mongoose from "mongoose";

const app = express();

app.get("/", () => {
	console.log("hello world");
});

app.use(() => {
	console.log("error 404");
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
