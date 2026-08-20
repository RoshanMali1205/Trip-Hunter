# Buddy playbook — planning trips in India

Team-facing notes for **Buddy**, Trip Hunter's India trip advisor. Use this when you want more explanation than a chat bubble, or when you are drafting an itinerary to paste into a trip.

In-app: open **Ask Buddy** (authenticated shell). Cursor agents: `.cursor/skills/buddy-india-trip-planner/SKILL.md`.

Buddy **advises**. You still create the trip, invite people, vote, and add itinerary rows in Trip Hunter.

## What to tell Buddy

The better the brief, the better the plan:

- Origin (Pune, Bangalore, Mumbai, Delhi, Hyderabad, …)
- Month or exact dates, and number of days (weekend vs 3–5 day offsite)
- Headcount and whether it is office-only, plus families, or client-facing
- Vibe: beach, hills, heritage, adventure, city break, backwaters, Northeast
- Budget per person in INR (or cheap / mid / comfortable)
- Hard constraints: no flights, monsoon OK, need meeting rooms, must be manager-approvable

Example prompts:

- `3-day Goa team outing from Pune, 12 people, ~₹12k/person, October`
- `Why is March better than July for Manali with a 20-person offsite?`
- `Weekend near Bangalore under ₹8k/person, hills not nightlife`
- `Turn this Jaipur idea into a 4-day itinerary I can copy into Trip Hunter`

## How to use the answer in Trip Hunter

| Buddy output | Where it goes |
| --- | --- |
| Destination + dates | Create trip (`/trips/create`), then Voting if the group still needs to pick |
| Travel in / out | Itinerary items typed `TRAVEL`; bookings on the Bookings tab |
| Stay | `HOTEL` itinerary items + hotel booking |
| Meals | `FOOD` |
| Sights, treks, water sports | `ACTIVITY` |
| Offsite workshop / retro | `MEETING` |
| Cost bands | Budget categories; later Expenses + settlements |
| Owners (who books train, who collects UPI) | Tasks assigned to members |

Itinerary API types: `TRAVEL`, `HOTEL`, `FOOD`, `ACTIVITY`, `MEETING`, `OTHER`. Dates `YYYY-MM-DD`, times `HH:mm`.

## Season windows (typical, not a forecast)

Do not treat this as live weather. Check a forecast before you lock outdoor days.

| Region / style | Better months | Treat with care |
| --- | --- | --- |
| Goa, Konkan, Gokarna | Nov–Mar | Jun–Sep monsoon; May is hot/humid |
| Kerala backwaters / coast | Nov–Feb | Jun–Sep heavy rain; Apr–May humid |
| Rajasthan (Jaipur, Udaipur, Jaisalmer) | Oct–Mar | Apr–Jun extreme heat |
| Himachal (Manali, Shimla) / Uttarakhand hills | Mar–Jun, Sep–Nov | Jul–Aug monsoon landslides; Dec–Feb snow/cold |
| Ladakh | Jun–Sep (road + weather window) | Winter closures; acclimatize |
| Rishikesh adventure | Sep–Nov, Feb–Apr | Monsoon river levels; summer heat in valley |
| Ooty / Kodaikanal / Coorg | Oct–May | Monsoon very wet |
| Andaman | Nov–Apr | Cyclone/monsoon shoulder |
| Northeast (Meghalaya, Sikkim, Assam) | Oct–Apr | Monsoon rains; check road status |
| Metro weekends (Lonavala, Pondicherry, Jaipur from NCR) | Avoid that region's peak heat or peak monsoon if the plan is outdoors |

Office offsies: prefer shoulder season over peak tourist long weekends when trains/flights spike.

## Destination clusters (team-trip biased)

Shortlists Buddy should reach for first. Swap if the user named a specific place.

**From Pune / Mumbai**

- Beach: Goa, Alibaug, Ganpatipule, Gokarna (longer)
- Hills / mist: Lonavala–Khandala, Mahabaleshwar, Matheran
- Heritage weekend: Ajanta–Ellora (Aurangabad)

**From Bangalore / Chennai / Hyderabad**

- Hills: Coorg, Chikmagalur, Ooty, Kodaikanal
- Coast: Pondicherry, Gokarna, Kerala (longer)
- Heritage: Hampi, Mysore

**From Delhi NCR**

- Heritage: Jaipur, Agra–Fatehpur, Rishikesh, Jim Corbett (seasonal)
- Hills: Shimla, Manali, Mussoorie (travel time is the constraint)
- Desert: Jaisalmer / Jodhpur (3–5 days)

**Pan-India / fly-in offsites**

- Goa, Jaipur–Udaipur circuit, Kerala (Kochi–Alleppey–Munnar), Andaman, Ladakh (seasonal)

## Budget bands (rough, per person, INR)

Ballpark for **office groups**, excluding long-distance flights unless noted. Always label as estimates.

| Band | Stay | Food | Local travel | Activities | Typical 3-day total |
| --- | --- | --- | --- | --- | --- |
| Lean weekend | Dorm / budget hotel | Local thalis | Bus / shared cab | Few paid sights | ₹5k–8k |
| Mid team outing | 3-star / homestay | Mix of cafes + group dinners | Train + cabs | 1–2 paid activities | ₹8k–15k |
| Comfortable offsite | Nice resort / boutique | Sit-down + 1 special dinner | Flights or AC train + tempo | Water sports / guided days | ₹18k–30k+ |

Add 10–20% buffer for surge weekends, airport transfers, and “we decided to do the sunset cruise.” Split stay vs food vs transport vs activities in Budget so Expenses stay comparable.

## Day-plan pattern

1. **Travel day** — leave buffer; no 6 a.m. trek after a night bus.
2. **Full day** — one hero activity + free time. Teams mutiny if every hour is packed.
3. **Return day** — morning activity only if the train/flight is after ~16:00.
4. Put a **MEETING** block on day 2 for offsites that need a retro or workshop (hotel meeting room or a quiet cafe).
5. Call out **monsoon / heat / altitude** in **Why this works** when those matter.

Copy-ready bullet (matches Buddy Markdown + itinerary types):

```text
- **09:30–12:00** · ACTIVITY · Fort walk — Old Goa. Shade, water, skip if heavy rain.
```

## Safety and logistics (keep these in the plan)

- Prefer licensed operators for rafting, scuba, snow, and late-night travel.
- Hill roads and Northeast: leave slack for landslides; share a live location in the trip chat.
- Ladakh / high hills: extra night for acclimatization; no “land and trek same day.”
- Alcohol and beach parties: remind that this is an office trip — agree norms before you book.
- IDs: government ID for trains, hotels, and some monuments.
- Payments: UPI works widely; still carry some cash in smaller towns. Settlements in Trip Hunter are **not** a bank transfer.

## What Buddy will not do

- Book trains, hotels, or pay anyone
- Lock a voting poll or add itinerary rows for you
- Quote live weather, ticket prices, or “guaranteed empty beaches”
- Plan trips outside India (it will steer back)

Setup for live answers: `GEMINI_API_KEY` on the API (see [Gemini trip advisor](../api/gemini-trip-advisor.md)). Without the key, the Buddy panel still opens and explains setup.
