import * as React from "react"
import { ChevronUp, ChevronDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { Input } from "./input"
import { Button } from "./button"

interface NumberInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "size" | "value"> {
  className?: string;
  size?: "default" | "sm" | "lg";
  value?: number | string;
  defaultValue?: number | string;
  min?: number;
  max?: number;
  step?: number;
  onChange?: (valueAsString: string, valueAsNumber: number | undefined) => void;
  onValueChange?: (value: number | undefined) => void;
}

const NumberInput = React.forwardRef<HTMLInputElement, NumberInputProps>(({
  className,
  size = "default",
  value,
  defaultValue,
  min = Number.MIN_SAFE_INTEGER,
  max = Number.MAX_SAFE_INTEGER,
  step = 1,
  onChange,
  onValueChange,
  ...props
}, ref) => {
  const [internalValue, setInternalValue] = React.useState<number | string>(() => {
    return value !== undefined ? value : defaultValue || 0
  })
  
  // Use value prop if it's controlled
  const resolvedValue = value !== undefined ? value : internalValue
  
  // Handle controlled component
  React.useEffect(() => {
    if (value !== undefined) {
      setInternalValue(value)
    }
  }, [value])

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValueAsString = event.target.value
    let newValue = newValueAsString === "" ? "" : Number(newValueAsString)
    
    // Don't modify empty string during typing
    if (newValueAsString === "") {
      setInternalValue("")
      onChange?.(newValueAsString, undefined)
      onValueChange?.(undefined)
      return
    }
    
    // Apply constraints
    if (!isNaN(newValue as number)) {
      const numValue = Number(newValue)
      if (numValue < min) newValue = min
      if (numValue > max) newValue = max
      
      setInternalValue(newValue)
      onChange?.(String(newValue), newValue as number)
      onValueChange?.(newValue as number)
    }
  }
  
  const increment = () => {
    const currentValue = resolvedValue === "" ? 0 : Number(resolvedValue)
    const newValue = Math.min(max, currentValue + step)
    setInternalValue(newValue)
    onChange?.(String(newValue), newValue)
    onValueChange?.(newValue)
  }
  
  const decrement = () => {
    const currentValue = resolvedValue === "" ? 0 : Number(resolvedValue)
    const newValue = Math.max(min, currentValue - step)
    setInternalValue(newValue)
    onChange?.(String(newValue), newValue)
    onValueChange?.(newValue)
  }
  
  const sizeClasses = {
    default: "",
    sm: "h-8 text-xs",
    lg: "h-10 text-base px-4",
  }

  return (
    <div className={cn("flex items-center", className)}>
      <Input
        ref={ref}
        type="number"
        className={cn("flex-1 rounded-r-none", sizeClasses[size])}
        value={resolvedValue}
        onChange={handleChange}
        min={min}
        max={max}
        step={step}
        {...props}
      />
      <div className="inline-flex h-full flex-col">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className={cn(
            "h-[calc(50%-1px)] w-9 rounded-none rounded-tr-md border-l-0",
            size === "sm" && "h-4 w-7",
            size === "lg" && "h-5 w-10"
          )}
          onClick={increment}
        >
          <ChevronUp className="h-3 w-3" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className={cn(
            "h-[calc(50%-1px)] w-9 rounded-none rounded-br-md border-l-0 border-t-0",
            size === "sm" && "h-4 w-7",
            size === "lg" && "h-5 w-10"
          )}
          onClick={decrement}
        >
          <ChevronDown className="h-3 w-3" />
        </Button>
      </div>
    </div>
  )
})

NumberInput.displayName = "NumberInput"

export { NumberInput } 