import { Input, Textarea } from "@heroui/react"

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
    onChange?: (value: any) => void
    className?: string
    readOnly?: boolean
    error?: string
    required?: boolean
    rows?: number
    min?: string
    max?: string
    step?: string
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
    className,
    readOnly,
    error,
    required,
    rows,
    min,
    max,
    step
}: customInputProps) => {
    // Handle onChange for different input types
    const handleChange = (newValue: string) => {
        if (onChange) {
            onChange(newValue);
        }
    };

    // Use controlled input if value is provided, otherwise use uncontrolled with defaultValue
    const inputProps = value !== undefined 
        ? { value, onValueChange: handleChange }
        : { defaultValue, onValueChange: handleChange };

    // Handle different input types
    const renderInput = () => {
        if (type === 'textarea') {
            return (
                <Textarea
                    variant="bordered"
                    label={label}
                    isRequired={required || isRequired}
                    name={name}
                    placeholder={placeholder}
                    labelPlacement="outside"
                    className={className}
                    readOnly={readOnly}
                    minRows={rows || 3}
                    isInvalid={!!error}
                    errorMessage={error}
                    {...inputProps}
                    classNames={{
                        label: "font-nunito text-sm !text-black dark:!text-white",
                        input: "text-gray-900 dark:text-white placeholder:text-gray-400",
                        inputWrapper: "border text-gray-900 dark:text-white border-black/20 dark:border-white/20 bg-white dark:bg-gray-800 outline-none shadow-sm hover:bg-dashboard-secondary hover:border-white/20 focus-within:border-white/20 focus-within:outline-none focus-within:shadow-none focus-within:ring-0 focus-within:ring-offset-0"
                    }}
                />
            );
        }

        // Create additional props object for HTML input attributes
        const htmlInputProps: any = {};
        if (min !== undefined) htmlInputProps.min = min;
        if (max !== undefined) htmlInputProps.max = max;
        if (step !== undefined) htmlInputProps.step = step;

        return (
            <Input
                variant="bordered"
                endContent={endContent}
                label={label}
                isRequired={required || isRequired}
                isClearable={isClearable}
                name={name}
                placeholder={placeholder}
                type={type}
                labelPlacement="outside"
                className={className}
                readOnly={readOnly}
                isInvalid={!!error}
                errorMessage={error}
                {...inputProps}
                {...htmlInputProps}
                classNames={{
                    label: "font-nunito text-sm !text-black dark:!text-white",
                    input: "text-gray-900 dark:text-white placeholder:text-gray-400",
                    inputWrapper: "border text-gray-900 dark:text-white border-black/20 dark:border-white/20 bg-white dark:bg-gray-800 outline-none shadow-sm hover:bg-dashboard-secondary hover:border-white/20 focus-within:border-white/20 focus-within:outline-none focus-within:shadow-none focus-within:ring-0 focus-within:ring-offset-0"
                }}
            />
        );
    };

    return (
        <div>
            {renderInput()}
        </div>
    )
}

export default CustomInput