const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://cgryfltmvaplsrawoktj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNncnlmbHRtdmFwbHNyYXdva3RqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzM0NTg0NywiZXhwIjoyMDcyOTIxODQ3fQ.HM-uJp33p6wYcGh-2PqjuvJXTnrvfN3EwBR1V9hVm5I';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testCompatibilityLogic() {
  try {
    console.log('=== Testing Compatibility Logic ===');
    
    const { data: ibrahim } = await supabase
      .from('profiles')
      .select('*')
      .eq('full_name', 'Ibrahim Murtraza')
      .single();
    
    const { data: ameer } = await supabase
      .from('profiles')
      .select('*')
      .eq('full_name', 'Ameer Hamza')
      .single();
    
    console.log('Ibrahim interests:', ibrahim.interests);
    console.log('Ameer interests:', ameer.interests);
    
    // Check for common interests
    const ibrahimInterests = ibrahim.interests || [];
    const ameerInterests = ameer.interests || [];
    
    const commonInterests = ibrahimInterests.filter(interest => 
      ameerInterests.some(i2 => i2.toLowerCase() === interest.toLowerCase())
    );
    
    console.log('Common interests:', commonInterests);
    console.log('Should have compatibility score > 0');
    
    // Test compatibility calculation
    const WEIGHTS = { INTERESTS: 0.4, ACADEMIC_FIELD: 0.3, STUDY_GOALS: 0.2 };
    
    let totalScore = 0;
    let totalWeight = 0;
    
    // Interest score
    const interestScore = ibrahimInterests.length > 0 ? 
      commonInterests.length / Math.max(ibrahimInterests.length, ameerInterests.length) : 0;
    totalScore += interestScore * WEIGHTS.INTERESTS;
    totalWeight += WEIGHTS.INTERESTS;
    
    console.log('Interest score:', interestScore);
    console.log('Weighted interest score:', interestScore * WEIGHTS.INTERESTS);
    
    // Academic field score
    const fieldScore = ibrahim.academic_field && ameer.academic_field && 
      ibrahim.academic_field.toLowerCase() === ameer.academic_field.toLowerCase() ? 1 : 0;
    totalScore += fieldScore * WEIGHTS.ACADEMIC_FIELD;
    totalWeight += WEIGHTS.ACADEMIC_FIELD;
    
    console.log('Academic field score:', fieldScore);
    console.log('Ibrahim field:', ibrahim.academic_field);
    console.log('Ameer field:', ameer.academic_field);
    
    const finalScore = totalWeight > 0 ? totalScore / totalWeight : 0;
    console.log('Final compatibility score:', finalScore);
    console.log('Meets 0.3 threshold:', finalScore >= 0.3);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testCompatibilityLogic();