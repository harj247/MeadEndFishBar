import { useState } from 'react';
import { Fish, Mail, Clock, CheckCircle, Loader2, User } from 'lucide-react';
import heroBanner from '@/assets/hero-banner.jpg';
import { supabase } from '@/lib/supabase';
import { FunctionsHttpError } from '@supabase/supabase-js';

export default function ComingSoon() {
  const [name, setName]       = useState('');
  const [email, setEmail]     = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError]     = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    setLoading(true);
    setError('');

    const { data, error: fnError } = await supabase.functions.invoke('register-interest', {
      body: { name: name.trim(), email: email.trim() },
    });

    if (fnError) {
      let msg = fnError.message;
      if (fnError instanceof FunctionsHttpError) {
        try { const t = await fnError.context?.text(); msg = t || msg; } catch { /* ignore */ }
      }
      console.error('[ComingSoon] register-interest error:', msg);
      setError('Something went wrong. Please try again.');
      setLoading(false);
      return;
    }

    console.log('[ComingSoon] registration result:', data);
    setSubmitted(true);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#0f1f3d] flex flex-col">

      {/* Background hero with overlay */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
        <img
          src={heroBanner}
          alt=""
          className="w-full h-full object-cover opacity-10"
          draggable={false}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0f1f3d]/60 via-[#0f1f3d]/80 to-[#0f1f3d]" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-16">

        {/* Logo / brand mark */}
        <div className="flex items-center gap-3 mb-10">
          <div className="w-14 h-14 bg-[#f5a623] rounded-2xl flex items-center justify-center shadow-xl shadow-[#f5a623]/20">
            <Fish className="w-8 h-8 text-[#0f1f3d]" strokeWidth={2.5} />
          </div>
          <div>
            <p className="text-white font-black text-xl leading-tight">Mead End</p>
            <p className="text-[#f5a623] text-sm font-semibold leading-tight">Fish Bar</p>
          </div>
        </div>

        {/* Card */}
        <div className="w-full max-w-lg bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-8 sm:p-10 shadow-2xl text-center">

          {/* Status badge */}
          <div className="inline-flex items-center gap-2 bg-[#f5a623]/15 border border-[#f5a623]/30 rounded-full px-4 py-1.5 mb-6">
            <Clock className="w-3.5 h-3.5 text-[#f5a623]" />
            <span className="text-[#f5a623] text-xs font-bold tracking-wide uppercase">Coming Soon</span>
          </div>

          <h1 className="text-white font-black text-2xl sm:text-3xl leading-tight mb-4">
            We're Making Ordering Easier
          </h1>

          <p className="text-white/70 text-sm sm:text-base leading-relaxed mb-6">
            We're expanding our system to make it more convenient for you to place your order with us.
          </p>

          <div className="bg-[#f5a623]/10 border border-[#f5a623]/20 rounded-2xl px-5 py-4 mb-6 text-left">
            <p className="text-[#f5a623] font-bold text-sm mb-1">Our collection ordering page is coming soon.</p>
            <p className="text-white/60 text-sm leading-relaxed">
              Want to be the first to know when it goes live? Register your interest below and we'll let you know as soon as online collection ordering is available.
            </p>
          </div>

          {/* Registration form / success state */}
          {submitted ? (
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="w-14 h-14 rounded-full bg-green-500/20 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-400" strokeWidth={2} />
              </div>
              <p className="text-white font-bold text-base">You're on the list!</p>
              <p className="text-white/50 text-sm text-center leading-relaxed">
                We'll email <span className="text-white/80 font-semibold">{email}</span> as soon as online ordering goes live.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              {/* Name */}
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Your name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                  className="w-full bg-white border border-gray-300 rounded-xl pl-10 pr-4 py-3 text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:border-[#f5a623] focus:ring-2 focus:ring-[#f5a623]/30 transition-all"
                />
              </div>

              {/* Email */}
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  type="email"
                  placeholder="Your email address"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="w-full bg-white border border-gray-300 rounded-xl pl-10 pr-4 py-3 text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:border-[#f5a623] focus:ring-2 focus:ring-[#f5a623]/30 transition-all"
                />
              </div>

              {error && (
                <p className="text-red-400 text-xs font-semibold text-center">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading || !name.trim() || !email.trim()}
                className="w-full bg-[#f5a623] hover:bg-[#e09615] disabled:opacity-50 disabled:cursor-not-allowed text-[#0f1f3d] font-black py-3.5 px-6 rounded-xl text-sm transition-all duration-200 active:scale-[0.98] shadow-lg shadow-[#f5a623]/20 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Registering…</>
                ) : (
                  <>Register My Interest</>
                )}
              </button>

              <p className="text-white/25 text-xs text-center">
                We'll only email you when ordering goes live. No spam.
              </p>
            </form>
          )}
        </div>

        {/* Footer note */}
        <p className="relative z-10 text-white/20 text-xs mt-10 text-center">
          Mead End Fish Bar &mdash; Biggleswade, Bedfordshire
        </p>
      </div>
    </div>
  );
}
