// Quick diagnostic: Check if company pins exist for the guides
// Run this to see what locations are company pins

const guideIds = [
  "3cd5aef0-06bf-45c7-bac6-a053e60c74a4",
  "7001f0af-1c50-4e45-85c8-e3048a40a7b4"
];

const locationIds = [
  "5fcb5654-bc0c-42f3-80ad-9f9bfd8b96bc",
  "4d1854b7-6023-4433-bcda-7b2e3a52009c",
  "dccbd1e6-b32c-4ee8-837d-f2426b183b3f",
  "89ad9d5e-a21a-4ec8-83c7-065a39112eca",
  "449a0260-c666-46f2-a7de-4da621fc207b",
  "148936ba-27c9-453b-8cf0-6f32ac7668a6",
  "aa77900a-289e-4d8c-ad6d-5b7cce1234cb",
  "743bbcf3-ef02-4968-8b79-6fc57bd93bf5"
];

console.log("To check if company pins exist, query the locations table:");
console.log("SELECT id, name, time_start_sec, mention, context, video_id FROM locations WHERE id IN (location_ids)");
console.log("\nCompany pins should have:");
console.log("- time_start_sec = 0");
console.log("- mention IS NULL");
console.log("- context IS NULL");
