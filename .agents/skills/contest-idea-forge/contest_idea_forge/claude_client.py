"""Thin wrapper around the headless Claude Code CLI (`claude -p`).

This is the *only* place the pipeline talks to a model. Everything else is
deterministic Python. The wrapper:
  - feeds the prompt over stdin (avoids OS argv length limits on long prompts),
  - requests `--output-format json` and unwraps the result envelope,
  - strips ```json code fences and parses structured replies,
  - retries once on transient failure or unparseable JSON.

Requires the Claude Code CLI on PATH and an authenticated session
(`claude` / `claude login`). See README for the optional Anthropic-API fallback.
"""
from __future__ import annotations

import json
import shutil
import subprocess
from dataclasses import dataclass


class ClaudeError(RuntimeError):
    """Raised when the Claude CLI is missing, errors out, or returns junk."""


def cli_available() -> bool:
    return shutil.which("claude") is not None


def _strip_code_fence(text: str) -> str:
    """Remove a leading ```json / ``` fence and trailing ``` if present."""
    t = text.strip()
    if t.startswith("```"):
        nl = t.find("\n")
        if nl != -1:
            t = t[nl + 1:]
        if t.rstrip().endswith("```"):
            t = t.rstrip()[: -3]
    return t.strip()


@dataclass
class ClaudeRunner:
    """Invokes `claude -p`. Construct once, reuse across analysis steps."""

    model: str | None = None          # e.g. "sonnet" / "opus" / full id; None = CLI default
    allow_web: bool = False           # enable WebSearch/WebFetch for this call
    timeout: int = 900
    extra_args: tuple[str, ...] = ()

    def _build_cmd(self, model: str | None, allow_web: bool) -> list[str]:
        cmd = ["claude", "-p", "--output-format", "json"]
        m = model if model is not None else self.model
        if m:
            cmd += ["--model", m]
        if allow_web or self.allow_web:
            # Restrict the headless session to read-only web tools.
            cmd += ["--allowedTools", "WebSearch,WebFetch"]
        cmd += list(self.extra_args)
        return cmd

    def run(self, prompt: str, *, model: str | None = None,
            allow_web: bool = False) -> str:
        """Return Claude's reply text for a free-form prompt."""
        if not cli_available():
            raise ClaudeError(
                "`claude` CLI not found on PATH. Install Claude Code and run "
                "`claude login`, or switch to the Anthropic-API backend."
            )
        cmd = self._build_cmd(model, allow_web)
        try:
            proc = subprocess.run(
                cmd, input=prompt, capture_output=True, text=True,
                encoding="utf-8", timeout=self.timeout,
            )
        except subprocess.TimeoutExpired as e:  # pragma: no cover
            raise ClaudeError(f"claude -p timed out after {self.timeout}s") from e
        out = proc.stdout.strip()
        if proc.returncode != 0:
            detail = proc.stderr.strip()
            try:  # the CLI writes its error envelope to stdout, not stderr
                env = json.loads(out)
                if isinstance(env, dict) and env.get("result"):
                    api = env.get("api_error_status")
                    detail = str(env["result"]) + (f" (api {api})" if api else "")
            except json.JSONDecodeError:
                pass
            raise ClaudeError(
                f"claude -p exited {proc.returncode}: {detail[:500] or '(no output)'}. "
                "If this is a 401/auth error, run `claude login` in a terminal first."
            )
        # `--output-format json` wraps the reply: {"type":"result","result":"..."}
        try:
            env = json.loads(out)
            if isinstance(env, dict) and "result" in env:
                if env.get("is_error"):
                    raise ClaudeError(f"claude reported error: {env.get('result')}")
                return str(env["result"])
        except json.JSONDecodeError:
            pass  # some CLI versions emit the raw reply
        return out

    def run_json(self, prompt: str, *, model: str | None = None,
                 allow_web: bool = False, retries: int = 1) -> object:
        """Run a prompt that must reply with a single JSON value; parse it.

        Prompts should end with an explicit "reply with JSON only" instruction.
        On a parse failure we re-ask once with a terse repair nudge.
        """
        last_err: Exception | None = None
        attempt_prompt = prompt
        for _ in range(retries + 1):
            reply = self.run(attempt_prompt, model=model, allow_web=allow_web)
            try:
                return json.loads(_strip_code_fence(reply))
            except json.JSONDecodeError as e:
                last_err = e
                attempt_prompt = (
                    prompt
                    + "\n\n[SYSTEM] Your previous reply was not valid JSON. "
                    "Reply again with a SINGLE valid JSON value and nothing else "
                    "— no prose, no code fences."
                )
        raise ClaudeError(f"Could not parse JSON from Claude after retries: {last_err}")
