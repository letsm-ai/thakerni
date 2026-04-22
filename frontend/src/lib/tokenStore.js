// In-memory token store — replaces localStorage for auth tokens
// This prevents XSS attacks from stealing tokens via localStorage

let _token = null;

export const tokenStore = {
  getToken: () => _token,
  setToken: (token) => { _token = token; },
  clearToken: () => { _token = null; },
};
