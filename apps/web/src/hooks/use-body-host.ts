"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => undefined;
const getBody = (): HTMLElement => document.body;
const getServerBody = (): null => null;

export function useBodyHost(): HTMLElement | null {
  return useSyncExternalStore(subscribe, getBody, getServerBody);
}
