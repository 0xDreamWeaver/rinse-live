import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { UserPlus, ArrowRight, Mail, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';

export function Register() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [registrationComplete, setRegistrationComplete] = useState(false);
  const [validationError, setValidationError] = useState('');

  const registerMutation = useMutation({
    mutationFn: () => api.register(username, email, password),
    onSuccess: () => {
      setRegistrationComplete(true);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    if (password !== confirmPassword) {
      setValidationError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setValidationError('Password must be at least 8 characters');
      return;
    }

    registerMutation.mutate();
  };

  if (registrationComplete) {
    return (
      <div className="min-h-screen bg-dark-900 scan-effect flex items-center justify-center p-8">
        {/* Background grid */}
        <div className="absolute inset-0 grid-pattern opacity-5" />

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md relative z-10"
        >
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-block">
              <div className="w-20 h-20 border-2 border-terminal-green flex items-center justify-center terminal-glow">
                <span className="text-4xl font-bold text-terminal-green font-mono">R</span>
              </div>
            </div>
          </div>

          <div className="card-terminal text-center">
            <CheckCircle className="w-16 h-16 text-terminal-green mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-terminal-green mb-4 font-mono">
              CHECK YOUR EMAIL
            </h2>
            <p className="text-gray-400 mb-2">
              We've sent a verification link to:
            </p>
            <p className="text-terminal-green mb-6 font-mono">{email}</p>
            <p className="text-gray-500 text-sm mb-6">
              Please check your inbox and click the link to verify your account.
              The link expires in 24 hours.
            </p>
            <Link
              to="/login"
              className="text-terminal-green hover:text-terminal-green-dark transition-colors"
            >
              Back to Login
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

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
            Create Account
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-gray-500 text-sm mt-2"
          >
            Join the Rinse network
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
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="username"
              className="input-terminal w-full"
              required
              minLength={3}
              maxLength={30}
              pattern="[a-zA-Z0-9_-]+"
              title="Only letters, numbers, underscores, and hyphens allowed"
              disabled={registerMutation.isPending}
            />
          </div>

          <div>
            <label className="block text-sm font-mono text-terminal-green mb-2">
              Email
            </label>
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
                className="input-terminal w-full pl-10"
                required
                disabled={registerMutation.isPending}
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
              minLength={8}
              disabled={registerMutation.isPending}
            />
            <p className="text-gray-500 text-xs mt-1">Minimum 8 characters</p>
          </div>

          <div>
            <label className="block text-sm font-mono text-terminal-green mb-2">
              Confirm Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="input-terminal w-full"
              required
              minLength={8}
              disabled={registerMutation.isPending}
            />
          </div>

          {(validationError || registerMutation.isError) && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-4 border border-red-500 bg-red-500/10 text-red-500 font-mono text-sm"
            >
              {validationError || (registerMutation.error as Error).message}
            </motion.div>
          )}

          <button
            type="submit"
            disabled={registerMutation.isPending}
            className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <UserPlus className="w-5 h-5" />
            {registerMutation.isPending ? 'CREATING ACCOUNT...' : 'CREATE ACCOUNT'}
            <ArrowRight className="w-5 h-5" />
          </button>

          <div className="text-center">
            <Link
              to="/login"
              className="text-terminal-green hover:text-terminal-green-dark transition-colors text-sm"
            >
              Already have an account? Sign in
            </Link>
          </div>
        </motion.form>
      </motion.div>
    </div>
  );
}
