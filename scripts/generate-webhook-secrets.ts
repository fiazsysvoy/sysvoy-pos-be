import { prismaClient } from "../src/lib/prisma.js";
import crypto from "crypto";

async function main() {
    console.log("Starting webhook secret generation...");

    const organizations = await prismaClient.organization.findMany();
    let updatedCount = 0;

    for (const org of organizations) {
        if (!org.clientSecret) {
            const clientSecret = crypto.randomUUID();
            await prismaClient.organization.update({
                where: { id: org.id },
                data: { clientSecret },
            });
            console.log(`Generated secret for organization: ${org.name} (${org.id})`);
            updatedCount++;
        }
    }

    console.log(`Finished. Updated ${updatedCount} organizations.`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prismaClient.$disconnect();
    });
