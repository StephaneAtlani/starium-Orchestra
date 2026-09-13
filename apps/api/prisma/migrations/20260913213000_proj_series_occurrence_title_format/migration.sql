-- Format de nommage des séances générées depuis une série (semaine / date / custom).

CREATE TYPE "ProjectReviewSeriesOccurrenceTitleFormat" AS ENUM (
  'WEEK',
  'SHORT_DATE',
  'LONG_DATE',
  'CUSTOM'
);

ALTER TABLE "ProjectReviewSeries"
  ADD COLUMN "occurrenceTitleFormat" "ProjectReviewSeriesOccurrenceTitleFormat" NOT NULL DEFAULT 'SHORT_DATE',
  ADD COLUMN "occurrenceTitleCustom" TEXT;
