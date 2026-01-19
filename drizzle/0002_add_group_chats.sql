-- Add group chats functionality
CREATE TABLE IF NOT EXISTS "group_chats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"image_url" text,
	"created_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "group_chat_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_chat_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "group_chat_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content" text NOT NULL,
	"group_chat_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted" boolean DEFAULT false NOT NULL
);

-- Add foreign key constraints
DO $$ BEGIN
 ALTER TABLE "group_chats" ADD CONSTRAINT "group_chats_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "group_chat_members" ADD CONSTRAINT "group_chat_members_group_chat_id_group_chats_id_fk" FOREIGN KEY ("group_chat_id") REFERENCES "group_chats"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "group_chat_members" ADD CONSTRAINT "group_chat_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "group_chat_messages" ADD CONSTRAINT "group_chat_messages_group_chat_id_group_chats_id_fk" FOREIGN KEY ("group_chat_id") REFERENCES "group_chats"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "group_chat_messages" ADD CONSTRAINT "group_chat_messages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS "group_chat_members_group_chat_id_idx" ON "group_chat_members" ("group_chat_id");
CREATE INDEX IF NOT EXISTS "group_chat_members_user_id_idx" ON "group_chat_members" ("user_id");
CREATE INDEX IF NOT EXISTS "group_chat_messages_group_chat_id_idx" ON "group_chat_messages" ("group_chat_id");
CREATE INDEX IF NOT EXISTS "group_chat_messages_created_at_idx" ON "group_chat_messages" ("created_at");
