import { IPoll } from "../schemas/Poll";
import PollChannel, { IPollChannel } from "../schemas/PollChannel";
import User from "../schemas/User";
import Vote, { IVote } from "../schemas/Vote";
import { getProposal } from "./nouns-api";

interface PublicVoteFeed {
	discordId: string | null;
	username: string | null;
	vote: string;
	reason: string;
	time?: number; // This data isn't available in the db.
}

interface VoteParticipation {
	discordId: string;
	username: string;
}

interface ProcessedPoll {
	title: string;
	description: string;
	timeStart: number;
	timeEnd: number;
	status: string;
	referenceData: {
		nounsPropId: string;
		nounsPropStart: number;
		nounsPropEnd: number;
	};
	publicVoteFeed: PublicVoteFeed[];
	voteResult: {
		counts: {
			for: number;
			against: number;
			abstain: number;
		};
		outcome: {
			winner: string | null;
			description: string | null;
		};
	};
	voteParticipation?: VoteParticipation[]; // Only defined when poll is closed.
	voteReasonsFormatted?: string; // Only defined when poll is closed.
}

interface VoteWithUsername extends IVote {
	username: string;
}

interface VoteCount {
	forVotes: number;
	againstVotes: number;
	abstainVotes: number;
}

async function _processPublicVoteFeed(poll: IPoll, pollChannel: IPollChannel): Promise<PublicVoteFeed[]> {
	const voteFeed: PublicVoteFeed[] = [];
	for (let [discordId, hasParticipated] of poll.allowedUsers.entries()) {
		if (!hasParticipated) {
			continue;
		}
		if (poll.abstains.get(discordId)) {
			continue;
		}

		let username = null;
		let discordIdToDisplay = null;
		if (!pollChannel.anonymous) {
			const user = await User.findOne({ discordId, guildId: process.env.NOUNCIL_GUILD_ID }).lean().exec();
			username = user ? user.nameHistory[user.nameHistory.length - 1] : "";
			discordIdToDisplay = discordId;
		}
		const vote = await Vote.findOne({ poll: poll._id, user: discordId }).lean().exec();
		if (!vote) {
			console.error(`Unable to find vote for ${discordId} for poll ${poll._id}.`);
			throw new Error("Unable to find vote information.");
		}
		let choice = vote.choices[0].toLowerCase();
		switch (choice) {
			case "for":
			case "yes":
				choice = "for";
				break;
			case "against":
			case "no":
				choice = "against";
				break;
			case "abstain":
				continue;

			default:
				console.error(`${choice} is an unexpected voting option.`);
				throw new Error("Encountered unexpected voting results.");
		}

		// Only push votes with reasons.
		if (vote.reason.trim().length > 0) {
			voteFeed.push({
				discordId: discordIdToDisplay,
				username: username,
				vote: choice,
				reason: vote.reason
			});
		}
	}

	return voteFeed;
}

export class PollProcessor {
	static async processPoll(poll: IPoll): Promise<ProcessedPoll> {
		const proposalId = extractProposalId(poll);
		const proposal = await getProposal(proposalId);
		const pollConfig = await PollChannel.findOne({ _id: poll.config }).lean().exec();
		if (!pollConfig) {
			console.error(`Unable to find poll config related to poll._id ${poll._id}.`);
			throw new Error("Unable to find associated poll config.");
		}
		const votes = await Vote.find({ poll: poll._id }).lean().exec();
		const publicVoteFeed = await _processPublicVoteFeed(poll, pollConfig);
		const voteCount = countVotes(votes, poll);
		const pollOutcome = _determinePollOutcome(poll, pollConfig, voteCount);
		let voteParticipation;
		let voteReasonsFormatted;
		if (Date.now() > poll.timeEnd.getTime()) {
			voteParticipation = await _fetchVoteParticipation(poll);
			voteReasonsFormatted = await _formatVoteReasons(poll, pollConfig, votes, pollOutcome);
		}

		const processedPoll: ProcessedPoll = {
			title: poll.pollData.title,
			description: poll.pollData.description,
			timeStart: poll.timeCreated.getTime(),
			timeEnd: poll.timeEnd.getTime(),
			status: poll.status,
			referenceData: {
				nounsPropId: proposalId.toString(),
				nounsPropStart: Number(proposal.startBlock), // Check with Joel to see if this should be unix time.
				nounsPropEnd: Number(proposal.endBlock) // Check with Joel to see if this should be unix time.
			},
			publicVoteFeed: publicVoteFeed,
			voteResult: {
				counts: {
					for: voteCount.forVotes,
					against: voteCount.againstVotes,
					abstain: voteCount.abstainVotes
				},
				outcome: pollOutcome
			},
			voteParticipation,
			voteReasonsFormatted
		};
		return processedPoll;
	}
}

