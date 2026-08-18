import {
  getSupabaseAdmin,
  isSupabaseAdminConfigured,
} from '../../config/supabase.js';

interface TenancyInput {
  userId: string;
  email: string;
  displayName: string;
}

/**
 * Accounts created before the signup trigger (or if the trigger was missing)
 * can authenticate but have no `profiles` / `org_members` row. Trip create
 * then fails with ORGANIZATION_REQUIRED or a `created_by` FK error.
 *
 * This heals that on first authenticated API call.
 */
export async function ensureActiveOrganization(
  input: TenancyInput,
): Promise<string | null> {
  if (!isSupabaseAdminConfigured()) {
    return null;
  }

  const db = getSupabaseAdmin();
  const profileOk = await ensureProfile(db, input);
  if (!profileOk) {
    return null;
  }

  const { data: existing } = await db
    .from('org_members')
    .select('organization_id, status')
    .eq('user_id', input.userId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (existing?.organization_id && existing.status === 'active') {
    return String(existing.organization_id);
  }

  if (
    existing?.organization_id &&
    existing.status !== 'suspended' &&
    existing.status !== 'removed'
  ) {
    const { error } = await db
      .from('org_members')
      .update({
        status: 'active',
        joined_at: new Date().toISOString(),
      })
      .eq('user_id', input.userId)
      .eq('organization_id', existing.organization_id);

    if (!error) {
      return String(existing.organization_id);
    }
    console.warn('Failed to activate org membership', error.message);
  }

  const orgId = await findOrCreateOrganization(db, input);
  if (!orgId) {
    return null;
  }

  const { error: memberError } = await db.from('org_members').upsert(
    {
      organization_id: orgId,
      user_id: input.userId,
      role: 'member',
      status: 'active',
      joined_at: new Date().toISOString(),
    },
    { onConflict: 'organization_id,user_id' },
  );

  if (memberError) {
    console.warn('Failed to ensure org membership', memberError.message);
    const { data: retry } = await db
      .from('org_members')
      .select('organization_id')
      .eq('user_id', input.userId)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle();
    return retry?.organization_id ? String(retry.organization_id) : null;
  }

  return orgId;
}

async function ensureProfile(
  db: ReturnType<typeof getSupabaseAdmin>,
  input: TenancyInput,
): Promise<boolean> {
  const { data: existing } = await db
    .from('profiles')
    .select('id')
    .eq('id', input.userId)
    .maybeSingle();

  if (existing?.id) {
    return true;
  }

  const fallbackEmail = `${input.userId.replaceAll('-', '')}@users.local`;
  const email = input.email.trim() || fallbackEmail;
  const displayName =
    input.displayName.trim() || email.split('@')[0] || 'User';

  const { error } = await db.from('profiles').insert({
    id: input.userId,
    email,
    display_name: displayName,
  });

  if (!error) {
    return true;
  }

  // Unique email taken by a different profile — retry with a synthetic address.
  if (error.code === '23505') {
    const { data: again } = await db
      .from('profiles')
      .select('id')
      .eq('id', input.userId)
      .maybeSingle();
    if (again?.id) {
      return true;
    }

    const { error: retryError } = await db.from('profiles').insert({
      id: input.userId,
      email: fallbackEmail,
      display_name: displayName,
    });
    if (!retryError || retryError.code === '23505') {
      return true;
    }
    console.warn('Failed to ensure profile', retryError.message);
    return false;
  }

  console.warn('Failed to ensure profile', error.message);
  return false;
}

async function findOrCreateOrganization(
  db: ReturnType<typeof getSupabaseAdmin>,
  input: TenancyInput,
): Promise<string | null> {
  const { data: firstOrg } = await db
    .from('organizations')
    .select('id')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (firstOrg?.id) {
    return String(firstOrg.id);
  }

  const slug = `org-${input.userId.replaceAll('-', '').slice(0, 12)}`;
  const name = `${input.displayName.trim() || 'My team'}'s workspace`;
  const inserted = await db
    .from('organizations')
    .insert({ name, slug })
    .select('id')
    .single();

  if (inserted.data?.id) {
    return String(inserted.data.id);
  }

  const { data: raced } = await db
    .from('organizations')
    .select('id')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (raced?.id) {
    return String(raced.id);
  }

  console.warn(
    'Failed to create organization',
    inserted.error?.message ?? 'unknown error',
  );
  return null;
}
