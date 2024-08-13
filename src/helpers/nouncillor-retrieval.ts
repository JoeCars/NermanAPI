import User, { IUser } from "../schemas/User";
import Poll from "../schemas/Poll";
import PollChannel from "../schemas/PollChannel";

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
