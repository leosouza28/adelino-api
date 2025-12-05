import mongoose from "mongoose";

const ModelSchema = new mongoose.Schema({
    body: {},
}, {
    timestamps: {
        createdAt: 'createdAt',
        updatedAt: 'updatedAt'
    }
});

export const WebhookTestsModel = mongoose.model("webhooks-tests", ModelSchema);
