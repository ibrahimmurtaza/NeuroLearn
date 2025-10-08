import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { 
  PeerSuggestion, 
  PeerDiscoveryFilters, 
  CompatibilityFactors, 
  CompatibilityScore,
  UserProfile 
} from '@/shared/types/peer-networking';
import { 
  API_CONFIG, 
  COMPATIBILITY_CONFIG, 
  STUDY_STYLE_MATRIX, 
  DATABASE_CONFIG,
  DEFAULTS,
  MATCH_KEYWORDS
} from '@/config/networking';

// Default compatibility factors for the matching algorithm
const DEFAULT_COMPATIBILITY_FACTORS: CompatibilityFactors = {
  shared_interests_weight: 0.4,
  shared_subjects_weight: 0.3,
  study_style_compatibility: 0.1,
  availability_overlap: 0.1,
  learning_goals_alignment: 0.1,
  experience_level_match: 0.0
};

export async function GET(request: NextRequest) {
  try {
    // Create supabase client with service role for debugging
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const { createClient: createServiceClient } = require('@supabase/supabase-js');
    const supabaseAdmin = createServiceClient(supabaseUrl, supabaseServiceKey);
    
    const supabase = createClient();
    
    // TEMPORARY: Skip authentication for debugging
    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    // For debugging, use Ibrahim's ID if no authenticated user
    let userId = user?.id;
    if (!userId) {
      console.log('No authenticated user, using Ibrahim for testing');
      userId = 'efce5c7e-7eb5-4a56-a1f7-e056dca8c6c2'; // Ibrahim's ID
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || API_CONFIG.PAGINATION.DEFAULT_PAGE.toString());
    const limit = parseInt(searchParams.get('limit') || API_CONFIG.PAGINATION.SUGGESTIONS_LIMIT.toString());
    const offset = (page - 1) * limit;

    // Parse filters from query parameters
    const filters: PeerDiscoveryFilters = {
      subjects: searchParams.get('subjects')?.split(',').filter(Boolean),
      interests: searchParams.get('interests')?.split(',').filter(Boolean),
      connection_type: searchParams.get('connection_type') as any,
      availability_overlap: searchParams.get('availability_overlap') === 'true',
      min_compatibility_score: parseFloat(searchParams.get('min_compatibility_score') || '25')
    };

    // Get current user's profile
    console.log('Fetching profile for user ID:', userId);
    console.log('Using table name:', DATABASE_CONFIG.TABLES.PROFILES);
    
    // First check if the profile exists without .single() using admin client
    const { data: profileCheck, error: checkError } = await supabaseAdmin
      .from(DATABASE_CONFIG.TABLES.PROFILES)
      .select('*')
      .eq('id', userId);
    
    console.log('Profile check result:', { 
      profileCheck: profileCheck?.length || 0, 
      checkError,
      userId,
      tableName: DATABASE_CONFIG.TABLES.PROFILES
    });
    
    // Let's also try a direct query to see what's in the profiles table
    const { data: allProfiles, error: allError } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name')
      .limit(5);
    
    console.log('All profiles sample:', { allProfiles, allError });
    
    if (checkError) {
      console.error('Profile check error:', checkError);
      return NextResponse.json({ error: 'Database error', details: checkError }, { status: 500 });
    }
    
    if (!profileCheck || profileCheck.length === 0) {
      console.error('No profile found for user ID:', userId);
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }
    
    const currentUserProfile = profileCheck[0];

    // Get existing connections to exclude them
    const { data: existingConnections } = await supabase
      .from(DATABASE_CONFIG.TABLES.CONNECTIONS)
      .select('requester_id, receiver_id')
      .or(`requester_id.eq.${userId},receiver_id.eq.${userId}`);

    const excludeUserIds = new Set([
      userId,
      ...(existingConnections || []).map(conn => 
        conn.requester_id === userId ? conn.receiver_id : conn.requester_id
      )
    ]);

    // Build query for potential peers using admin client
    let query = supabaseAdmin
      .from(DATABASE_CONFIG.TABLES.PROFILES)
      .select('*')
      .neq('id', userId)
      .eq('role', 'student'); // Only show student peers

    // Apply filters
    if (filters.subjects && filters.subjects.length > 0) {
      query = query.overlaps('subjects', filters.subjects);
    }

    if (filters.interests && filters.interests.length > 0) {
      query = query.overlaps('interests', filters.interests);
    }

    const { data: potentialPeers, error: peersError } = await query;
    
    console.log('Potential peers query result:', { 
      potentialPeersCount: potentialPeers?.length || 0, 
      peersError,
      filters 
    });

    if (peersError) {
      return NextResponse.json({ error: 'Failed to fetch potential peers' }, { status: 500 });
    }

    // Filter out existing connections
    const filteredPeers = (potentialPeers || []).filter(peer => !excludeUserIds.has(peer.id));
    
    console.log('Filtered peers count:', filteredPeers.length);
    console.log('Current user profile interests:', currentUserProfile.interests);

    // Calculate compatibility scores and create suggestions
    const suggestions: PeerSuggestion[] = [];

    for (const peer of filteredPeers) {
      console.log(`Checking peer ${peer.full_name}:`, {
        interests: peer.interests,
        subjects: peer.subjects
      });
      
      const compatibilityScore = calculateCompatibilityScore(currentUserProfile, peer);
      
      console.log(`Compatibility score for ${peer.full_name}:`, compatibilityScore.total_score);
      console.log('Min compatibility score required:', filters.min_compatibility_score || COMPATIBILITY_CONFIG.SCORING.MIN_COMPATIBILITY_SCORE);
      
      if (compatibilityScore.total_score >= (filters.min_compatibility_score || 25)) {
        const suggestion: PeerSuggestion = {
          user: peer,
          compatibility_score: compatibilityScore.total_score,
          shared_interests: findSharedItems(currentUserProfile.interests || [], peer.interests || []),
          shared_subjects: findSharedItems(currentUserProfile.subjects || [], peer.subjects || []),
          match_reasons: generateMatchReasons(currentUserProfile, peer, compatibilityScore),
          suggested_connection_type: suggestConnectionType(currentUserProfile, peer)
        };

        suggestions.push(suggestion);
        console.log(`Added suggestion for ${peer.full_name}`);
      } else {
        console.log(`Skipped ${peer.full_name} - compatibility score too low`);
      }
    }

    // Sort by compatibility score (highest first)
    suggestions.sort((a, b) => b.compatibility_score - a.compatibility_score);

    // Apply pagination
    const paginatedSuggestions = suggestions.slice(offset, offset + limit);

    return NextResponse.json({
      suggestions: paginatedSuggestions,
      total: suggestions.length,
      page,
      limit
    });

  } catch (error) {
    console.error('Error in peer suggestions API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Helper function to calculate compatibility score between two users
function calculateCompatibilityScore(user1: UserProfile, user2: UserProfile): CompatibilityScore {
  try {
    console.log(`Calculating compatibility between ${user1.full_name} and ${user2.full_name}`);
    
    const factors = DEFAULT_COMPATIBILITY_FACTORS;
    
    // Calculate shared interests score
    const sharedInterests = findSharedItems(user1.interests || [], user2.interests || []);
    const interestsScore = Math.min(sharedInterests.length / Math.max(user1.interests?.length || 1, 1), 1) * 100;
    console.log(`Interests score: ${interestsScore} (shared: ${sharedInterests.length})`);

    // Calculate shared subjects score
    const sharedSubjects = findSharedItems(user1.subjects || [], user2.subjects || []);
    const subjectsScore = Math.min(sharedSubjects.length / Math.max(user1.subjects?.length || 1, 1), 1) * 100;
    console.log(`Subjects score: ${subjectsScore} (shared: ${sharedSubjects.length})`);

    // Calculate study style compatibility
    const studyStyleScore = calculateStudyStyleCompatibility(user1, user2);
    console.log(`Study style score: ${studyStyleScore}`);

    // Calculate availability overlap (simplified)
    const availabilityScore = calculateAvailabilityOverlap(user1, user2);
    console.log(`Availability score: ${availabilityScore}`);

    // Calculate learning goals alignment
    const learningGoalsScore = calculateLearningGoalsAlignment(user1, user2);
    console.log(`Learning goals score: ${learningGoalsScore}`);

    // Calculate experience level match (simplified - based on profile completeness)
    const experienceScore = calculateExperienceMatch(user1, user2);
    console.log(`Experience score: ${experienceScore}`);

    const breakdown = {
      shared_interests: interestsScore,
      shared_subjects: subjectsScore,
      study_style: studyStyleScore,
      availability: availabilityScore,
      learning_goals: learningGoalsScore,
      experience_level: experienceScore
    };

    // Calculate weighted total score
    const totalScore = 
      (breakdown.shared_interests * factors.shared_interests_weight) +
      (breakdown.shared_subjects * factors.shared_subjects_weight) +
      (breakdown.study_style * factors.study_style_compatibility) +
      (breakdown.availability * factors.availability_overlap) +
      (breakdown.learning_goals * factors.learning_goals_alignment) +
      (breakdown.experience_level * factors.experience_level_match);

    console.log(`Total compatibility score: ${totalScore}`);

    return {
      total_score: Math.round(totalScore * 100) / 100,
      breakdown
    };
  } catch (error) {
    console.error('Error in calculateCompatibilityScore:', error);
    // Return a default score to prevent API failure
    return {
      total_score: 0,
      breakdown: {
        shared_interests: 0,
        shared_subjects: 0,
        study_style: 0,
        availability: 0,
        learning_goals: 0,
        experience_level: 0
      }
    };
  }
}

// Helper function to find shared items between two arrays
function findSharedItems(array1: string[], array2: string[]): string[] {
  return array1.filter(item => array2.includes(item));
}

// Calculate study style compatibility
function calculateStudyStyleCompatibility(user1: UserProfile, user2: UserProfile): number {
  const style1 = user1.study_preferences?.study_style;
  const style2 = user2.study_preferences?.study_style;
  
  if (!style1 || !style2) return COMPATIBILITY_CONFIG.SCORING.NEUTRAL_SCORE; // Neutral score if no data
  
  if (style1 === style2) return COMPATIBILITY_CONFIG.SCORING.MAX_COMPATIBILITY_SCORE;
  
  return STUDY_STYLE_MATRIX[style1]?.[style2] || COMPATIBILITY_CONFIG.SCORING.NEUTRAL_SCORE;
}

// Calculate availability overlap (simplified implementation)
function calculateAvailabilityOverlap(user1: UserProfile, user2: UserProfile): number {
  // This is a simplified implementation
  // In a real system, you'd compare actual time slots
  const tz1 = user1.availability?.timezone;
  const tz2 = user2.availability?.timezone;
  
  if (!tz1 || !tz2) return COMPATIBILITY_CONFIG.SCORING.NEUTRAL_SCORE;
  if (tz1 === tz2) return DEFAULTS.SAME_TIMEZONE_SCORE;
  
  // Simple timezone compatibility (could be enhanced with actual time zone calculations)
  return DEFAULTS.TIMEZONE_COMPATIBILITY_SCORE;
}

// Calculate learning goals alignment
function calculateLearningGoalsAlignment(user1: UserProfile, user2: UserProfile): number {
  const goals1 = user1.learning_goals || [];
  const goals2 = user2.learning_goals || [];
  
  if (goals1.length === 0 || goals2.length === 0) return COMPATIBILITY_CONFIG.SCORING.NEUTRAL_SCORE;
  
  const sharedGoals = findSharedItems(goals1, goals2);
  return Math.min(sharedGoals.length / Math.max(goals1.length, goals2.length), 1) * COMPATIBILITY_CONFIG.SCORING.MAX_COMPATIBILITY_SCORE;
}

// Calculate experience level match
function calculateExperienceMatch(user1: UserProfile, user2: UserProfile): number {
  // Simple heuristic based on profile completeness
  const completeness1 = calculateProfileCompleteness(user1);
  const completeness2 = calculateProfileCompleteness(user2);
  
  const difference = Math.abs(completeness1 - completeness2);
  return Math.max(COMPATIBILITY_CONFIG.SCORING.MAX_COMPATIBILITY_SCORE - (difference * DEFAULTS.PROFILE_COMPLETENESS_MULTIPLIER), COMPATIBILITY_CONFIG.SCORING.MIN_COMPATIBILITY_SCORE);
}

// Calculate profile completeness as a proxy for experience level
function calculateProfileCompleteness(user: UserProfile): number {
  let score = 0;
  const maxScore = 7;
  
  if (user.full_name) score++;
  if (user.bio) score++;
  if (user.interests && user.interests.length > 0) score++;
  if (user.subjects && user.subjects.length > 0) score++;
  if (user.learning_goals && user.learning_goals.length > 0) score++;
  if (user.study_preferences) score++;
  if (user.availability) score++;
  
  return (score / maxScore) * 100;
}

// Generate match reasons based on compatibility analysis
function generateMatchReasons(user1: UserProfile, user2: UserProfile, score: CompatibilityScore): string[] {
  const reasons: string[] = [];
  
  if (score.breakdown.shared_interests > 70) {
    const shared = findSharedItems(user1.interests || [], user2.interests || []);
    reasons.push(`Shares ${shared.length} interests: ${shared.slice(0, 2).join(', ')}`);
  }
  
  if (score.breakdown.shared_subjects > 70) {
    const shared = findSharedItems(user1.subjects || [], user2.subjects || []);
    reasons.push(`Studies similar subjects: ${shared.slice(0, 2).join(', ')}`);
  }
  
  if (score.breakdown.study_style > 80) {
    reasons.push(`Compatible study styles`);
  }
  
  if (score.breakdown.availability > 80) {
    reasons.push(`Similar availability and timezone`);
  }
  
  if (score.breakdown.learning_goals > 70) {
    reasons.push(`Aligned learning goals`);
  }
  
  if (reasons.length === 0) {
    reasons.push('Good overall compatibility match');
  }
  
  return reasons;
}

// Suggest the most appropriate connection type
function suggestConnectionType(user1: UserProfile, user2: UserProfile): any {
  const completeness1 = calculateProfileCompleteness(user1);
  const completeness2 = calculateProfileCompleteness(user2);
  
  // If one user is significantly more experienced, suggest mentor/mentee
  if (completeness1 - completeness2 > 30) {
    return 'mentor';
  } else if (completeness2 - completeness1 > 30) {
    return 'mentee';
  }
  
  // Check for project collaboration indicators
  const goals1 = user1.learning_goals || [];
  const goals2 = user2.learning_goals || [];
  
  const projectKeywords = ['project', 'build', 'develop', 'create', 'collaborate'];
  const hasProjectGoals1 = goals1.some(goal => 
    projectKeywords.some(keyword => goal.toLowerCase().includes(keyword))
  );
  const hasProjectGoals2 = goals2.some(goal => 
    projectKeywords.some(keyword => goal.toLowerCase().includes(keyword))
  );
  
  if (hasProjectGoals1 && hasProjectGoals2) {
    return 'project_collaborator';
  }
  
  // Default to study partner
  return 'study_partner';
}