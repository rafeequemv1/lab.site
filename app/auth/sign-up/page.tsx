import Link from 'next/link';
import { SignUpForm } from './sign-up-form';
import { rootDomain } from '@/lib/utils';

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md rounded-xl border bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-gray-900">Create account</h1>
        <p className="mt-2 text-sm text-gray-600">
          Start building your one-page website and custom domain.
        </p>

        <div className="mt-6">
          <SignUpForm />
        </div>

        <p className="mt-4 text-sm text-gray-600">
          Already have an account?{' '}
          <Link href="/auth/sign-in" className="text-blue-600 hover:underline">
            Sign in
          </Link>
        </p>

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
