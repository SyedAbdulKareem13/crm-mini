"use client";

import { memo, useId } from "react";
import { BellSvg, type BellProps } from "./BellSvg";

export type { BellProps } from "./BellSvg";

export const Bell = memo(function Bell(props: BellProps) {
  const id = useId().replace(/:/g, "");
  return <BellSvg id={id} {...props} />;
});
