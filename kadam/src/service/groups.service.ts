import { GroupsRepository, Group, GroupMember, GroupMessage } from '../repository/groups.repository';
import { UserRepository } from '../repository/users.repository';
import { postgresPubSub } from '../infra/pubsub';
import {
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

export class GroupsService {
  private groupsRepository: GroupsRepository;
  private userRepository: UserRepository;

  constructor() {
    this.groupsRepository = new GroupsRepository();
    this.userRepository = new UserRepository();
  }

  // Group management
  async createGroup(groupData: CreateGroupRequest, userId: number, userType: string): Promise<Group> {
    // Check if user is an admin based on JWT userType
    if (userType !== 'admin') {
      throw new Error('Only admins can create groups');
    }

    const group = await this.groupsRepository.createGroup(groupData, userId);

    // Add creator as admin member
    await this.groupsRepository.addMember(group.id, userId, 'admin');

    return group;
  }

  async getGroupById(id: number, userId: number): Promise<{
    group: Group;
    memberCount: number;
    onlineMemberCount: number;
    isMember: boolean;
    userRole: 'admin' | 'moderator' | 'member' | null;
  } | null> {
    const group = await this.groupsRepository.getGroupById(id);
    if (!group) {
      return null;
    }

    const stats = await this.groupsRepository.getGroupStats(id);
    const member = await this.groupsRepository.getGroupMember(id, userId);

    return {
      group,
      memberCount: stats.memberCount,
      onlineMemberCount: stats.onlineMemberCount,
      isMember: !!member,
      userRole: member?.role || null
    };
  }

  async updateGroup(id: number, updates: UpdateGroupRequest, userId: number, userType: string): Promise<Group | null> {
    const group = await this.groupsRepository.getGroupById(id);
    if (!group) {
      return null;
    }

    // Check if user is an admin based on JWT userType
    if (userType !== 'admin') {
      throw new Error('Only admins can update group details');
    }

    return this.groupsRepository.updateGroup(id, updates);
  }

  async deleteGroup(id: number, userId: number, userType: string): Promise<boolean> {
    const group = await this.groupsRepository.getGroupById(id);
    if (!group) {
      return false;
    }

    // Check if user is an admin based on JWT userType
    if (userType !== 'admin') {
      throw new Error('Only admins can delete groups');
    }

    return this.groupsRepository.deleteGroup(id);
  }

  async getGroups(queryParams: GetGroupsQuery, userId: number): Promise<{
    groups: Group[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const { page = 1, limit = 10 } = queryParams;
    const result = await this.groupsRepository.getGroups(queryParams, userId);

    return {
      ...result,
      page,
      limit,
      totalPages: Math.ceil(result.total / limit)
    };
  }

  // Member management
  async addMember(groupId: number, memberData: AddMemberRequest, userId: number, userType: string): Promise<GroupMember> {
    const group = await this.groupsRepository.getGroupById(groupId);
    if (!group) {
      throw new Error('Group not found');
    }

    // Check if user is an admin based on JWT userType
    if (userType !== 'admin') {
      throw new Error('Only admins can add members to groups');
    }

    // Check if user is already a member
    const existingMember = await this.groupsRepository.getGroupMember(groupId, memberData.user_id);
    if (existingMember) {
      throw new Error('User is already a member of this group');
    }

    return this.groupsRepository.addMember(groupId, memberData.user_id, 'member');
  }

  async removeMember(groupId: number, targetUserId: number, userId: number, userType: string): Promise<boolean> {
    const group = await this.groupsRepository.getGroupById(groupId);
    if (!group) {
      throw new Error('Group not found');
    }

    // Check if user is an admin based on JWT userType
    if (userType !== 'admin') {
      throw new Error('Only admins can remove members from groups');
    }

    return this.groupsRepository.removeMember(groupId, targetUserId);
  }

  async updateMemberRole(groupId: number, targetUserId: number, roleData: UpdateMemberRoleRequest, userId: number, userType: string): Promise<GroupMember | null> {
    const group = await this.groupsRepository.getGroupById(groupId);
    if (!group) {
      throw new Error('Group not found');
    }

    // Check if user is an admin based on JWT userType
    if (userType !== 'admin') {
      throw new Error('Only admins can update member roles');
    }

    return this.groupsRepository.updateMemberRole(groupId, targetUserId, roleData.role);
  }

  async getGroupMembers(groupId: number, queryParams: GetGroupMembersQuery, userId: number): Promise<{
    members: GroupMember[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    // Check if user is a member of the group
    const isMember = await this.groupsRepository.isGroupMember(groupId, userId);
    if (!isMember) {
      throw new Error('You must be a member of this group to view members');
    }

    const { page = 1, limit = 10 } = queryParams;
    const result = await this.groupsRepository.getGroupMembers(groupId, queryParams);

    return {
      ...result,
      page,
      limit,
      totalPages: Math.ceil(result.total / limit)
    };
  }

  // Message operations
  async sendMessage(groupId: number, messageData: SendMessageRequest, userId: number): Promise<GroupMessage> {
    // Check if user is a member of the group
    const isMember = await this.groupsRepository.isGroupMember(groupId, userId);
    if (!isMember) {
      throw new Error('You must be a member of this group to send messages');
    }

    const message = await this.groupsRepository.createMessage(groupId, userId, {
      message_type: (messageData.type as 'text' | 'audio' | 'file' | 'image') || 'text',
      content: messageData.message
    });

    // Update user's online status
    await this.groupsRepository.updateMemberOnlineStatus(groupId, userId, true);

    return message;
  }

  async sendAudioMessage(groupId: number, audioData: SendAudioMessageRequest, userId: number): Promise<GroupMessage> {
    // Check if user is a member of the group
    const isMember = await this.groupsRepository.isGroupMember(groupId, userId);
    if (!isMember) {
      throw new Error('You must be a member of this group to send messages');
    }

    // For now, use the provided audioUri directly
    // In a full implementation, you would upload the file to S3 first
    const message = await this.groupsRepository.createMessage(groupId, userId, {
      message_type: 'audio',
      file_url: audioData.audioUri,
      file_name: `audio_${Date.now()}.mp3`,
      audio_duration: audioData.duration
    });

    // Update user's online status
    await this.groupsRepository.updateMemberOnlineStatus(groupId, userId, true);

    return message;
  }

  async sendFileMessage(groupId: number, fileData: SendFileMessageRequest, userId: number): Promise<GroupMessage> {
    // Check if user is a member of the group
    const isMember = await this.groupsRepository.isGroupMember(groupId, userId);
    if (!isMember) {
      throw new Error('You must be a member of this group to send messages');
    }

    // For now, use the provided fileUri directly
    // In a full implementation, you would upload the file to S3 first
    const message = await this.groupsRepository.createMessage(groupId, userId, {
      message_type: fileData.fileType,
      file_url: fileData.fileUri,
      file_name: fileData.fileName
    });

    // Update user's online status
    await this.groupsRepository.updateMemberOnlineStatus(groupId, userId, true);

    return message;
  }

  async getGroupMessages(groupId: number, queryParams: GetGroupMessagesQuery, userId: number): Promise<{
    messages: GroupMessage[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    // Check if user is a member of the group
    const isMember = await this.groupsRepository.isGroupMember(groupId, userId);
    if (!isMember) {
      throw new Error('You must be a member of this group to view messages');
    }

    const { page = 1, limit = 50 } = queryParams;
    const result = await this.groupsRepository.getGroupMessages(groupId, queryParams);

    return {
      ...result,
      page,
      limit,
      totalPages: Math.ceil(result.total / limit)
    };
  }

  async deleteMessage(groupId: number, messageId: number, userId: number): Promise<boolean> {
    // Check if user is a member of the group
    const isMember = await this.groupsRepository.isGroupMember(groupId, userId);
    if (!isMember) {
      throw new Error('You must be a member of this group to delete messages');
    }

    const message = await this.groupsRepository.getMessageById(messageId);
    if (!message) {
      throw new Error('Message not found');
    }

    // Check if user is the sender or an admin
    const isAdmin = await this.groupsRepository.isGroupAdmin(groupId, userId);
    if (message.sender_id !== userId && !isAdmin) {
      throw new Error('You can only delete your own messages or be an admin');
    }

    return this.groupsRepository.deleteMessage(messageId, userId);
  }

  async markMessagesAsRead(groupId: number, readData: MarkMessagesReadRequest, userId: number): Promise<void> {
    // Check if user is a member of the group
    const isMember = await this.groupsRepository.isGroupMember(groupId, userId);
    if (!isMember) {
      throw new Error('You must be a member of this group to mark messages as read');
    }

    // Update user's online status and last seen
    await this.groupsRepository.updateMemberOnlineStatus(groupId, userId, true);
  }

  // Real-time messaging with PostgreSQL LISTEN/NOTIFY
  async subscribeToGroupMessages(groupId: number, userId: number): Promise<any> {
    // Check if user is a member of the group
    const isMember = await this.groupsRepository.isGroupMember(groupId, userId);
    if (!isMember) {
      throw new Error('You must be a member of this group to subscribe to messages');
    }

    // Subscribe to PostgreSQL channel
    const client = await postgresPubSub.subscribe(groupId, userId);

    return client;
  }

  async unsubscribeFromGroupMessages(groupId: number, userId: number): Promise<void> {
    await postgresPubSub.unsubscribe(groupId, userId);
  }

  // Update user online status
  async updateUserOnlineStatus(groupId: number, userId: number, isOnline: boolean): Promise<void> {
    await this.groupsRepository.updateMemberOnlineStatus(groupId, userId, isOnline);
  }

  // Get group statistics
  async getGroupStats(groupId: number, userId: number): Promise<{
    memberCount: number;
    onlineMemberCount: number;
    messageCount: number;
    lastMessageAt?: Date;
  }> {
    // Check if user is a member of the group
    const isMember = await this.groupsRepository.isGroupMember(groupId, userId);
    if (!isMember) {
      throw new Error('You must be a member of this group to view statistics');
    }

    return this.groupsRepository.getGroupStats(groupId);
  }

  // Get suggested groups
  async getSuggestedGroups(queryParams: GetSuggestedGroupsQuery, userId: number): Promise<{
    groups: any[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const { page = 1, limit = 10 } = queryParams;
    const result = await this.groupsRepository.getSuggestedGroups(queryParams, userId);

    return {
      ...result,
      page,
      limit,
      totalPages: Math.ceil(result.total / limit)
    };
  }

  // Join group
  async joinGroup(groupId: number, userId: number): Promise<{
    member: {
      id: string;
      userId: string;
      name: string;
      avatar?: string;
      role: 'member';
      isOnline: boolean;
      joinedAt: string;
      lastSeen: string;
    };
  }> {
    const member = await this.groupsRepository.joinGroup(groupId, userId);
    const userInfo = await this.userRepository.getUserInfo(userId);

    if (!userInfo) {
      throw new Error('User information not found');
    }

    return {
      member: {
        id: member.id.toString(),
        userId: member.user_id.toString(),
        name: userInfo.name,
        avatar: userInfo.avatar_url,
        role: 'member' as const,
        isOnline: member.is_online,
        joinedAt: member.joined_at.toISOString(),
        lastSeen: member.last_seen.toISOString()
      }
    };
  }

  // Leave group
  async leaveGroup(groupId: number, userId: number): Promise<void> {
    await this.groupsRepository.leaveGroup(groupId, userId);
  }
}
