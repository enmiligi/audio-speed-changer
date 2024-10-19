import SpeedChangeNode from "./SpeedChangeNode";

import toWav from "audiobuffer-to-wav";

export async function setup(audioFile: Blob) {
  let loading = document.getElementById("loading") as HTMLDivElement;
  let ui = document.getElementById("ui") as HTMLDivElement;
  loading.hidden = false;
  ui.hidden = true;
  const ctx = new AudioContext();
  var reader = new FileReader();
  reader.onload = function (ev) {
    console.log(ev.target.result);
    ctx
      .decodeAudioData(ev.target.result as ArrayBuffer)
      .then(async function (buffer) {
        console.log(buffer);
        let offlineCtx = new OfflineAudioContext(
          buffer.numberOfChannels,
          buffer.length,
          buffer.sampleRate,
        );

        var soundSource = offlineCtx.createBufferSource();
        soundSource.buffer = buffer;

        try {
          await offlineCtx.audioWorklet.addModule(
            new URL("./SpeedChangeProcessor.ts", import.meta.url),
          );
        } catch (e) {
          throw new Error(
            `Failed to load audio analyzer worklet: ${e.message}`,
          );
        }

        const node = new SpeedChangeNode(offlineCtx, "SpeedChangeProcessor");

        soundSource.connect(node).connect(offlineCtx.destination);

        soundSource.start();
        let resultBuffer = await offlineCtx.startRendering();

        loading.hidden = true;
        ui.hidden = false;

        let wav = toWav(buffer) as ArrayBuffer;
        let blob = new Blob([wav], { type: "audio/wav" });
        let url = URL.createObjectURL(blob);

        let fileName = document.getElementById("file-name") as HTMLInputElement;

        let downloadButton = document.getElementById(
          "download",
        ) as HTMLButtonElement;
        let a = document.createElement("a") as HTMLAnchorElement;
        a.href = url;
        a.download = "output.wav";
        downloadButton.addEventListener("click", () => {
          a.click();
        });

        fileName.addEventListener("input", (ev) => {
          if (fileName.value == "") {
            a.download = "output.wav";
          } else {
            a.download = fileName.value;
          }
        });

        (
          document.getElementById("audio-start-button") as HTMLButtonElement
        ).addEventListener("click", async () => {
          let src = ctx.createBufferSource();
          src.buffer = resultBuffer;
          src.connect(ctx.destination);
          src.start();
        });
      });
  };
  reader.readAsArrayBuffer(audioFile);
}
