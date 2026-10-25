import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { SignIn, SignUp } from '@clerk/clerk-react';
import { dark } from '@clerk/themes';

const clerkAppearance = {
  baseTheme: dark,
  layout: {
    socialButtonsPlacement: 'bottom',
    socialButtonsVariant: 'blockButton',
    showOptionalFields: false
  },
  variables: {
    colorPrimary: '#6366f1',
    colorPrimaryHover: '#4f46e5',
    colorBackground: '#0b0f19',
    colorInputBackground: '#070a13',
    colorInputText: '#f8fafc',
    colorText: '#f8fafc',
    colorTextSecondary: '#94a3b8',
    colorNeutral: '#f8fafc',
    colorBorder: '#334155',
    borderRadius: '0.75rem',
    fontSize: '0.875rem'
  },
  elements: {
    rootBox: 'w-full flex justify-center',
    card: 'bg-dark-900/95 border border-slate-800 shadow-2xl rounded-2xl w-full max-w-md p-6 sm:p-8 backdrop-blur-xl',
    headerTitle: 'text-white font-bold text-xl tracking-tight text-center',
    headerSubtitle: 'text-slate-400 text-xs text-center mt-1',
    socialButtonsBlockButton: 'bg-dark-950 border border-slate-700/80 hover:bg-dark-800 hover:border-slate-600 text-white font-medium text-xs transition-all duration-200 py-2.5 rounded-xl',
    socialButtonsBlockButtonText: 'text-slate-200 font-medium text-xs',
    dividerLine: 'bg-slate-800',
    dividerText: 'text-slate-400 text-[11px] font-semibold uppercase tracking-wider px-2',
    formFieldLabel: 'text-slate-200 font-semibold text-xs mb-1.5',
    formFieldInput: 'bg-dark-950 border border-slate-700 text-white placeholder-slate-500 rounded-xl focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-sm px-3.5 py-2.5 transition-colors',
    formButtonPrimary: 'bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs py-3 rounded-xl shadow-lg shadow-brand-600/30 transition-all duration-200 mt-2',
    footerActionText: 'text-slate-400 text-xs',
    footerActionLink: 'text-brand-400 hover:text-brand-300 font-semibold text-xs transition-colors ml-1',
    identityPreviewText: 'text-white text-xs font-medium',
    identityPreviewEditButton: 'text-brand-400 hover:text-brand-300 text-xs font-medium',
    formFieldErrorText: 'text-rose-400 text-xs mt-1',
    alert: 'bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs rounded-xl p-3',
    otpCodeFieldInput: 'bg-dark-950 border border-slate-700 text-white text-lg font-mono rounded-lg focus:border-brand-500'
  }
};

export default function AuthPage() {
  const [searchParams] = useSearchParams();
  const isRegister = searchParams.get('mode') === 'register';

  return (
    <div className="w-full flex justify-center">
      {isRegister ? (
        <SignUp
          routing="hash"
          signInUrl="/auth"
          fallbackRedirectUrl="/dashboard"
          appearance={clerkAppearance}
        />
      ) : (
        <SignIn
          routing="hash"
          signUpUrl="/auth?mode=register"
          fallbackRedirectUrl="/dashboard"
          appearance={clerkAppearance}
        />
      )}
    </div>
  );
}
