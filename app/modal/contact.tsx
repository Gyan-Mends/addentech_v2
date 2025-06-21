import { ContactInterface } from "~/interface/interface";
import mongoose from "~/mongoose.server";

const ContactSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: true,
    },
    lastName: {
        type: String,
        required: true,
    },
    middleName: {
        type: String,
        required: false,
    },
    number: {
        type: String,
        required: true,
    },
    company: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        required: false,
    },
});

let Contact: mongoose.Model<ContactInterface>;

try {
    Contact = mongoose.model<ContactInterface>("contact");
} catch (error) {
    Contact = mongoose.model<ContactInterface>("contact", ContactSchema);
}

export default Contact;
