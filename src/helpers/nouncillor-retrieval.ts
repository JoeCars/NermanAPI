import User, { IUser } from "../schemas/User";
import Poll, { IPoll } from "../schemas/Poll";
import PollChannel from "../schemas/PollChannel";
import { INouncillor } from "../schemas/Nouncillor";

export async function fetchNouncillors() {
	const pollChannel = await PollChannel.findOne({ channelId: process.env.NOUNCIL_CHANNEL_ID }).exec();
	if (!pollChannel) {
		throw new Error(`Unable to find a poll channel for id ${process.env.NOUNCIL_CHANNEL_ID}`);
	}
	const poll = await Poll.findOne({ config: pollChannel._id }).sort({ timeCreated: -1 }).exec();
	if (!poll) {
		throw new Error(`Unable to find most recent poll for id ${process.env.NOUNCIL_CHANNEL_ID}`);
	}
	return [...poll.allowedUsers.keys()];
}

export function extractNouncillorStatistics(user: IUser) {
	const { eligiblePolls: votesEligible, participatedPolls: votesParticipated } = user.eligibleChannels.get(
		process.env.NOUNCIL_CHANNEL_ID!
	)!;
	const participationRate = (votesParticipated / votesEligible) * 100;

	return {
		userId: user.discordId,
		votesEligible,
		votesParticipated,
		participationRate,
		username: user.nameHistory[user.nameHistory.length - 1] ?? ""
	};
}

export async function fetchAllNouncilPolls() {
	const pollChannel = await PollChannel.findOne({ channelId: process.env.NOUNCIL_CHANNEL_ID }).exec();
	if (!pollChannel) {
		throw new Error(`Unable to find a poll channel for id ${process.env.NOUNCIL_CHANNEL_ID}`);
	}
	const polls = await Poll.find({ config: pollChannel._id }).sort({ timeCreated: 1 }).exec();
	return polls;
}

export async function calculateNouncillorParticipation(nouncillor: INouncillor, polls: IPoll[]) {
	const validPolls = polls.filter((poll) => {
		return poll.timeCreated > nouncillor.dateJoined;
	});

	let eligible = 0;
	let participated = 0;

	validPolls.forEach((poll) => {
		if (poll.allowedUsers.has(nouncillor.discordId)) {
			eligible++;
		}
		if (poll.allowedUsers.get(nouncillor.discordId)) {
			participated++;
		}
	});

	return {
		votesEligible: eligible,
		votesParticipated: participated,
		participationRate: (participated / eligible) * 100
	};
}

export async function fetchNouncillorInformation(nouncillor: INouncillor) {
	const user = await User.findOne({ discordId: nouncillor.discordId, guildId: process.env.NOUNCIL_GUILD_ID! }).lean().exec();
	if (!user) {
		throw new Error(`Unable to find user ${nouncillor.discordId}`);
	}
	return {
		userId: user.discordId,
		username: user.nameHistory[user.nameHistory.length - 1] ?? "",
		twitterAddress: nouncillor.twitterAddress ?? "",
		walletAddress: nouncillor.walletAddress ?? ""
	};
}
