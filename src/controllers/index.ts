import { Request, Response } from "express";
import User from "../schemas/User";
import { extractNouncillorStatistics, fetchNouncillors } from "../helpers/nouncillor-retrieval";

export async function getNouncillors(req: Request, res: Response) {
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
}

export async function getNouncillorByDiscordId(req: Request, res: Response) {
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
}
