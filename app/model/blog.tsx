import { Schema } from "mongoose";
import category from "~/controller/categoryController";
import { BlogInterface } from "~/interface/interface";
import mongoose from "~/mongoose.server";

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
        ref: "registration",
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