function isMobileDevice() {
  if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i
    .test(navigator.userAgent)) {
    return true;
  }
  return false;
};

function check_devices_and_start_camera(utils, resolution, callback, videoId)
{
  const constraints = {
      'qvga': {width: {exact: 320}, height: {exact: 240}},
      'vga': {width: {exact: 640}, height: {exact: 480}}};
  let video = document.getElementById(videoId);
  if (!video) {
      video = document.createElement('video');
  }

  let videoConstraint = constraints[resolution];
  if (!videoConstraint) {
      videoConstraint = true;
  }
  // Detect back and front cameras.
  let controls = {};
  navigator.mediaDevices.enumerateDevices()
    .then(function (devices) {
      devices.forEach(device => {
        if (device.kind == 'videoinput') {
          console.log(device);
          if (device.facingMode == "environment"
            || device.label.indexOf("facing back") >= 0)
            controls.backCamera = device;

          else if (device.facingMode == "user"
            || device.label.indexOf("facing front") >= 0)
            controls.frontCamera = device;

          else
            controls.otherCamera = device;
        }
      });
      //console.log(controls);
      //console.log(videoConstraint);

      //videoConstraint.deviceId = { exact: controls.otherCamera.deviceId };
      //console.log(controls);
      utils.startCamera_withconstraint(videoConstraint, callback, videoId);
    });
}

