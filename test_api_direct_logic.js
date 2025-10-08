const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://cgryfltmvaplsrawoktj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNncnlmbHRtdmFwbHNyYXdva3RqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzM0NTg0NywiZXhwIjoyMDcyOTIxODQ3fQ.HM-uJp33p6wYcGh-2PqjuvJXTnrvfN3EwBR1V9hVm5I';

const supabase = createClient(supabaseUrl, supabaseKey);

// Copy the compatibility logic from the API
const COMPATIBILITY_CONFIG = {
  WEIGHTS: {
    INTERESTS: 0.4,
    ACADEMIC_FIELD: 0.3,
    STUDY_GOALS: 0.2,
    STUDY_STYLE: 0.1
  },
  THRESHOLDS: {
    MIN_SCORE: 0.3,
    HIGH_COMPATIBILITY: 0.7
  }
};

function calculateCompatibilityScore(user1, user2) {
  let totalScore = 0;
  let totalWeight = 0;

  // Interests compatibility
  if (user1.interests && user2.interests) {
    const interests1 = Array.isArray(user1.interests) ? user1.interests : [];
    const interests2 = Array.isArray(user2.interests) ? user2.interests : [];
    
    const commonInterests = interests1.filter(interest => 
      interests2.some(i2 => i2.toLowerCase() === interest.toLowerCase())
    );
    
    const interestScore = interests1.length > 0 ? commonInterests.length / Math.max(interests1.length, interests2.length) : 0;
    totalScore += interestScore * COMPATIBILITY_CONFIG.WEIGHTS.INTERESTS;
    totalWeight += COMPATIBILITY_CONFIG.WEIGHTS.INTERESTS;
    
    console.log(`Interest compatibility: ${commonInterests.length} common interests out of ${Math.max(interests1.length, interests2.length)} total = ${interestScore.toFixed(2)}`);
  }

  // Academic field compatibility
  if (user1.academic_field && user2.academic_field) {
    const fieldScore = user1.academic_field.toLowerCase() === user2.academic_field.toLowerCase() ? 1 : 0;
    totalScore += fieldScore * COMPATIBILITY_CONFIG.WEIGHTS.ACADEMIC_FIELD;
    totalWeight += COMPATIBILITY_CONFIG.WEIGHTS.ACADEMIC_FIELD;
    
    console.log(`Academic field compatibility: ${user1.academic_field} vs ${user2.academic_field} = ${fieldScore}`);
  }

  // Study goals compatibility
  if (user1.study_goals && user2.study_goals) {
    const goals1 = Array.isArray(user1.study_goals) ? user1.study_goals : [];
    const goals2 = Array.isArray(user2.study_goals) ? user2.study_goals : [];
    
    const commonGoals = goals1.filter(goal => 
      goals2.some(g2 => g2.toLowerCase() === goal.toLowerCase())
    );
    
    const goalScore = goals1.length > 0 ? commonGoals.length / Math.max(goals1.length, goals2.length) : 0;
    totalScore += goalScore * COMPATIBILITY_CONFIG.WEIGHTS.STUDY_GOALS;
    totalWeight += COMPATIBILITY_CONFIG.WEIGHTS.STUDY_GOALS;
    
    console.log(`Study goals compatibility: ${commonGoals.length} common goals = ${goalScore.toFixed(2)}`);
  }

  return totalWeight > 0 ? totalScore / totalWeight : 0;
}

async function testPeerSuggestionsLogic() {
  try {
    console.log('=== Testing Peer Suggestions Logic Directly ===\n');
    
    // Get Ibrahim's profile
    const { data: ibrahim, error: ibrahimError } = await supabase
      .from('profiles')
      .select('*')
      .eq('full_name', 'Ibrahim Murtraza')
      .single();
    
    if (ibrahimError || !ibrahim) {
      console.error('Could not find Ibrahim:', ibrahimError);
      return;
    }
    
    console.log('Current user (Ibrahim):', {
      name: ibrahim.full_name,
      interests: ibrahim.interests,
      academic_field: ibrahim.academic_field,
      study_goals: ibrahim.study_goals
    });
    
    // Get all other profiles
    const { data: allProfiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .neq('id', ibrahim.id);
    
    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      return;
    }
    
    console.log(`\nFound ${allProfiles.length} other profiles to compare against:\n`);
    
    // Calculate compatibility with each profile
    const suggestions = [];
    
    for (const profile of allProfiles) {
      console.log(`--- Comparing with ${profile.full_name} ---`);
      console.log('Profile data:', {
        interests: profile.interests,
        academic_field: profile.academic_field,
        study_goals: profile.study_goals
      });
      
      const compatibilityScore = calculateCompatibilityScore(ibrahim, profile);
      
      console.log(`Final compatibility score: ${compatibilityScore.toFixed(3)}`);
      console.log(`Meets minimum threshold (${COMPATIBILITY_CONFIG.THRESHOLDS.MIN_SCORE}): ${compatibilityScore >= COMPATIBILITY_CONFIG.THRESHOLDS.MIN_SCORE ? 'YES' : 'NO'}\n`);
      
      if (compatibilityScore >= COMPATIBILITY_CONFIG.THRESHOLDS.MIN_SCORE) {
        suggestions.push({
          ...profile,
          compatibility_score: compatibilityScore
        });
      }
    }
    
    // Sort by compatibility score
    suggestions.sort((a, b) => b.compatibility_score - a.compatibility_score);
    
    console.log('=== FINAL RESULTS ===');
    console.log(`Total suggestions: ${suggestions.length}`);
    
    if (suggestions.length > 0) {
      console.log('\nSuggested peers:');
      suggestions.forEach((peer, index) => {
        console.log(`${index + 1}. ${peer.full_name} - Score: ${peer.compatibility_score.toFixed(3)}`);
        console.log(`   Interests: ${peer.interests?.join(', ') || 'None'}`);
        console.log(`   Academic Field: ${peer.academic_field || 'None'}`);
        console.log(`   Study Goals: ${peer.study_goals?.join(', ') || 'None'}\n`);
      });
    } else {
      console.log('No compatible peers found.');
      console.log('\nPossible reasons:');
      console.log('1. No profiles have matching interests/fields/goals');
      console.log('2. Compatibility threshold is too high');
      console.log('3. Data format issues (arrays vs strings)');
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testPeerSuggestionsLogic();