const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://cgryfltmvaplsrawoktj.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNncnlmbHRtdmFwbHNyYXdva3RqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzM0NTg0NywiZXhwIjoyMDcyOTIxODQ3fQ.HM-uJp33p6wYcGh-2PqjuvJXTnrvfN3EwBR1V9hVm5I';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Simulate the peer suggestions algorithm directly
async function testPeerMatching() {
  try {
    console.log('Testing peer matching algorithm...');
    
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
    
    // Get Ameer's profile
    const { data: ameer, error: ameerError } = await supabase
      .from('profiles')
      .select('*')
      .eq('full_name', 'Ameer Hamza')
      .single();
    
    if (ameerError || !ameer) {
      console.error('Could not find Ameer:', ameerError);
      return;
    }
    
    console.log('\n=== IBRAHIM PROFILE ===');
    console.log('Name:', ibrahim.full_name);
    console.log('Interests:', ibrahim.interests);
    console.log('Academic Field:', ibrahim.academic_field);
    console.log('Study Goals:', ibrahim.study_goals);
    
    console.log('\n=== AMEER PROFILE ===');
    console.log('Name:', ameer.full_name);
    console.log('Interests:', ameer.interests);
    console.log('Academic Field:', ameer.academic_field);
    console.log('Study Goals:', ameer.study_goals);
    
    // Calculate compatibility
    const compatibility = calculateCompatibility(ibrahim, ameer);
    console.log('\n=== COMPATIBILITY ANALYSIS ===');
    console.log('Shared Interests:', compatibility.sharedInterests);
    console.log('Shared Interests Count:', compatibility.sharedInterests.length);
    console.log('Compatibility Score:', compatibility.score);
    console.log('Match Reasons:', compatibility.reasons);
    
    // Test if they would be suggested to each other
    console.log('\n=== SUGGESTION TEST ===');
    if (compatibility.score >= 50) {
      console.log('✅ MATCH! These users would be suggested to each other');
    } else {
      console.log('❌ NO MATCH. Score too low for suggestion');
    }
    
    // Check for existing connections
    const { data: connections } = await supabase
      .from('connections')
      .select('*')
      .or(`and(requester_id.eq.${ibrahim.id},receiver_id.eq.${ameer.id}),and(requester_id.eq.${ameer.id},receiver_id.eq.${ibrahim.id})`);
    
    console.log('\n=== CONNECTION STATUS ===');
    if (connections && connections.length > 0) {
      console.log('Existing connection found:', connections[0]);
    } else {
      console.log('No existing connection between users');
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

function calculateCompatibility(user1, user2) {
  const interests1 = user1.interests || [];
  const interests2 = user2.interests || [];
  
  // Find shared interests
  const sharedInterests = interests1.filter(interest => 
    interests2.includes(interest)
  );
  
  // Calculate basic compatibility score
  const maxInterests = Math.max(interests1.length, interests2.length);
  const interestScore = maxInterests > 0 ? (sharedInterests.length / maxInterests) * 100 : 0;
  
  // Academic field match
  const academicMatch = user1.academic_field === user2.academic_field ? 20 : 0;
  
  // Study goals similarity (basic string matching)
  const goalsMatch = user1.study_goals === user2.study_goals ? 15 : 0;
  
  const totalScore = interestScore + academicMatch + goalsMatch;
  
  const reasons = [];
  if (sharedInterests.length > 0) {
    reasons.push(`Shares ${sharedInterests.length} interests: ${sharedInterests.slice(0, 3).join(', ')}`);
  }
  if (academicMatch > 0) {
    reasons.push(`Same academic field: ${user1.academic_field}`);
  }
  if (goalsMatch > 0) {
    reasons.push(`Similar study goals: ${user1.study_goals}`);
  }
  
  return {
    sharedInterests,
    score: Math.round(totalScore * 100) / 100,
    reasons
  };
}

testPeerMatching();