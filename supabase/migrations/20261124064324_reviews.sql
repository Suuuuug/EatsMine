CREATE TABLE "restaurants" (
	"id" text PRIMARY KEY,
	"mer_url" text NOT NULL,
	"name" text NOT NULL,
	"address" text NOT NULL,
	"genre" text,
	"region_code" varchar(5),
	"lat" double precision,
	"lng" double precision,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "restaurants" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "reviews_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"user_id" uuid NOT NULL,
	"restaurant_id" text NOT NULL,
	"food_id" integer,
	"rating" smallint NOT NULL,
	"content" text,
	"visited_at" date,
	"visibility" text DEFAULT 'private' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reviews_user_restaurant_unique" UNIQUE("user_id","restaurant_id"),
	CONSTRAINT "reviews_rating_check" CHECK ("rating" BETWEEN 1 AND 5),
	CONSTRAINT "reviews_content_length_check" CHECK ("content" IS NULL OR char_length("content") <= 500),
	CONSTRAINT "reviews_visibility_check" CHECK ("visibility" IN ('private', 'public'))
);
--> statement-breakpoint
ALTER TABLE "reviews" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "user_food_collection" (
	"user_id" uuid,
	"food_id" integer,
	"collected_at" timestamp with time zone DEFAULT now() NOT NULL,
	"source_review_id" bigint,
	CONSTRAINT "user_food_collection_pkey" PRIMARY KEY("user_id","food_id")
);
--> statement-breakpoint
ALTER TABLE "user_food_collection" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "user_region_visits" (
	"user_id" uuid,
	"region_code" varchar(5),
	"first_visited_at" timestamp with time zone DEFAULT now() NOT NULL,
	"source_review_id" bigint,
	CONSTRAINT "user_region_visits_pkey" PRIMARY KEY("user_id","region_code")
);
--> statement-breakpoint
ALTER TABLE "user_region_visits" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE INDEX "reviews_user_id_created_at_idx" ON "reviews" ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "reviews_created_at_idx" ON "reviews" ("created_at");--> statement-breakpoint
ALTER TABLE "restaurants" ADD CONSTRAINT "restaurants_region_code_regions_code_fkey" FOREIGN KEY ("region_code") REFERENCES "regions"("code");--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_user_id_profiles_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_restaurant_id_restaurants_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id");--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_food_id_foods_id_fkey" FOREIGN KEY ("food_id") REFERENCES "foods"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "user_food_collection" ADD CONSTRAINT "user_food_collection_user_id_profiles_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "user_food_collection" ADD CONSTRAINT "user_food_collection_food_id_foods_id_fkey" FOREIGN KEY ("food_id") REFERENCES "foods"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "user_food_collection" ADD CONSTRAINT "user_food_collection_source_review_id_reviews_id_fkey" FOREIGN KEY ("source_review_id") REFERENCES "reviews"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "user_region_visits" ADD CONSTRAINT "user_region_visits_user_id_profiles_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "user_region_visits" ADD CONSTRAINT "user_region_visits_region_code_regions_code_fkey" FOREIGN KEY ("region_code") REFERENCES "regions"("code");--> statement-breakpoint
ALTER TABLE "user_region_visits" ADD CONSTRAINT "user_region_visits_source_review_id_reviews_id_fkey" FOREIGN KEY ("source_review_id") REFERENCES "reviews"("id") ON DELETE SET NULL;