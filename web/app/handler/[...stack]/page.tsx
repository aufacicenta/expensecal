import { StackHandler, StackServerApp } from "@stackframe/stack";

import { routes } from "@/hooks/useRoutes/useRoutes";

const stackServerApp = new StackServerApp({
  tokenStore: "nextjs-cookie",
  urls: {
    afterSignIn: routes.table.index(),
    afterSignUp: routes.table.index(),
    oauthCallback: routes.table.index(),
  },
});

export default function Handler(props: unknown) {
  return <StackHandler fullPage app={stackServerApp} routeProps={props} />;
}
