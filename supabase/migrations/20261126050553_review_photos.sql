CREATE TABLE "review_photos" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "review_photos_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"review_id" bigint NOT NULL,
	"user_id" uuid NOT NULL,
	"storage_path" text NOT NULL CONSTRAINT "review_photos_storage_path_unique" UNIQUE,
	"position" smallint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "review_photos_review_position_unique" UNIQUE("review_id","position"),
	CONSTRAINT "review_photos_position_check" CHECK ("position" BETWEEN 0 AND 3)
);
--> statement-breakpoint
ALTER TABLE "review_photos" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "review_photos" ADD CONSTRAINT "review_photos_review_id_reviews_id_fkey" FOREIGN KEY ("review_id") REFERENCES "reviews"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "review_photos" ADD CONSTRAINT "review_photos_user_id_profiles_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE;