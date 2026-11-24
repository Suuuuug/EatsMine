CREATE TABLE "outbound_events" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "outbound_events_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"restaurant_key" text NOT NULL,
	"region_code" varchar(5),
	"placement" text NOT NULL,
	"source_channel" text,
	"session_key" text NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "outbound_events_placement_check" CHECK ("placement" IN ('list', 'map', 'share'))
);
--> statement-breakpoint
ALTER TABLE "outbound_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE INDEX "outbound_events_occurred_at_source_channel_idx" ON "outbound_events" ("occurred_at","source_channel");