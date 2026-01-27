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
        createFromFile: () => `/api/v1/events/create-from-file`,
        detail: (eventId: string) =>
          `/api/v1/events/${encodeURIComponent(eventId)}`,
        children: (eventId: string) =>
          `/api/v1/events/${encodeURIComponent(eventId)}/children`,
        makeRecurring: (eventId: string) =>
          `/api/v1/events/${encodeURIComponent(eventId)}/make-recurring`,
        deleteMultiple: () => `/api/v1/events/delete-multiple`,
        updateMultiple: () => `/api/v1/events/update-multiple`,
        installments: {
          create: () => `/api/v1/events/installments/create`,
          list: () => `/api/v1/events/installments/list`,
          delete: () => `/api/v1/events/installments/delete`,
        },
      },
      calendar: {
        get: () => `/api/v1/calendar`,
      },
      currencies: {
        get: () => `/api/v1/currencies`,
      },
      categories: {
        get: () => `/api/v1/categories`,
        create: () => `/api/v1/categories/create`,
      },
      exchangeRates: {
        get: () => `/api/v1/exchange-rates`,
      },
      userPreferences: {
        get: () => `/api/v1/user-preferences`,
        update: () => `/api/v1/user-preferences`,
      },
    },
    v2: {
      calendar: {
        get: () => `/api/v2/calendar`,
      },
    },
  },
};

export const useRoutes = () => routes;
