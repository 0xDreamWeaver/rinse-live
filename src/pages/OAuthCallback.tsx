import { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { api } from '../lib/api';
import type { MusicService } from '../types';

type CallbackState = 'processing' | 'success' | 'error';

export function OAuthCallback() {
  const { service } = useParams<{ service: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [state, setState] = useState<CallbackState>('processing');
  const [username, setUsername] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const completeOAuth = async () => {
      const code = searchParams.get('code');
      const oauthState = searchParams.get('state');
      const errorParam = searchParams.get('error');
      const errorDescription = searchParams.get('error_description');

      // Handle OAuth error from provider
      if (errorParam) {
        setState('error');
        setError(errorDescription || errorParam || 'Authorization was denied');
        return;
      }

      // Validate required parameters
      if (!code || !oauthState) {
        setState('error');
        setError('Missing authorization code or state parameter');
        return;
      }

      if (!service) {
        setState('error');
        setError('Unknown service');
        return;
      }

      try {
        const response = await api.completeOAuthCallback(
          service as MusicService,
          code,
          oauthState
        );

        setState('success');
        setUsername(response.username);

        // Redirect to profile after a short delay
        setTimeout(() => {
          navigate('/profile', { replace: true });
        }, 2000);
      } catch (err) {
        setState('error');
        setError(err instanceof Error ? err.message : 'Failed to complete authorization');
      }
    };

    completeOAuth();
  }, [service, searchParams, navigate]);

  const getServiceDisplayName = (svc: string): string => {
    const names: Record<string, string> = {
      spotify: 'Spotify',
      tidal: 'Tidal',
      soundcloud: 'SoundCloud',
      beatport: 'Beatport',
    };
    return names[svc] || svc;
  };

  return (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="card-terminal max-w-md w-full text-center"
      >
        {state === 'processing' && (
          <div className="space-y-4">
            <Loader2 className="w-12 h-12 text-terminal-green mx-auto animate-spin" />
            <h2 className="text-xl font-display font-bold text-terminal-green">
              Connecting to {service ? getServiceDisplayName(service) : 'service'}...
            </h2>
            <p className="text-sm text-gray-500">
              Please wait while we complete the authorization
            </p>
          </div>
        )}

        {state === 'success' && (
          <div className="space-y-4">
            <CheckCircle className="w-12 h-12 text-terminal-green mx-auto" />
            <h2 className="text-xl font-display font-bold text-terminal-green">
              Connected!
            </h2>
            <p className="text-sm text-gray-400">
              Successfully connected as <span className="text-terminal-green">{username}</span>
            </p>
            <p className="text-xs text-gray-500">
              Redirecting to profile...
            </p>
          </div>
        )}

        {state === 'error' && (
          <div className="space-y-4">
            <XCircle className="w-12 h-12 text-red-500 mx-auto" />
            <h2 className="text-xl font-display font-bold text-red-500">
              Connection Failed
            </h2>
            <p className="text-sm text-gray-400">
              {error}
            </p>
            <button
              onClick={() => navigate('/profile', { replace: true })}
              className="btn-terminal mt-4"
            >
              Return to Profile
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
