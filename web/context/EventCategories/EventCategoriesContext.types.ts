import { ReactNode } from "react";

import { CreatedCategoryData } from "@/app/api/v1/categories/create/types";
import { CategoryData } from "@/app/api/v1/categories/types";

export type EventCategoriesContextControllerProps = {
  children: ReactNode;
};

export type EventCategoriesContextType = {
  categories: CategoryData[];
  selectedCategoryIds: string[];
  loading: boolean;
  fetchCategories: () => Promise<void>;
  setSelectedCategoryIds: (ids: string[]) => void;
  createCategory: (
    name: string,
    color: string,
    description?: string,
  ) => Promise<CreatedCategoryData | null>;
};
