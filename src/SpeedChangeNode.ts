import init, { InitOutput } from "audio-speed-changer-backend";
import { SpeedChangeEvent } from "./SpeedChangeEvent";

export default class SpeedChangeNode extends AudioWorkletNode {
  init() {
    this.port.onmessage = this.onmessage;
    WebAssembly.compileStreaming(
      fetch(
        new URL(
          "../backend/pkg/audio_speed_changer_backend_bg.wasm",
          import.meta.url,
        ),
      ),
    ).then((bytes) => {
      let a = 2;
      this.port.postMessage({ type: "InitWASM", bytes });
    });
  }

  onprocessorerror = function (err: Event) {
    console.error(`An error from AudioWorkletProcessor.process() occurred`);
    console.log(err);
  };

  onmessage = async function (event: MessageEvent) {
    debugger;
  };
}