async function _fetchVoteParticipation(poll: IPoll): Promise<VoteParticipation[]> {
	const voteParticipation: VoteParticipation[] = [];
	for (const [discordId, hasParticipated] of poll.allowedUsers.entries()) {
		if (hasParticipated) {
			const user = await User.findOne({ discordId, guildId: process.env.NOUNCIL_GUILD_ID }).lean().exec();
			const username = user ? user.nameHistory[user.nameHistory.length - 1] : "";
			voteParticipation.push({
				discordId,
				username
			});
		}
	}
	return voteParticipation;
}

async function _formatVoteReasons(poll: IPoll, pollConfig: IPollChannel, votes: IVote[], pollOutcome: PollOutcome) {
	const votesWithUsername: VoteWithUsername[] = [];
	for (const vote of votes) {
		if (pollConfig.anonymous) {
			votesWithUsername.push({ username: "anonymous", ...vote });
		} else {
			const user = await User.findOne({ discordId: vote.user, guildId: process.env.NOUNCIL_GUILD_ID }).lean().exec();
			const username = user ? user.nameHistory[user.nameHistory.length - 1] : "";
			votesWithUsername.push({ username: username, ...vote });
		}
	}

	const title = poll.pollData.title;
	const status = poll.status;
	const outcome = pollOutcome.description;
	const votesForChoice = _combineVotes(votesWithUsername) as Map<string, VoteWithUsername[]>;

	let output = `${title}\n`;

	output += `\nThe poll is ${status}.\n`;

	output += `\n${outcome}\n`;

	votesForChoice.forEach((votes, choice) => {
		output += `\n**${choice.toUpperCase()} - ${votes.length} VOTES**\n`;
		for (const vote of votes) {
			const hasNoReason = vote.reason.trim() === "";
			if (hasNoReason) {
				continue;
			}

			output += `\n**${vote.username}** | *"${vote.reason}"*\n`;
		}
	});

	output += `\n**ABSTAINS - ${pollOutcome.abstainVotes} VOTES**`;

	return output;
}

export function isProposal(poll: IPoll) {
	// Prop is used by all the automatically created ones.
	// Proposal is used by the manual ones before prop 80.
	const startWithPropAndNumberRegex = new RegExp(/^((Prop)|(Proposal)) [0-9]+.*/g);
	const matches = poll.pollData.title.match(startWithPropAndNumberRegex);
	if (!matches || matches.length === 0) {
		return false;
	} else {
		return true;
	}
}

export function extractProposalId(poll: IPoll) {
	const title = poll.pollData.title;
	const splitTitle = title.split(" ");
	// [0] is "Prop"
	// [1] is the proposal number.
	const unprocessedProposalId = splitTitle[1];
	if (!unprocessedProposalId) {
		throw new Error(`unable to find poll number for "${title}"`);
	}

	// Processing is required because of the ":" attached to the number.
	const numberRegex = new RegExp(/[0-9]+/g);
	const numberMatches = unprocessedProposalId.match(numberRegex);
	if (!numberMatches || !numberMatches[0]) {
		throw new Error(`unable to find poll number for "${title}"`);
	}
	return Number(numberMatches[0]);
}

export function countUsersEligible(poll: IPoll) {
	const allowedUsers = poll.allowedUsers;
	return allowedUsers.size;
}

