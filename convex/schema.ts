import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    email: v.string(),
    name: v.string(),
    avatarUrl: v.optional(v.string()),
    createdAt: v.number(),
    lastActiveAt: v.number(),
  }).index("by_clerkId", ["clerkId"]),

  meetings: defineTable({
    meetingId: v.string(),
    hostId: v.id("users"),
    title: v.string(),
    description: v.optional(v.string()),
    isActive: v.boolean(),
    maxParticipants: v.number(),
    createdAt: v.number(),
    endedAt: v.optional(v.number()),
    encryptionKey: v.optional(v.string()),
  }).index("by_meetingId", ["meetingId"]),

  participants: defineTable({
    meetingId: v.id("meetings"),
    userId: v.id("users"),
    joinedAt: v.number(),
    leftAt: v.optional(v.number()),
    isAudioEnabled: v.boolean(),
    isVideoEnabled: v.boolean(),
    peerId: v.string(),
  })
    .index("by_meeting", ["meetingId"])
    .index("by_user", ["userId"]),

  signaling: defineTable({
    meetingId: v.id("meetings"),
    fromUserId: v.id("users"),
    toUserId: v.id("users"),
    type: v.string(),
    payload: v.string(),
    createdAt: v.number(),
  }).index("by_meeting", ["meetingId"]),
});
