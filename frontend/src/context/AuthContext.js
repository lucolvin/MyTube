// Auth removed: provide no-op hooks to avoid import errors if referenced.
export const useAuth = () => ({
  user: null,
  loading: false,
  login: async () => null,
  register: async () => null,
  logout: () => {},
  isAuthenticated: false,
});

export const AuthProvider = ({ children }) => children;
