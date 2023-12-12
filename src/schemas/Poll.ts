import { model, Schema, Types } from "mongoose";
import PollChannel from "./PollChannel";

export interface IPoll {
	_id: Types.ObjectId;
	guildId: string;
	config: Types.ObjectId;
	allowedUsers: Map<string, boolean>;
	status: string;
}

const PollSchema = new Schema<IPoll>({
	_id: Schema.Types.ObjectId,

	guildId: { type: String, required: true },

	config: {
		type: Schema.Types.ObjectId,
		ref: "channelConfig",
		required: true
	},
	allowedUsers: {
		type: Map,
		of: Boolean,
		default: new Map()
	},
	status: {
		type: String,
		default: "closed",
		enum: ["open", "closed", "cancelled", "canceled"]
	}
});

export default model("Poll", PollSchema);
