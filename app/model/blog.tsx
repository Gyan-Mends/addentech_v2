import mongoose, { Schema } from "mongoose";
import type { BlogInterface } from "~/interface/interface";

const BlogSchema = new mongoose.Schema({
    name: {
        required: true,
        type: String,
    },
    description: {
        required: true,
        type: String,
    },
    image: {
        required: true,
        type: String,
    },
    category: {
        ref: "category",
        required: true,
        type: Schema.Types.ObjectId,
    },
    admin: {
        ref: "Registration",
        required: true,
        type: Schema.Types.ObjectId,
    },
}, {
    timestamps: true
})

let Blog: mongoose.Model<BlogInterface>

try {
    Blog = mongoose.model<BlogInterface>("blog")
} catch (error) {
    Blog = mongoose.model<BlogInterface>("blog", BlogSchema)

}

export default Blog