export function countUsersParticipated(poll: IPoll) {
	const allowedUsers = poll.allowedUsers;
	let participationCount = 0;
	for (const hasParticipated of allowedUsers.values()) {
		if (hasParticipated) {
			participationCount++;
		}
	}
	return participationCount;
}

function _countAbstainVotes(poll: IPoll) {
	const abstains = poll.abstains;
	let abstainCount = 0;
	for (const hasAbstained of abstains.values()) {
		if (hasAbstained) {
			abstainCount++;
		}
	}
	return abstainCount;
}

function _combineVotes(votes: IVote[] | VoteWithUsername[]) {
	const votesByChoice = new Map<string, IVote[] | VoteWithUsername[]>();
	for (const vote of votes) {
		for (let choice of vote.choices) {
			choice = choice.toLowerCase(); // to standardize the responses
			const votesForGivenChoice = votesByChoice.get(choice);
			if (votesForGivenChoice) {
				votesForGivenChoice.push({
					username: (vote as VoteWithUsername).username ?? undefined,
					...vote
				});
				votesByChoice.set(choice, votesForGivenChoice);
			} else {
				votesByChoice.set(choice, [
					{
						username: (vote as VoteWithUsername).username ?? undefined,
						...vote
					}
				]);
			}
		}
	}
	return votesByChoice;
}

export function countVotes(votes: IVote[], poll: IPoll): VoteCount {
	const votesByChoice = _combineVotes(votes);

	let forVotes = votesByChoice.get("for")?.length ?? 0;
	forVotes += votesByChoice.get("yes")?.length ?? 0; // Used by manual ones before prop 80.
	let againstVotes = votesByChoice.get("against")?.length ?? 0;
	againstVotes += votesByChoice.get("no")?.length ?? 0; // Used by manual ones before prop 80.
	const oldAbstainVotes = votesByChoice.get("abstain")?.length ?? 0; // Used by manual ones before prop 80.
	const abstainVotes = _countAbstainVotes(poll);

	return {
		forVotes,
		againstVotes,
		abstainVotes: oldAbstainVotes + abstainVotes
	};
}

function _calculateQuorum(poll: IPoll, pollChannel: IPollChannel) {
	const quorum = Math.ceil(poll.allowedUsers.size * (pollChannel.quorum / 100));
	return quorum;
}

function _calculateVoteThreshold(poll: IPoll, pollChannel: IPollChannel) {
	const voteThreshold = Math.ceil(poll.allowedUsers.size * (pollChannel.voteThreshold / 100));
	return voteThreshold;
}

interface PollOutcome {
	winner: string | null;
	description: string | null;
	forVotes: number;
	againstVotes: number;
	abstainVotes: number;
}

function _determinePollOutcome(
	poll: IPoll,
	pollChannel: IPollChannel,
	{ forVotes, againstVotes, abstainVotes }: VoteCount
): PollOutcome {
	const hasPassedQuorum = forVotes + againstVotes + abstainVotes >= _calculateQuorum(poll, pollChannel);
	const hasPassedVoteThreshold = Math.max(forVotes, againstVotes) > _calculateVoteThreshold(poll, pollChannel);

	if (poll.status !== "closed") {
		return {
			winner: null,
			description: null,
			forVotes,
			againstVotes,
			abstainVotes
		};
	}

	const failedRequirements: string[] = [];
	if (!hasPassedQuorum) {
		failedRequirements.push("quorum");
	}
	if (!hasPassedVoteThreshold) {
		failedRequirements.push("vote threshold");
	}
	if (failedRequirements.length > 0) {
		return {
			winner: null,
			description: `poll failed to meet ${failedRequirements.join(" and ")}.`,
			forVotes,
			againstVotes,
			abstainVotes
		};
	}

	if (forVotes === againstVotes) {
		return {
			winner: null,
			description: "poll tied",
			forVotes,
			againstVotes,
			abstainVotes
		};
	}

	if (forVotes > againstVotes) {
		return {
			winner: "for",
			description: "for won",
			forVotes,
			againstVotes,
			abstainVotes
		};
	}

	return {
		winner: "against",
		description: "against won",
		forVotes,
		againstVotes,
		abstainVotes
	};
}
