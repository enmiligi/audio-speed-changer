import init from "audio-speed-changer-backend";
import { setupAudio } from "./setupAudio";

init({}).then((wasm) => {
  console.log(wasm);

  (document.getElementById("audio-file") as HTMLInputElement).addEventListener(
    "change",
    function (ev) {
      let file = this.files[0];
      console.log(file);
      let audioDiv = document.getElementById("audio-div");
      setupAudio(file);
    },
  );
});
