import { Schema, model } from "mongoose";

const userSchema = new Schema({
	_id: Schema.Types.ObjectId,
	guildId: { type: String, required: true },
	discordId: {
		type: String,
		required: true,
		unique: false
	},
	nameHistory: {
		type: [String]
	},
	eligibleChannels: {
		type: Map,
		of: Schema.Types.Mixed,
		default: new Map()
	},
	status: {
		type: String,
		enum: ["active", "inactive", "warning"],
		default: "active"
	}
});

export default model("User", userSchema);
