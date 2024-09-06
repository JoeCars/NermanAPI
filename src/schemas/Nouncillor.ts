import { model, Schema, Types } from "mongoose";

export interface INouncillor {
	_id: Types.ObjectId;
	discordId: string;
	walletAddress: string;
	twitterAddress: string;
	farcasterAddress: string;
	dateJoined: Date;
}

const nouncillorSchema = new Schema<INouncillor>({
	discordId: {
		type: Schema.Types.String,
		required: true,
		unique: true
	},
	walletAddress: {
		type: Schema.Types.String,
		required: false
	},
	twitterAddress: {
		type: Schema.Types.String,
		required: false
	},
	farcasterAddress: {
		type: Schema.Types.String,
		required: false
	},
	dateJoined: {
		type: Schema.Types.Date,
		required: false
	}
});

export default model("Nouncillor", nouncillorSchema);
