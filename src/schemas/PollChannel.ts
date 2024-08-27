import { model, Schema, Types } from "mongoose";

export interface IPollChannel {
	_id: Types.ObjectId;
	channelId: string;
	quorum: number;
	voteThreshold: number;
}

const PollChannelSchema = new Schema<IPollChannel>({
	_id: { type: Schema.Types.ObjectId, required: true },
	channelId: {
		type: Schema.Types.String,
		required: true
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
