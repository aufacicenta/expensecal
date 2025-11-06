const origin = process.env.NEXT_PUBLIC_RAILWAY_PUBLIC_DOMAIN;

export const routes = {
  home: () => `/`,
  api: {
    v1: {
      example: {
        create: () => `/api/v1/example`,
      },
      events: {
        parse: () => `/api/v1/events/parse`,
        create: () => `/api/v1/events/create`,
        createFromText: () => `/api/v1/events/create-from-text`,
        installments: {
          create: () => `/api/v1/events/installments/create`,
          list: () => `/api/v1/events/installments/list`,
          delete: () => `/api/v1/events/installments/delete`,
        },
      },
      calendar: {
        get: () => `/api/v1/calendar`,
      },
    },
  },
};

export const useRoutes = () => routes;
