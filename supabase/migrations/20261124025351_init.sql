CREATE TABLE "rate_limit_hits" (
	"key" text PRIMARY KEY,
	"hits" integer NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"blocked_until" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "rate_limit_hits" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "regions" (
	"code" varchar(5) PRIMARY KEY,
	"parent_code" varchar(5),
	"level" text NOT NULL,
	"name" text NOT NULL,
	"full_name" text NOT NULL,
	"eatpl_query" text,
	"address_aliases" text[],
	"center_lat" double precision,
	"center_lng" double precision,
	CONSTRAINT "regions_level_check" CHECK ("level" IN ('sido', 'sigungu'))
);
--> statement-breakpoint
ALTER TABLE "regions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "regions" ADD CONSTRAINT "regions_parent_code_regions_code_fkey" FOREIGN KEY ("parent_code") REFERENCES "regions"("code");