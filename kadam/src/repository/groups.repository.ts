import { db } from '../infra/db';
import {
  GroupSchema,
  GroupMemberSchema,
  GroupMessageSchema,
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

export interface Group {
  id: number;
  name: string;
  description?: string;
  thumbnail_url?: string;
  created_by: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface GroupMember {
  id: number;
  group_id: number;
  user_id: number;
  role: 'admin' | 'moderator' | 'member';
  joined_at: Date;
  is_online: boolean;
  last_seen: Date;
  created_at: Date;
  updated_at: Date;
}

export interface GroupMessage {
  id: number;
  group_id: number;
  sender_id: number;
  message_type: 'text' | 'audio' | 'file' | 'image';
  content?: string;
  file_url?: string;
  file_name?: string;
  audio_duration?: number;
  is_deleted: boolean;
  deleted_at?: Date;
  deleted_by?: number;
  created_at: Date;
  updated_at: Date;
}

export class GroupsRepository {
  // Group CRUD operations
  async createGroup(groupData: CreateGroupRequest, createdBy: number): Promise<Group> {
    const query = `
      INSERT INTO groups (name, description, thumbnail_url, created_by)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;

    const values = [
      groupData.name,
      groupData.description || null,
      groupData.thumbnail_url || null,
      createdBy
    ];

    const result = await db.query(query, values);
    return result.rows[0];
  }

  async getGroupById(id: number): Promise<Group | null> {
    const query = 'SELECT * FROM groups WHERE id = $1 AND is_active = true';
    const result = await db.query(query, [id]);
    return result.rows[0] || null;
  }

  async updateGroup(id: number, updates: UpdateGroupRequest): Promise<Group | null> {
    const setClause: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        setClause.push(`${key} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    });

    if (setClause.length === 0) {
      return this.getGroupById(id);
    }

    values.push(id);
    const query = `
      UPDATE groups
      SET ${setClause.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramIndex} AND is_active = true
      RETURNING *
    `;

    const result = await db.query(query, values);
    return result.rows[0] || null;
  }

  async deleteGroup(id: number): Promise<boolean> {
    const query = 'UPDATE groups SET is_active = false WHERE id = $1';
    const result = await db.query(query, [id]);
    return (result.rowCount || 0) > 0;
  }

  async getGroups(queryParams: GetGroupsQuery, userId: number): Promise<{ groups: Group[]; total: number }> {
    const { page = 1, limit = 10, search } = queryParams;
    const offset = (page - 1) * limit;

    // Only show groups where user is a member
    let whereConditions = ['g.is_active = true'];
    const values: any[] = [userId];
    let paramIndex = 2;

    if (search) {
      whereConditions.push(`(g.name ILIKE $${paramIndex} OR g.description ILIKE $${paramIndex})`);
      values.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause = whereConditions.join(' AND ');

    // Get total count
    const countQuery = `
      SELECT COUNT(DISTINCT g.id)
      FROM groups g
      INNER JOIN group_members gm ON g.id = gm.group_id
      WHERE gm.user_id = $1 AND ${whereClause}
    `;
    const countResult = await db.query(countQuery, values);
    const total = parseInt(countResult.rows[0].count);

    // Get groups
    const query = `
      SELECT DISTINCT g.*
      FROM groups g
      INNER JOIN group_members gm ON g.id = gm.group_id
      WHERE gm.user_id = $1 AND ${whereClause}
      ORDER BY g.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    values.push(limit, offset);

    const result = await db.query(query, values);
    return { groups: result.rows, total };
  }

  // Member management
  async addMember(groupId: number, userId: number, role: 'admin' | 'moderator' | 'member' = 'member'): Promise<GroupMember> {
    const query = `
      INSERT INTO group_members (group_id, user_id, role)
      VALUES ($1, $2, $3)
      ON CONFLICT (group_id, user_id)
      DO UPDATE SET
        role = EXCLUDED.role,
        joined_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;

    const result = await db.query(query, [groupId, userId, role]);
    return result.rows[0];
  }

  async removeMember(groupId: number, userId: number): Promise<boolean> {
    const query = 'DELETE FROM group_members WHERE group_id = $1 AND user_id = $2';
    const result = await db.query(query, [groupId, userId]);
    return (result.rowCount || 0) > 0;
  }

  async updateMemberRole(groupId: number, userId: number, role: 'admin' | 'moderator' | 'member'): Promise<GroupMember | null> {
    const query = `
      UPDATE group_members
      SET role = $3, updated_at = CURRENT_TIMESTAMP
      WHERE group_id = $1 AND user_id = $2
      RETURNING *
    `;
    const result = await db.query(query, [groupId, userId, role]);
    return result.rows[0] || null;
  }

  async getGroupMember(groupId: number, userId: number): Promise<GroupMember | null> {
    const query = 'SELECT * FROM group_members WHERE group_id = $1 AND user_id = $2';
    const result = await db.query(query, [groupId, userId]);
    return result.rows[0] || null;
  }

  async getGroupMembers(groupId: number, queryParams: GetGroupMembersQuery): Promise<{ members: GroupMember[]; total: number }> {
    const { page = 1, limit = 10, online_only = false } = queryParams;
    const offset = (page - 1) * limit;

    let whereConditions = ['group_id = $1'];
    const values = [groupId];
    let paramIndex = 2;

    if (online_only) {
      whereConditions.push('is_online = true');
    }

    const whereClause = whereConditions.join(' AND ');

    // Get total count
    const countQuery = `SELECT COUNT(*) FROM group_members WHERE ${whereClause}`;
    const countResult = await db.query(countQuery, values);
    const total = parseInt(countResult.rows[0].count);

    // Get members
    const query = `
      SELECT * FROM group_members
      WHERE ${whereClause}
      ORDER BY
        CASE role
          WHEN 'admin' THEN 1
          WHEN 'moderator' THEN 2
          WHEN 'member' THEN 3
        END,
        joined_at ASC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    values.push(limit, offset);

    const result = await db.query(query, values);
    return { members: result.rows, total };
  }

  async updateMemberOnlineStatus(groupId: number, userId: number, isOnline: boolean): Promise<GroupMember | null> {
    const query = `
      UPDATE group_members
      SET is_online = $3, last_seen = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE group_id = $1 AND user_id = $2
      RETURNING *
    `;
    const result = await db.query(query, [groupId, userId, isOnline]);
    return result.rows[0] || null;
  }

  // Message operations
  async createMessage(groupId: number, senderId: number, messageData: {
    message_type: 'text' | 'audio' | 'file' | 'image';
    content?: string;
    file_url?: string;
    file_name?: string;
    audio_duration?: number;
  }): Promise<GroupMessage> {
    const query = `
      INSERT INTO group_messages (group_id, sender_id, message_type, content, file_url, file_name, audio_duration)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const values = [
      groupId,
      senderId,
      messageData.message_type,
      messageData.content || null,
      messageData.file_url || null,
      messageData.file_name || null,
      messageData.audio_duration || null
    ];

    const result = await db.query(query, values);
    return result.rows[0];
  }

  async getGroupMessages(groupId: number, queryParams: GetGroupMessagesQuery): Promise<{ messages: GroupMessage[]; total: number }> {
    const { page = 1, limit = 50, message_type, before_message_id } = queryParams;
    const offset = (page - 1) * limit;

    let whereConditions = ['group_id = $1', 'is_deleted = false'];
    const values = [groupId];
    let paramIndex = 2;

    if (message_type) {
      whereConditions.push(`message_type = $${paramIndex}`);
      values.push(message_type);
      paramIndex++;
    }

    if (before_message_id) {
      whereConditions.push(`id < $${paramIndex}`);
      values.push(before_message_id);
      paramIndex++;
    }

    const whereClause = whereConditions.join(' AND ');

    // Get total count
    const countQuery = `SELECT COUNT(*) FROM group_messages WHERE ${whereClause}`;
    const countResult = await db.query(countQuery, values);
    const total = parseInt(countResult.rows[0].count);

    // Get messages
    const query = `
      SELECT * FROM group_messages
      WHERE ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    values.push(limit, offset);

    const result = await db.query(query, values);
    return { messages: result.rows.reverse(), total }; // Reverse to get chronological order
  }

  async deleteMessage(messageId: number, deletedBy: number): Promise<boolean> {
    const query = `
      UPDATE group_messages
      SET is_deleted = true, deleted_at = CURRENT_TIMESTAMP, deleted_by = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND is_deleted = false
      RETURNING *
    `;
    const result = await db.query(query, [messageId, deletedBy]);
    return (result.rowCount || 0) > 0;
  }

  async getMessageById(messageId: number): Promise<GroupMessage | null> {
    const query = 'SELECT * FROM group_messages WHERE id = $1';
    const result = await db.query(query, [messageId]);
    return result.rows[0] || null;
  }

  // Group statistics
  async getGroupStats(groupId: number): Promise<{
    memberCount: number;
    onlineMemberCount: number;
    messageCount: number;
    lastMessageAt?: Date;
  }> {
    const query = `
      SELECT
        COUNT(DISTINCT gm.user_id) as member_count,
        COUNT(DISTINCT CASE WHEN gm.is_online = true THEN gm.user_id END) as online_member_count,
        COUNT(gmsg.id) as message_count,
        MAX(gmsg.created_at) as last_message_at
      FROM group_members gm
      LEFT JOIN group_messages gmsg ON gm.group_id = gmsg.group_id AND gmsg.is_deleted = false
      WHERE gm.group_id = $1
    `;

    const result = await db.query(query, [groupId]);
    const row = result.rows[0];

    return {
      memberCount: parseInt(row.member_count),
      onlineMemberCount: parseInt(row.online_member_count),
      messageCount: parseInt(row.message_count),
      lastMessageAt: row.last_message_at
    };
  }

  // Check if user is member of group
  async isGroupMember(groupId: number, userId: number): Promise<boolean> {
    const query = 'SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2';
    const result = await db.query(query, [groupId, userId]);
    return result.rows.length > 0;
  }

  // Check if user has admin role in group
  async isGroupAdmin(groupId: number, userId: number): Promise<boolean> {
    const query = 'SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2 AND role = \'admin\'';
    const result = await db.query(query, [groupId, userId]);
    return result.rows.length > 0;
  }

  // Get suggested groups (groups user is NOT a member of)
  async getSuggestedGroups(queryParams: GetSuggestedGroupsQuery, userId: number): Promise<{ groups: any[]; total: number }> {
    const { page = 1, limit = 10, category, excludeJoined = true } = queryParams;
    const offset = (page - 1) * limit;

    let whereConditions = ['g.is_active = true'];
    const values = [];
    let paramIndex = 1;

    // Exclude groups user has already joined
    if (excludeJoined) {
      whereConditions.push(`g.id NOT IN (
        SELECT gm.group_id
        FROM group_members gm
        WHERE gm.user_id = $${paramIndex}
      )`);
      values.push(userId);
      paramIndex++;
    }

    // Filter by category if provided (assuming groups have a category field)
    if (category) {
      whereConditions.push(`g.name ILIKE $${paramIndex}`);
      values.push(`%${category}%`);
      paramIndex++;
    }

    const whereClause = whereConditions.join(' AND ');

    // Get total count
    const countQuery = `
      SELECT COUNT(DISTINCT g.id)
      FROM groups g
      WHERE ${whereClause}
    `;
    const countResult = await db.query(countQuery, values);
    const total = parseInt(countResult.rows[0].count);

    // Get groups with member counts and creator info
    const query = `
      SELECT
        g.id,
        g.name,
        g.description,
        g.thumbnail_url,
        g.created_by,
        g.is_active,
        g.created_at,
        g.updated_at,
        COUNT(DISTINCT gm.user_id) as member_count,
        COUNT(DISTINCT CASE WHEN gm.is_online = true THEN gm.user_id END) as online_member_count,
        u.name as creator_name
      FROM groups g
      LEFT JOIN group_members gm ON g.id = gm.group_id
      LEFT JOIN users u ON g.created_by = u.id
      WHERE ${whereClause}
      GROUP BY g.id, g.name, g.description, g.thumbnail_url, g.created_by, g.is_active, g.created_at, g.updated_at, u.name
      ORDER BY g.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    values.push(limit, offset);

    const result = await db.query(query, values);
    return { groups: result.rows, total };
  }

  // Join group (add user as member)
  async joinGroup(groupId: number, userId: number): Promise<GroupMember> {
    // Check if user is already a member
    const existingMember = await this.getGroupMember(groupId, userId);
    if (existingMember) {
      throw new Error('User is already a member of this group');
    }

    // Check if group exists and is active
    const group = await this.getGroupById(groupId);
    if (!group) {
      throw new Error('Group not found or inactive');
    }

    // Add user as member with role 'member'
    const member = await this.addMember(groupId, userId, 'member');

    return member;
  }

  // Leave group (remove user as member)
  async leaveGroup(groupId: number, userId: number): Promise<boolean> {
    // Check if user is a member
    const member = await this.getGroupMember(groupId, userId);
    if (!member) {
      throw new Error('User is not a member of this group');
    }

    // Check if user is the last admin
    if (member.role === 'admin') {
      const adminCount = await this.getAdminCount(groupId);
      if (adminCount <= 1) {
        throw new Error('Cannot leave group as the last admin. Please transfer admin role first.');
      }
    }

    // Remove user from group
    return this.removeMember(groupId, userId);
  }

  // Get count of admins in a group
  async getAdminCount(groupId: number): Promise<number> {
    const query = 'SELECT COUNT(*) FROM group_members WHERE group_id = $1 AND role = \'admin\'';
    const result = await db.query(query, [groupId]);
    return parseInt(result.rows[0].count);
  }

}
