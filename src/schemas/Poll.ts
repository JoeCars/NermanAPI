import { model, Schema } from "mongoose";
import PollChannel from "./PollChannel";

const PollSchema = new Schema({
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
