'use server';

import { resolveCname } from 'node:dns/promises';
import { redis } from '@/lib/redis';
import { isValidIcon } from '@/lib/subdomains';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { rootDomain, protocol } from '@/lib/utils';
import { createSupabaseServerClient } from '@/lib/supabase/server';

const customDomainCnameTarget =
  process.env.CUSTOM_DOMAIN_CNAME_TARGET || 'cname.rafeeque.com';

function sanitizeDomain(value: string) {
  return value.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');
}

type SiteRecord = {
  title: string;
  bio: string;
  emoji: string;
  template: 'hero' | 'minimal';
  isPublished: boolean;
  createdAt: number;
  ownerEmail: string;
};

async function requireUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return null;
  }

  return user;
}

export async function createSubdomainAction(
  prevState: any,
  formData: FormData
) {
  const user = await requireUser();
  if (!user) {
    return { error: 'Please sign in first to publish your website.' };
  }

  const subdomain = formData.get('subdomain') as string;
  const icon = formData.get('icon') as string;
  const title = String(formData.get('title') || '').trim();
  const bio = String(formData.get('bio') || '').trim();
  const template = String(formData.get('template') || 'hero') as
    | 'hero'
    | 'minimal';
  const isPublished = formData.get('isPublished') === 'on';
  const customDomain = sanitizeDomain(String(formData.get('customDomain') || ''));

  if (!subdomain || !icon || !title || !bio) {
    return {
      success: false,
      error: 'Subdomain, title, bio, and icon are required.'
    };
  }

  if (!isValidIcon(icon)) {
    return {
      subdomain,
      title,
      bio,
      template,
      icon,
      success: false,
      error: 'Please enter a valid emoji (maximum 10 characters)'
    };
  }

  const sanitizedSubdomain = subdomain.toLowerCase().replace(/[^a-z0-9-]/g, '');

  if (sanitizedSubdomain !== subdomain) {
    return {
      subdomain,
      title,
      bio,
      template,
      icon,
      success: false,
      error:
        'Subdomain can only have lowercase letters, numbers, and hyphens. Please try again.'
    };
  }

  const subdomainAlreadyExists = await redis.get(
    `subdomain:${sanitizedSubdomain}`
  );
  if (subdomainAlreadyExists) {
    return {
      subdomain,
      title,
      bio,
      template,
      icon,
      customDomain,
      success: false,
      error: 'This subdomain is already taken'
    };
  }

  await redis.set(`subdomain:${sanitizedSubdomain}`, {
    title,
    bio,
    emoji: icon,
    template,
    isPublished,
    ownerEmail: user.email ?? '',
    createdAt: Date.now()
  } satisfies SiteRecord);

  if (customDomain) {
    const domainPattern =
      /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/;
    if (!domainPattern.test(customDomain)) {
      return {
        subdomain,
        title,
        bio,
        template,
        icon,
        customDomain,
        success: false,
        error: 'Invalid custom domain format. Example: domain.com'
      };
    }

    const existingDomain = await redis.get(`custom-domain:${customDomain}`);
    if (existingDomain) {
      return {
        subdomain,
        title,
        bio,
        template,
        icon,
        customDomain,
        success: false,
        error: 'This custom domain is already connected.'
      };
    }

    let status: 'pending' | 'active' | 'failed' = 'pending';
    try {
      const cnames = await resolveCname(customDomain);
      const hasTarget = cnames.some(
        (value) =>
          value.toLowerCase().replace(/\.$/, '') ===
          customDomainCnameTarget.toLowerCase().replace(/\.$/, '')
      );
      status = hasTarget ? 'active' : 'pending';
    } catch {
      status = 'pending';
    }

    await redis.set(`custom-domain:${customDomain}`, {
      subdomain: sanitizedSubdomain,
      cnameTarget: customDomainCnameTarget,
      status,
      createdAt: Date.now()
    });

    if (status === 'active') {
      await redis.set(`domain:${customDomain}`, {
        subdomain: sanitizedSubdomain
      });
    }
  }

  if (!isPublished) {
    revalidatePath('/admin');
    return { success: true };
  }

  redirect(`${protocol}://${sanitizedSubdomain}.${rootDomain}`);
}

