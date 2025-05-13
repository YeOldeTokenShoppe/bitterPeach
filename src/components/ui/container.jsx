import * as React from "react"
import { cn } from "../../../lib/utils"

const Container = React.forwardRef(({ className, ...props }, ref) => {
  return (
    <div
      className={cn("mx-auto w-full max-w-7xl px-4 md:px-6", className)}
      ref={ref}
      {...props}
    />
  )
})
Container.displayName = "Container"

export { Container } 