import { Input } from "@heroui/react"
import type { ReactNode } from "react"

interface customInputProps {
    label?: string
    isRequired?: boolean
    isClearable?: boolean
    name?: string
    placeholder?: string
    type?: string
    labelPlacement?: string | any
    defaultValue?: string
    value?: string
    endContent?: string | any
    onChange?: ReactNode | any
    className?: string
}

const CustomInput = ({
    label,
    isRequired,
    isClearable,
    name,
    placeholder,
    type,
    labelPlacement,
    defaultValue,
    value,
    endContent,
    onChange,
    className
}: customInputProps) => {
    // Use controlled input if value is provided, otherwise use uncontrolled with defaultValue
    const inputProps = value !== undefined 
        ? { value, onChange }
        : { defaultValue, onChange };

    return (
        <div>
            <Input
                variant="bordered"
                endContent={endContent}
                label={label}
                isRequired={isRequired}
                isClearable={isClearable}
                name={name}
                placeholder={placeholder}
                type={type}
                labelPlacement={labelPlacement}
                className={className}
                {...inputProps}
                classNames={{
                    label: "font-nunito text-sm !text-black dark:!text-white",
                    input: "text-gray-400 placeholder:text-gray-400",
                    inputWrapper: "border text-gray-400 border-black/20 dark:border-white/20 bg-white dark:bg-gray-800 outline-none shadow-sm hover:bg-dashboard-secondary hover:border-white/20 focus-within:border-white/20 focus-within:outline-none focus-within:shadow-none focus-within:ring-0 focus-within:ring-offset-0"
                }}
            />
        </div>
    )
}

export default CustomInput