import { Schema, model, Types } from "mongoose";

export interface IUser {
	_id: Types.ObjectId;
	guildId: string;
	discordId: string;
	nameHistory: string[];
	eligibleChannels: Map<string, { eligiblePolls: number; participatedPolls: number }>;
	status: string;
}

const userSchema = new Schema<IUser>({
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
