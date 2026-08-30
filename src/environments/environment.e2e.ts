// Used only by the disposable Playwright E2E environment (e2e/start-environment.mjs).
// Points at an isolated, throwaway backend + database instance on non-default
// ports, never the developer's real dev server (localhost:8000/4200) or
// production. Selected via the `e2e` build configuration in angular.json.
export const environment = {
  production: false,
  APP_NAME: 'Elexify Industries Control Panel',
  // CORS (elexify-backend/src/config/corsOptions.js) only auto-allows a
  // localhost origin, not 127.0.0.1 - the admin app itself must be served
  // from localhost so its browser Origin header passes that check. The API
  // target can stay on 127.0.0.1 since only the caller's origin is checked.
  APP_URL: 'http://localhost:4221',
  API_URL: 'http://127.0.0.1:4021/api/v1/',
  STOREFRONT_URL: 'http://127.0.0.1:3010',
  X_API_KEY: 'Ip2A4a02I1r1I9dE1iSnA0S6aB1tE5WS',
};
