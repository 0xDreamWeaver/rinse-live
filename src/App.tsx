import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AuthRoute } from './components/AuthRoute';
import { Search } from './pages/Search';
import { Items } from './pages/Items';
import { Lists } from './pages/Lists';
import { Profile } from './pages/Profile';
import { ItemDetail } from './pages/ItemDetail';
import { ListDetail } from './pages/ListDetail';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { VerifyEmail } from './pages/VerifyEmail';
import { useAuth } from './store';
import { api } from './lib/api';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

function AuthInitializer({ children }: { children: React.ReactNode }) {
  const { token, setAuth, clearAuth, setLoading } = useAuth();

  useEffect(() => {
    const initAuth = async () => {
      if (token) {
        try {
          // Validate the token by fetching current user
          const user = await api.getCurrentUser();
          setAuth(token, user);
        } catch {
          // Token is invalid or expired
          clearAuth();
        }
      } else {
        setLoading(false);
      }
    };
    initAuth();
  }, []); // Only run once on mount

  return <>{children}</>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthInitializer>
          <Routes>
            {/* Public auth routes */}
            <Route
              path="/login"
              element={
                <AuthRoute>
                  <Login />
                </AuthRoute>
              }
            />
            <Route
              path="/register"
              element={
                <AuthRoute>
                  <Register />
                </AuthRoute>
              }
            />
            <Route path="/verify-email" element={<VerifyEmail />} />

            {/* Protected routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Search />} />
              <Route path="items" element={<Items />} />
              <Route path="items/:id" element={<ItemDetail />} />
              <Route path="lists" element={<Lists />} />
              <Route path="lists/:id" element={<ListDetail />} />
              <Route path="profile" element={<Profile />} />
            </Route>
          </Routes>
        </AuthInitializer>
      </BrowserRouter>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}

export default App;
