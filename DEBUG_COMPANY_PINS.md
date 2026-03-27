# Debugging Company Pins Not Showing on Mobile

## Step 1: Verify Company Pin Was Saved

Check if the company pin location exists in the database:

```sql
-- Check locations for company pins (time_start_sec = 0, no mention)
SELECT 
  l.id,
  l.name,
  l.location_name,
  l.time_start_sec,
  l.mention,
  l.context,
  l.video_id,
  gl.guide_id,
  gl.display_order
FROM locations l
JOIN guide_locations gl ON l.id = gl.location_id
WHERE gl.guide_id IN (
  '3cd5aef0-06bf-45c7-bac6-a053e60c74a4',
  '7001f0af-1c50-4e45-85c8-e3048a40a7b4'
)
AND l.time_start_sec = 0
AND l.mention IS NULL
AND l.context IS NULL;
```

If this returns no rows, the company pin wasn't saved.

## Step 2: Test the API Response

Test the API endpoint directly:

```bash
# For guide 3cd5aef0-06bf-45c7-bac6-a053e60c74a4
curl "https://your-domain.com/api/guides/3cd5aef0-06bf-45c7-bac6-a053e60c74a4?public=true"

# Or for the other guide
curl "https://your-domain.com/api/guides/7001f0af-1c50-4e45-85c8-e3048a40a7b4?public=true"
```

Look for locations with `"isCompanyPin": true` in the response.

## Step 3: Check the Detection Logic

The API identifies company pins using:
```javascript
isCompanyPin: loc.time_start_sec === 0 && !loc.mention && !loc.context
```

Verify your location records match these criteria:
- `time_start_sec` must be exactly `0` (not `0.0` or `NULL`)
- `mention` must be `NULL` (not empty string `''`)
- `context` must be `NULL` (not empty string `''`)

## Step 4: Common Issues

### Issue 1: Company Pin Not Saved
**Symptom**: No location record exists with `time_start_sec = 0`

**Solution**: 
- Check browser console for errors when saving
- Verify `company_pins` array is included in the save request
- Check server logs for errors during save

### Issue 2: Company Pin Saved But Not Linked
**Symptom**: Location exists but no entry in `guide_locations`

**Solution**:
- The location should be linked via `guide_locations` table
- Check if `setGuideLocations` was called with the company pin location ID

### Issue 3: API Not Returning Company Pin
**Symptom**: Location exists in DB but not in API response

**Solution**:
- Verify `getGuideWithLocations` includes all locations from `guide_locations`
- Check if locations are being filtered out somewhere

### Issue 4: Mobile App Not Displaying
**Symptom**: API returns company pin but mobile doesn't show it

**Solution**:
- Verify mobile app checks for `isCompanyPin` field
- Check if mobile app filters out locations with `timeStartSec === 0`
- Ensure mobile app displays all locations from the API response

## Step 5: Manual Fix (If Needed)

If a company pin exists but isn't showing:

1. **Re-save the guide** with the company pin included
2. **Check the save request** includes `company_pins` array:
   ```json
   {
     "guideData": {
       "name": "Guide Name",
       "location_ids": [...],
       "company_pins": [
         {
           "name": "Company Name",
           "locationName": "Address",
           "coordinates": { "lat": 39.99, "lng": -75.12 },
           "placeId": "..."
         }
       ]
     }
   }
   ```

3. **Verify the response** after save includes the company pin

## Step 6: Check Mobile App Code

Ensure mobile app:
1. Receives all locations from API (doesn't filter)
2. Checks `isCompanyPin` field or uses heuristic
3. Displays company pins in the location list
4. Shows company pins on the map

## Quick Test Query

Run this to see all locations for your guides:

```sql
SELECT 
  l.id,
  l.name,
  l.time_start_sec,
  l.mention,
  l.context,
  l.video_id,
  CASE 
    WHEN l.time_start_sec = 0 AND l.mention IS NULL AND l.context IS NULL 
    THEN 'COMPANY PIN' 
    ELSE 'VIDEO LOCATION' 
  END as location_type,
  gl.guide_id,
  gl.display_order
FROM locations l
JOIN guide_locations gl ON l.id = gl.location_id
WHERE gl.guide_id IN (
  '3cd5aef0-06bf-45c7-bac6-a053e60c74a4',
  '7001f0af-1c50-4e45-85c8-e3048a40a7b4'
)
ORDER BY gl.guide_id, gl.display_order;
```

This will show you which locations are company pins vs video locations.
