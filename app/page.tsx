import Link from 'next/link';
import { SubdomainForm } from './subdomain-form';
import { rootDomain } from '@/lib/utils';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export default async function HomePage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-white p-4 relative">
      <div className="absolute top-4 right-4">
        <div className="flex items-center gap-3">
          {!user && (
            <Link
              href="/auth/sign-up"
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Sign up
            </Link>
          )}
          <Link
            href={user ? '/admin' : '/auth/sign-in'}
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            {user ? 'Admin' : 'Sign in'}
          </Link>
        </div>
      </div>

      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900">
            {rootDomain}
          </h1>
          <p className="mt-3 text-lg text-gray-600">
            Create your own subdomain with a custom emoji
          </p>
        </div>

        <div className="mt-8 bg-white shadow-md rounded-lg p-6">
          {user ? (
            <SubdomainForm />
          ) : (
            <div className="text-center space-y-3">
              <p className="text-sm text-gray-600">
                Create an account to publish your one-page website and connect
                custom domains.
              </p>
              <div className="flex items-center justify-center gap-3">
                <Link href="/auth/sign-up" className="text-sm text-blue-600 hover:underline">
                  Create account
                </Link>
                <Link href="/auth/sign-in" className="text-sm text-blue-600 hover:underline">
                  Sign in
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
