"use client";

import { useEffect, useState } from "react";

export function useBodyHost(): HTMLElement | null {
  const [host, setHost] = useState<HTMLElement | null>(null);
  useEffect(() => setHost(document.body), []);
  return host;
}
