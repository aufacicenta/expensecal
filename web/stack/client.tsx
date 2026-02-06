import { StackClientApp } from "@stackframe/stack";

import { routes } from "@/hooks/useRoutes/useRoutes";

export const stackClientApp = new StackClientApp({
  tokenStore: "nextjs-cookie",
  urls: {
    afterSignIn: routes.table.index(),
    afterSignUp: routes.table.index(),
    // Don't set oauthCallback - it should use Stack's default handler
  },
});
