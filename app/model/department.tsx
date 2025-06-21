import { Schema } from "mongoose";
import { DepartmentInterface } from "~/interface/interface";
import mongoose from "~/mongoose.server";

const DepartmentSchema = new mongoose.Schema({
    name: {
        required: true,
        type: String,
    },
    description: {
        required: true,
        type: String,
    },
   
})

let Departments: mongoose.Model<DepartmentInterface>

try {
    Departments = mongoose.model<DepartmentInterface>("departments")
} catch (error) {
    Departments = mongoose.model<DepartmentInterface>("departments", DepartmentSchema)

}

export default Departments