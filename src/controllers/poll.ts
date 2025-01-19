import { Request, Response } from "express";
import Poll from "../schemas/Poll";
import Vote from "../schemas/Vote";
import PollChannel from "../schemas/PollChannel";
import {
	isProposal,
	extractProposalId,
	countUsersEligible,
	countUsersParticipated,
	countVotes,
	PollProcessor
} from "../helpers/poll-processor";

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
		const votes = await Vote.find({ poll: poll._id }).lean().exec();
		const { forVotes, againstVotes, abstainVotes } = countVotes(votes, poll);

		proposalPollStats.push({
			proposalId,
			usersEligible,
			usersParticipated,
			forVotes,
			againstVotes,
			abstainVotes
		});
	}
	proposalPollStats.sort((poll1, poll2) => {
		return poll1.proposalId - poll2.proposalId;
	});
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

	try {
		const processedPoll = await PollProcessor.processPoll(targetPoll);
		res.json(processedPoll);
	} catch (error) {
		console.error(`encountered an error while processing proposalId ${proposalId}`, error);
		return res.status(500).json({
			statusCode: 500,
			error: `server error, unable to find process results for proposal ${proposalId}`
		})
	}

}
