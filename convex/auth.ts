import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";
import { DataModel } from "./_generated/dataModel";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Password],
  callbacks: {
    async afterUserCreatedOrUpdated(ctx, { userId, existingUserId }) {
      if (!existingUserId) {
        // New user - create a default profile
        const user = await ctx.db.get(userId);
        if (user?.email) {
          const username = user.email.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "");
          const displayName = user.name || username;
          
          // Check if username exists and make it unique if needed
          let uniqueUsername = username;
          let counter = 1;
          
          while (true) {
            const existing = await ctx.db
              .query("profiles")
              .filter((q) => q.eq(q.field("username"), uniqueUsername))
              .first();
            
            if (!existing) break;
            uniqueUsername = `${username}${counter}`;
            counter++;
          }
          
          // Create profile
          await ctx.db.insert("profiles", {
            userId,
            username: uniqueUsername,
            displayName,
            verified: false,
            createdAt: Date.now(),
            followersCount: 0,
            followingCount: 0,
            postsCount: 0,
          });
        }
      }
    },
  },
});
