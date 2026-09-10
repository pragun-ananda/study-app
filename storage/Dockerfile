FROM postgres:16-alpine
COPY schema.sql /docker-entrypoint-initdb.d/01-schema.sql
COPY seeds/seed_test_db.sql /docker-entrypoint-initdb.d/02-seed.sql
