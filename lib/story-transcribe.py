"""Transcribe one audio file with faster-whisper (local, no key, no cloud).

Usage: python lib/story-transcribe.py <audio_path> [model_name]
Prints a single JSON line: { text, words: [{text,start,end}], , duration, language }
"""
import json
import sys

def main() -> None:
    if len(sys.argv) < 2:
        print(json.dumps({"error": "audio path required"}))
        sys.exit(2)
    audio_path = sys.argv[1]
    model_name = sys.argv[2] if len(sys.argv) > 2 else "base"

    # Compatibility shim: PyAV >= 14 removed the `metadata_errors` kwarg that
    # faster-whisper still passes to av.open(). Drop it at the module level so
    # no site-packages patching is needed.
    import av as _av

    _orig_av_open = _av.open

    def _open_compat(file, mode="r", *args, **kwargs):
        kwargs.pop("metadata_errors", None)
        return _orig_av_open(file, mode=mode, *args, **kwargs)

    _av.open = _open_compat

    from faster_whisper import WhisperModel

    model = WhisperModel(model_name, device="cpu", compute_type="int8")
    segments, info = model.transcribe(audio_path, word_timestamps=True)

    words = []
    texts = []
    for seg in segments:
        if seg.text:
            texts.append(seg.text.strip())
        for w in (seg.words or []):
            token = (w.word or "").strip()
            if token:
                words.append({
                    "text": token,
                    "start": round(float(w.start), 2),
                    "end": round(float(w.end), 2),
                })

    print(json.dumps({
        "text": " ".join(texts).strip(),
        "words": words,
        "duration": round(float(info.duration or 0), 2),
        "language": getattr(info, "language", "") or "",
    }))

if __name__ == "__main__":
    main()
