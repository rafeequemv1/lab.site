import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getSubdomainData } from '@/lib/subdomains';
import { protocol, rootDomain } from '@/lib/utils';

export async function generateMetadata({
  params
}: {
  params: Promise<{ subdomain: string }>;
}): Promise<Metadata> {
  const { subdomain } = await params;
  const subdomainData = await getSubdomainData(subdomain);

  if (!subdomainData) {
    return {
      title: rootDomain
    };
  }

  return {
    title: `${subdomain}.${rootDomain}`,
    description: `Subdomain page for ${subdomain}.${rootDomain}`
  };
}

export default async function SubdomainPage({
  params
}: {
  params: Promise<{ subdomain: string }>;
}) {
  const { subdomain } = await params;
  const subdomainData = await getSubdomainData(subdomain);

  if (!subdomainData) {
    notFound();
  }

  const homeUrl = `${protocol}://${rootDomain}`;

  if (subdomainData.template === 'minimal') {
    return (
      <div className="min-h-screen bg-white p-6 md:p-10">
        <div className="mx-auto max-w-2xl">
          <div className="flex justify-end">
            <Link
              href={homeUrl}
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              {rootDomain}
            </Link>
          </div>
          <div className="mt-20 text-center">
            <div className="text-7xl mb-6">{subdomainData.emoji}</div>
            <h1 className="text-3xl font-bold text-gray-900">
              {subdomainData.title || `${subdomain}.${rootDomain}`}
            </h1>
            <p className="mt-3 text-gray-600">
              {subdomainData.bio || 'Welcome to my profile page.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-blue-50 to-white p-4">
      <div className="absolute top-4 right-4">
        <Link
          href={homeUrl}
          className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          {rootDomain}
        </Link>
      </div>
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="text-9xl mb-6">{subdomainData.emoji}</div>
          <h1 className="text-4xl font-bold tracking-tight text-gray-900">
            {subdomainData.title || `Welcome to ${subdomain}.${rootDomain}`}
          </h1>
          <p className="mt-3 text-lg text-gray-600">
            {subdomainData.bio || 'This is your custom subdomain page'}
          </p>
        </div>
      </div>
    </div>
  );
}
