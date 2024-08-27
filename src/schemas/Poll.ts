import { model, Schema, Types, Model, Document, HydratedDocument } from "mongoose";
import PollChannel from "./PollChannel";

export interface IPoll {
	_id: Types.ObjectId;
	guildId: string;
	creatorId: string;
	messageId: string;
	config: Types.ObjectId;
	timeEnd: Date;
	pollData: {
		title: string;
		description: string;
		voteAllowance: number;
		choices: string[];
	};
	abstains: Map<string, boolean>;
	allowedUsers: Map<string, boolean>;
	status: string;
	pollSucceeded: boolean;
	pollNumber: number;
}

export interface PollModel extends Model<IPoll> {
	fetchNouncilPolls: () => Promise<HydratedDocument<IPoll>[]>;
}

const PollSchema = new Schema<IPoll, PollModel>(
	{
		_id: { type: Schema.Types.ObjectId, required: true },
		guildId: { type: Schema.Types.String, required: true },
		creatorId: { type: Schema.Types.String, required: true },
		messageId: { type: Schema.Types.String, required: true },
		config: {
			type: Schema.Types.ObjectId,
			ref: "channelConfig",
			required: true
		},
		timeEnd: {
			type: Schema.Types.Date,
			required: true
		},
		pollData: {
			required: true,
			type: {
				title: { type: Schema.Types.String, required: true },
				description: { type: Schema.Types.String, required: true },
				voteAllowance: { type: Schema.Types.Number, required: true },
				choices: { type: [Schema.Types.String], required: true }
			}
		},
		abstains: {
			type: Schema.Types.Map,
			of: Boolean,
			default: new Map()
		},
		allowedUsers: {
			type: Schema.Types.Map,
			of: Boolean,
			default: new Map()
		},
		status: {
			type: Schema.Types.String,
			default: "closed",
			enum: ["open", "closed", "cancelled", "canceled"]
		},
		pollSucceeded: { type: Schema.Types.Boolean, required: true },
		pollNumber: { type: Schema.Types.Number, required: true }
	},
	{
		statics: {
			async fetchNouncilPolls() {
				const pollChannel = await PollChannel.findOne({ channelId: process.env.NOUNCIL_CHANNEL_ID }).exec();
				if (!pollChannel) {
					throw new Error(`Unable to find a poll channel for id ${process.env.NOUNCIL_CHANNEL_ID}`);
				}
				const polls = await this.find({ config: pollChannel._id }).sort({ timeCreated: 1 }).exec();
				return polls;
			}
		}
	}
);

export default model<IPoll, PollModel>("Poll", PollSchema);
