import { useRef, useState } from "react";

/**
 * Wraps the browser's SpeechRecognition API for a single text field.
 * @param {(finalText: string) => void} onResult - called with the full
 *   transcript (final + interim) every time recognition reports new text.
 * @param {string} joiner - character appended after each final segment
 *   (" " for prose notes, "\n" for a medication list).
 */
export function useDictation(onResult, joiner = " ") {
  const [isDictating, setIsDictating] = useState(false);
  const recognitionRef = useRef(null);
  const finalTranscriptRef = useRef("");

  function start(currentText) {
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      return { error: "Speech recognition not supported in this browser." };
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    finalTranscriptRef.current = currentText || "";

    recognition.onstart = () => setIsDictating(true);
    recognition.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscriptRef.current += event.results[i][0].transcript + joiner;
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      onResult(finalTranscriptRef.current + interim);
    };
    recognition.onerror = () => setIsDictating(false);
    recognition.onend = () => setIsDictating(false);

    recognitionRef.current = recognition;
    recognition.start();
    return { error: null };
  }

  function stop() {
    recognitionRef.current?.stop();
  }

  function toggle(currentText) {
    if (isDictating) {
      stop();
      return { error: null };
    }
    return start(currentText);
  }

  return { isDictating, toggle };
}
