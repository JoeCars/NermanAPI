import { model, Schema, Types } from "mongoose";

export interface IPollChannel {
	_id: Types.ObjectId;
	channelId: string;
}

const PollChannelSchema = new Schema<IPollChannel>({
	_id: Schema.Types.ObjectId,
	channelId: {
		type: String,
		required: true
	}
});

export default model("channelConfig", PollChannelSchema);
