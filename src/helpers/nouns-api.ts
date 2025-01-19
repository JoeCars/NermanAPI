import fetch from "node-fetch";

const API_ADDRESS = "https://nouns-indexer-live-9834f536b6ce.herokuapp.com/";

interface Feedback {
	feedbacker: string;
	support: string;
	reason: string;
	blockNumber: string;
}
interface Vote {
	votes: number;
	reason: string;
	voter: string;
	blockNumber: string;
	support: string;
}
export interface PreviousStatus {
	eventName: string;
	blockNumber: string;
	eta?: string;
}
interface UpdateMessage {
	updateMessage: string;
	blockNumber: string;
}
interface ProposalForkBlame {
	forkId: number;
	reason: string;
	blockNumber: string;
	forker: string;
	eventName: string;
}

export interface Proposal {
	proposalId: number;
	proposer: string;
	signers: string[];
	transactions: {
		targets: string[];
		values: string[];
		signatures: string[];
		calldatas: string[];
	};
	startBlock: number;
	endBlock: number;
	updatePeriodEndBlock: number;
	proposalThreshold: number;
	quorumVotes: number;
	description: string;
	feedback: Feedback[];
	votes: Vote[];
	status: {
		wasCreatedOnTimelock: boolean;
		hadObjectionPeriod: boolean;
		previousStatuses: PreviousStatus[];
		currentStatus: string;
		wasUpdated: boolean;
		updateMessages: UpdateMessage[];
	};
	fork: {
		blamedIn: ProposalForkBlame[];
	};
	clientId: number;
}

export async function getProposal(proposalId: number) {
	const res = await fetch(API_ADDRESS + "proposal/" + proposalId);
	if (!res.ok) {
		throw new Error(`Unable to fetch proposals. ${res.status} ${res.statusText}`);
	}
	const proposal: Proposal = await res.json();
	return proposal;
}
