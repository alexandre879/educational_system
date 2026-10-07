"use client";

import { createContext, useContext } from "react";
import type { UserMeData } from "../profile/interface";

/** The signed-in user, loaded once by the main layout (null until it arrives). */
export const MeContext = createContext<UserMeData | null>(null);

export function useMe(): UserMeData | null {
  return useContext(MeContext);
}
