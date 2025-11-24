import { ExampleModelAttributes } from "@expensecal/database/models/ExampleModel";

import { BaseResponse } from "../types";

export type ExampleRequest = {
  value: string;
};

export type ExampleResponse = {
  data?: ExampleModelAttributes;
} & BaseResponse;
