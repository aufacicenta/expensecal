import "server-only";

import { StackServerApp } from "@stackframe/stack";

import { routes } from "@/hooks/useRoutes/useRoutes";

export const stackServerApp = new StackServerApp({
  tokenStore: "nextjs-cookie",
  urls: {
    afterSignIn: routes.table.index(),
    afterSignUp: routes.table.index(),
    // Don't set oauthCallback - it should use Stack's default handler
  },
});
