import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import crypto from "crypto";

function generateMeetingId(): string {
  return crypto.randomBytes(16).toString('hex');
}

export const createMeeting = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    maxParticipants: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.tokenIdentifier))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    const meetingId = generateMeetingId();
    const meeting = await ctx.db.insert("meetings", {
      meetingId,
      hostId: user._id,
      title: args.title,
      description: args.description,
      isActive: true,
      maxParticipants: args.maxParticipants || 8,
      createdAt: Date.now(),
    });

    return { meetingId, _id: meeting };
  },
});

export const getMeeting = query({
  args: { meetingId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("meetings")
      .withIndex("by_meetingId", (q) => q.eq("meetingId", args.meetingId))
      .unique();
  },
});

export const joinMeeting = mutation({
  args: { meetingId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const meeting = await ctx.db
      .query("meetings")
      .withIndex("by_meetingId", (q) => q.eq("meetingId", args.meetingId))
      .unique();

    if (!meeting || !meeting.isActive) {
      throw new Error("Meeting not found or inactive");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.tokenIdentifier))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    const participants = await ctx.db
      .query("participants")
      .withIndex("by_meeting", (q) => q.eq("meetingId", meeting._id))
      .collect();

    if (participants.length >= meeting.maxParticipants) {
      throw new Error("Meeting is full");
    }

    const existingParticipant = participants.find(p => p.userId === user._id);
    if (existingParticipant) {
      return { success: true, meeting, alreadyJoined: true };
    }

    await ctx.db.insert("participants", {
      meetingId: meeting._id,
      userId: user._id,
      joinedAt: Date.now(),
      isAudioEnabled: true,
      isVideoEnabled: true,
      peerId: crypto.randomUUID(),
    });

    return { success: true, meeting, alreadyJoined: false };
  },
});

export const leaveMeeting = mutation({
  args: { meetingId: v.string() },
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

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.tokenIdentifier))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    const participant = await ctx.db
      .query("participants")
      .withIndex("by_meeting", (q) => q.eq("meetingId", meeting._id))
      .filter((q) => q.eq(q.field("userId"), user._id))
      .unique();

    if (participant) {
      await ctx.db.patch(participant._id, {
        leftAt: Date.now(),
      });
    }

    return { success: true };
  },
});

export const endMeeting = mutation({
  args: { meetingId: v.string() },
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

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.tokenIdentifier))
      .unique();

    if (!user || meeting.hostId !== user._id) {
      throw new Error("Only the host can end the meeting");
    }

    await ctx.db.patch(meeting._id, {
      isActive: false,
      endedAt: Date.now(),
    });

    return { success: true };
  },
});

export const getMeetingParticipants = query({
  args: { meetingId: v.string() },
  handler: async (ctx, args) => {
    const meeting = await ctx.db
      .query("meetings")
      .withIndex("by_meetingId", (q) => q.eq("meetingId", args.meetingId))
      .unique();

    if (!meeting) {
      return [];
    }

    const participants = await ctx.db
      .query("participants")
      .withIndex("by_meeting", (q) => q.eq("meetingId", meeting._id))
      .filter((q) => q.eq(q.field("leftAt"), undefined))
      .collect();

    return participants;
  },
});
