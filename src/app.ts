import express from "express";
import "dotenv/config";
import mongoose from "mongoose";
import User from "./schemas/User";

const app = express();

app.get("/", () => {
	console.log("hello world");
});

app.get("/:discordId", async (req, res) => {
	const discordId = req.params.discordId;
	const user = await User.findOne({ discordId: discordId }).exec();

	if (!user) {
		return res.status(500).json({
			message: "no user found."
		});
	}

	const {
		eligiblePolls: votesEligible,
		participatedPolls: votesParticipated
	}: { eligiblePolls: number; participatedPolls: number } = user.eligibleChannels.get(process.env.NOUNCIL_CHANNEL_ID!);

	const participationRate = (votesParticipated / votesEligible) * 100;

	const userStats = {
		userId: discordId,
		votesEligible,
		votesParticipated,
		participationRate
	};

	res.status(200).json(userStats);
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
