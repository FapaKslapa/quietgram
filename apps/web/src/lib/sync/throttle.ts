import type { Requester } from "@nodistraction/ig";

export const throttle = (requester: Requester, delay: () => Promise<void>): Requester => {
  let first = true;
  const pace = async (): Promise<void> => {
    if (!first) await delay();
    first = false;
  };
  return {
    get: async (path, params) => {
      await pace();
      return requester.get(path, params);
    },
    postForm: async (path, body) => {
      await pace();
      return requester.postForm(path, body);
    },
  };
};
