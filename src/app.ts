import express from "express";
import "dotenv/config";

const app = express();

app.get("/", () => {
	console.log("hello world");
});

app.use(() => {
	console.log("error 404");
});

app.listen(process.env.PORT, () => {
	console.log(`app running on port ${process.env.PORT}`);
});
