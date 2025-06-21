import { Schema } from "mongoose";
import { CategoryInterface } from "~/interfaces/interface";
import mongoose from "~/mongoose.server";

const CategorySchema = new mongoose.Schema({
    name: {
        required: true,
        type: String,
    },
    description: {
        required: true,
        type: String,
    },
    seller: {
        ref: "registration",
        required: false,
        type: Schema.Types.ObjectId,
    },
})

let Category: mongoose.Model<CategoryInterface>

try {
    Category = mongoose.model<CategoryInterface>("category")
} catch (error) {
    Category = mongoose.model<CategoryInterface>("category", CategorySchema)

}

export default Category