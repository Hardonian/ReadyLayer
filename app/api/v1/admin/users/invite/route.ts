import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { emailService } from '@/services/email/sender';
import { notificationService } from '@/services/notification-service';
import { rateLimit } from '@/lib/rate-limiting';

interface InviteeData {
  email: string;
  role: 'admin' | 'member' | 'viewer';
}

interface InviteRequest {
  organizationId: string;
  invitees: InviteeData[];
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limiting
    const rateLimitResult = await rateLimit('invite-users', user.id, {
      points: 10,
      duration: 3600,
    });
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      );
    }

    const body: InviteRequest = await request.json();
    const { organizationId, invitees } = body;

    // Validate input
    if (!organizationId || !invitees || !Array.isArray(invitees)) {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }

    // Verify user is org admin
    const { data: orgMember } = await supabase
      .from('org_members')
      .select('role')
      .eq('organization_id', organizationId)
      .eq('user_id', user.id)
      .single();

    if (!orgMember || orgMember.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only org admins can invite users' },
        { status: 403 }
      );
    }

    // Get organization details
    const { data: org } = await supabase
      .from('organizations')
      .select('id, name')
      .eq('id', organizationId)
      .single();

    if (!org) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    const createdUsers = [];
    const errors: { email: string; error: string }[] = [];

    // Process each invitee
    for (const invitee of invitees) {
      if (!invitee.email || !invitee.role) {
        errors.push({
          email: invitee.email || 'unknown',
          error: 'Email and role are required',
        });
        continue;
      }

      try {
        // Check if user already exists in organization
        const { data: existing } = await supabase
          .from('org_members')
          .select('id')
          .eq('organization_id', organizationId)
          .eq('email', invitee.email)
          .single();

        if (existing) {
          errors.push({
            email: invitee.email,
            error: 'User already in organization',
          });
          continue;
        }

        // Create pending invite
        const { data: newMember, error: insertError } = await supabase
          .from('org_members')
          .insert({
            organization_id: organizationId,
            email: invitee.email,
            role: invitee.role,
            status: 'pending',
            invited_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (insertError) throw insertError;

        createdUsers.push(newMember);

        // Send invitation email
        const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://readylayer.io'}/auth/signin?invite=${newMember.id}`;

        try {
          await emailService.sendInvitationEmail(
            invitee.email,
            org.name,
            inviteUrl,
            invitee.role
          );
        } catch (emailErr) {
          console.error(`Failed to send email to ${invitee.email}:`, emailErr);
          // Don't fail the invite if email fails, but log it
        }

        // Send in-app notification
        await notificationService.sendNotification({
          organizationId,
          type: 'invitation',
          title: `${invitee.email} has been invited`,
          message: `${invitee.email} has been invited to join as ${invitee.role}`,
          channels: ['in-app'],
          priority: 'normal',
        });
      } catch (err) {
        errors.push({
          email: invitee.email,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    return NextResponse.json(
      {
        users: createdUsers,
        errors,
        summary: {
          invited: createdUsers.length,
          failed: errors.length,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error inviting users:', error);
    return NextResponse.json(
      { error: 'Failed to process invitations' },
      { status: 500 }
    );
  }
}
