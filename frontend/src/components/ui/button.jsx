import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { buttonVariants } from "./button-variants";

import { cn } from "./utils";

const Button = React.forwardRef(function Button(
  { className, variant, size, asChild = false, ...props },
  ref,
) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      {...props}
    />
  );
});

export { Button};
