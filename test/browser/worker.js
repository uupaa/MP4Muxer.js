// MP4Muxer test

onmessage = function(event) {
    self.unitTest = event.data; // { message, setting: { secondary, baseDir } }

    if (!self.console) { // polyfill WebWorkerConsole
        self.console = function() {};
        self.console.dir = function() {};
        self.console.log = function() {};
        self.console.warn = function() {};
        self.console.error = function() {};
        self.console.table = function() {};
    }

    importScripts("../../lib/WebModule.js");

    WebModule.VERIFY  = true;
    WebModule.VERBOSE = true;
    WebModule.PUBLISH = true;

    importScripts("../../node_modules/uupaa.adts.js/node_modules/uupaa.hash.js/node_modules/uupaa.bit.js/lib/Bit.js");
    importScripts("../../node_modules/uupaa.adts.js/node_modules/uupaa.hash.js/node_modules/uupaa.bit.js/lib/BitView.js");
    importScripts("../../node_modules/uupaa.adts.js/node_modules/uupaa.hash.js/lib/Hash.js");
    importScripts("../../node_modules/uupaa.adts.js/lib/ADTS.js");
    importScripts("../../node_modules/uupaa.task.js/lib/Task.js");
    importScripts("../../node_modules/uupaa.task.js/lib/TaskMap.js");
    importScripts("../../node_modules/uupaa.fileloader.js/lib/FileLoader.js");
    importScripts("../../node_modules/uupaa.h264.js/node_modules/uupaa.hexdump.js/lib/HexDump.js");
    importScripts("../../node_modules/uupaa.h264.js/node_modules/uupaa.nalunit.js/lib/NALUnitType.js");
    importScripts("../../node_modules/uupaa.h264.js/node_modules/uupaa.nalunit.js/lib/NALUnitParameterSet.js");
    importScripts("../../node_modules/uupaa.h264.js/node_modules/uupaa.nalunit.js/lib/NALUnitEBSP.js");
    importScripts("../../node_modules/uupaa.h264.js/node_modules/uupaa.nalunit.js/lib/NALUnitAUD.js");
    importScripts("../../node_modules/uupaa.h264.js/node_modules/uupaa.nalunit.js/lib/NALUnitSPS.js");
    importScripts("../../node_modules/uupaa.h264.js/node_modules/uupaa.nalunit.js/lib/NALUnitPPS.js");
    importScripts("../../node_modules/uupaa.h264.js/node_modules/uupaa.nalunit.js/lib/NALUnitSEI.js");
    importScripts("../../node_modules/uupaa.h264.js/node_modules/uupaa.nalunit.js/lib/NALUnitIDR.js");
    importScripts("../../node_modules/uupaa.h264.js/node_modules/uupaa.nalunit.js/lib/NALUnitNON_IDR.js");
    importScripts("../../node_modules/uupaa.h264.js/node_modules/uupaa.nalunit.js/lib/NALUnit.js");
    importScripts("../../node_modules/uupaa.h264.js/lib/H264.js");
    importScripts("../../node_modules/uupaa.mpeg2ts.js/node_modules/uupaa.mpeg4bytestream.js/lib/MPEG4ByteStream.js");
    importScripts("../../node_modules/uupaa.mpeg2ts.js/lib/MPEG2TSParser.js");
    importScripts("../../node_modules/uupaa.mpeg2ts.js/lib/MPEG2TS.js");
    importScripts("../../node_modules/uupaa.mp4parser.js/node_modules/uupaa.typedarray.js/lib/TypedArray.js");
    importScripts("../../node_modules/uupaa.mp4parser.js/lib/MP4Parser.js");
    importScripts("../../node_modules/uupaa.mp4builder.js/lib/MP4Builder.js");
    importScripts("../wmtools.js");
    importScripts("../../lib/MP4Muxer.js");
    importScripts("../../release/MP4Muxer.w.min.js");
    importScripts("../testcase.js");

    self.postMessage(self.unitTest);
};

