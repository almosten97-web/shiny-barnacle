import React from 'react';
import { Link } from 'react-router-dom';

const NotFound: React.FC = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Charleen's Scheduling App</p>
        <p className="mt-1 text-xs font-bold uppercase tracking-widest text-slate-500">404</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">Page not found</h1>
        <p className="mt-3 text-sm text-slate-600">
          The link may be outdated or the page has moved. Use one of the actions below to continue.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            to="/"
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Go to Dashboard
          </Link>
          <Link
            to="/login"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
