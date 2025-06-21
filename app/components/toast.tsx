import toast from "react-hot-toast";
import { CheckCircle, AlertCircle } from "lucide-react";

export const errorToast = (message: string) => {
    return toast(
        (t) => (
            <div className="flex flex-col gap-2">
                <div className="flex gap-2 items-center">
                    <AlertCircle className="text-2xl text-red-500 flex-shrink-0" />
                    <span className="font-poppins text-slate-800  font-medium">{message}</span>
                </div>
            </div>
        ),
        {
            id: "error-toast",
            className: "border-b-[6px] border-red-500 rounded-2xl bg-white dark:bg-gray-800 shadow-lg",
        }
    );
};
export const successToast = (message: string) => {
    return toast(() => (
        <div className="flex flex-col gap-2">
            <div className="flex gap-2 items-center">
                <CheckCircle className="text-2xl text-green-500 flex-shrink-0" />
                <span className="font-poppins text-slate-800  font-medium">{message}</span>
            </div>
        </div>
    ),
        {
            className: "border-b-[6px] border-green-500 rounded-2xl  dark:bg-gray-800 shadow-lg",
        }
    );
};