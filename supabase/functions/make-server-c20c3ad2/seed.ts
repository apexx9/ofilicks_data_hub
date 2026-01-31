import * as auth from "./auth.ts";
import * as bundles from "./bundles.ts";
import * as orders from "./orders.ts";

// Seed data for initial setup
export async function seedDatabase() {
  try {
    console.log("Starting database seed...");

    // Create admin user
    try {
      await auth.signup("admin@ofilicks.com", "admin123", "System Admin", "ADMIN");
      console.log("✓ Admin user created");
    } catch (error) {
      console.log("Admin user may already exist");
    }

    // Create sample users
    const sampleUsers = [
      { email: "user@example.com", password: "user123", name: "John Doe", role: "USER" as const },
      { email: "agent@example.com", password: "agent123", name: "Jane Agent", role: "AGENT" as const },
      { email: "dealer@example.com", password: "dealer123", name: "Mike Dealer", role: "DEALER" as const },
    ];

    for (const userData of sampleUsers) {
      try {
        await auth.signup(userData.email, userData.password, userData.name, userData.role);
        console.log(`✓ ${userData.role} user created: ${userData.email}`);
      } catch (error) {
        console.log(`${userData.role} user may already exist`);
      }
    }

    // Create sample bundles
    const sampleBundles = [
      // MTN Bundles
      {
        network: "MTN" as const,
        name: "MTN 1GB Daily",
        volume: "1GB",
        validity: "1 day",
        pricing: { USER: 2.50, AGENT: 2.20, DEALER: 2.00 },
        enabled: true,
      },
      {
        network: "MTN" as const,
        name: "MTN 5GB Weekly",
        volume: "5GB",
        validity: "7 days",
        pricing: { USER: 10.00, AGENT: 9.00, DEALER: 8.50 },
        enabled: true,
      },
      {
        network: "MTN" as const,
        name: "MTN 10GB Monthly",
        volume: "10GB",
        validity: "30 days",
        pricing: { USER: 20.00, AGENT: 18.00, DEALER: 17.00 },
        enabled: true,
      },
      // AirtelTigo iShare
      {
        network: "AIRTELTIGO_ISHARE" as const,
        name: "AT iShare 1GB",
        volume: "1GB",
        validity: "1 day",
        pricing: { USER: 2.00, AGENT: 1.80, DEALER: 1.60 },
        enabled: true,
      },
      {
        network: "AIRTELTIGO_ISHARE" as const,
        name: "AT iShare 3GB",
        volume: "3GB",
        validity: "3 days",
        pricing: { USER: 5.00, AGENT: 4.50, DEALER: 4.20 },
        enabled: true,
      },
      // AirtelTigo BigTime
      {
        network: "AIRTELTIGO_BIGTIME" as const,
        name: "AT BigTime 5GB",
        volume: "5GB",
        validity: "7 days",
        pricing: { USER: 9.50, AGENT: 8.50, DEALER: 8.00 },
        enabled: true,
      },
      {
        network: "AIRTELTIGO_BIGTIME" as const,
        name: "AT BigTime 10GB",
        volume: "10GB",
        validity: "30 days",
        pricing: { USER: 18.00, AGENT: 16.50, DEALER: 15.50 },
        enabled: true,
      },
      // Telecel
      {
        network: "TELECEL" as const,
        name: "Telecel 1GB Daily",
        volume: "1GB",
        validity: "1 day",
        pricing: { USER: 2.30, AGENT: 2.00, DEALER: 1.80 },
        enabled: true,
      },
      {
        network: "TELECEL" as const,
        name: "Telecel 6GB Weekly",
        volume: "6GB",
        validity: "7 days",
        pricing: { USER: 11.00, AGENT: 10.00, DEALER: 9.50 },
        enabled: true,
      },
      {
        network: "TELECEL" as const,
        name: "Telecel 15GB Monthly",
        volume: "15GB",
        validity: "30 days",
        pricing: { USER: 25.00, AGENT: 23.00, DEALER: 21.50 },
        enabled: true,
      },
    ];

    for (const bundleData of sampleBundles) {
      try {
        await bundles.createBundle(bundleData);
        console.log(`✓ Bundle created: ${bundleData.name}`);
      } catch (error) {
        console.log(`Bundle may already exist: ${bundleData.name}`);
      }
    }

    // Create sample API providers
    const sampleProviders = [
      { name: "Primary API", priority: 1 },
      { name: "Backup API", priority: 2 },
    ];

    for (const providerData of sampleProviders) {
      try {
        const provider = await orders.createProvider(providerData.name, providerData.priority);
        
        // Set the first provider as active
        if (providerData.priority === 1) {
          await orders.setActiveProvider(provider.id);
        }
        
        console.log(`✓ Provider created: ${providerData.name}`);
      } catch (error) {
        console.log(`Provider may already exist: ${providerData.name}`);
      }
    }

    console.log("\n✓ Database seed completed successfully!");
    console.log("\nSample login credentials:");
    console.log("Admin: admin@ofilicks.com / admin123");
    console.log("User: user@example.com / user123");
    console.log("Agent: agent@example.com / agent123");
    console.log("Dealer: dealer@example.com / dealer123");
    
  } catch (error) {
    console.error("Seed error:", error);
  }
}
