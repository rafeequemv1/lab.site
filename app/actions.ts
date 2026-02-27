'use server';

import { resolveCname } from 'node:dns/promises';
import { redis } from '@/lib/redis';
import { isValidIcon } from '@/lib/subdomains';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { rootDomain, protocol } from '@/lib/utils';

const customDomainCnameTarget =
  process.env.CUSTOM_DOMAIN_CNAME_TARGET || 'cname.rafeeque.com';

function sanitizeDomain(value: string) {
  return value.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');
}

export async function createSubdomainAction(
  prevState: any,
  formData: FormData
) {
  const subdomain = formData.get('subdomain') as string;
  const icon = formData.get('icon') as string;
  const customDomain = sanitizeDomain(String(formData.get('customDomain') || ''));

  if (!subdomain || !icon) {
    return { success: false, error: 'Subdomain and icon are required' };
  }

  if (!isValidIcon(icon)) {
    return {
      subdomain,
      icon,
      success: false,
      error: 'Please enter a valid emoji (maximum 10 characters)'
    };
  }

  const sanitizedSubdomain = subdomain.toLowerCase().replace(/[^a-z0-9-]/g, '');

  if (sanitizedSubdomain !== subdomain) {
    return {
      subdomain,
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
      icon,
      customDomain,
      success: false,
      error: 'This subdomain is already taken'
    };
  }

  await redis.set(`subdomain:${sanitizedSubdomain}`, {
    emoji: icon,
    createdAt: Date.now()
  });

  if (customDomain) {
    const domainPattern =
      /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/;
    if (!domainPattern.test(customDomain)) {
      return {
        subdomain,
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

  redirect(`${protocol}://${sanitizedSubdomain}.${rootDomain}`);
}

export async function deleteSubdomainAction(
  prevState: any,
  formData: FormData
) {
  const subdomain = formData.get('subdomain');
  const normalizedSubdomain = String(subdomain || '')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '');

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
