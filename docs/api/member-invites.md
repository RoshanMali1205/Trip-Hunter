# Trip member invites

## How it works today

### Organizer
1. Open a trip → **Members**
2. Click **Invite members +**
3. Enter the teammate’s **existing Trip Hunter account email**
4. Send invite → they appear as **Invited**

### Invitee (where they get it)
1. Must already have signed up with that email
2. Sign in
3. See the invite in:
   - **Notifications** (in-app `trip_invite`)
   - **Dashboard** → “Invites for you”
   - The trip itself under **Members** (Accept / Decline banner)
4. Tap **Accept** or **Decline**
5. Status updates immediately: Invited → Accepted/Declined (attendance Going / Not going)

There is **no email** yet — invites are in-app only.

## Status mapping

| DB `trip_members.rsvp_status` | UI status | Attendance |
| --- | --- | --- |
| `pending` | Invited | — |
| `accepted` | Accepted | Going |
| `declined` | Declined | Not going |
| `maybe` | Maybe | — |

## APIs

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/api/v1/trips/:tripId/members` | Owner invites by email |
| `GET` | `/api/v1/me/invites` | Pending invites for current user |
| `PATCH` | `/api/v1/trips/:tripId/members/me` | Accept/decline (`rsvpStatus`) |
| `GET` | `/api/v1/notifications` | Includes `trip_invite` rows |

Trip list also includes trips the user was invited to (not only same-org trips).
