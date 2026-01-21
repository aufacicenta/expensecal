"use client";

import { useEffect, useState } from "react";

import { FilteringContext } from "./FilteringContext";
import {
  FilteringContextControllerProps,
  FilteringContextType,
} from "./FilteringContextController.types";

export const FilteringContextController = ({
  children,
}: FilteringContextControllerProps) => {
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);

  /**
   * Read initial filter from URL query params
   * Expected format: ?categories=id1,id2,id3
   */
  const readInitialFilterFromUrl = () => {
    if (typeof window === "undefined") {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const categoriesParam = params.get("categories");

    if (categoriesParam) {
      const ids = categoriesParam
        .split(",")
        .map((id) => id.trim())
        .filter((id) => id.length > 0);

      setSelectedCategoryIds(ids);
    }
  };

  /**
   * Sync filter to URL query params
   * Updates the URL without reloading the page
   */
  const syncFilterToUrl = (ids: string[]) => {
    if (typeof window === "undefined") {
      return;
    }

    const params = new URLSearchParams(window.location.search);

    if (ids.length === 0) {
      // Remove the categories param if no filters are selected
      params.delete("categories");
    } else {
      // Set the categories param with comma-separated IDs
      params.set("categories", ids.join(","));
    }

    // Update URL without reloading
    const newUrl = `${window.location.pathname}${
      params.toString() ? "?" + params.toString() : ""
    }`;

    window.history.replaceState({}, "", newUrl);
  };

  /**
   * Handle category selection changes
   */
  const handleSetSelectedCategoryIds = (ids: string[]) => {
    setSelectedCategoryIds(ids);
    syncFilterToUrl(ids);
  };

  // Read initial filter from URL on mount
  useEffect(() => {
    readInitialFilterFromUrl();
  }, []);

  const props: FilteringContextType = {
    selectedCategoryIds,
    setSelectedCategoryIds: handleSetSelectedCategoryIds,
    readInitialFilterFromUrl,
    syncFilterToUrl,
  };

  return (
    <FilteringContext.Provider value={props}>
      {children}
    </FilteringContext.Provider>
  );
};
