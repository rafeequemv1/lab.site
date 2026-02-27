import { redis } from '@/lib/redis';

export function isValidIcon(str: string) {
  if (str.length > 10) {
    return false;
  }

  try {
    // Primary validation: Check if the string contains at least one emoji character
    // This regex pattern matches most emoji Unicode ranges
    const emojiPattern = /[\p{Emoji}]/u;
    if (emojiPattern.test(str)) {
      return true;
    }
  } catch (error) {
    // If the regex fails (e.g., in environments that don't support Unicode property escapes),
    // fall back to a simpler validation
    console.warn(
      'Emoji regex validation failed, using fallback validation',
      error
    );
  }

  // Fallback validation: Check if the string is within a reasonable length
  // This is less secure but better than no validation
  return str.length >= 1 && str.length <= 10;
}

type SubdomainData = {
  title?: string;
  bio?: string;
  emoji: string;
  template?: 'hero' | 'minimal';
  isPublished?: boolean;
  ownerEmail?: string;
  createdAt: number;
};

type CustomDomainData = {
  subdomain: string;
  cnameTarget: string;
  status: 'pending' | 'active' | 'failed';
  createdAt: number;
  verifiedAt?: number;
};

export async function getSubdomainData(subdomain: string) {
  const sanitizedSubdomain = subdomain.toLowerCase().replace(/[^a-z0-9-]/g, '');
  const data = await redis.get<SubdomainData>(
    `subdomain:${sanitizedSubdomain}`
  );
  if (!data?.isPublished) {
    return null;
  }
  return data;
}

export async function getAllSubdomains(ownerEmail?: string) {
  const keys = await redis.keys('subdomain:*');

  if (!keys.length) {
    return [];
  }

  const values = await redis.mget<SubdomainData[]>(...keys);
  const customDomainKeys = await redis.keys('custom-domain:*');
  const customDomainValues = customDomainKeys.length
    ? await redis.mget<CustomDomainData[]>(...customDomainKeys)
    : [];
  const customDomainsBySubdomain = new Map<
    string,
    Array<{ domain: string; status: string; cnameTarget: string }>
  >();

  customDomainKeys.forEach((key, index) => {
    const value = customDomainValues[index];
    if (!value?.subdomain) {
      return;
    }
    const current = customDomainsBySubdomain.get(value.subdomain) || [];
    current.push({
      domain: key.replace('custom-domain:', ''),
      status: value.status,
      cnameTarget: value.cnameTarget
    });
    customDomainsBySubdomain.set(value.subdomain, current);
  });

  return keys
    .map((key, index) => {
      const subdomain = key.replace('subdomain:', '');
      const data = values[index];

      return {
        subdomain,
        title: data?.title || subdomain,
        bio: data?.bio || '',
        emoji: data?.emoji || '❓',
        template: data?.template || 'hero',
        isPublished: data?.isPublished ?? false,
        ownerEmail: data?.ownerEmail || '',
        createdAt: data?.createdAt || Date.now(),
        customDomains: customDomainsBySubdomain.get(subdomain) || []
      };
    })
    .filter((site) => !ownerEmail || site.ownerEmail === ownerEmail);
}
