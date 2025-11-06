"use client";

import type { ThemeProviderProps } from "next-themes";

import { CalendarContextController } from "@/context/Calendar/CalendarContextController";
import { EventsContextController } from "@/context/Events/EventsContextController";
import { ExampleContextController } from "@/context/Example/ExampleContextController";
import { HeroUIProvider } from "@heroui/system";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { useRouter } from "next/navigation";
import * as React from "react";

export interface ProvidersProps {
  children: React.ReactNode;
  themeProps?: ThemeProviderProps;
}

declare module "@react-types/shared" {
  interface RouterConfig {
    routerOptions: NonNullable<
      Parameters<ReturnType<typeof useRouter>["push"]>[1]
    >;
  }
}

export function Providers({ children, themeProps }: ProvidersProps) {
  const router = useRouter();

  return (
    <HeroUIProvider navigate={router.push}>
      <NextThemesProvider {...themeProps}>
        <EventsContextController>
          <CalendarContextController>
            <ExampleContextController>{children}</ExampleContextController>
          </CalendarContextController>
        </EventsContextController>
      </NextThemesProvider>
    </HeroUIProvider>
  );
}
