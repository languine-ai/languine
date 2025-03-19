import { updateOrganization } from "@/db/queries/organization";
import { getTierFromProductId } from "@/lib/tiers";
import { Webhooks } from "@polar-sh/nextjs";

export const POST = Webhooks({
  webhookSecret: process.env.POLAR_WEBHOOK_SECRET!,
  onPayload: async (payload) => {
    switch (payload.type) {
      case "subscription.updated": {
        const tier = getTierFromProductId(payload.data.productId);

        if (!tier) {
          console.error("Invalid product ID", payload.data.productId);
          break;
        }

        // Make sure the subscription is active before setting the plan
        if (payload.data.status !== 'active') {
          break;
        }

        await updateOrganization({
          id: payload.data.metadata.organizationId as string,
          polarCustomerId: payload.data.customerId!,
          email: payload.data.customer.email ?? undefined,
          tier,
          plan: "pro",
        });

        break;
      }

      // Subscription has been explicitly canceled by the user
      case "subscription.canceled": {
        await updateOrganization({
          id: payload.data.metadata.organizationId as string,
          canceledAt: new Date(),
        });

        break;
      }

      // Subscription has been revoked/peroid has ended with no renewal
      case "subscription.revoked": {
        if (!payload.data.customerId || !payload.data.customer.email) {
          console.error("Customer ID or email is missing");
          break;
        }

        await updateOrganization({
          id: payload.data.metadata.organizationId as string,
          tier: 0,
          plan: "free",
          canceledAt: null,
        });

        break;
      }
      default:
        console.log("Unknown event", payload.type);
        break;
    }
  },
});
