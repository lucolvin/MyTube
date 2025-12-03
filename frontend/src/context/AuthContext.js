// Auth removed: expose a no-op auth that treats user as always authenticated.
// This prevents redirects to "/login" from pages that previously required auth.
export const useAuth = () => ({
  user: null,
  loading: false,
  login: async () => null,
  register: async () => null,
  logout: () => {},
  isAuthenticated: true,
});

export const AuthProvider = ({ children }) => children;
