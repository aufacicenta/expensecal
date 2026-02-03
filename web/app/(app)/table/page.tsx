"use client";

import { useUser } from "@stackframe/stack";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { EventsTable } from "@/components/events-table/EventsTable";
import { useRoutes } from "@/hooks/useRoutes/useRoutes";

export default function TablePage() {
  const user = useUser();
  const router = useRouter();
  const routes = useRoutes();

  useEffect(() => {
    if (user === null) {
      router.replace(routes.handler.signUp());
    }
  }, [user, router, routes]);

  if (user === null) {
    return null;
  }

  return <EventsTable />;
}
