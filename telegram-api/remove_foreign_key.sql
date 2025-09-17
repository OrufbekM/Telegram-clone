-- Remove foreign key constraint from messages table to prevent constraint violations
-- when private chats are deleted

-- First, find the constraint name
SELECT constraint_name 
FROM information_schema.table_constraints 
WHERE table_name = 'messages' 
AND constraint_type = 'FOREIGN KEY'
AND constraint_name LIKE '%chatid%' OR constraint_name LIKE '%chat_id%';

-- If the constraint exists, drop it
-- Replace 'constraint_name_here' with the actual constraint name from the query above
-- ALTER TABLE messages DROP CONSTRAINT constraint_name_here;

-- Alternative: Make chatId nullable to allow orphaned messages
-- ALTER TABLE messages ALTER COLUMN "chatId" DROP NOT NULL;
