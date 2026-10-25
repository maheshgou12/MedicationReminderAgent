"""Non-destructive migrations.

`Base.metadata.create_all()` creates missing *tables* but never adds
columns to existing tables. This helper adds any missing columns so
deployments with live data keep working after upgrades.
"""

from sqlalchemy import inspect, text

from database import engine, Base


# table -> {column: ddl fragment}
MISSING_COLUMNS = {
    "users": {
        "timezone": "VARCHAR(64) DEFAULT 'UTC'",
        "telegram_chat_id": "VARCHAR(64)",
    },
    "medications": {
        "dose_times": "TEXT",
        "weekdays": "VARCHAR(20)",
        "stock_remaining": "INTEGER",
        "stock_threshold": "INTEGER",
        "doses_per_intake": "INTEGER DEFAULT 1",
    },
}


def run_migrations():
    print("Creating tables...")
    Base.metadata.create_all(bind=engine)
    print("Done")

    inspector = inspect(engine)

    for table, columns in MISSING_COLUMNS.items():
        if table not in inspector.get_table_names():
            continue

        existing = {col["name"] for col in inspector.get_columns(table)}

        for name, ddl in columns.items():
            if name in existing:
                continue

            print(f"Migrating: ALTER TABLE {table} ADD COLUMN {name} {ddl}")

            with engine.begin() as conn:
                conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {name} {ddl}"))

    print("Migrations complete")
