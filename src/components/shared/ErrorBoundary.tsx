"use client";

import React from "react";

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallbackUrl?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      const fallbackUrl = this.props.fallbackUrl ?? "/";

      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
          <div className="w-full max-w-md bg-white/70 backdrop-blur-md border border-white/50 rounded-2xl shadow-xl p-8 text-center">
            {/* Logo */}
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 opacity-60">
                <svg
                  viewBox="0 0 64 64"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-full h-full"
                >
                  <path
                    d="M32 4L52 20V28H12V20L32 4Z"
                    fill="#6366f1"
                    opacity="0.8"
                  />
                  <rect x="12" y="28" width="40" height="6" rx="3" fill="#6366f1" opacity="0.6" />
                  <path
                    d="M20 28L32 8L44 28"
                    stroke="#4f46e5"
                    strokeWidth="2"
                    strokeLinejoin="round"
                  />
                  <rect x="8" y="52" width="48" height="8" rx="4" fill="#6366f1" opacity="0.5" />
                  <rect x="16" y="34" width="4" height="18" fill="#6366f1" opacity="0.4" />
                  <rect x="30" y="34" width="4" height="18" fill="#6366f1" opacity="0.4" />
                  <rect x="44" y="34" width="4" height="18" fill="#6366f1" opacity="0.4" />
                </svg>
              </div>
            </div>

            {/* Error icon */}
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-red-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                  />
                </svg>
              </div>
            </div>

            <h1 className="text-xl font-semibold text-slate-800 mb-2">
              予期しないエラーが発生しました
            </h1>
            <p className="text-sm text-slate-500 mb-8">
              申し訳ございません。問題が解決しない場合はサポートにお問い合わせください。
            </p>

            <div className="flex flex-col gap-3">
              <a
                href={fallbackUrl}
                className="w-full inline-flex items-center justify-center px-4 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors"
              >
                ダッシュボードに戻る
              </a>
              <button
                onClick={this.handleRetry}
                className="w-full inline-flex items-center justify-center px-4 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
              >
                再試行
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
