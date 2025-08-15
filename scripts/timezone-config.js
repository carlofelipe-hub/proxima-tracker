#!/usr/bin/env node

/**
 * Timezone Configuration Script for Philippine Budget Tracker
 * 
 * This script ensures proper timezone handling for the Philippines (UTC+8)
 * while keeping the database in UTC for consistency and best practices.
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function configureTimezone() {
  console.log('🕐 Configuring timezone settings for Philippine Budget Tracker...\n');

  try {
    // 1. Verify current database timezone
    const currentTz = await prisma.$queryRaw`SELECT current_setting('TIMEZONE') as timezone`;
    console.log(`📍 Current database timezone: ${currentTz[0].timezone}`);

    // 2. Set session timezone to UTC+8 for this connection
    await prisma.$executeRaw`SET TIME ZONE 'Asia/Manila'`;
    console.log('✅ Session timezone set to Asia/Manila (UTC+8)');

    // 3. Verify the change
    const newTz = await prisma.$queryRaw`SELECT current_setting('TIMEZONE') as timezone`;
    console.log(`📍 Session timezone now: ${newTz[0].timezone}`);

    // 4. Test timestamp handling
    const testDate = await prisma.$queryRaw`SELECT NOW() as current_time, NOW() AT TIME ZONE 'UTC' as utc_time`;
    console.log(`\n🧪 Test Results:`);
    console.log(`   Local time (UTC+8): ${testDate[0].current_time}`);
    console.log(`   UTC time: ${testDate[0].utc_time}`);

    // 5. Show sample data with timezone conversion
    const sampleUser = await prisma.user.findFirst({
      select: {
        id: true,
        createdAt: true
      }
    });

    if (sampleUser) {
      // Convert UTC to Philippine time
      const philippineTime = new Date(sampleUser.createdAt).toLocaleString('en-PH', {
        timeZone: 'Asia/Manila',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });

      console.log(`\n📊 Sample Data Conversion:`);
      console.log(`   User created at (UTC): ${sampleUser.createdAt}`);
      console.log(`   User created at (Philippine): ${philippineTime}`);
    }

    console.log('\n✅ Timezone configuration completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('   1. Database will continue storing data in UTC');
    console.log('   2. Application will convert UTC to Philippine time for display');
    console.log('   3. User inputs will be converted from Philippine time to UTC for storage');

  } catch (error) {
    console.error('❌ Error configuring timezone:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Utility functions for timezone conversion
const timezoneUtils = {
  // Convert UTC date to Philippine time
  toPhilippineTime: (utcDate) => {
    return new Date(utcDate).toLocaleString('en-PH', {
      timeZone: 'Asia/Manila',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  },

  // Convert Philippine time to UTC for database storage
  toUTC: (philippineTimeString) => {
    // Assume input is in Philippine timezone
    const date = new Date(philippineTimeString + ' Asia/Manila');
    return date.toISOString();
  },

  // Get current Philippine time
  nowPhilippine: () => {
    return new Date().toLocaleString('en-PH', {
      timeZone: 'Asia/Manila'
    });
  },

  // Format date for Philippine display
  formatPhilippine: (date, options = {}) => {
    const defaultOptions = {
      timeZone: 'Asia/Manila',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    };
    
    return new Date(date).toLocaleString('en-PH', { ...defaultOptions, ...options });
  }
};

// Export utilities for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { configureTimezone, timezoneUtils };
}

// Run if called directly
if (require.main === module) {
  configureTimezone()
    .then(() => {
      console.log('\n🎉 Configuration complete! You can now use the timezone utilities in your application.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Configuration failed:', error);
      process.exit(1);
    });
}