export async function deleteSubdomainAction(
  prevState: any,
  formData: FormData
) {
  const user = await requireUser();
  if (!user) {
    return { error: 'Please sign in first.' };
  }

  const subdomain = formData.get('subdomain');
  const normalizedSubdomain = String(subdomain || '')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '');

  const record = await redis.get<SiteRecord>(`subdomain:${normalizedSubdomain}`);
  if (!record || record.ownerEmail !== user.email) {
    return { error: 'Site not found.' };
  }

  await redis.del(`subdomain:${normalizedSubdomain}`);

  const customDomainKeys = await redis.keys('custom-domain:*');
  if (customDomainKeys.length > 0) {
    const values = await redis.mget<{ subdomain?: string }[]>(...customDomainKeys);
    for (let i = 0; i < customDomainKeys.length; i++) {
      const domainKey = customDomainKeys[i];
      const value = values[i];
      if (value?.subdomain === normalizedSubdomain) {
        const domain = domainKey.replace('custom-domain:', '');
        await redis.del(domainKey);
        await redis.del(`domain:${domain}`);
      }
    }
  }

  revalidatePath('/admin');
  return { success: 'Domain deleted successfully' };
}

export async function togglePublishAction(_prevState: any, formData: FormData) {
  const user = await requireUser();
  if (!user) {
    return { error: 'Please sign in first.' };
  }

  const subdomain = String(formData.get('subdomain') || '')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '');
  const isPublished = formData.get('isPublished') === 'true';
  const record = await redis.get<SiteRecord>(`subdomain:${subdomain}`);
  if (!record || record.ownerEmail !== user.email) {
    return { error: 'Site not found.' };
  }

  await redis.set(`subdomain:${subdomain}`, {
    ...record,
    isPublished
  });
  revalidatePath('/admin');
  return { success: isPublished ? 'Site published.' : 'Site unpublished.' };
}

export async function addCustomDomainAction(_prevState: any, formData: FormData) {
  const user = await requireUser();
  if (!user) {
    return { error: 'Please sign in first.' };
  }

  const subdomain = String(formData.get('subdomain') || '')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '');
  const customDomain = sanitizeDomain(String(formData.get('domain') || ''));

  const site = await redis.get<SiteRecord>(`subdomain:${subdomain}`);
  if (!site || site.ownerEmail !== user.email) {
    return { error: 'Site not found.' };
  }

  const domainPattern =
    /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/;
  if (!domainPattern.test(customDomain)) {
    return { error: 'Invalid domain format. Example: domain.com' };
  }
  if (customDomain.endsWith(rootDomain)) {
    return { error: `Use an external domain, not *.${rootDomain}` };
  }
  const existing = await redis.get(`custom-domain:${customDomain}`);
  if (existing) {
    return { error: 'This custom domain is already connected.' };
  }

  await redis.set(`custom-domain:${customDomain}`, {
    subdomain,
    cnameTarget: customDomainCnameTarget,
    status: 'pending',
    createdAt: Date.now()
  });
  revalidatePath('/admin');
  return {
    success: `Domain added. Set CNAME ${customDomain} -> ${customDomainCnameTarget}, then verify.`
  };
}

export async function verifyCustomDomainAction(_prevState: any, formData: FormData) {
  const user = await requireUser();
  if (!user) {
    return { error: 'Please sign in first.' };
  }

  const customDomain = sanitizeDomain(String(formData.get('domain') || ''));
  const mapping = await redis.get<{
    subdomain: string;
    cnameTarget: string;
    status: 'pending' | 'active' | 'failed';
    createdAt: number;
  }>(`custom-domain:${customDomain}`);

  if (!mapping) {
    return { error: 'Domain not found.' };
  }
  const site = await redis.get<SiteRecord>(`subdomain:${mapping.subdomain}`);
  if (!site || site.ownerEmail !== user.email) {
    return { error: 'You are not allowed to manage this domain.' };
  }

  try {
    const cnames = await resolveCname(customDomain);
    const hasTarget = cnames.some(
      (value) =>
        value.toLowerCase().replace(/\.$/, '') ===
        customDomainCnameTarget.toLowerCase().replace(/\.$/, '')
    );

    if (!hasTarget) {
      await redis.set(`custom-domain:${customDomain}`, {
        ...mapping,
        status: 'failed'
      });
      return {
        error: `CNAME not detected. Point ${customDomain} to ${customDomainCnameTarget} and retry.`
      };
    }

    await redis.set(`custom-domain:${customDomain}`, {
      ...mapping,
      status: 'active',
      verifiedAt: Date.now()
    });
    await redis.set(`domain:${customDomain}`, { subdomain: mapping.subdomain });
    revalidatePath('/admin');
    return { success: 'Custom domain verified.' };
  } catch {
    return {
      error: `Could not resolve CNAME. Ensure ${customDomain} points to ${customDomainCnameTarget}.`
    };
  }
}
