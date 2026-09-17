"""Validation harness for the Builders Night snippets.

Runs talk/snippets/01..06 in-process against the live Interactions API and
logs every Interactions request/response to talk/logs/trace.jsonl.

Security: GEMINI_API_KEY is read from the environment only. The key value is
redacted from every log line before it is written. Never print it.

Usage:
    python3 talk/run_snippets.py            # run all snippets
    python3 talk/run_snippets.py 01 03      # run selected snippets
"""

from __future__ import annotations

import json
import os
import runpy
import signal
import sys
import time
import traceback
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
SNIPPETS_DIR = REPO_ROOT / "talk" / "snippets"
LOGS_DIR = REPO_ROOT / "talk" / "logs"
TRACE_PATH = LOGS_DIR / "trace.jsonl"
SUMMARY_PATH = LOGS_DIR / "summary.json"

API_KEY = os.environ.get("GEMINI_API_KEY", "")
OUTPUT_TEXT_CAP = 2000

# Per-snippet wall-clock budget (seconds). Managed-agent runs are slow.
TIMEOUTS = {
    "01": 180,
    "02": 240,
    "03": 420,
    "04": 600,
    "05": 900,
    "06": 1200,
}

_current_snippet = {"name": None, "attempt": 1}
_call_counter = {"n": 0}


def redact(value):
    """Recursively redact the API key from any string in the structure."""
    if isinstance(value, str):
        if API_KEY and API_KEY in value:
            return value.replace(API_KEY, "[REDACTED]")
        return value
    if isinstance(value, dict):
        out = {}
        for k, v in value.items():
            if str(k).lower() in ("authorization", "x-goog-api-key", "api_key", "apikey"):
                out[k] = "[REDACTED]"
            else:
                out[k] = redact(v)
        return out
    if isinstance(value, (list, tuple)):
        return [redact(v) for v in value]
    return value


