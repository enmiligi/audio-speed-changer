import SpeedChangeNode from "./SpeedChangeNode";

export async function setupAudio(audioFile: Blob) {
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

        (
          document.getElementById("audio-start-button") as HTMLButtonElement
        ).addEventListener("click", async () => {
          soundSource.start();
          let buffer = await offlineCtx.startRendering();
          let ctxSrc = ctx.createBufferSource();
          ctxSrc.buffer = buffer;
          ctxSrc.connect(ctx.destination);
          ctxSrc.start();
        });
      });
  };
  reader.readAsArrayBuffer(audioFile);
}
