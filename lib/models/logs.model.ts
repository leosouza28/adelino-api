import mongoose from "mongoose";

const ModelSchema = new mongoose.Schema({
}, {
    timestamps: {
        createdAt: "createdAt",
        updatedAt: "updatedAt"
    }
});

export const LogsModel = mongoose.model("logs", ModelSchema);