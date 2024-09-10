import { Request, Response } from "express";
import { calculateNouncillorParticipation, fetchNouncillorInformation } from "../helpers/nouncillor-retrieval";
import Nouncillor from "../schemas/Nouncillor";

export async function getNouncillors(req: Request, res: Response) {
	const nouncillors = await Nouncillor.find({ dateJoined: { $ne: null } })
		.lean()
		.exec();

	const stats = [];
	for (const nouncillor of nouncillors) {
		const participation = await calculateNouncillorParticipation(nouncillor);
		const nouncillorInformation = await fetchNouncillorInformation(nouncillor);
		stats.push({
			...participation,
			...nouncillorInformation
		});
	}

	stats.sort((userA, userB) => {
		// Sorting from highest to lowest participation rate.
		return userB.participationRate - userA.participationRate;
	});

	res.status(200).json(stats);
}

export async function getNouncillorByDiscordId(req: Request, res: Response) {
	const discordId = req.params.discordId;

	const nouncillor = await Nouncillor.findOne({ discordId: discordId, dateJoined: { $ne: null } })
		.lean()
		.exec();
	if (!nouncillor) {
		return res.status(404).json({
			message: `no nouncillor with discord id ${discordId} exists`
		});
	}

	const participation = await calculateNouncillorParticipation(nouncillor);
	const nouncillorInformation = await fetchNouncillorInformation(nouncillor);
	const stats = {
		...participation,
		...nouncillorInformation
	};

	res.status(200).json(stats);
}
