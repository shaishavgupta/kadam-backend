import { Type } from '@sinclair/typebox';

// Enums
export const GroupMemberRoleEnum = Type.Union([
  Type.Literal('admin'),
  Type.Literal('moderator'),
  Type.Literal('member')
]);

export const MessageTypeEnum = Type.Union([
  Type.Literal('text'),
  Type.Literal('audio'),
  Type.Literal('file'),
  Type.Literal('image')
]);

// Base types
export const GroupBaseSchema = Type.Object({
  name: Type.String({ minLength: 1, maxLength: 100 }),
  description: Type.Optional(Type.String({ maxLength: 500 })),
  thumbnail_url: Type.Optional(Type.String({ format: 'uri' }))
});

export const GroupSchema = Type.Intersect([
  GroupBaseSchema,
  Type.Object({
    id: Type.Number(),
    created_by: Type.Number(),
    is_active: Type.Boolean(),
    created_at: Type.String({ format: 'date-time' }),
    updated_at: Type.String({ format: 'date-time' })
  })
]);

export const GroupMemberSchema = Type.Object({
  id: Type.Number(),
  group_id: Type.Number(),
  user_id: Type.Number(),
  role: GroupMemberRoleEnum,
  joined_at: Type.String({ format: 'date-time' }),
  is_online: Type.Boolean(),
  last_seen: Type.String({ format: 'date-time' }),
  created_at: Type.String({ format: 'date-time' }),
  updated_at: Type.String({ format: 'date-time' })
});

export const GroupMessageSchema = Type.Object({
  id: Type.Number(),
  group_id: Type.Number(),
  sender_id: Type.Number(),
  message_type: MessageTypeEnum,
  content: Type.Union([Type.String(), Type.Null()]),
  file_url: Type.Union([Type.String(), Type.Null()]),
  file_name: Type.Union([Type.String(), Type.Null()]),
  audio_duration: Type.Union([Type.Number(), Type.Null()]),
  is_deleted: Type.Boolean(),
  deleted_at: Type.Union([Type.String({ format: 'date-time' }), Type.Null()]),
  deleted_by: Type.Union([Type.Number(), Type.Null()]),
  created_at: Type.String({ format: 'date-time' }),
  updated_at: Type.String({ format: 'date-time' })
});

// Request schemas
export const CreateGroupRequestSchema = GroupBaseSchema;

export const UpdateGroupRequestSchema = Type.Partial(GroupBaseSchema);

export const AddMemberRequestSchema = Type.Object({
  user_id: Type.Number()
});

export const UpdateMemberRoleRequestSchema = Type.Object({
  role: GroupMemberRoleEnum
});

export const SendMessageRequestSchema = Type.Object({
  message: Type.String({ minLength: 1, maxLength: 2000 }),
  type: Type.Optional(MessageTypeEnum)
});

export const SendAudioMessageRequestSchema = Type.Object({
  audioUri: Type.String({ format: 'uri' }),
  duration: Type.Number({ minimum: 1, maximum: 3600 }) // Max 1 hour
});

export const SendFileMessageRequestSchema = Type.Object({
  fileUri: Type.String({ format: 'uri' }),
  fileName: Type.String({ minLength: 1, maxLength: 255 }),
  fileType: Type.Union([Type.Literal('file'), Type.Literal('image')])
});

export const MarkMessagesReadRequestSchema = Type.Object({
  lastMessageId: Type.Number()
});

export const GetGroupsQuerySchema = Type.Object({
  page: Type.Optional(Type.Number({ minimum: 1 })),
  limit: Type.Optional(Type.Number({ minimum: 1, maximum: 100 })),
  search: Type.Optional(Type.String())
});

export const GetGroupMembersQuerySchema = Type.Object({
  page: Type.Optional(Type.Number({ minimum: 1 })),
  limit: Type.Optional(Type.Number({ minimum: 1, maximum: 100 })),
  online_only: Type.Optional(Type.Boolean())
});

export const GetGroupMessagesQuerySchema = Type.Object({
  page: Type.Optional(Type.Number({ minimum: 1 })),
  limit: Type.Optional(Type.Number({ minimum: 1, maximum: 100 })),
  message_type: Type.Optional(MessageTypeEnum),
  before_message_id: Type.Optional(Type.Number())
});

export const GetSuggestedGroupsQuerySchema = Type.Object({
  page: Type.Optional(Type.Number({ minimum: 1 })),
  limit: Type.Optional(Type.Number({ minimum: 1, maximum: 100 })),
  category: Type.Optional(Type.String()),
  excludeJoined: Type.Optional(Type.Boolean())
});

// Response schemas
export const CreateGroupResponseSchema = Type.Object({
  success: Type.Boolean(),
  data: GroupSchema,
  message: Type.String()
});

export const GetGroupResponseSchema = Type.Object({
  success: Type.Boolean(),
  data: Type.Object({
    group: GroupSchema,
    memberCount: Type.Number(),
    onlineMemberCount: Type.Number(),
    isMember: Type.Boolean(),
    userRole: Type.Union([GroupMemberRoleEnum, Type.Null()])
  }),
  message: Type.String()
});

export const GetGroupsResponseSchema = Type.Object({
  success: Type.Boolean(),
  data: Type.Object({
    groups: Type.Array(GroupSchema),
    total: Type.Number(),
    page: Type.Number(),
    limit: Type.Number(),
    totalPages: Type.Number()
  }),
  message: Type.String()
});

export const GetGroupMembersResponseSchema = Type.Object({
  success: Type.Boolean(),
  data: Type.Object({
    members: Type.Array(GroupMemberSchema),
    total: Type.Number(),
    page: Type.Number(),
    limit: Type.Number(),
    totalPages: Type.Number()
  }),
  message: Type.String()
});

export const SendMessageResponseSchema = Type.Object({
  success: Type.Boolean(),
  data: Type.Object({
    message: GroupMessageSchema
  }),
  message: Type.String()
});

export const GetGroupMessagesResponseSchema = Type.Object({
  success: Type.Boolean(),
  data: Type.Object({
    messages: Type.Array(GroupMessageSchema),
    total: Type.Number(),
    page: Type.Number(),
    limit: Type.Number(),
    totalPages: Type.Number()
  }),
  message: Type.String()
});

export const MarkMessagesReadResponseSchema = Type.Object({
  success: Type.Boolean(),
  message: Type.String()
});

export const DeleteMessageResponseSchema = Type.Object({
  success: Type.Boolean(),
  message: Type.String()
});

export const AddMemberResponseSchema = Type.Object({
  success: Type.Boolean(),
  data: Type.Object({
    member: GroupMemberSchema
  }),
  message: Type.String()
});

export const UpdateMemberRoleResponseSchema = Type.Object({
  success: Type.Boolean(),
  data: Type.Object({
    member: GroupMemberSchema
  }),
  message: Type.String()
});

export const RemoveMemberResponseSchema = Type.Object({
  success: Type.Boolean(),
  message: Type.String()
});

export const GetSuggestedGroupsResponseSchema = Type.Object({
  success: Type.Boolean(),
  data: Type.Object({
    groups: Type.Array(Type.Object({
      id: Type.String(),
      name: Type.String(),
      description: Type.Optional(Type.String()),
      thumbnailUrl: Type.Optional(Type.String()),
      memberCount: Type.Number(),
      onlineMemberCount: Type.Number(),
      createdAt: Type.String({ format: 'date-time' }),
      updatedAt: Type.String({ format: 'date-time' }),
      createdBy: Type.String(),
      isActive: Type.Boolean()
    })),
    total: Type.Number(),
    page: Type.Number(),
    limit: Type.Number(),
    totalPages: Type.Number()
  }),
  message: Type.String()
});

export const JoinGroupResponseSchema = Type.Object({
  success: Type.Boolean(),
  data: Type.Object({
    member: Type.Object({
      id: Type.String(),
      userId: Type.String(),
      name: Type.String(),
      avatar: Type.Optional(Type.String()),
      role: Type.Literal('member'),
      isOnline: Type.Boolean(),
      joinedAt: Type.String({ format: 'date-time' }),
      lastSeen: Type.String({ format: 'date-time' })
    })
  }),
  message: Type.String()
});

export const LeaveGroupResponseSchema = Type.Object({
  success: Type.Boolean(),
  message: Type.String()
});

// SSE Stream Response Schema
export const GroupMessageStreamSchema = Type.Object({
  message_id: Type.Number(),
  group_id: Type.Number(),
  sender_id: Type.Number(),
  message_type: MessageTypeEnum,
  content: Type.Union([Type.String(), Type.Null()]),
  file_url: Type.Union([Type.String(), Type.Null()]),
  file_name: Type.Union([Type.String(), Type.Null()]),
  audio_duration: Type.Union([Type.Number(), Type.Null()]),
  created_at: Type.String({ format: 'date-time' })
});

// TypeScript types
export type CreateGroupRequest = typeof CreateGroupRequestSchema;
export type UpdateGroupRequest = typeof UpdateGroupRequestSchema;
export type AddMemberRequest = typeof AddMemberRequestSchema;
export type UpdateMemberRoleRequest = typeof UpdateMemberRoleRequestSchema;
export type SendMessageRequest = typeof SendMessageRequestSchema;
export type SendAudioMessageRequest = typeof SendAudioMessageRequestSchema;
export type SendFileMessageRequest = typeof SendFileMessageRequestSchema;
export type MarkMessagesReadRequest = typeof MarkMessagesReadRequestSchema;
export type GetGroupsQuery = typeof GetGroupsQuerySchema;
export type GetGroupMembersQuery = typeof GetGroupMembersQuerySchema;
export type GetGroupMessagesQuery = typeof GetGroupMessagesQuerySchema;
export type GetSuggestedGroupsQuery = typeof GetSuggestedGroupsQuerySchema;
export type GroupMessageStream = typeof GroupMessageStreamSchema;
