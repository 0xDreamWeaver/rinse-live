import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { LogIn, ArrowRight, Mail } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../store';

export function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setAuth } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');

  const loginMutation = useMutation({
    mutationFn: () => api.login(identifier, password),
    onSuccess: (data) => {
      setAuth(data.token, data.user);
      // Redirect to the page they came from, or home
      const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';
      navigate(from, { replace: true });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-dark-900 scan-effect flex items-center justify-center p-8">
      {/* Ambient grid background */}
      <div className="fixed inset-0 pointer-events-none opacity-5">
        <div className="grid-pattern w-full h-full" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Logo */}
        <div className="text-center mb-12">
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1 }}
            className="inline-block"
          >
            <div className="w-20 h-20 border-2 border-terminal-green mx-auto terminal-box-glow mb-4">
              <div className="w-full h-full flex items-center justify-center">
                <span className="font-display text-terminal-green font-bold text-4xl terminal-glow">
                  R
                </span>
              </div>
            </div>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-4xl font-bold text-terminal-green"
          >
            Welcome Back
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-gray-500 text-sm mt-2"
          >
            Sign in to continue
          </motion.p>
        </div>

        {/* Form */}
        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          onSubmit={handleSubmit}
          className="card-terminal space-y-6"
        >
          <div>
            <label className="block text-sm font-mono text-terminal-green mb-2">
              Email or Username
            </label>
            <div className="relative">
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="email@example.com or username"
                className="input-terminal w-full pl-10"
                required
                disabled={loginMutation.isPending}
              />
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-terminal-green/50" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-mono text-terminal-green mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="input-terminal w-full"
              required
              disabled={loginMutation.isPending}
            />
          </div>

          {loginMutation.isError && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-4 border border-red-500 bg-red-500/10 text-red-500 font-mono text-sm"
            >
              {(loginMutation.error as Error).message}
            </motion.div>
          )}

          <button
            type="submit"
            disabled={loginMutation.isPending}
            className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <LogIn className="w-5 h-5" />
            {loginMutation.isPending ? 'SIGNING IN...' : 'SIGN IN'}
            <ArrowRight className="w-5 h-5" />
          </button>

          <div className="text-center">
            <Link
              to="/register"
              className="text-terminal-green hover:text-terminal-green-dark transition-colors text-sm"
            >
              Don't have an account? Register
            </Link>
          </div>
        </motion.form>
      </motion.div>
    </div>
  );
}
