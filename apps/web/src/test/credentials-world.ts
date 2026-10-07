import { type EngineCall, EngineFailure, IG_USER_ID } from "@/test/helpers";

export type LoginMode = "ok" | "challenge" | "bad" | "throttled" | "down" | "other-account";

export const PASSWORD = "correct horse battery staple";
export const TOTP_SECRET = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";

export const loginWorld = (options: { mode?: LoginMode; staysExpired?: boolean } = {}) => {
  let active = false;
  const state = { mode: options.mode ?? "ok" };
  const respond = (call: EngineCall): unknown => {
    if (call.path === "/v1/session" && call.method === "GET") {
      return { active, username: "me" };
    }
    if (call.path === "/v1/session" && call.method === "PUT") {
      if (options.staysExpired || JSON.parse(call.body).sessionid === "s") {
        return new EngineFailure(401, { code: "session_expired" });
      }
      active = true;
      return { active, username: "me" };
    }
    if (call.path === "/v1/session/login") {
      switch (state.mode) {
        case "challenge":
          return new EngineFailure(403, { code: "challenge_required" });
        case "bad":
          return new EngineFailure(403, { code: "bad_credentials" });
        case "throttled":
          return new EngineFailure(429, { code: "throttled" });
        case "down":
          return new EngineFailure(502, { code: "upstream_error" });
        case "ok":
        case "other-account":
          active = !options.staysExpired;
          return {
            sessionid: "fresh-session",
            csrftoken: "fresh-csrf",
            user_id: state.mode === "ok" ? IG_USER_ID : "999",
            username: "me",
          };
      }
    }
    if (call.path === "/v1/following") return { users: [] };
    if (call.path === "/v1/stories/tray") {
      return active ? { tray: [] } : new EngineFailure(401, { code: "session_expired" });
    }
    throw new Error(`unexpected ${call.method} ${call.path}`);
  };
  return { respond, state };
};

export const loginCalls = (calls: EngineCall[]) =>
  calls.filter((call) => call.path === "/v1/session/login");
