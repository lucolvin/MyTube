// No authentication required - all features are available to everyone.
// This stub exists for backward compatibility with components that may still import useAuth.
export const useAuth = () => ({
  user: null,
  loading: false,
  login: async () => null,
  register: async () => null,
  logout: () => {},
  isAuthenticated: false,
});

export const AuthProvider = ({ children }) => children;
