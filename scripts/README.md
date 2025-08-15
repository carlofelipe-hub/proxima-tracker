# Database Timezone Configuration

## Overview

Your Philippine Budget Tracker now uses the **industry standard timezone approach**:

- **Database**: Stores all timestamps in UTC (coordinated universal time)
- **Application**: Converts UTC to Philippine Time (UTC+8) for display
- **User Input**: Converts Philippine Time input to UTC before saving

## Why This Approach?

1. **Consistency**: UTC is a universal reference point
2. **Scalability**: Easy to support multiple timezones later
3. **Best Practice**: Industry standard for web applications
4. **No Data Migration**: Your existing UTC data stays intact

## Setup

1. **Run the configuration script**:
   ```bash
   node scripts/timezone-config.js
   ```

2. **Update your package.json scripts** (optional):
   ```json
   {
     "scripts": {
       "timezone:configure": "node scripts/timezone-config.js"
     }
   }
   ```

## How It Works

### Database Storage (UTC)
```javascript
// All timestamps stored in UTC
const transaction = await prisma.transaction.create({
  data: {
    amount: 1000,
    date: new Date(), // Current UTC time
    // ... other fields
  }
})
```

### Display (Philippine Time)
```javascript
import { formatPhilippineDateTime } from '@/lib/timezone'

// Convert UTC to Philippine time for display
const displayDate = formatPhilippineDateTime(transaction.date)
// Shows: "Dec 15, 2024, 2:30 PM" (Philippine time)
```

### User Input (Philippine Time → UTC)
```javascript
import { fromDateTimeLocalToPhilippineTime } from '@/lib/timezone'

// User enters "2024-12-15T14:30" (Philippine time)
const utcDate = fromDateTimeLocalToPhilippineTime("2024-12-15T14:30")
// Saves as UTC in database
```

## Updated Functions

All timezone functions in `/src/lib/timezone.ts` have been updated to follow this pattern:

- `getNowInPhilippineTime()` - Returns current UTC time for DB storage
- `formatPhilippineDateTime()` - Converts UTC to Philippine time for display
- `fromDateTimeLocalToPhilippineTime()` - Converts Philippine input to UTC
- `getStartOfDayInPhilippineTime()` - Gets Philippine day boundaries in UTC

## Migration Status

✅ **No data migration needed** - Your existing UTC timestamps are correct  
✅ **Database stays in UTC** - Industry best practice  
✅ **Application handles conversion** - Transparent to users  
✅ **All new data will be properly handled** - UTC storage, Philippine display

## Next Steps

1. Test the timezone configuration script
2. Update any frontend components that display dates
3. Ensure all forms properly convert Philippine input to UTC
4. Remove any old timezone conversion code that conflicts with this approach