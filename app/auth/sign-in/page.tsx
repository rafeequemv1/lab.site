import Link from 'next/link';
import { SignInForm } from './sign-in-form';
import { rootDomain } from '@/lib/utils';

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md rounded-xl border bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-gray-900">Sign in</h1>
        <p className="mt-2 text-sm text-gray-600">
          Enter your email and we will send a secure magic link.
        </p>

        <div className="mt-6">
          <SignInForm />
        </div>

        <p className="mt-5 text-xs text-gray-500">
          Back to{' '}
          <Link href="/" className="text-blue-600 hover:underline">
            {rootDomain}
          </Link>
        </p>
      </div>
    </div>
  );
}
