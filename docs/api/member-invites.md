# Trip member invites

## How it works today

### Organizer
1. Open a trip → **Members**
2. Click **Invite members +**
3. Enter the teammate’s email
4. Send invite
   - If they already have a Trip Hunter account, they appear as **Invited** and get an in-app notification
   - If they do not, they appear as **Waiting for signup**. The invite is claimed when they create an account with that email

### Invitee (where they get it)
1. Sign in (or sign up with the invited email)
2. See the invite in:
   - **Notifications** (in-app `trip_invite`)
   - **Dashboard** → “Invites for you”
   - The trip itself under **Members** (Accept / Maybe / Decline banner)
3. Tap **Accept**, **Maybe**, or **Decline**
4. Status updates immediately

There is still **no outbound email** — invites are stored in-app. Unregistered invites live in `trip_email_invites` until signup (migration 017).

## Status mapping

| DB `trip_members.rsvp_status` | UI status | Attendance |
| --- | --- | --- |
| `pending` | Invited | — |
| `accepted` | Accepted | Going |
| `declined` | Declined | Not going |
| `maybe` | Maybe | — |
| (email invite, no account yet) | Waiting for signup | — |

## APIs

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/api/v1/trips/:tripId/members` | Owner invites by email (account or pending signup) |
| `GET` | `/api/v1/me/invites` | Pending invites for current user (also claims waiting email invites) |
| `PATCH` | `/api/v1/trips/:tripId/members/me` | Accept/decline/maybe (`rsvpStatus`) |
| `GET` | `/api/v1/notifications` | Includes `trip_invite` rows |

Trip list also includes trips the user was invited to (not only same-org trips).
