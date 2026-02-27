'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Trash2, Loader2 } from 'lucide-react';
import Link from 'next/link';
import {
  addCustomDomainAction,
  deleteSubdomainAction,
  togglePublishAction,
  verifyCustomDomainAction
} from '@/app/actions';
import { signOutAction } from '@/app/auth/actions';
import { rootDomain, protocol } from '@/lib/utils';

type Tenant = {
  subdomain: string;
  title: string;
  bio: string;
  emoji: string;
  template: 'hero' | 'minimal';
  isPublished: boolean;
  createdAt: number;
  customDomains: Array<{
    domain: string;
    status: string;
    cnameTarget: string;
  }>;
};

type DeleteState = {
  error?: string;
  success?: string;
};

function DashboardHeader({ userEmail }: { userEmail: string }) {
  return (
    <div className="flex justify-between items-center mb-8">
      <h1 className="text-3xl font-bold">Subdomain Management</h1>
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-500">{userEmail}</span>
        <Link
          href={`${protocol}://${rootDomain}`}
          className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          {rootDomain}
        </Link>
        <form action={signOutAction}>
          <Button type="submit" variant="outline" size="sm">
            Sign out
          </Button>
        </form>
      </div>
    </div>
  );
}

function TenantGrid({
  tenants,
  deleteAction,
  deletePending,
  publishAction,
  publishPending,
  addDomainAction,
  addDomainPending,
  verifyDomainAction,
  verifyDomainPending
}: {
  tenants: Tenant[];
  deleteAction: (formData: FormData) => void;
  deletePending: boolean;
  publishAction: (formData: FormData) => void;
  publishPending: boolean;
  addDomainAction: (formData: FormData) => void;
  addDomainPending: boolean;
  verifyDomainAction: (formData: FormData) => void;
  verifyDomainPending: boolean;
}) {
  if (tenants.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-gray-500">No subdomains have been created yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {tenants.map((tenant) => (
        <Card key={tenant.subdomain}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl">{tenant.subdomain}</CardTitle>
              <form action={deleteAction}>
                <input
                  type="hidden"
                  name="subdomain"
                  value={tenant.subdomain}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  type="submit"
                  disabled={deletePending}
                  className="text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                >
                  {deletePending ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Trash2 className="h-5 w-5" />
                  )}
                </Button>
              </form>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-4xl">{tenant.emoji}</div>
              <div className="text-sm text-gray-500">
                Created: {new Date(tenant.createdAt).toLocaleDateString()}
              </div>
            </div>
            <h3 className="mt-3 font-semibold text-gray-900">{tenant.title}</h3>
            <p className="mt-1 text-sm text-gray-600">{tenant.bio}</p>
            <div className="mt-2 text-xs text-gray-500">
              Template: {tenant.template}
            </div>

            <div className="mt-3 flex items-center gap-2">
              <form action={publishAction}>
                <input type="hidden" name="subdomain" value={tenant.subdomain} />
                <input
                  type="hidden"
                  name="isPublished"
                  value={String(!tenant.isPublished)}
                />
                <Button type="submit" size="sm" disabled={publishPending}>
                  {publishPending
                    ? 'Updating...'
                    : tenant.isPublished
                      ? 'Unpublish'
                      : 'Publish'}
                </Button>
              </form>
              <span className="text-xs text-gray-500">
                {tenant.isPublished ? 'Live' : 'Draft'}
              </span>
            </div>
            <div className="mt-4">
              <a
                href={`${protocol}://${tenant.subdomain}.${rootDomain}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline text-sm"
              >
                Visit subdomain →
              </a>
            </div>

            <div className="mt-4 border-t pt-4">
              <form action={addDomainAction} className="flex gap-2">
                <input type="hidden" name="subdomain" value={tenant.subdomain} />
                <Input name="domain" placeholder="domain.com" className="h-8 text-xs" />
                <Button type="submit" size="sm" disabled={addDomainPending}>
                  {addDomainPending ? 'Adding...' : 'Add'}
                </Button>
              </form>
              {tenant.customDomains.length > 0 && (
                <div className="mt-3 space-y-2">
                  {tenant.customDomains.map((domain) => (
                    <div key={domain.domain} className="rounded border p-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span>{domain.domain}</span>
                        <span className="capitalize text-gray-500">
                          {domain.status}
                        </span>
                      </div>
                      <div className="mt-1 text-gray-500">
                        CNAME to {domain.cnameTarget}
                      </div>
                      <form action={verifyDomainAction} className="mt-2">
                        <input type="hidden" name="domain" value={domain.domain} />
                        <Button
                          type="submit"
                          size="sm"
                          variant="outline"
                          disabled={verifyDomainPending}
                        >
                          {verifyDomainPending ? 'Verifying...' : 'Verify'}
                        </Button>
                      </form>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function AdminDashboard({
  tenants,
  userEmail
}: {
  tenants: Tenant[];
  userEmail: string;
}) {
  const [state, deleteAction, deletePending] = useActionState<DeleteState, FormData>(
    deleteSubdomainAction,
    {}
  );
  const [publishState, publishAction, publishPending] = useActionState<
    DeleteState,
    FormData
  >(togglePublishAction, {});
  const [domainState, addDomainAction, addDomainPending] = useActionState<
    DeleteState,
    FormData
  >(addCustomDomainAction, {});
  const [verifyState, verifyDomainAction, verifyDomainPending] = useActionState<
    DeleteState,
    FormData
  >(verifyCustomDomainAction, {});

  return (
    <div className="space-y-6 relative p-4 md:p-8">
      <DashboardHeader userEmail={userEmail} />
      <TenantGrid
        tenants={tenants}
        deleteAction={deleteAction}
        deletePending={deletePending}
        publishAction={publishAction}
        publishPending={publishPending}
        addDomainAction={addDomainAction}
        addDomainPending={addDomainPending}
        verifyDomainAction={verifyDomainAction}
        verifyDomainPending={verifyDomainPending}
      />

      {state.error && (
        <div className="fixed bottom-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded shadow-md">
          {state.error}
        </div>
      )}

      {state.success && (
        <div className="fixed bottom-4 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded shadow-md">
          {state.success}
        </div>
      )}
      {publishState.error && (
        <div className="fixed bottom-20 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded shadow-md">
          {publishState.error}
        </div>
      )}
      {publishState.success && (
        <div className="fixed bottom-20 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded shadow-md">
          {publishState.success}
        </div>
      )}
      {domainState.error && (
        <div className="fixed bottom-36 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded shadow-md">
          {domainState.error}
        </div>
      )}
      {domainState.success && (
        <div className="fixed bottom-36 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded shadow-md">
          {domainState.success}
        </div>
      )}
      {verifyState.error && (
        <div className="fixed bottom-52 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded shadow-md">
          {verifyState.error}
        </div>
      )}
      {verifyState.success && (
        <div className="fixed bottom-52 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded shadow-md">
          {verifyState.success}
        </div>
      )}
    </div>
  );
}
