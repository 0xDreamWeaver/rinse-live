import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { LogIn, Mail } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../store';
import RinseLogo from '../assets/RinseLogo';

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
    <div className="flex justify-center items-center p-8 min-h-screen bg-dark-900 scan-effect">
      {/* Ambient grid background */}
      <div className="fixed inset-0 opacity-5 pointer-events-none">
        <div className="w-full h-full grid-pattern" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Logo */}
        <div className="mb-12 text-center">
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1 }}
            className="inline-block"
          >
            <RinseLogo size="xl" />
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
            className="mt-2 text-sm text-gray-500"
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
          className="space-y-6 card-terminal"
        >
          <div>
            <label className="block mb-2 font-mono text-sm text-terminal-green">
              Email or Username
            </label>
            <div className="relative">
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="email@example.com or username"
                className="pl-10 w-full input-terminal"
                required
                disabled={loginMutation.isPending}
              />
              <Mail className="absolute left-3 top-1/2 w-4 h-4 -translate-y-1/2 text-terminal-green/50" />
            </div>
          </div>

          <div>
            <label className="block mb-2 font-mono text-sm text-terminal-green">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full input-terminal"
              required
              disabled={loginMutation.isPending}
            />
          </div>

          {loginMutation.isError && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-4 font-mono text-sm text-red-500 border border-red-500 bg-red-500/10"
            >
              {(loginMutation.error as Error).message}
            </motion.div>
          )}

          <button
            type="submit"
            disabled={loginMutation.isPending}
            className="flex gap-2 justify-center items-center w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loginMutation.isPending
              ? 'SIGNING IN...'
              : <>
                SIGN IN
                <LogIn className="w-5 h-5" />
              </>
            }
            {/* <ArrowRight className="w-5 h-5" /> */}
          </button>

          <div className="text-center">
            <Link
              to="/register"
              className="text-sm transition-colors text-terminal-green hover:text-terminal-green-dark"
            >
              Don't have an account? Register
            </Link>
          </div>
        </motion.form>
        {/* Footer link */}
        <div className="flex flex-col justify-center items-center">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 0.5 }}
            className="mt-2 font-mono text-sm text-gray-600"
          >
            <Link to="/about">
              Learn about Rinse
            </Link>
          </motion.p>
        </div>
      </motion.div>
    </div>
  );
}
