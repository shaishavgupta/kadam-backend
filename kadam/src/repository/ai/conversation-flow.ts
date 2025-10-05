export type ConversationStage = 
  | 'greeting'
  | 'role_discovery'
  | 'goals_discovery'
  | 'ready_for_recommendations'
  | 'ongoing_support';

export interface UserProfile {
  // Basic user information from users table
  name?: string;
  gender?: 'male' | 'female' | 'others' | 'unknown';
  dob?: string;
  bio?: string;
  
  // AI learning profile information
  currentRole?: string;
  experienceLevel?: 'beginner' | 'intermediate' | 'advanced' | 'unknown';
  learningGoals?: string[];
  interests?: string[];
  timeCommitment?: string | 'unknown';
  preferredLearningStyle?: 'video' | 'text' | 'practice' | 'mentor_guided' | 'unknown';
  currentSkills?: string[];
  challenges?: string[];
  persona?: 'student' | 'jobbie' | 'dylan' | 'content_creator' | 'unknown';
  dialect?: 'hinglish' | 'assamese' | 'telugu' | 'tamil' | 'bengali' | 'punjabi' | 'gujarati' | 'unknown';
  tier?: 'tier1' | 'tier2' | 'tier3' | 'unknown';
}

export class ConversationFlowManager {
  /**
   * Determine what stage of conversation we're in - more gradual approach
   */
  determineConversationStage(profile: UserProfile): ConversationStage {
    const hasRole = profile.currentRole;
    const hasGoals = profile.learningGoals && profile.learningGoals.length > 0;
    const hasExperience = profile.experienceLevel;
    const hasInterests = profile.interests && profile.interests.length > 0;
    const hasAnyInfo = hasRole || hasGoals || hasExperience || hasInterests;

    // More gradual approach - don't rush into detailed questions
    if (!hasAnyInfo) {
      return 'greeting';
    } else if (hasAnyInfo && !hasGoals) {
      // Only ask about goals if we have some basic info and they haven't shared goals yet
      return 'goals_discovery';
    } else if (hasGoals && !hasRole && !hasExperience) {
      // Only ask about role/experience if they've shared goals but we need more context
      return 'role_discovery';
    } else if (hasRole && hasGoals && hasExperience) {
      return 'ready_for_recommendations';
    } else {
      // Default to ongoing support for most cases
      return 'ongoing_support';
    }
  }

  /**
   * Get the next logical conversation stage based on current stage and profile
   */
  getNextStage(currentStage: ConversationStage, profile: UserProfile): ConversationStage {
    switch (currentStage) {
      case 'greeting':
        return this.hasBasicInfo(profile) ? 'goals_discovery' : 'role_discovery';
      
      case 'role_discovery':
        return this.hasRole(profile) ? 'goals_discovery' : 'ongoing_support';
      
      case 'goals_discovery':
        return this.hasGoals(profile) ? 'ready_for_recommendations' : 'ongoing_support';
      
      case 'ready_for_recommendations':
        return 'ongoing_support';
      
      case 'ongoing_support':
      default:
        return 'ongoing_support';
    }
  }

  /**
   * Check if user has provided basic information
   */
  private hasBasicInfo(profile: UserProfile): boolean {
    return !!(profile.currentRole || profile.experienceLevel || profile.interests?.length);
  }

  /**
   * Check if user has provided role information
   */
  private hasRole(profile: UserProfile): boolean {
    return !!profile.currentRole;
  }

  /**
   * Check if user has provided goals information
   */
  private hasGoals(profile: UserProfile): boolean {
    return !!(profile.learningGoals && profile.learningGoals.length > 0);
  }

  /**
   * Check if user has provided experience level
   */
  private hasExperience(profile: UserProfile): boolean {
    return !!profile.experienceLevel;
  }

  /**
   * Check if user has provided interests
   */
  private hasInterests(profile: UserProfile): boolean {
    return !!(profile.interests && profile.interests.length > 0);
  }

  /**
   * Get conversation stage description for debugging
   */
  getStageDescription(stage: ConversationStage): string {
    const descriptions = {
      greeting: 'Initial greeting and casual conversation',
      role_discovery: 'Learning about user\'s current role and profession',
      goals_discovery: 'Understanding user\'s learning goals and aspirations',
      ready_for_recommendations: 'User profile is complete, ready for course recommendations',
      ongoing_support: 'Providing ongoing support and guidance'
    };
    
    return descriptions[stage] || 'Unknown stage';
  }

  /**
   * Check if conversation stage requires profile completion
   */
  requiresProfileCompletion(stage: ConversationStage): boolean {
    return stage === 'ready_for_recommendations';
  }

  /**
   * Get missing profile fields for a given stage
   */
  getMissingProfileFields(profile: UserProfile, stage: ConversationStage): string[] {
    const missing: string[] = [];
    
    if (stage === 'ready_for_recommendations') {
      if (!profile.currentRole) missing.push('currentRole');
      if (!profile.experienceLevel) missing.push('experienceLevel');
      if (!profile.learningGoals?.length) missing.push('learningGoals');
    }
    
    return missing;
  }
}
