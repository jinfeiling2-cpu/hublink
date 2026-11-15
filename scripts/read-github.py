"""Read version-pinned GitHub sources through the existing gh login; never write remotely."""
import argparse
import base64
import hashlib
import json
from pathlib import Path
import re
import subprocess
from datetime import datetime, timezone


def gh_json(*args):
    result = subprocess.run(["gh", *args], capture_output=True, text=True, check=False)
    if result.returncode:
        raise RuntimeError("GitHub read failed; check gh auth status and repository access.")
    return json.loads(result.stdout)


def safe_document(file_path):
    return (file_path.lower().endswith((".md", ".rst", ".txt"))
            and not re.search(r"(^|/)(node_modules|vendor|\.git|\.env|secrets?|credentials?)(/|\.|$)", file_path, re.I))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--owner", required=True, help="GitHub account or organization to read")
    parser.add_argument("--repo", action="append", help="Read only these repository names")
    args = parser.parse_args()
    if not re.fullmatch(r"[a-zA-Z0-9-]+", args.owner):
        parser.error("Invalid GitHub owner")
    output = Path("data/github-sources")
    output.mkdir(parents=True, exist_ok=True)
    repos = gh_json("repo", "list", args.owner, "--limit", "200", "--json", "name,owner,isPrivate,description,url")
    index = []
    for repo in repos:
        if args.repo and repo["name"] not in args.repo:
            continue
        full_name = f"{repo['owner']['login']}/{repo['name']}"
        metadata = gh_json("api", f"repos/{full_name}")
        branch = metadata["default_branch"]
        commit = gh_json("api", f"repos/{full_name}/commits/{branch}")
        sha = commit["sha"]
        tree = gh_json("api", f"repos/{full_name}/git/trees/{sha}?recursive=1")
        blobs = [item for item in tree.get("tree", []) if item["type"] == "blob"]
        documents = [item for item in blobs if safe_document(item["path"]) and item.get("size", 0) <= 160000]
        documents.sort(key=lambda item: (0 if re.search(r"(^|/)readme\.", item["path"], re.I) else 1, item["path"]))
        selected = documents[:24]
        if not repo["isPrivate"]:
            code = [item for item in blobs if item["path"].endswith((".ts", ".tsx", ".py", ".gd", ".json"))
                    and not re.search(r"(^|/)(node_modules|vendor|dist|build|\.git)/|lock|secret|credential|tsconfig", item["path"], re.I)
                    and item.get("size", 0) <= 60000]
            code.sort(key=lambda item: (0 if item["path"] == "package.json" else 1 if item["path"].startswith(("lib/", "src/domain/", "src/db/", "src/lib/")) else 2, item["path"]))
            selected += code[:32]
        files = []
        for item in selected:
            blob = gh_json("api", f"repos/{full_name}/git/blobs/{item['sha']}")
            raw = base64.b64decode(blob["content"])
            try:
                text = raw.decode("utf-8")
            except UnicodeDecodeError:
                continue
            files.append({"path": item["path"], "blobSha": item["sha"], "contentHash": hashlib.sha256(raw).hexdigest(), "text": text})
        artifact = {
            "repository": full_name, "private": repo["isPrivate"], "description": repo["description"],
            "url": repo["url"], "commit": sha, "branch": branch,
            "fetchedAt": datetime.now(timezone.utc).isoformat(),
            "readingMode": "documents_only" if repo["isPrivate"] else "architecture",
            "treeTruncated": bool(tree.get("truncated")),
            "omittedDocuments": max(0, len(documents) - 24),
            "files": files,
        }
        # Private directory trees are used only to discover prose, never saved or graphed.
        if not repo["isPrivate"]:
            artifact["tree"] = [{"path": item["path"], "type": item["type"]} for item in tree.get("tree", [])]
        destination = output / f"{repo['name']}.json"
        temporary = destination.with_suffix(".tmp")
        temporary.write_text(json.dumps(artifact, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        temporary.replace(destination)
        index.append({"repository": full_name, "private": repo["isPrivate"], "commit": sha, "filesRead": len(files)})
        print(json.dumps(index[-1], ensure_ascii=False), flush=True)
    previous_index = output / "index.json"
    if args.repo and previous_index.exists():
        names = {item["repository"] for item in index}
        index += [item for item in json.loads(previous_index.read_text(encoding="utf-8")) if item["repository"] not in names]
    previous_index.write_text(json.dumps(index, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
