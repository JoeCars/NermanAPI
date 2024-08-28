import { Request, Response } from "express";
import User from "../schemas/User";
import Poll, { IPoll } from "../schemas/Poll";
import Vote from "../schemas/Vote";
import PollChannel, { IPollChannel } from "../schemas/PollChannel";

// TODO: Move these two functions to Poll schema.
function isProposal(poll: IPoll) {
	const startWithPropAndNumberRegex = new RegExp(/^Prop [0-9]+.*/g);
	const matches = poll.pollData.title.match(startWithPropAndNumberRegex);
	if (!matches || matches.length === 0) {
		return false;
	} else {
		return true;
	}
}

function extractProposalId(poll: IPoll) {
	const title = poll.pollData.title;
	const splitTitle = title.split(" ");
	// [0] is "Prop"
	// [1] is the proposal number.
	const unprocessedProposalId = splitTitle[1];
	if (!unprocessedProposalId) {
		return null;
	}

	// Processing is required because of the ":" attached to the number.
	const numberRegex = new RegExp(/[0-9]+/g);
	const numberMatches = unprocessedProposalId.match(numberRegex);
	let processedProposalId: number | null = null;
	if (numberMatches) {
		processedProposalId = Number(numberMatches[0]);
	}

	return processedProposalId;
}

function countUsersEligible(poll: IPoll) {
	const allowedUsers = poll.allowedUsers;
	return allowedUsers.size;
}

function countUsersParticipated(poll: IPoll) {
	const allowedUsers = poll.allowedUsers;
	let participationCount = 0;
	for (const hasParticipated of allowedUsers.values()) {
		if (hasParticipated) {
			participationCount++;
		}
	}
	return participationCount;
}

function countAbstainVotes(poll: IPoll) {
	const abstains = poll.abstains;
	let abstainCount = 0;
	for (const hasAbstained of abstains.values()) {
		if (hasAbstained) {
			abstainCount++;
		}
	}
	return abstainCount;
}

async function countVotes(poll: IPoll) {
	const votes = await Vote.find({ poll: poll._id }).lean().exec();
	const choiceCounts = new Map<string, number>();
	for (const vote of votes) {
		for (const choice of vote.choices) {
			const choiceCount = choiceCounts.get(choice);
			if (choiceCount) {
				choiceCounts.set(choice, choiceCount + 1);
			} else {
				choiceCounts.set(choice, 1);
			}
		}
	}

	return {
		forVotes: choiceCounts.get("for") ?? 0,
		againstVotes: choiceCounts.get("against") ?? 0
	};
}

function calculateQuorum(poll: IPoll, pollChannel: IPollChannel) {
	const quorum = Math.ceil(poll.allowedUsers.size * (pollChannel.quorum / 100));
	return quorum;
}

function calculateVoteThreshold(poll: IPoll, pollChannel: IPollChannel) {
	const voteThreshold = Math.ceil(poll.allowedUsers.size * (pollChannel.voteThreshold / 100));
	return voteThreshold;
}

function determinePollOutcome(
	poll: IPoll,
	pollChannel: IPollChannel,
	forVotes: number,
	againstVotes: number,
	abstainVotes: number
) {
	const hasPassedQuorum = forVotes + againstVotes + abstainVotes >= calculateQuorum(poll, pollChannel);
	const hasPassedVoteThreshold = Math.max(forVotes, againstVotes) > calculateVoteThreshold(poll, pollChannel);

	const failedRequirements: string[] = [];
	if (!hasPassedQuorum) {
		failedRequirements.push("quorum");
	}
	if (!hasPassedVoteThreshold) {
		failedRequirements.push("vote threshold");
	}
	if (failedRequirements.length > 0) {
		return `poll failed to meet ${failedRequirements.join(" and ")}.`;
	}

	if (forVotes === againstVotes) {
		return `poll tied`;
	}

	if (forVotes > againstVotes) {
		return "for won";
	} else {
		return "against won";
	}
}

export async function getPolls(req: Request, res: Response) {
	const nouncilPollChannel = await PollChannel.findOne({ channelId: process.env.NOUNCIL_CHANNEL_ID }).lean().exec();
	if (!nouncilPollChannel) {
		throw new Error("unable to find nouncil poll channel");
	}

	const nouncilPolls = await Poll.fetchNouncilPolls();
	const nouncilProposalPolls = nouncilPolls.filter((poll) => isProposal(poll));

	const proposalPollStats = [];
	for (const poll of nouncilProposalPolls) {
		const proposalId = extractProposalId(poll);
		const usersEligible = countUsersEligible(poll);
		const usersParticipated = countUsersParticipated(poll);
		const { forVotes, againstVotes } = await countVotes(poll);
		const abstainVotes = countAbstainVotes(poll);

		proposalPollStats.push({
			proposalId,
			usersEligible,
			usersParticipated,
			forVotes,
			againstVotes,
			abstainVotes
		});
	}
	res.json(proposalPollStats);
}

export async function getPollWithProposalId(req: Request, res: Response) {
	const proposalId = Number(req.params.proposalId);

	const nouncilPolls = await Poll.fetchNouncilPolls();
	const targetPoll = nouncilPolls.filter((poll) => {
		return isProposal(poll) && extractProposalId(poll) === proposalId;
	})[0];
	if (!targetPoll) {
		return res.status(404).json({
			statusCode: 404,
			error: `unable to find poll for proposal ${proposalId}`
		});
	}

	const voters = [];
	for (const [discordId, hasParticipated] of targetPoll.allowedUsers.entries()) {
		if (hasParticipated) {
			const user = await User.findOne({ discordId, guildId: process.env.NOUNCIL_GUILD_ID }).lean().exec();
			const username = user ? user.nameHistory[user.nameHistory.length - 1] : "";
			voters.push({
				discordId,
				username
			});
		}
	}

	res.json(voters);
}