function Utils(errorOutputId, infoOutputId) { // eslint-disable-line no-unused-vars
    let self = this;
    this.errorOutput = document.getElementById(errorOutputId);
    this.infoOutput = document.getElementById(infoOutputId);

    const OPENCV_URL = 'opencv.js';
    this.loadOpenCv = function(onloadCallback) {
        let script = document.createElement('script');
        script.setAttribute('async', '');
        script.setAttribute('type', 'text/javascript');
        script.addEventListener('load', () => {
            if (cv.getBuildInformation)
            {
                console.log(cv.getBuildInformation());
                onloadCallback();
            }
            else
            {
                // WASM
                cv['onRuntimeInitialized']=()=>{
                    console.log(cv.getBuildInformation());
                    onloadCallback();
                }
            }
        });
        script.addEventListener('error', () => {
            self.printError('Failed to load ' + OPENCV_URL);
        });
        script.src = OPENCV_URL;
        let node = document.getElementsByTagName('script')[0];
        node.parentNode.insertBefore(script, node);
    };

    this.createFileFromUrl = function(path, url, callback) {
        let request = new XMLHttpRequest();
        request.open('GET', url, true);
        request.responseType = 'arraybuffer';
        request.onload = function(ev) {
            if (request.readyState === 4) {
                if (request.status === 200) {
                    let data = new Uint8Array(request.response);
                    cv.FS_createDataFile('/', path, data, true, false, false);
                    callback();
                } else {
                    self.printError('Failed to load ' + url + ' status: ' + request.status);
                }
            }
        };
        request.send();
    };

    this.loadImageToCanvas = function(url, cavansId) {
        let canvas = document.getElementById(cavansId);
        let ctx = canvas.getContext('2d');
        let img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = function() {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0, img.width, img.height);
        };
        img.src = url;
    };

    this.executeCode = function(textAreaId) {
        try {
            this.clearError();
            let code = document.getElementById(textAreaId).value;
            eval(code);
        } catch (err) {
            this.printError(err);
        }
    };

    this.clearError = function() {
        this.errorOutput.innerHTML = '';
    };

    this.printError = function(err) {
        if (typeof err === 'undefined') {
            err = '';
        } else if (typeof err === 'number') {
            if (!isNaN(err)) {
                if (typeof cv !== 'undefined') {
                    err = 'Exception: ' + cv.exceptionFromPtr(err).msg;
                }
            }
        } else if (typeof err === 'string') {
            let ptr = Number(err.split(' ')[0]);
            if (!isNaN(ptr)) {
                if (typeof cv !== 'undefined') {
                    err = 'Exception: ' + cv.exceptionFromPtr(ptr).msg;
                }
            }
        } else if (err instanceof Error) {
            err = err.stack.replace(/\n/g, '<br>');
        }
        this.errorOutput.innerHTML = err;
    };

    this.loadCode = function(scriptId, textAreaId) {
        let scriptNode = document.getElementById(scriptId);
        let textArea = document.getElementById(textAreaId);
        if (scriptNode.type !== 'text/code-snippet') {
            throw Error('Unknown code snippet type');
        }
        textArea.value = scriptNode.text.replace(/^\n/, '');
    };

    this.addFileInputHandler = function(fileInputId, canvasId) {
        let inputElement = document.getElementById(fileInputId);
        inputElement.addEventListener('change', (e) => {
            let files = e.target.files;
            if (files.length > 0) {
                let imgUrl = URL.createObjectURL(files[0]);
                self.loadImageToCanvas(imgUrl, canvasId);
            }
        }, false);
    };

    function onVideoCanPlay() {
        if (self.onCameraStartedCallback) {
            self.onCameraStartedCallback(self.stream, self.video);
        }
    };

    this.startCamera = function(resolution, callback, video) {
        const constraints = {
            'qvga': {width: {exact: 320}, height: {exact: 240}},
            'vga': {width: {exact: 640}, height: {exact: 480}}};
        //let video = document.getElementById(videoId);
        //if (!video) {
        //    video = document.createElement('video');
        //}

        let videoConstraint = constraints[resolution];
        if (!videoConstraint) {
            videoConstraint = true;
        }

        let controls = {};
        navigator.mediaDevices.enumerateDevices()
          .then(function(devices) {
              devices.forEach(function(device) {
                //console.log(device);
                if (device.facingMode == "environment"
                  || device.label.indexOf("facing back") >= 0)
                  controls.backCamera = device;

                else if (device.facingMode == "user"
                  || device.label.indexOf("facing front") >= 0)
                  controls.frontCamera = device;

                else
                  controls.otherCamera = device;
              });
        })

        //console.log(controls);
        //console.log(videoConstraint);
        this.infoOutput.innerHTML = (JSON.stringify(videoConstraint));
        //this.infoOutput.innerHTML = (JSON.stringify(controls));
        //videoConstraint.deviceId = { exact: controls.otherCamera.deviceId };
        if(isMobileDevice()){
            // won't work for chrome
            // Update: facingMode is now available in Chrome for Android through the adapter.js polyfill!
            // https://stackoverflow.com/questions/32086122/getusermedia-facingmode
            //videoConstraint.deviceId = { exact: controls.backCamera.deviceId };
            videoConstraint.facingMode = 'environment';
        }

        //console.log(videoConstraint);

        navigator.mediaDevices.getUserMedia({video: videoConstraint, audio: false})
            .then(function(stream) {
                video.srcObject = stream;
                video.play();
                self.video = video;
                self.stream = stream;
                self.onCameraStartedCallback = callback;
                video.addEventListener('canplay', onVideoCanPlay, false);
            })
            .catch(function(err) {
                self.printError('Camera Error: ' + err.name + ' ' + err.message);
            });
    };

    this.startCamera_withconstraint = function (videoConstraint, callback, videoId) {
      let video = document.getElementById(videoId);
      navigator.mediaDevices.getUserMedia({ video: videoConstraint, audio: false })
        .then(function (stream) {
          video.srcObject = stream;
          video.play();
          self.video = video;
          self.stream = stream;
          self.onCameraStartedCallback = callback;
          video.addEventListener('canplay', onVideoCanPlay, false);
        })
        .catch(function (err) {
          self.printError('Camera Error: ' + err.name + ' ' + err.message);
        });
    };

    this.stopCamera = function() {
        if (this.video) {
            this.video.pause();
            this.video.srcObject = null;
            this.video.removeEventListener('canplay', onVideoCanPlay);
        }
        if (this.stream) {
            this.stream.getVideoTracks()[0].stop();
        }
    };
};
