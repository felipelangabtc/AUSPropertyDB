'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Mail, Lock, AlertCircle } from 'lucide-react';

interface AuthFormProps {
  type: 'login' | 'register' | 'forgot-password';
  onSubmit: (data: any) => Promise<void>;
  onSwitchForm?: (type: 'login' | 'register' | 'forgot-password') => void;
}

export const AuthForm: React.FC<AuthFormProps> = ({ type, onSubmit, onSwitchForm }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    agreeToTerms: false,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const router = useRouter();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const validateForm = (): boolean => {
    if (!formData.email || !formData.email.includes('@')) {
      setError('Invalid email address');
      return false;
    }

    if (type !== 'forgot-password' && (!formData.password || formData.password.length < 8)) {
      setError('Password must be at least 8 characters');
      return false;
    }

    if (type === 'register') {
      if (!formData.firstName || !formData.lastName) {
        setError('First and last name are required');
        return false;
      }
      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match');
        return false;
      }
      if (!formData.agreeToTerms) {
        setError('You must agree to the terms and conditions');
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!validateForm()) return;

    setLoading(true);
    try {
      await onSubmit(formData);
      setSuccess(
        type === 'register'
          ? 'Account created successfully! Redirecting...'
          : type === 'forgot-password'
            ? 'Check your email for password reset link'
            : 'Logged in successfully! Redirecting...'
      );

      setTimeout(() => {
        if (type !== 'forgot-password') {
          router.push(type === 'login' ? '/dashboard' : '/login');
        }
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto bg-white rounded-lg shadow-lg p-8">
      {/* Header */}
      <div className="mb-6 text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {type === 'login'
            ? 'Welcome Back'
            : type === 'register'
              ? 'Create Account'
              : 'Reset Password'}
        </h1>
        <p className="text-gray-600">
          {type === 'login'
            ? 'Sign in to your account'
            : type === 'register'
              ? 'Join us to find your dream property'
              : 'Enter your email to receive password reset instructions'}
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
          <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {/* Success Alert */}
      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2">
          <AlertCircle size={20} className="text-green-600 flex-shrink-0 mt-0.5" />
          <p className="text-green-700 text-sm">{success}</p>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Register: Name Fields */}
        {type === 'register' && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="firstName"
                  className="block text-sm font-semibold text-gray-700 mb-1"
                >
                  First Name
                </label>
                <input
                  id="firstName"
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  placeholder="John"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={loading}
                  required
                />
              </div>
              <div>
                <label
                  htmlFor="lastName"
                  className="block text-sm font-semibold text-gray-700 mb-1"
                >
                  Last Name
                </label>
                <input
                  id="lastName"
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  placeholder="Doe"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={loading}
                  required
                />
              </div>
            </div>
          </>
        )}

        {/* Email Field */}
        <div>
          <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-1">
            Email Address
          </label>
          <div className="flex items-center bg-gray-100 rounded-lg px-4 py-2">
            <Mail size={18} className="text-gray-400 mr-2" />
            <input
              id="email"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="you@example.com"
              className="flex-1 bg-transparent outline-none text-gray-900 placeholder-gray-500"
              disabled={loading}
              required
            />
          </div>
        </div>

        {/* Password Field */}
        {type !== 'forgot-password' && (
          <>
            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-1">
                Password
              </label>
              <div className="flex items-center bg-gray-100 rounded-lg px-4 py-2">
                <Lock size={18} className="text-gray-400 mr-2" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="••••••••"
                  className="flex-1 bg-transparent outline-none text-gray-900 placeholder-gray-500"
                  disabled={loading}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Confirm Password (Register only) */}
            {type === 'register' && (
              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-sm font-semibold text-gray-700 mb-1"
                >
                  Confirm Password
                </label>
                <div className="flex items-center bg-gray-100 rounded-lg px-4 py-2">
                  <Lock size={18} className="text-gray-400 mr-2" />
                  <input
                    id="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    placeholder="••••••••"
                    className="flex-1 bg-transparent outline-none text-gray-900 placeholder-gray-500"
                    disabled={loading}
                    required
                  />
                </div>
              </div>
            )}
          </>
        )}

        {/* Terms (Register only) */}
        {type === 'register' && (
          <div className="flex items-start gap-2">
            <input
              id="agreeToTerms"
              type="checkbox"
              name="agreeToTerms"
              checked={formData.agreeToTerms}
              onChange={handleInputChange}
              className="mt-1 w-4 h-4 border border-gray-300 rounded text-blue-600 outline-none"
              disabled={loading}
              required
            />
            <label htmlFor="agreeToTerms" className="text-sm text-gray-600">
              I agree to the{' '}
              <a href="/terms" className="text-blue-600 hover:underline">
                Terms and Conditions
              </a>{' '}
              and{' '}
              <a href="/privacy" className="text-blue-600 hover:underline">
                Privacy Policy
              </a>
            </label>
          </div>
        )}

        {/* Forgot Password Link (Login only) */}
        {type === 'login' && (
          <div className="text-right">
            <button
              type="button"
              onClick={() => onSwitchForm?.('forgot-password')}
              className="text-sm text-blue-600 hover:underline"
            >
              Forgot password?
            </button>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 rounded-lg transition-colors mt-6"
        >
          {loading
            ? 'Processing...'
            : type === 'login'
              ? 'Sign In'
              : type === 'register'
                ? 'Create Account'
                : 'Send Reset Link'}
        </button>

        {/* Switch Form Links */}
        <div className="text-center pt-2">
          {type === 'login' && (
            <p className="text-gray-600">
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => onSwitchForm?.('register')}
                className="text-blue-600 hover:underline font-semibold"
              >
                Sign up
              </button>
            </p>
          )}
          {type === 'register' && (
            <p className="text-gray-600">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => onSwitchForm?.('login')}
                className="text-blue-600 hover:underline font-semibold"
              >
                Sign in
              </button>
            </p>
          )}
          {type === 'forgot-password' && (
            <button
              type="button"
              onClick={() => onSwitchForm?.('login')}
              className="text-blue-600 hover:underline font-semibold text-sm"
            >
              Back to login
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default AuthForm;
