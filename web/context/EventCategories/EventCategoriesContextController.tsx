"use client";

import { useEffect, useState } from "react";

import { CreatedCategoryData } from "@/app/api/v1/categories/create/types";
import { CategoryData } from "@/app/api/v1/categories/types";
import { useRoutes } from "@/hooks/useRoutes/useRoutes";
import { EventCategoriesContext } from "./EventCategoriesContext";
import {
  EventCategoriesContextControllerProps,
  EventCategoriesContextType,
} from "./EventCategoriesContext.types";

export const EventCategoriesContextController = ({
  children,
}: EventCategoriesContextControllerProps) => {
  const routes = useRoutes();
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchCategories = async () => {
    // Don't fetch if already cached
    if (categories.length > 0) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(routes.api.v1.categories.get());
      const data = await response.json();
      if (data.success) {
        setCategories(data.data);
      }
    } catch (err) {
      console.error("Failed to fetch categories:", err);
    } finally {
      setLoading(false);
    }
  };

  const createCategory = async (
    name: string,
    color: string,
    description?: string,
  ): Promise<CreatedCategoryData | null> => {
    try {
      const response = await fetch(routes.api.v1.categories.create(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          color,
          description: description || null,
        }),
      });

      const data = await response.json();
      if (data.success) {
        // Add the new category to the list
        setCategories([...categories, data.data]);
        return data.data;
      } else {
        console.error("Failed to create category:", data.error);
        return null;
      }
    } catch (err) {
      console.error("Failed to create category:", err);
      return null;
    }
  };

  // Fetch categories on mount
  useEffect(() => {
    fetchCategories();
  }, []);

  const props: EventCategoriesContextType = {
    categories,
    selectedCategoryIds,
    loading,
    fetchCategories,
    setSelectedCategoryIds,
    createCategory,
  };

  return (
    <EventCategoriesContext.Provider value={props}>
      {children}
    </EventCategoriesContext.Provider>
  );
};
