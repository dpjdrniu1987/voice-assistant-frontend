<template>
  <div class="hello">
    <div style="font-size:24px">明度智慧智能语音助手</div>
    <div>
      <br />
      <br />
    </div>

    <div style="margin-bottom:50px">
      <!--<button @click="init">init</button>-->
      <button @click="init" :disabled="isable">开始</button>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
      <button @click="stopRecording" :disabled="!isable">结束</button>
    </div>

    <div>{{infomsg}}</div>

    <div style="display: flex">
      <div style="flex: 1">
        <div>语音识别结果：</div>
        <textarea rows="40" cols="100" v-model="totalMsg" id="log"></textarea>
      </div>
      <div style="flex: 1">
        <div>词法分析结果：</div>
        <textarea rows="40" cols="100" v-model="ltpmsg" id="log2"></textarea>
      </div>
    </div>

    <ul id="recordingslist" ref="recordingslist"></ul>
  </div>
</template>

<script>
var audio_context;
var recorder = null;
var maxDuration;
var interval;
function __log(e, data) {
  log.innerHTML += "\n" + e + " " + (data || "");
  //log2.innerHTML += "\n" + e + " " + (data || '');
}

export default {
  name: "voiceassistant",
  data() {
    return {
      //path: "ws://192.168.21.131:8080/assistant", //webservice path
      path: "ws://119.3.43.72:8888/assistant", //webservice path
      socket: "",
      partmsg: "",
      totalMsg: "",
      ltpmsg: "",
      finalmsg: "",
      infomsg: "",
      isable: false
      //maxDuration: 60
    };
  },
  mounted() {
    // 初始化
    // this.init();
  },
  methods: {
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

        this.socket.binaryType = "arraybuffer";
      }
      let self = this;
      self.init2();

      setTimeout(function() {
        self.startRecording();
      }, 1000);
    },
    open: function() {
      console.log("socket连接成功");
    },
    error: function() {
      console.log("连接错误");
      this.infomsg = "转写服务连接错误";
    },
    getMessage: function(msg) {
      if (msg.data.startsWith("中间结果：")) {
        this.partmsg = msg.data.substring(5);
        this.totalMsg = this.finalmsg + " \n " + this.partmsg;
      }
      if (msg.data.startsWith("最终结果：")) {
        this.finalmsg = this.finalmsg + " \n " + msg.data.substring(5);
        this.totalMsg = this.finalmsg;
      }
      if (msg.data.startsWith("词法分析结果：")) {
        this.ltpmsg = this.ltpmsg + " \n " + msg.data.substring(7);
      }
      if (msg.data.startsWith("提示信息：")) {
        this.infomsg = msg.data.substring(5);
      }

      //this.partmsg = msg.data;
      //this.totalMsg = this.totalMsg + "\r\n" + msg.data;

      console.log(msg);

      if (msg.data == "请连接麦克风后重试!") {
        this.iaable = false;
      }
      if (msg.data == "转写结束") {
        this.iaable = false;
        //this.totalMsg = "转写结束";
      }
    },
    send: function(params) {
      this.socket.send(params);
    },
    close: function() {
      console.log("socket已经关闭");
    },
    sleep: function(time) {
      return new Promise(resolve => setTimeout(resolve, time));
    },

    startUserMedia(stream) {
      var input = audio_context.createMediaStreamSource(stream);
      __log("Media stream created.");

      // Uncomment if you want the audio to feedback directly
      //input.connect(audio_context.destination);
      // __log('Input connected to audio context destination.');

      recorder = new Recorder(input, { numChannels: 1 });
      __log("Recorder initialised.");
    },

    startRecording() {
      let self = this;
      this.isable = true;
      //this.totalMsg = "";
      //self.init();

      recorder && recorder.record();
      __log("Recording...");
      this.infomsg = "请开始说话！";

      var oldBuffersLength = 0;
      maxDuration = 60;

      var count = 1;
      interval = setInterval(function() {
        console.log(recorder);
        if (recorder === null) {
          self.infomsg = "请连接麦克风后重试！";
          self.stopRecording();
          clearInterval(interval);
        }

        recorder.getBuffer(function(buffers) {
          var sampleStep = 3;
          var input = buffers[0].slice(oldBuffersLength, buffers[0].length); //去除上个循环采集到的数据部分
          oldBuffersLength = buffers[0].length;
          var length = Math.ceil(input.length / sampleStep);
          var result = new Float32Array(length);
          var index = 0,
            inputIndex = 0;
          while (index < length) {
            //此处是处理关键，算法就是输入的数据点每隔sampleStep距离取一个点放入result
            result[index++] = input[inputIndex];
            inputIndex += sampleStep;
          }

          /*//试听一下处理后（降采样频率）的录音
              var newSource =audio_context.createBufferSource();
              var newBuffer =audio_context.createBuffer( 1, result.length, 16000 );
              newBuffer.getChannelData(0).set(result);
              newSource.buffer = newBuffer;
              console.log(newSource.buffer);
              newSource.connect( audio_context.destination );
              newSource.start(0);*/

          var buffer = new ArrayBuffer(result.length * 2);
          var pcm = new DataView(buffer);
          self.floatTo16BitPCM(pcm, 0, result);
          var i = 1;
          while (i < pcm.byteLength / 3200) {
            self.send(pcm.buffer.slice(3200 * i - 3200, 3200 * i));
            //console.log(pcm.buffer.slice(3200 * i - 3200, 3200 * i));
            i++;
          }

          console.log("send completed " + i);
        });

        count++;
        if (count > maxDuration) clearInterval(interval);
      }, 1000); //每隔1000ms，getBuffer，处理后，传给后
    },

    stopRecording() {
      let self = this;
      this.isable = false;
      recorder && recorder.stop();
      maxDuration = 0; //break stratRecocdinig()中读发数据的循环
      clearInterval(interval);
      self.send("结束");
      __log("Stopped recording.");

      //获取录音数据，处理后，发送给后端，后端可以直接发送给阿里云语音识别服务
      /*recorder.getBuffer(function (buffers) {

          var sampleStep = 3;
          var input = buffers[0];
          var length = Math.ceil(input.length / sampleStep);
          var result = new Float32Array(length);
          var index = 0,
            inputIndex = 0;
          while (index < length) {
            //此处是处理关键，算法就是输入的数据点每隔sampleStep距离取一个点放入result
            result[index++] = input[inputIndex];
            inputIndex += sampleStep;
          }

          //试听一下处理后（降采样频率）的录音
          /!* var newSource =audio_context.createBufferSource();
           var newBuffer =audio_context.createBuffer( 1, result.length, 16000 );
           newBuffer.getChannelData(0).set(result);
           newSource.buffer = newBuffer;
           console.log(newSource.buffer);
           newSource.connect( audio_context.destination );
           newSource.start(0);*!/

          var buffer = new ArrayBuffer(result.length * 2);
          var pcm = new DataView(buffer);
          self.floatTo16BitPCM(pcm, 0, result);
          var i = 1;
          while (i < pcm.byteLength / 3200) {
            self.send(pcm.buffer.slice(3200 * i - 3200, 3200 * i));
            console.log(pcm.buffer.slice(3200 * i - 3200, 3200 * i));
            i++;
          }
          console.log("send completed " + i);
        });*/

      // create WAV download link using audio data blob
      this.createDownloadLink();
      recorder.clear();
      this.infomsg = "本次识别结束";
    },

    floatTo16BitPCM(output, offset, input) {
      for (var i = 0; i < input.length; i++, offset += 2) {
        var s = Math.max(-1, Math.min(1, input[i]));
        output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      }
    },

    createDownloadLink() {
      let self = this;
      recorder &&
        recorder.exportWAV(function(blob) {
          var url = URL.createObjectURL(blob);
          var li = document.createElement("li");
          var au = document.createElement("audio");
          var hf = document.createElement("a");

          au.controls = true;
          au.src = url;
          hf.href = url;
          hf.download = new Date().toISOString() + ".wav";
          hf.innerHTML = hf.download;
          li.appendChild(au);
          li.appendChild(hf);
          self.$refs.recordingslist.appendChild(li);
        });
    },

    init2() {
      try {
        // webkit shim
        window.AudioContext = window.AudioContext || window.webkitAudioContext;
        console.log(navigator);

        //navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mediaDevices.getUserMedia;

        navigator.getUserMedia =
          navigator.getUserMedia ||
          navigator.webkitGetUserMedia ||
          navigator.mozGetUserMedia ||
          navigator.msGetUserMedia;

        window.URL = window.URL || window.webkitURL;

        audio_context = new AudioContext();
        __log("Audio context set up.");
        __log(
          "navigator.getUserMedia " +
            (navigator.getUserMedia ? "available." : "not present!")
        );
      } catch (e) {
        alert("No web audio support in this browser!");
      }

      let self = this;
      navigator.getUserMedia({ audio: true }, self.startUserMedia, function(e) {
        __log("No live audio input: " + e);
      });
    }
  }
};
</script>


<style>
</style>
