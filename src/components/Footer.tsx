import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="mt-auto py-6 border-t border-slate-200 bg-white/80 backdrop-blur-xs text-center text-xs text-slate-500">
      <div className="max-w-4xl mx-auto px-4 space-y-1.5">
        <p className="font-semibold text-slate-700">
          &copy; Transverse Inc for Kryztalcorp Ind. (Contact: 07079094334, kryzalcorp@gmail.com)
        </p>
        <p className="text-slate-600">
          Address: Makera main plaza, kakuri, kaduna &middot; Powered by{' '}
          <strong className="text-emerald-800 font-extrabold tracking-wide">STELLA AI</strong> with{' '}
          <strong className="text-emerald-800 font-extrabold tracking-wide">ZVEZDA logic</strong>
        </p>
        <p className="text-[11px] text-slate-400">
          Independent Promotional &amp; Cadre Evaluation Preparatory Simulator &middot; Offline PWA Enabled
        </p>
      </div>
    </footer>
  );
};
