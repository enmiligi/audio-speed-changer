import init from "audio-speed-changer-backend";
import { setupAudio } from "./setupAudio";

let file_chosen = document.getElementById("file-chosen") as HTMLSpanElement;

init({}).then((wasm) => {
  console.log(wasm);

  (document.getElementById("audio-file") as HTMLInputElement).addEventListener(
    "change",
    function (ev) {
      let file = this.files[0];

      file_chosen.textContent = file.name + " ausgewählt";

      console.log(file);
      setupAudio(file);
    },
  );
});
