import express from "express";
import mongoose from "mongoose";
import "dotenv/config";

import User from "./schemas/User";
import { fetchNouncillors, extractNouncillorStatistics } from "./helpers/nouncillor-retrieval";

const app = express();

app.get("/:discordId", async (req, res) => {
	const discordId = req.params.discordId;

	const nouncillors = await fetchNouncillors();
	const isNouncillor = nouncillors.includes(discordId);
	if (!isNouncillor) {
		return res.status(500).json({
			message: "no user found."
		});
	}

	const user = await User.findOne({ discordId: discordId, guildId: process.env.NOUNCIL_GUILD_ID }).exec();

	if (!user) {
		return res.status(500).json({
			message: "no user found."
		});
	}

	const votingStats = user.eligibleChannels.get(process.env.NOUNCIL_CHANNEL_ID!);

	if (!votingStats) {
		return res.status(500).json({
			message: "no user found."
		});
	}

	const userStats = extractNouncillorStatistics(user);
	
	res.status(200).json(userStats);
});

app.get("/", async (req, res) => {
	const users = await User.find({ guildId: process.env.NOUNCIL_GUILD_ID }).exec();

	if (!users) {
		return res.status(500).json({
			message: "no users found."
		});
	}

	const nouncillors = await fetchNouncillors();

	const usersStats = users
		.filter((user) => {
			const canVote = user.eligibleChannels.get(process.env.NOUNCIL_CHANNEL_ID!);
			const isNouncillor = nouncillors.includes(user.discordId);
			return canVote && isNouncillor;
		})
		.map((user) => {
			return extractNouncillorStatistics(user);
		})
		.sort((userA, userB) => {
			// Sorting from highest to lowest participation rate.
			return userB.participationRate - userA.participationRate;
		});

	res.status(200).json(usersStats);
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