def to_jsonable(value, depth=0):
    """Best-effort conversion of SDK objects to JSON-safe structures."""
    if depth > 8:
        return str(value)
    if value is None or isinstance(value, (str, int, float, bool)):
        return value
    if isinstance(value, dict):
        return {str(k): to_jsonable(v, depth + 1) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [to_jsonable(v, depth + 1) for v in value]
    if hasattr(value, "model_dump"):
        try:
            import warnings
            with warnings.catch_warnings():
                warnings.simplefilter("ignore")
                return to_jsonable(value.model_dump(mode="json"), depth + 1)
        except Exception:
            return str(value)
    if hasattr(value, "__dict__") and not isinstance(value, type):
        try:
            return {k: to_jsonable(v, depth + 1) for k, v in vars(value).items()
                    if not k.startswith("_")}
        except Exception:
            return str(value)
    return str(value)


def summarize_steps(steps):
    """Structured dump of interaction steps: type/name/id/arguments summary."""
    if not steps:
        return []
    out = []
    for step in steps:
        s = to_jsonable(step)
        if not isinstance(s, dict):
            out.append({"raw": str(s)[:500]})
            continue
        entry = {}
        for key in ("type", "name", "id", "call_id"):
            if key in s and s[key] is not None:
                entry[key] = s[key]
        if "arguments" in s and s["arguments"] is not None:
            args = s["arguments"]
            entry["arguments"] = args if isinstance(args, (dict, list)) else str(args)[:500]
        # keep any small extra fields, cap big ones
        for key, val in s.items():
            if key in entry or key in ("arguments",):
                continue
            text = json.dumps(to_jsonable(val), default=str)
            if len(text) <= 600:
                entry[key] = val
            else:
                entry[key] = text[:600] + "...[truncated]"
        out.append(entry)
    return out


def log_call(call_name, request_payload, response_obj=None, error=None, http_status=None):
    _call_counter["n"] += 1
    entry = {
        "ts": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "snippet": _current_snippet["name"],
        "attempt": _current_snippet["attempt"],
        "call_index": _call_counter["n"],
        "call": call_name,
        "request": redact(to_jsonable(request_payload)),
    }
    if error is not None:
        entry["response"] = redact({
            "error": {
                "type": type(error).__name__,
                "status_code": http_status,
                "message": str(error)[:1500],
            }
        })
    else:
        resp = to_jsonable(response_obj)
        body = resp if isinstance(resp, dict) else {"raw": str(resp)[:2000]}
        output_text = body.get("output_text")
        if isinstance(output_text, str) and len(output_text) > OUTPUT_TEXT_CAP:
            body["output_text"] = output_text[:OUTPUT_TEXT_CAP] + "...[truncated]"
        entry["response"] = redact({
            "http_status": http_status,
            "id": body.get("id"),
            "status": body.get("status"),
            "top_level_keys": sorted(body.keys()),
            "steps": summarize_steps(getattr(response_obj, "steps", None)),
            "output_text": body.get("output_text"),
            "errors": body.get("errors"),
            "usage": body.get("usage"),
            "model": body.get("model"),
            "agent": body.get("agent"),
            "environment": body.get("environment"),
            "environment_id": body.get("environment_id"),
        })
    with open(TRACE_PATH, "a") as f:
        f.write(json.dumps(entry, default=str) + "\n")


def instrument():
    """Wrap Interactions create/get/cancel with logging."""
    from google.genai._gaos.google_genai import GeminiNextGenInteractions

    orig_create = GeminiNextGenInteractions.create
    orig_get = GeminiNextGenInteractions.get
    orig_cancel = GeminiNextGenInteractions.cancel

    def logged_create(self, *args, **kwargs):
        req = {"method": "POST", "path": "/interactions", "kwargs": dict(kwargs)}
        if args:
            req["args"] = [str(a)[:200] for a in args]
        try:
            resp = orig_create(self, *args, **kwargs)
        except Exception as e:
            log_call("interactions.create", req, error=e,
                     http_status=getattr(e, "status_code", None) or getattr(e, "code", None))
            raise
        log_call("interactions.create", req, response_obj=resp)
        return resp

    def logged_get(self, *args, **kwargs):
        req = {"method": "GET", "path": "/interactions/{id}",
               "id": kwargs.get("id") or (args[0] if args else None)}
        try:
            resp = orig_get(self, *args, **kwargs)
        except Exception as e:
            log_call("interactions.get", req, error=e,
                     http_status=getattr(e, "status_code", None) or getattr(e, "code", None))
            raise
        log_call("interactions.get", req, response_obj=resp)
        return resp

    def logged_cancel(self, *args, **kwargs):
        req = {"method": "POST", "path": "/interactions/{id}/cancel",
               "id": kwargs.get("id") or (args[0] if args else None)}
        try:
            resp = orig_cancel(self, *args, **kwargs)
        except Exception as e:
            log_call("interactions.cancel", req, error=e,
                     http_status=getattr(e, "status_code", None) or getattr(e, "code", None))
            raise
        log_call("interactions.cancel", req, response_obj=resp)
        return resp

    GeminiNextGenInteractions.create = logged_create
    GeminiNextGenInteractions.get = logged_get
    GeminiNextGenInteractions.cancel = logged_cancel


class SnippetTimeout(Exception):
    pass


def _alarm_handler(signum, frame):
    raise SnippetTimeout()


def next_attempt(snippet_name: str) -> int:
    """Attempt numbers persist across harness invocations via the trace file."""
    if not TRACE_PATH.exists():
        return 1
    highest = 0
    with open(TRACE_PATH) as f:
        for line in f:
            try:
                entry = json.loads(line)
            except json.JSONDecodeError:
                continue
            if entry.get("snippet") == snippet_name:
                highest = max(highest, entry.get("attempt", 0))
    return highest + 1


def run_one(snippet_path: Path):
    name = snippet_path.name
    prefix = name[:2]
    _current_snippet["name"] = name
    _current_snippet["attempt"] = next_attempt(name)
    attempt = _current_snippet["attempt"]
    timeout = TIMEOUTS.get(prefix, 300)

    import io
    from contextlib import redirect_stdout, redirect_stderr
    buf = io.StringIO()
    start = time.time()
    result = {"snippet": name, "attempt": attempt, "pass": False,
              "error": None, "duration_s": None}
    signal.signal(signal.SIGALRM, _alarm_handler)
    signal.alarm(timeout)
    try:
        with redirect_stdout(buf), redirect_stderr(buf):
            runpy.run_path(str(snippet_path), run_name="__main__")
        result["pass"] = True
    except SnippetTimeout:
        result["error"] = f"timeout after {timeout}s"
    except Exception as e:  # noqa: BLE001 - record whatever the snippet hit
        result["error"] = f"{type(e).__name__}: {str(e)[:400]}"
        buf.write("\n" + traceback.format_exc())
    finally:
        signal.alarm(0)
    result["duration_s"] = round(time.time() - start, 1)
    result["stdout_tail"] = buf.getvalue()[-3000:]
    return result


def main():
    if not API_KEY:
        print("GEMINI_API_KEY is not set; aborting.", file=sys.stderr)
        sys.exit(2)
    LOGS_DIR.mkdir(parents=True, exist_ok=True)

    selected = sys.argv[1:]
    snippets = sorted(SNIPPETS_DIR.glob("*.py"))
    if selected:
        snippets = [s for s in snippets if s.name[:2] in selected]
    if not snippets:
        print("no snippets matched", file=sys.stderr)
        sys.exit(2)

    instrument()

    # Merge into any existing summary so the file covers all snippets across
    # separate invocations. Full history lives in trace.jsonl.
    merged = {}
    if SUMMARY_PATH.exists():
        try:
            for old in json.load(open(SUMMARY_PATH)):
                merged[old["snippet"]] = old
        except Exception:
            pass

    summaries = []
    for path in snippets:
        print(f"=== running {path.name} ===", flush=True)
        summary = run_one(path)
        summaries.append(summary)
        merged[path.name] = summary
        status = "PASS" if summary["pass"] else "FAIL"
        print(f"--- {status} {path.name} attempt {summary['attempt']} ({summary['duration_s']}s)")
        if summary["error"]:
            print(f"    error: {summary['error']}")
        tail = (summary["stdout_tail"] or "").strip().replace("\n", " | ")
        print(f"    stdout: {tail[:300]}")
        with open(SUMMARY_PATH, "w") as f:
            json.dump([merged[k] for k in sorted(merged)], f, indent=2)

    failed = [s for s in summaries if not s["pass"]]
    print(f"\n{len(summaries) - len(failed)}/{len(summaries)} passed. "
          f"Trace: {TRACE_PATH}")
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
