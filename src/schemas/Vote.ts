import { Schema, model, Types } from "mongoose";

export interface IVote {
	_id: Types.ObjectId;
	poll: Types.ObjectId;
	user: string;
	choices: string[];
	reason: string;
}

const voteSchema = new Schema<IVote>({
	_id: { type: Schema.Types.ObjectId, required: true },
	poll: { type: Schema.Types.ObjectId, required: true },
	user: { type: Schema.Types.String, required: true },
	choices: { type: [Schema.Types.String], required: true },
	reason: { type: Schema.Types.String, required: true }
});

export default model("Vote", voteSchema);
