import * as React from "react"
import { cn } from "../../../lib/utils"

const Grid = React.forwardRef(({ className, ...props }, ref) => {
  return (
    <div
      className={cn("grid", className)}
      ref={ref}
      {...props}
    />
  )
})
Grid.displayName = "Grid"

const GridItem = React.forwardRef(({ className, ...props }, ref) => {
  return (
    <div
      className={cn(className)}
      ref={ref}
      {...props}
    />
  )
})
GridItem.displayName = "GridItem"

export { Grid, GridItem } 