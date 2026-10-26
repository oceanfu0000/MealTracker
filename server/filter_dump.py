"""Extract the auth + public schemas (DDL and data) from a Supabase pg_dumpall cluster backup.

Usage: python3 filter_dump.py <cluster.backup> <out.sql>

Only the `postgres` database section is read. Every pg_dump object is preceded by a
header comment ("-- Name: x; Type: y; Schema: z; ..."); objects whose schema is auth or
public are kept, plus the CREATE/ACL entries for those two schemas themselves.
Roles, storage, realtime, vault, etc. are left to the fresh self-hosted image.
"""
import re
import sys

KEEP_SCHEMAS = {"auth", "public"}
HEADER = re.compile(r"^-- (?:Data for )?Name: (?P<name>.*?); Type: (?P<type>.*?); Schema: (?P<schema>[^;]*)")


def keep(name: str, type_: str, schema: str) -> bool:
    if schema in KEEP_SCHEMAS:
        return True
    if schema == "-":
        return name in {f"SCHEMA {s}" for s in KEEP_SCHEMAS} or (type_ == "SCHEMA" and name in KEEP_SCHEMAS)
    return False


def main() -> None:
    src, dst = sys.argv[1], sys.argv[2]
    in_db = False
    in_copy = False
    keeping = True  # preamble (SET ...) before the first object header is kept
    kept = skipped = 0

    with open(src, encoding="utf-8") as fin, open(dst, "w", encoding="utf-8") as fout:
        for line in fin:
            if not in_db:
                in_db = line.strip() == "\\connect postgres"
                continue

            if in_copy:
                if keeping:
                    fout.write(line)
                in_copy = line.rstrip("\n") != "\\."
                continue

            if line.startswith("\\connect "):
                break
            if line.startswith(("\\restrict", "\\unrestrict")):
                continue

            m = HEADER.match(line)
            if m:
                keeping = keep(m["name"], m["type"], m["schema"])
                kept += keeping
                skipped += not keeping

            if keeping:
                fout.write(line)
                if line.startswith("COPY ") and line.rstrip().endswith("FROM stdin;"):
                    in_copy = True
            elif line.startswith("COPY ") and line.rstrip().endswith("FROM stdin;"):
                in_copy = True

    print(f"kept {kept} objects, skipped {skipped}")


if __name__ == "__main__":
    main()
