const { createClient } = require('@supabase/supabase-js');

// Get Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase configuration');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testCalendarFrontend() {
  try {
    console.log('🧪 Testing Calendar Frontend API call...\n');

    // Simulate the frontend API call to the calendar tasks endpoint
    const startDate = '2025-10-01';
    const endDate = '2025-10-31';
    const includeCompleted = 'true';

    const params = new URLSearchParams({
      start_date: startDate,
      end_date: endDate,
      include_completed: includeCompleted
    });

    console.log(`📅 Testing with date range: ${startDate} to ${endDate}`);
    console.log(`🔗 API URL: /api/schedule/calendar/tasks?${params.toString()}\n`);

    // Make the API call (this would normally be done by the frontend)
    const response = await fetch(`http://localhost:3001/api/schedule/calendar/tasks?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Note: In a real frontend, authentication would be handled by the browser/cookies
      }
    });

    console.log(`📊 Response status: ${response.status}`);
    console.log(`📊 Response headers:`, Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ API call failed: ${response.status} ${response.statusText}`);
      console.error(`❌ Error response:`, errorText);
      return;
    }

    const data = await response.json();
    console.log(`\n✅ API call successful!`);
    console.log(`📊 Response data structure:`, {
      hasEvents: !!data.events,
      eventsCount: data.events?.length || 0,
      dataKeys: Object.keys(data)
    });

    if (data.events && data.events.length > 0) {
      console.log(`\n📅 Calendar Events (${data.events.length}):`);
      data.events.forEach((event, index) => {
        console.log(`${index + 1}. ${event.title}`);
        console.log(`   Start: ${event.start}`);
        console.log(`   End: ${event.end}`);
        console.log(`   Status: ${event.resource?.status}`);
        console.log(`   Priority: ${event.resource?.priority}`);
        console.log(`   Goal: ${event.resource?.goal?.title || 'None'}`);
        console.log('');
      });
    } else {
      console.log('\n⚠️  No events returned from API');
    }

    console.log('\n✅ Frontend API test completed!');

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('❌ Cannot connect to server. Make sure the dev server is running on port 3001');
    }
  }
}

testCalendarFrontend();