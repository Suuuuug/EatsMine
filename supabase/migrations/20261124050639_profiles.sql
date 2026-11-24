CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY,
	"nickname" text NOT NULL,
	"rank" text DEFAULT 'rookie' NOT NULL,
	"avatar_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profiles_rank_check" CHECK ("rank" IN ('rookie', 'local', 'conqueror', 'master'))
);
--> statement-breakpoint
ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;