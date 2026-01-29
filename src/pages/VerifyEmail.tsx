import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Loader } from 'lucide-react';
import { api } from '../lib/api';

export function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const verify = async () => {
      if (!token) {
        setStatus('error');
        setMessage('Missing verification token');
        return;
      }

      try {
        const response = await api.verifyEmail(token);
        setStatus('success');
        setMessage(response.message);
      } catch (error) {
        setStatus('error');
        setMessage((error as Error).message);
      }
    };

    verify();
  }, [token]);

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
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-block">
            <div className="w-20 h-20 border-2 border-terminal-green flex items-center justify-center terminal-glow">
              <span className="text-4xl font-bold text-terminal-green font-mono">R</span>
            </div>
          </div>
        </motion.div>

        <div className="card-terminal text-center">
          {status === 'loading' && (
            <>
              <Loader className="w-16 h-16 text-terminal-green mx-auto mb-6 animate-spin" />
              <h2 className="text-2xl font-bold text-terminal-green mb-4 font-mono">
                VERIFYING EMAIL...
              </h2>
              <p className="text-gray-400">Please wait while we verify your email address.</p>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle className="w-16 h-16 text-terminal-green mx-auto mb-6" />
              <h2 className="text-2xl font-bold text-terminal-green mb-4 font-mono">
                EMAIL VERIFIED
              </h2>
              <p className="text-gray-400 mb-6">{message}</p>
              <Link to="/login" className="btn-primary inline-block">
                SIGN IN
              </Link>
            </>
          )}

          {status === 'error' && (
            <>
              <XCircle className="w-16 h-16 text-red-500 mx-auto mb-6" />
              <h2 className="text-2xl font-bold text-red-500 mb-4 font-mono">
                VERIFICATION FAILED
              </h2>
              <p className="text-gray-400 mb-6">{message}</p>
              <div className="space-y-3">
                <Link
                  to="/login"
                  className="text-terminal-green hover:text-terminal-green-dark transition-colors block"
                >
                  Back to Login
                </Link>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
