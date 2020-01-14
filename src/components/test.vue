<template>
  <div class="hello">
    <div style="margin-bottom:50px">
      <button @click="connnect" :disabled="isConnectButtonAvailable">开始</button>

      <!-- <button style="margin-left:50px" @click="disconnect" :disabled="!isConnectButtonAvailable">结束</button> -->
    </div>

    <textarea rows="40" cols="100" v-model="totalMsg"></textarea>
  </div>
</template>

<script>
export default {
  name: "assistant",
  data() {
    return {
      path: "ws://192.168.21.131:8080/assistant",
      socket: "",
      msg: "",
      totalMsg: "",
      isConnectButtonAvailable: false
    };
  },
  mounted() {
    // 初始化
    this.init();
  },
  methods: {
    connnect: function() {
      //this.msg = new Date() + "testsfsdfsdf";
      this.isConnectButtonAvailable = true;
      this.send("start");
    },
    disconnect: function() {
      this.isConnectButtonAvailable = false;
      this.send("end");
    },
    init: function() {
      if (typeof WebSocket === "undefined") {
        alert("您的浏览器不支持socket");
      } else {
        // 实例化socket
        this.socket = new WebSocket(this.path);
        // 监听socket连接
        this.socket.onopen = this.open;
        // 监听socket错误信息
        this.socket.onerror = this.error;
        // 监听socket消息
        this.socket.onmessage = this.getMessage;

        var gumStream;
        //stream from getUserMedia()
        var rec;
        //Recorder.js object
        var input;
        //MediaStreamAudioSourceNode we'll be recording
        // shim for AudioContext when it's not avb.
        var AudioContext = window.AudioContext || window.webkitAudioContext;
        var audioContext = new AudioContext();
      }
    },
    open: function() {
      console.log("socket连接成功");
    },
    error: function() {
      console.log("连接错误");
      this.totalMsg = "服务连接错误";
    },
    getMessage: function(msg) {
      this.msg = msg.data;
      this.totalMsg = this.totalMsg + "\r\n" + msg.data;
      console.log(msg);
      if (msg.data == "请连接麦克风后重试") {
        this.isConnectButtonAvailable = false;
      }
      if (msg.data == "转写结束") {
        this.isConnectButtonAvailable = false;
      }
    },
    send: function(params) {
      this.socket.send(params);
    },
    close: function() {
      console.log("socket已经关闭");
    },
    startRecording: function() {
      console.log("recordButton clicked");
      /* Simple constraints object, for more advanced audio features see

https://addpipe.com/blog/audio-constraints-getusermedia/ */

      var constraints = {
        audio: true,
        video: false
      };
      /* Disable the record button until we get a success or fail from getUserMedia() */

      recordButton.disabled = true;
      stopButton.disabled = false;
      pauseButton.disabled = false;

      /* We're using the standard promise based getUserMedia()

https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia */

      navigator.mediaDevices
        .getUserMedia(constraints)
        .then(function(stream) {
          console.log(
            "getUserMedia() success, stream created, initializing Recorder.js ..."
          );
          /* assign to gumStream for later use */
          gumStream = stream;
          /* use the stream */
          input = audioContext.createMediaStreamSource(stream);
          /* Create the Recorder object and configure to record mono sound (1 channel) Recording 2 channels will double the file size */
          rec = new Recorder(input, {
            numChannels: 1 //单声道
          });
          //start the recording process
          rec.record();
          console.log("Recording started");

          //将录音得到的Blob发送给后端
          rec.exportWAV(this.send);
        })
        .catch(function(err) {
          //enable the record button if getUserMedia() fails
          recordButton.disabled = false;
          stopButton.disabled = true;
          pauseButton.disabled = true;
        });
    },
    pauseRecording: function() {
      console.log("pauseButton clicked rec.recording=", rec.recording);
      if (rec.recording) {
        //pause
        rec.stop();
        pauseButton.innerHTML = "Resume";
      } else {
        //resume
        rec.record();
        pauseButton.innerHTML = "Pause";
      }
    },
    stopRecording: function() {
      console.log("stopButton clicked");
      //disable the stop button, enable the record too allow for new recordings
      stopButton.disabled = true;
      recordButton.disabled = false;
      pauseButton.disabled = true;
      //reset button just in case the recording is stopped while paused
      pauseButton.innerHTML = "Pause";
      //tell the recorder to stop the recording
      rec.stop(); //stop microphone access
      gumStream.getAudioTracks()[0].stop();
      //create the wav blob and pass it on to createDownloadLink
      rec.exportWAV(createDownloadLink);
    },
    createDownloadLink: function(blob) {
      var url = URL.createObjectURL(blob);
      var au = document.createElement("audio");
      var li = document.createElement("li");
      var link = document.createElement("a");
      //add controls to the <audio> element
      au.controls = true;
      au.src = url;
      //link the a element to the blob
      link.href = url;
      link.download = new Date().toISOString() + ".wav";
      link.innerHTML = link.download;
      //add the new audio and a elements to the li element
      li.appendChild(au);
      li.appendChild(link);
      //add the li element to the ordered list
      recordingsList.appendChild(li);
    }
  },
  destroyed() {
    // 销毁监听
    this.socket.onclose = this.close;
  }
};
</script>


<style >
</style>
