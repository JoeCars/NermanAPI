import { model, Schema } from "mongoose";

const PollChannelSchema = new Schema({
	_id: Schema.Types.ObjectId,
	channelId: {
		type: String,
		required: true
	}
});

export default model("channelConfig", PollChannelSchema);
