const origin = process.env.NEXT_PUBLIC_RAILWAY_PUBLIC_DOMAIN;

export const routes = {
  home: () => `/`,
  api: {
    v1: {
      example: {
        create: () => `/api/v1/example`,
      },
    },
  },
};

export const useRoutes = () => routes;
