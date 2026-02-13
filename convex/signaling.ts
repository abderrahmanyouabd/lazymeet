import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const sendSignal = mutation({
  args: {
    meetingId: v.string(),
    toUserId: v.string(),
    type: v.string(),
    payload: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const meeting = await ctx.db
      .query("meetings")
      .withIndex("by_meetingId", (q) => q.eq("meetingId", args.meetingId))
      .unique();

    if (!meeting) {
      throw new Error("Meeting not found");
    }

    const fromUser = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.tokenIdentifier))
      .unique();

    if (!fromUser) {
      throw new Error("User not found");
    }

    await ctx.db.insert("signaling", {
      meetingId: meeting._id,
      fromUserId: fromUser._id,
      toUserId: args.toUserId as any,
      type: args.type,
      payload: args.payload,
      createdAt: Date.now(),
    });

    return { success: true };
  },
});

export const getSignals = query({
  args: {
    meetingId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const meeting = await ctx.db
      .query("meetings")
      .withIndex("by_meetingId", (q) => q.eq("meetingId", args.meetingId))
      .unique();

    if (!meeting) {
      return [];
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.tokenIdentifier))
      .unique();

    if (!user) {
      return [];
    }

    const signals = await ctx.db
      .query("signaling")
      .withIndex("by_meeting", (q) => q.eq("meetingId", meeting._id))
      .filter((q) => q.eq(q.field("toUserId"), user._id))
      .order("desc")
      .take(50);

    return signals;
  },
});

export const clearOldSignals = mutation({
  args: {
    meetingId: v.string(),
  },
  handler: async (ctx, args) => {
    const meeting = await ctx.db
      .query("meetings")
      .withIndex("by_meetingId", (q) => q.eq("meetingId", args.meetingId))
      .unique();

    if (!meeting) {
      throw new Error("Meeting not found");
    }

    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    
    const oldSignals = await ctx.db
      .query("signaling")
      .withIndex("by_meeting", (q) => q.eq("meetingId", meeting._id))
      .filter((q) => q.lt(q.field("createdAt"), fiveMinutesAgo))
      .collect();

    for (const signal of oldSignals) {
      await ctx.db.delete(signal._id);
    }

    return { deletedCount: oldSignals.length };
  },
});
