export type BaseResponse = {
  success: boolean;
  error?: string;
};

export type BaseSuccessResponse = {
  success: true;
};

export type BaseErrorResponse = {
  success: false;
  error: string;
};
