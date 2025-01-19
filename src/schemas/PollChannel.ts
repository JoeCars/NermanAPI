import { model, Schema, Types } from "mongoose";

export interface IPollChannel {
	_id: Types.ObjectId;
	guildConfig: Types.ObjectId;
	channelId: string;
	allowedRoles: string[];
	duration: number;
	maxUserProposal: number;
	anonymous: boolean;
	liveVisualFeed: boolean;
	voteAllowance: boolean;
	forAgainst: boolean;
	quorum: number;
	voteThreshold: number;
}

const PollChannelSchema = new Schema<IPollChannel>({
	_id: { type: Schema.Types.ObjectId, required: true },
	guildConfig: {
		type: Schema.Types.ObjectId,
		required: true
	},
	channelId: {
		type: Schema.Types.String,
		required: true
	},
	allowedRoles: [{
		type: Schema.Types.String,
		required: true
	}],
	duration: {
		type: Schema.Types.Number,
		required: true
	},
	maxUserProposal: {
		type: Schema.Types.Number,
		required: true,
		default: 1
	},
	anonymous: {
		type: Schema.Types.Boolean,
		required: true,
		default: false
	},
	liveVisualFeed: {
		type: Schema.Types.Boolean,
		required: true,
		default: false
	},
	voteAllowance: {
		type: Schema.Types.Boolean,
		required: true,
		default: false
	},
	forAgainst: {
		type: Schema.Types.Boolean,
		required: true,
		default: false
	},
	quorum: {
		type: Schema.Types.Number,
		required: true
	},
	voteThreshold: {
		type: Schema.Types.Number,
		required: true
	}
});

export default model("channelConfig", PollChannelSchema);
