CREATE TABLE "share_links" (
	"id" varchar(10) PRIMARY KEY,
	"user_id" uuid NOT NULL,
	"share_type" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "share_links_user_type_unique" UNIQUE("user_id","share_type"),
	CONSTRAINT "share_links_type_check" CHECK ("share_type" IN ('territory', 'collection'))
);
--> statement-breakpoint
ALTER TABLE "share_links" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "share_links" ADD CONSTRAINT "share_links_user_id_profiles_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE;