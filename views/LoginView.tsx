import React, { useState } from 'react';
import { User } from '../types';
import { ShieldIcon } from '../components/icons/ShieldIcon';
import { LoadingSpinnerIcon } from '../components/icons/LoadingSpinnerIcon';

interface LoginViewProps {
  onLogin: (email: string, password: string) => Promise<void>;
}

const LoginView: React.FC<LoginViewProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await onLogin(email, password);
      // On success, the Dashboard component will automatically re-render.
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed. Please try again.');
      setIsLoading(false);
    }
  };
  
  const inputStyle = "w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-emerald-500";

  return (
    <div className={`flex items-center justify-center min-h-screen bg-gray-900 text-gray-200 transition-all duration-300 ${isLoading ? 'opacity-50' : ''}`}>
      <div className={`w-full max-w-sm p-8 space-y-8 bg-gray-800 rounded-lg shadow-2xl border border-gray-700/50 ${error ? 'shake-error' : ''}`}>
        <div className="text-center">
            <div className="inline-block p-3 bg-emerald-500/10 rounded-full mb-4">
                <ShieldIcon className="w-12 h-12 text-emerald-400" />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-green-300 text-transparent bg-clip-text">
              Mobet POS KENYA
            </h1>
            <p className="mt-2 text-gray-400">Please sign in to your account</p>
        </div>
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email" className="sr-only">Email address</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputStyle}
              placeholder="Email address"
            />
          </div>
          <div>
            <label htmlFor="password" className="sr-only">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputStyle}
              placeholder="Password"
            />
          </div>
          {error && <p className="text-sm text-center text-red-400">{error}</p>}
          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center items-center gap-2 px-4 py-3 font-bold text-white bg-emerald-600 rounded-md hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-emerald-500 transition-colors disabled:bg-gray-500 disabled:cursor-wait"
            >
              {isLoading && <LoadingSpinnerIcon className="w-5 h-5" />}
              <span>{isLoading ? 'Signing in...' : 'Sign In'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginView;