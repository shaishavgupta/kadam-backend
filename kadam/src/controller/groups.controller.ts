import { FastifyInstance, FastifyReply } from 'fastify';
import { GroupsService } from '../service/groups.service';
import { authMiddleware, AuthenticatedRequest, requireUser } from '../shared/middleware/auth';
import {
  CreateGroupRequestSchema,
  UpdateGroupRequestSchema,
  AddMemberRequestSchema,
  UpdateMemberRoleRequestSchema,
  SendMessageRequestSchema,
  SendAudioMessageRequestSchema,
  SendFileMessageRequestSchema,
  MarkMessagesReadRequestSchema,
  GetGroupsQuerySchema,
  GetGroupMembersQuerySchema,
  GetGroupMessagesQuerySchema,
  GetSuggestedGroupsQuerySchema,
  CreateGroupResponseSchema,
  GetGroupResponseSchema,
  GetGroupsResponseSchema,
  GetGroupMembersResponseSchema,
  SendMessageResponseSchema,
  GetGroupMessagesResponseSchema,
  MarkMessagesReadResponseSchema,
  DeleteMessageResponseSchema,
  AddMemberResponseSchema,
  UpdateMemberRoleResponseSchema,
  RemoveMemberResponseSchema,
  GetSuggestedGroupsResponseSchema,
  JoinGroupResponseSchema,
  LeaveGroupResponseSchema,
  CreateGroupRequest,
  UpdateGroupRequest,
  AddMemberRequest,
  UpdateMemberRoleRequest,
  SendMessageRequest,
  SendAudioMessageRequest,
  SendFileMessageRequest,
  MarkMessagesReadRequest,
  GetGroupsQuery,
  GetGroupMembersQuery,
  GetGroupMessagesQuery,
  GetSuggestedGroupsQuery
} from '../schemas';

const groupsService = new GroupsService();

export default async function groupsRoutes(fastify: FastifyInstance) {

  // Create a new group
  fastify.post('/', {
    preHandler: [authMiddleware, requireUser],
    schema: {
      tags: ['Groups'],
      summary: 'Create a new group',
      description: 'Create a new group for chat functionality (admin only)',
      security: [{ bearerAuth: [] }],
      body: CreateGroupRequestSchema,
      response: {
        200: CreateGroupResponseSchema,
        400: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            statusCode: { type: 'number' }
          }
        },
        401: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            statusCode: { type: 'number' }
          }
        },
        403: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            statusCode: { type: 'number' }
          }
        },
        500: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            statusCode: { type: 'number' }
          }
        }
      }
    }
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    try {
      const groupData = request.body as CreateGroupRequest;
      const userId = parseInt(request.user!.userID, 10);

      const group = await groupsService.createGroup(groupData, userId, request.user!.userType);

      return reply.status(200).send({
        success: true,
        data: group,
        message: 'Group created successfully'
      });
    } catch (error) {
      console.error('Error creating group:', error);
      const statusCode = error instanceof Error && error.message.includes('permission') ? 403 : 500;
      return reply.status(statusCode).send({
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error',
        statusCode
      });
    }
  });

  // Get groups list
  fastify.get('/', {
    preHandler: [authMiddleware, requireUser],
    schema: {
      tags: ['Groups'],
      summary: 'Get list of user groups',
      description: 'Get paginated list of groups where user is a member',
      security: [{ bearerAuth: [] }],
      querystring: GetGroupsQuerySchema,
      response: {
        200: GetGroupsResponseSchema,
        401: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            statusCode: { type: 'number' }
          }
        },
        500: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            statusCode: { type: 'number' }
          }
        }
      }
    }
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    try {
      const queryParams = request.query as GetGroupsQuery;
      const userId = parseInt(request.user!.userID, 10);
      const result = await groupsService.getGroups(queryParams, userId);

      return reply.status(200).send({
        success: true,
        data: result,
        message: 'Groups retrieved successfully'
      });
    } catch (error) {
      console.error('Error getting groups:', error);
      return reply.status(500).send({
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error',
        statusCode: 500
      });
    }
  });

  // Get suggested groups - MUST be before /:id route
  fastify.get('/suggested', {
    preHandler: [authMiddleware, requireUser],
    schema: {
      tags: ['Groups'],
      summary: 'Get suggested groups',
      description: 'Get paginated list of groups that user is not a member of',
      security: [{ bearerAuth: [] }],
      querystring: GetSuggestedGroupsQuerySchema,
      response: {
        200: GetSuggestedGroupsResponseSchema,
        401: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            statusCode: { type: 'number' }
          }
        },
        500: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            statusCode: { type: 'number' }
          }
        }
      }
    }
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    try {
      const queryParams = request.query as GetSuggestedGroupsQuery;
      const userId = parseInt(request.user!.userID, 10);
      const result = await groupsService.getSuggestedGroups(queryParams, userId);

      // Transform the data to match the expected response format
      const transformedGroups = result.groups.map(group => ({
        id: group.id.toString(),
        name: group.name,
        description: group.description,
        thumbnailUrl: group.thumbnail_url,
        memberCount: parseInt(group.member_count),
        onlineMemberCount: parseInt(group.online_member_count),
        createdAt: group.created_at,
        updatedAt: group.updated_at,
        createdBy: group.creator_name,
        isActive: group.is_active
      }));

      return reply.status(200).send({
        success: true,
        data: {
          groups: transformedGroups,
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages
        },
        message: 'Suggested groups fetched successfully'
      });
    } catch (error) {
      console.error('Error getting suggested groups:', error);
      return reply.status(500).send({
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error',
        statusCode: 500
      });
    }
  });

  // Get group by ID
  fastify.get('/:id', {
    preHandler: [authMiddleware, requireUser],
    schema: {
      tags: ['Groups'],
      summary: 'Get group by ID',
      description: 'Get detailed information about a specific group',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'number' }
        },
        required: ['id']
      },
      response: {
        200: GetGroupResponseSchema,
        404: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            statusCode: { type: 'number' }
          }
        },
        401: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            statusCode: { type: 'number' }
          }
        },
        500: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            statusCode: { type: 'number' }
          }
        }
      }
    }
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      const groupId = parseInt(id, 10);
      const userId = parseInt(request.user!.userID, 10);
      const result = await groupsService.getGroupById(groupId, userId);

      if (!result) {
        return reply.status(404).send({
          success: false,
          message: 'Group not found',
          statusCode: 404
        });
      }

      return reply.status(200).send({
        success: true,
        data: result,
        message: 'Group retrieved successfully'
      });
    } catch (error) {
      console.error('Error getting group:', error);
      return reply.status(500).send({
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error',
        statusCode: 500
      });
    }
  });

  // Update group
  fastify.put('/:id', {
    preHandler: [authMiddleware, requireUser],
    schema: {
      tags: ['Groups'],
      summary: 'Update group details',
      description: 'Update group information (admin only)',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'number' }
        },
        required: ['id']
      },
      body: UpdateGroupRequestSchema,
      response: {
        200: GetGroupResponseSchema,
        400: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            statusCode: { type: 'number' }
          }
        },
        401: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            statusCode: { type: 'number' }
          }
        },
        403: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            statusCode: { type: 'number' }
          }
        },
        404: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            statusCode: { type: 'number' }
          }
        },
        500: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            statusCode: { type: 'number' }
          }
        }
      }
    }
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      const groupId = parseInt(id, 10);
      const updates = request.body as UpdateGroupRequest;
      const userId = parseInt(request.user!.userID, 10);

      const group = await groupsService.updateGroup(groupId, updates, userId, request.user!.userType);

      if (!group) {
        return reply.status(404).send({
          success: false,
          message: 'Group not found',
          statusCode: 404
        });
      }

      return reply.status(200).send({
        success: true,
        data: { group },
        message: 'Group updated successfully'
      });
    } catch (error) {
      console.error('Error updating group:', error);
      const statusCode = error instanceof Error && error.message.includes('permission') ? 403 : 500;
      return reply.status(statusCode).send({
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error',
        statusCode
      });
    }
  });

  // Delete group
  fastify.delete('/:id', {
    preHandler: [authMiddleware, requireUser],
    schema: {
      tags: ['Groups'],
      summary: 'Delete group',
      description: 'Delete a group (admin only)',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'number' }
        },
        required: ['id']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' }
          }
        },
        401: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            statusCode: { type: 'number' }
          }
        },
        403: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            statusCode: { type: 'number' }
          }
        },
        404: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            statusCode: { type: 'number' }
          }
        },
        500: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            statusCode: { type: 'number' }
          }
        }
      }
    }
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      const groupId = parseInt(id, 10);
      const userId = parseInt(request.user!.userID, 10);

      const success = await groupsService.deleteGroup(groupId, userId, request.user!.userType);

      if (!success) {
        return reply.status(404).send({
          success: false,
          message: 'Group not found',
          statusCode: 404
        });
      }

      return reply.status(200).send({
        success: true,
        message: 'Group deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting group:', error);
      const statusCode = error instanceof Error && error.message.includes('permission') ? 403 : 500;
      return reply.status(statusCode).send({
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error',
        statusCode
      });
    }
  });

  // Get group members
  fastify.get('/:id/members', {
    preHandler: [authMiddleware, requireUser],
    schema: {
      tags: ['Groups'],
      summary: 'Get group members',
      description: 'Get list of members in a group',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'number' }
        },
        required: ['id']
      },
      querystring: GetGroupMembersQuerySchema,
      response: {
        200: GetGroupMembersResponseSchema,
        404: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            statusCode: { type: 'number' }
          }
        },
        401: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            statusCode: { type: 'number' }
          }
        },
        500: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            statusCode: { type: 'number' }
          }
        }
      }
    }
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      const groupId = parseInt(id, 10);
      const queryParams = request.query as GetGroupMembersQuery;
      const userId = parseInt(request.user!.userID, 10);

      const result = await groupsService.getGroupMembers(groupId, queryParams, userId);

      return reply.status(200).send({
        success: true,
        data: result,
        message: 'Group members retrieved successfully'
      });
    } catch (error) {
      console.error('Error getting group members:', error);
      return reply.status(500).send({
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error',
        statusCode: 500
      });
    }
  });

  // Add member to group
  fastify.post('/:id/members', {
    preHandler: [authMiddleware, requireUser],
    schema: {
      tags: ['Groups'],
      summary: 'Add member to group',
      description: 'Add a user as a member to the group (admin only)',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'number' }
        },
        required: ['id']
      },
      body: AddMemberRequestSchema,
      response: {
        200: AddMemberResponseSchema,
        400: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            statusCode: { type: 'number' }
          }
        },
        401: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            statusCode: { type: 'number' }
          }
        },
        403: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            statusCode: { type: 'number' }
          }
        },
        404: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            statusCode: { type: 'number' }
          }
        },
        500: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            statusCode: { type: 'number' }
          }
        }
      }
    }
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      const groupId = parseInt(id, 10);
      const memberData = request.body as AddMemberRequest;
      const userId = parseInt(request.user!.userID, 10);

      const member = await groupsService.addMember(groupId, memberData, userId, request.user!.userType);

      return reply.status(200).send({
        success: true,
        data: { member },
        message: 'Member added successfully'
      });
    } catch (error) {
      console.error('Error adding member:', error);
      const statusCode = error instanceof Error && error.message.includes('permission') ? 403 : 
                        error instanceof Error && error.message.includes('already') ? 400 : 500;
      return reply.status(statusCode).send({
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error',
        statusCode
      });
    }
  });

  // Remove member from group
  fastify.delete('/:id/members/:userId', {
    preHandler: [authMiddleware, requireUser],
    schema: {
      tags: ['Groups'],
      summary: 'Remove member from group',
      description: 'Remove a member from the group (admin only)',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'number' },
          userId: { type: 'number' }
        },
        required: ['id', 'userId']
      },
      response: {
        200: RemoveMemberResponseSchema,
        401: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            statusCode: { type: 'number' }
          }
        },
        403: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            statusCode: { type: 'number' }
          }
        },
        404: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            statusCode: { type: 'number' }
          }
        },
        500: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            statusCode: { type: 'number' }
          }
        }
      }
    }
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    try {
      const { id, userId: targetUserId } = request.params as { id: string; userId: string };
      const groupId = parseInt(id, 10);
      const targetUser = parseInt(targetUserId, 10);
      const userId = parseInt(request.user!.userID, 10);

      const success = await groupsService.removeMember(groupId, targetUser, userId, request.user!.userType);

      if (!success) {
        return reply.status(404).send({
          success: false,
          message: 'Member not found',
          statusCode: 404
        });
      }

      return reply.status(200).send({
        success: true,
        message: 'Member removed successfully'
      });
    } catch (error) {
      console.error('Error removing member:', error);
      const statusCode = error instanceof Error && error.message.includes('permission') ? 403 : 
                        error instanceof Error && error.message.includes('not found') ? 404 : 500;
      return reply.status(statusCode).send({
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error',
        statusCode
      });
    }
  });

  // Update member role
  fastify.put('/:id/members/:userId/role', {
    preHandler: [authMiddleware, requireUser],
    schema: {
      tags: ['Groups'],
      summary: 'Update member role',
      description: 'Update a member\'s role in the group (admin only)',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'number' },
          userId: { type: 'number' }
        },
        required: ['id', 'userId']
      },
      body: UpdateMemberRoleRequestSchema,
      response: {
        200: UpdateMemberRoleResponseSchema,
        400: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            statusCode: { type: 'number' }
          }
        },
        401: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            statusCode: { type: 'number' }
          }
        },
        403: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            statusCode: { type: 'number' }
          }
        },
        404: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            statusCode: { type: 'number' }
          }
        },
        500: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            statusCode: { type: 'number' }
          }
        }
      }
    }
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    try {
      const { id, userId: targetUserId } = request.params as { id: string; userId: string };
      const groupId = parseInt(id, 10);
      const targetUser = parseInt(targetUserId, 10);
      const roleData = request.body as UpdateMemberRoleRequest;
      const userId = parseInt(request.user!.userID, 10);

      const member = await groupsService.updateMemberRole(groupId, targetUser, roleData, userId, request.user!.userType);

      if (!member) {
        return reply.status(404).send({
          success: false,
          message: 'Member not found',
          statusCode: 404
        });
      }

      return reply.status(200).send({
        success: true,
        data: { member },
        message: 'Member role updated successfully'
      });
    } catch (error) {
      console.error('Error updating member role:', error);
      const statusCode = error instanceof Error && error.message.includes('permission') ? 403 : 
                        error instanceof Error && error.message.includes('not found') ? 404 : 500;
      return reply.status(statusCode).send({
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error',
        statusCode
      });
    }
  });

  // Get group messages
  fastify.get('/:id/messages', {
    preHandler: [authMiddleware, requireUser],
    schema: {
      tags: ['Groups'],
      summary: 'Get group messages',
      description: 'Get message history for a group (paginated)',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'number' }
        },
        required: ['id']
      },
      querystring: GetGroupMessagesQuerySchema,
      response: {
        200: GetGroupMessagesResponseSchema,
        404: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            statusCode: { type: 'number' }
          }
        },
        401: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            statusCode: { type: 'number' }
          }
        },
        500: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            statusCode: { type: 'number' }
          }
        }
      }
    }
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      const groupId = parseInt(id, 10);
      const queryParams = request.query as GetGroupMessagesQuery;
      const userId = parseInt(request.user!.userID, 10);

      const result = await groupsService.getGroupMessages(groupId, queryParams, userId);

      return reply.status(200).send({
        success: true,
        data: result,
        message: 'Group messages retrieved successfully'
      });
    } catch (error) {
      console.error('Error getting group messages:', error);
      return reply.status(500).send({
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error',
        statusCode: 500
      });
    }
  });

  // Send text message
  fastify.post('/:id/messages', {
    preHandler: [authMiddleware, requireUser],
    schema: {
      tags: ['Groups'],
      summary: 'Send text message',
      description: 'Send a text message to the group',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'number' }
        },
        required: ['id']
      },
      body: SendMessageRequestSchema,
      response: {
        200: SendMessageResponseSchema,
        400: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            statusCode: { type: 'number' }
          }
        },
        401: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            statusCode: { type: 'number' }
          }
        },
        500: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            statusCode: { type: 'number' }
          }
        }
      }
    }
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      const groupId = parseInt(id, 10);
      const messageData = request.body as SendMessageRequest;
      const userId = parseInt(request.user!.userID, 10);

      const message = await groupsService.sendMessage(groupId, messageData, userId);

      return reply.status(200).send({
        success: true,
        data: { message },
        message: 'Message sent successfully'
      });
    } catch (error) {
      console.error('Error sending message:', error);
      return reply.status(500).send({
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error',
        statusCode: 500
      });
    }
  });

  // Send audio message
  fastify.post('/:id/messages/audio', {
    preHandler: [authMiddleware, requireUser],
    schema: {
      tags: ['Groups'],
      summary: 'Send audio message',
      description: 'Send an audio message to the group with S3 upload',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'number' }
        },
        required: ['id']
      },
      body: SendAudioMessageRequestSchema,
      response: {
        200: SendMessageResponseSchema,
        400: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            statusCode: { type: 'number' }
          }
        },
        401: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            statusCode: { type: 'number' }
          }
        },
        500: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            statusCode: { type: 'number' }
          }
        }
      }
    }
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      const groupId = parseInt(id, 10);
      const audioData = request.body as SendAudioMessageRequest;
      const userId = parseInt(request.user!.userID, 10);

      const message = await groupsService.sendAudioMessage(groupId, audioData, userId);

      return reply.status(200).send({
        success: true,
        data: { message },
        message: 'Audio message sent successfully'
      });
    } catch (error) {
      console.error('Error sending audio message:', error);
      return reply.status(500).send({
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error',
        statusCode: 500
      });
    }
  });

  // Send file message
  fastify.post('/:id/messages/file', {
    preHandler: [authMiddleware, requireUser],
    schema: {
      tags: ['Groups'],
      summary: 'Send file message',
      description: 'Send a file or image message to the group with S3 upload',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'number' }
        },
        required: ['id']
      },
      body: SendFileMessageRequestSchema,
      response: {
        200: SendMessageResponseSchema,
        400: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            statusCode: { type: 'number' }
          }
        },
        401: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            statusCode: { type: 'number' }
          }
        },
        500: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            statusCode: { type: 'number' }
          }
        }
      }
    }
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      const groupId = parseInt(id, 10);
      const fileData = request.body as SendFileMessageRequest;
      const userId = parseInt(request.user!.userID, 10);

      const message = await groupsService.sendFileMessage(groupId, fileData, userId);

      return reply.status(200).send({
        success: true,
        data: { message },
        message: 'File message sent successfully'
      });
    } catch (error) {
      console.error('Error sending file message:', error);
      return reply.status(500).send({
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error',
        statusCode: 500
      });
    }
  });

  // Delete message
  fastify.delete('/:id/messages/:messageId', {
    preHandler: [authMiddleware, requireUser],
    schema: {
      tags: ['Groups'],
      summary: 'Delete message',
      description: 'Delete a message (sender or admin only)',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'number' },
          messageId: { type: 'number' }
        },
        required: ['id', 'messageId']
      },
      response: {
        200: DeleteMessageResponseSchema,
        401: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            statusCode: { type: 'number' }
          }
        },
        403: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            statusCode: { type: 'number' }
          }
        },
        404: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            statusCode: { type: 'number' }
          }
        },
        500: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            statusCode: { type: 'number' }
          }
        }
      }
    }
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    try {
      const { id, messageId } = request.params as { id: string; messageId: string };
      const groupId = parseInt(id, 10);
      const msgId = parseInt(messageId, 10);
      const userId = parseInt(request.user!.userID, 10);

      const success = await groupsService.deleteMessage(groupId, msgId, userId);

      if (!success) {
        return reply.status(404).send({
          success: false,
          message: 'Message not found',
          statusCode: 404
        });
      }

      return reply.status(200).send({
        success: true,
        message: 'Message deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting message:', error);
      const statusCode = error instanceof Error && error.message.includes('permission') ? 403 : 
                        error instanceof Error && error.message.includes('not found') ? 404 : 500;
      return reply.status(statusCode).send({
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error',
        statusCode
      });
    }
  });

  // Mark messages as read
  fastify.put('/:id/messages/read', {
    preHandler: [authMiddleware, requireUser],
    schema: {
      tags: ['Groups'],
      summary: 'Mark messages as read',
      description: 'Mark messages as read for the user',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'number' }
        },
        required: ['id']
      },
      body: MarkMessagesReadRequestSchema,
      response: {
        200: MarkMessagesReadResponseSchema,
        401: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            statusCode: { type: 'number' }
          }
        },
        500: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            statusCode: { type: 'number' }
          }
        }
      }
    }
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      const groupId = parseInt(id, 10);
      const readData = request.body as MarkMessagesReadRequest;
      const userId = parseInt(request.user!.userID, 10);

      await groupsService.markMessagesAsRead(groupId, readData, userId);

      return reply.status(200).send({
        success: true,
        message: 'Messages marked as read'
      });
    } catch (error) {
      console.error('Error marking messages as read:', error);
      return reply.status(500).send({
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error',
        statusCode: 500
      });
    }
  });

  // SSE endpoint for real-time message updates
  fastify.get('/:id/stream', {
    preHandler: [authMiddleware, requireUser],
    schema: {
      tags: ['Groups'],
      summary: 'Real-time message stream',
      description: 'Server-Sent Events endpoint for real-time message updates',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'number' }
        },
        required: ['id']
      }
    }
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      const groupId = parseInt(id, 10);
      const userId = parseInt(request.user!.userID, 10);

      // Subscribe to PostgreSQL channel
      const client = await groupsService.subscribeToGroupMessages(groupId, userId);

      // Set SSE headers
      reply.raw.setHeader('Content-Type', 'text/event-stream');
      reply.raw.setHeader('Cache-Control', 'no-cache');
      reply.raw.setHeader('Connection', 'keep-alive');
      reply.raw.setHeader('Access-Control-Allow-Origin', '*');
      reply.raw.setHeader('Access-Control-Allow-Headers', 'Cache-Control');

      // Send initial connection message
      reply.raw.write(`data: ${JSON.stringify({ type: 'connected', groupId, userId })}\n\n`);

      // Listen for PostgreSQL notifications
      client.on('notification', (msg: any) => {
        if (msg.channel === `group_chat_${groupId}`) {
          try {
            const messageData = JSON.parse(msg.payload);
            reply.raw.write(`data: ${JSON.stringify(messageData)}\n\n`);
          } catch (error) {
            console.error('Error parsing notification payload:', error);
          }
        }
      });

      // Handle client disconnect
      request.raw.on('close', async () => {
        try {
          await groupsService.unsubscribeFromGroupMessages(groupId, userId);
          await groupsService.updateUserOnlineStatus(groupId, userId, false);
        } catch (error) {
          console.error('Error cleaning up SSE connection:', error);
        }
      });

      // Keep connection alive with periodic heartbeat
      const heartbeat = setInterval(() => {
        try {
          reply.raw.write(`data: ${JSON.stringify({ type: 'heartbeat', timestamp: Date.now() })}\n\n`);
        } catch (error) {
          clearInterval(heartbeat);
        }
      }, 30000); // Every 30 seconds

      // Clean up heartbeat on disconnect
      request.raw.on('close', () => {
        clearInterval(heartbeat);
      });

    } catch (error) {
      console.error('Error setting up SSE stream:', error);
      return reply.status(500).send({
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error',
        statusCode: 500
      });
    }
  });


  // Join group
  fastify.post('/:groupId/join', {
    preHandler: [authMiddleware, requireUser],
    schema: {
      tags: ['Groups'],
      summary: 'Join a group',
      description: 'Allow authenticated user to join a group',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          groupId: { type: 'string' }
        },
        required: ['groupId']
      },
      response: {
        200: JoinGroupResponseSchema,
        400: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            statusCode: { type: 'number' }
          }
        },
        401: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            statusCode: { type: 'number' }
          }
        },
        404: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            statusCode: { type: 'number' }
          }
        },
        409: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            statusCode: { type: 'number' }
          }
        },
        500: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            statusCode: { type: 'number' }
          }
        }
      }
    }
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    try {
      const { groupId } = request.params as { groupId: string };
      const groupIdNum = parseInt(groupId, 10);
      const userId = parseInt(request.user!.userID, 10);

      const result = await groupsService.joinGroup(groupIdNum, userId);

      return reply.status(200).send({
        success: true,
        data: result,
        message: 'Successfully joined the group'
      });
    } catch (error) {
      console.error('Error joining group:', error);
      const statusCode = error instanceof Error && error.message.includes('already') ? 409 :
                        error instanceof Error && error.message.includes('not found') ? 404 : 500;
      return reply.status(statusCode).send({
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error',
        statusCode
      });
    }
  });

  // Leave group
  fastify.post('/:groupId/leave', {
    preHandler: [authMiddleware, requireUser],
    schema: {
      tags: ['Groups'],
      summary: 'Leave a group',
      description: 'Allow authenticated user to leave a group',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          groupId: { type: 'string' }
        },
        required: ['groupId']
      },
      response: {
        200: LeaveGroupResponseSchema,
        400: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            statusCode: { type: 'number' }
          }
        },
        401: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            statusCode: { type: 'number' }
          }
        },
        404: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            statusCode: { type: 'number' }
          }
        },
        409: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            statusCode: { type: 'number' }
          }
        },
        500: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            statusCode: { type: 'number' }
          }
        }
      }
    }
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    try {
      const { groupId } = request.params as { groupId: string };
      const groupIdNum = parseInt(groupId, 10);
      const userId = parseInt(request.user!.userID, 10);

      await groupsService.leaveGroup(groupIdNum, userId);

      return reply.status(200).send({
        success: true,
        message: 'Successfully left the group'
      });
    } catch (error) {
      console.error('Error leaving group:', error);
      const statusCode = error instanceof Error && error.message.includes('not a member') ? 409 :
                        error instanceof Error && error.message.includes('not found') ? 404 :
                        error instanceof Error && error.message.includes('last admin') ? 400 : 500;
      return reply.status(statusCode).send({
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error',
        statusCode
      });
    }
  });
}
