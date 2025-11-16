import { useEffect, useRef } from "preact/hooks";
import { Header } from "./components/Header";
import { Instructions } from "./components/Instructions";
import { PlayArea } from "./components/PlayArea";
import { SettingsModal } from "./components/SettingsModal";
import { HandPointer } from "./components/HandPointer";
import {
  ThereminEngine,
  DEFAULT_STATUS_MESSAGE,
} from "./lib/theremin-engine";
import "./style.css";
import {
  isRunning,
  isStarting,
  statusMessage,
  currentNote,
  currentFrequency,
  settingsOpen,
  pointerState,
  pointerState2,
} from "./state/appState";

export function App() {
  const videoRef = useRef(null);
  const engineRef = useRef(null);
  const wakeLockRef = useRef(null);

  useEffect(() => {
    // Initialize theremin engine
    engineRef.current = new ThereminEngine(videoRef.current, {
      onNoteChange: (note, frequency) => {
        currentNote.value = note;
        currentFrequency.value = frequency;
      },
      onPointerUpdate: (state, state2) => {
        pointerState.value = state;
        if (state2) {
          pointerState2.value = state2;
        } else {
          pointerState2.value = { ...pointerState2.value, visible: false };
        }
      },
      onStatusChange: (message) => {
        if (typeof message === "string" && message.length) {
          statusMessage.value = message;
        }
      },
    });

    return () => {
      engineRef.current?.cleanup();
      // Release wake lock on cleanup
      if (wakeLockRef.current) {
        wakeLockRef.current.release();
        wakeLockRef.current = null;
      }
    };
  }, []);

  // Request wake lock when app is running
  useEffect(() => {
    const requestWakeLock = async () => {
      if ("wakeLock" in navigator && isRunning.value) {
        try {
          wakeLockRef.current = await navigator.wakeLock.request("screen");
          console.log("Screen Wake Lock acquired");
        } catch (err) {
          console.warn("Failed to acquire wake lock:", err);
        }
      }
    };

    if (isRunning.value) {
      requestWakeLock();
    } else if (wakeLockRef.current) {
      wakeLockRef.current.release();
      wakeLockRef.current = null;
    }
  }, [isRunning.value]);

  const handleStart = async (event) => {
    if (event?.preventDefault) {
      event.preventDefault();
    }
    if (isRunning.value || isStarting.value) return;

    isStarting.value = true;

    try {
      await engineRef.current.start();
      isRunning.value = true;
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : String(error);
      statusMessage.value = `Unable to access camera: ${message}\n\n${DEFAULT_STATUS_MESSAGE}`;
    } finally {
      isStarting.value = false;
    }
  };

  const handleSurfacePointerDown = (event) => {
    if (isRunning.value || isStarting.value) return;
    const target = event.target;
    if (target instanceof HTMLElement && target.closest("button")) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    handleStart();
  };

  return (
    <main class="theremin" onPointerDown={handleSurfacePointerDown}>
      <Header />

      {!isRunning.value && (
        <Instructions
          status={statusMessage.value}
          onStart={handleStart}
          disabled={isStarting.value}
        />
      )}

      {isRunning.value && <PlayArea />}

      <SettingsModal
        open={settingsOpen.value}
        onClose={() => (settingsOpen.value = false)}
      />

      <HandPointer state={pointerState.value} />
      <HandPointer state={pointerState2.value} />

      <video
        ref={videoRef}
        class="theremin__video"
        playsinline
        muted
        autoplay
      />
    </main>
  );
}
