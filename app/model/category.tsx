import mongoose, { Schema } from "mongoose";
import type { CategoryInterface } from "~/interface/interface";

const CategorySchema = new mongoose.Schema({
    name: {
        required: true,
        type: String,
    },
    description: {
        required: true,
        type: String,
    },
    admin: {
        ref: "Registration",
        required: false,
        type: Schema.Types.ObjectId,
    },
}, {
    timestamps: true
})

let Category: mongoose.Model<CategoryInterface>

try {
    Category = mongoose.model<CategoryInterface>("category")
} catch (error) {
    Category = mongoose.model<CategoryInterface>("category", CategorySchema)

}

export default Category