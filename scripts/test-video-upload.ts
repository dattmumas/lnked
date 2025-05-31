#!/usr/bin/env node

/**
 * Test script for video upload functionality
 * Usage: npx tsx scripts/test-video-upload.ts
 */

import { createClient } from '@supabase/supabase-js';

// Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const API_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// Test user credentials (update these)
const TEST_EMAIL = 'test@example.com';
const TEST_PASSWORD = 'testpassword';

async function testVideoUpload() {
  console.log('🎬 Starting video upload test...\n');

  // 1. Create Supabase client
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // 2. Sign in
  console.log('📝 Signing in...');
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  });

  if (authError) {
    console.error('❌ Auth failed:', authError.message);
    console.log('\n💡 Make sure to update TEST_EMAIL and TEST_PASSWORD in this script');
    return;
  }

  console.log('✅ Signed in as:', authData.user.email);

  // 3. Get upload URL
  console.log('\n🔗 Getting upload URL...');
  const uploadResponse = await fetch(`${API_URL}/api/videos/upload-url`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authData.session.access_token}`,
    },
    body: JSON.stringify({
      title: 'Test Video Upload',
      description: 'Testing video upload functionality',
    }),
  });

  if (!uploadResponse.ok) {
    const error = await uploadResponse.text();
    console.error('❌ Failed to get upload URL:', error);
    return;
  }

  const uploadData = await uploadResponse.json();
  console.log('✅ Got upload URL');
  console.log('  Video ID:', uploadData.video?.id);
  console.log('  Upload URL:', uploadData.uploadUrl?.substring(0, 50) + '...');

  // 4. Check video status
  if (uploadData.video?.id) {
    console.log('\n📊 Checking video status...');
    
    // Get video from database
    const { data: video, error: fetchError } = await supabase
      .from('video_assets')
      .select('*')
      .eq('id', uploadData.video.id)
      .single();

    if (fetchError) {
      console.error('❌ Failed to fetch video:', fetchError.message);
      return;
    }

    console.log('✅ Video record created:');
    console.log('  ID:', video.id);
    console.log('  Title:', video.title);
    console.log('  Status:', video.status);
    console.log('  MUX Upload ID:', video.mux_upload_id);
    console.log('  MUX Asset ID:', video.mux_asset_id || '(not yet created)');
    console.log('  Created By:', video.created_by);
    console.log('  MP4 Support:', video.mp4_support);

    // 5. Test refresh endpoint
    console.log('\n🔄 Testing refresh endpoint...');
    const refreshResponse = await fetch(`${API_URL}/api/videos/${video.id}/refresh`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authData.session.access_token}`,
      },
    });

    if (!refreshResponse.ok) {
      const error = await refreshResponse.text();
      console.error('❌ Refresh failed:', error);
    } else {
      const refreshData = await refreshResponse.json();
      console.log('✅ Refresh successful:', refreshData.message);
    }

    // 6. Instructions for completing the test
    console.log('\n📋 Next steps to complete the test:');
    console.log('1. Use the upload URL with the MUX Uploader component to upload a video');
    console.log('2. The webhook should update the video status when processing completes');
    console.log('3. Check the video at: ' + API_URL + '/videos/' + video.id);
  }

  console.log('\n✨ Test complete!');
}

// Run the test
testVideoUpload().catch(console.error); 