<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->
- Dispatcher dashboard (/dispecink) is gated by a shared PIN in the DISPATCH_PIN secret, checked in server functions; all table access goes through server functions with the admin client (no public RLS policies). Why: MVP with a single concierge operator, no accounts needed.
- AI classification on /dispecink uses @lovable.dev/ai-gateway in a PIN-checked server function with model openai/gpt-6.1-terra (allowed by workspace retention policy).
- Submitted orders run one awaited AI classification through the shared server-only workflow; failure or uncertainty requires dispatcher review instead of replaying inference. Why: avoid duplicate AI billing and unsafe dispatch.
- Offer creation matches approved, available craftspeople by region and trade; acceptance uses a service-role-only database function with row locks. Why: prevent two craftspeople from accepting the same order.
- Customer and craftsman pages use unguessable capability tokens, validated server-side with narrow data projections; never expose tokens through public lists. Why: retain the account-free concierge model without exposing customer details.
- Optional user accounts (email, Google, Apple) link orders/applications via customer_user_id / user_id, resolved server-side from the bearer token; guest ordering stays possible. Why: keep the account-free concierge flow while rewarding signed-in users.
- Gamification (points, levels, achievements) is computed on read from order data in src/lib/gamification.ts, not stored. Why: no drift between badges and real order history.
- Customer account order details use the authenticated account function's owner-filtered projection and refresh every 15 seconds. Why: keep private job details scoped to their customer and displayed statuses current.
- Address and postal-code suggestions use the free Photon (OSM) geocoder via a server function, limited to CZ. Why: no API key needed.
- Home order form is a 3-step wizard (src/components/OrderWizard.tsx) with a localStorage draft and client-side photo compression; it still posts FormData to submitRequest. Callback requests go to a service-role-only callback_requests table shown on /dispecink. Why: faster ordering without changing the server workflow.

- Theme comes from the attached design system: its fluxora.css is imported in layer(base) and its :root palette is mirrored in src/styles.css, because its styles.css cannot be layered (nested tw-animate @utility) and unlayered resets would override Tailwind utilities.

- Order tracking refreshes via a data-free realtime broadcast on topic `order:<tracking_token>` sent by a DB trigger, with a slow poll fallback. Why: instant updates without exposing order rows to the browser.
- Homepage availability uses the shared freshness helper and rechecks time while open; dispatcher reads remain raw. Why: expire public availability claims without hiding the operator's saved settings.
- Saved scheduled visit dates in dispatcher, craftsman, account and tracking views use the shared Czech formatter with Europe/Prague timezone. Why: show the same requested local slot regardless of the viewer's device timezone.
- Immediate arrival countdowns exclude scheduled jobs even after acceptance. Why: accepting a future visit does not promise arrival within the travel-time estimate.
