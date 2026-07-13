import { HttpsError } from "firebase-functions/v2/https";
import { z } from "zod";
import { onCall } from "../lib/onCall";
import { prisma, OrganisationStatus } from "@pharmacy-os/db";
import { getPublicBranding } from "../lib/organisationBranding";

const schema = z.object({ organisationId: z.string().uuid() });

export const publicGetOrganisationBrand = onCall(
  { invoker: "public" },
  async (request) => {
    const parsed = schema.safeParse(request.data);
    if (!parsed.success) {
      throw new HttpsError("invalid-argument", parsed.error.message);
    }

    const organisation = await prisma.organisation.findUnique({ where: { id: parsed.data.organisationId } });
    if (!organisation || organisation.status !== OrganisationStatus.ACTIVE) {
      throw new HttpsError("not-found", "No active pharmacy storefront found.");
    }

    return {
      organisation: {
        id: organisation.id,
        name: organisation.name,
        plan: organisation.plan,
        branding: getPublicBranding(organisation.name, organisation.settings),
      },
    };
  }
);
