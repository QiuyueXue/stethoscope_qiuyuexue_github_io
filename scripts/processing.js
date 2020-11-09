// set up basic variables for app

const record = document.querySelector('.record');
const stop = document.querySelector('.stop');
const soundClips = document.querySelector('.sound-clips');
const amplitudeCanvas = document.querySelector('.visualizer');
const mainSection = document.querySelector('.main-controls');

// disable stop button while not recording

stop.disabled = true;

// visualiser setup - create web audio api context and canvas

let audioCtx;
const amplitudeCanvasCtx = amplitudeCanvas.getContext("2d");

//main block for doing the audio recording

if (navigator.mediaDevices.getUserMedia) {
  console.log('getUserMedia supported.');

  const constraints = { audio: true };
  let chunks = [];

  let onSuccess = function(stream) {
    const mediaRecorder = new MediaRecorder(stream);

    visualize(stream);

    record.onclick = function() {
      mediaRecorder.start();
      console.log(mediaRecorder.state);
      console.log("recorder started");
      record.style.background = "red";

      stop.disabled = false;
      record.disabled = true;
    }

    stop.onclick = function() {
      mediaRecorder.stop();
      console.log(mediaRecorder.state);
      console.log("recorder stopped");
      record.style.background = "";
      record.style.color = "";
      // mediaRecorder.requestData();

      stop.disabled = true;
      record.disabled = false;
    }

    mediaRecorder.onstop = function(e) {
      console.log("data available after MediaRecorder.stop() called.");

      const clipName = prompt('Enter a name for your recording?','My unnamed recording');

      const clipContainer = document.createElement('article');
      const clipLabel = document.createElement('p');
      const audio = document.createElement('audio');
      const deleteButton = document.createElement('button');

      clipContainer.classList.add('clip');
      audio.setAttribute('controls', '');
      deleteButton.textContent = 'Delete';
      deleteButton.className = 'delete';

      if(clipName === null) {
        clipLabel.textContent = 'Unnamed recording';
      } else {
        clipLabel.textContent = clipName;
      }

      clipContainer.appendChild(audio);
      clipContainer.appendChild(clipLabel);
      clipContainer.appendChild(deleteButton);
      soundClips.appendChild(clipContainer);

      audio.controls = true;
      // const blob = new Blob(chunks, { 'type' : 'audio/wav; codecs=0' });
      const blob = new Blob(chunks, { 'type' : 'audio/ogg; codecs=opus' });
      chunks = [];
      const audioURL = window.URL.createObjectURL(blob);
      audio.src = audioURL;
      console.log("recorder stopped");

      deleteButton.onclick = function(e) {
        let evtTgt = e.target;
        evtTgt.parentNode.parentNode.removeChild(evtTgt.parentNode);
      }

      clipLabel.onclick = function() {
        const existingName = clipLabel.textContent;
        const newClipName = prompt('Enter a new name for your sound clip?');
        if(newClipName === null) {
          clipLabel.textContent = existingName;
        } else {
          clipLabel.textContent = newClipName;
        }
      }
    }

    mediaRecorder.ondataavailable = function(e) {
      chunks.push(e.data);
    }
  }

  let onError = function(err) {
    console.log('The following error occured: ' + err);
  }

  navigator.mediaDevices.getUserMedia(constraints).then(onSuccess, onError);

} else {
   console.log('getUserMedia not supported on your browser!');
}

