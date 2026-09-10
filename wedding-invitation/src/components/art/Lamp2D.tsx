"use client";

import { memo, useId } from "react";
import { LampSvg, type Lamp2DProps } from "./LampSvg";

export type { Lamp2DProps } from "./LampSvg";

export const Lamp2D = memo(function Lamp2D(props: Lamp2DProps) {
  const id = useId().replace(/:/g, "");
  return <LampSvg id={id} {...props} />;
});
