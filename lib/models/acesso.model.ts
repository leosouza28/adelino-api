import mongoose from "mongoose";

const ModelSchema = new mongoose.Schema({
    body_params: Object,
    query_params: Object,
    connection_data: {
        user_agent: String,
        origin: String,
        country: String,
        region: String,
        city: String,
        latlng: Number,
        location: {
            latitude: Number,
            longitude: Number
        },
        ip: String,
    },
}, {
    timestamps: {
        createdAt: 'createdAt',
        updatedAt: 'updatedAt'
    }
});

export const AcessosModel = mongoose.model("acessos", ModelSchema);
