import mongoose from "mongoose";

const ModelSchema = new mongoose.Schema({
    name: String,
    contador: Number
}, {
    timestamps: {
        createdAt: 'createdAt',
        updatedAt: 'updatedAt'
    }
});

export const CountersModel = mongoose.model("counters", ModelSchema);
