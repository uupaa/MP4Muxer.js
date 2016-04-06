// MP4Muxer test

require("../../lib/WebModule.js");

WebModule.VERIFY  = true;
WebModule.VERBOSE = true;
WebModule.PUBLISH = true;

require("../../node_modules/uupaa.adts.js/node_modules/uupaa.hash.js/node_modules/uupaa.bit.js/lib/Bit.js");
require("../../node_modules/uupaa.adts.js/node_modules/uupaa.hash.js/node_modules/uupaa.bit.js/lib/BitView.js");
require("../../node_modules/uupaa.adts.js/node_modules/uupaa.hash.js/lib/Hash.js");
require("../../node_modules/uupaa.adts.js/lib/ADTS.js");
require("../../node_modules/uupaa.task.js/lib/Task.js");
require("../../node_modules/uupaa.task.js/lib/TaskMap.js");
require("../../node_modules/uupaa.fileloader.js/lib/FileLoader.js");
require("../../node_modules/uupaa.h264.js/node_modules/uupaa.hexdump.js/lib/HexDump.js");
require("../../node_modules/uupaa.h264.js/node_modules/uupaa.nalunit.js/lib/NALUnitType.js");
require("../../node_modules/uupaa.h264.js/node_modules/uupaa.nalunit.js/lib/NALUnitParameterSet.js");
require("../../node_modules/uupaa.h264.js/node_modules/uupaa.nalunit.js/lib/NALUnitEBSP.js");
require("../../node_modules/uupaa.h264.js/node_modules/uupaa.nalunit.js/lib/NALUnitAUD.js");
require("../../node_modules/uupaa.h264.js/node_modules/uupaa.nalunit.js/lib/NALUnitSPS.js");
require("../../node_modules/uupaa.h264.js/node_modules/uupaa.nalunit.js/lib/NALUnitPPS.js");
require("../../node_modules/uupaa.h264.js/node_modules/uupaa.nalunit.js/lib/NALUnitSEI.js");
require("../../node_modules/uupaa.h264.js/node_modules/uupaa.nalunit.js/lib/NALUnitIDR.js");
require("../../node_modules/uupaa.h264.js/node_modules/uupaa.nalunit.js/lib/NALUnitNON_IDR.js");
require("../../node_modules/uupaa.h264.js/node_modules/uupaa.nalunit.js/lib/NALUnit.js");
require("../../node_modules/uupaa.h264.js/lib/H264.js");
require("../../node_modules/uupaa.mpeg2ts.js/node_modules/uupaa.mpeg4bytestream.js/lib/MPEG4ByteStream.js");
require("../../node_modules/uupaa.mpeg2ts.js/lib/MPEG2TSParser.js");
require("../../node_modules/uupaa.mpeg2ts.js/lib/MPEG2TS.js");
require("../../node_modules/uupaa.mp4parser.js/node_modules/uupaa.typedarray.js/lib/TypedArray.js");
require("../../node_modules/uupaa.mp4parser.js/lib/MP4Parser.js");
require("../../node_modules/uupaa.mp4builder.js/lib/MP4Builder.js");
require("../wmtools.js");
require("../../lib/MP4Muxer.js");
require("../../release/MP4Muxer.n.min.js");
require("../testcase.js");