function visualize(stream) {
  if(!audioCtx) {
    audioCtx = new AudioContext();
  }

  const source = audioCtx.createMediaStreamSource(stream);
  const analyser = audioCtx.createAnalyser();
  // let feedForward = [1, 4, 6, 4, 1];
  // let feedBack = [1, -3.89515962872624, 5.69093969755989, -3.69623536934508,0.900457760845518];
  let feedForward = [5.215873489102675e-17, 4.694286140192408e-16, 1.877714456076963e-15, 4.3813337308462465e-15, 6.5720005962693705e-15, 6.5720005962693705e-15, 4.3813337308462465e-15, 1.877714456076963e-15, 4.694286140192408e-16, 5.215873489102675e-17];
  let feedBack = [1.0, -8.819493751378667, 34.572210470407306, -79.05869410420424, 116.22743487333808, -113.91956542672197, 74.4420786991709, -31.27337554697834, 7.664243680050063, -0.8348388936831265];
  const iirfilter = audioCtx.createIIRFilter(feedforward=feedForward, feedback=feedBack);
  var gainNode = audioCtx.createGain();
  gainNode.gain.value = 1;
  var max_amplification = 5E-01;

  analyser.fftSize = 2048;
  let amplitudeBufferLength = analyser.fftSize;
  let frequencyBufferLength = analyser.frequencyBinCount;
  let amplitudeData = new Uint8Array(amplitudeBufferLength);
  let frequencyData = new Uint8Array(frequencyBufferLength);

  
  amplitudeCanvas.style.width = '100%';
  amplitudeCanvas.width  = amplitudeCanvas.offsetWidth;
  const amplitudeCanvasCtx = amplitudeCanvas.getContext('2d');
  
  // frequencyCanvas.style.width = '100%';
  // frequencyCanvas.width  = frequencyCanvas.offsetWidth;
  // const frequencyCanvasCtx = frequencyCanvas.getContext('2d');

  const GRAPH_WINDOW_LENGTH = 120000;
  let graphWindowData = new Uint8Array(GRAPH_WINDOW_LENGTH);
  let graphWindowStart = 0;

  source.connect(iirfilter);
  iirfilter.connect(gainNode);
  gainNode.connect(analyser);
  draw();

  function draw() {
        requestAnimationFrame(draw);

        analyser.getByteTimeDomainData(amplitudeData);
        
        const offset = GRAPH_WINDOW_LENGTH - graphWindowStart;
        graphWindowData.set(amplitudeData.slice(0, offset), graphWindowStart);
        graphWindowData.set(amplitudeData.slice(offset), 0);
        graphWindowStart = (graphWindowStart + amplitudeBufferLength) % GRAPH_WINDOW_LENGTH;

        drawAmplitudeGraph();
        // drawFrequencyGraph();
        max_amplitude = Math.max.apply(Math, amplitudeData);
        document.getElementById('volume').addEventListener('change', function() {
        max_amplification = this.value;
    });
        auto_gain = max_amplification/max_amplitude;
        gainNode.gain.value = auto_gain;

      }

      function drawAmplitudeGraph() {
        amplitudeCanvasCtx.fillStyle = 'rgb(0, 0, 0)';
        amplitudeCanvasCtx.fillRect(0, 0, amplitudeCanvas.width, amplitudeCanvas.height);

        amplitudeCanvasCtx.lineWidth = 2;
        amplitudeCanvasCtx.strokeStyle = 'rgb(0, 255, 0)';
        amplitudeCanvasCtx.beginPath();

        const sliceWidth = amplitudeCanvas.width * 1.0 / GRAPH_WINDOW_LENGTH;
        let x = 0;
        for(let i = 0; i < GRAPH_WINDOW_LENGTH; i++) {
          const v = graphWindowData[(i + graphWindowStart) % GRAPH_WINDOW_LENGTH] / 128.0;
          const y = v * amplitudeCanvas.height/2;

          if(i === 0) {
            amplitudeCanvasCtx.moveTo(x, y);
          } else {
            amplitudeCanvasCtx.lineTo(x, y);
          }

          x += sliceWidth;
        }

        amplitudeCanvasCtx.lineTo(amplitudeCanvas.width, amplitudeCanvas.height/2);
        amplitudeCanvasCtx.stroke();
      }
}

window.onresize = function() {
  amplitudeCanvas.width = mainSection.offsetWidth;
}

window.onresize();
