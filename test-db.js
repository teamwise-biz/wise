const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function testInsertAndDebug() {
    const env = fs.readFileSync('c:/wise/wise-web/.env.local', 'utf-8');
    const url = env.split('\n').find(l => l.startsWith('NEXT_PUBLIC_SUPABASE_URL=')).split('=')[1].trim();
    const serviceKey = env.split('\n').find(l => l.startsWith('SUPABASE_SERVICE_ROLE_KEY=')).split('=')[1].trim();
    
    const supabase = createClient(url, serviceKey);
    
    // 1. Get the user ID from the auth table
    const { data: { users }, error: authErr } = await supabase.auth.admin.listUsers();
    if (authErr) { console.error("Auth err:", authErr); return; }
    
    // Assuming the user is teamwise.dev@gmail.com
    const targetUser = users.find(u => u.email === 'teamwise.dev@gmail.com');
    if (!targetUser) { console.log("User not found in auth.users"); return; }
    
    console.log("Found User ID:", targetUser.id);
    
    // 2. Check if this ID exists in the public.profiles table
    const { data: profile, error: profErr } = await supabase.from('profiles').select('*').eq('id', targetUser.id).single();
    
    if (profErr || !profile) {
        console.log("Profile not found! The foreign key constraint in subscriptions is likely blocking the insert.");
        console.log("Attempting to forcefully insert profile...");
        
        const { error: insertProfErr } = await supabase.from('profiles').insert({
            id: targetUser.id,
            email: targetUser.email,
            full_name: 'Team Wise'
        });
        
        if (insertProfErr) {
            console.error("Failed to insert profile:", insertProfErr);
            return;
        }
        console.log("Profile inserted successfully.");
    } else {
        console.log("Profile exists.");
    }
    
    // 3. Now try the subscription upsert
    const { data, error: subErr } = await supabase.from('subscriptions').upsert({
        user_id: targetUser.id,
        status: 'active',
        plan_id: 'pro_monthly',
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString(),
    }).select();
    
    if (subErr) {
        console.error("Subscription upsert failed:", subErr);
    } else {
        console.log("Subscription upsert SUCCESS! Data:", data);
    }
}

testInsertAndDebug();
