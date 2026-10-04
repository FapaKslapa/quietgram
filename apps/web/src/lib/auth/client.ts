import { passkeyClient } from "@better-auth/passkey/client";
import { createAuthClient } from "better-auth/react";
import { BOOTSTRAP_HEADER } from "./bootstrap";

const plugins = [passkeyClient()];

export const authClient = createAuthClient({ plugins });

export const createBootstrapClient = (secret: string) =>
  createAuthClient({ plugins, fetchOptions: { headers: { [BOOTSTRAP_HEADER]: secret } } });
