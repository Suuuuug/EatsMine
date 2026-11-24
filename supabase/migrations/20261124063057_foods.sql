CREATE TABLE "food_genres" (
	"food_id" integer,
	"genre" text,
	CONSTRAINT "food_genres_pkey" PRIMARY KEY("food_id","genre")
);
--> statement-breakpoint
ALTER TABLE "food_genres" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "food_regions" (
	"food_id" integer,
	"region_code" varchar(5),
	"position" smallint DEFAULT 0 NOT NULL,
	"reason" text NOT NULL,
	CONSTRAINT "food_regions_pkey" PRIMARY KEY("food_id","region_code")
);
--> statement-breakpoint
ALTER TABLE "food_regions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "food_seasons" (
	"food_id" integer,
	"month" smallint,
	CONSTRAINT "food_seasons_pkey" PRIMARY KEY("food_id","month"),
	CONSTRAINT "food_seasons_month_check" CHECK ("month" BETWEEN 1 AND 12)
);
--> statement-breakpoint
ALTER TABLE "food_seasons" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "foods" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "foods_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL UNIQUE,
	"description" text NOT NULL,
	"image_url" text,
	"source_url" text,
	"search_keyword" text
);
--> statement-breakpoint
ALTER TABLE "foods" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "food_genres" ADD CONSTRAINT "food_genres_food_id_foods_id_fkey" FOREIGN KEY ("food_id") REFERENCES "foods"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "food_regions" ADD CONSTRAINT "food_regions_food_id_foods_id_fkey" FOREIGN KEY ("food_id") REFERENCES "foods"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "food_regions" ADD CONSTRAINT "food_regions_region_code_regions_code_fkey" FOREIGN KEY ("region_code") REFERENCES "regions"("code");--> statement-breakpoint
ALTER TABLE "food_seasons" ADD CONSTRAINT "food_seasons_food_id_foods_id_fkey" FOREIGN KEY ("food_id") REFERENCES "foods"("id") ON DELETE CASCADE;